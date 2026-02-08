-- Migration: Historical salary data and migrated payroll
-- Run this after deploying the historical salary / payroll changes.
-- Safe to run on existing DB: adds columns with defaults.

-- Employee salary history: mid-month increment (from which day this salary applies, 1-31)
ALTER TABLE employee_salary_history
  ADD COLUMN IF NOT EXISTS effective_from_day INTEGER;

-- Employee salary history: category and accommodation for correct food-allowance in past months
ALTER TABLE employee_salary_history
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Direct';
ALTER TABLE employee_salary_history
  ADD COLUMN IF NOT EXISTS accommodation TEXT NOT NULL DEFAULT 'Own';
ALTER TABLE employee_salary_history
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'system';

-- Payroll: mark calculated vs migrated so migrated rows are not overwritten by Generate
ALTER TABLE payroll
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'calculated';

-- Index for effective salary lookup (latest effective_month <= month per employee)
CREATE INDEX IF NOT EXISTS idx_employee_salary_history_emp_effective
  ON employee_salary_history(emp_id, effective_month DESC);

SELECT 'Historical salary migration applied.' AS message;
