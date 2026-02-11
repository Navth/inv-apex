/**
 * Parser for Food Money worksheet (Excel)
 * Supports:
 * - emp_id + month columns (01-2025, 02-2025, Jan, Feb with year selector)
 * - emp_id | month | amount (long format)
 */

import * as XLSX from "xlsx";

export interface FoodMoneyRecord {
  emp_id: string;
  month: string; // MM-YYYY
  amount: number;
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function norm(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function normTight(v: unknown): string {
  return norm(v).replace(/\s+/g, "");
}

/**
 * Parse month column header to month number (1-12)
 * Handles: "Jan", "January", "1", "01"
 */
function parseMonthHeader(h: string): number | null {
  const t = normTight(h);
  const num = parseInt(t, 10);
  if (num >= 1 && num <= 12) return num;
  const idx = MONTH_NAMES.findIndex((m) => t.startsWith(m) || t === m);
  if (idx >= 0) return idx + 1;
  return null;
}

/**
 * Parse month-year column like "01-2025" or "Jan-2025"
 */
function parseMonthYearHeader(h: string): { month: number; year: number } | null {
  const t = normTight(h);
  const dash = t.indexOf("-");
  if (dash > 0) {
    const part1 = t.slice(0, dash);
    const part2 = t.slice(dash + 1);
    const year = parseInt(part2, 10);
    if (!Number.isFinite(year) || year < 2000 || year > 2100) return null;
    const monthNum = parseInt(part1, 10);
    if (monthNum >= 1 && monthNum <= 12) return { month: monthNum, year };
    const monthIdx = MONTH_NAMES.findIndex((m) => part1.startsWith(m));
    if (monthIdx >= 0) return { month: monthIdx + 1, year };
  }
  return null;
}

/**
 * Parse Food Money Excel file
 * @param file - Excel file (can have multiple sheets; uses first sheet or sheet named "Food Money")
 * @param sheetYear - Year for month-name columns (Jan, Feb, etc.)
 */
export async function parseFoodMoneyFile(
  file: File,
  sheetYear?: number
): Promise<{ fileName: string; records: FoodMoneyRecord[] }> {
  const reader = new FileReader();
  const bstr = await new Promise<string | ArrayBuffer | null>((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });

  if (!bstr || typeof bstr !== "string") return { fileName: file.name, records: [] };

  const workbook = XLSX.read(bstr, { type: "binary" });
  const sheetName = workbook.SheetNames.find((s) => norm(s).includes("food")) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];

  const year = sheetYear ?? new Date().getFullYear();
  const records: FoodMoneyRecord[] = [];

  if (rows.length < 2) return { fileName: file.name, records: [] };

  const header = rows[0] as unknown[];
  const headerTight = header.map(normTight);

  const empIdCands = ["empid", "emp_id", "empid#", "empno", "empno.", "employeeid", "employee_id"];
  const empIdCol = headerTight.findIndex((h) => empIdCands.some((c) => h.includes(c) || c.includes(h)));
  const monthCol = headerTight.findIndex((h) => norm(h) === "month" || norm(h) === "month-year" || h === "month");
  const amountCol = headerTight.findIndex((h) =>
    ["amount", "foodmoney", "food_money", "foodallowance", "food_allowance", "value"].some((c) => h.includes(c))
  );

  // Format A: emp_id | month | amount (long format)
  if (empIdCol >= 0 && monthCol >= 0 && amountCol >= 0) {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] as unknown[];
      const emp_id = String(row[empIdCol] ?? "").trim();
      const monthVal = String(row[monthCol] ?? "").trim();
      const amount = parseFloat(String(row[amountCol] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
      if (!emp_id) continue;
      let monthStr = "";
      const mmYYYY = monthVal.match(/^(\d{1,2})[-/](\d{4})$/);
      if (mmYYYY) {
        monthStr = `${String(parseInt(mmYYYY[1], 10)).padStart(2, "0")}-${mmYYYY[2]}`;
      } else {
        const m = parseMonthHeader(monthVal);
        if (m) monthStr = `${String(m).padStart(2, "0")}-${year}`;
      }
      if (monthStr && amount >= 0) {
        records.push({ emp_id, month: monthStr, amount });
      }
    }
    return { fileName: file.name, records };
  }

  // Format B: emp_id | Jan | Feb | Mar | ... (month columns)
  const monthCols: { idx: number; monthStr: string }[] = [];
  header.forEach((h, idx) => {
    const my = parseMonthYearHeader(String(h));
    if (my) {
      monthCols.push({
        idx,
        monthStr: `${String(my.month).padStart(2, "0")}-${my.year}`,
      });
    } else {
      const m = parseMonthHeader(String(h));
      if (m) {
        monthCols.push({
          idx,
          monthStr: `${String(m).padStart(2, "0")}-${year}`,
        });
      }
    }
  });

  if (empIdCol >= 0 && monthCols.length > 0) {
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] as unknown[];
      const emp_id = String(row[empIdCol] ?? "").trim();
      if (!emp_id) continue;
      for (const { idx, monthStr } of monthCols) {
        const amount = parseFloat(String(row[idx] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
        if (amount > 0) {
          records.push({ emp_id, month: monthStr, amount });
        }
      }
    }
    return { fileName: file.name, records };
  }

  throw new Error(
    "Invalid food money file format. Expected: emp_id + month columns (Jan, Feb, 01-2025, etc.) or emp_id | month | amount columns."
  );
}
