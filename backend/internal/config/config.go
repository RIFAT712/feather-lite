package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	DatabaseURL         string
	DBType              string // "sqlite" or "mysql"
	SessionSecret       string
	WikimediaClientID   string
	WikimediaClientSecret string
	OAuthCallbackURL    string
	FrontendURL         string
	OwnerUsername       string
}

func Load() *Config {
	_ = godotenv.Load()
	_ = godotenv.Load("backend/.env")
	_ = godotenv.Load("../backend/.env")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	dbType := "sqlite"
	if dbURL == "" {
		dbURL = "feather.db"
	} else if os.Getenv("DB_TYPE") == "mysql" || (len(dbURL) > 5 && dbURL[:5] == "mysql") {
		dbType = "mysql"
	}

	sessionSecret := os.Getenv("SESSION_SECRET")
	if sessionSecret == "" {
		sessionSecret = "feather-development-secret-key-change-in-prod"
	}

	oauthCallback := os.Getenv("OAUTH_CALLBACK_URL")
	if oauthCallback == "" {
		oauthCallback = "http://localhost:8080/auth/callback"
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	owner := os.Getenv("OWNER_USERNAME")
	if owner == "" {
		owner = "R1F4T"
	}

	return &Config{
		Port:                  port,
		DatabaseURL:           dbURL,
		DBType:                dbType,
		SessionSecret:         sessionSecret,
		WikimediaClientID:     os.Getenv("WIKIMEDIA_CLIENT_ID"),
		WikimediaClientSecret: os.Getenv("WIKIMEDIA_CLIENT_SECRET"),
		OAuthCallbackURL:      oauthCallback,
		FrontendURL:           frontendURL,
		OwnerUsername:         owner,
	}
}
