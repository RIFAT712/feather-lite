package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"feather-backend/internal/config"
	"feather-backend/internal/models"
)

const CookieName = "feather_token"

type contextKey string

const UserContextKey = contextKey("user_claims")

type Claims struct {
	UserID       int64  `json:"user_id"`
	WikiUsername string `json:"wiki_username"`
	Role         string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(cfg *config.Config, user *models.User) (string, error) {
	expirationTime := time.Now().Add(7 * 24 * time.Hour) // 7 days session
	claims := &Claims{
		UserID:       user.ID,
		WikiUsername: user.WikiUsername,
		Role:         user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "feather-2.0",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.SessionSecret))
}

func ParseToken(cfg *config.Config, tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(cfg.SessionSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}
	return claims, nil
}

func SetAuthCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   false, // Set to true behind HTTPS on Toolforge
	})
}

func ClearAuthCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func GetUserFromRequest(r *http.Request, cfg *config.Config) (*Claims, error) {
	if authHeader := r.Header.Get("Authorization"); authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			if claims, err := ParseToken(cfg, strings.TrimSpace(parts[1])); err == nil && claims != nil {
				return claims, nil
			}
		}
	}
	cookie, err := r.Cookie(CookieName)
	if err != nil {
		return nil, err
	}
	return ParseToken(cfg, cookie.Value)
}

func Middleware(cfg *config.Config) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := GetUserFromRequest(r, cfg)
			if err == nil && claims != nil {
				ctx := context.WithValue(r.Context(), UserContextKey, claims)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func GetUser(ctx context.Context) *Claims {
	if val := ctx.Value(UserContextKey); val != nil {
		if claims, ok := val.(*Claims); ok {
			return claims
		}
	}
	return nil
}
