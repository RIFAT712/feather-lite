package mwclient

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"feather-backend/internal/config"
	"feather-backend/internal/wikitext"
)

const (
	WikimediaOAuthAuthorizeURL = "https://meta.wikimedia.org/w/rest.php/oauth2/authorize"
	WikimediaOAuthTokenURL     = "https://meta.wikimedia.org/w/rest.php/oauth2/access_token"
	WikimediaOAuthProfileURL   = "https://meta.wikimedia.org/w/rest.php/oauth2/resource/profile"
	DefaultUserAgent           = "FeatherContestTool/2.0 (Wikimedia Contest Engine; contact: r1f4t@toolforge.org)"
)

type UserProfile struct {
	Sub      string `json:"sub"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

type PageInfo struct {
	Title        string    `json:"title"`
	Exists       bool      `json:"exists"`
	IsRedirect   bool      `json:"is_redirect"`
	Creator      string    `json:"creator"`
	CreationDate time.Time `json:"creation_date"`
	ByteSize     int       `json:"byte_size"`
	WordCount    int       `json:"word_count"`
	RefCount     int       `json:"ref_count"`
}

var httpClient = &http.Client{
	Timeout: 20 * time.Second,
}

// -------------------------------------------------------------
// OAuth 2.0 Flow
// -------------------------------------------------------------

func GetAuthorizeURL(cfg *config.Config, state string) string {
	params := url.Values{}
	params.Set("client_id", cfg.WikimediaClientID)
	params.Set("response_type", "code")
	params.Set("redirect_uri", cfg.OAuthCallbackURL)
	params.Set("state", state)

	return fmt.Sprintf("%s?%s", WikimediaOAuthAuthorizeURL, params.Encode())
}

func ExchangeCodeForToken(cfg *config.Config, code string) (string, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", cfg.WikimediaClientID)
	data.Set("client_secret", cfg.WikimediaClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", cfg.OAuthCallbackURL)

	req, err := http.NewRequest("POST", WikimediaOAuthTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token endpoint returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var res struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		ExpiresIn   int    `json:"expires_in"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", fmt.Errorf("failed to parse token response: %w", err)
	}

	if res.Error != "" {
		return "", fmt.Errorf("oauth error: %s - %s", res.Error, res.ErrorDesc)
	}

	if res.AccessToken == "" {
		return "", errors.New("no access_token in response")
	}

	return res.AccessToken, nil
}

func FetchUserProfile(accessToken string) (*UserProfile, error) {
	req, err := http.NewRequest("GET", WikimediaOAuthProfileURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("profile fetch request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("profile endpoint returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var profile UserProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("failed to parse profile response: %w", err)
	}

	return &profile, nil
}

// -------------------------------------------------------------
// Real MediaWiki Article Query & Verification (Concurrent Pool)
// -------------------------------------------------------------

type mwQueryResponse struct {
	Query struct {
		Pages []struct {
			PageID    int    `json:"pageid"`
			Title     string `json:"title"`
			Missing   bool   `json:"missing"`
			Redirect  bool   `json:"redirect"`
			Length    int    `json:"length"`
			Touched   string `json:"touched"`
			Revisions []struct {
				User      string `json:"user"`
				Timestamp string `json:"timestamp"`
				Slots     struct {
					Main struct {
						Content string `json:"content"`
					} `json:"main"`
				} `json:"slots"`
			} `json:"revisions"`
		} `json:"pages"`
	} `json:"query"`
}

// FetchPageInfo queries a single page's initial creation revision and cleans wikitext.
func FetchPageInfo(wikiURL string, title string) (*PageInfo, error) {
	apiEndpoint := strings.TrimRight(wikiURL, "/") + "/w/api.php"
	params := url.Values{}
	params.Set("action", "query")
	params.Set("prop", "info|revisions")
	params.Set("rvprop", "user|timestamp|size|content")
	params.Set("rvslots", "main")
	params.Set("rvlimit", "1")
	params.Set("rvdir", "newer") // First revision = original creator!
	params.Set("titles", title)
	params.Set("format", "json")
	params.Set("formatversion", "2")

	req, err := http.NewRequest("GET", fmt.Sprintf("%s?%s", apiEndpoint, params.Encode()), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("mediawiki query failed: %w", err)
	}
	defer resp.Body.Close()

	var result mwQueryResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode mediawiki response: %w", err)
	}

	if len(result.Query.Pages) == 0 || result.Query.Pages[0].Missing {
		return &PageInfo{
			Title:  title,
			Exists: false,
		}, nil
	}

	page := result.Query.Pages[0]
	creator := ""
	var creationTime time.Time
	wordCount := 0
	refCount := 0

	if len(page.Revisions) > 0 {
		rev := page.Revisions[0]
		creator = rev.User
		creationTime, _ = time.Parse(time.RFC3339, rev.Timestamp)
		rawText := rev.Slots.Main.Content
		wordCount = wikitext.CountWords(rawText)
		refCount = wikitext.CountRefs(rawText)
	}

	return &PageInfo{
		Title:        page.Title,
		Exists:       true,
		IsRedirect:   page.Redirect,
		Creator:      creator,
		CreationDate: creationTime,
		ByteSize:     page.Length,
		WordCount:    wordCount,
		RefCount:     refCount,
	}, nil
}

// FetchPagesBatch validates multiple titles in parallel using a controlled worker pool.
// Avoids MediaWiki's 'invalidparammix' constraint while running in sub-second response times.
func FetchPagesBatch(wikiURL string, titles []string) (map[string]*PageInfo, error) {
	results := make(map[string]*PageInfo)
	if len(titles) == 0 {
		return results, nil
	}

	var mu sync.Mutex
	var wg sync.WaitGroup
	sem := make(chan struct{}, 8) // Max 8 parallel connections

	for _, t := range titles {
		clean := strings.TrimSpace(t)
		if clean == "" {
			continue
		}
		wg.Add(1)
		go func(title string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			info, err := FetchPageInfo(wikiURL, title)
			mu.Lock()
			if err != nil {
				results[title] = &PageInfo{Title: title, Exists: false}
			} else {
				results[title] = info
			}
			mu.Unlock()
		}(clean)
	}

	wg.Wait()
	return results, nil
}

// FetchRenderedHTML retrieves real HTML parsing from MediaWiki action=parse
func FetchRenderedHTML(wikiURL string, title string) (string, error) {
	apiEndpoint := strings.TrimRight(wikiURL, "/") + "/w/api.php"
	params := url.Values{}
	params.Set("action", "parse")
	params.Set("page", title)
	params.Set("prop", "text")
	params.Set("disableeditsection", "1")
	params.Set("format", "json")
	params.Set("formatversion", "2")

	req, err := http.NewRequest("GET", fmt.Sprintf("%s?%s", apiEndpoint, params.Encode()), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("parse request failed: %w", err)
	}
	defer resp.Body.Close()

	var res struct {
		Parse struct {
			Title string `json:"title"`
			Text  string `json:"text"`
		} `json:"parse"`
		Error struct {
			Code string `json:"code"`
			Info string `json:"info"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", fmt.Errorf("failed to decode parse response: %w", err)
	}

	if res.Error.Code != "" {
		return "", fmt.Errorf("mediawiki parse error: %s", res.Error.Info)
	}

	return res.Parse.Text, nil
}

type UserCreation struct {
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
}

// FetchUserCreatedArticles queries MediaWiki list=usercontribs to list all articles created by the user within the date range.
func FetchUserCreatedArticles(wikiURL, username, startTS, endTS string) ([]UserCreation, error) {
	apiEndpoint := strings.TrimRight(wikiURL, "/") + "/w/api.php"
	params := url.Values{}
	params.Set("action", "query")
	params.Set("list", "usercontribs")
	params.Set("ucuser", username)
	if startTS != "" {
		params.Set("ucstart", startTS)
	}
	if endTS != "" {
		params.Set("ucend", endTS)
	}
	params.Set("ucdir", "newer")
	params.Set("ucnamespace", "0")
	params.Set("ucprop", "title|timestamp")
	params.Set("ucshow", "new")
	params.Set("uclimit", "500")
	params.Set("format", "json")
	params.Set("formatversion", "2")

	req, err := http.NewRequest("GET", fmt.Sprintf("%s?%s", apiEndpoint, params.Encode()), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("usercontribs request failed: %w", err)
	}
	defer resp.Body.Close()

	var res struct {
		Query struct {
			Usercontribs []struct {
				Title     string `json:"title"`
				Timestamp string `json:"timestamp"`
			} `json:"usercontribs"`
		} `json:"query"`
		Error struct {
			Code string `json:"code"`
			Info string `json:"info"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, fmt.Errorf("failed to decode usercontribs response: %w", err)
	}

	if res.Error.Code != "" {
		return nil, fmt.Errorf("mediawiki usercontribs error: %s", res.Error.Info)
	}

	var out []UserCreation
	seen := make(map[string]bool)
	for _, c := range res.Query.Usercontribs {
		if !seen[c.Title] {
			seen[c.Title] = true
			out = append(out, UserCreation{
				Title:     c.Title,
				CreatedAt: c.Timestamp,
			})
		}
	}
	if out == nil {
		out = []UserCreation{}
	}
	return out, nil
}

