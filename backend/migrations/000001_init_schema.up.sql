-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 000001_init_schema.up.sql
-- Initial schema for the Segment-Based Train Seat Booking System
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Stations ────────────────────────────────────────────────────────────────
-- Represents each stop on the Colombo Fort – Badulla scenic line.
-- sequence_order is the key field for segment interval math.
-- 0 = Colombo Fort (origin), 25 = Badulla (terminus)
CREATE TABLE stations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(10)  NOT NULL UNIQUE,
    sequence_order  INTEGER      NOT NULL UNIQUE,  -- half-open interval index
    distance_km     NUMERIC(8,2) NOT NULL,          -- cumulative km from Colombo Fort
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Coaches ─────────────────────────────────────────────────────────────────
-- Represents a physical rail carriage. Type determines fare multiplier.
-- Coaches 1-3: RESERVED | Coaches 4-8: UNRESERVED (configurable via seed)
CREATE TABLE coaches (
    id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_number INTEGER   NOT NULL UNIQUE,
    coach_type   VARCHAR(20) NOT NULL CHECK (coach_type IN ('RESERVED', 'UNRESERVED')),
    total_seats  INTEGER   NOT NULL CHECK (total_seats > 0),
    label        VARCHAR(100),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Seats ───────────────────────────────────────────────────────────────────
-- Physical seat within a coach. Only RESERVED coach seats are bookable
-- (unreserved coaches don't assign seats — first-come, first-served).
CREATE TABLE seats (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id     UUID    NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
    seat_number  INTEGER NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(coach_id, seat_number)
);

-- ─── Bookings ─────────────────────────────────────────────────────────────────
-- Core table. Each row is a reservation of a physical seat for a leg [start_seq, end_seq).
-- Segment overlap is detected in application via:
--   GREATEST(b1.start_seq, b2.start_seq) < LEAST(b1.end_seq, b2.end_seq)
-- Protected at transaction level with SELECT ... FOR UPDATE on the seat row.
CREATE TABLE bookings (
    id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    passenger_name    VARCHAR(200)  NOT NULL,
    passenger_email   VARCHAR(200),
    seat_id           UUID          NOT NULL REFERENCES seats(id),
    start_station_id  UUID          NOT NULL REFERENCES stations(id),
    end_station_id    UUID          NOT NULL REFERENCES stations(id),
    start_seq         INTEGER       NOT NULL,  -- denormalized from stations.sequence_order
    end_seq           INTEGER       NOT NULL,  -- for fast overlap queries without joins
    fare_lkr          NUMERIC(10,2) NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'CONFIRMED'
                          CHECK (status IN ('HOLD', 'CONFIRMED', 'CANCELLED')),
    hold_expires_at   TIMESTAMPTZ,             -- set only for HOLD status
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_sequence CHECK (start_seq < end_seq)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Optimise the hot-path availability query: "for seat X, find bookings overlapping [s, e)"
CREATE INDEX idx_bookings_seat_seq
    ON bookings (seat_id, start_seq, end_seq)
    WHERE status IN ('HOLD', 'CONFIRMED');

-- Admin queries: list all bookings by status
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_created ON bookings (created_at DESC);

-- ─── Admin users (simple auth for admin panel) ────────────────────────────────
CREATE TABLE admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
