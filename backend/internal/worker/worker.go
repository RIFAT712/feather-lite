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

	"feather-backend/internal/models"
	"feather-backend/internal/mwclient"
)

type TalkQueueWorker struct {
	db       *sql.DB
	notifyCh chan struct{}
	mu       sync.Mutex
	running  bool
}

func NewTalkQueueWorker(db *sql.DB) *TalkQueueWorker {
	return &TalkQueueWorker{
		db:       db,
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
		       c.wiki_url, c.wiki_lang, c.add_talk_template, c.talk_template_name,
		       COALESCE(u.oauth_access_token, '')
		FROM talk_page_jobs q
		JOIN contests c ON q.contest_id = c.id
		LEFT JOIN users u ON c.created_by_id = u.id
		WHERE q.status = 'queued' 
		  AND (q.retry_after IS NULL OR q.retry_after <= CURRENT_TIMESTAMP)
		ORDER BY q.attempts ASC, q.id ASC
		LIMIT 1
	`)

	var (
		jobID            int64
		contestID        int64
		articleID        int64
		title            string
		attempts         int
		wikiURL          string
		wikiLang         string
		addTalkTemplate  int
		talkTemplateName string
		oauthToken       string
	)

	err := row.Scan(
		&jobID, &contestID, &articleID, &title, &attempts,
		&wikiURL, &wikiLang, &addTalkTemplate, &talkTemplateName,
		&oauthToken,
	)
	if err == sql.ErrNoRows {
		// Queue is empty, nothing to do
		return
	}
	if err != nil {
		log.Printf("[TalkQueueWorker] Error querying queue: %v", err)
		return
	}

	// Fallback to any active owner/organizer token in DB if contest creator token is empty
	if oauthToken == "" {
		_ = w.db.QueryRow(`
			SELECT oauth_access_token FROM users
			WHERE oauth_access_token IS NOT NULL AND oauth_access_token != ''
			ORDER BY CASE WHEN role = 'owner' THEN 0 ELSE 1 END, id DESC
			LIMIT 1
		`).Scan(&oauthToken)
	}

	// 2. Mark job as processing
	_, _ = w.db.Exec("UPDATE talk_page_jobs SET status = 'processing' WHERE id = ?", jobID)

	// If talk template is disabled or template name is empty, mark done
	if addTalkTemplate == 0 || strings.TrimSpace(talkTemplateName) == "" {
		_, _ = w.db.Exec("UPDATE talk_page_jobs SET status = 'done', processed_at = CURRENT_TIMESTAMP WHERE id = ?", jobID)
		return
	}

	// 3. Format templates (support multiple templates newline-separated or JSON array)
	templates := FormatTemplates(talkTemplateName)
	if len(templates) == 0 {
		_, _ = w.db.Exec("UPDATE talk_page_jobs SET status = 'done', processed_at = CURRENT_TIMESTAMP WHERE id = ?", jobID)
		return
	}
	templatesBlock := strings.Join(templates, "\n")

	// 4. Determine Talk Page Title (MediaWiki canonical namespace Talk: resolves across all languages)
	talkTitle := title
	if !strings.HasPrefix(strings.ToLower(talkTitle), "talk:") && !strings.Contains(talkTitle, ":") {
		talkTitle = "Talk:" + talkTitle
	}

	// 5. Prepend templates to talk page via MediaWiki API
	summary := fmt.Sprintf("Adding contest templates via Feather [[:m:Feather|Feather 2.0]]: %s", strings.Join(templates, " "))
	editErr := mwclient.PrependTemplatesToTalkPage(wikiURL, talkTitle, templatesBlock, summary, oauthToken)

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
