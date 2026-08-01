-- Add is_active to stations (safe to add, existing rows default to TRUE)
ALTER TABLE stations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add train_id to coaches so each train can have its own coach layout
-- First create a new coaches table structure linked to trains
-- We add train_id as optional (NULL = shared/legacy), then update seed data
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS train_id UUID REFERENCES trains(id) ON DELETE CASCADE;

-- Link existing coaches to the first two trains as an example
UPDATE coaches SET train_id = '11111111-1111-1111-1111-111111111111' WHERE coach_number IN (1, 2, 3, 4);
