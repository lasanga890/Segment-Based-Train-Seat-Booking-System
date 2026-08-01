package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/lasanga890/segment-train-booking/internal/models"
	"github.com/lasanga890/segment-train-booking/internal/services"
)

// ─── Stations ─────────────────────────────────────────────────────────────────

// ListStations returns all stations in sequence order.
// GET /api/v1/stations
func (h *Handler) ListStations(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, name, code, sequence_order, distance_km, created_at
		FROM stations
		ORDER BY sequence_order ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch stations")
		return
	}
	defer rows.Close()

	type stationRow struct {
		ID            string  `json:"id"`
		Name          string  `json:"name"`
		Code          string  `json:"code"`
		SequenceOrder int     `json:"sequence_order"`
		DistanceKM    float64 `json:"distance_km"`
	}

	var stations []stationRow
	for rows.Next() {
		var s stationRow
		var createdAt interface{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Code, &s.SequenceOrder, &s.DistanceKM, &createdAt); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error")
			return
		}
		stations = append(stations, s)
	}
	if stations == nil {
		stations = []stationRow{}
	}
	writeJSON(w, http.StatusOK, stations)
}

// ─── Coaches ──────────────────────────────────────────────────────────────────

// ListCoaches returns all coaches with type and seat count.
// GET /api/v1/coaches
func (h *Handler) ListCoaches(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id, coach_number, coach_type, total_seats, label
		FROM coaches
		ORDER BY coach_number ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch coaches")
		return
	}
	defer rows.Close()

	type coachRow struct {
		ID          string `json:"id"`
		CoachNumber int    `json:"coach_number"`
		CoachType   string `json:"coach_type"`
		TotalSeats  int    `json:"total_seats"`
		Label       string `json:"label"`
	}

	var coaches []coachRow
	for rows.Next() {
		var c coachRow
		if err := rows.Scan(&c.ID, &c.CoachNumber, &c.CoachType, &c.TotalSeats, &c.Label); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error")
			return
		}
		coaches = append(coaches, c)
	}
	if coaches == nil {
		coaches = []coachRow{}
	}
	writeJSON(w, http.StatusOK, coaches)
}

// ─── Seat Availability ────────────────────────────────────────────────────────

// GetSeatAvailability returns all RESERVED seats with status for the requested leg.
// GET /api/v1/seats/availability?from=0&to=9
func (h *Handler) GetSeatAvailability(w http.ResponseWriter, r *http.Request) {
	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")
	if fromStr == "" || toStr == "" {
		writeError(w, http.StatusBadRequest, "Query params 'from' and 'to' are required (station sequence integers)")
		return
	}

	fromSeq, err1 := strconv.Atoi(fromStr)
	toSeq, err2 := strconv.Atoi(toStr)
	if err1 != nil || err2 != nil {
		writeError(w, http.StatusBadRequest, "'from' and 'to' must be integers")
		return
	}
	if fromSeq >= toSeq {
		writeError(w, http.StatusBadRequest, "'from' must be less than 'to'")
		return
	}

	svc := services.NewAvailabilityService(h.db)
	seats, err := svc.GetAvailability(r.Context(), fromSeq, toSeq)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch seat availability")
		return
	}
	if seats == nil {
		seats = []models.SeatAvailability{}
	}
	writeJSON(w, http.StatusOK, seats)
}

// ─── Bookings ────────────────────────────────────────────────────────────────

// HoldSeat places a temporary 5-minute hold on a seat for a leg.
// POST /api/v1/bookings/hold
func (h *Handler) HoldSeat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SeatID  string `json:"seat_id"`
		FromSeq int    `json:"from_seq"`
		ToSeq   int    `json:"to_seq"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	seatID, err := uuid.Parse(req.SeatID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid seat_id")
		return
	}

	bookingSvc := services.NewBookingService(h.db, h.rdb, h.newFareService(), h.cfg.SeatHoldDurationMinutes)
	result, err := bookingSvc.HoldSeat(r.Context(), services.HoldRequest{
		SeatID:  seatID,
		FromSeq: req.FromSeq,
		ToSeq:   req.ToSeq,
	})
	if err != nil {
		if err == services.ErrSeatNotAvailable {
			writeError(w, http.StatusConflict, "Seat is not available for the requested segment")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to hold seat")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"hold_id":    result.HoldID,
		"expires_at": result.ExpiresAt,
		"fare":       result.Fare,
	})
}

// ConfirmBooking converts a hold into a confirmed booking (with DB transaction locking).
// POST /api/v1/bookings/confirm
func (h *Handler) ConfirmBooking(w http.ResponseWriter, r *http.Request) {
	var req struct {
		HoldID         string `json:"hold_id"`
		PassengerName  string `json:"passenger_name"`
		PassengerEmail string `json:"passenger_email"`
		StartStationID string `json:"start_station_id"`
		EndStationID   string `json:"end_station_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.HoldID == "" || req.PassengerName == "" {
		writeError(w, http.StatusBadRequest, "hold_id and passenger_name are required")
		return
	}

	startID, err1 := uuid.Parse(req.StartStationID)
	endID, err2 := uuid.Parse(req.EndStationID)
	if err1 != nil || err2 != nil {
		writeError(w, http.StatusBadRequest, "Invalid station IDs")
		return
	}

	bookingSvc := services.NewBookingService(h.db, h.rdb, h.newFareService(), h.cfg.SeatHoldDurationMinutes)
	booking, err := bookingSvc.ConfirmBooking(r.Context(), services.ConfirmRequest{
		HoldID:         req.HoldID,
		PassengerName:  req.PassengerName,
		PassengerEmail: req.PassengerEmail,
		StartStationID: startID,
		EndStationID:   endID,
	})
	if err != nil {
		if err == services.ErrSeatNotAvailable {
			writeError(w, http.StatusConflict, "Seat was just taken — please select another seat")
			return
		}
		if err == services.ErrHoldNotFound {
			writeError(w, http.StatusGone, "Hold expired or not found — please start again")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to confirm booking")
		return
	}

	writeJSON(w, http.StatusCreated, booking)
}

// ReleaseHold cancels a hold when the user exits checkout.
// DELETE /api/v1/bookings/hold/{holdId}
func (h *Handler) ReleaseHold(w http.ResponseWriter, r *http.Request) {
	holdID := chi.URLParam(r, "holdId")
	bookingSvc := services.NewBookingService(h.db, h.rdb, h.newFareService(), h.cfg.SeatHoldDurationMinutes)
	if err := bookingSvc.ReleaseHold(r.Context(), holdID); err != nil {
		writeError(w, http.StatusNotFound, "Hold not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GetBooking returns a single booking by ID.
// GET /api/v1/bookings/{id}
func (h *Handler) GetBooking(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid booking ID")
		return
	}

	var booking struct {
		ID               string  `json:"id"`
		PassengerName    string  `json:"passenger_name"`
		PassengerEmail   string  `json:"passenger_email"`
		SeatID           string  `json:"seat_id"`
		StartStationName string  `json:"start_station_name"`
		EndStationName   string  `json:"end_station_name"`
		StartSeq         int     `json:"start_seq"`
		EndSeq           int     `json:"end_seq"`
		FareLKR          float64 `json:"fare_lkr"`
		Status           string  `json:"status"`
		CoachNumber      int     `json:"coach_number"`
		SeatNumber       int     `json:"seat_number"`
		CreatedAt        string  `json:"created_at"`
	}

	err = h.db.QueryRow(r.Context(), `
		SELECT
			b.id, b.passenger_name, b.passenger_email, b.seat_id,
			s_start.name, s_end.name,
			b.start_seq, b.end_seq, b.fare_lkr, b.status,
			c.coach_number, s.seat_number,
			b.created_at
		FROM bookings b
		JOIN stations s_start ON s_start.id = b.start_station_id
		JOIN stations s_end   ON s_end.id   = b.end_station_id
		JOIN seats s          ON s.id        = b.seat_id
		JOIN coaches c        ON c.id        = s.coach_id
		WHERE b.id = $1
	`, bookingID).Scan(
		&booking.ID, &booking.PassengerName, &booking.PassengerEmail, &booking.SeatID,
		&booking.StartStationName, &booking.EndStationName,
		&booking.StartSeq, &booking.EndSeq, &booking.FareLKR, &booking.Status,
		&booking.CoachNumber, &booking.SeatNumber, &booking.CreatedAt,
	)
	if err != nil {
		writeError(w, http.StatusNotFound, "Booking not found")
		return
	}

	writeJSON(w, http.StatusOK, booking)
}

// ─── Admin ────────────────────────────────────────────────────────────────────

// GetAdminMetrics returns revenue and occupancy analytics.
// GET /api/v1/admin/metrics
func (h *Handler) GetAdminMetrics(w http.ResponseWriter, r *http.Request) {
	type metrics struct {
		TotalBookings    int     `json:"total_bookings"`
		TotalRevenueLKR  float64 `json:"total_revenue_lkr"`
		OccupancyRate    float64 `json:"occupancy_rate"`
	}

	var m metrics
	h.db.QueryRow(r.Context(), `
		SELECT
			COUNT(*) FILTER (WHERE status = 'CONFIRMED'),
			COALESCE(SUM(fare_lkr) FILTER (WHERE status = 'CONFIRMED'), 0),
			ROUND(
				COUNT(*) FILTER (WHERE status = 'CONFIRMED') * 100.0 /
				NULLIF((SELECT COUNT(*) * 25 FROM seats s JOIN coaches c ON c.id = s.coach_id WHERE c.coach_type = 'RESERVED'), 0),
			2)
		FROM bookings
	`).Scan(&m.TotalBookings, &m.TotalRevenueLKR, &m.OccupancyRate)

	writeJSON(w, http.StatusOK, m)
}

// ListAllBookings returns all bookings for admin view.
// GET /api/v1/admin/bookings
func (h *Handler) ListAllBookings(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT
			b.id, b.passenger_name, b.passenger_email,
			s_start.name, s_end.name,
			b.start_seq, b.end_seq, b.fare_lkr, b.status,
			c.coach_number, s.seat_number, b.created_at
		FROM bookings b
		JOIN stations s_start ON s_start.id = b.start_station_id
		JOIN stations s_end   ON s_end.id   = b.end_station_id
		JOIN seats s          ON s.id        = b.seat_id
		JOIN coaches c        ON c.id        = s.coach_id
		ORDER BY b.created_at DESC
		LIMIT 500
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch bookings")
		return
	}
	defer rows.Close()

	type bookingRow struct {
		ID               string  `json:"id"`
		PassengerName    string  `json:"passenger_name"`
		PassengerEmail   string  `json:"passenger_email"`
		StartStationName string  `json:"start_station_name"`
		EndStationName   string  `json:"end_station_name"`
		StartSeq         int     `json:"start_seq"`
		EndSeq           int     `json:"end_seq"`
		FareLKR          float64 `json:"fare_lkr"`
		Status           string  `json:"status"`
		CoachNumber      int     `json:"coach_number"`
		SeatNumber       int     `json:"seat_number"`
		CreatedAt        string  `json:"created_at"`
	}

	var bookings []bookingRow
	for rows.Next() {
		var b bookingRow
		if err := rows.Scan(
			&b.ID, &b.PassengerName, &b.PassengerEmail,
			&b.StartStationName, &b.EndStationName,
			&b.StartSeq, &b.EndSeq, &b.FareLKR, &b.Status,
			&b.CoachNumber, &b.SeatNumber, &b.CreatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error")
			return
		}
		bookings = append(bookings, b)
	}
	if bookings == nil {
		bookings = []bookingRow{}
	}
	writeJSON(w, http.StatusOK, bookings)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func (h *Handler) newFareService() *services.FareService {
	return services.NewFareService(
		h.cfg.BaseRatePerStationLKR,
		h.cfg.ReservedCoachMultiplier,
		h.cfg.UnreservedCoachMultiplier,
	)
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
