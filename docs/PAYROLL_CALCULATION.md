# Payroll Calculation System

## Overview

This document explains the payroll calculation logic implemented in the HR Management System, based on the **Salary_Report_10-2025.xlsx** specification. The system uses Kuwait labor law standards with a constant of 208 working hours per month.

---

## 1. Salary Calculation Constants

| Parameter | Formula/Value | Description |
|-----------|---------------|-------------|
| **Days Divisor** | 26 | Standard working days per month (Kuwait labor standard) |
| **Total Monthly Hours** | 26 × Working Hours/Day | Variable based on employee (e.g., 208 for 8h/day, 260 for 10h/day) |
| **Normal OT Multiplier (M_N)** | 1.25 | Factor applied to Hourly Basic Salary for Normal Overtime |
| **Friday OT Multiplier (M_F)** | 1.50 | Factor applied to Hourly Basic Salary for Friday Overtime |
| **Holiday OT Multiplier (M_H)** | 2.00 | Factor applied to Hourly Basic Salary for Holiday Overtime |

### CRITICAL: Monthly Salary Capping Rule

**Employees are monthly salaried, NOT daily wage workers.**

```
IF Worked Days >= 26:
    Basic Salary Payable = Full Monthly Basic Salary (NO proration)
    Other Allowance Payable = Full Monthly Other Allowance (NO proration)
    Food Allowance Payable = Full Monthly Food Allowance (NO proration)
ELSE:
    Basic Salary Payable = (Monthly Basic / 26) × Worked Days (prorated)
    Other Allowance Payable = (Other Allowance / 26) × Worked Days (prorated)
    Food Allowance Payable = (Food Allowance / 26) × Worked Days (prorated)
```

**Why this matters:**
- December 2025 has 31 calendar days, employees may work 27-28 days
- Working MORE than 26 days should NOT increase base salary
- Only absence (< 26 days) reduces salary proportionally
- This prevents the "December Error" where (1250/26) × 27 = 1,298 KD instead of 1,250 KD

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
    IF Worked Days >= 26:
        Food Allowance = employee.food_allowance_amount (FULL - NO proration)
    ELSE:
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

## 5. Attendance Aggregation & Round Off Days

### Multiple Attendance Records Per Month
The system supports multiple attendance records per employee per month. When generating payroll:
- All attendance records for the month are aggregated
- Working days, present days, and OT hours are summed
- Comments from multiple records are concatenated with ";" separator

### Round Off Days (Attendance Adjustment)
The system uses `round_off` field from attendance records if available:
- **Priority 1**: Use `round_off` value if > 0 (attendance adjusted for late/early leave)
- **Priority 2**: Use `present_days` if `round_off` is 0 or not set
- This allows supervisors to adjust attendance for partial days, late arrivals, early departures

**Example:**
```
Employee: Worked 20 days but had 3 days of late arrivals
Present Days: 20
Round Off: 19.5 (adjusted by supervisor)
Used for Calculation: 19.5 days
```

---

## 6. Prorated Components

All earning components are prorated based on worked days using the constant divisor of 26.

### 6.1 Prorated Basic Salary (WITH CAPPING)

**Formula:**
```
IF Worked Days >= 26:
    Earned Basic = Monthly Basic Salary (FULL - NO proration)
ELSE:
    Earned Basic = (Monthly Basic Salary / 26) × Worked Days
```

**Example 1 (Partial Month):**
```
Master Basic Salary: 450 KWD
Worked Days: 19
Earned Basic = (450 / 26) × 19 = 328.85 KWD
```

**Example 2 (Full Month with 27 days - December):**
```
Master Basic Salary: 1,250 KWD
Worked Days: 27
Earned Basic = 1,250.00 KWD (CAPPED - not 1,298.07)
```

### 6.2 Prorated Other Allowance (WITH CAPPING)

**Formula:**
```
IF employee.other_allowance <= 0:
    Earned Other = 0
ELSE IF Worked Days >= 26:
    Earned Other = Other Allowance (FULL - NO proration)
ELSE:
    Earned Other = (Other Allowance / 26) × Worked Days
```

**Example 1 (Full Month):**
```
Master Other Allowance: 25 KWD
Worked Days: 26
Earned Other = 25.00 KWD (FULL)
```

**Example 2 (Full Month - 27 days):**
```
Master Other Allowance: 25 KWD
Worked Days: 27
Earned Other = 25.00 KWD (CAPPED - not 25.96)
```

### 6.3 Prorated Food Allowance (See Section 4)

Only for indirect employees, prorated by worked days.

---

## 7. Dues Earned (Manual Input)

Dues earned is a manual input field in the attendance record that represents additional amounts owed to the employee:
- **Not prorated** - entered as the exact amount to be paid
- **Not subject to OT calculations** - direct payment
- **Common uses**: Corrections from previous months, special compensations, agreed settlements
- **Aggregated**: When multiple attendance records exist for a month, dues are summed

**Formula:**
```
Dues Earned = Sum of all dues_earned from attendance records for the month
```

**Example:**
```
Attendance Record 1 (Week 1-2): Dues = 50 KWD
Attendance Record 2 (Week 3-4): Dues = 25 KWD
Total Dues Earned = 75 KWD (added to net salary)
```

---

## 8. Gross Salary

**Formula:**
```
Gross Salary = Prorated Basic + Prorated Other + Prorated Food + Total OT Pay
```

**Note**: Dues earned is NOT included in gross salary; it's added to net salary.

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

## 9. Net Salary

**Formula:**
```
Net Salary = Gross Salary + Dues Earned - Deductions
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
Dues Earned: 50.00 KWD
Deductions: 0.00 KWD
Net Salary (before rounding): 466.59 KWD
Net Salary (after rounding): 467 KWD
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
- **Working Days**: 26
- **Present Days**: 20
- **Round Off**: 19 (adjusted for late arrivals)
- **Days Used for Calculation**: 19 (round_off takes priority)
- **Normal OT**: 10 hours
- **Friday OT**: 4 hours
- **Holiday OT**: 0 hours
- **Dues Earned**: 50 KWD (manual input)

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

8. Dues Earned:
   Dues = 50.00 KWD (manual input from attendance)

9. Deductions:
   Deductions = 0.00 KWD

10. Net Salary:
    Net (before rounding) = 405.41 + 50.00 - 0.00 = 455.41 KWD
    Net (after rounding) = 455 KWD
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

# Prorated Components (WITH SALARY CAPPING)
IF Worked Days >= 26:
    Earned Basic = Monthly Basic Salary (FULL)
    Earned Other = Other Allowance (FULL)
    Earned Food = Food Allowance (FULL, Indirect only)
ELSE:
    Earned Basic = (Monthly Basic Salary / 26) × Worked Days
    Earned Other = (Other Allowance / 26) × Worked Days
    Earned Food = (Food Allowance / 26) × Worked Days (Indirect only)

# Attendance Days Logic
IF round_off > 0:
    Worked Days = round_off
ELSE:
    Worked Days = present_days

# Final Calculation
Gross Salary = Earned Basic + Earned Other + Earned Food + Total OT Pay
Net Salary = ROUND(Gross Salary + Dues Earned - Deductions)
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
    "days_worked": "26.00",
    "gross_salary": "592.47",
    "deductions": "0.00",
    "dues_earned": "50.00",
    "net_salary": "642.47",
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
  round_off: decimal (optional - adjusted days for calculations)
  ot_hours_normal: decimal
  ot_hours_friday: decimal
  ot_hours_holiday: decimal
  dues_earned: decimal (default: 0) // Manual input for additional payments
  comments: string (optional) // Attendance notes
}
```

### Payroll Table
```typescript
{
  emp_id: string
  month: string (MM-YYYY format)
  basic_salary: decimal (prorated)
  ot_amount: decimal
  food_allowance: decimal
  days_worked: decimal (actual days used for calculation)
  gross_salary: decimal
  deductions: decimal
  dues_earned: decimal // Added to net salary
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
- Employees can have one or multiple attendance records per month (aggregated)
- Missing attendance records result in a warning and the employee is skipped
- Attendance data must include working days, present days, and OT hours
- **Round off days take priority**: If `round_off > 0`, use it instead of `present_days`
- **Employees with zero working days are skipped** (no payroll generated)
- **Employees with zero present/round_off days are skipped** (no work performed, no pay)
- **Multiple records aggregated**: Working days, present days, OT hours, and dues summed

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
