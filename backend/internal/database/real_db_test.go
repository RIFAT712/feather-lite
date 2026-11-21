package database

import (
	"testing"

	"feather-backend/internal/config"
)

func TestDeleteOwnerJuryAndUnassign(t *testing.T) {
	cfg := &config.Config{
		DBType:        "sqlite",
		DatabaseURL:   ":memory:",
		OwnerUsername: "R1F4T",
	}
	db, err := Connect(cfg)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer db.Close()

	var migCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE id = 'cleanup_legacy_owner_juries_v3'").Scan(&migCount); err != nil {
		t.Fatalf("Query migration failed: %v", err)
	}
	if migCount != 1 {
		t.Errorf("Expected migration to be applied, got count %d", migCount)
	}
}
