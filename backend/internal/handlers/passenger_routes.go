package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/lasanga890/segment-train-booking/internal/auth"
)

// Helper to get authenticated user ID from context
func getUserIDFromCtx(r *http.Request) (string, error) {
	claims, ok := r.Context().Value(UserClaimsKey).(*auth.Claims)
	if !ok || claims == nil || claims.UserID == "" {
		return "", fmt.Errorf("unauthorized")
	}
	return claims.UserID, nil
}

// ─── Profile Handlers ─────────────────────────────────────────────────────────

// GET /api/v1/user/profile
func (h *Handler) GetUserProfile(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var u struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		NICPassport string `json:"nic_passport"`
		CreatedAt   string `json:"created_at"`
	}

	err = h.db.QueryRow(r.Context(), `
		SELECT id::text, name, email, COALESCE(phone, ''), COALESCE(nic_passport, ''), created_at::text
		FROM users WHERE id = $1
	`, userID).Scan(&u.ID, &u.Name, &u.Email, &u.Phone, &u.NICPassport, &u.CreatedAt)

	if err != nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}

	writeJSON(w, http.StatusOK, u)
}

// PUT /api/v1/user/profile
func (h *Handler) UpdateUserProfile(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var req struct {
		Name        string `json:"name"`
		Phone       string `json:"phone"`
		NICPassport string `json:"nic_passport"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	_, err = h.db.Exec(r.Context(), `
		UPDATE users
		SET name = COALESCE(NULLIF($1, ''), name),
		    phone = $2,
		    nic_passport = $3
		WHERE id = $4
	`, req.Name, req.Phone, req.NICPassport, userID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update profile: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Profile updated successfully"})
}

// ─── Frequent Passengers Presets ─────────────────────────────────────────────

// GET /api/v1/user/frequent-passengers
func (h *Handler) ListFrequentPassengers(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id::text, full_name, nic_passport, COALESCE(gender, 'OTHER'), created_at::text
		FROM user_frequent_passengers
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error: "+err.Error())
		return
	}
	defer rows.Close()

	type Preset struct {
		ID          string `json:"id"`
		FullName    string `json:"full_name"`
		NICPassport string `json:"nic_passport"`
		Gender      string `json:"gender"`
		CreatedAt   string `json:"created_at"`
	}
	presets := []Preset{}

	for rows.Next() {
		var p Preset
		if err := rows.Scan(&p.ID, &p.FullName, &p.NICPassport, &p.Gender, &p.CreatedAt); err == nil {
			presets = append(presets, p)
		}
	}

	writeJSON(w, http.StatusOK, presets)
}

// POST /api/v1/user/frequent-passengers
func (h *Handler) AddFrequentPassenger(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var req struct {
		FullName    string `json:"full_name"`
		NICPassport string `json:"nic_passport"`
		Gender      string `json:"gender"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FullName == "" || req.NICPassport == "" {
		writeError(w, http.StatusBadRequest, "Full name and NIC/Passport are required")
		return
	}

	var id string
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO user_frequent_passengers (user_id, full_name, nic_passport, gender)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, userID, req.FullName, req.NICPassport, req.Gender).Scan(&id)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save preset")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "message": "Preset saved"})
}

// DELETE /api/v1/user/frequent-passengers/{id}
func (h *Handler) DeleteFrequentPassenger(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	presetID := chi.URLParam(r, "id")
	_, err = h.db.Exec(r.Context(), `
		DELETE FROM user_frequent_passengers WHERE id = $1 AND user_id = $2
	`, presetID, userID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete preset")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Preset deleted"})
}

// ─── Favorite Frequent Routes ────────────────────────────────────────────────

// GET /api/v1/user/favorite-routes
func (h *Handler) ListFavoriteRoutes(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT fr.id::text,
		       s1.id::text, s1.name, s1.sequence_order,
		       s2.id::text, s2.name, s2.sequence_order,
		       COALESCE(fr.label, ''), fr.created_at::text
		FROM user_favorite_routes fr
		JOIN stations s1 ON s1.id = fr.start_station_id
		JOIN stations s2 ON s2.id = fr.end_station_id
		WHERE fr.user_id = $1
		ORDER BY fr.created_at DESC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer rows.Close()

	type FavRoute struct {
		ID            string `json:"id"`
		StartID       string `json:"start_station_id"`
		StartName     string `json:"start_station_name"`
		StartSeq      int    `json:"start_seq"`
		EndID         string `json:"end_station_id"`
		EndName       string `json:"end_station_name"`
		EndSeq        int    `json:"end_seq"`
		Label         string `json:"label"`
		CreatedAt     string `json:"created_at"`
	}
	routesList := []FavRoute{}

	for rows.Next() {
		var f FavRoute
		if err := rows.Scan(&f.ID, &f.StartID, &f.StartName, &f.StartSeq, &f.EndID, &f.EndName, &f.EndSeq, &f.Label, &f.CreatedAt); err == nil {
			routesList = append(routesList, f)
		}
	}

	writeJSON(w, http.StatusOK, routesList)
}

// POST /api/v1/user/favorite-routes
func (h *Handler) AddFavoriteRoute(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var req struct {
		StartStationID string `json:"start_station_id"`
		EndStationID   string `json:"end_station_id"`
		Label          string `json:"label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.StartStationID == "" || req.EndStationID == "" {
		writeError(w, http.StatusBadRequest, "Start and End station IDs are required")
		return
	}

	var id string
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO user_favorite_routes (user_id, start_station_id, end_station_id, label)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, userID, req.StartStationID, req.EndStationID, req.Label).Scan(&id)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to save favorite route")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "message": "Favorite route saved"})
}

// DELETE /api/v1/user/favorite-routes/{id}
func (h *Handler) DeleteFavoriteRoute(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	routeID := chi.URLParam(r, "id")
	_, err = h.db.Exec(r.Context(), `
		DELETE FROM user_favorite_routes WHERE id = $1 AND user_id = $2
	`, routeID, userID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete route")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Favorite route deleted"})
}

// ─── User Bookings & Self Cancellation with Waitlist Auto-Promotion ─────────

// GET /api/v1/user/bookings
func (h *Handler) GetUserBookings(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT
			b.id::text, b.passenger_name, COALESCE(b.passenger_email, ''),
			s_start.name, s_end.name,
			b.start_seq, b.end_seq, b.fare_lkr, b.status,
			c.coach_number, s.seat_number, b.created_at::text,
			COALESCE(t.id::text, ''), COALESCE(t.name, ''), COALESCE(t.train_number, ''),
			COALESCE(c.coach_class, 'SECOND'),
			COALESCE(sch.departure_date::text, ''), COALESCE(sch.departure_time::text, '')
		FROM bookings b
		JOIN stations s_start ON s_start.id = b.start_station_id
		JOIN stations s_end   ON s_end.id   = b.end_station_id
		JOIN seats s          ON s.id        = b.seat_id
		JOIN coaches c        ON c.id        = s.coach_id
		LEFT JOIN schedules sch ON sch.id    = b.schedule_id
		LEFT JOIN trains t     ON t.id      = sch.train_id
		WHERE b.user_id = $1
		ORDER BY b.created_at DESC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch bookings: "+err.Error())
		return
	}
	defer rows.Close()

	type UserBooking struct {
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
		TrainID          string  `json:"train_id"`
		TrainName        string  `json:"train_name"`
		TrainNumber      string  `json:"train_number"`
		CoachClass       string  `json:"coach_class"`
		DepartureDate    string  `json:"departure_date"`
		DepartureTime    string  `json:"departure_time"`
	}

	bookings := []UserBooking{}
	for rows.Next() {
		var b UserBooking
		if err := rows.Scan(
			&b.ID, &b.PassengerName, &b.PassengerEmail,
			&b.StartStationName, &b.EndStationName,
			&b.StartSeq, &b.EndSeq, &b.FareLKR, &b.Status,
			&b.CoachNumber, &b.SeatNumber, &b.CreatedAt,
			&b.TrainID, &b.TrainName, &b.TrainNumber, &b.CoachClass,
			&b.DepartureDate, &b.DepartureTime,
		); err == nil {
			bookings = append(bookings, b)
		}
	}

	writeJSON(w, http.StatusOK, bookings)
}

// PATCH /api/v1/user/bookings/{id}/cancel
func (h *Handler) CancelUserBooking(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	bookingID := chi.URLParam(r, "id")

	// 1. Verify booking ownership and current status and fetch fare
	var scheduleIDStr, coachClass string
	var startSeq, endSeq int
	var status string
	var fare float64
	err = h.db.QueryRow(r.Context(), `
		SELECT COALESCE(b.schedule_id::text, ''), COALESCE(c.coach_class, 'SECOND'), b.start_seq, b.end_seq, b.status, COALESCE(b.fare_lkr, 0)
		FROM bookings b
		JOIN seats s ON s.id = b.seat_id
		JOIN coaches c ON c.id = s.coach_id
		WHERE b.id = $1 AND b.user_id = $2
	`, bookingID, userID).Scan(&scheduleIDStr, &coachClass, &startSeq, &endSeq, &status, &fare)

	if err != nil {
		writeError(w, http.StatusNotFound, "Booking not found or not owned by user")
		return
	}

	if status == "CANCELLED" {
		writeError(w, http.StatusBadRequest, "Booking is already cancelled")
		return
	}

	// 2. Mark booking CANCELLED in DB
	_, err = h.db.Exec(r.Context(), `
		UPDATE bookings SET status = 'CANCELLED' WHERE id = $1
	`, bookingID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to cancel booking: "+err.Error())
		return
	}

	// 3. Trigger Segment Waitlist Promotion Engine
	// Search for waiting list entries on this schedule and coach class that overlap [startSeq, endSeq)
	if scheduleIDStr != "" {
		scheduleID, errParse := uuid.Parse(scheduleIDStr)
		if errParse == nil {
			var promotedWaitlistID, waitlistUserID string
			var startStationName, endStationName string
			errPromote := h.db.QueryRow(r.Context(), `
				SELECT w.id::text, w.user_id::text, s1.name, s2.name
				FROM waitlists w
				JOIN stations s1 ON s1.id = w.start_station_id
				JOIN stations s2 ON s2.id = w.end_station_id
				WHERE w.schedule_id = $1
				  AND w.coach_class = $2
				  AND w.status = 'WAITING'
				  AND GREATEST(w.start_seq, $3) < LEAST(w.end_seq, $4)
				ORDER BY w.created_at ASC
				LIMIT 1
			`, scheduleID, coachClass, startSeq, endSeq).Scan(&promotedWaitlistID, &waitlistUserID, &startStationName, &endStationName)

			if errPromote == nil && promotedWaitlistID != "" {
				// Update waitlist entry to PROMOTED
				_, _ = h.db.Exec(r.Context(), `
					UPDATE waitlists SET status = 'PROMOTED' WHERE id = $1
				`, promotedWaitlistID)

				// Create in-app notification for promoted user
				title := "Seat Available on Waitlist!"
				msg := fmt.Sprintf("Great news! A seat segment (%s to %s) has become available on your waitlisted journey. Please check available seats to confirm.", startStationName, endStationName)
				_, _ = h.db.Exec(r.Context(), `
					INSERT INTO user_notifications (user_id, title, message)
					VALUES ($1, $2, $3)
				`, waitlistUserID, title, msg)
			}
		}
	}

	// 4. If cancellation happened earlier than 24 hours before departure, create refund request
	if scheduleIDStr != "" {
		scheduleID, err := uuid.Parse(scheduleIDStr)
		if err == nil {
			var depDateStr, depTimeStr string
			err = h.db.QueryRow(r.Context(), `SELECT departure_date::text, departure_time::text FROM schedules WHERE id = $1`, scheduleID).Scan(&depDateStr, &depTimeStr)
			if err == nil {
				// combine and parse departure datetime
				dtStr := depDateStr + " " + depTimeStr
				var depTime time.Time
				depTime, err = time.Parse("2006-01-02 15:04:05", dtStr)
				if err != nil {
					depTime, err = time.Parse("2006-01-02 15:04", dtStr)
				}
				if err == nil {
					if time.Until(depTime) >= 24*time.Hour {
						// create refund request (PENDING)
						_, _ = h.db.Exec(r.Context(), `
							INSERT INTO refund_requests (booking_id, user_id, refundable_amount)
							VALUES ($1, $2, $3)
						`, bookingID, userID, fare)
					}
				}
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message": "Booking cancelled successfully. Released seat segment back to inventory.",
	})
}

// ─── Segment Waitlisting Engine ──────────────────────────────────────────────

// POST /api/v1/user/bookings/{id}/reschedule
func (h *Handler) CreateRescheduleRequest(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	bookingID := chi.URLParam(r, "id")
	// verify ownership
	var exists bool
	err = h.db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM bookings WHERE id = $1 AND user_id = $2)`, bookingID, userID).Scan(&exists)
	if err != nil || !exists {
		writeError(w, http.StatusNotFound, "Booking not found or not owned by user")
		return
	}

	var req struct {
		NewScheduleID     string `json:"new_schedule_id"`
		NewStartStationID string `json:"new_start_station_id"`
		NewEndStationID   string `json:"new_end_station_id"`
		NewSeatID         string `json:"new_seat_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// insert reschedule request
	_, err = h.db.Exec(r.Context(), `
		INSERT INTO reschedule_requests (booking_id, user_id, new_schedule_id, new_start_station_id, new_end_station_id, new_seat_id)
		VALUES ($1::uuid, $2::uuid, NULLIF($3,'')::uuid, NULLIF($4,'')::uuid, NULLIF($5,'')::uuid, NULLIF($6,'')::uuid)
	`, bookingID, userID, req.NewScheduleID, req.NewStartStationID, req.NewEndStationID, req.NewSeatID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create reschedule request: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"message": "Reschedule request submitted and pending admin review"})
}

// POST /api/v1/waitlists/join
func (h *Handler) JoinWaitlist(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var req struct {
		ScheduleID     string `json:"schedule_id"`
		StartStationID string `json:"start_station_id"`
		EndStationID   string `json:"end_station_id"`
		CoachClass     string `json:"coach_class"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ScheduleID == "" || req.StartStationID == "" || req.EndStationID == "" {
		writeError(w, http.StatusBadRequest, "schedule_id, start_station_id, and end_station_id are required")
		return
	}
	if req.CoachClass == "" {
		req.CoachClass = "SECOND"
	}

	// Fetch sequence orders
	var startSeq, endSeq int
	err = h.db.QueryRow(r.Context(), "SELECT sequence_order FROM stations WHERE id = $1", req.StartStationID).Scan(&startSeq)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid start station")
		return
	}
	err = h.db.QueryRow(r.Context(), "SELECT sequence_order FROM stations WHERE id = $1", req.EndStationID).Scan(&endSeq)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid end station")
		return
	}

	if startSeq >= endSeq {
		writeError(w, http.StatusBadRequest, "Start station must precede end station")
		return
	}

	var waitlistID string
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO waitlists (user_id, schedule_id, start_station_id, end_station_id, start_seq, end_seq, coach_class, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'WAITING')
		RETURNING id::text
	`, userID, req.ScheduleID, req.StartStationID, req.EndStationID, startSeq, endSeq, req.CoachClass).Scan(&waitlistID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to join waitlist: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"id":      waitlistID,
		"message": "Successfully joined the waitlist. You will be notified automatically if a seat opens up!",
	})
}

// GET /api/v1/user/waitlists
func (h *Handler) GetUserWaitlists(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT
			w.id::text, w.schedule_id::text, t.name, t.train_number,
			s1.name, s2.name, w.coach_class, w.status,
			sch.departure_date::text, sch.departure_time::text, w.created_at::text
		FROM waitlists w
		JOIN schedules sch ON sch.id = w.schedule_id
		JOIN trains t ON t.id = sch.train_id
		JOIN stations s1 ON s1.id = w.start_station_id
		JOIN stations s2 ON s2.id = w.end_station_id
		WHERE w.user_id = $1
		ORDER BY w.created_at DESC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch waitlists")
		return
	}
	defer rows.Close()

	type WaitlistItem struct {
		ID            string `json:"id"`
		ScheduleID    string `json:"schedule_id"`
		TrainName     string `json:"train_name"`
		TrainNumber   string `json:"train_number"`
		StartName     string `json:"start_station_name"`
		EndName       string `json:"end_station_name"`
		CoachClass    string `json:"coach_class"`
		Status        string `json:"status"`
		DepartureDate string `json:"departure_date"`
		DepartureTime string `json:"departure_time"`
		CreatedAt     string `json:"created_at"`
	}

	items := []WaitlistItem{}
	for rows.Next() {
		var item WaitlistItem
		if err := rows.Scan(
			&item.ID, &item.ScheduleID, &item.TrainName, &item.TrainNumber,
			&item.StartName, &item.EndName, &item.CoachClass, &item.Status,
			&item.DepartureDate, &item.DepartureTime, &item.CreatedAt,
		); err == nil {
			items = append(items, item)
		}
	}

	writeJSON(w, http.StatusOK, items)
}

// ─── Notifications ────────────────────────────────────────────────────────────

// GET /api/v1/user/notifications
func (h *Handler) GetUserNotifications(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT id::text, title, message, is_read, created_at::text
		FROM user_notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch notifications")
		return
	}
	defer rows.Close()

	type Notification struct {
		ID        string `json:"id"`
		Title     string `json:"title"`
		Message   string `json:"message"`
		IsRead    bool   `json:"is_read"`
		CreatedAt string `json:"created_at"`
	}
	notes := []Notification{}

	for rows.Next() {
		var n Notification
		if err := rows.Scan(&n.ID, &n.Title, &n.Message, &n.IsRead, &n.CreatedAt); err == nil {
			notes = append(notes, n)
		}
	}

	writeJSON(w, http.StatusOK, notes)
}

// PATCH /api/v1/user/notifications/{id}/read
func (h *Handler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	noteID := chi.URLParam(r, "id")
	_, err = h.db.Exec(r.Context(), `
		UPDATE user_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2
	`, noteID, userID)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update notification")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Notification marked as read"})
}

// ─── User Reschedule & Refund Requests List ────────────────────────────────

// GET /api/v1/user/refund-requests
func (h *Handler) GetUserRefundRequests(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT rr.id::text, rr.booking_id::text, rr.requested_at::text, rr.refundable_amount, rr.status, rr.admin_note, rr.decided_at::text,
			b.passenger_name, b.fare_lkr
		FROM refund_requests rr
		JOIN bookings b ON b.id = rr.booking_id
		WHERE rr.user_id = $1
		ORDER BY rr.requested_at DESC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch refund requests")
		return
	}
	defer rows.Close()

	type UserRefundRow struct {
		ID               string  `json:"id"`
		BookingID        string  `json:"booking_id"`
		RequestedAt      string  `json:"requested_at"`
		RefundableAmount float64 `json:"refundable_amount"`
		Status           string  `json:"status"`
		AdminNote        *string `json:"admin_note"`
		DecidedAt        *string `json:"decided_at"`
		PassengerName    string  `json:"passenger_name"`
		FareLKR          float64 `json:"fare_lkr"`
	}

	list := []UserRefundRow{}
	for rows.Next() {
		var item UserRefundRow
		var decAt interface{}
		if err := rows.Scan(&item.ID, &item.BookingID, &item.RequestedAt, &item.RefundableAmount, &item.Status, &item.AdminNote, &decAt, &item.PassengerName, &item.FareLKR); err == nil {
			if decAt != nil { s := fmt.Sprintf("%v", decAt); item.DecidedAt = &s }
			list = append(list, item)
		}
	}
	writeJSON(w, http.StatusOK, list)
}

// GET /api/v1/user/reschedule-requests
func (h *Handler) GetUserRescheduleRequests(w http.ResponseWriter, r *http.Request) {
	userID, err := getUserIDFromCtx(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	rows, err := h.db.Query(r.Context(), `
		SELECT rr.id::text, rr.booking_id::text, rr.requested_at::text, rr.status, rr.admin_note, rr.decided_at::text,
			b.passenger_name, sch.departure_date::text, sch.departure_time::text,
			COALESCE(ns.name, '') as new_start_name, COALESCE(ne.name, '') as new_end_name,
			COALESCE(nsch.departure_date::text, '') as new_departure_date, COALESCE(nsch.departure_time::text, '') as new_departure_time
		FROM reschedule_requests rr
		JOIN bookings b ON b.id = rr.booking_id
		LEFT JOIN schedules sch ON sch.id = b.schedule_id
		LEFT JOIN stations ns ON ns.id = rr.new_start_station_id
		LEFT JOIN stations ne ON ne.id = rr.new_end_station_id
		LEFT JOIN schedules nsch ON nsch.id = rr.new_schedule_id
		WHERE rr.user_id = $1
		ORDER BY rr.requested_at DESC
	`, userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch reschedule requests")
		return
	}
	defer rows.Close()

	type UserRescheduleRow struct {
		ID               string  `json:"id"`
		BookingID        string  `json:"booking_id"`
		RequestedAt      string  `json:"requested_at"`
		Status           string  `json:"status"`
		AdminNote        *string `json:"admin_note"`
		DecidedAt        *string `json:"decided_at"`
		PassengerName    string  `json:"passenger_name"`
		DepartureDate    *string `json:"departure_date"`
		DepartureTime    *string `json:"departure_time"`
		NewStartName     string  `json:"new_start_name"`
		NewEndName       string  `json:"new_end_name"`
		NewDepartureDate string  `json:"new_departure_date"`
		NewDepartureTime string  `json:"new_departure_time"`
	}

	list := []UserRescheduleRow{}
	for rows.Next() {
		var item UserRescheduleRow
		var decAt, depDate, depTime interface{}
		if err := rows.Scan(
			&item.ID, &item.BookingID, &item.RequestedAt, &item.Status, &item.AdminNote, &decAt,
			&item.PassengerName, &depDate, &depTime,
			&item.NewStartName, &item.NewEndName, &item.NewDepartureDate, &item.NewDepartureTime,
		); err == nil {
			if decAt != nil { s := fmt.Sprintf("%v", decAt); item.DecidedAt = &s }
			if depDate != nil { s := fmt.Sprintf("%v", depDate); item.DepartureDate = &s }
			if depTime != nil { s := fmt.Sprintf("%v", depTime); item.DepartureTime = &s }
			list = append(list, item)
		}
	}
	writeJSON(w, http.StatusOK, list)
}
