/**
 * Parse Excel or CSV file for salary history bulk import (migration).
 * Expected columns (flexible names): emp_id, effective_month, basic_salary, other_allowance, food_allowance_amount, working_hours, effective_from_day, notes.
 */

import * as XLSX from "xlsx";
import type { BulkImportRecord } from "@/api/salaryHistory";

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, "");

const COLUMN_ALIASES: Record<string, string[]> = {
  emp_id: ["empid", "emp_id", "employeeid", "emp no", "empno", "id"],
  effective_month: ["effectivemonth", "effective_month", "month", "period", "mm-yyyy", "mmyyyy"],
  basic_salary: ["basicsalary", "basic_salary", "basic", "salary", "basic salary"],
  other_allowance: ["otherallowance", "other_allowance", "other", "allowance"],
  food_allowance_amount: ["foodallowance", "food_allowance", "food", "food allowance"],
  working_hours: ["workinghours", "working_hours", "hours", "hrs", "working hours"],
  effective_from_day: ["effectivefromday", "effective_from_day", "fromday", "from_day", "increment day", "day"],
  notes: ["notes", "note", "remarks", "reason"],
};

function findColumnIndex(headerRow: string[], key: string): number {
  const aliases = COLUMN_ALIASES[key];
  if (!aliases) return -1;
  for (let i = 0; i < headerRow.length; i++) {
    const h = norm(headerRow[i]);
    if (aliases.some((a) => h === a || h.includes(a))) return i;
  }
  return -1;
}

function parseMonth(val: unknown): string {
  const s = String(val ?? "").trim();
  if (!s) return "";
  // MM-YYYY (e.g. 3-2024 or 03-2024)
  const m1 = s.match(/^(\d{1,2})-(\d{4})$/);
  if (m1) return `${m1[1].padStart(2, "0")}-${m1[2]}`;
  // YYYY-MM (e.g. 2024-03)
  const m2 = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m2) return `${m2[2].padStart(2, "0")}-${m2[1]}`;
  // Excel date number
  const n = Number(s);
  if (!isNaN(n) && n > 0) {
    const d = XLSX.SSF.parse_date_code(n);
    if (d) return `${String(d.m).padStart(2, "0")}-${d.y}`;
  }
  return s;
}

export interface ParseResult {
  records: BulkImportRecord[];
  fileName: string;
  errors: string[];
}

export async function parseSalaryHistoryFile(file: File): Promise<ParseResult> {
  const errors: string[] = [];
  const records: BulkImportRecord[] = [];

  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][];

  if (rows.length < 2) {
    return { records: [], fileName: file.name, errors: ["File has no data rows"] };
  }

  const headerRow = rows[0].map((c) => String(c ?? ""));
  const empIdCol = findColumnIndex(headerRow, "emp_id");
  const monthCol = findColumnIndex(headerRow, "effective_month");
  const basicCol = findColumnIndex(headerRow, "basic_salary");

  if (empIdCol < 0 || monthCol < 0 || basicCol < 0) {
    errors.push("Required columns not found. Need: Employee ID (emp_id), Effective Month (MM-YYYY), Basic Salary.");
    return { records: [], fileName: file.name, errors };
  }

  const otherCol = findColumnIndex(headerRow, "other_allowance");
  const foodCol = findColumnIndex(headerRow, "food_allowance_amount");
  const hoursCol = findColumnIndex(headerRow, "working_hours");
  const fromDayCol = findColumnIndex(headerRow, "effective_from_day");
  const notesCol = findColumnIndex(headerRow, "notes");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (col: number) => (col >= 0 && row[col] !== undefined && row[col] !== null ? row[col] : "");
    const emp_id = String(get(empIdCol)).trim();
    const effective_month = parseMonth(get(monthCol));
    const basic_salary = get(basicCol);

    if (!emp_id || !effective_month) {
      errors.push(`Row ${i + 1}: missing Employee ID or Month`);
      continue;
    }
    if (!/^\d{2}-\d{4}$/.test(effective_month)) {
      errors.push(`Row ${i + 1}: invalid month "${effective_month}" (use MM-YYYY)`);
      continue;
    }
    const basicNum = Number(basic_salary);
    if (isNaN(basicNum) || basicNum < 0) {
      errors.push(`Row ${i + 1}: invalid basic salary`);
      continue;
    }

    const fromDayRaw = fromDayCol >= 0 ? row[fromDayCol] : null;
    let effective_from_day: number | null = null;
    if (fromDayRaw !== undefined && fromDayRaw !== null && fromDayRaw !== "") {
      const d = Number(fromDayRaw);
          if (!isNaN(d) && d >= 1 && d <= 31) effective_from_day = Math.floor(d);
    }

    records.push({
      emp_id,
      effective_month,
      basic_salary: String(basicNum),
      other_allowance: otherCol >= 0 ? Number(get(otherCol)) || 0 : 0,
      food_allowance_amount: foodCol >= 0 ? Number(get(foodCol)) || 0 : 0,
      working_hours: hoursCol >= 0 ? Number(get(hoursCol)) || 8 : 8,
      effective_from_day,
      notes: notesCol >= 0 ? String(get(notesCol)).trim() || undefined : undefined,
    });
  }

  return { records, fileName: file.name, errors };
}
