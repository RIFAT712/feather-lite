package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
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
		})
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"is_authenticated": true,
		"user_id":          user.UserID,
		"wiki_username":    user.WikiUsername,
		"role":             user.Role,
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
		wikiDbName = "bnwiktionary"
	}
	wikiURL := strings.TrimSpace(req.WikiURL)
	if wikiURL == "" {
		wikiURL = "https://bn.wiktionary.org"
	}
	wikiLang := strings.TrimSpace(req.WikiLang)
	if wikiLang == "" {
		wikiLang = "bn"
	}
	wikiTZ := strings.TrimSpace(req.WikiTZ)
	if wikiTZ == "" {
		wikiTZ = "Asia/Dhaka"
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

	insertContestQuery := `
		INSERT INTO contests (
			code, name, description, wiki_dbname, wiki_url, wiki_lang, wiki_tz,
			start_date, end_date, status, is_draft,
			rule_must_be_creator, rule_no_redirect, rule_no_disambig, rule_mainspace_only, rule_created_in_window,
			min_bytes, min_words, min_refs, max_submissions_per_user, rank_by_words,
			add_talk_template, talk_template_name, created_by_id
		) VALUES (
			?, ?, ?, ?, ?, ?, ?,
			?, ?, ?, ?,
			?, ?, ?, ?, ?,
			?, ?, ?, ?, ?,
			?, ?, ?
		)
	`
	status := "active"
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
		req.MinBytes, req.MinWords, req.MinRefs, req.MaxSubmissionsPerUser, rankByWords,
		addTalkTemplate, req.TalkTemplateName, createdByID,
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

	if err := tx.Commit(); err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to commit contest transaction")
		return
	}

	jsonResponse(w, http.StatusCreated, map[string]any{
		"message": "Contest created successfully",
		"code":    code,
		"contest": map[string]any{
			"id":         contestID,
			"code":       code,
			"name":       req.Name,
			"wiki_url":   wikiURL,
			"wiki_tz":    wikiTZ,
			"start_date": startDate,
			"end_date":   endDate,
		},
	})
}

func (h *Handler) ListContests(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT c.id, c.code, c.name, c.description, c.wiki_dbname, c.wiki_url, c.wiki_lang, 
		       c.start_date, c.end_date, c.status, c.is_draft,
		       COUNT(DISTINCT a.id) as total_articles,
		       COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as accepted_articles,
		       COUNT(DISTINCT cj.user_id) as total_juries
		FROM contests c
		LEFT JOIN articles a ON c.id = a.contest_id
		LEFT JOIN contest_juries cj ON c.id = cj.contest_id
		WHERE c.is_draft = 0
		GROUP BY c.id
		ORDER BY c.start_date DESC
	`
	rows, err := h.db.Query(query)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to fetch contests")
		return
	}
	defer rows.Close()

	var contests []models.Contest
	for rows.Next() {
		var c models.Contest
		err := rows.Scan(
			&c.ID, &c.Code, &c.Name, &c.Description, &c.WikiDbName, &c.WikiURL, &c.WikiLang,
			&c.StartDate, &c.EndDate, &c.Status, &c.IsDraft,
			&c.TotalArticles, &c.AcceptedArticles, &c.TotalJuries,
		)
		if err != nil {
			jsonError(w, http.StatusInternalServerError, "Failed to parse contest row")
			return
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
		SELECT id, code, name, description, wiki_dbname, wiki_url, wiki_lang, wiki_tz,
		       start_date, end_date, status, is_draft, rule_must_be_creator, rule_no_redirect,
		       rule_no_disambig, rule_mainspace_only, rule_created_in_window, min_bytes,
		       min_words, min_refs, max_submissions_per_user, rank_by_words, add_talk_template,
		       talk_template_name, created_at
		FROM contests
		WHERE code = ?
	`
	var c models.Contest
	err := h.db.QueryRow(query, code).Scan(
		&c.ID, &c.Code, &c.Name, &c.Description, &c.WikiDbName, &c.WikiURL, &c.WikiLang, &c.WikiTZ,
		&c.StartDate, &c.EndDate, &c.Status, &c.IsDraft, &c.RuleMustBeCreator, &c.RuleNoRedirect,
		&c.RuleNoDisambig, &c.RuleMainspaceOnly, &c.RuleCreatedInWindow, &c.MinBytes,
		&c.MinWords, &c.MinRefs, &c.MaxSubmissionsPerUser, &c.RankByWords, &c.AddTalkTemplate,
		&c.TalkTemplateName, &c.CreatedAt,
	)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database query error")
		return
	}

	_ = h.db.QueryRow(`
		SELECT COUNT(*), 
		       COUNT(CASE WHEN status = 'accepted' THEN 1 END),
		       COUNT(CASE WHEN status = 'pending' THEN 1 END)
		FROM articles WHERE contest_id = ?
	`, c.ID).Scan(&c.TotalArticles, &c.AcceptedArticles, &c.PendingArticles)

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

	res, err := h.db.GetArticlesKeyset(contestID, beforeID, status, assignedToID, limit)
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
	err := h.db.QueryRow(`
		SELECT id, name, status, wiki_url, min_bytes, min_words, rule_must_be_creator, rule_no_redirect
		FROM contests WHERE code = ?
	`, code).Scan(
		&contest.ID, &contest.Name, &contest.Status, &contest.WikiURL, &contest.MinBytes,
		&contest.MinWords, &contest.RuleMustBeCreator, &contest.RuleNoRedirect,
	)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
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
		} else if pageInfo.WordCount < contest.MinWords {
			status = "validation_failed"
			validationErr = fmt.Sprintf("Word count too low: %d words (min: %d)", pageInfo.WordCount, contest.MinWords)
		} else if pageInfo.ByteSize < contest.MinBytes {
			status = "validation_failed"
			validationErr = fmt.Sprintf("Byte size too low: %d bytes (min: %d)", pageInfo.ByteSize, contest.MinBytes)
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
			if status == "pending" {
				articleID, _ := res.LastInsertId()
				newPendingArticles = append(newPendingArticles, balancer.ArticleItem{
					ArticleID:   articleID,
					SubmitterID: submitterID,
				})
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

	// 3. Scarcity-First Water-Filling Queue Balancing on newly pending articles
	if len(newPendingArticles) > 0 {
		h.balanceArticles(contest.ID, newPendingArticles)
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"submitted": submittedCount,
		"results":   results,
		"message":   fmt.Sprintf("Processed %d articles (%d accepted to queue)", len(results), submittedCount),
	})
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
		WHERE c.code = ? AND a.id = ?
	`, code, articleID).Scan(&wikiURL, &title, &wordCount, &byteCount)

	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Article not found")
		return
	}

	// Fetch real rendered HTML from MediaWiki action=parse
	htmlContent, err := mwclient.FetchRenderedHTML(wikiURL, title)
	if err != nil {
		htmlContent = fmt.Sprintf("<div class='p-4 text-destructive'>Failed to load preview from %s: %v</div>", wikiURL, err)
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"id":         articleID,
		"title":      title,
		"word_count": wordCount,
		"byte_count": byteCount,
		"html":       htmlContent,
		"wiki_url":   fmt.Sprintf("%s/wiki/%s", wikiURL, title),
	})
}

// -------------------------------------------------------------
// Review Actions
// -------------------------------------------------------------

type ReviewDecisionRequest struct {
	Status  string `json:"status"` // "accepted", "rejected", "skipped"
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
	if req.Status != "accepted" && req.Status != "rejected" && req.Status != "skipped" {
		jsonError(w, http.StatusBadRequest, "Status must be 'accepted', 'rejected', or 'skipped'")
		return
	}

	// Read authenticated reviewer from session
	reviewer := "JuryMember"
	if currentUser := auth.GetUser(r.Context()); currentUser != nil {
		reviewer = currentUser.WikiUsername
	}

	var reviewerID int64
	_ = h.db.QueryRow("SELECT id FROM users WHERE wiki_username = ?", reviewer).Scan(&reviewerID)
	if reviewerID == 0 {
		res, _ := h.db.Exec("INSERT INTO users(wiki_username, role) VALUES(?, 'jury')", reviewer)
		reviewerID, _ = res.LastInsertId()
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

	jsonResponse(w, http.StatusOK, map[string]string{
		"message":  "Review recorded successfully",
		"status":   req.Status,
		"reviewer": reviewer,
	})
}

func (h *Handler) GetStandings(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	var contestID int64
	err := h.db.QueryRow("SELECT id FROM contests WHERE code = ?", code).Scan(&contestID)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	query := `
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
	rows, err := h.db.Query(query, contestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to calculate standings")
		return
	}
	defer rows.Close()

	var standings []models.StandingEntry
	rank := 1
	for rows.Next() {
		var s models.StandingEntry
		s.Rank = rank
		err := rows.Scan(&s.Username, &s.AcceptedCount, &s.TotalWords, &s.TotalBytes, &s.SubmittedCount)
		if err != nil {
			continue
		}
		standings = append(standings, s)
		rank++
	}

	if standings == nil {
		standings = []models.StandingEntry{}
	}
	jsonResponse(w, http.StatusOK, standings)
}

func jsonResponse(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, status int, message string) {
	jsonResponse(w, status, map[string]string{"error": message})
}
