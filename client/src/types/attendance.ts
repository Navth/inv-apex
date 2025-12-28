export interface AttendanceRecord {
  emp_id: string;
  worked_days: number;
  total_working_days?: number;
  round_off?: number;
  normal_ot: number;
  friday_ot: number;
  holiday_ot: number;
  dues_earned?: number;
  unpaid_days: number;
  isValid: boolean;
  error?: string;
  comments?: string;
  dailyStatus?: string[];
}
