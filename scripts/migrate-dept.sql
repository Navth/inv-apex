-- Migration: Add dept table and refactor employees.department -> employees.dept_id
-- Run this in Supabase SQL Editor (Project > SQL Editor) after backing up your data.
-- Prerequisite: employees table must exist with a "department" (TEXT) column.
-- Existing department values are matched to dept.name (case-sensitive); unknown names get "General".
-- After running, application expects employees.dept_id (FK to dept) and no department column.

-- 1. Create dept table
CREATE TABLE IF NOT EXISTS dept (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- 2. Seed current departments (from employee table usage)
INSERT INTO dept (name) VALUES
  ('APEX'),
  ('EWC'),
  ('Flow Line'),
  ('General'),
  ('KOC'),
  ('Logistics'),
  ('Rehab'),
  ('SABIC')
ON CONFLICT (name) DO NOTHING;

-- 3. Add dept_id to employees (nullable first for migration)
ALTER TABLE employees ADD COLUMN IF NOT EXISTS dept_id INTEGER;

-- 4. Backfill dept_id from department name (match existing rows to dept)
UPDATE employees e
SET dept_id = d.id
FROM dept d
WHERE e.department = d.name
  AND e.dept_id IS NULL;

-- 5. Assign any unmapped employees to 'General' (if department was free text)
UPDATE employees e
SET dept_id = (SELECT id FROM dept WHERE name = 'General' LIMIT 1)
WHERE e.dept_id IS NULL;

-- 6. Make dept_id NOT NULL
ALTER TABLE employees ALTER COLUMN dept_id SET NOT NULL;

-- 7. Add foreign key
ALTER TABLE employees
  ADD CONSTRAINT fk_employees_dept
  FOREIGN KEY (dept_id) REFERENCES dept(id);

-- 8. Drop old department column
ALTER TABLE employees DROP COLUMN IF EXISTS department;

-- 9. Index for lookups
CREATE INDEX IF NOT EXISTS idx_employees_dept_id ON employees(dept_id);

SELECT 'Dept migration completed. employees now reference dept(id).' AS message;
