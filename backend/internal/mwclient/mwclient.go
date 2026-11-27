package mwclient

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
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
	IsDisambig   bool      `json:"is_disambig"`
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

// IsTokenExpired checks whether a Wikimedia OAuth 2.0 JWT access token is expired or about to expire in the next 60s.
func IsTokenExpired(token string) bool {
	token = strings.TrimSpace(token)
	if token == "" {
		return true
	}
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return true
	}
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		payloadBytes, err = base64.URLEncoding.DecodeString(parts[1])
		if err != nil {
			p := parts[1]
			if rem := len(p) % 4; rem != 0 {
				p += strings.Repeat("=", 4-rem)
			}
			payloadBytes, err = base64.StdEncoding.DecodeString(p)
			if err != nil {
				return true
			}
		}
	}
	var claims struct {
		Exp json.Number `json:"exp"`
	}
	decoder := json.NewDecoder(bytes.NewReader(payloadBytes))
	decoder.UseNumber()
	if err := decoder.Decode(&claims); err != nil {
		return true
	}
	expVal, err := claims.Exp.Float64()
	if err != nil || expVal == 0 {
		return true
	}
	return float64(time.Now().Unix()) >= (expVal - 60)
}

func ExchangeCodeForToken(cfg *config.Config, code string) (string, string, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("client_id", cfg.WikimediaClientID)
	data.Set("client_secret", cfg.WikimediaClientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", cfg.OAuthCallbackURL)

	req, err := http.NewRequest("POST", WikimediaOAuthTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("token endpoint returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var res struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		TokenType    string `json:"token_type"`
		ExpiresIn    int    `json:"expires_in"`
		Error        string `json:"error"`
		ErrorDesc    string `json:"error_description"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", "", fmt.Errorf("failed to parse token response: %w", err)
	}

	if res.Error != "" {
		return "", "", fmt.Errorf("oauth error: %s - %s", res.Error, res.ErrorDesc)
	}

	if res.AccessToken == "" {
		return "", "", errors.New("no access_token in response")
	}

	return res.AccessToken, res.RefreshToken, nil
}

func RefreshAccessToken(cfg *config.Config, refreshToken string) (string, string, error) {
	if strings.TrimSpace(refreshToken) == "" {
		return "", "", errors.New("empty refresh token")
	}
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("client_id", cfg.WikimediaClientID)
	data.Set("client_secret", cfg.WikimediaClientSecret)
	data.Set("refresh_token", refreshToken)

	req, err := http.NewRequest("POST", WikimediaOAuthTokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("token refresh request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("token refresh endpoint returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var res struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		TokenType    string `json:"token_type"`
		ExpiresIn    int    `json:"expires_in"`
		Error        string `json:"error"`
		ErrorDesc    string `json:"error_description"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", "", fmt.Errorf("failed to parse refresh token response: %w", err)
	}

	if res.Error != "" {
		return "", "", fmt.Errorf("oauth refresh error: %s - %s", res.Error, res.ErrorDesc)
	}

	if res.AccessToken == "" {
		return "", "", errors.New("no access_token in refresh response")
	}

	returnedRefresh := res.RefreshToken
	if returnedRefresh == "" {
		returnedRefresh = refreshToken
	}

	return res.AccessToken, returnedRefresh, nil
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

var (
	adminStatusCache sync.Map // map[string]bool (lowercased username -> bool)
)

// IsCachedAdmin returns true if the user is verified as an admin in memory cache.
func IsCachedAdmin(username string) (bool, bool) {
	clean := strings.ToLower(strings.TrimSpace(username))
	if clean == "" {
		return false, false
	}
	val, ok := adminStatusCache.Load(clean)
	if !ok {
		return false, false
	}
	return val.(bool), true
}

// SetCachedAdmin stores admin verification status for a username.
func SetCachedAdmin(username string, isAdmin bool) {
	clean := strings.ToLower(strings.TrimSpace(username))
	if clean != "" {
		adminStatusCache.Store(clean, isAdmin)
	}
}

// GetAllCachedAdmins returns a map of all usernames verified as admin in cache.
func GetAllCachedAdmins() map[string]bool {
	out := make(map[string]bool)
	adminStatusCache.Range(func(key, value any) bool {
		if k, ok := key.(string); ok {
			if v, ok := value.(bool); ok && v {
				out[k] = true
			}
		}
		return true
	})
	return out
}

// CheckIsAdminOnAnyWiki checks MediaWiki CentralAuth to verify if a user has sysop or higher rights on ANY Wikimedia wiki.
func CheckIsAdminOnAnyWiki(username string) (bool, error) {
	cleanName := strings.TrimSpace(username)
	if cleanName == "" {
		return false, nil
	}

	lower := strings.ToLower(cleanName)
	if val, ok := adminStatusCache.Load(lower); ok {
		return val.(bool), nil
	}

	elevatedGroups := map[string]bool{
		"sysop":                   true,
		"administrator":           true,
		"bureaucrat":              true,
		"bureaucrats":             true,
		"steward":                 true,
		"stewards":                true,
		"global-sysop":            true,
		"interface-admin":         true,
		"checkuser":               true,
		"suppress":                true,
		"oversight":               true,
		"global-interface-editor": true,
		"ombuds":                  true,
		"staff":                   true,
		"sysadmin":                true,
	}

	// 1. Primary check: Meta-Wiki CentralAuth globaluserinfo
	apiEndpoint := "https://meta.wikimedia.org/w/api.php"
	params := url.Values{}
	params.Set("action", "query")
	params.Set("meta", "globaluserinfo")
	params.Set("guiuser", cleanName)
	params.Set("guiprop", "groups|merged")
	params.Set("format", "json")
	params.Set("formatversion", "2")

	req, err := http.NewRequest("GET", fmt.Sprintf("%s?%s", apiEndpoint, params.Encode()), nil)
	if err == nil {
		req.Header.Set("User-Agent", DefaultUserAgent)
		resp, reqErr := httpClient.Do(req)
		if reqErr == nil && resp.StatusCode == http.StatusOK {
			var result struct {
				Query struct {
					GlobalUserInfo struct {
						ID     int64    `json:"id"`
						Name   string   `json:"name"`
						Groups []string `json:"groups"`
						Merged []struct {
							Wiki   string   `json:"wiki"`
							Groups []string `json:"groups"`
						} `json:"merged"`
					} `json:"globaluserinfo"`
				} `json:"query"`
			}
			if decodeErr := json.NewDecoder(resp.Body).Decode(&result); decodeErr == nil {
				resp.Body.Close()

				// Check global rights
				for _, g := range result.Query.GlobalUserInfo.Groups {
					if elevatedGroups[strings.ToLower(strings.TrimSpace(g))] {
						adminStatusCache.Store(lower, true)
						return true, nil
					}
				}

				// Check local rights across ANY merged wiki
				for _, m := range result.Query.GlobalUserInfo.Merged {
					for _, g := range m.Groups {
						if elevatedGroups[strings.ToLower(strings.TrimSpace(g))] {
							adminStatusCache.Store(lower, true)
							return true, nil
						}
					}
				}
			} else {
				resp.Body.Close()
			}
		} else if resp != nil {
			resp.Body.Close()
		}
	}

	// 2. Secondary check: Direct local check on bnwiki (or metawiki) in case CentralAuth cache is lagging
	bnAPI := "https://bn.wikipedia.org/w/api.php"
	bnParams := url.Values{}
	bnParams.Set("action", "query")
	bnParams.Set("list", "users")
	bnParams.Set("ususers", cleanName)
	bnParams.Set("usprop", "groups")
	bnParams.Set("format", "json")
	bnParams.Set("formatversion", "2")

	bnReq, bnErr := http.NewRequest("GET", fmt.Sprintf("%s?%s", bnAPI, bnParams.Encode()), nil)
	if bnErr == nil {
		bnReq.Header.Set("User-Agent", DefaultUserAgent)
		bnResp, bnDoErr := httpClient.Do(bnReq)
		if bnDoErr == nil && bnResp.StatusCode == http.StatusOK {
			var bnRes struct {
				Query struct {
					Users []struct {
						Name   string   `json:"name"`
						Groups []string `json:"groups"`
					} `json:"users"`
				} `json:"query"`
			}
			if bnDecodeErr := json.NewDecoder(bnResp.Body).Decode(&bnRes); bnDecodeErr == nil {
				bnResp.Body.Close()
				for _, u := range bnRes.Query.Users {
					for _, g := range u.Groups {
						if elevatedGroups[strings.ToLower(strings.TrimSpace(g))] {
							adminStatusCache.Store(lower, true)
							return true, nil
						}
					}
				}
			} else {
				bnResp.Body.Close()
			}
		} else if bnResp != nil {
			bnResp.Body.Close()
		}
	}

	adminStatusCache.Store(lower, false)
	return false, nil
}

// -------------------------------------------------------------
// Real MediaWiki Article Query & Verification (Concurrent Pool)
// -------------------------------------------------------------

type mwQueryResponse struct {
	Query struct {
		Pages []struct {
			PageID    int            `json:"pageid"`
			Title     string         `json:"title"`
			Missing   bool           `json:"missing"`
			Redirect  any            `json:"redirect"`
			Length    int            `json:"length"`
			Touched   string         `json:"touched"`
			PageProps map[string]any `json:"pageprops"`
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

// isRedirectField checks whether a MediaWiki API "redirect" field represents a true redirect.
// MediaWiki returns bool true in formatversion=2, but can return empty string "" in formatversion=1.
func isRedirectField(val any) bool {
	if val == nil {
		return false
	}
	switch v := val.(type) {
	case bool:
		return v
	case string:
		return v != "false" && v != "0"
	default:
		return true
	}
}

// isDisambigData inspects article title, MediaWiki pageprops, and Wikidata items to detect disambiguation pages.
func isDisambigData(title string, pageProps map[string]any) bool {
	if IsDisambigTitle(title) {
		return true
	}
	if pageProps != nil {
		if _, ok := pageProps["disambiguation"]; ok {
			return true
		}
		if _, ok := pageProps["disambig"]; ok {
			return true
		}
		if item, ok := pageProps["wikibase_item"].(string); ok {
			switch strings.ToUpper(strings.TrimSpace(item)) {
			case "Q4167410", "Q22808320", "Q21128613", "Q17379835":
				return true
			}
		}
		if desc, ok := pageProps["wikibase-shortdesc"].(string); ok {
			descLower := strings.ToLower(desc)
			if strings.Contains(descLower, "disambiguation") ||
				strings.Contains(descLower, "দ্ব্যর্থতা") ||
				strings.Contains(descLower, "topics referred to by the same term") {
				return true
			}
		}
	}
	return false
}

// FetchPageInfo queries a single page's initial creation revision and cleans wikitext.
func FetchPageInfo(wikiURL string, title string) (*PageInfo, error) {
	apiEndpoint := strings.TrimRight(wikiURL, "/") + "/w/api.php"
	params := url.Values{}
	params.Set("action", "query")
	params.Set("prop", "info|revisions|pageprops")
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
	isRedirect := isRedirectField(page.Redirect)
	isDisambig := isDisambigData(page.Title, page.PageProps)

	if len(page.Revisions) > 0 {
		rev := page.Revisions[0]
		creator = rev.User
		creationTime, _ = time.Parse(time.RFC3339, rev.Timestamp)
		rawText := rev.Slots.Main.Content
		wordCount = wikitext.CountWords(rawText)
		refCount = wikitext.CountRefs(rawText)

		trimmed := strings.TrimSpace(rawText)
		trimmedLower := strings.ToLower(trimmed)
		if strings.HasPrefix(trimmedLower, "#redirect") ||
			strings.HasPrefix(trimmed, "#পুনর্নির্দেশ") ||
			strings.HasPrefix(trimmed, "#পুনঃনির্দেশ") ||
			strings.HasPrefix(trimmed, "#পুনর্নিদের্শ") {
			isRedirect = true
		}
		if strings.Contains(trimmedLower, "{{disambig") ||
			strings.Contains(trimmedLower, "{{দ্ব্যর্থতা নিরসন") ||
			strings.Contains(trimmedLower, "{{দ্ব্যর্থতা") {
			isDisambig = true
		}
	}

	return &PageInfo{
		Title:        page.Title,
		Exists:       true,
		IsRedirect:   isRedirect,
		IsDisambig:   isDisambig,
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

// FetchRenderedContent retrieves both real HTML parsing and raw wikitext from MediaWiki action=parse
func FetchRenderedContent(wikiURL string, title string) (html string, wikitext string, err error) {
	apiEndpoint := strings.TrimRight(wikiURL, "/") + "/w/api.php"
	params := url.Values{}
	params.Set("action", "parse")
	params.Set("page", title)
	params.Set("prop", "text|wikitext")
	params.Set("disableeditsection", "1")
	params.Set("format", "json")
	params.Set("formatversion", "2")

	req, err := http.NewRequest("GET", fmt.Sprintf("%s?%s", apiEndpoint, params.Encode()), nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("parse request failed: %w", err)
	}
	defer resp.Body.Close()

	var res struct {
		Parse struct {
			Title    string `json:"title"`
			Text     string `json:"text"`
			Wikitext string `json:"wikitext"`
		} `json:"parse"`
		Error struct {
			Code string `json:"code"`
			Info string `json:"info"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", "", fmt.Errorf("failed to decode parse response: %w", err)
	}

	if res.Error.Code != "" {
		return "", "", fmt.Errorf("mediawiki parse error: %s", res.Error.Info)
	}

	return res.Parse.Text, res.Parse.Wikitext, nil
}

// FetchRenderedHTML retrieves real HTML parsing from MediaWiki action=parse
func FetchRenderedHTML(wikiURL string, title string) (string, error) {
	html, _, err := FetchRenderedContent(wikiURL, title)
	return html, err
}

type UserCreation struct {
	Title     string `json:"title"`
	CreatedAt string `json:"created_at"`
}

// FetchUserCreatedArticles queries MediaWiki list=usercontribs to list all articles created by the user within the date range.
// It automatically follows continuation tokens (uccontinue) to fetch all creations without a 500-article ceiling.
func FetchUserCreatedArticles(wikiURL, username, startTS, endTS string) ([]UserCreation, error) {
	apiEndpoint := strings.TrimRight(wikiURL, "/") + "/w/api.php"
	var out []UserCreation
	seen := make(map[string]bool)
	uccontinue := ""
	const maxPages = 100 // up to 50,000 creations

	for page := 0; page < maxPages; page++ {
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
		if uccontinue != "" {
			params.Set("uccontinue", uccontinue)
			params.Set("continue", "-||")
		}

		req, err := http.NewRequest("GET", fmt.Sprintf("%s?%s", apiEndpoint, params.Encode()), nil)
		if err != nil {
			if len(out) > 0 {
				return out, nil
			}
			return nil, err
		}
		req.Header.Set("User-Agent", DefaultUserAgent)

		resp, err := httpClient.Do(req)
		if err != nil {
			if len(out) > 0 {
				log.Printf("[FetchUserCreatedArticles] page %d failed for %s: %v; returning %d articles fetched so far", page, username, err, len(out))
				return out, nil
			}
			return nil, fmt.Errorf("usercontribs request failed: %w", err)
		}

		var res struct {
			Continue struct {
				Uccontinue string `json:"uccontinue"`
				Continue   string `json:"continue"`
			} `json:"continue"`
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

		decodeErr := json.NewDecoder(resp.Body).Decode(&res)
		resp.Body.Close()
		if decodeErr != nil {
			if len(out) > 0 {
				return out, nil
			}
			return nil, fmt.Errorf("failed to decode usercontribs response: %w", decodeErr)
		}

		if res.Error.Code != "" {
			if len(out) > 0 {
				return out, nil
			}
			return nil, fmt.Errorf("mediawiki usercontribs error: %s", res.Error.Info)
		}

		for _, c := range res.Query.Usercontribs {
			if !seen[c.Title] && !IsDisambigTitle(c.Title) {
				seen[c.Title] = true
				out = append(out, UserCreation{
					Title:     c.Title,
					CreatedAt: c.Timestamp,
				})
			}
		}

		if res.Continue.Uccontinue == "" {
			break
		}
		uccontinue = res.Continue.Uccontinue
	}

	if out == nil {
		out = []UserCreation{}
	}

	// Filter out disambiguation pages, redirects, and missing/deleted pages
	if len(out) > 0 {
		filtered, err := FilterDisambigsAndRedirects(wikiURL, out)
		if err != nil {
			log.Printf("[FetchUserCreatedArticles] FilterDisambigsAndRedirects error: %v", err)
			var safeOut []UserCreation
			for _, item := range out {
				if !IsDisambigTitle(item.Title) {
					safeOut = append(safeOut, item)
				}
			}
			out = safeOut
		} else {
			out = filtered
		}
	}

	return out, nil
}

// IsDisambigTitle checks common disambiguation title patterns across Wikimedia languages
func IsDisambigTitle(title string) bool {
	tLower := strings.ToLower(strings.TrimSpace(title))
	if tLower == "" {
		return false
	}
	disambigPatterns := []string{
		"(disambiguation)",
		"(disambig)",
		"(dab)",
		"(দ্ব্যর্থতা নিরসন)",
		"(দ্ব্যর্থতা প্রকাশ)",
		"(দ্ব্যর্থতা)",
		"(দ্ব্যর্থ নিরসন)",
		"(দ্ব্যর্থতা নিরসন পাতা)",
		"(দ্ব্যর্থতা দূরীকরণ)",
		"(দ্ব্যর্থতা দুরীকরণ)",
		"(দ্ব্যর্থবোধক)",
		"(অর্থভেদ)",
		"(শব্দার্থ)",
		"(দ্ব্যৰ্থতা দূৰীকৰণ)",
		"(দ্ব্যৰ্থতা স্পষ্টকৰণ)",
		"(বহুৱিকল্পী)",
		"(বহুবিকল্প)",
		"(बहुविकल्पी)",
		"(बहुविकल्पी शब्द)",
		"(स्पष्टता)",
		"(توضيح)",
		"(ابهام‌زدایی)",
		"(ابهام زدایی)",
		"(توضیح)",
		"(homonymie)",
		"(begriffsklärung)",
		"(desambiguación)",
		"(desambiguacion)",
		"(desambiguação)",
		"(desambiguacao)",
		"(disambigua)",
		"(значения)",
		"(значення)",
		"(একটি দ্ব্যর্থতা নিরসন পাতা)",
		"(ujednoznacznienie)",
		"(doorverwijspagina)",
		"(täsmennyssivu)",
		"(fleirtyding)",
		"(pekerside)",
		"(rozcestník)",
		"(egyértelműsítő lap)",
		"(消歧义)",
		"(消歧義)",
		"(曖昧さ回避)",
		"(동음이의)",
	}
	for _, p := range disambigPatterns {
		if strings.Contains(tLower, p) {
			return true
		}
	}
	return false
}

// FilterDisambigsAndRedirects queries MediaWiki in chunks of 50 using POST to strip redirects, disambiguation pages, and deleted entries.
func FilterDisambigsAndRedirects(wikiURL string, creations []UserCreation) ([]UserCreation, error) {
	if len(creations) == 0 {
		return []UserCreation{}, nil
	}

	apiEndpoint := strings.TrimRight(wikiURL, "/") + "/w/api.php"
	var filtered []UserCreation
	chunkSize := 50

	for i := 0; i < len(creations); i += chunkSize {
		end := i + chunkSize
		if end > len(creations) {
			end = len(creations)
		}
		chunk := creations[i:end]

		titleList := make([]string, len(chunk))
		for j, c := range chunk {
			titleList[j] = c.Title
		}

		params := url.Values{}
		params.Set("action", "query")
		params.Set("prop", "info|pageprops")
		params.Set("format", "json")
		params.Set("formatversion", "2")
		params.Set("titles", strings.Join(titleList, "|"))

		// Use HTTP POST with retry to prevent URL length overflow with large multilingual title batches
		var res struct {
			Query struct {
				Normalized []struct {
					From string `json:"from"`
					To   string `json:"to"`
				} `json:"normalized"`
				Redirects []struct {
					From string `json:"from"`
					To   string `json:"to"`
				} `json:"redirects"`
				Pages []struct {
					Title     string         `json:"title"`
					Missing   bool           `json:"missing"`
					Redirect  any            `json:"redirect"`
					PageProps map[string]any `json:"pageprops"`
				} `json:"pages"`
			} `json:"query"`
		}

		var querySuccess bool
		var lastErr error
		for attempt := 0; attempt < 3; attempt++ {
			if attempt > 0 {
				time.Sleep(300 * time.Millisecond)
			}

			req, err := http.NewRequest("POST", apiEndpoint, strings.NewReader(params.Encode()))
			if err != nil {
				lastErr = err
				continue
			}
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			req.Header.Set("User-Agent", DefaultUserAgent)

			resp, err := httpClient.Do(req)
			if err != nil {
				lastErr = err
				log.Printf("[FilterDisambigsAndRedirects] request attempt %d failed: %v", attempt+1, err)
				continue
			}

			if resp.StatusCode != http.StatusOK {
				resp.Body.Close()
				lastErr = fmt.Errorf("HTTP %d", resp.StatusCode)
				log.Printf("[FilterDisambigsAndRedirects] attempt %d returned HTTP %d", attempt+1, resp.StatusCode)
				continue
			}

			decodeErr := json.NewDecoder(resp.Body).Decode(&res)
			resp.Body.Close()
			if decodeErr != nil {
				lastErr = decodeErr
				log.Printf("[FilterDisambigsAndRedirects] JSON decode error on attempt %d: %v", attempt+1, decodeErr)
				continue
			}

			querySuccess = true
			break
		}

		if !querySuccess {
			return nil, fmt.Errorf("mediaWiki query failed: %w", lastErr)
		}

		invalidSet := make(map[string]bool)
		addInvalid := func(t string) {
			clean := strings.ToLower(strings.TrimSpace(t))
			if clean != "" {
				invalidSet[clean] = true
				invalidSet[strings.ReplaceAll(clean, " ", "_")] = true
				invalidSet[strings.ReplaceAll(clean, "_", " ")] = true
			}
		}

		for _, p := range res.Query.Pages {
			isRedirect := isRedirectField(p.Redirect)
			isDisambig := isDisambigData(p.Title, p.PageProps)
			if p.Missing || isRedirect || isDisambig {
				addInvalid(p.Title)
			}
		}

		for _, red := range res.Query.Redirects {
			addInvalid(red.From)
		}

		for _, norm := range res.Query.Normalized {
			normTo := strings.ToLower(strings.TrimSpace(norm.To))
			if invalidSet[normTo] || invalidSet[strings.ReplaceAll(normTo, " ", "_")] || invalidSet[strings.ReplaceAll(normTo, "_", " ")] {
				addInvalid(norm.From)
			}
		}

		for _, c := range chunk {
			cClean := strings.ToLower(strings.TrimSpace(c.Title))
			isInvalid := invalidSet[cClean] ||
				invalidSet[strings.ReplaceAll(cClean, " ", "_")] ||
				invalidSet[strings.ReplaceAll(cClean, "_", " ")] ||
				IsDisambigTitle(c.Title)

			if !isInvalid {
				filtered = append(filtered, c)
			}
		}
	}

	if filtered == nil {
		filtered = []UserCreation{}
	}
	return filtered, nil
}

// FetchUserSuggestions queries MediaWiki action=query&list=allusers for username autocomplete.
func FetchUserSuggestions(wikiURL, prefix string) ([]string, error) {
	if strings.TrimSpace(wikiURL) == "" {
		wikiURL = "https://meta.wikimedia.org"
	}
	apiURL := fmt.Sprintf("%s/w/api.php?action=query&list=allusers&auprefix=%s&aulimit=10&format=json",
		strings.TrimRight(wikiURL, "/"),
		url.QueryEscape(prefix),
	)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", DefaultUserAgent)

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("mediawiki api error: %d", resp.StatusCode)
	}

	var res struct {
		Query struct {
			AllUsers []struct {
				Name string `json:"name"`
			} `json:"allusers"`
		} `json:"query"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	var users []string
	for _, u := range res.Query.AllUsers {
		users = append(users, u.Name)
	}
	if users == nil {
		users = []string{}
	}
	return users, nil
}

// FetchCSRFToken queries MediaWiki action=query&meta=tokens&type=csrf to obtain an edit token.
func FetchCSRFToken(wikiURL, oauthToken string) (string, error) {
	if strings.TrimSpace(wikiURL) == "" {
		wikiURL = "https://bn.wikipedia.org"
	}
	apiURL := fmt.Sprintf("%s/w/api.php?action=query&meta=tokens&type=csrf&format=json", strings.TrimRight(wikiURL, "/"))
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", DefaultUserAgent)
	if oauthToken != "" {
		req.Header.Set("Authorization", "Bearer "+oauthToken)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("csrf token request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return "", errors.New("wikimedia oauth token expired or invalid (HTTP 401)")
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("mediawiki csrf endpoint HTTP %d: %s", resp.StatusCode, string(body))
	}

	var res struct {
		Query struct {
			Tokens struct {
				CsrfToken string `json:"csrftoken"`
			} `json:"tokens"`
		} `json:"query"`
		Error struct {
			Code string `json:"code"`
			Info string `json:"info"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", fmt.Errorf("failed to decode csrf response: %w", err)
	}
	if res.Error.Code != "" {
		return "", fmt.Errorf("mediawiki csrf error: %s", res.Error.Info)
	}
	if res.Query.Tokens.CsrfToken == "" {
		return "", errors.New("empty csrf token returned from mediawiki")
	}

	return res.Query.Tokens.CsrfToken, nil
}

// FetchPageWikitext retrieves existing wikitext and page existence status.
func FetchPageWikitext(wikiURL, title, oauthToken string) (string, bool, error) {
	if strings.TrimSpace(wikiURL) == "" {
		wikiURL = "https://bn.wikipedia.org"
	}
	apiURL := fmt.Sprintf("%s/w/api.php?action=query&prop=revisions&titles=%s&rvprop=content&rvslots=main&format=json&formatversion=2",
		strings.TrimRight(wikiURL, "/"),
		url.QueryEscape(title),
	)

	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return "", false, err
	}
	req.Header.Set("User-Agent", DefaultUserAgent)
	if oauthToken != "" {
		req.Header.Set("Authorization", "Bearer "+oauthToken)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", false, err
	}
	defer resp.Body.Close()

	var res struct {
		Query struct {
			Pages []struct {
				PageID    int    `json:"pageid"`
				Missing   bool   `json:"missing"`
				Revisions []struct {
					Slots struct {
						Main struct {
							Content string `json:"content"`
						} `json:"main"`
					} `json:"slots"`
				} `json:"revisions"`
			} `json:"pages"`
		} `json:"query"`
		Error struct {
			Code string `json:"code"`
			Info string `json:"info"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", false, err
	}
	if res.Error.Code != "" {
		return "", false, fmt.Errorf("mediawiki error: %s", res.Error.Info)
	}

	if len(res.Query.Pages) == 0 || res.Query.Pages[0].Missing {
		return "", false, nil
	}

	page := res.Query.Pages[0]
	if len(page.Revisions) > 0 {
		return page.Revisions[0].Slots.Main.Content, true, nil
	}
	return "", true, nil
}

// PrependTemplatesToTalkPage prepends the given templates to the talk page, skipping any already present.
func PrependTemplatesToTalkPage(wikiURL, talkTitle, templatesBlock, summary, oauthToken string) error {
	existingWikitext, _, err := FetchPageWikitext(wikiURL, talkTitle, oauthToken)
	if err != nil {
		return fmt.Errorf("failed checking talk page: %w", err)
	}

	// Parse individual template names from block to check for duplicates
	var linesToAdd []string
	for _, line := range strings.Split(templatesBlock, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		// Extract core template name: e.g. "{{Wiki Loves Earth}}" -> "Wiki Loves Earth", or "{{WLE|2026}}" -> "WLE"
		coreName := strings.Trim(trimmed, "{}")
		coreName = strings.TrimSpace(coreName)
		templateName := coreName
		if pipeIdx := strings.Index(templateName, "|"); pipeIdx != -1 {
			templateName = strings.TrimSpace(templateName[:pipeIdx])
		}
		if templateName != "" && !strings.Contains(strings.ToLower(existingWikitext), strings.ToLower(templateName)) {
			linesToAdd = append(linesToAdd, trimmed)
		}
	}

	if len(linesToAdd) == 0 {
		// All templates already exist on the talk page
		return nil
	}

	csrfToken, err := FetchCSRFToken(wikiURL, oauthToken)
	if err != nil {
		return fmt.Errorf("failed fetching edit token: %w", err)
	}

	newContent := strings.Join(linesToAdd, "\n") + "\n\n" + existingWikitext

	apiURL := fmt.Sprintf("%s/w/api.php", strings.TrimRight(wikiURL, "/"))
	form := url.Values{}
	form.Set("action", "edit")
	form.Set("title", talkTitle)
	form.Set("text", strings.TrimSpace(newContent))
	form.Set("summary", summary)
	form.Set("token", csrfToken)
	form.Set("bot", "1")
	form.Set("format", "json")
	form.Set("formatversion", "2")

	req, err := http.NewRequest("POST", apiURL, strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", DefaultUserAgent)
	if oauthToken != "" {
		req.Header.Set("Authorization", "Bearer "+oauthToken)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("edit request failed: %w", err)
	}
	defer resp.Body.Close()

	var editRes struct {
		Edit struct {
			Result   string `json:"result"`
			PageID   int    `json:"pageid"`
			Title    string `json:"title"`
			OldRevID int    `json:"oldrevid"`
			NewRevID int    `json:"newrevid"`
		} `json:"edit"`
		Error struct {
			Code string `json:"code"`
			Info string `json:"info"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&editRes); err != nil {
		return fmt.Errorf("failed to decode edit response: %w", err)
	}
	if editRes.Error.Code != "" {
		return fmt.Errorf("mediawiki edit error: %s (%s)", editRes.Error.Info, editRes.Error.Code)
	}
	if editRes.Edit.Result != "Success" {
		return fmt.Errorf("mediawiki edit failed with result: %s", editRes.Edit.Result)
	}

	return nil
}

