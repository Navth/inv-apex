-- Verify other_allowance values for employees with discrepancies
SELECT 
    emp_id,
    name,
    basic_salary,
    other_allowance,
    food_allowance_amount,
    category,
    department
FROM employees
WHERE emp_id IN ('1135', '1148', '1130', '1147', '1146', '1131')
ORDER BY emp_id;

-- Expected for employee 1135: other_allowance should be 125
-- If it's incorrect, update it:
-- UPDATE employees SET other_allowance = 125 WHERE emp_id = '1135';

-- After updating, regenerate payroll:
-- DELETE FROM payroll WHERE month = '08-2025';
