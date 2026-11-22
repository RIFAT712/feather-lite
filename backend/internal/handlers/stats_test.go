package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"feather-backend/internal/config"
	"feather-backend/internal/database"
	"feather-backend/internal/models"
)

func TestGetContestStats(t *testing.T) {
	cfg := &config.Config{
		DBType:      "sqlite",
		DatabaseURL: ":memory:",
	}
	db, err := database.Connect(cfg)
	if err != nil {
		t.Fatalf("Failed to connect to in-memory db: %v", err)
	}
	defer db.Close()

	h := New(cfg, db, nil)

	// 1. Insert test contest
	code := "test-stats"
	today := time.Now().UTC().Format("2006-01-02")
	res, err := db.Exec(`
		INSERT INTO contests (code, name, wiki_dbname, status, start_date, end_date)
		VALUES (?, ?, ?, 'active', ?, ?)
	`, code, "Stats Test Contest", "bnwiki", today+" 00:00:00", today+" 23:59:59")
	if err != nil {
		t.Fatalf("Failed to insert contest: %v", err)
	}
	contestID, _ := res.LastInsertId()

	// 2. Insert test user and articles
	uRes, err := db.Exec(`INSERT INTO users (wiki_username, role) VALUES ('stats_user', 'participant')`)
	if err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}
	userID, _ := uRes.LastInsertId()

	// Article 1: accepted
	artRes, err := db.Exec(`
		INSERT INTO articles (contest_id, submitter_id, title, status, submitted_at)
		VALUES (?, ?, 'Art 1', 'accepted', ?)
	`, contestID, userID, today+" 10:00:00")
	if err != nil {
		t.Fatalf("Failed to insert article 1: %v", err)
	}
	artID, _ := artRes.LastInsertId()

	// Article 2: pending
	_, err = db.Exec(`
		INSERT INTO articles (contest_id, submitter_id, title, status, submitted_at)
		VALUES (?, ?, 'Art 2', 'pending', ?)
	`, contestID, userID, today+" 11:00:00")
	if err != nil {
		t.Fatalf("Failed to insert article 2: %v", err)
	}

	// Review for article 1
	db.Exec(`
		INSERT INTO reviews (article_id, reviewer_id, status, timestamp)
		VALUES (?, ?, 'accepted', ?)
	`, artID, userID, today+" 12:00:00")

	// 3. Make HTTP request with Chi URLParam
	req := httptest.NewRequest(http.MethodGet, "/api/contests/"+code+"/stats", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("code", code)
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	rec := httptest.NewRecorder()

	h.GetContestStats(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rec.Code, rec.Body.String())
	}

	var resp models.ContestStatsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to parse JSON response: %v", err)
	}

	if resp.StatusCounts["total"] != 2 {
		t.Errorf("Expected total 2, got %d", resp.StatusCounts["total"])
	}
	if resp.StatusCounts["accepted"] != 1 {
		t.Errorf("Expected accepted 1, got %d", resp.StatusCounts["accepted"])
	}
	if resp.StatusCounts["pending"] != 1 {
		t.Errorf("Expected pending 1, got %d", resp.StatusCounts["pending"])
	}
	if len(resp.Daily) == 0 {
		t.Errorf("Expected daily points, got none")
	} else {
		found := false
		for _, d := range resp.Daily {
			if d.Date == today {
				found = true
				if d.Count != 2 {
					t.Errorf("Expected 2 submitted on %s, got %d", today, d.Count)
				}
				if d.Judged != 1 {
					t.Errorf("Expected 1 judged on %s, got %d", today, d.Judged)
				}
			}
		}
		if !found {
			t.Errorf("Today %s not found in daily points", today)
		}
	}
}
