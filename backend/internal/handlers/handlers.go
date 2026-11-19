package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"feather-backend/internal/auth"
	"feather-backend/internal/balancer"
	"feather-backend/internal/config"
	"feather-backend/internal/database"
	"feather-backend/internal/models"
	"feather-backend/internal/mwclient"
	"feather-backend/internal/worker"
)

type Handler struct {
	cfg       *config.Config
	db        *database.DB
	talkQueue *worker.TalkQueueWorker
}

func New(cfg *config.Config, db *database.DB, talkQueue *worker.TalkQueueWorker) *Handler {
	return &Handler{
		cfg:       cfg,
		db:        db,
		talkQueue: talkQueue,
	}
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, http.StatusOK, map[string]string{
		"status":  "healthy",
		"service": "feather-backend",
		"version": "2.0.0",
		"db_type": h.cfg.DBType,
	})
}

// -------------------------------------------------------------
// OAuth 2.0 Endpoints
// -------------------------------------------------------------

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	state := hex.EncodeToString(b)

	// Save state in temporary cookie for CSRF protection
	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	authURL := mwclient.GetAuthorizeURL(h.cfg, state)
	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

func (h *Handler) DevLogin(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		username = h.cfg.OwnerUsername
	}

	var user models.User
	err := h.db.QueryRow("SELECT id, wiki_username, role FROM users WHERE wiki_username = ?", username).Scan(
		&user.ID, &user.WikiUsername, &user.Role,
	)
	if err != nil {
		jsonError(w, http.StatusNotFound, "User not found")
		return
	}

	tokenString, err := auth.GenerateToken(h.cfg, &user)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "feather_token",
		Value:    tokenString,
		Path:     "/",
		MaxAge:   7 * 86400,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	http.Redirect(w, r, h.cfg.FrontendURL, http.StatusSeeOther)
}

func (h *Handler) Callback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != state {
		http.Error(w, "Invalid OAuth state parameter", http.StatusBadRequest)
		return
	}

	accessToken, err := mwclient.ExchangeCodeForToken(h.cfg, code)
	if err != nil {
		log.Printf("[OAuth] Token exchange failed: %v", err)
		http.Redirect(w, r, fmt.Sprintf("%s?error=token_exchange_failed", h.cfg.FrontendURL), http.StatusTemporaryRedirect)
		return
	}

	profile, err := mwclient.FetchUserProfile(accessToken)
	if err != nil {
		log.Printf("[OAuth] Profile fetch failed: %v", err)
		http.Redirect(w, r, fmt.Sprintf("%s?error=profile_fetch_failed", h.cfg.FrontendURL), http.StatusTemporaryRedirect)
		return
	}

	// Upsert User
	var user models.User
	err = h.db.QueryRow("SELECT id, wiki_username, role FROM users WHERE wiki_username = ?", profile.Username).Scan(
		&user.ID, &user.WikiUsername, &user.Role,
	)

	if err == sql.ErrNoRows {
		role := "participant"
		if profile.Username == h.cfg.OwnerUsername {
			role = "owner"
		}
		res, insErr := h.db.Exec(
			"INSERT INTO users (wiki_username, role, oauth_access_token) VALUES (?, ?, ?)",
			profile.Username, role, accessToken,
		)
		if insErr != nil {
			log.Printf("[OAuth] User insert error: %v", insErr)
			http.Error(w, "Failed to register user", http.StatusInternalServerError)
			return
		}
		user.ID, _ = res.LastInsertId()
		user.WikiUsername = profile.Username
		user.Role = role
	} else {
		// Update access token
		if profile.Username == h.cfg.OwnerUsername && user.Role != "owner" {
			user.Role = "owner"
		}
		_, _ = h.db.Exec("UPDATE users SET oauth_access_token = ?, role = ? WHERE id = ?", accessToken, user.Role, user.ID)
	}

	// Issue JWT session cookie
	jwtToken, err := auth.GenerateToken(h.cfg, &user)
	if err != nil {
		http.Error(w, "Session generation failed", http.StatusInternalServerError)
		return
	}
	auth.SetAuthCookie(w, jwtToken)

	// Redirect to frontend
	http.Redirect(w, r, h.cfg.FrontendURL, http.StatusTemporaryRedirect)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	auth.ClearAuthCookie(w)
	jsonResponse(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		jsonResponse(w, http.StatusOK, map[string]any{
			"is_authenticated": false,
			"role":             "anonymous",
			"is_owner":         false,
		})
		return
	}

	role := user.Role
	isOwner := h.isPlatformOwner(user)
	if isOwner {
		role = "owner"
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"is_authenticated": true,
		"user_id":          user.UserID,
		"wiki_username":    user.WikiUsername,
		"role":             role,
		"is_owner":         isOwner,
	})
}

// -------------------------------------------------------------
// Contest Endpoints
// -------------------------------------------------------------

func parseFlexibleDate(dateStr string, tz string, defaultTime time.Time) time.Time {
	if strings.TrimSpace(dateStr) == "" {
		return defaultTime
	}
	loc, err := time.LoadLocation(strings.TrimSpace(tz))
	if err != nil {
		loc = time.UTC
	}
	formats := []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02",
	}
	for _, f := range formats {
		if t, err := time.ParseInLocation(f, dateStr, loc); err == nil {
			return t
		}
	}
	return defaultTime
}

func generateContestCode() string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 4)
	raw := make([]byte, 4)
	_, _ = rand.Read(raw)
	for i := 0; i < 4; i++ {
		b[i] = charset[int(raw[i])%len(charset)]
	}
	return string(b)
}

func (h *Handler) CreateContest(w http.ResponseWriter, r *http.Request) {
	var req models.CreateContestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		jsonError(w, http.StatusBadRequest, "Contest name is required")
		return
	}

	// Always generate a random 4-character code (lowercase alphanumeric)
	var code string
	for attempt := 0; attempt < 15; attempt++ {
		candidate := generateContestCode()
		var existingID int64
		err := h.db.QueryRow("SELECT id FROM contests WHERE code = ?", candidate).Scan(&existingID)
		if err == sql.ErrNoRows {
			code = candidate
			break
		}
	}
	if code == "" {
		code = generateContestCode()
	}

	wikiDbName := strings.TrimSpace(req.WikiDbName)
	if wikiDbName == "" {
		wikiDbName = "bnwiki"
	}
	wikiURL := strings.TrimSpace(req.WikiURL)
	if wikiURL == "" {
		wikiURL = "https://bn.wikipedia.org"
	}
	wikiLang := strings.TrimSpace(req.WikiLang)
	if wikiLang == "" {
		wikiLang = "bn"
	}
	wikiTZ := strings.TrimSpace(req.WikiTZ)
	if wikiTZ == "" {
		wikiTZ = "UTC"
	}

	now := time.Now().UTC()
	startDate := parseFlexibleDate(req.StartDate, wikiTZ, now)
	endDate := parseFlexibleDate(req.EndDate, wikiTZ, now.Add(30*24*time.Hour))

	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to start database transaction")
		return
	}
	defer tx.Rollback()

	var createdByID *int64
	currentUser := auth.GetUser(r.Context())
	if currentUser != nil && currentUser.UserID > 0 {
		createdByID = &currentUser.UserID
	}

	isUmbrellaInt := 0
	if req.IsUmbrella {
		isUmbrellaInt = 1
	}

	insertContestQuery := `
		INSERT INTO contests (
			code, name, description, wiki_dbname, wiki_url, wiki_lang, wiki_tz,
			start_date, end_date, status, is_draft,
			rule_must_be_creator, rule_no_redirect, rule_no_disambig, rule_mainspace_only, rule_created_in_window,
			custom_creation_start_date, custom_creation_end_date,
			min_bytes, min_words, min_refs, max_submissions_per_user, rank_by_words,
			add_talk_template, talk_template_name, distribute_jury_queue, is_umbrella, parent_contest_id, created_by_id
		) VALUES (
			?, ?, ?, ?, ?, ?, ?,
			?, ?, ?, ?,
			?, ?, ?, ?, ?,
			?, ?,
			?, ?, ?, ?, ?,
			?, ?, ?, ?, NULL, ?
		)
	`
	status := "pending_approval"
	if h.isPlatformOwner(currentUser) {
		status = "active"
	}
	isDraft := 0
	mustBeCreator := 0
	if req.RuleMustBeCreator {
		mustBeCreator = 1
	}
	noRedirect := 0
	if req.RuleNoRedirect {
		noRedirect = 1
	}
	noDisambig := 0
	if req.RuleNoDisambig {
		noDisambig = 1
	}
	mainspaceOnly := 0
	if req.RuleMainspaceOnly {
		mainspaceOnly = 1
	}
	createdInWindow := 0
	if req.RuleCreatedInWindow {
		createdInWindow = 1
	}
	distributeJuryQueue := 0
	if req.DistributeJuryQueue {
		distributeJuryQueue = 1
	}
	var customCreationStart, customCreationEnd *time.Time
	if !req.RuleCreatedInWindow {
		if req.CustomCreationStartDate != "" {
			if t, err := time.Parse(time.RFC3339, req.CustomCreationStartDate); err == nil {
				customCreationStart = &t
			}
		}
		if req.CustomCreationEndDate != "" {
			if t, err := time.Parse(time.RFC3339, req.CustomCreationEndDate); err == nil {
				customCreationEnd = &t
			}
		}
	}
	rankByWords := 0
	if req.RankByWords {
		rankByWords = 1
	}
	addTalkTemplate := 0
	if req.AddTalkTemplate {
		addTalkTemplate = 1
	}

	res, err := tx.Exec(
		insertContestQuery,
		code, req.Name, req.Description, wikiDbName, wikiURL, wikiLang, wikiTZ,
		startDate, endDate, status, isDraft,
		mustBeCreator, noRedirect, noDisambig, mainspaceOnly, createdInWindow,
		customCreationStart, customCreationEnd,
		req.MinBytes, req.MinWords, req.MinRefs, req.MaxSubmissionsPerUser, rankByWords,
		addTalkTemplate, req.TalkTemplateName, distributeJuryQueue, isUmbrellaInt, createdByID,
	)
	if err != nil {
		log.Printf("[CreateContest] Error inserting contest: %v", err)
		jsonError(w, http.StatusInternalServerError, "Failed to create contest in database")
		return
	}

	contestID, err := res.LastInsertId()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to retrieve contest ID")
		return
	}

	// Build jury list - include current user as default jury if authenticated
	juryUsernames := make(map[string]bool)
	if currentUser != nil && currentUser.WikiUsername != "" {
		juryUsernames[currentUser.WikiUsername] = true
	}
	for _, j := range req.Juries {
		trimmed := strings.TrimSpace(j)
		if trimmed != "" {
			juryUsernames[trimmed] = true
		}
	}

	for juryName := range juryUsernames {
		var userID int64
		err := tx.QueryRow("SELECT id FROM users WHERE wiki_username = ?", juryName).Scan(&userID)
		if err == sql.ErrNoRows {
			userRes, userInsErr := tx.Exec("INSERT INTO users (wiki_username, role) VALUES (?, 'jury')", juryName)
			if userInsErr != nil {
				log.Printf("[CreateContest] Error inserting jury user %s: %v", juryName, userInsErr)
				continue
			}
			userID, _ = userRes.LastInsertId()
		} else if err != nil {
			log.Printf("[CreateContest] Error checking user %s: %v", juryName, err)
			continue
		}

		var count int
		_ = tx.QueryRow("SELECT COUNT(*) FROM contest_juries WHERE contest_id = ? AND user_id = ?", contestID, userID).Scan(&count)
		if count == 0 {
			_, _ = tx.Exec("INSERT INTO contest_juries (contest_id, user_id) VALUES (?, ?)", contestID, userID)
		}
	}

	// If this is a Multi-Community Campaign, spawn initial sub-contests for each participating community
	if req.IsUmbrella && len(req.ParticipatingWikis) > 0 {
		for _, p := range req.ParticipatingWikis {
			pDbName := strings.TrimSpace(p.DbName)
			if pDbName == "" {
				continue
			}
			pURL := strings.TrimSpace(p.URL)
			if pURL == "" {
				pURL = fmt.Sprintf("https://%s.org", pDbName)
			}
			pLang := strings.TrimSpace(p.Lang)
			if pLang == "" {
				pLang = "en"
			}
			pTZ := strings.TrimSpace(p.Timezone)
			if pTZ == "" {
				pTZ = wikiTZ
			}
			pName := strings.TrimSpace(p.Name)
			if pName == "" {
				pName = fmt.Sprintf("%s (%s)", req.Name, pDbName)
			} else if !strings.Contains(strings.ToLower(pName), strings.ToLower(req.Name)) {
				pName = fmt.Sprintf("%s - %s", req.Name, pName)
			}

			subCode := generateContestCode()
			pMinWords := p.MinWords
			if pMinWords == 0 && req.MinWords > 0 {
				pMinWords = req.MinWords
			}
			pMinBytes := p.MinBytes
			if pMinBytes == 0 && req.MinBytes > 0 {
				pMinBytes = req.MinBytes
			}
			pMinRefs := p.MinRefs
			if pMinRefs == 0 && req.MinRefs > 0 {
				pMinRefs = req.MinRefs
			}
			pMustBeCreator := mustBeCreator
			if p.RuleMustBeCreator {
				pMustBeCreator = 1
			}
			pAddTalk := 0
			pTalkTemplate := strings.TrimSpace(p.TalkTemplateName)
			if pTalkTemplate != "" {
				pAddTalk = 1
			} else if addTalkTemplate == 1 && req.TalkTemplateName != "" {
				pAddTalk = 1
				pTalkTemplate = req.TalkTemplateName
			}

			subRes, subErr := tx.Exec(`
				INSERT INTO contests (
					code, name, description, wiki_dbname, wiki_url, wiki_lang, wiki_tz,
					start_date, end_date, status, is_draft,
					rule_must_be_creator, rule_no_redirect, rule_no_disambig, rule_mainspace_only, rule_created_in_window,
					custom_creation_start_date, custom_creation_end_date,
					min_bytes, min_words, min_refs, max_submissions_per_user, rank_by_words,
					add_talk_template, talk_template_name, is_umbrella, parent_contest_id, created_by_id
				) VALUES (
					?, ?, ?, ?, ?, ?, ?,
					?, ?, ?, ?,
					?, ?, ?, ?, ?,
					?, ?,
					?, ?, ?, ?, ?,
					?, ?, 0, ?, ?
				)
			`,
				subCode, pName, req.Description, pDbName, pURL, pLang, pTZ,
				startDate, endDate, status, isDraft,
				pMustBeCreator, noRedirect, noDisambig, mainspaceOnly, createdInWindow,
				customCreationStart, customCreationEnd,
				pMinBytes, pMinWords, pMinRefs, req.MaxSubmissionsPerUser, rankByWords,
				pAddTalk, pTalkTemplate, contestID, createdByID,
			)
			if subErr != nil {
				log.Printf("[CreateContest] Error inserting sub-contest %s: %v", pDbName, subErr)
				continue
			}
			subID, _ := subRes.LastInsertId()

			// Local juries for this sub-contest
			localJuries := make(map[string]bool)
			if currentUser != nil && currentUser.WikiUsername != "" {
				localJuries[currentUser.WikiUsername] = true
			}
			for _, lj := range p.Juries {
				if trimmed := strings.TrimSpace(lj); trimmed != "" {
					localJuries[trimmed] = true
				}
			}
			for ljName := range localJuries {
				var uID int64
				err := tx.QueryRow("SELECT id FROM users WHERE wiki_username = ?", ljName).Scan(&uID)
				if err == sql.ErrNoRows {
					uRes, _ := tx.Exec("INSERT INTO users (wiki_username, role) VALUES (?, 'jury')", ljName)
					uID, _ = uRes.LastInsertId()
				}
				if uID > 0 {
					_, _ = tx.Exec("INSERT INTO contest_juries (contest_id, user_id) VALUES (?, ?)", subID, uID)
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to commit contest transaction")
		return
	}

	jsonResponse(w, http.StatusCreated, map[string]any{
		"message": "Contest created successfully",
		"code":    code,
		"status":  status,
		"contest": map[string]any{
			"id":         contestID,
			"code":       code,
			"name":       req.Name,
			"status":     status,
			"wiki_url":   wikiURL,
			"wiki_tz":    wikiTZ,
			"start_date": startDate,
			"end_date":   endDate,
		},
	})
}

func (h *Handler) ListContests(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	isOwner := h.isPlatformOwner(currentUser)
	var currentUserID int64
	if currentUser != nil {
		currentUserID = currentUser.UserID
	}

	query := `
		SELECT c.id, c.code, c.name, c.description, c.wiki_dbname, c.wiki_url, c.wiki_lang, 
		       c.start_date, c.end_date, c.status, c.is_draft,
		       COALESCE(c.is_umbrella, 0) as is_umbrella,
		       c.parent_contest_id,
		       (SELECT COUNT(*) FROM contests sub WHERE sub.parent_contest_id = c.id) as sub_contest_count,
		       COUNT(DISTINCT a.id) as total_articles,
		       COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as accepted_articles,
		       COUNT(DISTINCT cj.user_id) as total_juries,
		       COALESCE(GROUP_CONCAT(DISTINCT u.wiki_username), '') as jury_names,
		       c.created_by_id,
		       COALESCE(creator.wiki_username, '') as created_by_username
		FROM contests c
		LEFT JOIN articles a ON (c.id = a.contest_id OR (c.is_umbrella = 1 AND a.contest_id IN (SELECT id FROM contests WHERE parent_contest_id = c.id)))
		LEFT JOIN contest_juries cj ON c.id = cj.contest_id
		LEFT JOIN users u ON cj.user_id = u.id
		LEFT JOIN users creator ON c.created_by_id = creator.id
		WHERE c.is_draft = 0 AND c.parent_contest_id IS NULL
		  AND (c.status != 'pending_approval' OR (c.created_by_id = ? AND ? > 0) OR ? = 1)
		GROUP BY c.id
		ORDER BY c.start_date DESC
	`
	ownerFlag := 0
	if isOwner {
		ownerFlag = 1
	}
	rows, err := h.db.Query(query, currentUserID, currentUserID, ownerFlag)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to fetch contests")
		return
	}
	defer rows.Close()

	var contests []models.Contest
	for rows.Next() {
		var c models.Contest
		var juryNames string
		var isUmbrellaInt int
		err := rows.Scan(
			&c.ID, &c.Code, &c.Name, &c.Description, &c.WikiDbName, &c.WikiURL, &c.WikiLang,
			&c.StartDate, &c.EndDate, &c.Status, &c.IsDraft,
			&isUmbrellaInt, &c.ParentContestID, &c.SubContestCount,
			&c.TotalArticles, &c.AcceptedArticles, &c.TotalJuries, &juryNames,
			&c.CreatedByID, &c.CreatedByUsername,
		)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Failed to parse contest row")
			return
		}
		c.IsUmbrella = isUmbrellaInt == 1
		if juryNames != "" {
			c.Juries = strings.Split(juryNames, ",")
		}
		contests = append(contests, c)
	}

	if contests == nil {
		contests = []models.Contest{}
	}
	jsonResponse(w, http.StatusOK, contests)
}

func (h *Handler) GetContest(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	query := `
		SELECT c.id, c.code, c.name, c.description, c.wiki_dbname, c.wiki_url, c.wiki_lang, c.wiki_tz,
		       c.start_date, c.end_date, c.status, c.is_draft, c.rule_must_be_creator, c.rule_no_redirect,
		       c.rule_no_disambig, c.rule_mainspace_only, c.rule_created_in_window,
		       c.custom_creation_start_date, c.custom_creation_end_date, c.min_bytes,
		       c.min_words, c.min_refs, c.max_submissions_per_user, c.rank_by_words, c.add_talk_template,
		       c.talk_template_name, COALESCE(c.distribute_jury_queue, 0), COALESCE(c.is_umbrella, 0), c.parent_contest_id, c.created_at,
		       c.created_by_id, COALESCE(creator.wiki_username, '') as created_by_username
		FROM contests c
		LEFT JOIN users creator ON c.created_by_id = creator.id
		WHERE c.code = ?
	`
	var c models.Contest
	var isUmbrellaInt, distributeJuryQueueInt int
	err := h.db.QueryRow(query, code).Scan(
		&c.ID, &c.Code, &c.Name, &c.Description, &c.WikiDbName, &c.WikiURL, &c.WikiLang, &c.WikiTZ,
		&c.StartDate, &c.EndDate, &c.Status, &c.IsDraft, &c.RuleMustBeCreator, &c.RuleNoRedirect,
		&c.RuleNoDisambig, &c.RuleMainspaceOnly, &c.RuleCreatedInWindow,
		&c.CustomCreationStartDate, &c.CustomCreationEndDate, &c.MinBytes,
		&c.MinWords, &c.MinRefs, &c.MaxSubmissionsPerUser, &c.RankByWords, &c.AddTalkTemplate,
		&c.TalkTemplateName, &distributeJuryQueueInt, &isUmbrellaInt, &c.ParentContestID, &c.CreatedAt,
		&c.CreatedByID, &c.CreatedByUsername,
	)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}
	c.IsUmbrella = isUmbrellaInt == 1
	c.DistributeJuryQueue = distributeJuryQueueInt == 1

	if c.IsUmbrella {
		// Campaign: aggregate metrics across all sub-contests & load sub-contests
		subRows, err := h.db.Query(`
			SELECT s.id, s.code, s.name, s.wiki_dbname, s.wiki_url, s.wiki_lang, s.wiki_tz,
			       s.start_date, s.end_date, s.status, s.min_words, s.min_bytes,
			       COUNT(DISTINCT a.id) as total_articles,
			       COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as accepted_articles,
			       COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_articles,
			       COUNT(DISTINCT cj.user_id) as total_juries,
			       COUNT(DISTINCT a.submitter_id) as total_submitters
			FROM contests s
			LEFT JOIN articles a ON s.id = a.contest_id
			LEFT JOIN contest_juries cj ON s.id = cj.contest_id
			WHERE s.parent_contest_id = ?
			GROUP BY s.id
			ORDER BY s.name ASC
		`, c.ID)
		if err == nil {
			defer subRows.Close()
			c.SubContests = []models.SubContestSummary{}
			c.TotalArticles = 0
			c.AcceptedArticles = 0
			c.PendingArticles = 0
			for subRows.Next() {
				var sc models.SubContestSummary
				if sErr := subRows.Scan(
					&sc.ID, &sc.Code, &sc.Name, &sc.WikiDbName, &sc.WikiURL, &sc.WikiLang, &sc.WikiTZ,
					&sc.StartDate, &sc.EndDate, &sc.Status, &sc.MinWords, &sc.MinBytes,
					&sc.TotalArticles, &sc.AcceptedArticles, &sc.PendingArticles,
					&sc.TotalJuries, &sc.TotalSubmitters,
				); sErr == nil {
					c.SubContests = append(c.SubContests, sc)
					c.TotalArticles += sc.TotalArticles
					c.AcceptedArticles += sc.AcceptedArticles
					c.PendingArticles += sc.PendingArticles
				}
			}
			c.SubContestCount = len(c.SubContests)
		}
	} else {
		// Local sub-contest or single contest
		_ = h.db.QueryRow(`
			SELECT COUNT(*), 
			       COUNT(CASE WHEN status = 'accepted' THEN 1 END),
			       COUNT(CASE WHEN status = 'pending' THEN 1 END)
			FROM articles WHERE contest_id = ?
		`, c.ID).Scan(&c.TotalArticles, &c.AcceptedArticles, &c.PendingArticles)

		if c.ParentContestID != nil {
			// Fetch parent campaign details
			_ = h.db.QueryRow("SELECT code, name FROM contests WHERE id = ?", *c.ParentContestID).Scan(&c.ParentContestCode, &c.ParentContestName)
			// Fetch sibling sub-contests for "Switch Community" menu
			sibRows, err := h.db.Query(`
				SELECT s.id, s.code, s.name, s.wiki_dbname, s.wiki_url, s.wiki_lang, s.wiki_tz, s.status,
				       s.min_words, s.min_bytes, 0, 0, 0, 0, 0
				FROM contests s
				WHERE s.parent_contest_id = ? AND s.id != ?
				ORDER BY s.name ASC
			`, *c.ParentContestID, c.ID)
			if err == nil {
				defer sibRows.Close()
				c.SubContests = []models.SubContestSummary{}
				for sibRows.Next() {
					var sc models.SubContestSummary
					if sErr := sibRows.Scan(
						&sc.ID, &sc.Code, &sc.Name, &sc.WikiDbName, &sc.WikiURL, &sc.WikiLang, &sc.WikiTZ, &sc.Status,
						&sc.MinWords, &sc.MinBytes,
						&sc.TotalArticles, &sc.AcceptedArticles, &sc.PendingArticles,
						&sc.TotalJuries, &sc.TotalSubmitters,
					); sErr == nil {
						c.SubContests = append(c.SubContests, sc)
					}
				}
				c.SubContestCount = len(c.SubContests)
			}
		}
	}

	juryRows, jErr := h.db.Query(`
		SELECT u.wiki_username
		FROM contest_juries cj
		JOIN users u ON cj.user_id = u.id
		WHERE cj.contest_id = ?
		ORDER BY u.wiki_username ASC
	`, c.ID)
	if jErr == nil {
		defer juryRows.Close()
		for juryRows.Next() {
			var uName string
			if err := juryRows.Scan(&uName); err == nil && uName != "" {
				c.Juries = append(c.Juries, uName)
			}
		}
	}
	c.TotalJuries = len(c.Juries)

	jsonResponse(w, http.StatusOK, c)
}

func (h *Handler) UpdateContest(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var contestID int64
	var currentCreatedByID sql.NullInt64
	var currentTZ string
	var currentStart, currentEnd time.Time
	err := h.db.QueryRow(`
		SELECT id, created_by_id, wiki_tz, start_date, end_date 
		FROM contests WHERE code = ?
	`, code).Scan(&contestID, &currentCreatedByID, &currentTZ, &currentStart, &currentEnd)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}

	// Enforce authentication & organizer authorization
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required to update contest settings")
		return
	}
	if !h.isUserOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "Only contest organizers or platform administrators can modify settings")
		return
	}

	var req models.UpdateContestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		jsonError(w, http.StatusBadRequest, "Contest name cannot be empty")
		return
	}

	tz := strings.TrimSpace(req.WikiTZ)
	if tz == "" {
		tz = currentTZ
	}

	startDate := parseFlexibleDate(req.StartDate, tz, currentStart)
	endDate := parseFlexibleDate(req.EndDate, tz, currentEnd)
	if endDate.Before(startDate) {
		jsonError(w, http.StatusBadRequest, "End date cannot be earlier than start date")
		return
	}

	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "active" && status != "ended" && status != "draft" {
		status = "active"
	}

	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Transaction failed")
		return
	}
	defer tx.Rollback()

	mustBeCreator := 0
	if req.RuleMustBeCreator {
		mustBeCreator = 1
	}
	noRedirect := 0
	if req.RuleNoRedirect {
		noRedirect = 1
	}
	noDisambig := 0
	if req.RuleNoDisambig {
		noDisambig = 1
	}
	mainspaceOnly := 0
	if req.RuleMainspaceOnly {
		mainspaceOnly = 1
	}
	createdInWindow := 0
	if req.RuleCreatedInWindow {
		createdInWindow = 1
	}
	rankByWords := 0
	if req.RankByWords {
		rankByWords = 1
	}
	addTalkTemplate := 0
	if req.AddTalkTemplate {
		addTalkTemplate = 1
	}
	distributeJuryQueue := 0
	if req.DistributeJuryQueue {
		distributeJuryQueue = 1
	}

	_, err = tx.Exec(`
		UPDATE contests SET
			name = ?,
			description = ?,
			start_date = ?,
			end_date = ?,
			status = ?,
			wiki_tz = ?,
			rule_must_be_creator = ?,
			rule_no_redirect = ?,
			rule_no_disambig = ?,
			rule_mainspace_only = ?,
			rule_created_in_window = ?,
			min_bytes = ?,
			min_words = ?,
			min_refs = ?,
			max_submissions_per_user = ?,
			rank_by_words = ?,
			add_talk_template = ?,
			talk_template_name = ?,
			distribute_jury_queue = ?
		WHERE id = ?
	`,
		req.Name, strings.TrimSpace(req.Description), startDate, endDate, status, tz,
		mustBeCreator, noRedirect, noDisambig, mainspaceOnly, createdInWindow,
		req.MinBytes, req.MinWords, req.MinRefs, req.MaxSubmissionsPerUser, rankByWords,
		addTalkTemplate, strings.TrimSpace(req.TalkTemplateName), distributeJuryQueue,
		contestID,
	)
	if err != nil {
		log.Printf("[UpdateContest] Update error: %v", err)
		jsonError(w, http.StatusInternalServerError, "Failed to update contest")
		return
	}

	// Update juries if specified
	if req.Juries != nil {
		desiredJuries := make(map[string]bool)
		for _, j := range req.Juries {
			if t := strings.TrimSpace(j); t != "" {
				desiredJuries[t] = true
			}
		}

		// Clear existing juries for this contest
		_, _ = tx.Exec("DELETE FROM contest_juries WHERE contest_id = ?", contestID)

		// Re-insert desired juries
		for jName := range desiredJuries {
			var uID int64
			err := tx.QueryRow("SELECT id FROM users WHERE wiki_username = ?", jName).Scan(&uID)
			if err == sql.ErrNoRows {
				res, insErr := tx.Exec("INSERT INTO users (wiki_username, role) VALUES (?, 'jury')", jName)
				if insErr == nil {
					uID, _ = res.LastInsertId()
				}
			}
			if uID > 0 {
				_, _ = tx.Exec("INSERT INTO contest_juries (contest_id, user_id) VALUES (?, ?)", contestID, uID)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to commit changes")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"message": "Contest configuration updated successfully",
		"code":    code,
		"name":    req.Name,
		"status":  status,
	})
}

func (h *Handler) CreateSubContest(w http.ResponseWriter, r *http.Request) {
	parentCode := chi.URLParam(r, "code")
	var parentID int64
	var parentName, parentTZ string
	var parentStart, parentEnd time.Time
	var isUmbrella int
	err := h.db.QueryRow(`
		SELECT id, name, wiki_tz, start_date, end_date, is_umbrella 
		FROM contests WHERE code = ?
	`, parentCode).Scan(&parentID, &parentName, &parentTZ, &parentStart, &parentEnd, &isUmbrella)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Parent campaign not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if isUmbrella != 1 {
		jsonError(w, http.StatusBadRequest, "Contest is not a multi-community campaign")
		return
	}

	var req models.CreateSubContestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	wikiDbName := strings.TrimSpace(req.WikiDbName)
	if wikiDbName == "" {
		jsonError(w, http.StatusBadRequest, "Wiki database name is required")
		return
	}
	wikiURL := strings.TrimSpace(req.WikiURL)
	if wikiURL == "" {
		wikiURL = fmt.Sprintf("https://%s.org", wikiDbName)
	}
	wikiLang := strings.TrimSpace(req.WikiLang)
	if wikiLang == "" {
		wikiLang = "en"
	}
	wikiTZ := strings.TrimSpace(req.WikiTZ)
	if wikiTZ == "" {
		wikiTZ = parentTZ
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = fmt.Sprintf("%s (%s)", parentName, wikiDbName)
	} else if !strings.Contains(strings.ToLower(name), strings.ToLower(parentName)) {
		name = fmt.Sprintf("%s - %s", parentName, name)
	}

	subCode := generateContestCode()
	mustBeCreator := 0
	if req.RuleMustBeCreator {
		mustBeCreator = 1
	}
	addTalkTemplate := 0
	talkTemplate := strings.TrimSpace(req.TalkTemplateName)
	if talkTemplate != "" {
		addTalkTemplate = 1
	}

	var createdByID *int64
	currentUser := auth.GetUser(r.Context())
	if currentUser != nil && currentUser.UserID > 0 {
		createdByID = &currentUser.UserID
	}

	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to begin transaction")
		return
	}
	defer tx.Rollback()

	res, err := tx.Exec(`
		INSERT INTO contests (
			code, name, description, wiki_dbname, wiki_url, wiki_lang, wiki_tz,
			start_date, end_date, status, is_draft,
			rule_must_be_creator, rule_no_redirect, rule_no_disambig, rule_mainspace_only, rule_created_in_window,
			min_bytes, min_words, min_refs, max_submissions_per_user, rank_by_words,
			add_talk_template, talk_template_name, is_umbrella, parent_contest_id, created_by_id
		) VALUES (
			?, ?, '', ?, ?, ?, ?,
			?, ?, 'active', 0,
			?, 1, 1, 1, 1,
			?, ?, ?, 0, 0,
			?, ?, 0, ?, ?
		)
	`,
		subCode, name, wikiDbName, wikiURL, wikiLang, wikiTZ,
		parentStart, parentEnd,
		mustBeCreator,
		req.MinBytes, req.MinWords, req.MinRefs,
		addTalkTemplate, talkTemplate, parentID, createdByID,
	)
	if err != nil {
		log.Printf("[CreateSubContest] Insert error: %v", err)
		jsonError(w, http.StatusInternalServerError, "Failed to create sub-contest")
		return
	}
	subID, _ := res.LastInsertId()

	localJuries := make(map[string]bool)
	if currentUser != nil && currentUser.WikiUsername != "" {
		localJuries[currentUser.WikiUsername] = true
	}
	for _, j := range req.Juries {
		if trimmed := strings.TrimSpace(j); trimmed != "" {
			localJuries[trimmed] = true
		}
	}
	for jName := range localJuries {
		var uID int64
		_ = tx.QueryRow("SELECT id FROM users WHERE wiki_username = ?", jName).Scan(&uID)
		if uID == 0 {
			uRes, _ := tx.Exec("INSERT INTO users (wiki_username, role) VALUES (?, 'jury')", jName)
			uID, _ = uRes.LastInsertId()
		}
		if uID > 0 {
			_, _ = tx.Exec("INSERT INTO contest_juries (contest_id, user_id) VALUES (?, ?)", subID, uID)
		}
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to commit transaction")
		return
	}

	jsonResponse(w, http.StatusCreated, map[string]any{
		"message": "Sub-contest created successfully",
		"code":    subCode,
		"id":      subID,
		"name":    name,
	})
}

func (h *Handler) GetAvailableContests(w http.ResponseWriter, r *http.Request) {
	parentCode := chi.URLParam(r, "code")
	var parentID int64
	var isUmbrella int
	err := h.db.QueryRow("SELECT id, is_umbrella FROM contests WHERE code = ?", parentCode).Scan(&parentID, &isUmbrella)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Parent campaign not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if isUmbrella != 1 {
		jsonError(w, http.StatusBadRequest, "Contest is not a multi-community campaign")
		return
	}

	search := strings.TrimSpace(r.URL.Query().Get("q"))
	var query string
	var args []any

	if search != "" {
		likePattern := "%" + search + "%"
		query = `
			SELECT c.id, c.code, c.name, c.wiki_dbname, c.wiki_url, c.wiki_lang, c.start_date, c.end_date, c.status,
			       COUNT(a.id) as total_articles
			FROM contests c
			LEFT JOIN articles a ON a.contest_id = c.id
			WHERE c.is_umbrella = 0
			  AND (c.parent_contest_id IS NULL OR c.parent_contest_id = 0)
			  AND c.id != ?
			  AND (c.name LIKE ? OR c.code LIKE ? OR c.wiki_dbname LIKE ?)
			GROUP BY c.id
			ORDER BY c.id DESC LIMIT 30
		`
		args = []any{parentID, likePattern, likePattern, likePattern}
	} else {
		query = `
			SELECT c.id, c.code, c.name, c.wiki_dbname, c.wiki_url, c.wiki_lang, c.start_date, c.end_date, c.status,
			       COUNT(a.id) as total_articles
			FROM contests c
			LEFT JOIN articles a ON a.contest_id = c.id
			WHERE c.is_umbrella = 0
			  AND (c.parent_contest_id IS NULL OR c.parent_contest_id = 0)
			  AND c.id != ?
			GROUP BY c.id
			ORDER BY c.id DESC LIMIT 30
		`
		args = []any{parentID}
	}

	rows, err := h.db.Query(query, args...)
	if err != nil {
		log.Printf("[GetAvailableContests] Query error: %v", err)
		jsonError(w, http.StatusInternalServerError, "Failed to query available contests")
		return
	}
	defer rows.Close()

	list := make([]models.AvailableContestSummary, 0)
	for rows.Next() {
		var item models.AvailableContestSummary
		var start, end time.Time
		if err := rows.Scan(
			&item.ID, &item.Code, &item.Name, &item.WikiDbName, &item.WikiURL, &item.WikiLang,
			&start, &end, &item.Status, &item.TotalArticles,
		); err != nil {
			continue
		}
		item.StartDate = start.Format(time.RFC3339)
		item.EndDate = end.Format(time.RFC3339)
		list = append(list, item)
	}

	jsonResponse(w, http.StatusOK, list)
}

func (h *Handler) AttachContest(w http.ResponseWriter, r *http.Request) {
	parentCode := chi.URLParam(r, "code")
	var parentID int64
	var parentName string
	var isUmbrella int
	err := h.db.QueryRow("SELECT id, name, is_umbrella FROM contests WHERE code = ?", parentCode).Scan(&parentID, &parentName, &isUmbrella)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Parent campaign not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}
	if isUmbrella != 1 {
		jsonError(w, http.StatusBadRequest, "Target contest is not a multi-community campaign")
		return
	}

	var req models.AttachContestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	var targetID int64
	var targetCode, targetName, targetWiki string
	var targetIsUmbrella int
	var currentParentID sql.NullInt64

	if req.ContestID > 0 {
		err = h.db.QueryRow(`
			SELECT id, code, name, wiki_dbname, is_umbrella, parent_contest_id 
			FROM contests WHERE id = ?
		`, req.ContestID).Scan(&targetID, &targetCode, &targetName, &targetWiki, &targetIsUmbrella, &currentParentID)
	} else if req.ContestCode != "" {
		err = h.db.QueryRow(`
			SELECT id, code, name, wiki_dbname, is_umbrella, parent_contest_id 
			FROM contests WHERE code = ?
		`, strings.TrimSpace(req.ContestCode)).Scan(&targetID, &targetCode, &targetName, &targetWiki, &targetIsUmbrella, &currentParentID)
	} else {
		jsonError(w, http.StatusBadRequest, "contest_id or contest_code is required")
		return
	}

	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest to attach not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if targetID == parentID {
		jsonError(w, http.StatusBadRequest, "Cannot attach a campaign to itself")
		return
	}
	if targetIsUmbrella == 1 {
		jsonError(w, http.StatusBadRequest, "Cannot attach another multi-community campaign")
		return
	}
	if currentParentID.Valid && currentParentID.Int64 == parentID {
		jsonError(w, http.StatusBadRequest, "Contest is already attached to this campaign")
		return
	}

	_, err = h.db.Exec("UPDATE contests SET parent_contest_id = ? WHERE id = ?", parentID, targetID)
	if err != nil {
		log.Printf("[AttachContest] Update error: %v", err)
		jsonError(w, http.StatusInternalServerError, "Failed to attach contest")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"message": "Contest successfully attached as community edition",
		"id": targetID,
		"code": targetCode,
		"name": targetName,
		"wiki_dbname": targetWiki,
		"parent_contest_id": parentID,
		"parent_contest_name": parentName,
	})
}

func (h *Handler) DetachContest(w http.ResponseWriter, r *http.Request) {
	parentCode := chi.URLParam(r, "code")
	var parentID int64
	var isUmbrella int
	err := h.db.QueryRow("SELECT id, is_umbrella FROM contests WHERE code = ?", parentCode).Scan(&parentID, &isUmbrella)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Parent campaign not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	var req models.DetachContestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request JSON payload")
		return
	}

	var targetID int64
	if req.ContestID > 0 {
		targetID = req.ContestID
	} else if req.ContestCode != "" {
		_ = h.db.QueryRow("SELECT id FROM contests WHERE code = ?", strings.TrimSpace(req.ContestCode)).Scan(&targetID)
	}

	if targetID == 0 {
		jsonError(w, http.StatusBadRequest, "Valid contest_id or contest_code required")
		return
	}

	res, err := h.db.Exec("UPDATE contests SET parent_contest_id = NULL WHERE id = ? AND parent_contest_id = ?", targetID, parentID)
	if err != nil {
		log.Printf("[DetachContest] Update error: %v", err)
		jsonError(w, http.StatusInternalServerError, "Failed to detach contest")
		return
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		jsonError(w, http.StatusNotFound, "Contest was not attached to this campaign")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"message": "Contest successfully detached from campaign",
		"id": targetID,
	})
}

func (h *Handler) GetContestArticles(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var contestID int64
	err := h.db.QueryRow("SELECT id FROM contests WHERE code = ?", code).Scan(&contestID)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	var beforeID int64
	if b := r.URL.Query().Get("before_id"); b != "" {
		beforeID, _ = strconv.ParseInt(b, 10, 64)
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsedLimit, err := strconv.Atoi(l); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	status := r.URL.Query().Get("status")
	var assignedToID int64
	if a := r.URL.Query().Get("assigned_to_id"); a != "" {
		assignedToID, _ = strconv.ParseInt(a, 10, 64)
	}
	assignedToUsername := strings.TrimSpace(r.URL.Query().Get("assigned_to"))

	res, err := h.db.GetArticlesKeysetWithJudge(contestID, beforeID, status, assignedToID, assignedToUsername, limit)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query articles")
		return
	}

	jsonResponse(w, http.StatusOK, res)
}

func (h *Handler) GetUserCreatedArticles(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	username := strings.TrimSpace(r.URL.Query().Get("username"))
	if username == "" {
		if currentUser := auth.GetUser(r.Context()); currentUser != nil {
			username = currentUser.WikiUsername
		}
	}
	if username == "" {
		jsonError(w, http.StatusBadRequest, "Username is required")
		return
	}

	var contest models.Contest
	err := h.db.QueryRow(`
		SELECT id, wiki_url, start_date, end_date FROM contests WHERE code = ?
	`, code).Scan(&contest.ID, &contest.WikiURL, &contest.StartDate, &contest.EndDate)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}

	startTS := contest.StartDate.Format(time.RFC3339)
	endTS := contest.EndDate.Format(time.RFC3339)

	creations, err := mwclient.FetchUserCreatedArticles(contest.WikiURL, username, startTS, endTS)
	if err != nil {
		log.Printf("[UserCreatedArticles] Error fetching creations for %s: %v", username, err)
		creations = []mwclient.UserCreation{}
	}

	rows, err := h.db.Query(`
		SELECT a.title FROM articles a
		JOIN users u ON a.submitter_id = u.id
		WHERE a.contest_id = ? AND u.wiki_username = ?
	`, contest.ID, username)
	alreadySubmitted := make([]string, 0)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var t string
			if err := rows.Scan(&t); err == nil {
				alreadySubmitted = append(alreadySubmitted, t)
			}
		}
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"username":          username,
		"articles":          creations,
		"already_submitted": alreadySubmitted,
	})
}

// -------------------------------------------------------------
// Real MediaWiki Article Submission & Verification
// -------------------------------------------------------------

type BulkSubmitRequest struct {
	Titles   []string `json:"titles"`
	Username string   `json:"username"`
}

func (h *Handler) SubmitArticles(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var contest models.Contest
	var distributeJuryQueueInt int
	err := h.db.QueryRow(`
		SELECT id, name, status, wiki_url, min_bytes, min_words, min_refs, max_submissions_per_user,
		       rule_must_be_creator, rule_no_redirect, rule_created_in_window,
		       custom_creation_start_date, custom_creation_end_date, start_date, end_date,
		       COALESCE(distribute_jury_queue, 0)
		FROM contests WHERE code = ?
	`, code).Scan(
		&contest.ID, &contest.Name, &contest.Status, &contest.WikiURL, &contest.MinBytes,
		&contest.MinWords, &contest.MinRefs, &contest.MaxSubmissionsPerUser,
		&contest.RuleMustBeCreator, &contest.RuleNoRedirect, &contest.RuleCreatedInWindow,
		&contest.CustomCreationStartDate, &contest.CustomCreationEndDate,
		&contest.StartDate, &contest.EndDate, &distributeJuryQueueInt,
	)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}
	contest.DistributeJuryQueue = distributeJuryQueueInt == 1

	if contest.Status == "pending_approval" {
		jsonError(w, http.StatusForbidden, "Contest is currently pending administrator approval")
		return
	}
	if contest.Status == "rejected" {
		jsonError(w, http.StatusForbidden, "Contest has been rejected by administrator")
		return
	}

	var req BulkSubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if len(req.Titles) == 0 {
		jsonError(w, http.StatusBadRequest, "No article titles provided")
		return
	}

	// Resolve submitter username: preference to authenticated session, fallback to body
	submitter := strings.TrimSpace(req.Username)
	if currentUser := auth.GetUser(r.Context()); currentUser != nil {
		if submitter == "" || (currentUser.Role != "owner" && currentUser.Role != "jury") {
			submitter = currentUser.WikiUsername
		}
	}
	if submitter == "" {
		submitter = "Anonymous"
	}

	var submitterID int64
	_ = h.db.QueryRow("SELECT id FROM users WHERE wiki_username = ?", submitter).Scan(&submitterID)
	if submitterID == 0 {
		res, err := h.db.Exec("INSERT INTO users(wiki_username, role) VALUES(?, 'participant')", submitter)
		if err == nil {
			submitterID, _ = res.LastInsertId()
		}
	}

	submittedCount := 0
	type SubmitResult struct {
		Title  string `json:"title"`
		Status string `json:"status"`
		Error  string `json:"error,omitempty"`
	}
	// 1. Collect valid titles
	var validTitles []string
	for _, rawTitle := range req.Titles {
		clean := strings.TrimSpace(rawTitle)
		if clean != "" {
			validTitles = append(validTitles, clean)
		}
	}

	if len(validTitles) == 0 {
		jsonError(w, http.StatusBadRequest, "No valid titles provided")
		return
	}

	// 2. Battle-tested MediaWiki 50-title batch query
	pagesMap, batchErr := mwclient.FetchPagesBatch(contest.WikiURL, validTitles)
	if batchErr != nil {
		log.Printf("[MediaWiki] Batch query failed: %v", batchErr)
	}

	var results []SubmitResult
	var newPendingArticles []balancer.ArticleItem

	for _, cleanTitle := range validTitles {
		pageInfo := pagesMap[cleanTitle]
		// In case MediaWiki normalized title casing or spacing
		if pageInfo == nil {
			for _, p := range pagesMap {
				if strings.EqualFold(p.Title, cleanTitle) {
					pageInfo = p
					break
				}
			}
		}

		status := "pending"
		validationErr := ""

		if batchErr != nil && pageInfo == nil {
			status = "validation_failed"
			validationErr = "Failed to communicate with MediaWiki Action API"
		} else if pageInfo == nil || !pageInfo.Exists {
			status = "validation_failed"
			validationErr = "Page does not exist on " + contest.WikiURL
		} else if contest.RuleNoRedirect && pageInfo.IsRedirect {
			status = "validation_failed"
			validationErr = "Page is a redirect"
		} else if contest.RuleMustBeCreator && !strings.EqualFold(pageInfo.Creator, submitter) {
			status = "validation_failed"
			validationErr = fmt.Sprintf("Author mismatch: creator is '%s', submitted by '%s'", pageInfo.Creator, submitter)
		} else if contest.RuleCreatedInWindow && !pageInfo.CreationDate.IsZero() && (pageInfo.CreationDate.Before(contest.StartDate) || pageInfo.CreationDate.After(contest.EndDate)) {
			status = "validation_failed"
			validationErr = fmt.Sprintf("Article created outside contest timeframe: created on %s (window: %s to %s)",
				pageInfo.CreationDate.Format("2006-01-02"), contest.StartDate.Format("2006-01-02"), contest.EndDate.Format("2006-01-02"))
		} else if !contest.RuleCreatedInWindow {
			if contest.CustomCreationStartDate != nil && !pageInfo.CreationDate.IsZero() && pageInfo.CreationDate.Before(*contest.CustomCreationStartDate) {
				status = "validation_failed"
				validationErr = fmt.Sprintf("Article created before required start date: created on %s (minimum creation date: %s)",
					pageInfo.CreationDate.Format("2006-01-02"), contest.CustomCreationStartDate.Format("2006-01-02"))
			} else if contest.CustomCreationEndDate != nil && !pageInfo.CreationDate.IsZero() && pageInfo.CreationDate.After(*contest.CustomCreationEndDate) {
				status = "validation_failed"
				validationErr = fmt.Sprintf("Article created after required end date: created on %s (maximum creation date: %s)",
					pageInfo.CreationDate.Format("2006-01-02"), contest.CustomCreationEndDate.Format("2006-01-02"))
			}
		} else if contest.MinWords > 0 && pageInfo.WordCount < contest.MinWords {
			status = "validation_failed"
			validationErr = fmt.Sprintf("Word count too low: %d words (min: %d required)", pageInfo.WordCount, contest.MinWords)
		} else if contest.MinBytes > 0 && pageInfo.ByteSize < contest.MinBytes {
			status = "validation_failed"
			validationErr = fmt.Sprintf("Byte size too low: %d bytes (min: %d required)", pageInfo.ByteSize, contest.MinBytes)
		} else if contest.MinRefs > 0 && pageInfo.RefCount < contest.MinRefs {
			status = "validation_failed"
			validationErr = fmt.Sprintf("Too few references: %d found (min: %d required)", pageInfo.RefCount, contest.MinRefs)
		} else if contest.MaxSubmissionsPerUser > 0 {
			var userSubCount int
			_ = h.db.QueryRow("SELECT COUNT(*) FROM articles WHERE contest_id = ? AND submitter_id = ?", contest.ID, submitterID).Scan(&userSubCount)
			if userSubCount >= contest.MaxSubmissionsPerUser {
				status = "validation_failed"
				validationErr = fmt.Sprintf("Submission limit reached: maximum %d articles per participant allowed", contest.MaxSubmissionsPerUser)
			}
		}

		byteSize := 0
		wordCount := 0
		creator := ""
		if pageInfo != nil {
			byteSize = pageInfo.ByteSize
			wordCount = pageInfo.WordCount
			creator = pageInfo.Creator
		}

		res, err := h.db.Exec(`
			INSERT INTO articles (contest_id, title, submitter_id, status, validation_error, byte_count, word_count, wiki_creator)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, contest.ID, cleanTitle, submitterID, status, validationErr, byteSize, wordCount, creator)

		if err == nil {
			submittedCount++
			articleID, _ := res.LastInsertId()
			if status == "pending" {
				newPendingArticles = append(newPendingArticles, balancer.ArticleItem{
					ArticleID:   articleID,
					SubmitterID: submitterID,
				})
			}
			if (status == "pending" || status == "accepted") && contest.AddTalkTemplate && strings.TrimSpace(contest.TalkTemplateName) != "" && h.talkQueue != nil {
				h.talkQueue.Enqueue(models.TalkPageJob{
					ContestID: contest.ID,
					ArticleID: articleID,
					Title:     cleanTitle,
				})
			}
		}

		results = append(results, SubmitResult{
			Title:  cleanTitle,
			Status: status,
			Error:  validationErr,
		})
	}

	// If contest has distributed queue enabled, partition pending articles across juries
	if contest.DistributeJuryQueue && len(newPendingArticles) > 0 {
		h.balanceArticles(contest.ID, newPendingArticles)
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"submitted": submittedCount,
		"results":   results,
		"message":   fmt.Sprintf("Processed %d articles (%d accepted to queue)", len(results), submittedCount),
	})
}

// isPlatformOwner verifies if a user has platform owner or administrator privileges.
func (h *Handler) isPlatformOwner(user *auth.Claims) bool {
	if user == nil {
		return false
	}
	if user.Role == "owner" || user.Role == "admin" {
		return true
	}
	if h.cfg.OwnerUsername != "" && strings.EqualFold(user.WikiUsername, h.cfg.OwnerUsername) {
		return true
	}
	// Fallback DB check in case role in claims was before promotion
	var dbRole string
	err := h.db.QueryRow("SELECT role FROM users WHERE id = ?", user.UserID).Scan(&dbRole)
	if err == nil && (dbRole == "owner" || dbRole == "admin") {
		return true
	}
	return false
}

// isUserJuryOrOrganizer verifies if a user has jury, contest creator, or platform owner rights for a contest (including via parent umbrella campaign).
func (h *Handler) isUserJuryOrOrganizer(contestID int64, userID int64, role string) bool {
	if role == "owner" || role == "admin" {
		return true
	}
	var count int
	_ = h.db.QueryRow(`
		SELECT COUNT(1) FROM (
			SELECT 1 FROM contests WHERE id = ? AND created_by_id = ?
			UNION
			SELECT 1 FROM contests parent
			JOIN contests sub ON sub.parent_contest_id = parent.id
			WHERE sub.id = ? AND parent.created_by_id = ?
			UNION
			SELECT 1 FROM contest_juries WHERE contest_id = ? AND user_id = ?
			UNION
			SELECT 1 FROM contest_juries cj
			JOIN contests sub ON sub.parent_contest_id = cj.contest_id
			WHERE sub.id = ? AND cj.user_id = ?
		)
	`, contestID, userID, contestID, userID, contestID, userID, contestID, userID).Scan(&count)
	return count > 0
}

// isUserOrganizer verifies if a user has contest creator, organizer, or platform owner rights for a contest (including via parent umbrella campaign).
func (h *Handler) isUserOrganizer(contestID int64, userID int64, role string) bool {
	if role == "owner" || role == "admin" {
		return true
	}
	var count int
	_ = h.db.QueryRow(`
		SELECT COUNT(1) FROM (
			SELECT 1 FROM contests WHERE id = ? AND created_by_id = ?
			UNION
			SELECT 1 FROM contests parent
			JOIN contests sub ON sub.parent_contest_id = parent.id
			WHERE sub.id = ? AND parent.created_by_id = ?
			UNION
			SELECT 1 FROM contest_juries WHERE contest_id = ? AND user_id = ?
			UNION
			SELECT 1 FROM contest_juries cj
			JOIN contests sub ON sub.parent_contest_id = cj.contest_id
			WHERE sub.id = ? AND cj.user_id = ?
		)
	`, contestID, userID, contestID, userID, contestID, userID, contestID, userID).Scan(&count)
	return count > 0
}

// balanceArticles distributes pending articles using the scarcity-first water-filling algorithm
func (h *Handler) balanceArticles(contestID int64, items []balancer.ArticleItem) {
	rows, err := h.db.Query(`SELECT id FROM users WHERE role IN ('jury', 'owner')`)
	if err != nil {
		return
	}
	defer rows.Close()

	var juryIDs []int64
	loads := make(map[int64]int)
	for rows.Next() {
		var jid int64
		if err := rows.Scan(&jid); err == nil {
			juryIDs = append(juryIDs, jid)
			loads[jid] = 0
		}
	}

	if len(juryIDs) == 0 {
		return
	}

	loadRows, err := h.db.Query(`
		SELECT assigned_to_id, COUNT(*)
		FROM articles
		WHERE contest_id = ? AND status = 'pending' AND assigned_to_id IS NOT NULL
		GROUP BY assigned_to_id
	`, contestID)
	if err == nil {
		defer loadRows.Close()
		for loadRows.Next() {
			var jid int64
			var cnt int
			if err := loadRows.Scan(&jid, &cnt); err == nil {
				loads[jid] = cnt
			}
		}
	}

	eligibleBySubmitter := make(map[int64][]int64)
	for _, it := range items {
		if _, exists := eligibleBySubmitter[it.SubmitterID]; !exists {
			var eligible []int64
			for _, jid := range juryIDs {
				if jid != it.SubmitterID || len(juryIDs) == 1 {
					eligible = append(eligible, jid)
				}
			}
			eligibleBySubmitter[it.SubmitterID] = eligible
		}
	}

	plan := balancer.PlanScarcityFirst(items, loads, eligibleBySubmitter)
	for articleID, assignedJuryID := range plan {
		_, _ = h.db.Exec("UPDATE articles SET assigned_to_id = ? WHERE id = ?", assignedJuryID, articleID)
	}
}

// -------------------------------------------------------------
// Real Rendered Article Preview from MediaWiki action=parse
// -------------------------------------------------------------

func (h *Handler) GetArticlePreview(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	var wikiURL, title string
	var wordCount, byteCount int
	err = h.db.QueryRow(`
		SELECT c.wiki_url, a.title, a.word_count, a.byte_count
		FROM articles a
		JOIN contests c ON a.contest_id = c.id
		LEFT JOIN contests parent ON c.parent_contest_id = parent.id
		WHERE (c.code = ? OR parent.code = ?) AND a.id = ?
	`, code, code, articleID).Scan(&wikiURL, &title, &wordCount, &byteCount)

	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Article not found")
		return
	}

	// Fetch real rendered HTML and raw wikitext from MediaWiki action=parse
	htmlContent, wikitextContent, err := mwclient.FetchRenderedContent(wikiURL, title)
	if err != nil {
		htmlContent = fmt.Sprintf("<div class='p-4 text-destructive'>Failed to load preview from %s: %v</div>", wikiURL, err)
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"id":         articleID,
		"title":      title,
		"word_count": wordCount,
		"byte_count": byteCount,
		"html":       htmlContent,
		"wikitext":   wikitextContent,
		"wiki_url":   fmt.Sprintf("%s/wiki/%s", wikiURL, title),
	})
}

// -------------------------------------------------------------
// Review Actions
// -------------------------------------------------------------

type ReviewDecisionRequest struct {
	Status  string `json:"status"` // "accepted", "rejected", "skipped", "pending" (undo)
	Comment string `json:"comment"`
}

func (h *Handler) ReviewArticle(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	var req ReviewDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	if req.Status != "accepted" && req.Status != "rejected" && req.Status != "skipped" && req.Status != "pending" {
		jsonError(w, http.StatusBadRequest, "Status must be 'accepted', 'rejected', 'skipped', or 'pending'")
		return
	}

	// 1. Enforce authentication
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required to review articles")
		return
	}

	// 2. Fetch article's contest ID and submitter ID
	var contestID int64
	var submitterID int64
	err = h.db.QueryRow("SELECT contest_id, submitter_id FROM articles WHERE id = ?", articleID).Scan(&contestID, &submitterID)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Article not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}

	// 3. Conflict of Interest (COI) check: Jury cannot review their own article
	if currentUser.UserID == submitterID && currentUser.Role != "owner" {
		jsonError(w, http.StatusForbidden, "Conflict of interest: You cannot review your own submitted article")
		return
	}

	// 4. Role Authorization: must be assigned jury, contest creator, or platform owner
	if !h.isUserJuryOrOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "You do not have jury permissions for this contest")
		return
	}

	reviewer := currentUser.WikiUsername
	reviewerID := currentUser.UserID
	if reviewerID == 0 {
		_ = h.db.QueryRow("SELECT id FROM users WHERE wiki_username = ?", reviewer).Scan(&reviewerID)
		if reviewerID == 0 {
			res, _ := h.db.Exec("INSERT INTO users(wiki_username, role) VALUES(?, 'jury')", reviewer)
			reviewerID, _ = res.LastInsertId()
		}
	}

	// Handle Undo / rollback to pending
	if req.Status == "pending" {
		_, _ = h.db.Exec("UPDATE articles SET status = 'pending' WHERE id = ?", articleID)
		_, _ = h.db.Exec("DELETE FROM reviews WHERE article_id = ? AND reviewer_id = ?", articleID, reviewerID)
		jsonResponse(w, http.StatusOK, map[string]string{
			"message":  "Decision undone successfully",
			"status":   "pending",
			"reviewer": reviewer,
		})
		return
	}

	_, err = h.db.Exec(`
		INSERT INTO reviews(article_id, reviewer_id, status, comment, timestamp)
		VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(article_id, reviewer_id) DO UPDATE SET
			status = excluded.status,
			comment = excluded.comment,
			timestamp = CURRENT_TIMESTAMP
	`, articleID, reviewerID, req.Status, req.Comment)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to record review")
		return
	}

	if req.Status == "accepted" || req.Status == "rejected" {
		_, _ = h.db.Exec("UPDATE articles SET status = ? WHERE id = ?", req.Status, articleID)
	}

	// If article is accepted, ensure talk page template is queued if contest automation is enabled
	if req.Status == "accepted" && h.talkQueue != nil {
		var addTalkTemplate int
		var talkTemplateName string
		var articleTitle string
		_ = h.db.QueryRow(`
			SELECT c.add_talk_template, COALESCE(c.talk_template_name, ''), a.title
			FROM contests c
			JOIN articles a ON a.contest_id = c.id
			WHERE a.id = ?
		`, articleID).Scan(&addTalkTemplate, &talkTemplateName, &articleTitle)
		if addTalkTemplate == 1 && strings.TrimSpace(talkTemplateName) != "" {
			h.talkQueue.Enqueue(models.TalkPageJob{
				ContestID: contestID,
				ArticleID: articleID,
				Title:     articleTitle,
			})
		}
	}

	jsonResponse(w, http.StatusOK, map[string]string{
		"message":  "Review recorded successfully",
		"status":   req.Status,
		"reviewer": reviewer,
	})
}

func (h *Handler) AcquireArticleLock(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var contestID int64
	var lockedByID sql.NullInt64
	var lockedUntil sql.NullTime
	var lockedByUsername sql.NullString
	err = h.db.QueryRow(`
		SELECT a.contest_id, a.locked_by_id, a.locked_until, u.wiki_username
		FROM articles a
		LEFT JOIN users u ON a.locked_by_id = u.id
		WHERE a.id = ?
	`, articleID).Scan(&contestID, &lockedByID, &lockedUntil, &lockedByUsername)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Article not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if !h.isUserJuryOrOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "You do not have jury permissions for this contest")
		return
	}

	// Check if already actively locked by someone else
	if lockedByID.Valid && lockedUntil.Valid && lockedUntil.Time.After(time.Now()) && lockedByID.Int64 != currentUser.UserID {
		// Owner can override; others get 409
		if !h.isUserOrganizer(contestID, currentUser.UserID, currentUser.Role) {
			jsonResponse(w, http.StatusConflict, map[string]any{
				"error":        fmt.Sprintf("Article is currently being reviewed by %s", lockedByUsername.String),
				"locked_by":    lockedByUsername.String,
				"locked_until": lockedUntil.Time,
			})
			return
		}
	}

	// Acquire or refresh 5-minute lock
	expiry := time.Now().Add(5 * time.Minute)
	_, err = h.db.Exec("UPDATE articles SET locked_until = ?, locked_by_id = ? WHERE id = ?", expiry, currentUser.UserID, articleID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to acquire lock")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"success":      true,
		"locked_by":    currentUser.WikiUsername,
		"locked_until": expiry,
	})
}

func (h *Handler) ReleaseArticleLock(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	if currentUser.Role == "owner" {
		_, _ = h.db.Exec("UPDATE articles SET locked_until = NULL, locked_by_id = NULL WHERE id = ?", articleID)
	} else {
		_, _ = h.db.Exec("UPDATE articles SET locked_until = NULL, locked_by_id = NULL WHERE id = ? AND locked_by_id = ?", articleID, currentUser.UserID)
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Lock released",
	})
}

func (h *Handler) UndoReview(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var contestID int64
	var title string
	err = h.db.QueryRow("SELECT contest_id, title FROM articles WHERE id = ?", articleID).Scan(&contestID, &title)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Article not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if !h.isUserJuryOrOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "You do not have jury permissions for this contest")
		return
	}

	_, _ = h.db.Exec("UPDATE articles SET status = 'pending' WHERE id = ?", articleID)
	_, _ = h.db.Exec("DELETE FROM reviews WHERE article_id = ? AND (reviewer_id = ? OR ? = 'owner')", articleID, currentUser.UserID, currentUser.Role)

	jsonResponse(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Decision undone successfully",
		"status":  "pending",
		"article": title,
	})
}

func (h *Handler) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var contestID int64
	var title string
	err = h.db.QueryRow("SELECT contest_id, title FROM articles WHERE id = ?", articleID).Scan(&contestID, &title)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Article not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if !h.isUserJuryOrOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "You do not have permission to delete articles from this contest")
		return
	}

	// Delete article and dependent records
	_, _ = h.db.Exec("DELETE FROM talk_page_jobs WHERE article_id = ?", articleID)
	_, _ = h.db.Exec("DELETE FROM reviews WHERE article_id = ?", articleID)
	_, err = h.db.Exec("DELETE FROM articles WHERE id = ?", articleID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to delete article")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"success": true,
		"message": fmt.Sprintf("Article '%s' deleted successfully", title),
	})
}

type BulkReviewRequest struct {
	ArticleIDs []int64 `json:"article_ids"`
	Status     string  `json:"status"` // "accepted" or "rejected"
	Comment    string  `json:"comment"`
}

func (h *Handler) BulkReview(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	var req BulkReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	if req.Status != "accepted" && req.Status != "rejected" {
		jsonError(w, http.StatusBadRequest, "Bulk review status must be 'accepted' or 'rejected'")
		return
	}

	if len(req.ArticleIDs) == 0 {
		jsonError(w, http.StatusBadRequest, "No article IDs provided")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}
	defer tx.Rollback()

	reviewedCount := 0
	for _, articleID := range req.ArticleIDs {
		var contestID int64
		var submitterID int64
		err := tx.QueryRow("SELECT contest_id, submitter_id FROM articles WHERE id = ?", articleID).Scan(&contestID, &submitterID)
		if err != nil {
			continue
		}

		// Authorization check
		if !h.isUserJuryOrOrganizer(contestID, currentUser.UserID, currentUser.Role) {
			continue
		}

		// COI Check: Jury cannot review their own article unless owner
		if submitterID == currentUser.UserID && currentUser.Role != "owner" {
			continue
		}

		_, err = tx.Exec(`
			INSERT INTO reviews(article_id, reviewer_id, status, comment, timestamp)
			VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(article_id, reviewer_id) DO UPDATE SET
				status = excluded.status,
				comment = excluded.comment,
				timestamp = CURRENT_TIMESTAMP
		`, articleID, currentUser.UserID, req.Status, req.Comment)
		if err != nil {
			continue
		}

		_, err = tx.Exec("UPDATE articles SET status = ? WHERE id = ?", req.Status, articleID)
		if err != nil {
			continue
		}

		reviewedCount++
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to commit reviews")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"success":        true,
		"reviewed_count": reviewedCount,
		"status":         req.Status,
	})
}

// -------------------------------------------------------------
// Jury Hub Statistics & Queue Redistribution
// -------------------------------------------------------------

type JuryMemberProgress struct {
	Username        string  `json:"username"`
	Assigned        int     `json:"assigned"`
	Judged          int     `json:"judged"`
	Remaining       int     `json:"remaining"`
	Accepted        int     `json:"accepted"`
	Rejected        int     `json:"rejected"`
	Skipped         int     `json:"skipped"`
	AcceptanceRate  float64 `json:"acceptance_rate"`
	ProgressPercent int     `json:"progress_percent"`
}

type JuryStatsResponse struct {
	TotalArticles    int                  `json:"total_articles"`
	AcceptedArticles int                  `json:"accepted_articles"`
	RejectedArticles int                  `json:"rejected_articles"`
	PendingArticles  int                  `json:"pending_articles"`
	ReviewedArticles int                  `json:"reviewed_articles"`
	ProgressPercent  int                  `json:"progress_percent"`
	Juries           []JuryMemberProgress `json:"juries"`
}

func (h *Handler) GetJuryStats(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	var contestID int64
	err := h.db.QueryRow("SELECT id FROM contests WHERE code = ?", code).Scan(&contestID)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	// Enforce authentication & jury/organizer authorization
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required to view jury statistics")
		return
	}
	if !h.isUserJuryOrOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "You do not have jury permissions for this contest")
		return
	}

	var resp JuryStatsResponse
	_ = h.db.QueryRow(`
		SELECT 
			COUNT(id),
			COUNT(CASE WHEN status = 'accepted' THEN 1 END),
			COUNT(CASE WHEN status = 'rejected' THEN 1 END),
			COUNT(CASE WHEN status = 'pending' THEN 1 END)
		FROM articles WHERE contest_id = ?
	`, contestID).Scan(&resp.TotalArticles, &resp.AcceptedArticles, &resp.RejectedArticles, &resp.PendingArticles)

	resp.ReviewedArticles = resp.AcceptedArticles + resp.RejectedArticles
	if resp.TotalArticles > 0 {
		resp.ProgressPercent = int(math.Round(float64(resp.ReviewedArticles) / float64(resp.TotalArticles) * 100))
	}

	juryQuery := `
		SELECT DISTINCT u.id, u.wiki_username
		FROM users u
		LEFT JOIN contest_juries cj ON u.id = cj.user_id AND cj.contest_id = ?
		WHERE cj.contest_id IS NOT NULL 
		   OR u.id IN (SELECT DISTINCT assigned_to_id FROM articles WHERE contest_id = ? AND assigned_to_id IS NOT NULL)
		   OR u.id IN (SELECT DISTINCT r.reviewer_id FROM reviews r JOIN articles a ON r.article_id = a.id WHERE a.contest_id = ?)
	`
	jRows, err := h.db.Query(juryQuery, contestID, contestID, contestID)
	if err == nil {
		defer jRows.Close()
		for jRows.Next() {
			var jid int64
			var username string
			if err := jRows.Scan(&jid, &username); err != nil {
				continue
			}

			var jp JuryMemberProgress
			jp.Username = username

			_ = h.db.QueryRow(`
				SELECT COUNT(*) FROM articles 
				WHERE contest_id = ? AND assigned_to_id = ? AND status = 'pending'
			`, contestID, jid).Scan(&jp.Remaining)

			_ = h.db.QueryRow(`
				SELECT COUNT(*) FROM articles 
				WHERE contest_id = ? AND assigned_to_id = ?
			`, contestID, jid).Scan(&jp.Assigned)

			_ = h.db.QueryRow(`
				SELECT 
					COUNT(r.id),
					COUNT(CASE WHEN r.status = 'accepted' THEN 1 END),
					COUNT(CASE WHEN r.status = 'rejected' THEN 1 END),
					COUNT(CASE WHEN r.status = 'skipped' THEN 1 END)
				FROM reviews r
				JOIN articles a ON r.article_id = a.id
				WHERE a.contest_id = ? AND r.reviewer_id = ?
			`, contestID, jid).Scan(&jp.Judged, &jp.Accepted, &jp.Rejected, &jp.Skipped)

			if jp.Judged > 0 {
				jp.AcceptanceRate = math.Round((float64(jp.Accepted)/float64(jp.Judged))*1000) / 10
			}

			totalWork := jp.Judged + jp.Remaining
			if totalWork > 0 {
				jp.ProgressPercent = int(math.Round(float64(jp.Judged) / float64(totalWork) * 100))
			}

			resp.Juries = append(resp.Juries, jp)
		}
	}

	if resp.Juries == nil {
		resp.Juries = []JuryMemberProgress{}
	}

	jsonResponse(w, http.StatusOK, resp)
}

func (h *Handler) RedistributeQueues(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	var contestID int64
	err := h.db.QueryRow("SELECT id FROM contests WHERE code = ?", code).Scan(&contestID)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	// Enforce authentication & jury/organizer authorization
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required to redistribute queues")
		return
	}
	if !h.isUserJuryOrOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "You do not have permissions to rebalance queues for this contest")
		return
	}

	rows, err := h.db.Query("SELECT id, submitter_id FROM articles WHERE contest_id = ? AND status = 'pending'", contestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query pending articles")
		return
	}
	defer rows.Close()

	var items []balancer.ArticleItem
	for rows.Next() {
		var it balancer.ArticleItem
		if err := rows.Scan(&it.ArticleID, &it.SubmitterID); err == nil {
			items = append(items, it)
		}
	}

	var distributeJuryQueue int
	_ = h.db.QueryRow("SELECT COALESCE(distribute_jury_queue, 0) FROM contests WHERE id = ?", contestID).Scan(&distributeJuryQueue)

	if distributeJuryQueue == 1 {
		h.balanceArticles(contestID, items)
		jsonResponse(w, http.StatusOK, map[string]any{
			"message": "Queues redistributed equally among jury members",
			"moved":   len(items),
		})
	} else {
		_, _ = h.db.Exec("UPDATE articles SET assigned_to_id = NULL WHERE contest_id = ?", contestID)
		jsonResponse(w, http.StatusOK, map[string]any{
			"message": "Queues shared successfully across all juries",
			"moved":   len(items),
		})
	}
}

func (h *Handler) GetStandings(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var contestID int64
	var isUmbrella int
	err := h.db.QueryRow("SELECT id, COALESCE(is_umbrella, 0) FROM contests WHERE code = ?", code).Scan(&contestID, &isUmbrella)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}

	wikiFilter := strings.TrimSpace(r.URL.Query().Get("wiki"))

	query := `
		SELECT u.wiki_username,
		       COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
		       COALESCE(SUM(CASE WHEN a.status = 'accepted' THEN a.word_count ELSE 0 END), 0) as total_words,
		       COALESCE(SUM(CASE WHEN a.status = 'accepted' THEN a.byte_count ELSE 0 END), 0) as total_bytes,
		       COUNT(a.id) as submitted_count,
		       COALESCE(GROUP_CONCAT(DISTINCT c.wiki_dbname), '') as wikis_contributed
		FROM articles a
		JOIN contests c ON a.contest_id = c.id
		JOIN users u ON a.submitter_id = u.id
		WHERE (c.id = ? OR c.parent_contest_id = ?)
	`
	args := []any{contestID, contestID}
	if wikiFilter != "" {
		query += " AND c.wiki_dbname = ?"
		args = append(args, wikiFilter)
	}
	query += `
		GROUP BY u.id
		ORDER BY accepted_count DESC, total_words DESC
	`
	rows, err := h.db.Query(query, args...)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to calculate standings")
		return
	}
	defer rows.Close()

	var standings []models.StandingEntry
	rank := 1
	for rows.Next() {
		var s models.StandingEntry
		var wikisStr string
		s.Rank = rank
		err := rows.Scan(&s.Username, &s.AcceptedCount, &s.TotalWords, &s.TotalBytes, &s.SubmittedCount, &wikisStr)
		if err != nil {
			continue
		}
		if wikisStr != "" {
			s.WikisContributed = strings.Split(wikisStr, ",")
		}
		standings = append(standings, s)
		rank++
	}

	if standings == nil {
		standings = []models.StandingEntry{}
	}
	jsonResponse(w, http.StatusOK, standings)
}

// -------------------------------------------------------------
// User Profiles (Global & Contest-Based)
// -------------------------------------------------------------

func (h *Handler) GetUserGlobalProfile(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")

	var userID int64
	var role string
	var dbUsername string
	err := h.db.QueryRow(`
		SELECT id, wiki_username, role 
		FROM users 
		WHERE wiki_username = ? COLLATE NOCASE
	`, username).Scan(&userID, &dbUsername, &role)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "User not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query user")
		return
	}

	// 1. Participated Contests & Articles
	partQuery := `
		SELECT c.code, c.name, c.start_date, c.end_date, c.wiki_url, c.wiki_dbname,
		       a.id, a.title, a.status, COALESCE(a.validation_error, ''), a.word_count, a.byte_count,
		       COALESCE(a.wiki_creator, ''), a.wiki_creation_date, a.submitted_at
		FROM articles a
		JOIN contests c ON a.contest_id = c.id
		WHERE a.submitter_id = ?
		ORDER BY c.start_date DESC, a.submitted_at DESC
	`
	rows, err := h.db.Query(partQuery, userID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query user participations")
		return
	}
	defer rows.Close()

	contestMap := make(map[string]*models.GlobalProfileParticipatedContest)
	var contestOrder []string

	for rows.Next() {
		var code, name, wikiURL, wikiDbName string
		var startDate, endDate *time.Time
		var art models.GlobalProfileContestArticle
		if err := rows.Scan(
			&code, &name, &startDate, &endDate, &wikiURL, &wikiDbName,
			&art.ID, &art.Title, &art.Status, &art.ValidationError,
			&art.WordCount, &art.ByteCount, &art.WikiCreator,
			&art.WikiCreationDate, &art.SubmittedAt,
		); err != nil {
			continue
		}

		if _, exists := contestMap[code]; !exists {
			contestMap[code] = &models.GlobalProfileParticipatedContest{
				Code:       code,
				Name:       name,
				StartDate:  startDate,
				EndDate:    endDate,
				WikiURL:    wikiURL,
				WikiDbName: wikiDbName,
				Articles:   []models.GlobalProfileContestArticle{},
			}
			contestOrder = append(contestOrder, code)
		}
		contestMap[code].Articles = append(contestMap[code].Articles, art)
	}

	participated := make([]models.GlobalProfileParticipatedContest, 0, len(contestOrder))
	for _, code := range contestOrder {
		participated = append(participated, *contestMap[code])
	}

	// 2. Judged Contests & Reviews
	judgedQuery := `
		SELECT c.id, c.code, c.name, c.start_date, c.end_date, c.wiki_url,
		       CASE 
		         WHEN c.created_by_id = ? THEN 'owner'
		         ELSE 'jury'
		       END as role_in_contest
		FROM contests c
		WHERE c.created_by_id = ?
		   OR c.id IN (SELECT contest_id FROM contest_juries WHERE user_id = ?)
		   OR c.id IN (SELECT a.contest_id FROM articles a JOIN reviews r ON a.id = r.article_id WHERE r.reviewer_id = ?)
		ORDER BY c.start_date DESC
	`
	jRows, err := h.db.Query(judgedQuery, userID, userID, userID, userID)
	if err != nil {
		log.Printf("[GetUserGlobalProfile] judged query error: %v", err)
		jsonError(w, http.StatusInternalServerError, "Failed to query judged contests")
		return
	}
	defer jRows.Close()

	judged := make([]models.GlobalProfileJudgedContest, 0)
	for jRows.Next() {
		var cID int64
		var entry models.GlobalProfileJudgedContest
		if err := jRows.Scan(&cID, &entry.Code, &entry.Name, &entry.StartDate, &entry.EndDate, &entry.WikiURL, &entry.RoleInContest); err != nil {
			continue
		}

		// Fetch reviews given by this user in this contest
		rRows, err := h.db.Query(`
			SELECT a.title, COALESCE(su.wiki_username, ''), r.status, COALESCE(r.comment, ''), r.timestamp
			FROM reviews r
			JOIN articles a ON r.article_id = a.id
			LEFT JOIN users su ON a.submitter_id = su.id
			WHERE a.contest_id = ? AND r.reviewer_id = ?
			ORDER BY r.timestamp DESC
		`, cID, userID)
		if err == nil {
			stats := map[string]int{"total": 0, "accepted": 0, "rejected": 0, "skipped": 0}
			reviews := make([]models.GlobalProfileReview, 0)
			for rRows.Next() {
				var rev models.GlobalProfileReview
				if err := rRows.Scan(&rev.ArticleTitle, &rev.Submitter, &rev.Decision, &rev.Comment, &rev.ReviewedAt); err == nil {
					reviews = append(reviews, rev)
					stats["total"]++
					if _, ok := stats[rev.Decision]; ok {
						stats[rev.Decision]++
					}
				}
			}
			rRows.Close()
			entry.Reviews = reviews
			entry.Stats = stats
		} else {
			entry.Reviews = []models.GlobalProfileReview{}
			entry.Stats = map[string]int{"total": 0, "accepted": 0, "rejected": 0, "skipped": 0}
		}

		judged = append(judged, entry)
	}

	profile := models.GlobalUserProfile{
		Username:             dbUsername,
		Role:                 role,
		ParticipatedContests: participated,
		JudgedContests:       judged,
	}

	jsonResponse(w, http.StatusOK, profile)
}

func (h *Handler) GetContestUserProfile(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	username := chi.URLParam(r, "username")

	var contestID int64
	var contestName, wikiURL string
	err := h.db.QueryRow(`
		SELECT id, name, wiki_url 
		FROM contests 
		WHERE code = ?
	`, code).Scan(&contestID, &contestName, &wikiURL)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query contest")
		return
	}

	var userID int64
	var role string
	var dbUsername string
	err = h.db.QueryRow(`
		SELECT id, wiki_username, role 
		FROM users 
		WHERE wiki_username = ? COLLATE NOCASE
	`, username).Scan(&userID, &dbUsername, &role)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "User not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query user")
		return
	}

	// 1. Fetch user submissions in this contest
	subQuery := `
		SELECT a.id, a.title, a.status, COALESCE(a.validation_error, ''), 
		       a.word_count, a.byte_count, a.submitted_at
		FROM articles a
		WHERE a.contest_id = ? AND a.submitter_id = ?
		ORDER BY a.submitted_at DESC
	`
	rows, err := h.db.Query(subQuery, contestID, userID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query submissions")
		return
	}
	defer rows.Close()

	submissions := make([]models.ContestUserSubmission, 0)
	for rows.Next() {
		var sub models.ContestUserSubmission
		if err := rows.Scan(
			&sub.ID, &sub.Title, &sub.Status, &sub.ValidationError,
			&sub.WordCount, &sub.ByteCount, &sub.SubmittedAt,
		); err != nil {
			continue
		}

		// Query reviews for this submission
		rRows, err := h.db.Query(`
			SELECT COALESCE(ju.wiki_username, 'Jury'), r.status, COALESCE(r.comment, ''), r.timestamp
			FROM reviews r
			LEFT JOIN users ju ON r.reviewer_id = ju.id
			WHERE r.article_id = ?
			ORDER BY r.timestamp DESC
		`, sub.ID)
		sub.Reviews = make([]models.ContestUserSubmissionReview, 0)
		if err == nil {
			for rRows.Next() {
				var rev models.ContestUserSubmissionReview
				if err := rRows.Scan(&rev.Jury, &rev.Decision, &rev.Comment, &rev.ReviewedAt); err == nil {
					sub.Reviews = append(sub.Reviews, rev)
				}
			}
			rRows.Close()
		}

		submissions = append(submissions, sub)
	}

	// 2. Fetch reviews conducted by this user in this contest
	revQuery := `
		SELECT a.title, COALESCE(su.wiki_username, ''), r.status, COALESCE(r.comment, ''), r.timestamp
		FROM reviews r
		JOIN articles a ON r.article_id = a.id
		LEFT JOIN users su ON a.submitter_id = su.id
		WHERE a.contest_id = ? AND r.reviewer_id = ?
		ORDER BY r.timestamp DESC
	`
	revRows, err := h.db.Query(revQuery, contestID, userID)
	reviews := make([]models.GlobalProfileReview, 0)
	if err == nil {
		for revRows.Next() {
			var rev models.GlobalProfileReview
			if err := revRows.Scan(&rev.ArticleTitle, &rev.Submitter, &rev.Decision, &rev.Comment, &rev.ReviewedAt); err == nil {
				reviews = append(reviews, rev)
			}
		}
		revRows.Close()
	}

	// 3. Calculate standing for this user in this contest
	var standing *models.StandingEntry
	standingsQuery := `
		SELECT u.wiki_username,
		       COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
		       COALESCE(SUM(CASE WHEN a.status = 'accepted' THEN a.word_count ELSE 0 END), 0) as total_words,
		       COALESCE(SUM(CASE WHEN a.status = 'accepted' THEN a.byte_count ELSE 0 END), 0) as total_bytes,
		       COUNT(a.id) as submitted_count
		FROM articles a
		JOIN users u ON a.submitter_id = u.id
		WHERE a.contest_id = ?
		GROUP BY u.id
		ORDER BY accepted_count DESC, total_words DESC
	`
	stRows, err := h.db.Query(standingsQuery, contestID)
	if err == nil {
		rank := 1
		for stRows.Next() {
			var s models.StandingEntry
			s.Rank = rank
			if err := stRows.Scan(&s.Username, &s.AcceptedCount, &s.TotalWords, &s.TotalBytes, &s.SubmittedCount); err == nil {
				if strings.EqualFold(s.Username, dbUsername) {
					standing = &s
					break
				}
			}
			rank++
		}
		stRows.Close()
	}

	profile := models.ContestUserProfile{
		Username:    dbUsername,
		Role:        role,
		ContestCode: code,
		ContestName: contestName,
		WikiURL:     wikiURL,
		Standing:    standing,
		Submissions: submissions,
		Reviews:     reviews,
	}

	jsonResponse(w, http.StatusOK, profile)
}

// SuggestUsers returns Wikimedia username suggestions for autocomplete.
func (h *Handler) SuggestUsers(w http.ResponseWriter, r *http.Request) {
	prefix := strings.TrimSpace(r.URL.Query().Get("q"))
	if prefix == "" {
		jsonResponse(w, http.StatusOK, []string{})
		return
	}

	wikiURL := strings.TrimSpace(r.URL.Query().Get("wiki"))
	if wikiURL == "" {
		wikiURL = "https://meta.wikimedia.org"
	}

	seen := make(map[string]bool)
	var result []string

	// 1. Local users from database
	rows, err := h.db.Query("SELECT wiki_username FROM users WHERE wiki_username LIKE ? LIMIT 8", prefix+"%")
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var u string
			if err := rows.Scan(&u); err == nil && !seen[u] {
				seen[u] = true
				result = append(result, u)
			}
		}
	}

	// 2. Remote users from MediaWiki Action API
	remote, err := mwclient.FetchUserSuggestions(wikiURL, prefix)
	if err == nil {
		for _, u := range remote {
			if !seen[u] {
				seen[u] = true
				result = append(result, u)
			}
		}
	}

	if result == nil {
		result = []string{}
	}
	jsonResponse(w, http.StatusOK, result)
}

// -------------------------------------------------------------
// Admin & Platform Management Endpoints
// -------------------------------------------------------------

func (h *Handler) GetAdminOverview(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if !h.isPlatformOwner(currentUser) {
		jsonError(w, http.StatusForbidden, "Access denied: Owner privileges required")
		return
	}

	var overview models.AdminOverview
	_ = h.db.QueryRow("SELECT COUNT(*) FROM contests WHERE parent_contest_id IS NULL AND is_draft = 0").Scan(&overview.TotalContests)
	_ = h.db.QueryRow("SELECT COUNT(*) FROM contests WHERE parent_contest_id IS NULL AND is_draft = 0 AND status = 'pending_approval'").Scan(&overview.PendingContests)
	_ = h.db.QueryRow("SELECT COUNT(*) FROM contests WHERE parent_contest_id IS NULL AND is_draft = 0 AND status = 'active'").Scan(&overview.ActiveContests)
	_ = h.db.QueryRow("SELECT COUNT(*) FROM contests WHERE parent_contest_id IS NULL AND is_draft = 0 AND status = 'ended'").Scan(&overview.EndedContests)
	_ = h.db.QueryRow("SELECT COUNT(*) FROM articles").Scan(&overview.TotalArticles)
	_ = h.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&overview.TotalUsers)

	jsonResponse(w, http.StatusOK, overview)
}

func (h *Handler) GetAdminContests(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if !h.isPlatformOwner(currentUser) {
		jsonError(w, http.StatusForbidden, "Access denied: Owner privileges required")
		return
	}

	statusFilter := r.URL.Query().Get("status")

	query := `
		SELECT c.id, c.code, c.name, c.description, c.wiki_dbname, c.wiki_url, c.wiki_lang, 
		       c.start_date, c.end_date, c.status, c.is_draft,
		       COALESCE(c.is_umbrella, 0) as is_umbrella,
		       c.parent_contest_id,
		       (SELECT COUNT(*) FROM contests sub WHERE sub.parent_contest_id = c.id) as sub_contest_count,
		       COUNT(DISTINCT a.id) as total_articles,
		       COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as accepted_articles,
		       COUNT(DISTINCT cj.user_id) as total_juries,
		       COALESCE(u.wiki_username, '') as created_by_username,
		       c.created_at
		FROM contests c
		LEFT JOIN articles a ON (c.id = a.contest_id OR (c.is_umbrella = 1 AND a.contest_id IN (SELECT id FROM contests WHERE parent_contest_id = c.id)))
		LEFT JOIN contest_juries cj ON c.id = cj.contest_id
		LEFT JOIN users u ON c.created_by_id = u.id
		WHERE c.parent_contest_id IS NULL AND c.is_draft = 0
	`
	var args []any
	if statusFilter != "" && statusFilter != "all" {
		query += " AND c.status = ?"
		args = append(args, statusFilter)
	}
	query += `
		GROUP BY c.id
		ORDER BY CASE WHEN c.status = 'pending_approval' THEN 0 ELSE 1 END, c.created_at DESC
	`

	rows, err := h.db.Query(query, args...)
	if err != nil {
		log.Printf("[GetAdminContests] Query error: %v", err)
		jsonError(w, http.StatusInternalServerError, "Failed to fetch admin contests")
		return
	}
	defer rows.Close()

	var contests []models.Contest
	for rows.Next() {
		var c models.Contest
		var isUmbrellaInt int
		err := rows.Scan(
			&c.ID, &c.Code, &c.Name, &c.Description, &c.WikiDbName, &c.WikiURL, &c.WikiLang,
			&c.StartDate, &c.EndDate, &c.Status, &c.IsDraft,
			&isUmbrellaInt, &c.ParentContestID, &c.SubContestCount,
			&c.TotalArticles, &c.AcceptedArticles, &c.TotalJuries,
			&c.CreatedByUsername, &c.CreatedAt,
		)
		if err != nil {
			log.Printf("[GetAdminContests] Scan error: %v", err)
			continue
		}
		c.IsUmbrella = isUmbrellaInt == 1
		contests = append(contests, c)
	}
	if contests == nil {
		contests = []models.Contest{}
	}
	jsonResponse(w, http.StatusOK, contests)
}

func (h *Handler) ApproveContest(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if !h.isPlatformOwner(currentUser) {
		jsonError(w, http.StatusForbidden, "Access denied: Owner privileges required")
		return
	}

	code := chi.URLParam(r, "code")
	if code == "" {
		jsonError(w, http.StatusBadRequest, "Contest code required")
		return
	}

	var contestID int64
	err := h.db.QueryRow("SELECT id FROM contests WHERE code = ?", code).Scan(&contestID)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Transaction error")
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE contests SET status = 'active' WHERE id = ?", contestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to approve contest")
		return
	}
	_, _ = tx.Exec("UPDATE contests SET status = 'active' WHERE parent_contest_id = ?", contestID)

	if err := tx.Commit(); err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to commit approval")
		return
	}

	log.Printf("[ApproveContest] Contest %s (ID: %d) approved by %s", code, contestID, currentUser.WikiUsername)
	jsonResponse(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"message": "Contest approved successfully",
	})
}

func (h *Handler) RejectContest(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if !h.isPlatformOwner(currentUser) {
		jsonError(w, http.StatusForbidden, "Access denied: Owner privileges required")
		return
	}

	code := chi.URLParam(r, "code")
	if code == "" {
		jsonError(w, http.StatusBadRequest, "Contest code required")
		return
	}

	var contestID int64
	err := h.db.QueryRow("SELECT id FROM contests WHERE code = ?", code).Scan(&contestID)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Transaction error")
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE contests SET status = 'rejected' WHERE id = ?", contestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to reject contest")
		return
	}
	_, _ = tx.Exec("UPDATE contests SET status = 'rejected' WHERE parent_contest_id = ?", contestID)

	if err := tx.Commit(); err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to commit rejection")
		return
	}

	log.Printf("[RejectContest] Contest %s (ID: %d) rejected by %s", code, contestID, currentUser.WikiUsername)
	jsonResponse(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"message": "Contest rejected",
	})
}

func (h *Handler) DeleteContest(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil || currentUser.UserID <= 0 {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	code := chi.URLParam(r, "code")
	if code == "" {
		jsonError(w, http.StatusBadRequest, "Contest code required")
		return
	}

	var contestID int64
	var createdByID *int64
	var contestName string
	err := h.db.QueryRow("SELECT id, created_by_id, name FROM contests WHERE code = ?", code).Scan(&contestID, &createdByID, &contestName)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	isOwner := h.isPlatformOwner(currentUser)
	isCreator := createdByID != nil && *createdByID == currentUser.UserID

	if !isOwner && !isCreator {
		jsonError(w, http.StatusForbidden, "You do not have permission to delete this contest")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Transaction error")
		return
	}
	defer tx.Rollback()

	// Collect all contest IDs (main contest + sub-contests)
	contestIDs := []int64{contestID}
	subRows, err := tx.Query("SELECT id FROM contests WHERE parent_contest_id = ?", contestID)
	if err == nil {
		for subRows.Next() {
			var subID int64
			if err := subRows.Scan(&subID); err == nil {
				contestIDs = append(contestIDs, subID)
			}
		}
		subRows.Close()
	}

	for _, cid := range contestIDs {
		// 1. Delete talk_page_jobs
		_, _ = tx.Exec("DELETE FROM talk_page_jobs WHERE contest_id = ?", cid)
		// 2. Delete reviews associated with articles of this contest
		_, _ = tx.Exec("DELETE FROM reviews WHERE article_id IN (SELECT id FROM articles WHERE contest_id = ?)", cid)
		// 3. Delete articles
		_, _ = tx.Exec("DELETE FROM articles WHERE contest_id = ?", cid)
		// 4. Delete jury restrictions
		_, _ = tx.Exec("DELETE FROM contest_jury_restrictions WHERE contest_id = ?", cid)
		// 5. Delete jury associations
		_, _ = tx.Exec("DELETE FROM contest_juries WHERE contest_id = ?", cid)
		// 6. Delete sub-contest record if not main
		if cid != contestID {
			_, _ = tx.Exec("DELETE FROM contests WHERE id = ?", cid)
		}
	}

	// 7. Delete main contest
	_, err = tx.Exec("DELETE FROM contests WHERE id = ?", contestID)
	if err != nil {
		log.Printf("[DeleteContest] Error deleting contest %s (%d): %v", code, contestID, err)
		jsonError(w, http.StatusInternalServerError, "Failed to delete contest")
		return
	}

	if err := tx.Commit(); err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to commit deletion")
		return
	}

	log.Printf("[DeleteContest] Contest %s ('%s', ID: %d) permanently deleted by %s", code, contestName, contestID, currentUser.WikiUsername)
	jsonResponse(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"message": fmt.Sprintf("Contest '%s' deleted successfully", contestName),
	})
}

// GetTalkQueue returns the status counts and recent jobs of the talk page queue for a contest.
func (h *Handler) GetTalkQueue(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var contestID int64
	var addTalkTemplate int
	var talkTemplateName string
	err := h.db.QueryRow(`
		SELECT id, add_talk_template, COALESCE(talk_template_name, '')
		FROM contests WHERE code = ?
	`, code).Scan(&contestID, &addTalkTemplate, &talkTemplateName)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}

	// 1. Get status counts
	rows, err := h.db.Query(`
		SELECT status, COUNT(*)
		FROM talk_page_jobs
		WHERE contest_id = ?
		GROUP BY status
	`, contestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query queue counts")
		return
	}
	defer rows.Close()

	counts := map[string]int{
		"queued":     0,
		"processing": 0,
		"done":       0,
		"failed":     0,
		"total":      0,
	}

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err == nil {
			counts[status] = count
			counts["total"] += count
		}
	}

	// 2. Get recent jobs (up to 30)
	jobRows, err := h.db.Query(`
		SELECT id, article_id, title, status, attempts, COALESCE(error, ''), created_at, processed_at
		FROM talk_page_jobs
		WHERE contest_id = ?
		ORDER BY id DESC
		LIMIT 30
	`, contestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query queue jobs")
		return
	}
	defer jobRows.Close()

	var jobs []models.TalkPageJob
	for jobRows.Next() {
		var j models.TalkPageJob
		j.ContestID = contestID
		if err := jobRows.Scan(&j.ID, &j.ArticleID, &j.Title, &j.Status, &j.Attempts, &j.Error, &j.CreatedAt, &j.ProcessedAt); err == nil {
			jobs = append(jobs, j)
		}
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"enabled":            addTalkTemplate == 1,
		"talk_template_name": talkTemplateName,
		"counts":             counts,
		"jobs":               jobs,
	})
}

// RetryTalkQueue resets failed talk page jobs to 'queued' so the background worker picks them up again.
func (h *Handler) RetryTalkQueue(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var contestID int64
	err := h.db.QueryRow("SELECT id FROM contests WHERE code = ?", code).Scan(&contestID)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}

	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	if !h.isUserOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "Only organizers or juries can retry queue jobs")
		return
	}

	// Reset failed or stuck jobs back to 'queued' with attempts reset to 0 and retry_after cleared
	res, err := h.db.Exec(`
		UPDATE talk_page_jobs
		SET status = 'queued', attempts = 0, error = '', retry_after = NULL
		WHERE contest_id = ? AND (status = 'failed' OR status = 'processing')
	`, contestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to retry jobs")
		return
	}

	affected, _ := res.RowsAffected()
	if h.talkQueue != nil {
		h.talkQueue.Notify()
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"message": fmt.Sprintf("Retried %d talk page job(s)", affected),
		"retried": affected,
	})
}

// EnqueueMissingTalkJobs enqueues all pending/accepted articles for this contest that do not already have a talk page job.
func (h *Handler) EnqueueMissingTalkJobs(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var contestID int64
	var addTalkTemplate int
	var talkTemplateName string
	err := h.db.QueryRow(`
		SELECT id, add_talk_template, COALESCE(talk_template_name, '')
		FROM contests WHERE code = ?
	`, code).Scan(&contestID, &addTalkTemplate, &talkTemplateName)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}

	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	if !h.isUserOrganizer(contestID, currentUser.UserID, currentUser.Role) {
		jsonError(w, http.StatusForbidden, "Only organizers can enqueue talk page jobs")
		return
	}

	if addTalkTemplate == 0 || strings.TrimSpace(talkTemplateName) == "" {
		jsonError(w, http.StatusBadRequest, "Talk template is not enabled for this contest")
		return
	}

	// Insert all pending/accepted articles that are not yet in talk_page_jobs
	res, err := h.db.Exec(`
		INSERT INTO talk_page_jobs (contest_id, article_id, title, status, attempts, error)
		SELECT a.contest_id, a.id, a.title, 'queued', 0, ''
		FROM articles a
		WHERE a.contest_id = ? 
		  AND a.status IN ('pending', 'accepted')
		  AND NOT EXISTS (
		      SELECT 1 FROM talk_page_jobs j
		      WHERE j.contest_id = a.contest_id AND j.article_id = a.id
		  )
	`, contestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to enqueue missing articles")
		return
	}

	enqueued, _ := res.RowsAffected()
	if h.talkQueue != nil && enqueued > 0 {
		h.talkQueue.Notify()
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"message":  fmt.Sprintf("Enqueued %d missing article(s) to talk page queue", enqueued),
		"enqueued": enqueued,
	})
}

func jsonResponse(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]string{"error": message})
}
