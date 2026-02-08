-- Migration: Attendance by department (mid-month transfers)
-- Run when you need to upload separate attendance sheets per department.
-- Adds dept_id so we replace only that department's slice for the month.

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS dept_id INTEGER REFERENCES dept(id);

COMMENT ON COLUMN attendance.dept_id IS 'When set: this row is the attendance slice for this dept (enables multiple rows per emp per month).';

SELECT 'Attendance dept_id migration applied.' AS message;
