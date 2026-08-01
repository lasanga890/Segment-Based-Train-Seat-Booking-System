package services

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lasanga890/segment-train-booking/internal/models"
)

// AvailabilityService queries which seats are available for a given leg [fromSeq, toSeq).
type AvailabilityService struct {
	db *pgxpool.Pool
}

func NewAvailabilityService(db *pgxpool.Pool) *AvailabilityService {
	return &AvailabilityService{db: db}
}

// GetAvailability returns all seats in RESERVED coaches with their status for the leg [fromSeq, toSeq).
//
// Status values:
//   - "available": no confirmed/held booking overlaps this leg at all
//   - "partial":   has bookings on other legs (seat not empty globally) but free for queried leg
//   - "occupied":  an active booking overlaps [fromSeq, toSeq) — cannot be booked
//
// The query uses a LEFT JOIN + CASE to determine overlap in a single DB round-trip.
// Index on (seat_id, start_seq, end_seq) WHERE status IN ('HOLD','CONFIRMED') makes this fast.
func (s *AvailabilityService) GetAvailability(ctx context.Context, fromSeq, toSeq int) ([]models.SeatAvailability, error) {
	if fromSeq >= toSeq {
		return nil, fmt.Errorf("fromSeq (%d) must be less than toSeq (%d)", fromSeq, toSeq)
	}

	query := `
		SELECT
			s.id           AS seat_id,
			c.coach_number,
			c.coach_type,
			s.seat_number,
			CASE
				-- Any confirmed or held booking that overlaps [fromSeq, toSeq)?
				WHEN EXISTS (
					SELECT 1 FROM bookings b
					WHERE b.seat_id = s.id
					  AND b.status IN ('CONFIRMED', 'HOLD')
					  AND GREATEST(b.start_seq, $1) < LEAST(b.end_seq, $2)
				) THEN 'occupied'
				-- Any booking at all (on a different, non-overlapping leg)?
				WHEN EXISTS (
					SELECT 1 FROM bookings b
					WHERE b.seat_id = s.id
					  AND b.status IN ('CONFIRMED', 'HOLD')
				) THEN 'partial'
				-- No bookings whatsoever
				ELSE 'available'
			END AS status
		FROM seats s
		JOIN coaches c ON c.id = s.coach_id
		WHERE c.coach_type = 'RESERVED'
		ORDER BY c.coach_number, s.seat_number
	`

	rows, err := s.db.Query(ctx, query, fromSeq, toSeq)
	if err != nil {
		return nil, fmt.Errorf("availability query failed: %w", err)
	}
	defer rows.Close()

	var results []models.SeatAvailability
	for rows.Next() {
		var sa models.SeatAvailability
		if err := rows.Scan(
			&sa.SeatID,
			&sa.CoachNumber,
			&sa.CoachType,
			&sa.SeatNumber,
			&sa.Status,
		); err != nil {
			return nil, fmt.Errorf("scan failed: %w", err)
		}
		results = append(results, sa)
	}

	return results, rows.Err()
}
