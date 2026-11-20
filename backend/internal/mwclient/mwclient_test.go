package mwclient

import (
	"testing"
)

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
