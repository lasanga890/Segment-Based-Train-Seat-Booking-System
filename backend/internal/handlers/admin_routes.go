package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// ─── Station CRUD ─────────────────────────────────────────────────────────────

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
		writeError(w, http.StatusInternalServerError, "Failed to create station")
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

// ─── Train CRUD ───────────────────────────────────────────────────────────────

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

// ─── Coach CRUD ───────────────────────────────────────────────────────────────

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

// ─── Schedule CRUD ────────────────────────────────────────────────────────────

func (h *Handler) CreateSchedule(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TrainID       string `json:"train_id"`
		DepartureDate string `json:"departure_date"`
		DepartureTime string `json:"departure_time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	var id string
	err := h.db.QueryRow(r.Context(), `
		INSERT INTO schedules (train_id, departure_date, departure_time)
		VALUES ($1, $2, $3) RETURNING id
	`, req.TrainID, req.DepartureDate, req.DepartureTime).Scan(&id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create schedule")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": id})
}

func (h *Handler) UpdateSchedule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		DepartureTime string `json:"departure_time"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	_, err := h.db.Exec(r.Context(), `
		UPDATE schedules SET departure_time = $1 WHERE id = $2
	`, req.DepartureTime, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update schedule")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) CancelSchedule(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := h.db.Exec(r.Context(), `UPDATE schedules SET is_active = false WHERE id = $1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to cancel schedule")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

// ─── Booking Operations ───────────────────────────────────────────────────────

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

// ─── Analytics ────────────────────────────────────────────────────────────────

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
