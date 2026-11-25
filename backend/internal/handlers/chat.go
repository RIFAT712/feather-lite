package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"feather-backend/internal/auth"
	"feather-backend/internal/database"
	"feather-backend/internal/models"
	"feather-backend/internal/moderator"
	"github.com/go-chi/chi/v5"
)

// canModerateContest checks if the user is an owner, admin, creator, or jury for the contest.
func (h *Handler) canModerateContest(claims *auth.Claims, contestID int) bool {
	if claims == nil {
		return false
	}
	if h.isPlatformOwner(claims) || claims.Role == "admin" || claims.Role == "owner" {
		return true
	}
	return h.isUserJuryOrOrganizer(int64(contestID), claims.UserID, claims.Role)
}

// resolveContestAndCampaign resolves contest ID and whether campaign mode is selected.
func (h *Handler) resolveContestAndCampaign(code string, isCampaignRequested bool) (contestID int, targetContestID int, isCampaign bool, err error) {
	var parentID sql.NullInt64
	var isUmbrella int
	err = h.db.QueryRow("SELECT id, parent_contest_id, is_umbrella FROM contests WHERE code = ?", code).Scan(&contestID, &parentID, &isUmbrella)
	if err != nil {
		return 0, 0, false, err
	}

	if isCampaignRequested {
		if isUmbrella == 1 {
			return contestID, contestID, true, nil
		}
		if parentID.Valid {
			return contestID, int(parentID.Int64), true, nil
		}
	}

	return contestID, contestID, false, nil
}

// GetCampaignChatMessages retrieves keyset-paginated messages specifically for the multi-community campaign lounge.
func (h *Handler) GetCampaignChatMessages(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")

	_, targetContestID, _, err := h.resolveContestAndCampaign(code, true)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Campaign not found")
		return
	}

	h.getChatMessagesInternal(w, r, targetContestID, true)
}

// GetChatMessages retrieves keyset-paginated messages for a single contest's local chat room.
func (h *Handler) GetChatMessages(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	// Backwards compatibility fallback if query param is explicitly passed
	isCampaign := r.URL.Query().Get("is_campaign") == "true"

	_, targetContestID, isCamp, err := h.resolveContestAndCampaign(code, isCampaign)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	h.getChatMessagesInternal(w, r, targetContestID, isCamp)
}

func (h *Handler) getChatMessagesInternal(w http.ResponseWriter, r *http.Request, targetContestID int, isCamp bool) {
	limit := 40
	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 100 {
			limit = val
		}
	}

	var beforeID int
	if b := r.URL.Query().Get("before_id"); b != "" {
		beforeID, _ = strconv.Atoi(b)
	}

	var rows *sql.Rows
	var err error
	campVal := 0
	if isCamp {
		campVal = 1
	}

	if beforeID > 0 {
		query := `
			SELECT id, contest_id, is_campaign_chat, user_id, username, user_role, message, is_deleted, deleted_by, deleted_reason, created_at
			FROM community_chat_messages
			WHERE contest_id = ? AND is_campaign_chat = ? AND id < ?
			ORDER BY id DESC
			LIMIT ?
		`
		rows, err = h.db.Query(query, targetContestID, campVal, beforeID, limit+1)
	} else {
		query := `
			SELECT id, contest_id, is_campaign_chat, user_id, username, user_role, message, is_deleted, deleted_by, deleted_reason, created_at
			FROM community_chat_messages
			WHERE contest_id = ? AND is_campaign_chat = ?
			ORDER BY id DESC
			LIMIT ?
		`
		rows, err = h.db.Query(query, targetContestID, campVal, limit+1)
	}

	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to load chat messages")
		return
	}
	defer rows.Close()

	var descItems []models.CommunityChatMessage
	for rows.Next() {
		var m models.CommunityChatMessage
		var isCampInt, isDelInt int
		var delBy, delReason sql.NullString
		var createdAtStr string

		if err := rows.Scan(
			&m.ID, &m.ContestID, &isCampInt, &m.UserID, &m.Username, &m.UserRole,
			&m.Message, &isDelInt, &delBy, &delReason, &createdAtStr,
		); err != nil {
			continue
		}

		m.IsCampaignChat = isCampInt == 1
		m.IsDeleted = isDelInt == 1
		if delBy.Valid {
			m.DeletedBy = delBy.String
		}
		if delReason.Valid {
			m.DeletedReason = delReason.String
		}
		m.CreatedAt = createdAtStr

		// Redact deleted messages for non-admin viewers
		if m.IsDeleted {
			m.Message = ""
		}

		descItems = append(descItems, m)
	}

	hasMore := len(descItems) > limit
	var nextCursor *int
	if hasMore {
		c := descItems[limit-1].ID
		nextCursor = &c
		descItems = descItems[:limit]
	}

	// Reverse descItems to ASC so client receives chronological order
	items := make([]models.CommunityChatMessage, len(descItems))
	for i, item := range descItems {
		items[len(descItems)-1-i] = item
	}

	jsonResponse(w, http.StatusOK, models.ChatMessageKeysetResult{
		Items:      items,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	})
}

// PostCampaignChatMessage posts a message directly to the dedicated multi-community campaign lounge.
func (h *Handler) PostCampaignChatMessage(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required to chat")
		return
	}

	code := chi.URLParam(r, "code")
	var req models.PostChatMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	req.IsCampaignChat = true
	h.postChatMessageInternal(w, r, currentUser, code, req)
}

// PostChatMessage sends a chat message for a single contest's local chat room.
func (h *Handler) PostChatMessage(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required to chat")
		return
	}

	code := chi.URLParam(r, "code")
	var req models.PostChatMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	h.postChatMessageInternal(w, r, currentUser, code, req)
}

func (h *Handler) postChatMessageInternal(w http.ResponseWriter, r *http.Request, currentUser *auth.Claims, code string, req models.PostChatMessageRequest) {

	trimmedMessage := strings.TrimSpace(req.Message)
	if len(trimmedMessage) == 0 {
		jsonError(w, http.StatusBadRequest, "Message cannot be empty")
		return
	}
	if len(trimmedMessage) > 1000 {
		jsonError(w, http.StatusBadRequest, "Message exceeds 1000 character limit")
		return
	}

	contestID, targetContestID, isCamp, err := h.resolveContestAndCampaign(code, req.IsCampaignChat)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	// 1. Check if user is currently banned or timed out in this contest or globally
	var modAction string
	var timeoutUntilStr sql.NullString
	var modReason string
	checkQuery := `
		SELECT action, timeout_until, reason
		FROM user_chat_moderation
		WHERE user_id = ? AND (contest_id = ? OR contest_id IS NULL)
		ORDER BY id DESC
		LIMIT 1
	`
	err = h.db.QueryRow(checkQuery, currentUser.UserID, targetContestID).Scan(&modAction, &timeoutUntilStr, &modReason)
	if err == nil {
		if modAction == "ban" {
			jsonResponse(w, http.StatusForbidden, map[string]any{
				"error":     fmt.Sprintf("You have been banned from this chat: %s", modReason),
				"status":    "banned",
				"is_banned": true,
			})
			return
		}
		if modAction == "timeout" && timeoutUntilStr.Valid {
			tUntil := database.ParseFlexTime(timeoutUntilStr.String)
			if tUntil != nil && tUntil.After(time.Now()) {
				jsonResponse(w, http.StatusForbidden, map[string]any{
					"error":         fmt.Sprintf("You are currently timed out from chat until %s: %s", tUntil.Format("15:04 UTC"), modReason),
					"status":        "timed_out",
					"timeout_until": tUntil.Format(time.RFC3339),
				})
				return
			}
		}
	}

	// 2. Automated Content Moderation Check (go-away + localized slurs + regex doxxing)
	modResult := moderator.CheckText(trimmedMessage)
	if modResult.IsHarmful {
		// Count previous strikes
		var previousStrikes int
		_ = h.db.QueryRow(
			"SELECT COUNT(*) FROM user_chat_moderation WHERE user_id = ? AND (contest_id = ? OR contest_id IS NULL) AND action IN ('warn', 'timeout')",
			currentUser.UserID, targetContestID,
		).Scan(&previousStrikes)

		// Strike Escalation logic:
		// 1st offense (low severity) -> Warn
		// 2nd offense (or medium severity) -> 1h Timeout
		// 3rd+ offense (or high severity threat) -> 24h Timeout or Ban
		switch {
		case modResult.Severity >= moderator.SeverityHigh || previousStrikes >= 2:
			// High severity or 3rd strike -> 24-hour timeout / ban
			tUntil := time.Now().Add(24 * time.Hour)
			action := "timeout"
			if previousStrikes >= 3 {
				action = "ban"
			}
			_, _ = h.db.Exec(
				"INSERT INTO user_chat_moderation (user_id, username, contest_id, action, timeout_until, reason, moderated_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
				currentUser.UserID, currentUser.WikiUsername, targetContestID, action, tUntil.Format(time.RFC3339), modResult.Reason, "Auto-Mod",
			)
			h.createNotification(
				currentUser.UserID, int64(targetContestID), nil, "chat_timeout",
				"Chat Access Restricted by Auto-Mod",
				fmt.Sprintf("Your message violated community guidelines (%s). A 24-hour timeout has been applied.", modResult.Reason),
				fmt.Sprintf("/contests/%s", code),
			)
			jsonResponse(w, http.StatusForbidden, map[string]any{
				"error":         fmt.Sprintf("Message blocked by Auto-Mod: %s. You have received a timeout.", modResult.Reason),
				"action":        action,
				"timeout_until": tUntil.Format(time.RFC3339),
			})
			return

		case modResult.Severity == moderator.SeverityMedium || previousStrikes == 1:
			// Medium severity or 2nd strike -> 1-hour timeout
			tUntil := time.Now().Add(1 * time.Hour)
			_, _ = h.db.Exec(
				"INSERT INTO user_chat_moderation (user_id, username, contest_id, action, timeout_until, reason, moderated_by) VALUES (?, ?, ?, 'timeout', ?, ?, 'Auto-Mod')",
				currentUser.UserID, currentUser.WikiUsername, targetContestID, tUntil.Format(time.RFC3339), modResult.Reason,
			)
			h.createNotification(
				currentUser.UserID, int64(targetContestID), nil, "chat_timeout",
				"Chat Access Timed Out by Auto-Mod",
				fmt.Sprintf("Your message was blocked for inappropriate content (%s). You are timed out for 1 hour.", modResult.Reason),
				fmt.Sprintf("/contests/%s", code),
			)
			jsonResponse(w, http.StatusForbidden, map[string]any{
				"error":         fmt.Sprintf("Message blocked by Auto-Mod: %s. You have been timed out for 1 hour.", modResult.Reason),
				"action":        "timeout",
				"timeout_until": tUntil.Format(time.RFC3339),
			})
			return

		default:
			// Low severity / 1st strike -> Warning
			_, _ = h.db.Exec(
				"INSERT INTO user_chat_moderation (user_id, username, contest_id, action, reason, moderated_by) VALUES (?, ?, ?, 'warn', ?, 'Auto-Mod')",
				currentUser.UserID, currentUser.WikiUsername, targetContestID, modResult.Reason,
			)
			h.createNotification(
				currentUser.UserID, int64(targetContestID), nil, "chat_warning",
				"Chat Warning from Auto-Mod",
				fmt.Sprintf("Your message was blocked: %s. Please maintain civility and follow community guidelines.", modResult.Reason),
				fmt.Sprintf("/contests/%s", code),
			)
			jsonResponse(w, http.StatusBadRequest, map[string]any{
				"error":         fmt.Sprintf("Message blocked by Auto-Mod: %s", modResult.Reason),
				"action":        "warn",
				"warning_count": previousStrikes + 1,
			})
			return
		}
	}

	// 3. User Role in this contest
	userRole := currentUser.Role
	if h.canModerateContest(currentUser, contestID) {
		if h.isPlatformOwner(currentUser) {
			userRole = "owner"
		} else if currentUser.Role == "admin" {
			userRole = "admin"
		} else {
			userRole = "jury"
		}
	}

	// 4. Clean message: insert into community_chat_messages
	campVal := 0
	if isCamp {
		campVal = 1
	}

	res, err := h.db.Exec(
		"INSERT INTO community_chat_messages (contest_id, is_campaign_chat, user_id, username, user_role, message) VALUES (?, ?, ?, ?, ?, ?)",
		targetContestID, campVal, currentUser.UserID, currentUser.WikiUsername, userRole, trimmedMessage,
	)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to save chat message")
		return
	}

	msgID, _ := res.LastInsertId()
	createdMsg := models.CommunityChatMessage{
		ID:             int(msgID),
		ContestID:      targetContestID,
		IsCampaignChat: isCamp,
		UserID:         int(currentUser.UserID),
		Username:       currentUser.WikiUsername,
		UserRole:       userRole,
		Message:        trimmedMessage,
		IsDeleted:      false,
		CreatedAt:      time.Now().Format("2006-01-02 15:04:05"),
	}

	jsonResponse(w, http.StatusCreated, createdMsg)
}

// DeleteChatMessage allows judges/admins to delete/redact an abusive or inappropriate message.
func (h *Handler) DeleteChatMessage(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	code := chi.URLParam(r, "code")
	messageIDStr := chi.URLParam(r, "messageId")
	messageID, err := strconv.Atoi(messageIDStr)
	if err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid message ID")
		return
	}

	contestID, _, _, err := h.resolveContestAndCampaign(code, false)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	if !h.canModerateContest(currentUser, contestID) {
		jsonError(w, http.StatusForbidden, "Only juries and organizers can delete chat messages")
		return
	}

	var req models.DeleteChatMessageRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = "Removed by moderator"
	}

	_, err = h.db.Exec(
		"UPDATE community_chat_messages SET is_deleted = 1, deleted_by = ?, deleted_reason = ? WHERE id = ?",
		currentUser.WikiUsername, reason, messageID,
	)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to delete message")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"status":     "ok",
		"message_id": messageID,
		"deleted_by": currentUser.WikiUsername,
		"reason":     reason,
	})
}

// ModerateChatUser allows judges/organizers to manually warn, timeout, ban, or unban a user.
func (h *Handler) ModerateChatUser(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	code := chi.URLParam(r, "code")
	contestID, targetContestID, _, err := h.resolveContestAndCampaign(code, false)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	if !h.canModerateContest(currentUser, contestID) {
		jsonError(w, http.StatusForbidden, "Only juries and organizers can moderate users")
		return
	}

	var req models.ModerateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	targetUsername := strings.TrimSpace(req.Username)
	if targetUsername == "" {
		jsonError(w, http.StatusBadRequest, "Target username is required")
		return
	}

	var targetUserID int
	err = h.db.QueryRow("SELECT id FROM users WHERE wiki_username = ?", targetUsername).Scan(&targetUserID)
	if err != nil {
		jsonError(w, http.StatusNotFound, "User not found")
		return
	}

	// Prevent moderating platform owners or admins unless requester is owner
	var targetRole string
	_ = h.db.QueryRow("SELECT role FROM users WHERE id = ?", targetUserID).Scan(&targetRole)
	if (targetRole == "owner" || targetRole == "admin") && !h.isPlatformOwner(currentUser) {
		jsonError(w, http.StatusForbidden, "Cannot moderate platform administrators")
		return
	}

	reason := strings.TrimSpace(req.Reason)
	if reason == "" {
		reason = "Moderator action"
	}

	action := strings.ToLower(strings.TrimSpace(req.Action))
	switch action {
	case "unban", "lift_timeout":
		_, err = h.db.Exec(
			"INSERT INTO user_chat_moderation (user_id, username, contest_id, action, reason, moderated_by) VALUES (?, ?, ?, 'unban', ?, ?)",
			targetUserID, targetUsername, targetContestID, reason, currentUser.WikiUsername,
		)
		h.createNotification(
			int64(targetUserID), int64(targetContestID), nil, "chat_unban",
			"Chat Access Restored",
			fmt.Sprintf("Your chat access has been restored by %s: %s", currentUser.WikiUsername, reason),
			fmt.Sprintf("/contests/%s", code),
		)

	case "ban":
		_, err = h.db.Exec(
			"INSERT INTO user_chat_moderation (user_id, username, contest_id, action, reason, moderated_by) VALUES (?, ?, ?, 'ban', ?, ?)",
			targetUserID, targetUsername, targetContestID, reason, currentUser.WikiUsername,
		)
		h.createNotification(
			int64(targetUserID), int64(targetContestID), nil, "chat_ban",
			"Banned from Chat",
			fmt.Sprintf("You have been banned from this chat by %s: %s", currentUser.WikiUsername, reason),
			fmt.Sprintf("/contests/%s", code),
		)

	case "timeout":
		dur := req.DurationMinutes
		if dur <= 0 {
			dur = 60 // default 1 hour
		}
		tUntil := time.Now().Add(time.Duration(dur) * time.Minute)
		_, err = h.db.Exec(
			"INSERT INTO user_chat_moderation (user_id, username, contest_id, action, timeout_until, reason, moderated_by) VALUES (?, ?, ?, 'timeout', ?, ?, ?)",
			targetUserID, targetUsername, targetContestID, tUntil.Format(time.RFC3339), reason, currentUser.WikiUsername,
		)
		h.createNotification(
			int64(targetUserID), int64(targetContestID), nil, "chat_timeout",
			"Chat Timeout Applied",
			fmt.Sprintf("You have been timed out for %d minutes by %s: %s", dur, currentUser.WikiUsername, reason),
			fmt.Sprintf("/contests/%s", code),
		)

	case "warn":
		_, err = h.db.Exec(
			"INSERT INTO user_chat_moderation (user_id, username, contest_id, action, reason, moderated_by) VALUES (?, ?, ?, 'warn', ?, ?)",
			targetUserID, targetUsername, targetContestID, reason, currentUser.WikiUsername,
		)
		h.createNotification(
			int64(targetUserID), int64(targetContestID), nil, "chat_warning",
			"Formal Chat Warning",
			fmt.Sprintf("A formal warning was issued by %s: %s. Continued violations may lead to a chat timeout.", currentUser.WikiUsername, reason),
			fmt.Sprintf("/contests/%s", code),
		)

	default:
		jsonError(w, http.StatusBadRequest, "Invalid action. Supported: warn, timeout, ban, unban")
		return
	}

	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to apply moderation action")
		return
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"status":          "ok",
		"action":          action,
		"target_username": targetUsername,
		"moderated_by":    currentUser.WikiUsername,
		"reason":          reason,
	})
}

// GetChatModerationLog lists moderation actions taken in this contest.
func (h *Handler) GetChatModerationLog(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	code := chi.URLParam(r, "code")
	contestID, targetContestID, _, err := h.resolveContestAndCampaign(code, false)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	if !h.canModerateContest(currentUser, contestID) {
		jsonError(w, http.StatusForbidden, "Only juries and organizers can view the moderation log")
		return
	}

	rows, err := h.db.Query(`
		SELECT id, user_id, username, contest_id, action, timeout_until, reason, moderated_by, created_at
		FROM user_chat_moderation
		WHERE contest_id = ? OR contest_id IS NULL
		ORDER BY id DESC
		LIMIT 50
	`, targetContestID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "Failed to fetch moderation log")
		return
	}
	defer rows.Close()

	var logs []models.UserChatModeration
	for rows.Next() {
		var l models.UserChatModeration
		var cID sql.NullInt64
		var tUntil sql.NullString
		if err := rows.Scan(&l.ID, &l.UserID, &l.Username, &cID, &l.Action, &tUntil, &l.Reason, &l.ModeratedBy, &l.CreatedAt); err == nil {
			if cID.Valid {
				cidVal := int(cID.Int64)
				l.ContestID = &cidVal
			}
			if tUntil.Valid {
				l.TimeoutUntil = &tUntil.String
			}
			logs = append(logs, l)
		}
	}

	jsonResponse(w, http.StatusOK, map[string]any{
		"moderation_log": logs,
	})
}

// GetMyChatStatus returns whether the current user is active, timed out, or banned.
func (h *Handler) GetMyChatStatus(w http.ResponseWriter, r *http.Request) {
	currentUser := auth.GetUser(r.Context())
	if currentUser == nil {
		jsonResponse(w, http.StatusOK, models.UserChatStatus{
			CanChat: false,
			Status:  "unauthenticated",
		})
		return
	}

	code := chi.URLParam(r, "code")
	_, targetContestID, _, err := h.resolveContestAndCampaign(code, false)
	if err != nil {
		jsonError(w, http.StatusNotFound, "Contest not found")
		return
	}

	var action string
	var timeoutUntilStr sql.NullString
	var reason string
	err = h.db.QueryRow(`
		SELECT action, timeout_until, reason
		FROM user_chat_moderation
		WHERE user_id = ? AND (contest_id = ? OR contest_id IS NULL)
		ORDER BY id DESC
		LIMIT 1
	`, currentUser.UserID, targetContestID).Scan(&action, &timeoutUntilStr, &reason)

	var warningCount int
	_ = h.db.QueryRow(
		"SELECT COUNT(*) FROM user_chat_moderation WHERE user_id = ? AND (contest_id = ? OR contest_id IS NULL) AND action = 'warn'",
		currentUser.UserID, targetContestID,
	).Scan(&warningCount)

	status := models.UserChatStatus{
		CanChat:      true,
		Status:       "active",
		WarningCount: warningCount,
	}

	if err == nil {
		if action == "ban" {
			status.CanChat = false
			status.Status = "banned"
			status.BanReason = reason
		} else if action == "timeout" && timeoutUntilStr.Valid {
			tUntil := database.ParseFlexTime(timeoutUntilStr.String)
			if tUntil != nil && tUntil.After(time.Now()) {
				status.CanChat = false
				status.Status = "timed_out"
				tStr := tUntil.Format(time.RFC3339)
				status.TimeoutUntil = &tStr
				status.BanReason = reason
			}
		}
	}

	jsonResponse(w, http.StatusOK, status)
}
