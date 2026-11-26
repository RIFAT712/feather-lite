package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"feather-backend/internal/auth"
	"feather-backend/internal/config"
	"feather-backend/internal/database"
)

func withChiParam(r *http.Request, key, val string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, val)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

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

func TestOrganizerRoles_SettingsJudgeAndStats(t *testing.T) {
	cfg := &config.Config{
		DBType:        "sqlite",
		DatabaseURL:   ":memory:",
		OwnerUsername: "PlatformOwner",
	}
	db, err := database.Connect(cfg)
	if err != nil {
		t.Fatalf("Failed to connect to in-memory db: %v", err)
	}
	defer db.Close()

	creatorRes, err := db.Exec("INSERT INTO users (wiki_username, role) VALUES ('CreatorUser', 'participant')")
	if err != nil {
		t.Fatalf("Failed to insert creator: %v", err)
	}
	creatorID, _ := creatorRes.LastInsertId()

	orgRes, err := db.Exec("INSERT INTO users (wiki_username, role) VALUES ('CoOrganizer', 'participant')")
	if err != nil {
		t.Fatalf("Failed to insert organizer: %v", err)
	}
	orgID, _ := orgRes.LastInsertId()

	juryRes, err := db.Exec("INSERT INTO users (wiki_username, role) VALUES ('PlainJury', 'jury')")
	if err != nil {
		t.Fatalf("Failed to insert jury: %v", err)
	}
	juryID, _ := juryRes.LastInsertId()

	subRes, err := db.Exec("INSERT INTO users (wiki_username, role) VALUES ('SubmitterUser', 'participant')")
	if err != nil {
		t.Fatalf("Failed to insert submitter: %v", err)
	}
	subID, _ := subRes.LastInsertId()

	h := New(cfg, db, nil)

	// 1. Create contest with CoOrganizer in organizers and PlainJury in juries
	bodyBytes, _ := json.Marshal(map[string]any{
		"name":       "Org Role Contest",
		"wiki":       "bnwiki",
		"start_date": time.Now().Format(time.RFC3339),
		"end_date":   time.Now().Add(48 * time.Hour).Format(time.RFC3339),
		"juries":     []string{"PlainJury"},
		"organizers": []string{"CoOrganizer"},
	})
	req := httptest.NewRequest(http.MethodPost, "/api/contests", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(context.WithValue(req.Context(), auth.UserContextKey, &auth.Claims{
		UserID:       creatorID,
		WikiUsername: "CreatorUser",
		Role:         "participant",
	}))
	rec := httptest.NewRecorder()
	h.CreateContest(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d: %s", rec.Code, rec.Body.String())
	}

	var createResp struct {
		Code    string `json:"code"`
		Contest struct {
			ID int64 `json:"id"`
		} `json:"contest"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &createResp); err != nil {
		t.Fatalf("Failed to decode create response: %v", err)
	}
	contestID := createResp.Contest.ID

	// 2. Verify CoOrganizer is NOT automatically in contest_juries
	var orgInJury int
	_ = db.QueryRow("SELECT COUNT(*) FROM contest_juries WHERE contest_id = ? AND user_id = ?", contestID, orgID).Scan(&orgInJury)
	if orgInJury != 0 {
		t.Fatalf("Expected CoOrganizer NOT to be in contest_juries, got count=%d", orgInJury)
	}

	// 3. Verify authorization split: CoOrganizer is organizer & jury/organizer; PlainJury is NOT organizer
	if !h.isUserOrganizer(contestID, orgID, "participant") {
		t.Errorf("Expected CoOrganizer to have organizer permission")
	}
	if !h.isUserJuryOrOrganizer(contestID, orgID, "participant") {
		t.Errorf("Expected CoOrganizer to be able to judge")
	}
	if h.isUserOrganizer(contestID, juryID, "jury") {
		t.Errorf("Expected PlainJury NOT to have organizer settings permission")
	}

	// 4. Insert a submitted article and verify GetJuryStats excludes CoOrganizer before judging
	artRes, err := db.Exec(`
		INSERT INTO articles (contest_id, title, submitter_id, status, byte_count, word_count)
		VALUES (?, 'Test Article', ?, 'pending', 1200, 200)
	`, contestID, subID)
	if err != nil {
		t.Fatalf("Failed to insert article: %v", err)
	}
	articleID, _ := artRes.LastInsertId()

	// Helper to fetch GetJuryStats
	fetchStats := func() []string {
		sReq := httptest.NewRequest(http.MethodGet, "/api/contests/"+createResp.Code+"/jury-stats", nil)
		sReq = withChiParam(sReq, "code", createResp.Code)
		sRec := httptest.NewRecorder()
		h.GetJuryStats(sRec, sReq)
		if sRec.Code != http.StatusOK {
			t.Fatalf("Expected 200 from GetJuryStats, got %d: %s", sRec.Code, sRec.Body.String())
		}
		var resp JuryStatsResponse
		if err := json.Unmarshal(sRec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("Failed to unmarshal jury stats: %v", err)
		}
		names := make([]string, 0, len(resp.Juries))
		for _, j := range resp.Juries {
			names = append(names, j.Username)
		}
		return names
	}

	beforeNames := fetchStats()
	if len(beforeNames) != 1 || beforeNames[0] != "PlainJury" {
		t.Errorf("Expected only ['PlainJury'] in jury stats before organizer judges, got %v", beforeNames)
	}

	// 5. CoOrganizer judges 1 article -> ReviewArticle succeeds & CoOrganizer appears in GetJuryStats
	revBody, _ := json.Marshal(map[string]any{"status": "accepted", "comment": "Good"})
	revReq := httptest.NewRequest(http.MethodPost, "/api/articles/1/review", bytes.NewReader(revBody))
	revReq = withChiParam(revReq, "id", strconv.FormatInt(articleID, 10))
	revReq = revReq.WithContext(context.WithValue(revReq.Context(), auth.UserContextKey, &auth.Claims{
		UserID:       orgID,
		WikiUsername: "CoOrganizer",
		Role:         "participant",
	}))
	revRec := httptest.NewRecorder()
	h.ReviewArticle(revRec, revReq)
	if revRec.Code != http.StatusOK {
		t.Fatalf("Expected 200 from ReviewArticle by CoOrganizer, got %d: %s", revRec.Code, revRec.Body.String())
	}

	afterNames := fetchStats()
	foundOrg := false
	for _, n := range afterNames {
		if n == "CoOrganizer" {
			foundOrg = true
		}
	}
	if !foundOrg {
		t.Errorf("Expected CoOrganizer to appear in GetJuryStats after judging 1 article, got %v", afterNames)
	}

	// 6. Verify UpdateContest allows CoOrganizer (200) and blocks PlainJury (403)
	updBody, _ := json.Marshal(map[string]any{
		"name":       "Org Role Contest Updated",
		"start_date": time.Now().Format(time.RFC3339),
		"end_date":   time.Now().Add(48 * time.Hour).Format(time.RFC3339),
		"status":     "active",
	})
	juryUpdReq := httptest.NewRequest(http.MethodPut, "/api/contests/"+createResp.Code+"/settings", bytes.NewReader(updBody))
	juryUpdReq = withChiParam(juryUpdReq, "code", createResp.Code)
	juryUpdReq = juryUpdReq.WithContext(context.WithValue(juryUpdReq.Context(), auth.UserContextKey, &auth.Claims{
		UserID:       juryID,
		WikiUsername: "PlainJury",
		Role:         "jury",
	}))
	juryUpdRec := httptest.NewRecorder()
	h.UpdateContest(juryUpdRec, juryUpdReq)
	if juryUpdRec.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden for PlainJury UpdateContest, got %d", juryUpdRec.Code)
	}

	orgUpdReq := httptest.NewRequest(http.MethodPut, "/api/contests/"+createResp.Code+"/settings", bytes.NewReader(updBody))
	orgUpdReq = withChiParam(orgUpdReq, "code", createResp.Code)
	orgUpdReq = orgUpdReq.WithContext(context.WithValue(orgUpdReq.Context(), auth.UserContextKey, &auth.Claims{
		UserID:       orgID,
		WikiUsername: "CoOrganizer",
		Role:         "participant",
	}))
	orgUpdRec := httptest.NewRecorder()
	h.UpdateContest(orgUpdRec, orgUpdReq)
	if orgUpdRec.Code != http.StatusOK {
		t.Errorf("Expected 200 OK for CoOrganizer UpdateContest, got %d: %s", orgUpdRec.Code, orgUpdRec.Body.String())
	}
}
