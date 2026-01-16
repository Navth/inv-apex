import * as XLSX from "xlsx";
import type { AttendanceRecord } from "@/types/attendance";

export async function parseAttendanceFile(file: File): Promise<{ fileName: string; records: AttendanceRecord[] }> {
  const reader = new FileReader();
  const readPromise: Promise<string | ArrayBuffer | null> = new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  reader.readAsBinaryString(file);
  const bstr = await readPromise;
  if (!bstr) return { fileName: file.name, records: [] };

  const workbook = XLSX.read(bstr, { type: "binary" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Read as array-of-arrays to handle headers that are not in the first row
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: false,
  }) as any[][];

  const norm = (v: any) => String(v ?? "").trim().toLowerCase();
  const normTight = (v: any) => norm(v).replace(/\s+/g, "");

  // Find header row: must contain SL# and Emp id-like column
  const headerIdx = rows.findIndex((r) => {
    const n = r.map(normTight);
    return n.includes("sl#") && (n.includes("empid") || n.includes("emp_id") || n.includes("empid#") || n.includes("empno") || n.includes("empno."));
  });

  if (headerIdx === -1) {
    throw new Error("Invalid file format: couldn't find header row with 'SL#' and 'Emp id'.");
  }

  const header = rows[headerIdx];
  const headerTight = header.map(normTight);

  const empIdCol = headerTight.findIndex((h) => ["empid", "emp_id", "empid#", "empno", "empno."].includes(h));
  const nameCol = headerTight.findIndex((h) => h === "name" || h === "employee" || h === "empname");

  const dayCols: number[] = [];
  header.forEach((h, idx) => {
    const t = normTight(h);
    if (/^\d{1,2}$/.test(t)) {
      const day = parseInt(t, 10);
      if (day >= 1 && day <= 31) dayCols.push(idx);
    }
  });

  const findHeader = (cands: string[]) => headerTight.findIndex((h) => cands.includes(h));
  const otCol = findHeader(["ot"]);
  const fotCol = findHeader(["fot"]);
  const photCol = findHeader(["phot", "ph_ot", "ph-ot", "photot"]);
  const commentsCol = findHeader(["comments", "remark", "remarks", "comment"]);
  const totalWorkingDaysCol = findHeader(["totalworkingdaysonsite", "totalworkingdays", "workingdays", "working_days"]);
  const roundOffCol = findHeader(["roundoff", "round_off", "round-off"]);
  const duesEarnedCol = findHeader(["duesearned", "dues_earned", "dues-earned", "dues"]);
  
  const columnMappings = {
    empId: empIdCol,
    name: nameCol,
    dayCols,
    ot: otCol,
    fot: fotCol,
    phot: photCol,
    comments: commentsCol,
    totalWorkingDays: totalWorkingDaysCol,
    roundOff: roundOffCol,
    duesEarned: duesEarnedCol,
  };

  if (empIdCol === -1 || dayCols.length === 0) {
    throw new Error("Invalid file format: couldn't find Emp id or day columns (1..31).");
  }

  const parsedRecords: AttendanceRecord[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const empIdCell = row[empIdCol];
    const emp_id = String(empIdCell ?? "").trim();
    const name = nameCol !== -1 ? String(row[nameCol] ?? "").trim() : "";

    const isBlank = !emp_id && !name && dayCols.every((c) => String(row[c] ?? "").trim() === "");
    if (isBlank) continue;

    if (!emp_id) {
      parsedRecords.push({
        emp_id: "",
        worked_days: 0,
        normal_ot: 0,
        friday_ot: 0,
        holiday_ot: 0,
        unpaid_days: 0,
        isValid: false,
        error: "Missing Emp ID",
        comments: commentsCol !== -1 ? String(row[commentsCol] ?? "") : "",
        dailyStatus: [],
      });
      continue;
    }

    const dailyStatus: string[] = dayCols.map((idx) => String(row[idx] ?? "").trim());
    // Count P (Present) and M (Medical Leave) as worked days
    const worked_days = dailyStatus.filter((d) => {
      const status = d.toUpperCase();
      return status === "P" || status === "M";
    }).length;

    const toNum = (v: any) => {
      const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const OT = otCol !== -1 ? toNum(row[otCol]) : 0;
    const FOT = fotCol !== -1 ? toNum(row[fotCol]) : 0;
    const PHOT = photCol !== -1 ? toNum(row[photCol]) : 0;
    const duesEarned = duesEarnedCol !== -1 ? toNum(row[duesEarnedCol]) : 0;
    const comments = commentsCol !== -1 ? String(row[commentsCol] ?? "").trim() : "";
    const totalWorkingDaysRaw = totalWorkingDaysCol !== -1 ? toNum(row[totalWorkingDaysCol]) : undefined;
    const totalWorkingDays = Number.isFinite(totalWorkingDaysRaw) && totalWorkingDaysRaw ? totalWorkingDaysRaw : dailyStatus.length;
    const roundOffValue = roundOffCol !== -1 ? toNum(row[roundOffCol]) : undefined;
    const unpaid_days = Math.max(totalWorkingDays - worked_days, 0);

    const record = {
      emp_id,
      worked_days,
      total_working_days: totalWorkingDays,
      round_off: roundOffValue,
      normal_ot: OT,
      friday_ot: FOT,
      holiday_ot: PHOT,
      dues_earned: duesEarned,
      unpaid_days,
      comments,
      isValid: true,
      dailyStatus,
    };
    
    parsedRecords.push(record);
  }

  return { fileName: file.name, records: parsedRecords };
}


// Example 