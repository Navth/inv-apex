import XLSX from "xlsx";
import ExcelJS from "exceljs";
import { join } from "path";

const dir = "c:/Users/Lenovo/Desktop/apex/inv-apex";
const masterSheetPath = join(dir, "Master sheet.xlsx");
const masterDataPath = join(dir, "Masterdata for software development with department wise breakup and indemnitycalculation dtd 21.1.xlsx");

function toNum(v) {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toStr(v) {
  return String(v ?? "").trim();
}

function excelDateToISO(val) {
  if (!val) return "";
  if (typeof val === "number" && val > 25569) {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return toStr(val);
}

// Read both workbooks
const wbMaster = XLSX.readFile(masterSheetPath);
const wbData = XLSX.readFile(masterDataPath);

const employees = new Map(); // emp_id -> record

// 1. PRIMARY: From Masterdata - "New mastersheet" only
const newMasterRows = XLSX.utils.sheet_to_json(wbData.Sheets["New mastersheet"], { header: 1, defval: "" });
for (let i = 1; i < newMasterRows.length; i++) {
  const row = newMasterRows[i] || [];
  const empId = toStr(row[1]); // Employee No
  if (!empId) continue;
  employees.set(empId, {
    emp_id: empId,
    name: toStr(row[2]),
    designation: toStr(row[3]),
    department: toStr(row[9]) || "General",
    basic_salary: toNum(row[6]),
    food_allowance_amount: toNum(row[7]),
    other_allowance: toNum(row[8]),
    doj: excelDateToISO(row[10]),
    internal_department_doj: excelDateToISO(row[11]),
    five_year_calc_date: excelDateToISO(row[12]),
    indemnity_rate: toNum(row[13]) || 15,
    working_hours: toNum(row[14]) || 8,
    category: toStr(row[15]) || "Direct",
    source: "New mastersheet",
  });
}

// 2. MERGE: Master sheet - "Master" - add employees not in New mastersheet, fill gaps for existing
const masterRows = XLSX.utils.sheet_to_json(wbMaster.Sheets["Master"], { header: 1, defval: "" });
for (let i = 1; i < masterRows.length; i++) {
  const row = masterRows[i] || [];
  const empId = toStr(row[1]); // EMP ID
  if (!empId) continue;
  const existing = employees.get(empId);
  if (existing) {
    // New mastersheet wins - only fill in empty/zero fields from Master sheet
    if (!existing.basic_salary && toNum(row[5]) > 0) existing.basic_salary = toNum(row[5]);
    if (!existing.food_allowance_amount && toNum(row[6]) > 0) existing.food_allowance_amount = toNum(row[6]);
    if (!existing.other_allowance && toNum(row[7]) > 0) existing.other_allowance = toNum(row[7]);
    if (!existing.doj && excelDateToISO(row[8])) existing.doj = excelDateToISO(row[8]);
    if (!existing.working_hours && toNum(row[9]) > 0) existing.working_hours = toNum(row[9]);
    if ((!existing.department || existing.department === "General") && toStr(row[4])) existing.department = toStr(row[4]);
    if (!existing.category && toStr(row[10])) existing.category = toStr(row[10]);
  } else {
    employees.set(empId, {
      emp_id: empId,
      name: toStr(row[2]),
      designation: toStr(row[3]),
      department: toStr(row[4]) || "General",
      basic_salary: toNum(row[5]),
      food_allowance_amount: toNum(row[6]),
      other_allowance: toNum(row[7]),
      doj: excelDateToISO(row[8]),
      working_hours: toNum(row[9]) || 8,
      category: toStr(row[10]) || "Direct",
      internal_department_doj: "",
      five_year_calc_date: "",
      indemnity_rate: 15,
      source: "Master sheet - Master",
    });
  }
}

// 3. MERGE: Master sheet - "For food money calculation" - update food allowance
const foodRows = XLSX.utils.sheet_to_json(wbMaster.Sheets["For food money calculation"], { header: 1, defval: "" });
for (let i = 1; i < foodRows.length; i++) {
  const row = foodRows[i] || [];
  const empId = toStr(row[1]);
  if (!empId) continue;
  const foodAmt = toNum(row[5]);
  const existing = employees.get(empId);
  if (existing) {
    existing.food_allowance_amount = foodAmt;
  } else {
    employees.set(empId, {
      emp_id: empId,
      name: toStr(row[2]),
      designation: toStr(row[3]),
      department: toStr(row[4]) || "General",
      basic_salary: 0,
      food_allowance_amount: foodAmt,
      other_allowance: 0,
      doj: "",
      internal_department_doj: "",
      five_year_calc_date: "",
      indemnity_rate: 15,
      working_hours: 8,
      category: toStr(row[6]) || "Direct",
      source: "For food money calculation",
    });
  }
}

// Build output - no civil_id
const headers = [
  "emp_id", "name", "designation", "department",
  "basic_salary", "food_allowance_amount", "other_allowance",
  "doj", "internal_department_doj", "five_year_calc_date",
  "indemnity_rate", "working_hours", "category", "status", "accommodation"
];

const wbOut = new ExcelJS.Workbook();
const ws = wbOut.addWorksheet("Combined Master", { views: [{ state: "frozen", ySplit: 1 }] });

// Add header row with styling
const headerRow = ws.addRow(headers);
headerRow.eachCell((cell, colNumber) => {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" }, // Blue header
  };
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
});

// Add data rows
for (const emp of employees.values()) {
  ws.addRow([
    emp.emp_id,
    emp.name,
    emp.designation,
    emp.department || "General",
    emp.basic_salary ?? 0,
    emp.food_allowance_amount ?? 0,
    emp.other_allowance ?? 0,
    emp.doj || "",
    emp.internal_department_doj || "",
    emp.five_year_calc_date || "",
    emp.indemnity_rate ?? 15,
    emp.working_hours ?? 8,
    (emp.category || "Direct").trim(),
    emp.status || "active",
    emp.accommodation || "Own",
  ]);
}

// Auto-fit columns
ws.columns.forEach((col, i) => {
  let maxLen = 10;
  col.eachCell({ includeEmpty: true }, (cell) => {
    const len = String(cell.value || "").length;
    if (len > maxLen) maxLen = len;
  });
  col.width = Math.min(maxLen + 2, 50);
});

await wbOut.xlsx.writeFile(join(dir, "Combined_Master_Dataset.xlsx"));

console.log("Done. Combined", employees.size, "employees into Combined_Master_Dataset.xlsx");
console.log("Output saved at:", join(dir, "Combined_Master_Dataset.xlsx"));
