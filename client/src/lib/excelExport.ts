/**
 * Styled Excel export with colored columns.
 * Uses ExcelJS to produce .xlsx files with a header row and each column in a distinct color.
 */

import ExcelJS from "exceljs";

/** Light, distinct column fill colors (ARGB - alpha + hex). One per column, cycles if needed. */
const COLUMN_COLORS = [
  "FFE3F2FD", // light blue
  "FFE8F5E9", // light green
  "FFFFF3E0", // light orange
  "FFF3E5F5", // light purple
  "FFE0F7FA", // light cyan
  "FFFCE4EC", // light pink
  "FFFFF8E1", // light yellow
  "FFEFEBE9", // light grey
  "FFE8EAF6", // light indigo
  "FFE0F2F1", // light teal
];

const HEADER_FILL = "FF374151"; // dark grey
const HEADER_FONT_COLOR = "FFFFFFFF";

export interface StyledSheetInput {
  sheetName: string;
  headers: string[];
  rows: Record<string, string | number>[];
  columnWidths?: number[];
}

/**
 * Build a workbook with one sheet: header row (bold, dark bg) and data rows with each column in a different color.
 * Returns an ArrayBuffer suitable for creating a Blob and download.
 */
export async function buildStyledExcel({
  sheetName,
  headers,
  rows,
  columnWidths,
}: StyledSheetInput): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });

  // Header row
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: HEADER_FONT_COLOR } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HEADER_FILL },
  };
  headerRow.alignment = { horizontal: "left", vertical: "middle" };
  headerRow.height = 22;

  // Data rows: each column gets a background color
  for (const row of rows) {
    const values = headers.map((h) => row[h] ?? "");
    const dataRow = sheet.addRow(values);
    dataRow.eachCell((cell, colNumber) => {
      const colorIndex = (colNumber - 1) % COLUMN_COLORS.length;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLUMN_COLORS[colorIndex] },
      };
      cell.alignment = { vertical: "middle" };
      if (typeof cell.value === "number") {
        cell.numFmt = "0.00";
      }
    });
  }

  // Column widths
  headers.forEach((_, i) => {
    const w = columnWidths?.[i] ?? 14;
    sheet.getColumn(i + 1).width = Math.max(w, 10);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * Trigger download of a styled Excel file.
 */
export function downloadStyledExcel(
  buffer: ArrayBuffer,
  filename: string
): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
