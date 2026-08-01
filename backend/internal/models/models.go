package models

import (
	"time"

	"github.com/google/uuid"
)

// CoachType distinguishes reserved (assigned seat) from unreserved (standing/open) coaches.
type CoachType string

const (
	CoachTypeReserved   CoachType = "RESERVED"
	CoachTypeUnreserved CoachType = "UNRESERVED"
)

// BookingStatus represents the lifecycle state of a booking.
type BookingStatus string

const (
	BookingStatusHold      BookingStatus = "HOLD"
	BookingStatusConfirmed BookingStatus = "CONFIRMED"
	BookingStatusCancelled BookingStatus = "CANCELLED"
)

// Station represents a stop on the Colombo Fort–Badulla line.
// sequence_order is the key field: 0 = Colombo Fort, N = Badulla.
// All segment overlap logic operates on these integer indices.
type Station struct {
	ID            uuid.UUID `json:"id" db:"id"`
	Name          string    `json:"name" db:"name"`
	Code          string    `json:"code" db:"code"`
	SequenceOrder int       `json:"sequence_order" db:"sequence_order"`
	DistanceKM    float64   `json:"distance_km" db:"distance_km"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

// Coach represents a physical rail carriage in the train.
// Coach 1-3: RESERVED | Coach 4-8: UNRESERVED (configurable)
type Coach struct {
	ID          uuid.UUID `json:"id" db:"id"`
	CoachNumber int       `json:"coach_number" db:"coach_number"`
	CoachType   CoachType `json:"coach_type" db:"coach_type"`
	CoachClass  string    `json:"coach_class" db:"coach_class"`
	TotalSeats  int       `json:"total_seats" db:"total_seats"`
	Label       string    `json:"label" db:"label"`
}

// Seat is a physical seat within a coach.
type Seat struct {
	ID         uuid.UUID `json:"id" db:"id"`
	CoachID    uuid.UUID `json:"coach_id" db:"coach_id"`
	SeatNumber int       `json:"seat_number" db:"seat_number"`

	// Joined fields (populated in availability queries)
	CoachNumber int       `json:"coach_number,omitempty" db:"coach_number"`
	CoachType   CoachType `json:"coach_type,omitempty" db:"coach_type"`
}

type Train struct {
	ID          uuid.UUID `json:"id" db:"id"`
	TrainNumber string    `json:"train_number" db:"train_number"`
	Name        string    `json:"name" db:"name"`
	Direction   string    `json:"direction" db:"direction"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type Schedule struct {
	ID            uuid.UUID `json:"id" db:"id"`
	TrainID       uuid.UUID `json:"train_id" db:"train_id"`
	DepartureDate time.Time `json:"departure_date" db:"departure_date"`
	DepartureTime time.Time `json:"departure_time" db:"departure_time"` // stored as time, mapped as string in JSON possibly
	IsActive      bool      `json:"is_active" db:"is_active"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`

	// Joined
	TrainName   string `json:"train_name,omitempty" db:"train_name"`
	TrainNumber string `json:"train_number,omitempty" db:"train_number"`
	Direction   string `json:"direction,omitempty" db:"direction"`
}

// Booking is a confirmed or held reservation for a specific seat on a specific leg.
// start_seq and end_seq are the station sequence indices forming the interval [start_seq, end_seq).
// The segment overlap condition: GREATEST(b1.start_seq, b2.start_seq) < LEAST(b1.end_seq, b2.end_seq)
type Booking struct {
	ID               uuid.UUID     `json:"id" db:"id"`
	ScheduleID       uuid.UUID     `json:"schedule_id" db:"schedule_id"`
	PassengerName    string        `json:"passenger_name" db:"passenger_name"`
	PassengerEmail   string        `json:"passenger_email" db:"passenger_email"`
	SeatID           uuid.UUID     `json:"seat_id" db:"seat_id"`
	StartStationID   uuid.UUID     `json:"start_station_id" db:"start_station_id"`
	EndStationID     uuid.UUID     `json:"end_station_id" db:"end_station_id"`
	StartSeq         int           `json:"start_seq" db:"start_seq"`
	EndSeq           int           `json:"end_seq" db:"end_seq"`
	FareLKR          float64       `json:"fare_lkr" db:"fare_lkr"`
	Status           BookingStatus `json:"status" db:"status"`
	HoldExpiresAt    *time.Time    `json:"hold_expires_at,omitempty" db:"hold_expires_at"`
	CreatedAt        time.Time     `json:"created_at" db:"created_at"`

	// Joined fields for API responses
	StartStationName string `json:"start_station_name,omitempty" db:"start_station_name"`
	EndStationName   string `json:"end_station_name,omitempty" db:"end_station_name"`
	CoachNumber      int    `json:"coach_number,omitempty" db:"coach_number"`
	SeatNumber       int    `json:"seat_number,omitempty" db:"seat_number"`
}

// SeatAvailability is the response model for seat map queries.
// Status reflects availability for the queried leg only.
type SeatAvailability struct {
	SeatID      uuid.UUID `json:"seat_id"`
	CoachNumber int       `json:"coach_number"`
	CoachType   CoachType `json:"coach_type"`
	CoachClass  string    `json:"coach_class"`
	SeatNumber  int       `json:"seat_number"`
	// available: seat is free for the entire queried leg
	// partial:   seat has bookings on other legs but is free for queried leg
	// occupied:  seat is booked for an overlapping leg
	Status      string    `json:"status"`
}

// FareBreakdown is returned alongside booking confirmation for transparency.
type FareBreakdown struct {
	StartStationName  string  `json:"start_station_name"`
	EndStationName    string  `json:"end_station_name"`
	StationsTraversed int     `json:"stations_traversed"`
	DistanceKM        float64 `json:"distance_km"`
	CoachType         string  `json:"coach_type"`
	BaseRate          float64 `json:"base_rate_lkr"`
	Multiplier        float64 `json:"multiplier"`
	TotalFareLKR      float64 `json:"total_fare_lkr"`
}
