package moderator

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	goaway "github.com/TwiN/go-away"
)

const (
	SeverityNone   = 0
	SeverityLow    = 1 // Mild profanity, spam -> Warning
	SeverityMedium = 2 // Harassment, explicit NSFW, slurs -> 1-hour timeout
	SeverityHigh   = 3 // Severe hate speech, threats, doxxing -> 24h timeout or ban
)

type ModerationResult struct {
	IsHarmful bool   `json:"is_harmful"`
	Severity  int    `json:"severity"`
	Category  string `json:"category"`
	Reason    string `json:"reason"`
}

var (
	once      sync.Once
	profanity *goaway.ProfanityDetector

	// Doxxing patterns (phone numbers, email leaks)
	phoneRegex = regexp.MustCompile(`(?i)(?:\+?8801|01)[3-9]\d{8}|\+?[1-9]\d{1,14}`)
	emailRegex = regexp.MustCompile(`(?i)[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`)

	// Phishing / malicious shortlink patterns
	phishingRegex = regexp.MustCompile(`(?i)https?://(?:bit\.ly|tinyurl\.com|t\.co|grabify\.link|iplogger|free-vbucks|free-nitro|discord-nitro)[^\s]*`)

	// Bengali & regional abusive slurs (native script and romanized Banglish)
	bengaliMediumSlurs = []string{
		"খানকি", "বেশ্যা", "মাদারচোদ", "ভোদাই", "চোদা", "চুদি", "চুদা",
		"বোকাচোদা", "হারামি", "শুয়োরের বাচ্চা", "কুত্তার বাচ্চা", "জারজ",
		"khanki", "madarchod", "bhodai", "choda", "chudi", "bokachoda",
		"harami", "shuyorer baccha", "kuttar baccha", "balchal",
	}

	bengaliHighThreats = []string{
		"মেরে ফেলব", "খুন করব", "গলা কাটব", "বোমা মারব", "ধর্ষণ করব",
		"mere felbo", "khun korbo", "gola katbo", "dhorshon korbo",
		"kill you", "die in a fire", "hang yourself", "commit suicide",
	}
)

func initDetector() {
	profanity = goaway.NewProfanityDetector()
}

// CheckText evaluates a chat message for NSFW, harassment, threats, and harmful content.
func CheckText(text string) ModerationResult {
	once.Do(initDetector)

	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return ModerationResult{IsHarmful: false, Severity: SeverityNone}
	}

	lower := strings.ToLower(trimmed)

	// 1. Check for severe threats of violence or self-harm (High Severity)
	for _, threat := range bengaliHighThreats {
		if strings.Contains(lower, threat) {
			return ModerationResult{
				IsHarmful: true,
				Severity:  SeverityHigh,
				Category:  "threat",
				Reason:    "Threat of violence, harassment or self-harm detected",
			}
		}
	}

	// 2. Check for doxxing (phone numbers or emails)
	if emailRegex.MatchString(trimmed) || phishingRegex.MatchString(trimmed) {
		return ModerationResult{
			IsHarmful: true,
			Severity:  SeverityMedium,
			Category:  "doxxing_phishing",
			Reason:    "Doxxing, personal email address or suspicious link detected",
		}
	}

	// 3. Check for regional explicit slurs (Medium Severity)
	for _, slur := range bengaliMediumSlurs {
		if strings.Contains(lower, slur) {
			return ModerationResult{
				IsHarmful: true,
				Severity:  SeverityMedium,
				Category:  "hate_speech",
				Reason:    "Offensive harassment or vulgar slurs detected",
			}
		}
	}

	// 4. Check using go-away (English leetspeak, obfuscation, curses)
	if profanity.IsProfane(trimmed) || profanity.IsProfane(normalizeObfuscation(trimmed)) {
		return ModerationResult{
			IsHarmful: true,
			Severity:  SeverityLow,
			Category:  "profanity",
			Reason:    "Inappropriate or profane language detected",
		}
	}

	// 5. Optional AI Moderation (if MODERATION_API_KEY is configured in env)
	if apiKey := os.Getenv("MODERATION_API_KEY"); apiKey != "" && len(trimmed) > 10 {
		if aiResult := checkWithOpenAIModeration(apiKey, trimmed); aiResult.IsHarmful {
			return aiResult
		}
	}

	return ModerationResult{IsHarmful: false, Severity: SeverityNone}
}

// checkWithOpenAIModeration calls OpenAI's free/low-cost Moderation API if an API key is provided.
func checkWithOpenAIModeration(apiKey, text string) ModerationResult {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	payload, _ := json.Marshal(map[string]interface{}{
		"input": text,
	})

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/moderations", bytes.NewBuffer(payload))
	if err != nil {
		return ModerationResult{IsHarmful: false}
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		return ModerationResult{IsHarmful: false}
	}
	defer resp.Body.Close()

	var apiResp struct {
		Results []struct {
			Flagged    bool               `json:"flagged"`
			Categories map[string]bool    `json:"categories"`
			CategoryScores map[string]float64 `json:"category_scores"`
		} `json:"results"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil || len(apiResp.Results) == 0 {
		return ModerationResult{IsHarmful: false}
	}

	first := apiResp.Results[0]
	if first.Flagged {
		sev := SeverityMedium
		cat := "inappropriate"
		if first.Categories["hate"] || first.Categories["violence"] || first.Categories["self-harm"] {
			sev = SeverityHigh
			cat = "severe_harm"
		}
		return ModerationResult{
			IsHarmful: true,
			Severity:  sev,
			Category:  cat,
			Reason:    "Content flagged by automated AI moderation guardrail",
		}
	}

	return ModerationResult{IsHarmful: false}
}

func normalizeObfuscation(s string) string {
	replacer := strings.NewReplacer(
		"*", "u",
		"@", "a",
		"$", "s",
		"0", "o",
		"1", "i",
		"3", "e",
		"!", "i",
		"5", "s",
		"7", "t",
	)
	return replacer.Replace(s)
}
