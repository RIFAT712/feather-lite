package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"feather-backend/internal/auth"
	"feather-backend/internal/config"
	"feather-backend/internal/database"
)

func TestSoftDeleteAndRestoreContest(t *testing.T) {
	cfg := &config.Config{
		DBType:        "sqlite",
		DatabaseURL:   ":memory:",
		OwnerUsername: "admin_tester",
	}
	db, err := database.Connect(cfg)
	if err != nil {
		t.Fatalf("Failed to connect to in-memory db: %v", err)
	}
	defer db.Close()

	h := New(cfg, db, nil)

	// 1. Insert test user & contest
	uRes, err := db.Exec(`INSERT INTO users (wiki_username, role) VALUES ('admin_tester', 'owner')`)
	if err != nil {
		t.Fatalf("Failed to insert owner: %v", err)
	}
	userID, _ := uRes.LastInsertId()

	code := "soft-del-test"
	today := time.Now().UTC().Format("2006-01-02")
	cRes, err := db.Exec(`
		INSERT INTO contests (code, name, wiki_dbname, status, start_date, end_date, created_by_id)
		VALUES (?, ?, 'bnwiki', 'active', ?, ?, ?)
	`, code, "Soft Delete Test Contest", today+" 00:00:00", today+" 23:59:59", userID)
	if err != nil {
		t.Fatalf("Failed to insert contest: %v", err)
	}
	contestID, _ := cRes.LastInsertId()

	// 2. Insert an article under this contest
	artRes, err := db.Exec(`
		INSERT INTO articles (contest_id, submitter_id, title, status)
		VALUES (?, ?, 'Preserved Article', 'accepted')
	`, contestID, userID)
	if err != nil {
		t.Fatalf("Failed to insert article: %v", err)
	}
	articleID, _ := artRes.LastInsertId()

	// 3. Perform Soft Delete
	req := httptest.NewRequest(http.MethodDelete, "/api/contests/"+code, nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("code", code)
	claims := &auth.Claims{
		UserID:       userID,
		WikiUsername: "admin_tester",
		Role:         "owner",
	}
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, rctx)
	ctx = context.WithValue(ctx, auth.UserContextKey, claims)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.DeleteContest(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK from DeleteContest, got %d: %s", rec.Code, rec.Body.String())
	}

	// 4. Verify contest row still exists with status = 'deleted'
	var status string
	err = db.QueryRow("SELECT status FROM contests WHERE id = ?", contestID).Scan(&status)
	if err != nil {
		t.Fatalf("Contest row was wiped from database: %v", err)
	}
	if status != "deleted" {
		t.Errorf("Expected status 'deleted', got '%s'", status)
	}

	// 5. Verify article was NOT deleted
	var count int
	_ = db.QueryRow("SELECT COUNT(*) FROM articles WHERE id = ?", articleID).Scan(&count)
	if count != 1 {
		t.Errorf("Expected article to be preserved, found %d", count)
	}

	// 6. Perform Restore
	restoreReq := httptest.NewRequest(http.MethodPost, "/api/contests/"+code+"/restore", nil)
	restoreReq = restoreReq.WithContext(ctx)
	restoreRec := httptest.NewRecorder()

	h.RestoreContest(restoreRec, restoreReq)

	if restoreRec.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK from RestoreContest, got %d: %s", restoreRec.Code, restoreRec.Body.String())
	}

	// 7. Verify status is restored to active
	_ = db.QueryRow("SELECT status FROM contests WHERE id = ?", contestID).Scan(&status)
	if status != "active" {
		t.Errorf("Expected status 'active' after restore, got '%s'", status)
	}
}
