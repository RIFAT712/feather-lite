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
