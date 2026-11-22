package database

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "modernc.org/sqlite"

	"feather-backend/internal/config"
	"feather-backend/internal/models"
)

//go:embed schema.sql
var schemaSQL string

type DB struct {
	*sql.DB
	DBType string
}

func Connect(cfg *config.Config) (*DB, error) {
	var db *sql.DB
	var err error

	if cfg.DBType == "mysql" {
		db, err = sql.Open("mysql", cfg.DatabaseURL)
		if err != nil {
			return nil, fmt.Errorf("failed to open mysql: %w", err)
		}
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(10)
		db.SetConnMaxLifetime(5 * time.Minute)
	} else {
		// SQLite with modernc.org/sqlite (pure Go, zero CGO)
		dbPath := cfg.DatabaseURL
		if dbPath != ":memory:" && !strings.HasPrefix(dbPath, "file:") && !filepath.IsAbs(dbPath) {
			if _, err := os.Stat(dbPath); os.IsNotExist(err) {
				backendPath := filepath.Join("backend", dbPath)
				if _, err2 := os.Stat(backendPath); err2 == nil {
					dbPath = backendPath
				}
			}
			if abs, err := filepath.Abs(dbPath); err == nil {
				dbPath = abs
			}
		}
		if dbPath != ":memory:" && !strings.HasPrefix(dbPath, "file:") {
			dbPath = filepath.ToSlash(dbPath)
		}
		log.Printf("[DB] Connecting to sqlite dbPath: %q", dbPath)
		db, err = sql.Open("sqlite", dbPath)
		if err != nil {
			return nil, fmt.Errorf("failed to open sqlite: %w", err)
		}
		db.SetMaxOpenConns(10)
		db.SetMaxIdleConns(5)
		db.SetConnMaxLifetime(1 * time.Hour)

		_, _ = db.Exec("PRAGMA journal_mode(WAL);")
		_, _ = db.Exec("PRAGMA busy_timeout(10000);")
		_, _ = db.Exec("PRAGMA synchronous(NORMAL);")
		_, _ = db.Exec("PRAGMA wal_autocheckpoint(500);")
		_, _ = db.Exec("PRAGMA wal_checkpoint(TRUNCATE);")
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	// Auto-run schema migrations on startup
	if _, err := db.Exec(schemaSQL); err != nil {
		log.Printf("[DB] Warning during schema initialization: %v", err)
	} else {
		log.Println("[DB] Schema initialized successfully with 50k keyset indexes.")
	}

	// Graceful column additions for custom creation window and multi-community campaigns
	_, _ = db.Exec("ALTER TABLE users ADD COLUMN oauth_refresh_token TEXT;")
	_, _ = db.Exec("ALTER TABLE contests ADD COLUMN custom_creation_start_date DATETIME;")
	_, _ = db.Exec("ALTER TABLE contests ADD COLUMN custom_creation_end_date DATETIME;")
	_, _ = db.Exec("ALTER TABLE contests ADD COLUMN is_umbrella INTEGER NOT NULL DEFAULT 0;")
	_, _ = db.Exec("ALTER TABLE contests ADD COLUMN parent_contest_id INTEGER REFERENCES contests(id) ON DELETE SET NULL;")
	_, _ = db.Exec("ALTER TABLE contests ADD COLUMN distribute_jury_queue INTEGER NOT NULL DEFAULT 0;")
	_, _ = db.Exec("ALTER TABLE contests ADD COLUMN onwiki_page_url TEXT;")
	_, _ = db.Exec("ALTER TABLE talk_page_jobs ADD COLUMN retry_after DATETIME;")
	_, _ = db.Exec("ALTER TABLE articles ADD COLUMN re_review_requested INTEGER NOT NULL DEFAULT 0;")
	_, _ = db.Exec("ALTER TABLE articles ADD COLUMN re_review_note TEXT DEFAULT '';")
	_, _ = db.Exec("ALTER TABLE articles ADD COLUMN re_reviewed_at DATETIME;")
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS notifications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
			article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
			type TEXT NOT NULL,
			title TEXT NOT NULL,
			message TEXT NOT NULL,
			link_url TEXT NOT NULL,
			is_read INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS article_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			message TEXT NOT NULL,
			is_system INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS community_chat_messages (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
			is_campaign_chat INTEGER NOT NULL DEFAULT 0,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			username TEXT NOT NULL,
			user_role TEXT NOT NULL DEFAULT 'participant',
			message TEXT NOT NULL,
			is_deleted INTEGER NOT NULL DEFAULT 0,
			deleted_by TEXT,
			deleted_reason TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	_, _ = db.Exec(`
		CREATE TABLE IF NOT EXISTS user_chat_moderation (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			username TEXT NOT NULL,
			contest_id INTEGER REFERENCES contests(id) ON DELETE CASCADE,
			action TEXT NOT NULL,
			timeout_until DATETIME,
			reason TEXT NOT NULL,
			moderated_by TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
	`)
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_articles_rereview ON articles(contest_id, re_review_requested, id DESC);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, id DESC);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_notifications_user_all ON notifications(user_id, id DESC);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_article_messages_article ON article_messages(article_id, id ASC);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_article_messages_user ON article_messages(user_id);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_chat_contest_keyset ON community_chat_messages(contest_id, is_campaign_chat, id DESC);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_chat_user ON community_chat_messages(user_id);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_chat_mod_user_contest ON user_chat_moderation(user_id, contest_id, id DESC);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_chat_mod_username ON user_chat_moderation(username, contest_id);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_contests_parent ON contests(parent_contest_id);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_contests_is_umbrella ON contests(is_umbrella);")
	_, _ = db.Exec("CREATE INDEX IF NOT EXISTS idx_talk_jobs_queue ON talk_page_jobs(status, attempts, id);")

	// Recover any orphaned jobs stuck in 'processing' state back to 'queued' on startup
	_, _ = db.Exec("UPDATE talk_page_jobs SET status = 'queued' WHERE status = 'processing';")
	// Reset any queued jobs that were placed into backoff due to OAuth token verification check
	_, _ = db.Exec("UPDATE talk_page_jobs SET retry_after = NULL, attempts = 0, error = '' WHERE status = 'queued' AND error LIKE '%Wikimedia OAuth session expired%';")
	// Clear any malformed lock records with monotonic clock artifacts
	_, _ = db.Exec("UPDATE articles SET locked_until = NULL, locked_by_id = NULL WHERE locked_until LIKE '%m=+%';")

	// One-time migration: Clean up legacy default-added platform owner from contest_juries and unassign articles
	_, _ = db.Exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);")
	var migApplied int
	_ = db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE id = 'cleanup_legacy_owner_juries_v3'").Scan(&migApplied)
	if migApplied == 0 {
		if cfg.OwnerUsername != "" {
			_, _ = db.Exec(`
				DELETE FROM contest_juries 
				WHERE user_id IN (SELECT id FROM users WHERE LOWER(wiki_username) = LOWER(?));
			`, cfg.OwnerUsername)
			_, _ = db.Exec(`
				UPDATE articles 
				SET assigned_to_id = NULL 
				WHERE assigned_to_id IN (SELECT id FROM users WHERE LOWER(wiki_username) = LOWER(?));
			`, cfg.OwnerUsername)
		}
		_, _ = db.Exec("INSERT INTO schema_migrations (id) VALUES ('cleanup_legacy_owner_juries_v3');")
	}

	// Background periodic WAL checkpoint to keep NFS storage clean and prevent malformed disk image errors
	if cfg.DBType != "mysql" {
		go func() {
			ticker := time.NewTicker(2 * time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				_, _ = db.Exec("PRAGMA wal_checkpoint(PASSIVE);")
			}
		}()
	}

	return &DB{DB: db, DBType: cfg.DBType}, nil
}

func ParseFlexTime(s string) *time.Time {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	if idx := strings.Index(s, " m="); idx != -1 {
		s = s[:idx]
	}
	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.999999999 -0700 MST",
		"2006-01-02 15:04:05 -0700 MST",
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return &t
		}
	}
	return nil
}

func parseFlexTime(s string) *time.Time {
	return ParseFlexTime(s)
}

// Keyset Paginated Article Fetch - O(1) time on 50,000+ entries (supports standalone & umbrella campaigns)
func (d *DB) GetArticlesKeyset(contestID int64, beforeID int64, status string, assignedToID int64, limit int) (*models.KeysetPaginationResult, error) {
	return d.GetArticlesKeysetWithJudge(contestID, beforeID, status, assignedToID, "", limit)
}

func (d *DB) GetArticlesKeysetWithJudge(contestID int64, beforeID int64, status string, assignedToID int64, assignedToUsername string, limit int) (*models.KeysetPaginationResult, error) {
	if limit <= 0 || limit > 500 {
		limit = 50
	}

	baseQuery := `
		SELECT a.id, a.contest_id, c.code, c.wiki_dbname, c.wiki_url, c.wiki_lang, a.title, a.submitter_id, u.wiki_username, a.status, 
		       COALESCE(a.validation_error, ''), COALESCE(a.wiki_creator, ''), a.wiki_creation_date, a.byte_count, a.word_count, COALESCE(a.word_count_verified, 1),
		       a.assigned_to_id, COALESCE(ju.wiki_username, ''), a.submitted_at,
		       CASE WHEN a.locked_until IS NOT NULL AND a.locked_until > CURRENT_TIMESTAMP THEN a.locked_until ELSE NULL END,
		       CASE WHEN a.locked_until IS NOT NULL AND a.locked_until > CURRENT_TIMESTAMP THEN a.locked_by_id ELSE NULL END,
		       CASE WHEN a.locked_until IS NOT NULL AND a.locked_until > CURRENT_TIMESTAMP THEN COALESCE(lu.wiki_username, '') ELSE '' END,
		       COALESCE(a.re_review_requested, 0), COALESCE(a.re_review_note, ''), a.re_reviewed_at
		FROM articles a
		JOIN contests c ON a.contest_id = c.id
		JOIN users u ON a.submitter_id = u.id
		LEFT JOIN users ju ON a.assigned_to_id = ju.id
		LEFT JOIN users lu ON a.locked_by_id = lu.id
		WHERE (a.contest_id = ? OR c.parent_contest_id = ?)
	`
	args := []any{contestID, contestID}

	if beforeID > 0 {
		baseQuery += " AND a.id < ?"
		args = append(args, beforeID)
	}
	if status != "" {
		baseQuery += " AND a.status = ?"
		args = append(args, status)
	} else {
		baseQuery += " AND a.status != 'validation_failed'"
	}
	if assignedToID > 0 {
		baseQuery += " AND a.assigned_to_id = ?"
		args = append(args, assignedToID)
	} else if strings.TrimSpace(assignedToUsername) != "" {
		baseQuery += " AND ju.wiki_username = ?"
		args = append(args, strings.TrimSpace(assignedToUsername))
	}

	baseQuery += " ORDER BY a.id DESC LIMIT ?"
	args = append(args, limit+1)

	rows, err := d.Query(baseQuery, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var articles []models.Article
	for rows.Next() {
		var a models.Article
		var assignedUsername string
		var lockedUsername string
		var valErr, creator, creationDateStr, submittedAtStr, lockedUntilStr sql.NullString
		var wordCountVerifiedInt int64
		var reReviewReqInt int64
		var reReviewNoteStr, reReviewedAtStr sql.NullString
		err := rows.Scan(
			&a.ID, &a.ContestID, &a.ContestCode, &a.WikiDbName, &a.WikiURL, &a.WikiLang, &a.Title, &a.SubmitterID, &a.SubmitterUsername,
			&a.Status, &valErr, &creator, &creationDateStr, &a.ByteCount,
			&a.WordCount, &wordCountVerifiedInt, &a.AssignedToID, &assignedUsername, &submittedAtStr,
			&lockedUntilStr, &a.LockedByID, &lockedUsername,
			&reReviewReqInt, &reReviewNoteStr, &reReviewedAtStr,
		)
		if err != nil {
			return nil, err
		}
		a.ValidationError = valErr.String
		a.WikiCreator = creator.String
		a.WordCountVerified = wordCountVerifiedInt == 1
		a.ReReviewRequested = reReviewReqInt == 1
		a.ReReviewNote = reReviewNoteStr.String
		if reReviewedAtStr.Valid {
			a.ReReviewedAt = parseFlexTime(reReviewedAtStr.String)
		}
		if creationDateStr.Valid {
			a.WikiCreationDate = parseFlexTime(creationDateStr.String)
		}
		if submittedAtStr.Valid {
			if t := parseFlexTime(submittedAtStr.String); t != nil {
				a.SubmittedAt = *t
			}
		}
		if lockedUntilStr.Valid {
			a.LockedUntil = parseFlexTime(lockedUntilStr.String)
		}
		if assignedUsername != "" {
			a.AssignedToUsername = assignedUsername
		}
		if lockedUsername != "" {
			a.LockedByUsername = lockedUsername
		}
		articles = append(articles, a)
	}

	hasMore := false
	var nextCursor int64
	if len(articles) > limit {
		hasMore = true
		articles = articles[:limit]
		nextCursor = articles[len(articles)-1].ID
	}

	// Batch-fetch associated reviews for the returned page of articles
	if len(articles) > 0 {
		articleIDs := make([]any, len(articles))
		placeholders := make([]string, len(articles))
		articleMap := make(map[int64]*models.Article, len(articles))
		for i := range articles {
			articleIDs[i] = articles[i].ID
			placeholders[i] = "?"
			articleMap[articles[i].ID] = &articles[i]
		}
		reviewQuery := fmt.Sprintf(`
			SELECT r.id, r.article_id, r.reviewer_id, u.wiki_username, r.status, r.comment, r.timestamp
			FROM reviews r
			JOIN users u ON r.reviewer_id = u.id
			WHERE r.article_id IN (%s)
			ORDER BY r.timestamp ASC
		`, strings.Join(placeholders, ","))

		if rRows, err := d.Query(reviewQuery, articleIDs...); err == nil {
			defer rRows.Close()
			for rRows.Next() {
				var rev models.Review
				if err := rRows.Scan(&rev.ID, &rev.ArticleID, &rev.ReviewerID, &rev.ReviewerUsername, &rev.Status, &rev.Comment, &rev.Timestamp); err == nil {
					if art, ok := articleMap[rev.ArticleID]; ok {
						art.Reviews = append(art.Reviews, rev)
						art.ReviewCount++
					}
				}
			}
		}
	}

	return &models.KeysetPaginationResult{
		Items:      articles,
		Total:      len(articles),
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}
