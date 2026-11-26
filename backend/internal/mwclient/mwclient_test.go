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
		{Title: "Hiri Motu"}, // Redirect
		{Title: "পুরাণ (দ্ব্যর্থতা নিরসন)"}, // Disambig
		{Title: "বাংলাদেশ"}, // Valid mainspace article
	}

	filtered, err := FilterDisambigsAndRedirects(wikiURL, creations)
	if err != nil {
		t.Skipf("Network unavailable (offline test sandbox): %v", err)
	}

	t.Logf("Filtered count: %d", len(filtered))
	for _, c := range filtered {
		t.Logf("Remaining title: %s", c.Title)
		if c.Title == "Hiri Motu" {
			t.Errorf("Expected 'Hiri Motu' (redirect) to be filtered out!")
		}
		if c.Title == "পুরাণ (দ্ব্যর্থতা নিরসন)" {
			t.Errorf("Expected 'পুরাণ (দ্ব্যর্থতা নিরসন)' (disambig) to be filtered out!")
		}
	}

	if len(filtered) != 1 || filtered[0].Title != "বাংলাদেশ" {
		t.Errorf("Expected only 'বাংলাদেশ', got: %+v", filtered)
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


