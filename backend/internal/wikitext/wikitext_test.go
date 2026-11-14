package wikitext

import (
	"strings"
	"testing"
)

func TestWikitextCleaningAndCounting(t *testing.T) {
	article := `<!-- a comment with [[File:x.jpg]] and <ref>fake</ref> -->
'''Dhaka''' is the [[capital|capital city]] of [[Bangladesh]].<ref name=a>Book, 2020</ref>
[[File:Dhaka.jpg|thumb|A view of the city]]
[[চিত্র:Local.jpg|thumb|স্থানীয় দৃশ্য]]
{{Infobox place|name=Dhaka|country=Bangladesh|1=ignored}}
== History ==
* It grew quickly.<ref>Another source</ref>
<math>x = y + 1</math>
It has many people.<ref name=a />
`

	cleaned := CleanWikitext(article)

	// Content survives
	if !strings.Contains(cleaned, "Dhaka") || !strings.Contains(cleaned, "capital city") {
		t.Fatalf("Prose words missing from cleaned text: %s", cleaned)
	}
	if !strings.Contains(cleaned, "It grew quickly") || !strings.Contains(cleaned, "many people") {
		t.Fatalf("Prose sentences missing from cleaned text: %s", cleaned)
	}

	// Templates and parameters are stripped
	if strings.Contains(cleaned, "Infobox") || strings.Contains(cleaned, "country") {
		t.Fatalf("Template metadata leaked into prose: %s", cleaned)
	}

	// Markup stripped
	if strings.Contains(cleaned, "fake") || strings.Contains(cleaned, "x = y + 1") {
		t.Fatalf("Comment or math leaked: %s", cleaned)
	}

	// Reference counting
	if refs := CountRefs(article); refs != 4 {
		t.Fatalf("Expected 4 refs, got %d", refs)
	}
	if refs := CountRefs(cleaned); refs != 0 {
		t.Fatalf("Cleaned wikitext should have 0 refs, got %d", refs)
	}

	// Multi-script counting
	if w := CountWords("hello world"); w != 2 {
		t.Fatalf("Expected 2 words for 'hello world', got %d", w)
	}
	if w := CountWords("ঢাকা বাংলাদেশের রাজধানী"); w != 3 {
		t.Fatalf("Expected 3 words for Bengali sentence, got %d", w)
	}
	if w := CountWords("مرحبا بالعالم"); w != 2 {
		t.Fatalf("Expected 2 words for Arabic sentence, got %d", w)
	}
	if w := CountWords("ঢাকা is Bangladesh"); w != 3 {
		t.Fatalf("Expected 3 words for mixed script, got %d", w)
	}
	// Bengali danda punctuation
	if w := CountWords("ঢাকা।বাংলাদেশ"); w != 2 {
		t.Fatalf("Expected 2 words separated by danda, got %d", w)
	}

	// Balanced scanner handles nesting
	if w := CountWords("{{Infobox|name=Dhaka|country=Bangladesh}}"); w != 0 {
		t.Fatalf("Expected 0 words for Infobox, got %d", w)
	}
	if w := CountWords("{{a|{{b|deep value}}|x=y}}"); w != 0 {
		t.Fatalf("Expected 0 words for nested template, got %d", w)
	}

	// Wikitable scaffolding stripping
	table := `{| class="wikitable" style="text-align:center"
|+ Districts of the city
|-
! scope="col" | Name !! scope="col" | People
|-
| rowspan="2" | Old town || 40000
|-
| style="background:#EAECF0" | New town || 51000
|}`
	cleanedTable := CleanWikitext(table)
	for _, leaked := range []string{"wikitable", "class", "style", "scope", "rowspan", "text-align", "EAECF0"} {
		if strings.Contains(cleanedTable, leaked) {
			t.Fatalf("Table attribute leaked into prose: %s in %s", leaked, cleanedTable)
		}
	}
	for _, kept := range []string{"Districts of the city", "Old town", "New town", "People"} {
		if !strings.Contains(cleanedTable, kept) {
			t.Fatalf("Table prose missing: %s in %s", kept, cleanedTable)
		}
	}

	// Scriptio continua
	if !IsScriptioContinua("東京は日本の首都です。東京は日本の首都です。", 0.2) {
		t.Fatalf("Expected Japanese text to be scriptio continua")
	}
	if IsScriptioContinua("Dhaka is the capital of Bangladesh.", 0.2) {
		t.Fatalf("Expected English text not to be scriptio continua")
	}
}
