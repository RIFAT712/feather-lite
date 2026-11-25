package handlers

import (
	"testing"
	"time"
)

func TestParseFlexibleDate(t *testing.T) {
	defaultTime := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name        string
		dateStr     string
		tz          string
		expectedUTC time.Time
	}{
		{
			name:        "Empty string returns defaultTime in UTC",
			dateStr:     "",
			tz:          "UTC",
			expectedUTC: defaultTime,
		},
		{
			name:        "UTC timezone 2026-12-01T00:00",
			dateStr:     "2026-12-01T00:00",
			tz:          "UTC",
			expectedUTC: time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			name:        "UTC timezone 2026-12-31T23:59",
			dateStr:     "2026-12-31T23:59",
			tz:          "UTC",
			expectedUTC: time.Date(2026, 12, 31, 23, 59, 0, 0, time.UTC),
		},
		{
			name:        "Asia/Dhaka timezone (UTC+6) 2026-12-01T00:00 becomes 2026-11-30 18:00 UTC",
			dateStr:     "2026-12-01T00:00",
			tz:          "Asia/Dhaka",
			expectedUTC: time.Date(2026, 11, 30, 18, 0, 0, 0, time.UTC),
		},
		{
			name:        "Asia/Dhaka timezone (UTC+6) 2026-12-31T23:59 becomes 2026-12-31 17:59 UTC",
			dateStr:     "2026-12-31T23:59",
			tz:          "Asia/Dhaka",
			expectedUTC: time.Date(2026, 12, 31, 17, 59, 0, 0, time.UTC),
		},
		{
			name:        "America/New_York (EST, UTC-5) 2026-12-01T00:00 becomes 2026-12-01 05:00 UTC",
			dateStr:     "2026-12-01T00:00",
			tz:          "America/New_York",
			expectedUTC: time.Date(2026, 12, 1, 5, 0, 0, 0, time.UTC),
		},
		{
			name:        "RFC3339 string with Z offset",
			dateStr:     "2026-12-01T00:00:00Z",
			tz:          "Asia/Dhaka", // Offset in string overrides tz
			expectedUTC: time.Date(2026, 12, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseFlexibleDate(tt.dateStr, tt.tz, defaultTime)
			if !got.Equal(tt.expectedUTC) {
				t.Errorf("parseFlexibleDate(%q, %q) = %v (loc %v); want %v",
					tt.dateStr, tt.tz, got, got.Location(), tt.expectedUTC)
			}
		})
	}
}
