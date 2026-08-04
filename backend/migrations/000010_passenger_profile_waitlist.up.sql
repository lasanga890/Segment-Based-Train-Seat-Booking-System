-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 000010_passenger_profile_waitlist.up.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Add nic_passport column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS nic_passport VARCHAR(50);

-- Saved Frequent Passengers Preset Table
CREATE TABLE IF NOT EXISTS user_frequent_passengers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name     VARCHAR(100) NOT NULL,
    nic_passport  VARCHAR(50) NOT NULL,
    gender        VARCHAR(20) DEFAULT 'OTHER',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Saved Favorite Routes Table
CREATE TABLE IF NOT EXISTS user_favorite_routes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    end_station_id   UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    label            VARCHAR(100),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Waitlist Table
CREATE TABLE IF NOT EXISTS waitlists (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_id      UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    start_station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    end_station_id   UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    start_seq        INTEGER NOT NULL,
    end_seq          INTEGER NOT NULL,
    coach_class      VARCHAR(20) NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'PROMOTED', 'EXPIRED', 'CANCELLED')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    message    TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_frequent_passengers_user ON user_frequent_passengers(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_routes_user ON user_favorite_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_schedule_status ON waitlists(schedule_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON user_notifications(user_id, is_read);
