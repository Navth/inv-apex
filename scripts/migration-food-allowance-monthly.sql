-- Food money from separate worksheet: monthly amount per employee.
-- When set, used for food allowance calculation instead of employee.food_allowance_amount.
CREATE TABLE IF NOT EXISTS employee_food_allowance_monthly (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  month VARCHAR(7) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_food_allowance_monthly_emp_month
  ON employee_food_allowance_monthly (emp_id, month);
