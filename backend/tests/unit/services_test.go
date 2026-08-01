package services_test

import (
	"testing"

	"github.com/lasanga890/segment-train-booking/internal/services"
)

// TestOverlaps verifies the core segment overlap algorithm.
// This is the most critical piece of business logic in the entire system.
//
// Rule: [s1, e1) and [s2, e2) overlap iff max(s1,s2) < min(e1,e2)
func TestOverlaps(t *testing.T) {
	tests := []struct {
		name     string
		s1, e1   int
		s2, e2   int
		expected bool
	}{
		// ── Non-overlapping cases (should be allowed — same seat, different legs) ──
		{
			name:     "adjacent legs — Colombo→Kandy then Kandy→Badulla (should NOT overlap)",
			s1: 0, e1: 9, s2: 9, e2: 25,
			expected: false,
		},
		{
			name:     "non-adjacent legs — no overlap at all",
			s1: 0, e1: 5, s2: 10, e2: 20,
			expected: false,
		},
		{
			name:     "reverse order non-adjacent",
			s1: 10, e1: 20, s2: 0, e2: 5,
			expected: false,
		},
		{
			name:     "three-way split: first leg",
			s1: 0, e1: 5, s2: 15, e2: 25,
			expected: false,
		},
		{
			name:     "exact boundary — end of one equals start of other",
			s1: 5, e1: 10, s2: 10, e2: 15,
			expected: false,
		},

		// ── Overlapping cases (should be REJECTED — 409 Conflict) ──────────────
		{
			name:     "full overlap — identical legs",
			s1: 0, e1: 25, s2: 0, e2: 25,
			expected: true,
		},
		{
			name:     "one leg contains the other",
			s1: 0, e1: 25, s2: 5, e2: 15,
			expected: true,
		},
		{
			name:     "partial overlap — second starts inside first",
			s1: 0, e1: 10, s2: 5, e2: 20,
			expected: true,
		},
		{
			name:     "partial overlap — reversed",
			s1: 5, e1: 20, s2: 0, e2: 10,
			expected: true,
		},
		{
			name:     "single station overlap",
			s1: 0, e1: 6, s2: 5, e2: 10,
			expected: true,
		},
		{
			name:     "Colombo→Badulla blocks any partial booking",
			s1: 0, e1: 25, s2: 3, e2: 9,
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := services.Overlaps(tt.s1, tt.e1, tt.s2, tt.e2)
			if result != tt.expected {
				t.Errorf(
					"Overlaps(%d,%d, %d,%d) = %v; want %v",
					tt.s1, tt.e1, tt.s2, tt.e2, result, tt.expected,
				)
			}
		})
	}
}

// TestFareCalculation verifies the fare engine with configurable rates.
func TestFareCalculation(t *testing.T) {
	svc := services.NewFareService(45.00, 1.8, 1.0)

	tests := []struct {
		name         string
		startSeq     int
		endSeq       int
		coachType    string
		expectedFare float64
	}{
		{
			name:         "Colombo Fort → Kandy (9 stations, Reserved)",
			startSeq:     0, endSeq: 9,
			coachType:    "RESERVED",
			expectedFare: 9 * 45.00 * 1.8, // 729.00
		},
		{
			name:         "Kandy → Badulla (16 stations, Reserved)",
			startSeq:     9, endSeq: 25,
			coachType:    "RESERVED",
			expectedFare: 16 * 45.00 * 1.8, // 1296.00
		},
		{
			name:         "Full journey Colombo → Badulla (25 stations, Reserved)",
			startSeq:     0, endSeq: 25,
			coachType:    "RESERVED",
			expectedFare: 25 * 45.00 * 1.8, // 2025.00
		},
		{
			name:         "Partial journey in Unreserved coach",
			startSeq:     3, endSeq: 9,
			coachType:    "UNRESERVED",
			expectedFare: 6 * 45.00 * 1.0, // 270.00
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			from := services.CoachTypeFromString(tt.coachType)
			breakdown := svc.Calculate(tt.startSeq, tt.endSeq, from)
			if breakdown.TotalFareLKR != tt.expectedFare {
				t.Errorf("Expected fare %.2f, got %.2f", tt.expectedFare, breakdown.TotalFareLKR)
			}
		})
	}
}
