-- Truncate employees and all tables that reference them.
-- Omits employee_food_allowance_monthly (create that table if you use it).
-- Run before re-uploading master sheet. Keeps dept and users.

TRUNCATE TABLE
  attendance,
  payroll,
  leaves,
  indemnity,
  employee_salary_history,
  employees
RESTART IDENTITY
CASCADE;

SELECT 'Employees and related data truncated.' AS message;
