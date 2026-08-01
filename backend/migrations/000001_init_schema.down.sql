-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 000001_init_schema.down.sql
-- Rolls back the initial schema
-- ─────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS seats;
DROP TABLE IF EXISTS coaches;
DROP TABLE IF EXISTS stations;
