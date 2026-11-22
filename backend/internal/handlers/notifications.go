package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"feather-backend/internal/auth"
	"feather-backend/internal/database"
	"feather-backend/internal/models"
)

// createNotification inserts an in-tool notification for a user
func (h *Handler) createNotification(userID int64, contestID int64, articleID *int64, notifType, title, message, linkURL string) {
	if userID <= 0 {
		return
	}
	_, _ = h.db.Exec(`
		INSERT INTO notifications (user_id, contest_id, article_id, type, title, message, link_url, is_read, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
	`, userID, contestID, articleID, notifType, title, message, linkURL)
}

// GetNotifications returns keyset-paginated notifications for the authenticated user
func (h *Handler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	limit := 20
	if lStr := r.URL.Query().Get("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	beforeID := int64(0)
	if bStr := r.URL.Query().Get("before_id"); bStr != "" {
		if b, err := strconv.ParseInt(bStr, 10, 64); err == nil && b > 0 {
			beforeID = b
		}
	}

	unreadOnly := r.URL.Query().Get("unread_only") == "true" || r.URL.Query().Get("unread_only") == "1"

	var unreadCount int
	_ = h.db.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", currentUser.UserID).Scan(&unreadCount)

	query := "SELECT id, user_id, contest_id, article_id, type, title, message, link_url, is_read, created_at FROM notifications WHERE user_id = ?"
	args := []any{currentUser.UserID}

	if unreadOnly {
		query += " AND is_read = 0"
	}
	if beforeID > 0 {
		query += " AND id < ?"
		args = append(args, beforeID)
	}

	query += " ORDER BY id DESC LIMIT ?"
	args = append(args, limit+1)

	rows, err := h.db.Query(query, args...)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to query notifications")
		return
	}
	defer rows.Close()

	var items []models.Notification
	for rows.Next() {
		var n models.Notification
		var artID sql.NullInt64
		var isReadInt int
		var createdAtStr sql.NullString
		if err := rows.Scan(&n.ID, &n.UserID, &n.ContestID, &artID, &n.Type, &n.Title, &n.Message, &n.LinkURL, &isReadInt, &createdAtStr); err == nil {
			if artID.Valid {
				n.ArticleID = &artID.Int64
			}
			n.IsRead = isReadInt == 1
			if createdAtStr.Valid {
				if t := database.ParseFlexTime(createdAtStr.String); t != nil {
					n.CreatedAt = *t
				}
			}
			items = append(items, n)
		}
	}

	hasMore := false
	var nextCursor int64
	if len(items) > limit {
		hasMore = true
		items = items[:limit]
		nextCursor = items[len(items)-1].ID
	}

	jsonResponse(w, http.StatusOK, models.NotificationKeysetResult{
		Items:       items,
		UnreadCount: unreadCount,
		NextCursor:  nextCursor,
		HasMore:     hasMore,
	})
}

// GetUnreadNotificationCount returns just the count of unread notifications for navbar badge
func (h *Handler) GetUnreadNotificationCount(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonResponse(w, http.StatusOK, map[string]int{"unread_count": 0})
		return
	}

	var count int
	_ = h.db.QueryRow("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0", currentUser.UserID).Scan(&count)
	jsonResponse(w, http.StatusOK, map[string]int{"unread_count": count})
}

// MarkNotificationRead marks a single notification as read
func (h *Handler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	notifID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid notification ID")
		return
	}

	_, _ = h.db.Exec("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", notifID, currentUser.UserID)
	jsonResponse(w, http.StatusOK, map[string]any{"success": true})
}

// MarkAllNotificationsRead marks all notifications as read for current user
func (h *Handler) MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	_, _ = h.db.Exec("UPDATE notifications SET is_read = 1 WHERE user_id = ?", currentUser.UserID)
	jsonResponse(w, http.StatusOK, map[string]any{"success": true})
}
