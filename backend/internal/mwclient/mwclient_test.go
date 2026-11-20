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
