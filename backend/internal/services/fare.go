package services

import (
	"math"

	"github.com/lasanga890/segment-train-booking/internal/models"
)

// CoachTypeFromString converts a string to a CoachType (useful in tests).
func CoachTypeFromString(s string) models.CoachType {
	if s == "RESERVED" {
		return models.CoachTypeReserved
	}
	return models.CoachTypeUnreserved
}

// FareService calculates fares based on configurable rates.
// No business logic is hardcoded — all rates come from config/environment.
type FareService struct {
	BaseRatePerStation        float64
	ReservedCoachMultiplier   float64
	UnreservedCoachMultiplier float64
}

// NewFareService creates a FareService with the given rates.
func NewFareService(baseRate, reservedMult, unreservedMult float64) *FareService {
	return &FareService{
		BaseRatePerStation:        baseRate,
		ReservedCoachMultiplier:   reservedMult,
		UnreservedCoachMultiplier: unreservedMult,
	}
}

// Calculate computes the fare for a given leg and coach type.
//
// Formula:
//
//	stations_traversed = end_seq - start_seq
//	multiplier         = 1.8 (RESERVED) | 1.0 (UNRESERVED)
//	fare               = stations_traversed × base_rate_per_station × multiplier
//
// This design allows the department to adjust any variable without code changes.
func (f *FareService) Calculate(startSeq, endSeq int, coachType models.CoachType) models.FareBreakdown {
	stationsTraversed := endSeq - startSeq
	multiplier := f.multiplierFor(coachType)

	rawFare := float64(stationsTraversed) * f.BaseRatePerStation * multiplier

	// Round to 2 decimal places
	totalFare := math.Round(rawFare*100) / 100

	return models.FareBreakdown{
		StationsTraversed: stationsTraversed,
		CoachType:         string(coachType),
		BaseRate:          f.BaseRatePerStation,
		Multiplier:        multiplier,
		TotalFareLKR:      totalFare,
	}
}

// multiplierFor returns the fare multiplier for a coach type.
func (f *FareService) multiplierFor(ct models.CoachType) float64 {
	if ct == models.CoachTypeReserved {
		return f.ReservedCoachMultiplier
	}
	return f.UnreservedCoachMultiplier
}

// ─── Segment Overlap Logic ────────────────────────────────────────────────────

// Overlaps returns true if intervals [s1, e1) and [s2, e2) overlap.
// Two bookings on the same seat conflict if and only if:
//
//	max(s1, s2) < min(e1, e2)
//
// Adjacent legs like [0,5) and [5,10) do NOT overlap — they share the station
// boundary but not the seat occupancy, so both passengers can share the same seat.
func Overlaps(s1, e1, s2, e2 int) bool {
	maxStart := s1
	if s2 > maxStart {
		maxStart = s2
	}
	minEnd := e1
	if e2 < minEnd {
		minEnd = e2
	}
	return maxStart < minEnd
}
