package worker

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"feather-backend/internal/config"
	"feather-backend/internal/models"
	"feather-backend/internal/mwclient"
)

type TalkQueueWorker struct {
	db       *sql.DB
	cfg      *config.Config
	notifyCh chan struct{}
	mu       sync.Mutex
	running  bool
}

func NewTalkQueueWorker(db *sql.DB, cfg *config.Config) *TalkQueueWorker {
	return &TalkQueueWorker{
		db:       db,
		cfg:      cfg,
		notifyCh: make(chan struct{}, 100),
	}
}

// Notify pings the background worker that new jobs are ready in the database.
func (w *TalkQueueWorker) Notify() {
	select {
	case w.notifyCh <- struct{}{}:
	default:
	}
}

// Enqueue persists a job to the database queue and notifies the worker.
func (w *TalkQueueWorker) Enqueue(job models.TalkPageJob) bool {
	if w.db == nil {
		return false
	}

	// Avoid duplicate active jobs for the same article in this contest
	var exists int
	_ = w.db.QueryRow(`
		SELECT 1 FROM talk_page_jobs
		WHERE contest_id = ? AND article_id = ? AND status IN ('queued', 'processing', 'done')
		LIMIT 1
	`, job.ContestID, job.ArticleID).Scan(&exists)
	if exists == 1 {
		return true // already queued, processing, or done
	}

	_, err := w.db.Exec(`
		INSERT INTO talk_page_jobs (contest_id, article_id, title, status, attempts, error)
		VALUES (?, ?, ?, 'queued', 0, '')
	`, job.ContestID, job.ArticleID, job.Title)
	if err != nil {
		log.Printf("[TalkQueueWorker] Failed to enqueue job: %v", err)
		return false
	}
	w.Notify()
	return true
}

// Start spawns the rate-limited background worker (1 edit per 3 seconds max, Wikimedia rate limit).
func (w *TalkQueueWorker) Start(ctx context.Context) {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		return
	}
	w.running = true
	w.mu.Unlock()

	go func() {
		log.Println("[TalkQueueWorker] Throttled worker started (1 edit per 3.0s max, persistent queue).")
		ticker := time.NewTicker(3 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				log.Println("[TalkQueueWorker] Stopping background worker...")
				return
			case <-ticker.C:
				w.processNextJob()
			case <-w.notifyCh:
				// Notification received, will be processed on ticker tick
			}
		}
	}()
}

// getBackoffSeconds calculates exponential/stepped retry delay
func getBackoffSeconds(attempts int) int {
	switch {
	case attempts <= 1:
		return 15 // 15 seconds
	case attempts == 2:
		return 45 // 45 seconds
	case attempts == 3:
		return 120 // 2 minutes
	case attempts == 4:
		return 300 // 5 minutes
	case attempts == 5:
		return 600 // 10 minutes
	default:
		return 900 // 15 minutes max
	}
}

func (w *TalkQueueWorker) processNextJob() {
	if w.db == nil {
		return
	}

	// 1. Fetch the oldest queued job that is eligible for retry (retry_after is past or null)
	// Order by attempts ASC first so failed jobs do not starve fresh jobs, then id ASC
	row := w.db.QueryRow(`
		SELECT q.id, q.contest_id, q.article_id, q.title, q.attempts,
		       c.name, c.wiki_url, c.wiki_lang, c.add_talk_template, c.talk_template_name,
		       COALESCE(u.id, 0),
		       COALESCE(u.oauth_access_token, ''),
		       COALESCE(u.oauth_refresh_token, ''),
		       COALESCE(sub.wiki_username, '')
		FROM talk_page_jobs q
		JOIN contests c ON q.contest_id = c.id
		LEFT JOIN users u ON c.created_by_id = u.id
		LEFT JOIN articles a ON q.article_id = a.id
		LEFT JOIN users sub ON a.submitter_id = sub.id
		WHERE q.status = 'queued' 
		  AND (q.retry_after IS NULL OR q.retry_after <= CURRENT_TIMESTAMP)
		ORDER BY q.attempts ASC, q.id ASC
		LIMIT 1
	`)

	var (
		jobID             int64
		contestID         int64
		articleID         int64
		title             string
		attempts          int
		contestName       string
		wikiURL           string
		wikiLang          string
		addTalkTemplate   int
		talkTemplateName  string
		tokenUserID       int64
		oauthToken        string
		refreshToken      string
		submitterUsername string
	)

	err := row.Scan(
		&jobID, &contestID, &articleID, &title, &attempts,
		&contestName, &wikiURL, &wikiLang, &addTalkTemplate, &talkTemplateName,
		&tokenUserID,
		&oauthToken,
		&refreshToken,
		&submitterUsername,
	)
	if err == sql.ErrNoRows {
		// Queue is empty, nothing to do
		return
	}
	if err != nil {
		log.Printf("[TalkQueueWorker] Error querying queue: %v", err)
		return
	}

	// Fallback to any active owner/organizer token in DB if contest creator token is empty or expired without refresh
	if oauthToken == "" || (mwclient.IsTokenExpired(oauthToken) && refreshToken == "") {
		var fbUserID int64
		var fbToken, fbRefresh string
		fbErr := w.db.QueryRow(`
			SELECT id, oauth_access_token, COALESCE(oauth_refresh_token, '')
			FROM users
			WHERE oauth_access_token IS NOT NULL AND oauth_access_token != ''
			ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, id DESC
			LIMIT 1
		`).Scan(&fbUserID, &fbToken, &fbRefresh)
		if fbErr == nil && fbToken != "" {
			tokenUserID = fbUserID
			oauthToken = fbToken
			refreshToken = fbRefresh
		}
	}

	// 2. Refresh OAuth access token if expired and refresh token is available
	if mwclient.IsTokenExpired(oauthToken) && refreshToken != "" && w.cfg != nil {
		log.Printf("[TalkQueueWorker] OAuth token expired for user ID %d, refreshing via refresh_token...", tokenUserID)
		newAccess, newRefresh, refErr := mwclient.RefreshAccessToken(w.cfg, refreshToken)
		if refErr == nil {
			oauthToken = newAccess
			refreshToken = newRefresh
			_, _ = w.db.Exec("UPDATE users SET oauth_access_token = ?, oauth_refresh_token = ? WHERE id = ?", newAccess, newRefresh, tokenUserID)
			log.Printf("[TalkQueueWorker] Successfully refreshed OAuth token for user ID %d", tokenUserID)
		} else {
			log.Printf("[TalkQueueWorker] Token refresh failed for user ID %d: %v", tokenUserID, refErr)
		}
	}

	// If talk template is disabled or template name is empty, mark done immediately
	if addTalkTemplate == 0 || strings.TrimSpace(talkTemplateName) == "" {
		_, _ = w.db.Exec("UPDATE talk_page_jobs SET status = 'done', processed_at = CURRENT_TIMESTAMP WHERE id = ?", jobID)
		return
	}

	// If token is missing or still expired (no valid refresh token), back off to avoid spamming 401s
	if oauthToken == "" || mwclient.IsTokenExpired(oauthToken) {
		authErr := "Wikimedia OAuth session expired. Organizer re-login required to authorize talk page edits."
		nextAttempt := attempts + 1
		log.Printf("[TalkQueueWorker] [Attempt %d Held] %s: %s (backing off 300s)", nextAttempt, title, authErr)
		_, _ = w.db.Exec(`
			UPDATE talk_page_jobs
			SET status = 'queued', attempts = ?, error = ?, retry_after = datetime(CURRENT_TIMESTAMP, '+300 seconds')
			WHERE id = ?
		`, nextAttempt, authErr, jobID)
		return
	}

	// 3. Mark job as processing
	_, _ = w.db.Exec("UPDATE talk_page_jobs SET status = 'processing' WHERE id = ?", jobID)

	// 4. Format templates (support multiple templates newline-separated or JSON array) and substitute dynamic parameters
	templates := FormatTemplates(talkTemplateName)
	if len(templates) == 0 {
		_, _ = w.db.Exec("UPDATE talk_page_jobs SET status = 'done', processed_at = CURRENT_TIMESTAMP WHERE id = ?", jobID)
		return
	}

	currentYear := fmt.Sprintf("%d", time.Now().Year())
	templates = SubstitutePlaceholders(templates, submitterUsername, title, contestName, currentYear)
	templatesBlock := strings.Join(templates, "\n")

	// 5. Determine Talk Page Title (MediaWiki canonical namespace Talk: resolves across all languages)
	talkTitle := title
	if !strings.HasPrefix(strings.ToLower(talkTitle), "talk:") && !strings.Contains(talkTitle, ":") {
		talkTitle = "Talk:" + talkTitle
	}

	// 6. Prepend templates to talk page via MediaWiki API
	summary := GetTalkEditSummary(wikiLang, wikiURL, templates)
	editErr := mwclient.PrependTemplatesToTalkPage(wikiURL, talkTitle, templatesBlock, summary, oauthToken)

	// If edit returned 401/expired, try a refresh on the fly once
	if editErr != nil && refreshToken != "" && w.cfg != nil &&
		(strings.Contains(editErr.Error(), "401") || strings.Contains(strings.ToLower(editErr.Error()), "expired")) {
		log.Printf("[TalkQueueWorker] Edit 401 unauthorized, attempting token refresh for user ID %d...", tokenUserID)
		newAccess, newRefresh, refErr := mwclient.RefreshAccessToken(w.cfg, refreshToken)
		if refErr == nil {
			oauthToken = newAccess
			refreshToken = newRefresh
			_, _ = w.db.Exec("UPDATE users SET oauth_access_token = ?, oauth_refresh_token = ? WHERE id = ?", newAccess, newRefresh, tokenUserID)
			// Retry edit with refreshed token
			editErr = mwclient.PrependTemplatesToTalkPage(wikiURL, talkTitle, templatesBlock, summary, oauthToken)
		}
	}

	if editErr == nil {
		// Success!
		log.Printf("[TalkQueueWorker] [Success] Added templates to %s on %s", talkTitle, wikiURL)
		_, _ = w.db.Exec(`
			UPDATE talk_page_jobs
			SET status = 'done', processed_at = CURRENT_TIMESTAMP, error = '', retry_after = NULL
			WHERE id = ?
		`, jobID)
	} else {
		// Failure: increment attempt and keep in queue for retry
		nextAttempt := attempts + 1
		backoffSec := getBackoffSeconds(nextAttempt)
		errStr := editErr.Error()
		log.Printf("[TalkQueueWorker] [Attempt %d Failed] %s on %s: %s (retrying in %ds)", nextAttempt, talkTitle, wikiURL, errStr, backoffSec)

		if nextAttempt >= 8 {
			// After 8 attempts, mark as failed so organizers see it highlighted with error in UI
			_, _ = w.db.Exec(`
				UPDATE talk_page_jobs
				SET status = 'failed', attempts = ?, error = ?, processed_at = CURRENT_TIMESTAMP
				WHERE id = ?
			`, nextAttempt, errStr, jobID)
		} else {
			// Keep in queue and schedule retry with exponential backoff
			_, _ = w.db.Exec(`
				UPDATE talk_page_jobs
				SET status = 'queued', attempts = ?, error = ?, retry_after = datetime(CURRENT_TIMESTAMP, '+' || ? || ' seconds')
				WHERE id = ?
			`, nextAttempt, errStr, backoffSec, jobID)
		}
	}
}

// FormatTemplates parses raw template configuration (newline-delimited or JSON array) and wraps in {{...}}
func FormatTemplates(raw string) []string {
	var templates []string

	trimmed := strings.TrimSpace(raw)
	if strings.HasPrefix(trimmed, "[") {
		_ = json.Unmarshal([]byte(trimmed), &templates)
	}

	if len(templates) == 0 {
		for _, line := range strings.Split(raw, "\n") {
			l := strings.TrimSpace(line)
			if l != "" {
				templates = append(templates, l)
			}
		}
	}

	var cleaned []string
	for _, t := range templates {
		t = strings.TrimSpace(t)
		if t == "" {
			continue
		}
		if !strings.HasPrefix(t, "{{") {
			t = "{{" + t
		}
		if !strings.HasSuffix(t, "}}") {
			t = t + "}}"
		}
		cleaned = append(cleaned, t)
	}
	return cleaned
}

// SubstitutePlaceholders replaces $USER, $SUBMITTER, $TITLE, $ARTICLE, $CONTEST, $YEAR in templates
func SubstitutePlaceholders(templates []string, submitter, title, contest, year string) []string {
	res := make([]string, len(templates))
	for i, t := range templates {
		t = strings.ReplaceAll(t, "$USER", submitter)
		t = strings.ReplaceAll(t, "$SUBMITTER", submitter)
		t = strings.ReplaceAll(t, "$TITLE", title)
		t = strings.ReplaceAll(t, "$ARTICLE", title)
		t = strings.ReplaceAll(t, "$CONTEST", contest)
		t = strings.ReplaceAll(t, "$YEAR", year)
		res[i] = t
	}
	return res
}

// GetTalkEditSummary returns the localized edit summary according to the contest wiki language.
// Default is English; supports Bengali (bn). Tool name is kept as Feather linked to [[:m:Feather|Feather]].
func GetTalkEditSummary(wikiLang, wikiURL string, templates []string) string {
	templateList := strings.Join(templates, " ")
	lang := strings.ToLower(strings.TrimSpace(wikiLang))
	if lang == "" && strings.Contains(strings.ToLower(wikiURL), "bn.") {
		lang = "bn"
	}

	switch lang {
	case "bn":
		return fmt.Sprintf("[[:m:Feather|Feather]]-এর মাধ্যমে প্রতিযোগিতার টেমপ্লেট যুক্ত করা হচ্ছে: %s", templateList)
	default:
		return fmt.Sprintf("Adding contest templates via [[:m:Feather|Feather]]: %s", templateList)
	}
}
