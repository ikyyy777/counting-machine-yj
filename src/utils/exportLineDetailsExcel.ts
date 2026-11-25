import ExcelJS from "exceljs";
import { format, parseISO } from "date-fns";
import { CBSewingOutputRow } from "../types/cbSewingOutput";

export interface ExportLineProcessRow {
  no?: number;
  autoSeq?: number;
  flowNo?: string;
  nik?: string;
  worker: string;
  mainProcess?: string;
  role: string;
  operatorType?: string;
  uphTarget: number;
  uphActual: number;
  cumulative: number;
  totalOutputAlltime?: number;
  missingOutput?: number;
  stockGrouped?: number;
  totalStockAlltime?: number;
  workingHours?: number;
  dailyTarget?: number;
  history: { date: string; value: number }[];
  _isGroupedRow?: boolean;
  _groupedOperators?: ExportLineProcessRow[];
  _groupedOutput?: number;
  _groupedStock?: number;
}

export interface ExportLineSheetInput {
  factory: string;
  lineName: string;
  styleNo: string;
  joinRows: ExportLineProcessRow[];
  assemblyRows: ExportLineProcessRow[];
}

export interface ExportJoinAssemblyExcelParams extends ExportLineSheetInput {
  workDate: string;
  dateD2Label: string;
  dateD1Label: string;
}

export interface ExportMultiLineExcelParams {
  factory: string;
  workDate: string;
  dateD2Label: string;
  dateD1Label: string;
  sheets: ExportLineSheetInput[];
}

const getOperatorTypeLabel = (type?: string): string => {
  const normType = (type || "Operator Biasa").trim();
  switch (normType) {
    case "Sewing Supporter":
      return "Sew Supporter";
    case "Press (Seamsealing)":
      return "Seam Seal";
    case "Iron (Welbon)":
      return "Iron Welbon";
    case "Press (Welbon)":
      return "Press Welbon";
    case "CROSSBAR":
      return "Crossbar";
    case "Operator Biasa":
      return "Sewing";
    default:
      return normType;
  }
};

const calcStockDaysValue = (stock: number, ops: ExportLineProcessRow[]): number => {
  const totalDailyOutput = ops.reduce((sum, op) => sum + (op.cumulative ?? 0), 0);
  if (totalDailyOutput > 0) {
    return Number((stock / totalDailyOutput).toFixed(1));
  }
  const totalTarget = ops.reduce((sum, op) => sum + (op.dailyTarget ?? 0), 0);
  if (totalTarget > 0) {
    return Number((stock / totalTarget).toFixed(1));
  }
  return 0;
};

const roundClean = (val: number): number => {
  const rounded = Number(val.toFixed(1));
  return Object.is(rounded, -0) ? 0 : rounded;
};

const getPrimaryFlowKey = (flowNo?: string, fallbackId?: string | number): string => {
  const raw = String(flowNo || "").trim();
  if (!raw || raw === "-") return `__solo_${fallbackId ?? Math.random()}`;
  const firstToken = raw.split(/[\/,]/)[0].trim();
  const baseCode = firstToken.split("_")[0].trim();
  return baseCode || `__solo_${fallbackId ?? Math.random()}`;
};

const resolveMainProcessName = (item: CBSewingOutputRow, mainProcMap: Map<string, string>): string => {
  if (item.MAIN_PROCESS_NAME && String(item.MAIN_PROCESS_NAME).trim()) {
    return String(item.MAIN_PROCESS_NAME).trim();
  }
  const flows = (item as any).FLOWS;
  if (Array.isArray(flows)) {
    const mainFlow = flows.find((f: any) => Number(f.MAIN_PROC ?? 0) === 1);
    if (mainFlow?.PROCESS_NAME) return String(mainFlow.PROCESS_NAME).trim();
  }
  if (Array.isArray(item.TASKS)) {
    const mainTask = item.TASKS.find((t: any) => Number(t.MAIN_PROC ?? 0) === 1);
    if (mainTask?.PROCESS_NAME) return String(mainTask.PROCESS_NAME).trim();
  }
  const nik = String(item.NIK ?? "").trim();
  if (mainProcMap.has(nik)) return mainProcMap.get(nik)!;
  if (item.PROCESS_NAME && String(item.PROCESS_NAME).trim()) {
    return String(item.PROCESS_NAME).trim();
  }
  return "-";
};

const groupModuleRows = (
  processes: ExportLineProcessRow[],
  maxAssemblySeq: number | null
): ExportLineProcessRow[] => {
  const flowKeyMap = new Map<string, number[]>();
  processes.forEach((p, idx) => {
    const primaryKey = getPrimaryFlowKey(p.flowNo, idx);
    if (!flowKeyMap.has(primaryKey)) flowKeyMap.set(primaryKey, []);
    flowKeyMap.get(primaryKey)!.push(idx);
  });

  const emitted = new Set<number>();
  const rows: ExportLineProcessRow[] = [];

  processes.forEach((p, idx) => {
    if (emitted.has(idx)) return;
    const primaryKey = getPrimaryFlowKey(p.flowNo, idx);
    const groupIdxs = flowKeyMap.get(primaryKey) ?? [idx];
    const groupProcs = groupIdxs.map((i) => processes[i]);
    groupIdxs.forEach((i) => emitted.add(i));

    const isLastAssembly = (row: ExportLineProcessRow) =>
      row.role.toUpperCase() === "ASSEMBLY" &&
      maxAssemblySeq !== null &&
      (row.autoSeq ?? row.no ?? 0) === maxAssemblySeq;

    if (groupProcs.length < 2) {
      const lastAssem = isLastAssembly(p);
      const stockVal = lastAssem
        ? 0
        : p.stockGrouped !== undefined && p.stockGrouped !== null
        ? Number(p.stockGrouped)
        : Number(p.totalStockAlltime ?? 0);
      rows.push({
        ...p,
        stockGrouped: stockVal,
        _isGroupedRow: false,
        _groupedStock: stockVal,
      });
    } else {
      const totalOutput = groupProcs.reduce((s, op) => s + (op.totalOutputAlltime ?? 0), 0);
      const rep = groupProcs[0];
      const lastAssem = groupProcs.some(isLastAssembly);
      const validStock = lastAssem
        ? 0
        : (groupProcs.find((op) => op.stockGrouped != null && Number(op.stockGrouped) !== 0)?.stockGrouped
          ?? groupProcs.find((op) => op.stockGrouped != null)?.stockGrouped
          ?? 0);
      const stockVal = lastAssem ? 0 : Number(validStock ?? 0);

      rows.push({
        ...rep,
        stockGrouped: stockVal,
        _isGroupedRow: true,
        _groupedOperators: groupProcs,
        _groupedOutput: totalOutput,
        _groupedStock: stockVal,
      });
    }
  });

  return rows;
};

/** Maps raw CBSewingOutputRow[] from fetchCBSewingOutput into JOIN & ASSEMBLY export rows. */
export const mapRawOpRowsToJoinAssembly = (
  opRows: CBSewingOutputRow[],
  options: { groupByProcess: boolean; showNullCbOutput: boolean }
): { joinRows: ExportLineProcessRow[]; assemblyRows: ExportLineProcessRow[] } => {
  const mainProcMap = new Map<string, string>();
  opRows.forEach((item) => {
    const nik = String(item.NIK ?? "").trim();
    if (!nik || nik === "-") return;
    if (item.MAIN_PROCESS_NAME && String(item.MAIN_PROCESS_NAME).trim()) {
      mainProcMap.set(nik, String(item.MAIN_PROCESS_NAME).trim());
    } else if (Number(item.MAIN_PROC ?? 0) === 1 && item.PROCESS_NAME) {
      mainProcMap.set(nik, String(item.PROCESS_NAME).trim());
    }
  });

  const mapped: ExportLineProcessRow[] = opRows
    .map((item, idx) => {
      const nik = String(item.NIK ?? "").trim();
      return {
        no: Number(item.EMPNO ?? item.AUTO_SEQ ?? idx + 1),
        autoSeq: item.AUTO_SEQ != null ? Number(item.AUTO_SEQ) : undefined,
        flowNo: String(item.FLOW_NO ?? ""),
        nik,
        worker: String(item.E_NAME ?? "").trim(),
        mainProcess: resolveMainProcessName(item, mainProcMap),
        role: String(item.MODULE ?? "").trim(),
        operatorType: String(item.OPERATOR_TYPE ?? "Operator Biasa"),
        uphTarget: Number(item.TARGET_PER_HOUR ?? 50),
        uphActual: Number(item.AVERAGE_PER_HOUR ?? item.AVERAGE ?? 0),
        cumulative: Number(item.TODAY_OUTPUT ?? item.ACTUAL ?? 0),
        totalOutputAlltime: Number(item.TOTAL_OUTPUT ?? item.ACTUAL ?? 0),
        missingOutput: Number(item.MISSING_OUTPUT ?? 0),
        stockGrouped: item.STOCK_GROUPED != null ? Number(item.STOCK_GROUPED) : Number(item.STOCK_OP ?? 0),
        totalStockAlltime: Number(item.STOCK_OP ?? 0),
        workingHours: item.WORKING_HOURS != null ? Number(item.WORKING_HOURS) : 11,
        dailyTarget: Number(item.TARGET_PROD ?? 0),
        history: [
          { date: "D-2", value: Number(item.AVG_1ST_OUTPUT ?? (item as any)["1ST_AVG_OUTPUT"] ?? 0) },
          { date: "D-1", value: Number(item.AVG_2ND_OUTPUT ?? (item as any)["2ND_AVG_OUTPUT"] ?? 0) },
          {
            date: "Today",
            value: Number(
              item.AVG_3RD_OUTPUT ??
                (item as any)["3RD_AVG_OUTPUT"] ??
                item.TODAY_OUTPUT ??
                item.ACTUAL ??
                item.TOTAL_OUTPUT ??
                0
            ),
          },
        ],
      };
    })
    .filter((row) => {
      if (!row.nik || row.nik === "-") return false;
      if (!options.showNullCbOutput) {
        const hasToday = (row.cumulative ?? 0) > 0;
        const hasAllTime = (row.totalOutputAlltime ?? 0) > 0;
        if (!hasToday && !hasAllTime) return false;
      }
      return true;
    });

  const rawJoin = mapped.filter((p) => p.role.toUpperCase() === "JOIN");
  const rawAssembly = mapped.filter((p) => p.role.toUpperCase() === "ASSEMBLY");
  const maxAssemblySeq =
    rawAssembly.length > 0
      ? Math.max(...rawAssembly.map((x) => x.autoSeq ?? x.no ?? 0))
      : null;

  return {
    joinRows: options.groupByProcess ? groupModuleRows(rawJoin, null) : rawJoin,
    assemblyRows: options.groupByProcess ? groupModuleRows(rawAssembly, maxAssemblySeq) : rawAssembly,
  };
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF334155" } },
  left: { style: "thin", color: { argb: "FF334155" } },
  bottom: { style: "thin", color: { argb: "FF334155" } },
  right: { style: "thin", color: { argb: "FF334155" } },
};

const SECTION_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E1F2" },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E1F2" },
};

const buildUniqueSheetName = (lineName: string, styleNo: string, usedNames: Set<string>): string => {
  const cleanLine = lineName.replace(/^Line\s*/i, "").trim() || lineName;
  const cleanStyle = (styleNo || "STYLE").trim();
  const raw = `${cleanLine}-${cleanStyle}`.replace(/[\\/*?:[\]]/g, "-").trim();
  const base = (raw || "Sheet").slice(0, 31);

  if (!usedNames.has(base.toLowerCase())) {
    usedNames.add(base.toLowerCase());
    return base;
  }

  let suffix = 2;
  while (true) {
    const suffixStr = `_${suffix}`;
    const candidate = `${base.slice(0, 31 - suffixStr.length)}${suffixStr}`;
    if (!usedNames.has(candidate.toLowerCase())) {
      usedNames.add(candidate.toLowerCase());
      return candidate;
    }
    suffix += 1;
  }
};

interface ModuleSectionResult {
  nextRow: number;
  stockMinusRow: number;
  stockMinusCount: number;
}

const appendModuleSection = (
  ws: ExcelJS.Worksheet,
  startRow: number,
  sectionTitle: "JOIN" | "ASSEMBLY",
  rows: ExportLineProcessRow[],
  dateD2Label: string,
  dateD1Label: string
): ModuleSectionResult => {
  let r = startRow;

  // 1. Section Banner (A..P merged)
  ws.mergeCells(r, 1, r, 16);
  const bannerCell = ws.getCell(r, 1);
  bannerCell.value = sectionTitle;
  bannerCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F172A" } };
  bannerCell.alignment = { horizontal: "center", vertical: "middle" };
  bannerCell.fill = SECTION_FILL;
  ws.getRow(r).height = 24;
  r += 1;

  // Blank spacer row
  ws.getRow(r).height = 10;
  r += 1;

  // 2. Table Header (2 rows)
  const h1 = r;
  const h2 = r + 1;
  ws.getRow(h1).height = 20;
  ws.getRow(h2).height = 20;

  const singleHeaders: { col: number; label: string }[] = [
    { col: 1, label: "No" },
    { col: 2, label: "NIK" },
    { col: 3, label: "Operator" },
    { col: 4, label: "Main Process" },
    { col: 5, label: "Module" },
    { col: 6, label: "Type" },
    { col: 9, label: "Output" },
    { col: 10, label: "Output\n(All-Time)" },
    { col: 11, label: "Missing\nOutput" },
    { col: 12, label: "Stock\n(Grouped)" },
    { col: 13, label: "Stock\nDays" },
    { col: 14, label: "Work\nHours" },
  ];

  singleHeaders.forEach(({ col, label }) => {
    ws.mergeCells(h1, col, h2, col);
    const cell = ws.getCell(h1, col);
    cell.value = label;
  });

  // UPH merged across G-H on row 1, Target (G) & Actual (H) on row 2
  ws.mergeCells(h1, 7, h1, 8);
  ws.getCell(h1, 7).value = "UPH";
  ws.getCell(h2, 7).value = "Target";
  ws.getCell(h2, 8).value = "Actual";

  // Date AVG columns (O & P)
  ws.getCell(h1, 15).value = dateD2Label;
  ws.getCell(h2, 15).value = "(AVG)";
  ws.getCell(h1, 16).value = dateD1Label;
  ws.getCell(h2, 16).value = "(AVG)";

  for (let rowIdx = h1; rowIdx <= h2; rowIdx++) {
    for (let colIdx = 1; colIdx <= 16; colIdx++) {
      const cell = ws.getCell(rowIdx, colIdx);
      cell.fill = HEADER_FILL;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      const isSubHeader = rowIdx === h2 && (colIdx === 7 || colIdx === 8 || colIdx === 15 || colIdx === 16);
      cell.font = {
        name: "Arial",
        size: isSubHeader ? 8.5 : 9.5,
        bold: true,
        color: { argb: "FF0F172A" },
      };
    }
  }

  r = h2 + 1;
  const dataStartRow = r;
  let stockMinusCount = 0;

  if (rows.length === 0) {
    ws.mergeCells(r, 1, r, 16);
    const emptyCell = ws.getCell(r, 1);
    emptyCell.value = `No data for module ${sectionTitle}`;
    emptyCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    for (let c = 1; c <= 16; c++) {
      ws.getCell(r, c).border = THIN_BORDER;
    }
    ws.getRow(r).height = 20;
    r += 1;
  } else {
    rows.forEach((p, idx) => {
      const isGrp = !!(p._isGroupedRow && p._groupedOperators && p._groupedOperators.length > 1);
      const ops = p._groupedOperators && p._groupedOperators.length > 0 ? p._groupedOperators : [p];

      const nikText = isGrp ? ops.map((o) => o.nik || "-").join("\n") : (p.nik || "-");
      const operatorText = isGrp ? ops.map((o) => o.worker || "-").join("\n") : (p.worker || "-");
      const mainProcText = isGrp
        ? ops.map((o) => o.mainProcess || "-").join("\n")
        : (p.mainProcess || "-");
      const moduleText = (p.role || sectionTitle).toUpperCase();
      const typeText = isGrp
        ? Array.from(new Set(ops.map((o) => getOperatorTypeLabel(o.operatorType)))).join("\n")
        : getOperatorTypeLabel(p.operatorType);

      const uphTarget = isGrp
        ? ops.reduce((sum, o) => sum + Number(o.uphTarget ?? 0), 0)
        : Number(p.uphTarget ?? 0);
      const uphActual = isGrp
        ? roundClean(ops.reduce((sum, o) => sum + Number(o.uphActual ?? 0), 0))
        : roundClean(Number(p.uphActual ?? 0));
      const outputToday = isGrp
        ? ops.reduce((sum, o) => sum + Number(o.cumulative ?? 0), 0)
        : Number(p.cumulative ?? 0);
      const outputAllTime = isGrp
        ? Number(p._groupedOutput ?? ops.reduce((sum, o) => sum + Number(o.totalOutputAlltime ?? 0), 0))
        : Number(p.totalOutputAlltime ?? 0);
      const missingOutput = isGrp
        ? ops.reduce((sum, o) => sum + Number(o.missingOutput ?? 0), 0)
        : Number(p.missingOutput ?? 0);
      const stockGrouped = Number(p._groupedStock ?? p.stockGrouped ?? p.totalStockAlltime ?? 0);
      if (stockGrouped < 0) stockMinusCount += 1;

      const stockDays = calcStockDaysValue(stockGrouped, ops);
      const workHoursText = isGrp
        ? ops.map((o) => `${o.workingHours ?? 11}h`).join("\n")
        : `${p.workingHours ?? 11}h`;
      const d2Avg = roundClean(Number(p.history?.[0]?.value ?? 0));
      const d1Avg = roundClean(Number(p.history?.[1]?.value ?? 0));

      const values: (string | number)[] = [
        idx + 1,
        nikText,
        operatorText,
        mainProcText,
        moduleText,
        typeText,
        uphTarget,
        uphActual,
        outputToday,
        outputAllTime,
        missingOutput,
        stockGrouped,
        stockDays,
        workHoursText,
        d2Avg,
        d1Avg,
      ];

      const row = ws.getRow(r);
      values.forEach((val, colOffset) => {
        const colIdx = colOffset + 1;
        const cell = row.getCell(colIdx);
        cell.value = val;
        cell.border = THIN_BORDER;

        const isLeftAlign = colIdx === 3 || colIdx === 4;
        cell.alignment = {
          horizontal: isLeftAlign ? "left" : "center",
          vertical: "middle",
          wrapText: true,
        };

        const isBoldCol = colIdx === 10 || colIdx === 12;
        const isMutedType = colIdx === 6;
        const isMainProc = colIdx === 4;

        cell.font = {
          name: "Arial",
          size: isMainProc ? 8 : isMutedType ? 8.5 : 9,
          bold: isBoldCol,
          color: {
            argb:
              colIdx === 12 && stockGrouped < 0
                ? "FFDC2626"
                : isMutedType
                ? "FF64748B"
                : "FF0F172A",
          },
        };

        if (colIdx === 9 || colIdx === 10 || colIdx === 11 || colIdx === 12) {
          cell.numFmt = "#,##0";
        } else if (colIdx === 7 || colIdx === 8 || colIdx === 13 || colIdx === 15 || colIdx === 16) {
          cell.numFmt = "0.#";
        }
      });

      const explicitLines = Math.max(
        nikText.split("\n").length,
        operatorText.split("\n").length,
        mainProcText.split("\n").length
      );
      const wrappedMainProcLines = mainProcText
        .split("\n")
        .reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / 72)), 0);
      const totalLines = Math.max(explicitLines, wrappedMainProcLines);
      row.height = Math.max(18, totalLines * 12.5 + 4);

      r += 1;
    });
  }

  const dataEndRow = Math.max(dataStartRow, r - 1);

  // Blank spacer row
  ws.getRow(r).height = 10;
  r += 1;

  // STOCK MINUS summary box under Col K (Missing Output) & Col L (Stock Grouped)
  const stockMinusRow = r;
  const summaryRow = ws.getRow(r);
  summaryRow.height = 19;

  const labelCell = summaryRow.getCell(11);
  labelCell.value = "STOCK MINUS";
  labelCell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF0F172A" } };
  labelCell.alignment = { horizontal: "center", vertical: "middle" };
  labelCell.border = THIN_BORDER;

  const countCell = summaryRow.getCell(12);
  countCell.value =
    rows.length > 0
      ? { formula: `COUNTIF(L${dataStartRow}:L${dataEndRow},"<0")`, result: stockMinusCount }
      : 0;
  countCell.font = {
    name: "Arial",
    size: 9,
    bold: true,
    color: { argb: stockMinusCount > 0 ? "FFDC2626" : "FF0F172A" },
  };
  countCell.alignment = { horizontal: "center", vertical: "middle" };
  countCell.border = THIN_BORDER;
  countCell.numFmt = "#,##0";

  r += 1;

  // Blank spacer row before next section
  ws.getRow(r).height = 14;
  r += 1;

  return { nextRow: r, stockMinusRow, stockMinusCount };
};

interface LineSheetMeta {
  sheetName: string;
  cleanLine: string;
  joinMinusRow: number;
  joinMinusCount: number;
  assemblyMinusRow: number;
  assemblyMinusCount: number;
}

const addLineWorksheet = (
  wb: ExcelJS.Workbook,
  sheetInput: ExportLineSheetInput,
  dateD2Label: string,
  dateD1Label: string,
  usedSheetNames: Set<string>
): LineSheetMeta => {
  const cleanLine = sheetInput.lineName.replace(/^Line\s*/i, "").trim() || sheetInput.lineName;
  const sheetName = buildUniqueSheetName(sheetInput.lineName, sheetInput.styleNo, usedSheetNames);

  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 5.5 },  // A: No
    { width: 13.5 }, // B: NIK
    { width: 22 },   // C: Operator
    { width: 58 },   // D: Main Process
    { width: 11 },   // E: Module
    { width: 10 },   // F: Type
    { width: 8 },    // G: UPH Target
    { width: 8 },    // H: UPH Actual
    { width: 9.5 },  // I: Output
    { width: 12.5 }, // J: Output (All-Time)
    { width: 11.5 }, // K: Missing Output
    { width: 12 },   // L: Stock (Grouped)
    { width: 9.5 },  // M: Stock Days
    { width: 9.5 },  // N: Work Hours
    { width: 10 },   // O: D-2 (AVG)
    { width: 10 },   // P: D-1 (AVG)
  ];

  // Top metadata block (Rows 1–3)
  ws.getCell(1, 1).value = sheetInput.factory;
  ws.getCell(1, 1).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };

  ws.getCell(2, 1).value = "LINE";
  ws.getCell(2, 1).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };
  ws.getCell(2, 2).value = `: ${cleanLine}`;
  ws.getCell(2, 2).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };

  ws.getCell(3, 1).value = "STYLE";
  ws.getCell(3, 1).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };
  ws.getCell(3, 2).value = `: ${sheetInput.styleNo}`;
  ws.getCell(3, 2).font = { name: "Arial", size: 9, bold: true, color: { argb: "FF0F172A" } };

  ws.getRow(1).height = 16;
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 16;
  ws.getRow(4).height = 10;

  const joinRes = appendModuleSection(ws, 5, "JOIN", sheetInput.joinRows, dateD2Label, dateD1Label);
  const assemblyRes = appendModuleSection(
    ws,
    joinRes.nextRow,
    "ASSEMBLY",
    sheetInput.assemblyRows,
    dateD2Label,
    dateD1Label
  );

  return {
    sheetName,
    cleanLine,
    joinMinusRow: joinRes.stockMinusRow,
    joinMinusCount: joinRes.stockMinusCount,
    assemblyMinusRow: assemblyRes.stockMinusRow,
    assemblyMinusCount: assemblyRes.stockMinusCount,
  };
};

const SUMMARY_VALUE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEBF1DE" },
};

const populateSummaryWorksheet = (ws: ExcelJS.Worksheet, sheetMetas: LineSheetMeta[]): void => {
  ws.columns = [
    { width: 12 }, // A: LINE
    { width: 15 }, // B: JOIN
    { width: 15 }, // C: ASSEMBLY
  ];

  // Header Rows 1-2
  ws.mergeCells("A1:A2");
  ws.getCell("A1").value = "LINE";

  ws.mergeCells("B1:C1");
  ws.getCell("B1").value = "STOCK MINUS";

  ws.getCell("B2").value = "JOIN";
  ws.getCell("C2").value = "ASSEMBLY";

  ws.getRow(1).height = 22;
  ws.getRow(2).height = 22;

  for (let r = 1; r <= 2; r++) {
    for (let c = 1; c <= 3; c++) {
      const cell = ws.getCell(r, c);
      cell.fill = HEADER_FILL;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF000000" } };
    }
  }

  // Data rows (one per line)
  sheetMetas.forEach((meta, idx) => {
    const rowIdx = 3 + idx;
    const row = ws.getRow(rowIdx);
    row.height = 20;

    const escapedSheet = meta.sheetName.replace(/'/g, "''");

    const lineCell = row.getCell(1);
    const numLine = Number(meta.cleanLine);
    lineCell.value = Number.isFinite(numLine) && String(numLine) === meta.cleanLine ? numLine : meta.cleanLine;
    lineCell.alignment = { horizontal: "center", vertical: "middle" };
    lineCell.font = { name: "Calibri", size: 11, color: { argb: "FF000000" } };
    lineCell.border = THIN_BORDER;

    const joinCell = row.getCell(2);
    joinCell.value = {
      formula: `'${escapedSheet}'!L${meta.joinMinusRow}`,
      result: meta.joinMinusCount,
    };
    joinCell.alignment = { horizontal: "center", vertical: "middle" };
    joinCell.fill = SUMMARY_VALUE_FILL;
    joinCell.border = THIN_BORDER;
    joinCell.numFmt = "#,##0";
    joinCell.font = {
      name: "Calibri",
      size: 11,
      bold: meta.joinMinusCount > 0,
      color: { argb: meta.joinMinusCount > 0 ? "FFDC2626" : "FF000000" },
    };

    const assemblyCell = row.getCell(3);
    assemblyCell.value = {
      formula: `'${escapedSheet}'!L${meta.assemblyMinusRow}`,
      result: meta.assemblyMinusCount,
    };
    assemblyCell.alignment = { horizontal: "center", vertical: "middle" };
    assemblyCell.fill = SUMMARY_VALUE_FILL;
    assemblyCell.border = THIN_BORDER;
    assemblyCell.numFmt = "#,##0";
    assemblyCell.font = {
      name: "Calibri",
      size: 11,
      bold: meta.assemblyMinusCount > 0,
      color: { argb: meta.assemblyMinusCount > 0 ? "FFDC2626" : "FF000000" },
    };
  });
};

const downloadWorkbook = async (wb: ExcelJS.Workbook, fileName: string): Promise<void> => {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const formatSafeDate = (workDate: string): string => {
  try {
    return format(parseISO(workDate), "yyyy-MM-dd");
  } catch {
    return workDate || format(new Date(), "yyyy-MM-dd");
  }
};

export const exportJoinAssemblyExcel = async ({
  factory,
  lineName,
  styleNo,
  workDate,
  dateD2Label,
  dateD1Label,
  joinRows,
  assemblyRows,
}: ExportJoinAssemblyExcelParams): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Daily Production Monitoring Dashboard";
  wb.created = new Date();

  const usedNames = new Set<string>();
  addLineWorksheet(wb, { factory, lineName, styleNo, joinRows, assemblyRows }, dateD2Label, dateD1Label, usedNames);

  const cleanLine = lineName.replace(/^Line\s*/i, "").trim() || lineName;
  const safeStyle = (styleNo || "STYLE").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeLine = cleanLine.replace(/[^a-zA-Z0-9_-]/g, "_");
  await downloadWorkbook(wb, `Line_${safeLine}_${safeStyle}_JOIN_ASSEMBLY_${formatSafeDate(workDate)}.xlsx`);
};

export const exportMultiLineJoinAssemblyExcel = async ({
  factory,
  workDate,
  dateD2Label,
  dateD1Label,
  sheets,
}: ExportMultiLineExcelParams): Promise<void> => {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Daily Production Monitoring Dashboard";
  wb.created = new Date();

  const usedNames = new Set<string>(["summary"]);
  const summaryWs = wb.addWorksheet("Summary", {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: "portrait",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const sheetMetas = sheets.map((sheet) =>
    addLineWorksheet(wb, sheet, dateD2Label, dateD1Label, usedNames)
  );
  populateSummaryWorksheet(summaryWs, sheetMetas);

  const safeFactory = (factory || "FACTORY").replace(/[^a-zA-Z0-9_-]/g, "_");
  await downloadWorkbook(
    wb,
    `${safeFactory}_Custom_${sheets.length}Lines_JOIN_ASSEMBLY_${formatSafeDate(workDate)}.xlsx`
  );
};
