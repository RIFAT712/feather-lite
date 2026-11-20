package worker

import (
	"reflect"
	"testing"
)

func TestFormatTemplates(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "single bare template",
			input:    "talk page",
			expected: []string{"{{talk page}}"},
		},
		{
			name:     "single wrapped template",
			input:    "{{talk page}}",
			expected: []string{"{{talk page}}"},
		},
		{
			name:  "multiple newline-separated templates",
			input: "{{talk page}}\n{{wiki loves earth}}",
			expected: []string{
				"{{talk page}}",
				"{{wiki loves earth}}",
			},
		},
		{
			name:  "multiple bare newline-separated templates with whitespace",
			input: "  talk page  \n\n  wiki loves earth \n",
			expected: []string{
				"{{talk page}}",
				"{{wiki loves earth}}",
			},
		},
		{
			name:  "JSON array format",
			input: `["talk page", "{{wiki loves earth}}"]`,
			expected: []string{
				"{{talk page}}",
				"{{wiki loves earth}}",
			},
		},
		{
			name:     "empty string",
			input:    "",
			expected: nil,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := FormatTemplates(tc.input)
			if len(tc.expected) == 0 && len(result) == 0 {
				return
			}
			if !reflect.DeepEqual(result, tc.expected) {
				t.Errorf("FormatTemplates(%q) = %v, want %v", tc.input, result, tc.expected)
			}
		})
	}
}

func TestGetBackoffSeconds(t *testing.T) {
	tests := []struct {
		attempts int
		expected int
	}{
		{0, 15},
		{1, 15},
		{2, 45},
		{3, 120},
		{4, 300},
		{5, 600},
		{10, 900},
	}

	for _, tc := range tests {
		got := getBackoffSeconds(tc.attempts)
		if got != tc.expected {
			t.Errorf("getBackoffSeconds(%d) = %d, want %d", tc.attempts, got, tc.expected)
		}
	}
}

func TestSubstitutePlaceholders(t *testing.T) {
	templates := []string{
		"{{Talk page}}",
		"{{Wiki Loves Earth $YEAR|user=$USER|article=$TITLE}}",
		"{{$CONTEST|author=$SUBMITTER}}",
	}

	res := SubstitutePlaceholders(templates, "R1F4T", "Shundorbon", "WLE Contest", "2026")

	expected := []string{
		"{{Talk page}}",
		"{{Wiki Loves Earth 2026|user=R1F4T|article=Shundorbon}}",
		"{{WLE Contest|author=R1F4T}}",
	}

	for i := range expected {
		if res[i] != expected[i] {
			t.Errorf("res[%d] = %q, want %q", i, res[i], expected[i])
		}
	}
}

func TestGetTalkEditSummary(t *testing.T) {
	templates := []string{"{{আলাপ পাতা}}"}

	// Bengali by wikiLang
	bnSummary := GetTalkEditSummary("bn", "https://bn.wikipedia.org", templates)
	expectedBn := "[[:m:Feather|Feather]]-এর মাধ্যমে প্রতিযোগিতার টেমপ্লেট যুক্ত করা হচ্ছে: {{আলাপ পাতা}}"
	if bnSummary != expectedBn {
		t.Errorf("GetTalkEditSummary(bn) = %q, want %q", bnSummary, expectedBn)
	}

	// Bengali inferred by wikiURL
	bnInferred := GetTalkEditSummary("", "https://bn.wikipedia.org", templates)
	if bnInferred != expectedBn {
		t.Errorf("GetTalkEditSummary(inferred bn) = %q, want %q", bnInferred, expectedBn)
	}

	// English default
	enSummary := GetTalkEditSummary("en", "https://en.wikipedia.org", []string{"{{Talk page}}"})
	expectedEn := "Adding contest templates via [[:m:Feather|Feather]]: {{Talk page}}"
	if enSummary != expectedEn {
		t.Errorf("GetTalkEditSummary(en) = %q, want %q", enSummary, expectedEn)
	}
}
