# Payroll Calculation System

## Overview

This document explains the payroll calculation logic implemented in the HR Management System, based on the **Salary_Report_10-2025.xlsx** specification. The system uses Kuwait labor law standards with a constant of 208 working hours per month.

---

## 1. Salary Calculation Constants

| Parameter | Formula/Value | Description |
|-----------|---------------|-------------|
| **Days Divisor** | 26 | Used for prorating salary components by worked days |
| **Total Monthly Hours** | 26 × Working Hours/Day | Variable based on employee (e.g., 208 for 8h/day, 260 for 10h/day) |
| **Normal OT Multiplier (M_N)** | 1.25 | Factor applied to Hourly Basic Salary for Normal Overtime |
| **Friday OT Multiplier (M_F)** | 1.50 | Factor applied to Hourly Basic Salary for Friday Overtime |
| **Holiday OT Multiplier (M_H)** | 2.00 | Factor applied to Hourly Basic Salary for Holiday Overtime |

---

## 2. Hourly Basic Salary (HBS) for OT Rates

The Hourly Basic Salary is used ONLY for calculating overtime rates. It is derived from the FULL monthly basic salary and considers the employee's working hours per day.

### Formula:
```
HBS = Full Monthly Basic Salary ÷ (26 × Working Hours Per Day)
```

### Examples:

**8-Hour Employee:**
```
Basic Salary: 500 KWD
Working Hours: 8 hours/day
Total Monthly Hours = 26 × 8 = 208
HBS = 500 ÷ 208 = 2.404 KWD/hour
```

**10-Hour Employee:**
```
Basic Salary: 500 KWD
Working Hours: 10 hours/day
Total Monthly Hours = 26 × 10 = 260
HBS = 500 ÷ 260 = 1.923 KWD/hour
```

### Important Note:
- HBS is calculated from the full monthly salary, not prorated
- Takes into account employee's working hours per day (8h, 10h, etc.)
- Used only for determining OT rates
- The actual basic salary paid is prorated by days, not hours (see section 5)

---

## 3. Overtime Rates and Pay

Overtime pay is calculated by multiplying the Hourly Basic Salary (HBS) by the corresponding multiplier and the number of overtime hours.

### Component Table:

| Component | Rate Formula | Pay Formula |
|-----------|--------------|-------------|
| **Normal OT Rate (R_N)** | HBS × M_N (1.25) | Normal OT Hours × R_N |
| **Friday OT Rate (R_F)** | HBS × M_F (1.50) | Friday OT Hours × R_F |
| **Holiday OT Rate (R_H)** | HBS × M_H (2.00) | Holiday OT Hours × R_H |
| **Total OT Pay** | - | Normal OT Pay + Friday OT Pay + Holiday OT Pay |

### Formulas:

```
Normal OT Rate = HBS × 1.25
Friday OT Rate = HBS × 1.50
Holiday OT Rate = HBS × 2.00

Normal OT Pay = Normal OT Hours × Normal OT Rate
Friday OT Pay = Friday OT Hours × Friday OT Rate
Holiday OT Pay = Holiday OT Hours × Holiday OT Rate

Total OT Pay = Normal OT Pay + Friday OT Pay + Holiday OT Pay
```

### Example:
```
HBS = 2.404 KWD/hour
Normal OT Hours = 10

Normal OT Rate = 2.404 × 1.25 = 3.005 KWD/hour
Normal OT Pay = 10 × 3.005 = 30.05 KWD
```

### Custom OT Rates:
If an employee has custom OT rates set in their profile (`ot_rate_normal`, `ot_rate_friday`, `ot_rate_holiday`), those rates are used instead of the calculated rates.

---

## 4. Food Allowance (Accommodation-Based & Prorated)

**Positive Logic Implementation**: Default to 0, only pay if ALL conditions are met (safe default).

### Eligibility Rules (ALL must be true):

1. **Category Check**: Employee category must be "Indirect"
2. **Accommodation Check**: Accommodation contains "own" (fuzzy match, case-insensitive)
3. **Amount Check**: Food allowance amount must be > 0

### Robust String Matching:

The system uses fuzzy matching to handle real-world data variations:
- Converts accommodation value to string
- Strips whitespace from both ends
- Converts to lowercase
- Checks if "own" appears anywhere in the string

**Examples**:
- ✅ Matches: "Own", "own", "Own House", "own ", "  Own  "
- ❌ Does NOT match: "Company", "Camp", "Souq Sabha", NULL, empty string

### Formula:
```
# Default is SAFE (0)
Food Allowance = 0

# Only change if ALL conditions met
IF (Employee.category == "Indirect") 
   AND ("own" in Employee.accommodation.strip().lower()):
    Food Allowance = (employee.food_allowance_amount / 26) × Worked Days
ELSE:
    Food Allowance = 0  # Safe default
```

### Why Positive Logic?

**Risk Mitigation**: 
- NULL or empty accommodation → 0 allowance (safe)
- Typos or variations → Caught by fuzzy matching  
- Unknown accommodation types → 0 allowance (safe)
- Direct employees → 0 allowance (correct)

### Example:
```
Employee: Own Accommodation
Master Food Allowance: 25 KWD
Worked Days: 19

Food Allowance = (25 / 26) × 19 = 18.27 KWD

---

Employee: Company Accommodation
Master Food Allowance: 25 KWD
Worked Days: 19

Food Allowance = 0 KWD (food provided by company)
```

---

## 5. Prorated Components

All earning components are prorated based on worked days using the constant divisor of 26.

### 5.1 Prorated Basic Salary

**Formula:**
```
Earned Basic = (Monthly Basic Salary / 26) × Worked Days
```

**Example:**
```
Master Basic Salary: 450 KWD
Worked Days: 19
Earned Basic = (450 / 26) × 19 = 328.85 KWD
```

### 5.2 Prorated Other Allowance

**Formula:**
```
IF employee.other_allowance > 0:
    Earned Other = (Other Allowance / 26) × Worked Days
ELSE:
    Earned Other = 0
```

**Example:**
```
Master Other Allowance: 25 KWD
Worked Days: 26
Earned Other = (25 / 26) × 26 = 25.00 KWD
```

### 5.3 Prorated Food Allowance (See Section 4)

Only for indirect employees, prorated by worked days.

---

## 6. Gross Salary

**Formula:**
```
Gross Salary = Prorated Basic + Prorated Other + Prorated Food + Total OT Pay
```

### Components:
1. **Prorated Basic Salary**: `(Monthly Basic / 26) × Worked Days`
2. **Prorated Other Allowance**: `(Other Allowance / 26) × Worked Days`
3. **Prorated Food Allowance**: `(Food Allowance / 26) × Worked Days` (Indirect only)
4. **Total OT Pay**: Sum of all OT payments

### Example:
```
Prorated Basic: 328.85 KWD
Prorated Other: 25.00 KWD
Prorated Food: 18.27 KWD (Indirect)
Total OT Pay: 44.47 KWD

Gross Salary = 328.85 + 25.00 + 18.27 + 44.47 = 416.59 KWD
```

---

## 7. Net Salary

**Formula:**
```
Net Salary = Gross Salary - Deductions
```

### Rounding Rule:
Net salary is rounded to the nearest integer:
- If decimal >= 0.5: Round up
- If decimal < 0.5: Round down

### Deductions:
Currently, the system has deductions set to 0. This can be extended in the future to include:
- PACI (Kuwait social security) contributions
- Loan repayments
- Insurance premiums
- Other statutory or voluntary deductions

### Example:
```
Gross Salary: 416.59 KWD
Deductions: 0.00 KWD
Net Salary (before rounding): 416.59 KWD
Net Salary (after rounding): 417 KWD
```

---

## Complete Calculation Example

### Employee Details:
- **Category**: Indirect
- **Master Basic Salary**: 450 KWD
- **Other Allowance**: 25 KWD
- **Food Allowance**: 25 KWD
- **OT Rates**: Default (no custom rates)

### Attendance Data:
- **Worked Days**: 19
- **Normal OT**: 10 hours
- **Friday OT**: 4 hours
- **Holiday OT**: 0 hours

### Step-by-Step Calculation:

```
1. Hourly Basic Salary (HBS) for OT rates:
   HBS = 450 ÷ 208 = 2.163 KWD/hour

2. Overtime Rates:
   Normal OT Rate = 2.163 × 1.25 = 2.704 KWD/hour
   Friday OT Rate = 2.163 × 1.50 = 3.245 KWD/hour
   Holiday OT Rate = 2.163 × 2.00 = 4.326 KWD/hour

3. Overtime Pay:
   Normal OT Pay = 10 × 2.704 = 27.04 KWD
   Friday OT Pay = 4 × 3.245 = 12.98 KWD
   Holiday OT Pay = 0 × 4.326 = 0.00 KWD
   Total OT Pay = 27.04 + 12.98 + 0.00 = 40.02 KWD

4. Prorated Basic Salary:
   Earned Basic = (450 / 26) × 19 = 328.85 KWD

5. Prorated Other Allowance:
   Earned Other = (25 / 26) × 19 = 18.27 KWD

6. Prorated Food Allowance (Indirect employee):
   Earned Food = (25 / 26) × 19 = 18.27 KWD

7. Gross Salary:
   Gross = 328.85 + 18.27 + 18.27 + 40.02 = 405.41 KWD

8. Deductions:
   Deductions = 0.00 KWD

9. Net Salary:
   Net (before rounding) = 405.41 KWD
   Net (after rounding) = 405 KWD
```

---

## Summary of Formulas

### Core Formulas:
```
# Constants
DAYS_DIVISOR = 26
TOTAL_MONTHLY_HOURS = 26 × Working_Hours_Per_Day  # e.g., 208 or 260

# OT Rate Calculation (uses full monthly salary and employee's working hours)
HBS = Full Monthly Basic Salary ÷ (26 × Working_Hours_Per_Day)

Normal OT Rate = HBS × 1.25 (or custom rate)
Friday OT Rate = HBS × 1.50 (or custom rate)
Holiday OT Rate = HBS × 2.00 (or custom rate)

# OT Pay Calculation
Normal OT Pay = Normal OT Hours × Normal OT Rate
Friday OT Pay = Friday OT Hours × Friday OT Rate
Holiday OT Pay = Holiday OT Hours × Holiday OT Rate
Total OT Pay = Normal OT Pay + Friday OT Pay + Holiday OT Pay

# Special Rule: Rehab Indirect Employees
IF department == "Rehab" AND category == "Indirect":
    Total OT Pay = Total OT Pay × 0.70

# Prorated Components
Earned Basic = (Monthly Basic Salary / 26) × Worked Days
Earned Other = (Other Allowance / 26) × Worked Days
Earned Food = (Food Allowance / 26) × Worked Days (Indirect only, 0 for Direct)

# Final Calculation
Gross Salary = Earned Basic + Earned Other + Earned Food + Total OT Pay
Net Salary = ROUND(Gross Salary - Deductions)
```

---

## API Usage

### Generate Payroll

**Endpoint:**
```
POST /api/payroll/generate
```

**Request Body:**
```json
{
  "month": "MM-YYYY"
}
```

**Response:**
```json
{
  "created": [...],
  "count": 10,
  "message": "Payroll generated for 10 employee(s)",
  "warnings": [
    {
      "emp_id": "EMP001",
      "name": "John Doe",
      "error": "No attendance data"
    }
  ]
}
```

### Get Payroll

**Endpoint:**
```
GET /api/payroll?month=MM-YYYY
```

**Response:**
```json
[
  {
    "id": 1,
    "emp_id": "EMP001",
    "month": "10-2025",
    "basic_salary": "500.00",
    "ot_amount": "44.47",
    "food_allowance": "48.00",
    "gross_salary": "592.47",
    "deductions": "0.00",
    "net_salary": "592.47",
    "generated_at": "2025-11-17T..."
  }
]
```

---

## Database Schema

### Employee Table
```typescript
{
  emp_id: string (unique)
  basic_salary: decimal
  ot_rate_normal: decimal (default: 0)    // Custom rate per hour
  ot_rate_friday: decimal (default: 0)    // Custom rate per hour
  ot_rate_holiday: decimal (default: 0)   // Custom rate per hour
  food_allowance_type: "none" | "fixed" | "per_day"
  food_allowance_amount: decimal (default: 0)
  status: "active" | "inactive" | "terminated"
}
```

### Attendance Table
```typescript
{
  emp_id: string
  month: string (MM-YYYY format)
  working_days: integer
  present_days: integer
  absent_days: integer
  ot_hours_normal: decimal
  ot_hours_friday: decimal
  ot_hours_holiday: decimal
}
```

### Payroll Table
```typescript
{
  emp_id: string
  month: string (MM-YYYY format)
  basic_salary: decimal
  ot_amount: decimal
  food_allowance: decimal
  gross_salary: decimal
  deductions: decimal
  net_salary: decimal
  generated_at: timestamp
}
```

---

## Business Rules

### Employee Eligibility
- Only **active** employees are included in payroll generation
- Employees must have attendance records for the selected month
- Inactive or terminated employees are automatically skipped

### Attendance Validation
- Each employee must have exactly one attendance record per month
- Missing attendance records result in a warning and the employee is skipped
- Attendance data must include working days, present days, and OT hours
- **Employees with zero working days are skipped** (no payroll generated)
- **Employees with zero present days are skipped** (no work performed, no pay)

### Leave Impact
- Approved leaves remove food allowance eligibility
- Leave days should be recorded as absent days in attendance
- The basic salary remains unchanged regardless of leave days

### Month Format
- Format: `MM-YYYY` (e.g., "10-2025" for October 2025)
- Used consistently across attendance and payroll tables

---

## Implementation Notes

1. **Precision**: All calculations use 3 decimal places internally for accuracy
2. **Rounding**: Final payroll amounts are rounded to 2 decimal places for display
3. **Logging**: Detailed calculation logs are generated during payroll processing
4. **Validation**: Employee IDs in attendance must exist in employees table
5. **Idempotency**: Generating payroll multiple times for the same month creates new records

---

## Future Enhancements

Potential improvements to consider:
- PACI (Kuwait social security) deductions calculation
- Tax calculations if applicable
- Bonus and incentive management
- Loan deduction tracking
- Insurance premium deductions
- Export to accounting systems (CSV, Excel, PDF)
- Payslip generation and email distribution
- Multi-currency support
- Approval workflow with multiple levels
- Audit trail for payroll changes
