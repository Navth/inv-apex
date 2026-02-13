import * as XLSX from "xlsx";

export interface EmployeeParseRecord {
  emp_id: string;
  name: string;
  designation: string;
  department: string;
  category?: string;
  civil_id?: string | null;
  doj: string;
  internal_department_doj?: string | null;
  basic_salary: number;
  other_allowance: number;
  food_allowance: number;
  working_hours: number;
  indemnity_rate: number;
}

const norm = (v: unknown) => String(v ?? "").trim();
const normKey = (v: unknown) => norm(v).toLowerCase().replace(/\s+/g, "").replace(/_/g, "");

/** Normalize date from DD/MM/YYYY or YYYY-MM-DD etc. to YYYY-MM-DD for API */
function toDateString(val: unknown): string {
  const s = norm(val);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString().slice(0, 10);
}

/** Parse number; 0 if invalid */
function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export interface EmployeeParseResult {
  records: EmployeeParseRecord[];
  errors: string[];
}

/**
 * Parse Excel or CSV file into employee records for bulk upload.
 * Tolerates common header names: Emp ID / emp_id / Employee ID, Name, Designation, Department / Dept, DOJ, Basic Salary, etc.
 */
export async function parseEmployeeFile(file: File): Promise<EmployeeParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][];

  if (rows.length < 2) {
    return { records: [], errors: ["File has no data rows."] };
  }

  const headerRow = rows[0].map(normKey);
  const records: EmployeeParseRecord[] = [];
  const errors: string[] = [];

  const col = (cands: string[]) => {
    const normCands = cands.map((c) => normKey(c));
    for (let i = 0; i < headerRow.length; i++) {
      const h = headerRow[i];
      if (normCands.some((c) => h === c || h.includes(c) || c.includes(h))) return i;
    }
    return -1;
  };

  const empIdCol = col(["empid", "emp_id", "employeeid", "emp no", "empno", "id"]);
  const nameCol = col(["name", "employeename", "employee name"]);
  const designationCol = col(["designation", "title", "position", "job title"]);
  const deptCol = col(["department", "dept", "department name", "dept name"]);
  const categoryCol = col(["category", "type"]);
  const civilIdCol = col(["civilid", "civil_id", "civil id", "cid"]);
  const dojCol = col(["doj", "dateofjoining", "joining date", "join date", "start date"]);
  const internalDojCol = col(["internaldepartmentdoj", "internal doj", "dept doj"]);
  const basicCol = col(["basicsalary", "basic_salary", "basic", "salary", "basic salary"]);
  const otherCol = col(["otherallowance", "other_allowance", "other allowance", "allowance"]);
  const foodCol = col(["foodallowance", "food_allowance", "food allowance", "food"]);
  const hoursCol = col(["workinghours", "working_hours", "hours", "working hours"]);
  const indemnityCol = col(["indemnityrate", "indemnity_rate", "indemnity", "indemnity rate"]);

  if (empIdCol === -1) errors.push("No column found for Employee ID (look for 'Emp ID', 'emp_id', 'Employee ID').");
  if (nameCol === -1) errors.push("No column found for Name.");
  if (designationCol === -1) errors.push("No column found for Designation.");
  if (dojCol === -1) errors.push("No column found for DOJ (Date of Joining).");
  if (basicCol === -1) errors.push("No column found for Basic Salary.");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (idx: number) => (idx >= 0 && row[idx] !== undefined ? row[idx] : "");
    const emp_id = norm(get(empIdCol));
    const name = norm(get(nameCol));
    const designation = norm(get(designationCol));
    const department = norm(get(deptCol)) || "General";
    if (!emp_id || !name || !designation) {
      errors.push(`Row ${i + 1}: missing emp_id, name, or designation.`);
      continue;
    }
    const doj = toDateString(get(dojCol));
    if (!doj) errors.push(`Row ${i + 1} (${emp_id}): invalid or missing DOJ.`);

    records.push({
      emp_id,
      name,
      designation,
      department,
      category: norm(get(categoryCol)) || "Direct",
      civil_id: norm(get(civilIdCol)) || null,
      doj,
      internal_department_doj: norm(get(internalDojCol)) || null,
      basic_salary: toNum(get(basicCol)),
      other_allowance: toNum(get(otherCol)),
      food_allowance: toNum(get(foodCol)),
      working_hours: toNum(get(hoursCol)) || 8,
      indemnity_rate: toNum(get(indemnityCol)) || 15,
    });
  }

  return { records, errors };
}
