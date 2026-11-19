package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"feather-backend/internal/config"
	"feather-backend/internal/database"
	"feather-backend/internal/models"
)

func TestGetOverview(t *testing.T) {
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

	req := httptest.NewRequest(http.MethodGet, "/api/overview", nil)
	rec := httptest.NewRecorder()

	h.GetOverview(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rec.Code, rec.Body.String())
	}

	var resp models.PlatformOverview
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal overview response: %v", err)
	}

	if len(resp.Trend) != 30 {
		t.Errorf("Expected 30 trend items, got %d", len(resp.Trend))
	}
}
