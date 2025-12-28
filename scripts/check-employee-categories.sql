-- Check employee categories and food allowances
-- This will help identify employees with incorrect category settings

SELECT 
    emp_id,
    name,
    category,
    food_allowance_amount,
    other_allowance,
    department
FROM employees
WHERE emp_id IN ('1130', '1147', '1146', '1148', '1135')
ORDER BY emp_id;

-- Expected results:
-- Direct employees should have category = 'Direct'
-- Indirect employees should have category = 'Indirect'

-- To fix Direct employees who are incorrectly set:
-- UPDATE employees SET category = 'Direct' WHERE emp_id IN ('1130', '1147', '1146', '1148');

-- To fix Indirect employees who are incorrectly set:
-- UPDATE employees SET category = 'Indirect' WHERE emp_id IN ('1135');

-- After updating categories, DELETE and REGENERATE payroll for that month:
-- DELETE FROM payroll WHERE month = '08-2025';
-- Then use the UI to regenerate payroll
