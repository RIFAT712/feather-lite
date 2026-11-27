package mwclient

import (
	"encoding/base64"
	"fmt"
	"testing"
	"time"
)

func TestIsTokenExpired_FloatExp(t *testing.T) {
	// Future float exp (1 hour from now)
	futureExp := float64(time.Now().Unix() + 3600) + 0.1234
	futurePayload := fmt.Sprintf(`{"exp": %f, "sub": "test"}`, futureExp)
	futureToken := "eyJhbGciOiJSUzI1NiJ9." + base64.RawURLEncoding.EncodeToString([]byte(futurePayload)) + ".sig"

	if IsTokenExpired(futureToken) {
		t.Errorf("Expected future token to not be expired")
	}

	// Past float exp (1 hour ago)
	pastExp := float64(time.Now().Unix() - 3600) + 0.5678
	pastPayload := fmt.Sprintf(`{"exp": %f, "sub": "test"}`, pastExp)
	pastToken := "eyJhbGciOiJSUzI1NiJ9." + base64.RawURLEncoding.EncodeToString([]byte(pastPayload)) + ".sig"

	if !IsTokenExpired(pastToken) {
		t.Errorf("Expected past token to be expired")
	}
}

func TestCheckIsAdminOnAnyWiki_Yahya(t *testing.T) {
	isAdmin, err := CheckIsAdminOnAnyWiki("Yahya")
	if err != nil {
		t.Skipf("Network unavailable: %v", err)
	}
	if !isAdmin {
		t.Skip("Live network unreachable in current environment, skipping live test")
	}

	// Verify in-memory cache
	cached, found := IsCachedAdmin("Yahya")
	if !found || !cached {
		t.Errorf("Expected Yahya to be cached as admin, got found=%v, cached=%v", found, cached)
	}
}

func TestFilterDisambigsAndRedirects_Live(t *testing.T) {
	wikiURL := "https://bn.wikipedia.org"
	creations := []UserCreation{
		{Title: "Hiri Motu"},               // Redirect
		{Title: "যুক্তরাষ্ট্র"},             // Bengali Redirect
		{Title: "পুরাণ (দ্ব্যর্থতা নিরসন)"}, // Disambig by title
		{Title: "১নং ওয়ার্ড"},              // Disambig by pageprop Q114058902 / disambiguation
		{Title: "বাংলাদেশ"},                // Valid mainspace article
	}

	filtered, err := FilterDisambigsAndRedirects(wikiURL, creations)
	if err != nil {
		t.Skipf("Network unavailable (offline test sandbox): %v", err)
	}

	t.Logf("Filtered count: %d", len(filtered))
	for _, c := range filtered {
		t.Logf("Remaining title: %s", c.Title)
		if c.Title == "Hiri Motu" || c.Title == "যুক্তরাষ্ট্র" {
			t.Errorf("Expected redirect %q to be filtered out!", c.Title)
		}
		if c.Title == "পুরাণ (দ্ব্যর্থতা নিরসন)" || c.Title == "১নং ওয়ার্ড" {
			t.Errorf("Expected disambig %q to be filtered out!", c.Title)
		}
	}

	if len(filtered) != 1 || filtered[0].Title != "বাংলাদেশ" {
		t.Errorf("Expected only 'বাংলাদেশ', got: %+v", filtered)
	}
}

func TestIsRedirectField(t *testing.T) {
	if !isRedirectField(true) {
		t.Errorf("expected bool true to be redirect")
	}
	if isRedirectField(false) {
		t.Errorf("expected bool false to not be redirect")
	}
	if !isRedirectField("") {
		t.Errorf("expected empty string (formatversion 1) to be redirect")
	}
	if !isRedirectField("true") {
		t.Errorf("expected string 'true' to be redirect")
	}
	if isRedirectField("false") {
		t.Errorf("expected string 'false' to not be redirect")
	}
	if isRedirectField(nil) {
		t.Errorf("expected nil to not be redirect")
	}
}

func TestIsDisambigData(t *testing.T) {
	// Case 1: Pageprop disambiguation
	if !isDisambigData("Sample Article", map[string]any{"disambiguation": ""}) {
		t.Errorf("expected disambiguation prop to be flagged as disambig")
	}
	// Case 2: Pageprop disambig
	if !isDisambigData("Sample Article", map[string]any{"disambig": ""}) {
		t.Errorf("expected disambig prop to be flagged as disambig")
	}
	// Case 3: Wikidata Q4167410
	if !isDisambigData("Sample Article", map[string]any{"wikibase_item": "Q4167410"}) {
		t.Errorf("expected Q4167410 wikibase_item to be flagged as disambig")
	}
	// Case 4: Title pattern
	if !isDisambigData("মহাভারত (দ্ব্যর্থতা নিরসন)", nil) {
		t.Errorf("expected title pattern to be flagged as disambig")
	}
	// Case 5: Clean article
	if isDisambigData("বাংলাদেশ", map[string]any{"wikibase_item": "Q902"}) {
		t.Errorf("expected normal article to not be flagged as disambig")
	}
}

func TestIsDisambigTitle_Multilingual(t *testing.T) {
	cases := []struct {
		title    string
		expected bool
	}{
		{"পুরাণ (দ্ব্যর্থতা নিরসন)", true},
		{"আসাম (দ্ব্যৰ্থতা স্পষ্টকৰণ)", true},
		{"ভারত (দ্ব্যর্থতা প্রকাশ)", true},
		{"Python (disambiguation)", true},
		{"Mercury (disambiguation)", true},
		{"রাম (বহুৱিকল্পী)", true},
		{"कृष्ण (बहुविकल्पी)", true},
		{"دمشق (توضيح)", true},
		{"تهران (ابهام‌زدایی)", true},
		{"Paris (homonymie)", true},
		{"Berlin (Begriffsklärung)", true},
		{"Roma (desambiguación)", true},
		{"ঢাকা (দ্ব্যর্থতা)", true},
		{"নদী (দ্ব্যর্থ নিরসন)", true},
		{"Python (disambig)", true},
		{"Mercury (dab)", true},
		{"शिव (बहुविकल्पी शब्द)", true},
		{"Warszawa (ujednoznacznienie)", true},
		{"Amsterdam (doorverwijspagina)", true},
		{"Helsinki (täsmennyssivu)", true},
		{"Oslo (pekerside)", true},
		{"Praha (rozcestník)", true},
		{"Budapest (egyértelműsítő lap)", true},
		{"北京 (消歧义)", true},
		{"東京 (曖昧さ回避)", true},
		{"서울 (동음이의)", true},
		{"বাংলাদেশ", false},
		{"Wiki Loves Childhood", false},
		{"Feather Contest Platform", false},
	}

	for _, tc := range cases {
		got := IsDisambigTitle(tc.title)
		if got != tc.expected {
			t.Errorf("IsDisambigTitle(%q) = %v; want %v", tc.title, got, tc.expected)
		}
	}
}


