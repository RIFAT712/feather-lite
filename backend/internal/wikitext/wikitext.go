package wikitext

import (
	"regexp"
	"strings"
	"unicode"
)

var (
	reComments           = regexp.MustCompile(`(?s)<!--.*?-->`)
	reMath               = regexp.MustCompile(`(?is)<math.*?>.*?</math>`)
	reRefPaired          = regexp.MustCompile(`(?is)<ref.*?>.*?</ref>`)
	reRefSelf            = regexp.MustCompile(`(?i)<ref.*?/?>`)
	reNamespacedLinkLine = regexp.MustCompile(`(?m)^[ \t]*\[\[[^\[\]|\n]+:[^\[\]\n]*\]\][ \t]*$`)
	reMediaLinks         = regexp.MustCompile(`(?is)\[\[[^\[\]|\n]*?:[^\[\]|\n]*?\.(?:jpe?g|png|gif|svg|webp|tiff?|bmp|xcf|ogg|oga|ogv|mp3|mp4|wav|flac|webm|pdf|djvu).*?\]\]`)
	reOpaqueBlocks       = regexp.MustCompile(`(?is)<(gallery|timeline|syntaxhighlight|source|score|graph|mapframe|maplink|imagemap)\b[^>]*>.*?</(gallery|timeline|syntaxhighlight|source|score|graph|mapframe|maplink|imagemap)>`)
	reTableOpen          = regexp.MustCompile(`(?m)^\s*\{\|.*$`)
	reTableRow           = regexp.MustCompile(`(?m)^\s*\|-.*$`)
	reTableClose         = regexp.MustCompile(`(?m)^\s*\|\}.*$`)
	reCellAttrs          = regexp.MustCompile(`(?m)^([!|]{1,2})[^|\n]*?=[^|\n]*?\|([^|\n]|$)`)
	reInlineCellAttrs    = regexp.MustCompile(`(?:\|\||!!)[^|\n]*?=[^|\n]*?\|([^|\n]|$)`)
	reURL                = regexp.MustCompile(`(?i)(?:https?:)?//\S+|\bwww\.[^\s|\]]+`)
	reHTMLTag            = regexp.MustCompile(`<[^>]+>`)
	reHeading            = regexp.MustCompile(`(?m)^==+.*==+$`)
	reListMarker         = regexp.MustCompile(`(?m)^[;:*#]+`)
	rePunctuation        = regexp.MustCompile(`[।॥\.,\?\!\(\)\[\]\{\}:;=\-_\|"«»“”‘’…、。！？，]`)
	reRefTag             = regexp.MustCompile(`(?i)<ref[\s/>]`)
)

// StripTemplates removes every {{...}} call, contents and all, nesting included,
// using a balanced scanner to avoid regex backtracking or swallowing broken markup.
func StripTemplates(text string) string {
	if text == "" {
		return ""
	}

	type span struct {
		start int
		end   int
	}

	var spans []span
	depth := 0
	start := 0
	i := 0
	length := len(text)

	for i < length-1 {
		pair := text[i : i+2]
		if pair == "{{" {
			if depth == 0 {
				start = i
			}
			depth++
			i += 2
			continue
		}
		if pair == "}}" && depth > 0 {
			depth--
			i += 2
			if depth == 0 {
				spans = append(spans, span{start: start, end: i})
			}
			continue
		}
		i++
	}

	if len(spans) == 0 {
		return text
	}

	var sb strings.Builder
	cursor := 0
	for _, s := range spans {
		sb.WriteString(text[cursor:s.start])
		sb.WriteString(" ") // Space prevents adjacent words from merging
		cursor = s.end
	}
	sb.WriteString(text[cursor:])
	return sb.String()
}

// CleanWikitext cleans raw wikitext into plain prose suitable for accurate word counting.
func CleanWikitext(raw string) string {
	if raw == "" {
		return ""
	}

	text := reComments.ReplaceAllString(raw, "")
	text = reMath.ReplaceAllString(text, " ")
	text = reRefPaired.ReplaceAllString(text, " ")
	text = reRefSelf.ReplaceAllString(text, " ")
	text = reOpaqueBlocks.ReplaceAllString(text, " ")
	text = reNamespacedLinkLine.ReplaceAllString(text, "")
	text = reMediaLinks.ReplaceAllString(text, "")
	text = StripTemplates(text)

	// Tables after templates
	text = reTableOpen.ReplaceAllString(text, " ")
	text = reTableRow.ReplaceAllString(text, " ")
	text = reTableClose.ReplaceAllString(text, " ")
	text = reCellAttrs.ReplaceAllString(text, " $2")
	text = reInlineCellAttrs.ReplaceAllString(text, " $1")
	text = reURL.ReplaceAllString(text, " ")
	text = reHTMLTag.ReplaceAllString(text, " ")

	text = strings.ReplaceAll(text, "'''", "")
	text = strings.ReplaceAll(text, "''", "")

	text = reHeading.ReplaceAllString(text, "")
	text = reListMarker.ReplaceAllString(text, "")

	// Link syntax: pipes become spaces so [[Target|Label]] contributes "Label"
	text = rePunctuation.ReplaceAllString(text, " ")

	return text
}

// HasWordToken checks whether a token contains at least one letter or digit
func HasWordToken(token string) bool {
	for _, r := range token {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return true
		}
	}
	return false
}

// CountWords cleans raw wikitext and counts valid prose words (whitespace-delimited).
func CountWords(raw string) int {
	cleaned := CleanWikitext(raw)
	tokens := strings.Fields(cleaned)
	words := 0
	for _, t := range tokens {
		if HasWordToken(t) {
			words++
		}
	}
	return words
}

// CountPlaintextWords counts words in text that MediaWiki has already rendered (action=parse / extracts).
func CountPlaintextWords(text string) int {
	if text == "" {
		return 0
	}
	tokens := strings.Fields(text)
	words := 0
	for _, t := range tokens {
		if HasWordToken(t) {
			words++
		}
	}
	return words
}

// CountRefs counts the number of references (<ref> tags) in raw wikitext.
func CountRefs(raw string) int {
	if raw == "" {
		return 0
	}
	matches := reRefTag.FindAllStringIndex(raw, -1)
	return len(matches)
}

// IsScriptioContinua returns true if text is primarily composed of scripts without spaces (CJK, Thai, Lao, Khmer).
func IsScriptioContinua(text string, threshold float64) bool {
	if text == "" {
		return false
	}
	if threshold <= 0 {
		threshold = 0.2
	}

	sample := text
	if len(sample) > 4000 {
		sample = sample[:4000]
	}

	letters := 0
	continua := 0

	for _, r := range sample {
		if unicode.IsLetter(r) {
			letters++
			// CJK + Kana
			if (r >= 0x3040 && r <= 0x30FF) || (r >= 0x3400 && r <= 0x4DBF) || (r >= 0x4E00 && r <= 0x9FFF) || (r >= 0xF900 && r <= 0xFAFF) ||
				// Thai
				(r >= 0x0E00 && r <= 0x0E7F) ||
				// Lao
				(r >= 0x0E80 && r <= 0x0EFF) ||
				// Khmer
				(r >= 0x1780 && r <= 0x17FF) {
				continua++
			}
		}
	}

	if letters == 0 {
		return false
	}

	return float64(continua)/float64(letters) >= threshold
}
