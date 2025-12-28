-- Complete Database Schema for Payroll System
-- Run this in Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  emp_id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  civil_id TEXT,
  basic_salary DECIMAL(10, 2) NOT NULL,
  food_allowance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  other_allowance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  department TEXT NOT NULL,
  doj DATE NOT NULL,
  internal_department_doj DATE,
  five_year_calc_date DATE,
  indemnity_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  working_hours INTEGER NOT NULL DEFAULT 8,
  category TEXT NOT NULL DEFAULT 'Direct',
  ot_rate_normal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ot_rate_friday DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ot_rate_holiday DECIMAL(10, 2) NOT NULL DEFAULT 0,
  food_allowance_type TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'active',
  accommodation TEXT NOT NULL DEFAULT 'Own'
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  month VARCHAR(7) NOT NULL,
  working_days INTEGER NOT NULL,
  present_days INTEGER NOT NULL,
  absent_days INTEGER NOT NULL,
  ot_hours_normal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ot_hours_friday DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ot_hours_holiday DECIMAL(10, 2) NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  round_off DECIMAL(10, 2),
  comments TEXT,
  dues_earned DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- Create payroll table
CREATE TABLE IF NOT EXISTS payroll (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  month VARCHAR(7) NOT NULL,
  basic_salary DECIMAL(10, 2) NOT NULL,
  ot_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  food_allowance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  gross_salary DECIMAL(10, 2) NOT NULL,
  deductions DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_salary DECIMAL(10, 2) NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  days_worked INTEGER NOT NULL DEFAULT 0,
  dues_earned DECIMAL(10, 2) NOT NULL DEFAULT 0
);

-- Create leaves table
CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(50)
);

-- Create indemnity table
CREATE TABLE IF NOT EXISTS indemnity (
  id SERIAL PRIMARY KEY,
  emp_id VARCHAR(50) NOT NULL UNIQUE,
  years_of_service DECIMAL(10, 2) NOT NULL,
  indemnity_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  paid_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_emp_id ON attendance(emp_id);
CREATE INDEX IF NOT EXISTS idx_attendance_month ON attendance(month);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_id ON payroll(emp_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(month);
CREATE INDEX IF NOT EXISTS idx_leaves_emp_id ON leaves(emp_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_indemnity_emp_id ON indemnity(emp_id);

-- Display success message
SELECT 'Database schema created successfully!' AS message;
