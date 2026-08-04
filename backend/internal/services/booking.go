package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/lasanga890/segment-train-booking/internal/models"
)

// ErrSeatNotAvailable is returned when a booking conflicts with an existing one.
var ErrSeatNotAvailable = errors.New("seat is not available for the requested segment")

// ErrHoldNotFound is returned when a hold ID is invalid or expired.
var ErrHoldNotFound = errors.New("hold not found or expired")

// ErrScheduleUnavailable prevents bookings for cancelled schedules or seats that
// do not belong to the train running that scheduled service.
var ErrScheduleUnavailable = errors.New("schedule is unavailable for booking")

// BookingService manages the full lifecycle of a booking.
type BookingService struct {
	db          *pgxpool.Pool
	rdb         *redis.Client
	fareService *FareService
	holdTTL     time.Duration
}

func NewBookingService(db *pgxpool.Pool, rdb *redis.Client, fareService *FareService, holdTTLMinutes int) *BookingService {
	return &BookingService{
		db:          db,
		rdb:         rdb,
		fareService: fareService,
		holdTTL:     time.Duration(holdTTLMinutes) * time.Minute,
	}
}

// ─── Hold ────────────────────────────────────────────────────────────────────

// HoldRequest is the input for placing a temporary seat hold.
type HoldRequest struct {
	ScheduleID uuid.UUID
	SeatID     uuid.UUID
	FromSeq    int
	ToSeq      int
}

// HoldResult is returned after successfully placing a hold.
type HoldResult struct {
	HoldID    string
	ExpiresAt time.Time
	Fare      models.FareBreakdown
}

// HoldSeat places a 5-minute Redis lock on a seat for a given leg.
// This is optimistic — the final CONFIRM step performs transactional DB locking.
// If the hold key already exists (another user is checking out), returns ErrSeatNotAvailable.
func (s *BookingService) HoldSeat(ctx context.Context, req HoldRequest) (*HoldResult, error) {
	if err := s.validateActiveScheduleSeat(ctx, req.ScheduleID, req.SeatID); err != nil {
		return nil, err
	}
	// First verify no confirmed booking already overlaps (fast read check)
	occupied, err := s.isOccupied(ctx, req.ScheduleID, req.SeatID, req.FromSeq, req.ToSeq)
	if err != nil {
		return nil, fmt.Errorf("availability check failed: %w", err)
	}
	if occupied {
		return nil, ErrSeatNotAvailable
	}

	// Fetch coach type for fare calculation
	coachType, err := s.getCoachTypeForSeat(ctx, req.SeatID)
	if err != nil {
		return nil, fmt.Errorf("failed to get coach type: %w", err)
	}

	// Place Redis hold — SET NX ensures only one hold per seat+segment at a time
	holdID := uuid.New().String()
	holdKey := fmt.Sprintf("hold:sched:%s:seat:%s:seg:%d_%d", req.ScheduleID, req.SeatID, req.FromSeq, req.ToSeq)
	holdValue := holdID

	set, err := s.rdb.SetNX(ctx, holdKey, holdValue, s.holdTTL).Result()
	if err != nil {
		return nil, fmt.Errorf("redis hold failed: %w", err)
	}
	if !set {
		// Another user already holds this seat+segment
		return nil, ErrSeatNotAvailable
	}

	// Store hold metadata for confirmation step
	metaKey := fmt.Sprintf("hold:meta:%s", holdID)
	s.rdb.HSet(ctx, metaKey,
		"schedule_id", req.ScheduleID.String(),
		"seat_id", req.SeatID.String(),
		"from_seq", req.FromSeq,
		"to_seq", req.ToSeq,
		"hold_key", holdKey,
	)
	s.rdb.Expire(ctx, metaKey, s.holdTTL)

	fare := s.fareService.Calculate(req.FromSeq, req.ToSeq, coachType)
	expiresAt := time.Now().Add(s.holdTTL)

	return &HoldResult{
		HoldID:    holdID,
		ExpiresAt: expiresAt,
		Fare:      fare,
	}, nil
}

// ─── Confirm ─────────────────────────────────────────────────────────────────

// ConfirmRequest is the input for confirming a held booking.
type ConfirmRequest struct {
	HoldID         string
	PassengerName  string
	PassengerEmail string
	StartStationID uuid.UUID
	EndStationID   uuid.UUID
}

// ConfirmBooking converts a Redis hold into a confirmed PostgreSQL booking.
//
// Concurrency strategy (two-tier):
//  1. Redis hold (optimistic): prevents UI contention — checked in HoldSeat
//  2. PostgreSQL SELECT ... FOR UPDATE (pessimistic): serializes concurrent
//     transactions on the same seat row, then re-checks overlap before INSERT.
//     This is the final guarantee — even if Redis fails, the DB will catch conflicts.
func (s *BookingService) ConfirmBooking(ctx context.Context, req ConfirmRequest) (*models.Booking, error) {
	// 1. Retrieve hold metadata from Redis
	metaKey := fmt.Sprintf("hold:meta:%s", req.HoldID)
	meta, err := s.rdb.HGetAll(ctx, metaKey).Result()
	if err != nil || len(meta) == 0 {
		return nil, ErrHoldNotFound
	}

	scheduleID, _ := uuid.Parse(meta["schedule_id"])
	seatID, _ := uuid.Parse(meta["seat_id"])
	var fromSeq, toSeq int
	fmt.Sscan(meta["from_seq"], &fromSeq)
	fmt.Sscan(meta["to_seq"], &toSeq)
	holdKey := meta["hold_key"]

	// 2. Begin PostgreSQL transaction
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	var scheduleSeatValid bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM schedules sch
			JOIN seats s ON s.id = $2
			JOIN coaches c ON c.id = s.coach_id AND c.train_id = sch.train_id
			WHERE sch.id = $1 AND sch.is_active = true
		)
	`, scheduleID, seatID).Scan(&scheduleSeatValid); err != nil {
		return nil, fmt.Errorf("schedule validation failed: %w", err)
	}
	if !scheduleSeatValid {
		return nil, ErrScheduleUnavailable
	}

	// 3. Lock the seat row — blocks any other concurrent goroutine/request
	//    trying to book this same seat until our transaction completes.
	var seatExists bool
	err = tx.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM seats WHERE id = $1) FROM seats WHERE id = $1 FOR UPDATE`,
		seatID,
	).Scan(&seatExists)
	// Simpler form:
	_, err = tx.Exec(ctx, `SELECT id FROM seats WHERE id = $1 FOR UPDATE`, seatID)
	if err != nil {
		return nil, fmt.Errorf("seat lock failed: %w", err)
	}

	// 4. Re-check overlap INSIDE the transaction (definitive check)
	var conflictCount int
	err = tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM bookings
		WHERE seat_id   = $1
		  AND schedule_id = $2
		  AND status    IN ('CONFIRMED', 'HOLD')
		  AND GREATEST(start_seq, $3) < LEAST(end_seq, $4)
	`, seatID, scheduleID, fromSeq, toSeq).Scan(&conflictCount)
	if err != nil {
		return nil, fmt.Errorf("overlap check failed: %w", err)
	}
	if conflictCount > 0 {
		return nil, ErrSeatNotAvailable
	}

	// 5. Fetch coach type for fare
	coachType, err := s.getCoachTypeForSeatTx(ctx, tx, seatID)
	if err != nil {
		return nil, fmt.Errorf("coach type fetch failed: %w", err)
	}

	fare := s.fareService.Calculate(fromSeq, toSeq, coachType)

	// 6. Insert confirmed booking
	booking := &models.Booking{
		ID:             uuid.New(),
		PassengerName:  req.PassengerName,
		PassengerEmail: req.PassengerEmail,
		SeatID:         seatID,
		ScheduleID:     scheduleID,
		StartStationID: req.StartStationID,
		EndStationID:   req.EndStationID,
		StartSeq:       fromSeq,
		EndSeq:         toSeq,
		FareLKR:        fare.TotalFareLKR,
		Status:         models.BookingStatusConfirmed,
	}

	err = tx.QueryRow(ctx, `
		INSERT INTO bookings
			(id, passenger_name, passenger_email, seat_id, schedule_id,
			 start_station_id, end_station_id, start_seq, end_seq,
			 fare_lkr, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'CONFIRMED')
		RETURNING created_at
	`,
		booking.ID, booking.PassengerName, booking.PassengerEmail, booking.SeatID, booking.ScheduleID,
		booking.StartStationID, booking.EndStationID,
		booking.StartSeq, booking.EndSeq, booking.FareLKR,
	).Scan(&booking.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert booking failed: %w", err)
	}

	// 7. Commit
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit failed: %w", err)
	}

	// 8. Clean up Redis hold (best-effort — TTL will expire it anyway)
	s.rdb.Del(ctx, holdKey, metaKey)

	return booking, nil
}

// ─── Release Hold ─────────────────────────────────────────────────────────────

// ReleaseHold deletes a Redis hold when the user cancels checkout.
func (s *BookingService) ReleaseHold(ctx context.Context, holdID string) error {
	metaKey := fmt.Sprintf("hold:meta:%s", holdID)
	meta, err := s.rdb.HGetAll(ctx, metaKey).Result()
	if err != nil || len(meta) == 0 {
		return ErrHoldNotFound
	}

	s.rdb.Del(ctx, meta["hold_key"], metaKey)
	return nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func (s *BookingService) isOccupied(ctx context.Context, scheduleID, seatID uuid.UUID, fromSeq, toSeq int) (bool, error) {
	var count int
	err := s.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM bookings
		WHERE seat_id = $1
		  AND schedule_id = $2
		  AND status IN ('CONFIRMED', 'HOLD')
		  AND GREATEST(start_seq, $3) < LEAST(end_seq, $4)
	`, seatID, scheduleID, fromSeq, toSeq).Scan(&count)
	return count > 0, err
}

func (s *BookingService) validateActiveScheduleSeat(ctx context.Context, scheduleID, seatID uuid.UUID) error {
	var valid bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM schedules sch
			JOIN seats s ON s.id = $2
			JOIN coaches c ON c.id = s.coach_id AND c.train_id = sch.train_id
			WHERE sch.id = $1 AND sch.is_active = true
			  AND (sch.departure_date + sch.departure_time::time) > (NOW() + INTERVAL '1 hour')
		)
	`, scheduleID, seatID).Scan(&valid)
	if err != nil {
		return fmt.Errorf("schedule validation failed: %w", err)
	}
	if !valid {
		return ErrScheduleUnavailable
	}
	return nil
}

func (s *BookingService) getCoachTypeForSeat(ctx context.Context, seatID uuid.UUID) (models.CoachType, error) {
	var ct models.CoachType
	err := s.db.QueryRow(ctx, `
		SELECT c.coach_type FROM seats s
		JOIN coaches c ON c.id = s.coach_id
		WHERE s.id = $1
	`, seatID).Scan(&ct)
	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("seat %s not found", seatID)
	}
	return ct, err
}

func (s *BookingService) getCoachTypeForSeatTx(ctx context.Context, tx pgx.Tx, seatID uuid.UUID) (models.CoachType, error) {
	var ct models.CoachType
	err := tx.QueryRow(ctx, `
		SELECT c.coach_type FROM seats s
		JOIN coaches c ON c.id = s.coach_id
		WHERE s.id = $1
	`, seatID).Scan(&ct)
	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("seat %s not found", seatID)
	}
	return ct, err
}
