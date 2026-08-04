DROP INDEX IF EXISTS idx_schedules_batch_id;
ALTER TABLE schedules DROP COLUMN IF EXISTS batch_id;
