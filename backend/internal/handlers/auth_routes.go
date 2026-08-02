package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/lasanga890/segment-train-booking/internal/auth"
)

type contextKey string

const (
	AdminClaimsKey contextKey = "admin_claims"
	UserClaimsKey  contextKey = "user_claims"
)

// AdminAuthMiddleware protects admin endpoints with JWT verification.
func (h *Handler) AdminAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			writeError(w, http.StatusUnauthorized, "Invalid Authorization header format")
			return
		}

		tokenStr := parts[1]
		claims, err := auth.ValidateToken(tokenStr, h.cfg.JWTSecret)
		if err != nil || claims.Role != "ADMIN" {
			writeError(w, http.StatusUnauthorized, "Unauthorized: Invalid or expired admin token")
			return
		}

		ctx := context.WithValue(r.Context(), AdminClaimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserAuthMiddleware (Optional helper to extract user from token if present)
func (h *Handler) UserAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				claims, err := auth.ValidateToken(parts[1], h.cfg.JWTSecret)
				if err == nil && claims.Role == "USER" {
					ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
					r = r.WithContext(ctx)
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

// POST /api/v1/auth/admin/login
func (h *Handler) AdminLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Username) == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "Username and password required")
		return
	}

	cleanUsername := strings.ToLower(strings.TrimSpace(req.Username))
	var id, passwordHash string
	err := h.db.QueryRow(r.Context(), `
		SELECT id::text, password_hash FROM admin_users WHERE LOWER(username) = $1
	`, cleanUsername).Scan(&id, &passwordHash)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	if !auth.CheckPasswordHash(req.Password, passwordHash) {
		writeError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	token, err := auth.GenerateToken(id, req.Username, "ADMIN", h.cfg.JWTSecret, h.cfg.JWTExpiryHours)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"admin": map[string]string{
			"id":       id,
			"username": req.Username,
		},
	})
}

// POST /api/v1/auth/user/register
func (h *Handler) UserRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Phone    string `json:"phone"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "Name, email, and password are required")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	var id string
	err = h.db.QueryRow(r.Context(), `
		INSERT INTO users (name, email, password_hash, phone)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, req.Name, strings.ToLower(strings.TrimSpace(req.Email)), hash, req.Phone).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "users_email_key") {
			writeError(w, http.StatusConflict, "Email is already registered. Please log in.")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to register user: "+err.Error())
		return
	}

	token, err := auth.GenerateToken(id, req.Email, "USER", h.cfg.JWTSecret, h.cfg.JWTExpiryHours)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"token": token,
		"user": map[string]string{
			"id":    id,
			"name":  req.Name,
			"email": req.Email,
			"phone": req.Phone,
		},
	})
}

// POST /api/v1/auth/user/login
func (h *Handler) UserLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "Email and password required")
		return
	}

	var id, name, phone, passwordHash string
	emailClean := strings.ToLower(strings.TrimSpace(req.Email))
	err := h.db.QueryRow(r.Context(), `
		SELECT id::text, name, COALESCE(phone, ''), password_hash
		FROM users WHERE LOWER(email) = $1
	`, emailClean).Scan(&id, &name, &phone, &passwordHash)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if !auth.CheckPasswordHash(req.Password, passwordHash) {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token, err := auth.GenerateToken(id, emailClean, "USER", h.cfg.JWTSecret, h.cfg.JWTExpiryHours)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token": token,
		"user": map[string]string{
			"id":    id,
			"name":  name,
			"email": emailClean,
			"phone": phone,
		},
	})
}

// GET /api/v1/auth/user/me
func (h *Handler) GetUserMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(UserClaimsKey).(*auth.Claims)
	if !ok || claims == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var id, name, email, phone string
	err := h.db.QueryRow(r.Context(), `
		SELECT id::text, name, email, COALESCE(phone, '') FROM users WHERE id = $1
	`, claims.UserID).Scan(&id, &name, &email, &phone)
	if err != nil {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"id":    id,
		"name":  name,
		"email": email,
		"phone": phone,
	})
}
