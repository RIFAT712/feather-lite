package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"feather-backend/internal/auth"
	"feather-backend/internal/config"
	"feather-backend/internal/database"
)

func TestCreateContest_NoDefaultJury(t *testing.T) {
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

	// Seed creator user
	res, err := db.Exec("INSERT INTO users (wiki_username, role) VALUES ('R1F4T', 'owner')")
	if err != nil {
		t.Fatalf("Failed to insert user: %v", err)
	}
	userID, _ := res.LastInsertId()

	h := New(cfg, db, nil)

	// Case 1: Creator creates contest with explicitly specified jury "DeloarAkram", NOT specifying themselves
	body := map[string]any{
		"name":        "Test Contest",
		"description": "Description",
		"wiki":        "bnwiki",
		"start_date":  time.Now().Format(time.RFC3339),
		"end_date":    time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		"juries":      []string{"DeloarAkram"},
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/contests", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	// Set auth context for R1F4T
	claims := &auth.Claims{
		UserID:       userID,
		WikiUsername: "R1F4T",
		Role:         "owner",
	}
	ctx := context.WithValue(req.Context(), auth.UserContextKey, claims)
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	h.CreateContest(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d. Body: %s", rec.Code, rec.Body.String())
	}

	var resData struct {
		Contest struct {
			ID int64 `json:"id"`
		} `json:"contest"`
		Code string `json:"code"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resData); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	contestID := resData.Contest.ID
	if contestID == 0 {
		t.Fatalf("Contest ID is 0 in response: %s", rec.Body.String())
	}

	// Verify jury list in database for contest
	rows, err := db.Query(`
		SELECT u.wiki_username 
		FROM contest_juries cj
		JOIN users u ON cj.user_id = u.id
		WHERE cj.contest_id = ?
	`, contestID)
	if err != nil {
		t.Fatalf("Failed to query contest_juries: %v", err)
	}
	defer rows.Close()

	var juries []string
	for rows.Next() {
		var u string
		if err := rows.Scan(&u); err == nil {
			juries = append(juries, u)
		}
	}

	// DeloarAkram should be present, R1F4T should NOT be present
	if len(juries) != 1 || juries[0] != "DeloarAkram" {
		t.Errorf("Expected only ['DeloarAkram'], got: %v", juries)
	}

	// Case 2: If creator explicitly includes themselves in juries list, they ARE added
	body2 := map[string]any{
		"name":        "Exclusive Contest",
		"description": "Description",
		"wiki":        "bnwiki",
		"start_date":  time.Now().Format(time.RFC3339),
		"end_date":    time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		"juries":      []string{"DeloarAkram", "R1F4T"},
	}
	bodyBytes2, _ := json.Marshal(body2)
	req2 := httptest.NewRequest(http.MethodPost, "/api/contests", bytes.NewReader(bodyBytes2))
	req2.Header.Set("Content-Type", "application/json")
	req2 = req2.WithContext(ctx)

	rec2 := httptest.NewRecorder()
	h.CreateContest(rec2, req2)

	if rec2.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d. Body: %s", rec2.Code, rec2.Body.String())
	}

	var resData2 struct {
		Contest struct {
			ID int64 `json:"id"`
		} `json:"contest"`
		Code string `json:"code"`
	}
	if err := json.Unmarshal(rec2.Body.Bytes(), &resData2); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	rows2, err := db.Query(`
		SELECT u.wiki_username 
		FROM contest_juries cj
		JOIN users u ON cj.user_id = u.id
		WHERE cj.contest_id = ?
		ORDER BY u.wiki_username ASC
	`, resData2.Contest.ID)
	if err != nil {
		t.Fatalf("Failed to query contest_juries: %v", err)
	}
	defer rows2.Close()

	var juries2 []string
	for rows2.Next() {
		var u string
		if err := rows2.Scan(&u); err == nil {
			juries2 = append(juries2, u)
		}
	}

	if len(juries2) != 2 || juries2[0] != "DeloarAkram" || juries2[1] != "R1F4T" {
		t.Errorf("Expected ['DeloarAkram', 'R1F4T'], got: %v", juries2)
	}
}
