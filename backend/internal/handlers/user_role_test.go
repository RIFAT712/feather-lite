package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"feather-backend/internal/config"
	"feather-backend/internal/database"
	"feather-backend/internal/mwclient"
)

func TestGetUserRole_DynamicAdmin(t *testing.T) {
	cfg := &config.Config{
		DBType:        "sqlite",
		DatabaseURL:   ":memory:",
		OwnerUsername: "R1F4T",
	}
	db, err := database.Connect(cfg)
	if err != nil {
		t.Fatalf("Failed to connect to in-memory db: %v", err)
	}
	defer db.Close()

	h := New(cfg, db, nil)

	// Set in-memory cache directly as if CentralAuth checked Yahya
	mwclient.SetCachedAdmin("Yahya", true)

	req := httptest.NewRequest(http.MethodGet, "/api/users/Yahya/role", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("username", "Yahya")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

	rec := httptest.NewRecorder()
	h.GetUserRole(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d. Body: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Username string `json:"username"`
		Role     string `json:"role"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}

	if resp.Role != "admin" {
		t.Errorf("Expected role 'admin', got '%s'", resp.Role)
	}
}
