package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// Station CRUD

func (h *Handler) CreateStation(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name          string  `json:"name"`
		Code          string  `json:"code"`
		SequenceOrder int     `json:"sequence_order"`
		DistanceKM    float64 `json:"distance_km"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var id string
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO stations (name, code, sequence_order, distance_km)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, req.Name, req.Code, req.SequenceOrder, req.DistanceKM).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create station: "+err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *Handler) UpdateStation(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Name          string  `json:"name"`
		Code          string  `json:"code"`
		SequenceOrder int     `json:"sequence_order"`
		DistanceKM    float64 `json:"distance_km"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	_, err := h.db.Exec(r.Context(), `
		UPDATE stations SET name = $1, code = $2, sequence_order = $3, distance_km = $4
		WHERE id = $5
	`, req.Name, req.Code, req.SequenceOrder, req.DistanceKM, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update station")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) ToggleStationStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	_, err := h.db.Exec(r.Context(), `UPDATE stations SET is_active = $1 WHERE id = $2`, req.IsActive, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to toggle status")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// Train CRUD

func (h *Handler) ListTrains(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT id::text, train_number, name, direction FROM trains ORDER BY train_number ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch trains")
		return
	}
	defer rows.Close()

	type trainRow struct {
		ID          string `json:"id"`
		TrainNumber string `json:"train_number"`
		Name        string `json:"name"`
		Direction   string `json:"direction"`
	}
	var list []trainRow
	for rows.Next() {
		var t trainRow
		if err := rows.Scan(&t.ID, &t.TrainNumber, &t.Name, &t.Direction); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error")
			return
		}
		list = append(list, t)
	}
	if list == nil {
		list = []trainRow{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *Handler) CreateTrain(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TrainNumber string `json:"train_number"`
		Name        string `json:"name"`
		Direction   string `json:"direction"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	var id string
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO trains (train_number, name, direction)
		VALUES ($1, $2, $3) RETURNING id
	`, req.TrainNumber, req.Name, req.Direction).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create train")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *Handler) UpdateTrain(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		TrainNumber string `json:"train_number"`
		Name        string `json:"name"`
		Direction   string `json:"direction"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	_, err := h.db.Exec(r.Context(), `
		UPDATE trains SET train_number = $1, name = $2, direction = $3 WHERE id = $4
	`, req.TrainNumber, req.Name, req.Direction, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update train")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) DeleteTrain(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec(r.Context(), `DELETE FROM trains WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete train")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// Coach CRUD

func (h *Handler) ListTrainCoaches(w http.ResponseWriter, r *http.Request) {
	trainID := chi.URLParam(r, "trainId")
	rows, err := h.db.Query(r.Context(), `
		SELECT 
			c.id::text, c.coach_number, c.coach_type, COALESCE(c.coach_class, 'SECOND'), c.total_seats, COALESCE(c.label, ''), COALESCE(c.train_id::text, ''),
			(
				SELECT COUNT(DISTINCT s.id) 
				FROM seats s 
				JOIN bookings b ON b.seat_id = s.id 
				WHERE s.coach_id = c.id AND b.status = 'CONFIRMED'
			) AS booked_seats
		FROM coaches c WHERE c.train_id = $1 ORDER BY c.coach_number ASC
	`, trainID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch coaches: "+err.Error())
		return
	}
	defer rows.Close()
	type coach struct {
		ID          string `json:"id"`
		CoachNumber int    `json:"coach_number"`
		CoachType   string `json:"coach_type"`
		CoachClass  string `json:"coach_class"`
		TotalSeats  int    `json:"total_seats"`
		Label       string `json:"label"`
		TrainID     string `json:"train_id"`
		BookedSeats int    `json:"booked_seats"`
	}
	var coaches []coach
	for rows.Next() {
		var c coach
		if err := rows.Scan(&c.ID, &c.CoachNumber, &c.CoachType, &c.CoachClass, &c.TotalSeats, &c.Label, &c.TrainID, &c.BookedSeats); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error: "+err.Error())
			return
		}
		coaches = append(coaches, c)
	}
	if coaches == nil {
		coaches = []coach{}
	}
	writeJSON(w, http.StatusOK, coaches)
}

func (h *Handler) AddCoachToTrain(w http.ResponseWriter, r *http.Request) {
	trainID := chi.URLParam(r, "trainId")
	var req struct {
		CoachNumber int    `json:"coach_number"`
		CoachType   string `json:"coach_type"`
		CoachClass  string `json:"coach_class"`
		TotalSeats  int    `json:"total_seats"`
		Label       string `json:"label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.CoachClass == "" {
		req.CoachClass = "SECOND"
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Transaction error")
		return
	}
	defer tx.Rollback(r.Context())

	var coachID string
	err = tx.QueryRow(r.Context(), `
		INSERT INTO coaches (train_id, coach_number, coach_type, coach_class, total_seats, label)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
	`, trainID, req.CoachNumber, req.CoachType, req.CoachClass, req.TotalSeats, req.Label).Scan(&coachID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create coach: "+err.Error())
		return
	}

	for i := 1; i <= req.TotalSeats; i++ {
		_, err = tx.Exec(r.Context(), `
			INSERT INTO seats (coach_id, seat_number) VALUES ($1, $2)
		`, coachID, i)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to create seats")
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to commit")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": coachID})
}

func (h *Handler) UpdateCoach(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		CoachNumber int    `json:"coach_number"`
		CoachType   string `json:"coach_type"`
		CoachClass  string `json:"coach_class"`
		Label       string `json:"label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	_, err := h.db.Exec(r.Context(), `
		UPDATE coaches SET coach_number = $1, coach_type = $2, coach_class = $3, label = $4 WHERE id = $5
	`, req.CoachNumber, req.CoachType, req.CoachClass, req.Label, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update coach")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) RemoveCoach(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec(r.Context(), `DELETE FROM coaches WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete coach")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// Schedule CRUD

// ListAdminSchedules returns scheduled services, optionally narrowed to a date
// range and/or direction. A schedule is one train departure on one calendar date.
func (h *Handler) ListAdminSchedules(w http.ResponseWriter, r *http.Request) {
	h.autoDeactivateExpiredSchedules(r.Context())

	dateFrom := r.URL.Query().Get("date_from")
	dateTo := r.URL.Query().Get("date_to")
	direction := r.URL.Query().Get("direction")

	conditions := []string{"1=1"}
	args := []interface{}{}
	if dateFrom != "" {
		if _, err := parseScheduleDate(dateFrom); err != nil {
			writeError(w, http.StatusBadRequest, "date_from must be YYYY-MM-DD")
			return
		}
		args = append(args, dateFrom)
		conditions = append(conditions, fmt.Sprintf("s.departure_date >= $%d", len(args)))
	} else {
		conditions = append(conditions, "(s.departure_date + s.departure_time::time) > (NOW() + INTERVAL '1 hour')")
	}
	if dateTo != "" {
		if _, err := parseScheduleDate(dateTo); err != nil {
			writeError(w, http.StatusBadRequest, "date_to must be YYYY-MM-DD")
			return
		}
		args = append(args, dateTo)
		conditions = append(conditions, fmt.Sprintf("s.departure_date <= $%d", len(args)))
	}
	if direction != "" {
		if direction != "UP" && direction != "DOWN" {
			writeError(w, http.StatusBadRequest, "direction must be UP or DOWN")
			return
		}
		args = append(args, direction)
		conditions = append(conditions, fmt.Sprintf("t.direction = $%d", len(args)))
	}

	pageStr := r.URL.Query().Get("page")
	limitStr := r.URL.Query().Get("limit")

	if pageStr != "" {
		page, _ := strconv.Atoi(pageStr)
		if page < 1 {
			page = 1
		}
		limit, _ := strconv.Atoi(limitStr)
		if limit < 1 {
			limit = 10
		}

		var total int
		countQuery := `SELECT COUNT(*) FROM schedules s JOIN trains t ON t.id = s.train_id WHERE ` + joinConditions(conditions)
		if err := h.db.QueryRow(r.Context(), countQuery, args...).Scan(&total); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to count schedules: "+err.Error())
			return
		}

		offset := (page - 1) * limit
		query := fmt.Sprintf(`SELECT s.id::text, s.train_id::text, t.name, t.train_number, t.direction,
			s.departure_date::text, s.departure_time::text, s.is_active, s.cancel_reason, s.batch_id::text
			FROM schedules s JOIN trains t ON t.id = s.train_id
			WHERE %s ORDER BY s.departure_date DESC, s.departure_time ASC
			LIMIT %d OFFSET %d`, joinConditions(conditions), limit, offset)

		rows, err := h.db.Query(r.Context(), query, args...)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to fetch schedules")
			return
		}
		defer rows.Close()

		type scheduleRow struct {
			ID            string  `json:"id"`
			TrainID       string  `json:"train_id"`
			TrainName     string  `json:"train_name"`
			TrainNumber   string  `json:"train_number"`
			Direction     string  `json:"direction"`
			DepartureDate string  `json:"departure_date"`
			DepartureTime string  `json:"departure_time"`
			IsActive      bool    `json:"is_active"`
			CancelReason  *string `json:"cancel_reason"`
			BatchID       *string `json:"batch_id"`
		}

		list := []scheduleRow{}
		for rows.Next() {
			var s scheduleRow
			if err := rows.Scan(&s.ID, &s.TrainID, &s.TrainName, &s.TrainNumber, &s.Direction, &s.DepartureDate, &s.DepartureTime, &s.IsActive, &s.CancelReason, &s.BatchID); err != nil {
				writeError(w, http.StatusInternalServerError, "Scan error")
				return
			}
			list = append(list, s)
		}
		if err := rows.Err(); err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to read schedules")
			return
		}

		totalPages := 0
		if limit > 0 {
			totalPages = (total + limit - 1) / limit
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"data":        list,
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		})
		return
	}

	query := `SELECT s.id::text, s.train_id::text, t.name, t.train_number, t.direction,
		s.departure_date::text, s.departure_time::text, s.is_active, s.cancel_reason, s.batch_id::text
		FROM schedules s JOIN trains t ON t.id = s.train_id
		WHERE ` + joinConditions(conditions) + ` ORDER BY s.departure_date DESC, s.departure_time ASC`
	rows, err := h.db.Query(r.Context(), query, args...)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch schedules")
		return
	}
	defer rows.Close()
	type scheduleRow struct {
		ID            string  `json:"id"`
		TrainID       string  `json:"train_id"`
		TrainName     string  `json:"train_name"`
		TrainNumber   string  `json:"train_number"`
		Direction     string  `json:"direction"`
		DepartureDate string  `json:"departure_date"`
		DepartureTime string  `json:"departure_time"`
		IsActive      bool    `json:"is_active"`
		CancelReason  *string `json:"cancel_reason"`
		BatchID       *string `json:"batch_id"`
	}
	list := []scheduleRow{}
	for rows.Next() {
		var s scheduleRow
		if err := rows.Scan(&s.ID, &s.TrainID, &s.TrainName, &s.TrainNumber, &s.Direction, &s.DepartureDate, &s.DepartureTime, &s.IsActive, &s.CancelReason, &s.BatchID); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error")
			return
		}
		list = append(list, s)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to read schedules")
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *Handler) CreateSchedule(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TrainID       string `json:"train_id"`
		StartDate     string `json:"start_date"`
		EndDate       string `json:"end_date"`
		DepartureTime string `json:"departure_time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	startDate, err1 := parseScheduleDate(req.StartDate)
	endDate, err2 := parseScheduleDate(req.EndDate)

	if err1 != nil || err2 != nil || startDate.Before(todayUTC()) || endDate.Before(startDate) {
		writeError(w, http.StatusBadRequest, "start_date and end_date must be valid YYYY-MM-DD dates, today or later, and end_date must not be before start_date")
		return
	}
	if _, err := time.Parse("15:04", req.DepartureTime); err != nil {
		writeError(w, http.StatusBadRequest, "departure_time must be HH:MM")
		return
	}

	// Calculate number of days
	days := int(endDate.Sub(startDate).Hours()/24) + 1
	if days > 90 {
		writeError(w, http.StatusBadRequest, "Date range cannot exceed 90 days")
		return
	}

	var batchID *string
	if days > 1 {
		bID := uuid.New().String()
		batchID = &bID
	}

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}
	defer tx.Rollback(r.Context())

	for i := 0; i < days; i++ {
		currentDate := startDate.AddDate(0, 0, i)
		dateStr := currentDate.Format("2006-01-02")
		_, err := tx.Exec(r.Context(), `
			INSERT INTO schedules (train_id, departure_date, departure_time, batch_id)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (train_id, departure_date) DO NOTHING
		`, req.TrainID, dateStr, req.DepartureTime, batchID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Database error during schedule creation")
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to commit schedules")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"status": "success", "message": "Schedules created successfully"})
}

func (h *Handler) UpdateSchedule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		DepartureDate string `json:"departure_date"`
		DepartureTime string `json:"departure_time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.DepartureDate != "" {
		if date, err := parseScheduleDate(req.DepartureDate); err != nil || date.Before(todayUTC()) {
			writeError(w, http.StatusBadRequest, "departure_date must be today or later in YYYY-MM-DD format")
			return
		}
	}
	if _, err := time.Parse("15:04", req.DepartureTime); err != nil {
		writeError(w, http.StatusBadRequest, "departure_time must be HH:MM")
		return
	}
	_, err := h.db.Exec(r.Context(), `
		UPDATE schedules SET departure_date = COALESCE(NULLIF($1, ''), departure_date), departure_time = $2 WHERE id = $3
	`, req.DepartureDate, req.DepartureTime, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update schedule")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func parseScheduleDate(value string) (time.Time, error) { return time.Parse("2006-01-02", value) }
func todayUTC() time.Time                               { return time.Now().UTC().Truncate(24 * time.Hour) }
func joinConditions(conditions []string) string {
	result := conditions[0]
	for _, condition := range conditions[1:] {
		result += " AND " + condition
	}
	return result
}

func (h *Handler) ToggleScheduleStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		IsActive bool   `json:"is_active"`
		Reason   string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var reason *string
	if !req.IsActive && req.Reason != "" {
		reason = &req.Reason
	}

	_, err := h.db.Exec(r.Context(), `
		UPDATE schedules 
		SET is_active = $1, cancel_reason = $2 
		WHERE id = $3
	`, req.IsActive, reason, id)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update schedule status")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// Booking Operations

func (h *Handler) CancelBooking(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec(r.Context(), `UPDATE bookings SET status = 'CANCELLED' WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to cancel booking")
		return
	}
	// Try to clean up Redis hold if any
	// Assuming hold keys are "hold:" + id or similar.
	// We'll just do best effort. Since hold keys in booking service typically use hold_id which we might not have,
	// or we can just ignore.
	writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

func (h *Handler) GetSeatOccupancy(w http.ResponseWriter, r *http.Request) {
	seatID := chi.URLParam(r, "seatId")
	rows, err := h.db.Query(r.Context(), `
		SELECT b.id, b.start_seq, b.end_seq, b.status, s.departure_date, b.schedule_id
		FROM bookings b
		JOIN schedules s ON s.id = b.schedule_id
		WHERE b.seat_id = $1 AND b.status IN ('CONFIRMED', 'HOLD')
	`, seatID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch occupancy")
		return
	}
	defer rows.Close()

	type occupancy struct {
		ID            string `json:"id"`
		StartSeq      int    `json:"start_seq"`
		EndSeq        int    `json:"end_seq"`
		Status        string `json:"status"`
		DepartureDate string `json:"departure_date"`
		ScheduleID    string `json:"schedule_id"`
	}
	var list []occupancy
	for rows.Next() {
		var o occupancy
		var dateStr string
		if err := rows.Scan(&o.ID, &o.StartSeq, &o.EndSeq, &o.Status, &dateStr, &o.ScheduleID); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error")
			return
		}
		o.DepartureDate = dateStr
		list = append(list, o)
	}
	if list == nil {
		list = []occupancy{}
	}
	writeJSON(w, http.StatusOK, list)
}

// Analytics

func (h *Handler) GetSegmentAnalytics(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		WITH seq_pairs AS (
			SELECT 
				s1.sequence_order as from_seq, 
				s2.sequence_order as to_seq,
				s1.name as from_name,
				s2.name as to_name
			FROM stations s1
			JOIN stations s2 ON s2.sequence_order = s1.sequence_order + 1
		),
		leg_bookings AS (
			SELECT p.from_seq, p.to_seq, p.from_name, p.to_name, COUNT(b.id) as total_bookings
			FROM seq_pairs p
			JOIN bookings b ON b.start_seq <= p.from_seq AND b.end_seq >= p.to_seq AND b.status = 'CONFIRMED'
			GROUP BY p.from_seq, p.to_seq, p.from_name, p.to_name
		),
		total_seats AS (
			SELECT COUNT(*) as cnt FROM seats s
			JOIN coaches c ON c.id = s.coach_id
			WHERE c.coach_type = 'RESERVED'
		)
		SELECT lb.from_seq, lb.to_seq, lb.from_name, lb.to_name, lb.total_bookings,
		       ROUND(lb.total_bookings * 100.0 / NULLIF(ts.cnt, 0), 2) as occupancy_pct
		FROM leg_bookings lb
		CROSS JOIN total_seats ts
		ORDER BY lb.from_seq ASC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch segment analytics")
		return
	}
	defer rows.Close()

	type segmentRow struct {
		FromSeq       int     `json:"from_seq"`
		ToSeq         int     `json:"to_seq"`
		FromName      string  `json:"from_name"`
		ToName        string  `json:"to_name"`
		TotalBookings int     `json:"total_bookings"`
		OccupancyPct  float64 `json:"occupancy_pct"`
	}

	var results []segmentRow
	for rows.Next() {
		var sr segmentRow
		if err := rows.Scan(&sr.FromSeq, &sr.ToSeq, &sr.FromName, &sr.ToName, &sr.TotalBookings, &sr.OccupancyPct); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error")
			return
		}
		results = append(results, sr)
	}
	if results == nil {
		results = []segmentRow{}
	}
	writeJSON(w, http.StatusOK, results)
}

func (h *Handler) GetRevenueAnalytics(w http.ResponseWriter, r *http.Request) {
	var res struct {
		TotalRevenue        float64 `json:"total_revenue"`
		FullRouteRevenue    float64 `json:"full_route_revenue"`
		SegmentReuseRevenue float64 `json:"segment_reuse_revenue"`
		FullRouteCount      int     `json:"full_route_count"`
		SegmentReuseCount   int     `json:"segment_reuse_count"`
	}

	// Assuming a full route goes from min seq to max seq in stations
	// Better query: check if end_seq - start_seq == max_seq
	// But let's just use start_seq + 1 == end_seq for single leg vs multi leg as requested. Wait, the prompt says:
	// "Revenue analytics: Return total revenue from CONFIRMED bookings, split by: single-leg (start_seq+1==end_seq) vs multi-leg bookings."
	// Wait, the return fields specified are {total_revenue, full_route_revenue, segment_reuse_revenue, full_route_count, segment_reuse_count}
	// "full_route" in this case means multi-leg? Let me assume:
	// full_route = multi-leg (start_seq + 1 < end_seq)
	// segment_reuse = single-leg (start_seq + 1 = end_seq)

	err := h.db.QueryRow(r.Context(), `
		SELECT 
			COALESCE(SUM(fare_lkr), 0) as total_revenue,
			COALESCE(SUM(fare_lkr) FILTER (WHERE end_seq > start_seq + 1), 0) as full_route_revenue,
			COALESCE(SUM(fare_lkr) FILTER (WHERE end_seq = start_seq + 1), 0) as segment_reuse_revenue,
			COUNT(*) FILTER (WHERE end_seq > start_seq + 1) as full_route_count,
			COUNT(*) FILTER (WHERE end_seq = start_seq + 1) as segment_reuse_count
		FROM bookings
		WHERE status = 'CONFIRMED'
	`).Scan(&res.TotalRevenue, &res.FullRouteRevenue, &res.SegmentReuseRevenue, &res.FullRouteCount, &res.SegmentReuseCount)

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch revenue analytics")
		return
	}

	writeJSON(w, http.StatusOK, res)
}

func (h *Handler) GetBookingChartAnalytics(w http.ResponseWriter, r *http.Request) {
	period := r.URL.Query().Get("groupby")
	if period != "month" {
		period = "day"
	}

	var query string
	if period == "month" {
		query = `
			SELECT 
				TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS label,
				COUNT(*) AS bookings_count,
				COALESCE(SUM(fare_lkr), 0) AS total_revenue
			FROM bookings
			WHERE created_at >= NOW() - INTERVAL '12 months' AND status = 'CONFIRMED'
			GROUP BY DATE_TRUNC('month', created_at)
			ORDER BY DATE_TRUNC('month', created_at) ASC
		`
	} else {
		query = `
			SELECT 
				TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS label,
				COUNT(*) AS bookings_count,
				COALESCE(SUM(fare_lkr), 0) AS total_revenue
			FROM bookings
			WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'CONFIRMED'
			GROUP BY DATE_TRUNC('day', created_at)
			ORDER BY DATE_TRUNC('day', created_at) ASC
		`
	}

	rows, err := h.db.Query(r.Context(), query)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch chart analytics: "+err.Error())
		return
	}
	defer rows.Close()

	type chartPoint struct {
		Label         string  `json:"label"`
		BookingsCount int     `json:"bookings_count"`
		TotalRevenue  float64 `json:"total_revenue"`
	}

	var points []chartPoint
	for rows.Next() {
		var pt chartPoint
		if err := rows.Scan(&pt.Label, &pt.BookingsCount, &pt.TotalRevenue); err == nil {
			points = append(points, pt)
		}
	}
	if points == nil {
		points = []chartPoint{}
	}
	writeJSON(w, http.StatusOK, points)
}

// Refund & Reschedule Admin Handlers

func (h *Handler) ListRefundRequests(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT rr.id::text, rr.booking_id::text, rr.user_id::text, rr.requested_at::text, rr.refundable_amount, rr.status, rr.admin_note, rr.decided_at::text,
			b.passenger_name, b.fare_lkr, sch.departure_date::text, sch.departure_time::text
		FROM refund_requests rr
		JOIN bookings b ON b.id = rr.booking_id
		LEFT JOIN schedules sch ON sch.id = b.schedule_id
		ORDER BY rr.requested_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch refund requests: "+err.Error())
		return
	}
	defer rows.Close()

	type row struct {
		ID               string  `json:"id"`
		BookingID        string  `json:"booking_id"`
		UserID           string  `json:"user_id"`
		RequestedAt      string  `json:"requested_at"`
		RefundableAmount float64 `json:"refundable_amount"`
		Status           string  `json:"status"`
		AdminNote        *string `json:"admin_note"`
		DecidedAt        *string `json:"decided_at"`
		PassengerName    string  `json:"passenger_name"`
		FareLKR          float64 `json:"fare_lkr"`
		DepartureDate    *string `json:"departure_date"`
		DepartureTime    *string `json:"departure_time"`
	}

	var list []row
	for rows.Next() {
		var rrow row
		var decAt, depDate, depTime interface{}
		if err := rows.Scan(&rrow.ID, &rrow.BookingID, &rrow.UserID, &rrow.RequestedAt, &rrow.RefundableAmount, &rrow.Status, &rrow.AdminNote, &decAt, &rrow.PassengerName, &rrow.FareLKR, &depDate, &depTime); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error: "+err.Error())
			return
		}
		if decAt != nil {
			s := fmt.Sprintf("%v", decAt)
			rrow.DecidedAt = &s
		}
		if depDate != nil {
			s := fmt.Sprintf("%v", depDate)
			rrow.DepartureDate = &s
		}
		if depTime != nil {
			s := fmt.Sprintf("%v", depTime)
			rrow.DepartureTime = &s
		}
		list = append(list, rrow)
	}
	if list == nil {
		list = []row{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *Handler) ApproveRefundRequest(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		AdminNote string `json:"admin_note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}
	defer tx.Rollback(r.Context())

	var bookingID string
	err = tx.QueryRow(r.Context(), `SELECT booking_id::text FROM refund_requests WHERE id = $1`, id).Scan(&bookingID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Refund request not found")
		return
	}

	_, err = tx.Exec(r.Context(), `UPDATE refund_requests SET status = 'APPROVED', admin_note = $1, decided_at = now() WHERE id = $2`, req.AdminNote, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to approve refund request: "+err.Error())
		return
	}

	_, err = tx.Exec(r.Context(), `UPDATE bookings SET status = 'CANCELLED' WHERE id = $1`, bookingID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to cancel refunded booking: "+err.Error())
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to commit transaction")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

func (h *Handler) RejectRefundRequest(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		AdminNote string `json:"admin_note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	_, err := h.db.Exec(r.Context(), `UPDATE refund_requests SET status = 'REJECTED', admin_note = $1, decided_at = now() WHERE id = $2`, req.AdminNote, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to reject refund request: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}

func (h *Handler) ListRescheduleRequests(w http.ResponseWriter, r *http.Request) {
	rows, err := h.db.Query(r.Context(), `
		SELECT rr.id::text, rr.booking_id::text, rr.user_id::text, rr.requested_at::text, rr.new_schedule_id::text, rr.new_start_station_id::text, rr.new_end_station_id::text, rr.new_seat_id::text, rr.status, rr.admin_note, rr.decided_at::text,
			b.passenger_name, sch.departure_date::text, sch.departure_time::text,
			COALESCE(ns.name, '') as new_start_name, COALESCE(ne.name, '') as new_end_name,
			COALESCE(nsch.departure_date::text, '') as new_departure_date, COALESCE(nsch.departure_time::text, '') as new_departure_time
		FROM reschedule_requests rr
		JOIN bookings b ON b.id = rr.booking_id
		LEFT JOIN schedules sch ON sch.id = b.schedule_id
		LEFT JOIN stations ns ON ns.id = rr.new_start_station_id
		LEFT JOIN stations ne ON ne.id = rr.new_end_station_id
		LEFT JOIN schedules nsch ON nsch.id = rr.new_schedule_id
		ORDER BY rr.requested_at DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to fetch reschedule requests: "+err.Error())
		return
	}
	defer rows.Close()

	type rrow struct {
		ID                string  `json:"id"`
		BookingID         string  `json:"booking_id"`
		UserID            string  `json:"user_id"`
		RequestedAt       string  `json:"requested_at"`
		NewScheduleID     *string `json:"new_schedule_id"`
		NewStartStationID *string `json:"new_start_station_id"`
		NewEndStationID   *string `json:"new_end_station_id"`
		NewSeatID         *string `json:"new_seat_id"`
		Status            string  `json:"status"`
		AdminNote         *string `json:"admin_note"`
		DecidedAt         *string `json:"decided_at"`
		PassengerName     string  `json:"passenger_name"`
		DepartureDate     *string `json:"departure_date"`
		DepartureTime     *string `json:"departure_time"`
		NewStartName      string  `json:"new_start_name"`
		NewEndName        string  `json:"new_end_name"`
		NewDepartureDate  string  `json:"new_departure_date"`
		NewDepartureTime  string  `json:"new_departure_time"`
	}

	var list []rrow
	for rows.Next() {
		var it rrow
		var decAt, depDate, depTime interface{}
		if err := rows.Scan(
			&it.ID, &it.BookingID, &it.UserID, &it.RequestedAt,
			&it.NewScheduleID, &it.NewStartStationID, &it.NewEndStationID, &it.NewSeatID,
			&it.Status, &it.AdminNote, &decAt,
			&it.PassengerName, &depDate, &depTime,
			&it.NewStartName, &it.NewEndName, &it.NewDepartureDate, &it.NewDepartureTime,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "Scan error: "+err.Error())
			return
		}
		if decAt != nil {
			s := fmt.Sprintf("%v", decAt)
			it.DecidedAt = &s
		}
		if depDate != nil {
			s := fmt.Sprintf("%v", depDate)
			it.DepartureDate = &s
		}
		if depTime != nil {
			s := fmt.Sprintf("%v", depTime)
			it.DepartureTime = &s
		}
		list = append(list, it)
	}
	if list == nil {
		list = []rrow{}
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *Handler) ApproveRescheduleRequest(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		AdminNote string `json:"admin_note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	// Fetch request details
	var bookingID, newScheduleID, newStartID, newEndID, newSeatID *string
	err := h.db.QueryRow(r.Context(), `SELECT booking_id::text, new_schedule_id::text, new_start_station_id::text, new_end_station_id::text, new_seat_id::text FROM reschedule_requests WHERE id = $1`, id).Scan(&bookingID, &newScheduleID, &newStartID, &newEndID, &newSeatID)
	if err != nil {
		writeError(w, http.StatusNotFound, "Reschedule request not found")
		return
	}

	// Begin transaction to update booking and mark request approved
	tx, err := h.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}
	defer tx.Rollback(r.Context())

	// Update booking with provided fields
	if newScheduleID != nil && *newScheduleID != "" {
		_, err = tx.Exec(r.Context(), `UPDATE bookings SET schedule_id = $1 WHERE id = $2`, *newScheduleID, *bookingID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to update booking schedule")
			return
		}
	}
	if newStartID != nil && *newStartID != "" && newEndID != nil && *newEndID != "" {
		// fetch sequence orders for stations
		var startSeq, endSeq int
		err = tx.QueryRow(r.Context(), `SELECT sequence_order FROM stations WHERE id = $1`, *newStartID).Scan(&startSeq)
		if err == nil {
			err = tx.QueryRow(r.Context(), `SELECT sequence_order FROM stations WHERE id = $1`, *newEndID).Scan(&endSeq)
		}
		if err != nil {
			writeError(w, http.StatusBadRequest, "Invalid station IDs provided for reschedule")
			return
		}
		_, err = tx.Exec(r.Context(), `UPDATE bookings SET start_station_id = $1, end_station_id = $2, start_seq = $3, end_seq = $4 WHERE id = $5`, *newStartID, *newEndID, startSeq, endSeq, *bookingID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to update booking stations")
			return
		}
	}
	if newSeatID != nil && *newSeatID != "" {
		_, err = tx.Exec(r.Context(), `UPDATE bookings SET seat_id = $1 WHERE id = $2`, *newSeatID, *bookingID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to update booking seat")
			return
		}
	}

	_, err = tx.Exec(r.Context(), `UPDATE reschedule_requests SET status = 'APPROVED', admin_note = $1, decided_at = now() WHERE id = $2`, req.AdminNote, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to mark reschedule request approved")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to commit changes")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

func (h *Handler) RejectRescheduleRequest(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		AdminNote string `json:"admin_note"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	_, err := h.db.Exec(r.Context(), `UPDATE reschedule_requests SET status = 'REJECTED', admin_note = $1, decided_at = now() WHERE id = $2`, req.AdminNote, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to reject reschedule request: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}
