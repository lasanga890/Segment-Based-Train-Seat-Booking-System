sed -i '/func (h \*Handler) ListAllBookings/,$d' internal/handlers/routes.go
cat << 'INNEREOF' >> internal/handlers/routes.go
func (h *Handler) ListAllBookings(w http.ResponseWriter, r *http.Request) {
	statusFilter := r.URL.Query().Get("status")
	searchQuery := r.URL.Query().Get("search")
	dateFilter := r.URL.Query().Get("date")

	query := `
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
		WHERE 1=1
	`
	args := []interface{}{}
	argIdx := 1

	if statusFilter != "" {
		query += " AND b.status = $" + strconv.Itoa(argIdx)
		args = append(args, statusFilter)
		argIdx++
	}

	if searchQuery != "" {
		query += " AND (b.passenger_name ILIKE $" + strconv.Itoa(argIdx) + " OR b.passenger_email ILIKE $" + strconv.Itoa(argIdx) + " OR b.id::text ILIKE $" + strconv.Itoa(argIdx) + ")"
		args = append(args, "%"+searchQuery+"%")
		argIdx++
	}

	if dateFilter != "" {
		query += " AND DATE(b.created_at) = $" + strconv.Itoa(argIdx)
		args = append(args, dateFilter)
		argIdx++
	}

	query += " ORDER BY b.created_at DESC LIMIT 500"

	rows, err := h.db.Query(r.Context(), query, args...)
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
INNEREOF
bash patch_routes.sh
