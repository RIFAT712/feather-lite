package database

import (
	"testing"

	"feather-backend/internal/config"
)

func TestConnect_Migrations(t *testing.T) {
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

	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM schema_migrations WHERE id = 'remove_default_owner_juries'").Scan(&count); err != nil {
		t.Fatalf("Failed to query schema_migrations: %v", err)
	}
	if count != 1 {
		t.Errorf("Expected 1 migration record, got %d", count)
	}
}
