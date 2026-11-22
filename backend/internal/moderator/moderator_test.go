package moderator

import (
	"testing"
)

func TestCheckText(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		wantHarm   bool
		minSeverity int
	}{
		{
			name:       "Clean greeting",
			input:      "Hello everyone! Best of luck in the contest.",
			wantHarm:   false,
			minSeverity: SeverityNone,
		},
		{
			name:       "Clean Bengali discussion",
			input:      "উইকিপিডিয়া প্রতিযোগিতার নিবন্ধটি কি পর্যালোচনার জন্য প্রস্তুত?",
			wantHarm:   false,
			minSeverity: SeverityNone,
		},
		{
			name:       "English curse word",
			input:      "what the fuck is this",
			wantHarm:   true,
			minSeverity: SeverityLow,
		},
		{
			name:       "English obfuscated curse",
			input:      "f*ck this stupid thing",
			wantHarm:   true,
			minSeverity: SeverityLow,
		},
		{
			name:       "Bengali slur",
			input:      "তুই একটা হারামি মানুষ",
			wantHarm:   true,
			minSeverity: SeverityMedium,
		},
		{
			name:       "Severe threat",
			input:      "I will kill you if you reject my article",
			wantHarm:   true,
			minSeverity: SeverityHigh,
		},
		{
			name:       "Phishing link",
			input:      "Get free nitro here: http://discord-nitro-gift.com/claim",
			wantHarm:   true,
			minSeverity: SeverityMedium,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := CheckText(tt.input)
			if res.IsHarmful != tt.wantHarm {
				t.Errorf("CheckText(%q) isHarmful = %v, want %v (reason: %s)", tt.input, res.IsHarmful, tt.wantHarm, res.Reason)
			}
			if tt.wantHarm && res.Severity < tt.minSeverity {
				t.Errorf("CheckText(%q) severity = %v, want >= %v", tt.input, res.Severity, tt.minSeverity)
			}
		})
	}
}
