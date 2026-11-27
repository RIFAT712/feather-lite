package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"feather-backend/internal/auth"
	"feather-backend/internal/database"
	"feather-backend/internal/models"
	"feather-backend/internal/mwclient"
)

type PostMessageRequest struct {
	Message string `json:"message"`
}

type ReReviewRequest struct {
	Note string `json:"note"`
}

// GetArticleMessages returns all discussion messages for an article
func (h *Handler) GetArticleMessages(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	rows, err := h.db.Query(`
		SELECT m.id, m.article_id, m.user_id, COALESCE(u.wiki_username, 'System'), COALESCE(u.role, 'participant'),
		       m.message, m.is_system, m.created_at
		FROM article_messages m
		LEFT JOIN users u ON m.user_id = u.id
		WHERE m.article_id = ?
		ORDER BY m.id ASC
	`, articleID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query article messages")
		return
	}
	defer rows.Close()

	items := make([]models.ArticleMessage, 0)
	for rows.Next() {
		var m models.ArticleMessage
		var isSystemInt int
		var createdAtStr sql.NullString
		if err := rows.Scan(&m.ID, &m.ArticleID, &m.UserID, &m.Username, &m.Role, &m.Message, &isSystemInt, &createdAtStr); err == nil {
			m.IsSystem = isSystemInt == 1
			if createdAtStr.Valid {
				if t := database.ParseFlexTime(createdAtStr.String); t != nil {
					m.CreatedAt = *t
				}
			}
			items = append(items, m)
		}
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"messages": items,
	})
}

// PostArticleMessage adds a discussion message to an article
func (h *Handler) PostArticleMessage(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	var req PostMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	msgText := strings.TrimSpace(req.Message)
	if msgText == "" {
		jsonError(w, http.StatusBadRequest, "Message cannot be empty")
		return
	}

	var contestID, submitterID int64
	var assignedToID sql.NullInt64
	var title, contestCode, contestName string
	err = h.db.QueryRow(`
		SELECT a.contest_id, a.submitter_id, a.assigned_to_id, a.title, c.code, c.name
		FROM articles a
		JOIN contests c ON a.contest_id = c.id
		WHERE a.id = ?
	`, articleID).Scan(&contestID, &submitterID, &assignedToID, &title, &contestCode, &contestName)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Article not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	// Must be submitter, jury, contest creator, or platform owner
	isSubmitter := currentUser.UserID == submitterID
	isJury := h.isUserJuryOrOrganizer(contestID, currentUser.UserID, currentUser.Role)
	if !isSubmitter && !isJury {
		jsonError(w, http.StatusForbidden, "You do not have permission to participate in this discussion")
		return
	}

	res, err := h.db.Exec(`
		INSERT INTO article_messages (article_id, user_id, message, is_system, created_at)
		VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)
	`, articleID, currentUser.UserID, msgText)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to save message")
		return
	}
	msgID, _ := res.LastInsertId()

	snippet := msgText
	if len(snippet) > 80 {
		snippet = snippet[:77] + "..."
	}

	// Route notification
	if isJury && !isSubmitter {
		// Notify submitter
		h.createNotification(
			submitterID,
			contestID,
			&articleID,
			"article_message",
			fmt.Sprintf("New comment on '%s'", title),
			fmt.Sprintf("%s commented: %q", currentUser.WikiUsername, snippet),
			fmt.Sprintf("/contests/%s?article=%d", contestCode, articleID),
		)
	} else if isSubmitter {
		// If jury is assigned, notify that jury
		if assignedToID.Valid && assignedToID.Int64 > 0 && assignedToID.Int64 != currentUser.UserID {
			h.createNotification(
				assignedToID.Int64,
				contestID,
				&articleID,
				"article_message",
				fmt.Sprintf("Comment from submitter on '%s'", title),
				fmt.Sprintf("%s commented: %q", currentUser.WikiUsername, snippet),
				fmt.Sprintf("/contests/%s/review", contestCode),
			)
		} else {
			// Notify contest juries
			juryRows, err := h.db.Query("SELECT user_id FROM contest_juries WHERE contest_id = ?", contestID)
			if err == nil {
				defer juryRows.Close()
				for juryRows.Next() {
					var jid int64
					if err := juryRows.Scan(&jid); err == nil && jid != currentUser.UserID {
						h.createNotification(
							jid,
							contestID,
							&articleID,
							"article_message",
							fmt.Sprintf("Comment on '%s'", title),
							fmt.Sprintf("%s commented: %q", currentUser.WikiUsername, snippet),
							fmt.Sprintf("/contests/%s/review", contestCode),
						)
					}
				}
			}
		}
	}

	jsonResponse(w, http.StatusCreated, map[string]any{
		"success":    true,
		"message_id": msgID,
	})
}

// RequestArticleReReview requests a re-evaluation of a rejected article with submitter notes
func (h *Handler) RequestArticleReReview(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	articleID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid article ID")
		return
	}

	var req ReReviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	note := strings.TrimSpace(req.Note)
	if note == "" {
		jsonError(w, http.StatusBadRequest, "Please provide an explanation of the revisions made")
		return
	}

	var contestID, submitterID int64
	var assignedToID sql.NullInt64
	var status, title, contestCode, contestName, contestWikiURL, submitterUsername string
	var reReviewRequested int
	var currentByteCount, currentWordCount int
	err = h.db.QueryRow(`
		SELECT a.contest_id, a.submitter_id, a.assigned_to_id, a.status, a.title, 
		       c.code, c.name, COALESCE(c.wiki_url, 'https://bn.wikipedia.org'),
		       u.wiki_username, COALESCE(a.re_review_requested, 0),
		       a.byte_count, a.word_count
		FROM articles a
		JOIN contests c ON a.contest_id = c.id
		JOIN users u ON a.submitter_id = u.id
		WHERE a.id = ?
	`, articleID).Scan(
		&contestID, &submitterID, &assignedToID, &status, &title,
		&contestCode, &contestName, &contestWikiURL,
		&submitterUsername, &reReviewRequested,
		&currentByteCount, &currentWordCount,
	)
	if err == sql.ErrNoRows {
		jsonError(w, http.StatusNotFound, "Article not found")
		return
	} else if err != nil {
		jsonError(w, http.StatusInternalServerError, "Database error")
		return
	}

	isAuthor := currentUser.UserID == submitterID || strings.EqualFold(currentUser.WikiUsername, submitterUsername)
	if !isAuthor && currentUser.Role != "owner" {
		jsonError(w, http.StatusForbidden, "Only the article submitter can request a re-review")
		return
	}

	if status != "rejected" {
		jsonError(w, http.StatusBadRequest, "Re-review can only be requested for rejected articles")
		return
	}

	if reReviewRequested == 1 {
		jsonError(w, http.StatusBadRequest, "A re-review request is already pending for this article")
		return
	}

	// Re-evaluate page metrics from Wikipedia (author likely updated or expanded the article)
	newByteCount := currentByteCount
	newWordCount := currentWordCount
	if pageInfo, fetchErr := mwclient.FetchLatestPageMetrics(contestWikiURL, title); fetchErr == nil && pageInfo != nil && pageInfo.Exists {
		if pageInfo.ByteSize > 0 {
			newByteCount = pageInfo.ByteSize
		}
		if pageInfo.WordCount > 0 {
			newWordCount = pageInfo.WordCount
		}
	}

	_, err = h.db.Exec(`
		UPDATE articles
		SET re_review_requested = 1, re_review_note = ?, re_reviewed_at = CURRENT_TIMESTAMP,
		    byte_count = ?, word_count = ?
		WHERE id = ?
	`, note, newByteCount, newWordCount, articleID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to update re-review request")
		return
	}

	// Add system audit message into article discussion thread
	metricsDiff := ""
	if newWordCount != currentWordCount || newByteCount != currentByteCount {
		metricsDiff = fmt.Sprintf(" (Refreshed metrics: %d words, %d bytes)", newWordCount, newByteCount)
	}
	sysMsg := fmt.Sprintf("%s requested a re-review: %q%s", currentUser.WikiUsername, note, metricsDiff)
	_, _ = h.db.Exec(`
		INSERT INTO article_messages (article_id, user_id, message, is_system, created_at)
		VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
	`, articleID, currentUser.UserID, sysMsg)

	// Notify assigned jury or all juries
	notifMsg := fmt.Sprintf("%s requested a re-review for '%s': %s", currentUser.WikiUsername, title, note)
	if assignedToID.Valid && assignedToID.Int64 > 0 {
		h.createNotification(
			assignedToID.Int64,
			contestID,
			&articleID,
			"re_review_requested",
			fmt.Sprintf("Re-review requested: %s", title),
			notifMsg,
			fmt.Sprintf("/contests/%s/review", contestCode),
		)
	} else {
		// Notify contest juries
		juryRows, err := h.db.Query("SELECT user_id FROM contest_juries WHERE contest_id = ?", contestID)
		if err == nil {
			defer juryRows.Close()
			for juryRows.Next() {
				var jid int64
				if err := juryRows.Scan(&jid); err == nil {
					h.createNotification(
						jid,
						contestID,
						&articleID,
						"re_review_requested",
						fmt.Sprintf("Re-review requested: %s", title),
						notifMsg,
						fmt.Sprintf("/contests/%s/review", contestCode),
					)
				}
			}
		}
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"success":    true,
		"message":    "Re-review requested successfully",
		"word_count": newWordCount,
		"byte_count": newByteCount,
	})
}
