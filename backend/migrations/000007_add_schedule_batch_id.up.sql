ALTER TABLE schedules ADD COLUMN IF NOT EXISTS batch_id UUID;
CREATE INDEX IF NOT EXISTS idx_schedules_batch_id ON schedules(batch_id);
