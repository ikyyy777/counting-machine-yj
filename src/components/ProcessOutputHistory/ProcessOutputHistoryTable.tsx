import React, { useMemo, useState } from "react";
import { Users, Layers, Activity, CalendarCheck, TrendingUp, Download, CheckCircle2, Award } from "lucide-react";
import * as XLSX from "xlsx";
import { CBOpDataPerProcessRow } from "../../types/cbSewingOutput";

export interface ProcessOutputHistoryTableProps {
  data: CBOpDataPerProcessRow[];
  loading: boolean;
  styleNo?: string;
  lineNo?: string;
  workDate?: string;
}

// Module Color Palette
const MODULE_COLOR_MAP: Record<string, { bgHex: string; textHex: string }> = {
  PART: { bgHex: "#CCCCFF", textHex: "#0f172a" },
  LINING: { bgHex: "#706C11", textHex: "#ffffff" },
  HOOD: { bgHex: "#F433FF", textHex: "#ffffff" },
  FRONT: { bgHex: "#FFFF00", textHex: "#000000" },
  BACKSLEEVE: { bgHex: "#0000FF", textHex: "#ffffff" },
  "BACK & SLEEVE": { bgHex: "#0000FF", textHex: "#ffffff" },
  "BACK SLEEVE": { bgHex: "#0000FF", textHex: "#ffffff" },
  JOIN: { bgHex: "#FDD017", textHex: "#000000" },
  ASSEMBLY: { bgHex: "#00FF00", textHex: "#000000" },
  FORMER: { bgHex: "#748B97", textHex: "#ffffff" },
  WELTING: { bgHex: "#748B97", textHex: "#ffffff" },
  DUCKDOWN: { bgHex: "#748B97", textHex: "#ffffff" },
  "SEWING SUPPORTER": { bgHex: "#748B97", textHex: "#ffffff" },
  SEWINGSUPPORTER: { bgHex: "#748B97", textHex: "#ffffff" },
  HELPER: { bgHex: "#748B97", textHex: "#ffffff" },
  SEAMSEALING: { bgHex: "#748B97", textHex: "#ffffff" },
  "SEAM SEALING": { bgHex: "#748B97", textHex: "#ffffff" },
  CROSSBAR: { bgHex: "#748B97", textHex: "#ffffff" },
  "WELDING BONDING": { bgHex: "#748B97", textHex: "#ffffff" },
  WELDING: { bgHex: "#748B97", textHex: "#ffffff" },
  BONDING: { bgHex: "#748B97", textHex: "#ffffff" },
};

const getModuleStyle = (moduleName: string) => {
  const clean = (moduleName || "").toUpperCase().trim();
  if (MODULE_COLOR_MAP[clean]) return MODULE_COLOR_MAP[clean];
  for (const [key, val] of Object.entries(MODULE_COLOR_MAP)) {
    if (clean.includes(key)) return val;
  }
  return { bgHex: "#334155", textHex: "#f8fafc" };
};

interface OperatorGroup {
  key: string;
  nik: string;
  namaOp: string;
  empNo: number;
  module: string;
  splitModule?: string;
  outputPerOp: number;
  outputPerOpAllTime: number;
  rows: CBOpDataPerProcessRow[];
}

export const ProcessOutputHistoryTable: React.FC<ProcessOutputHistoryTableProps> = ({
  data,
  loading,
  styleNo,
  lineNo,
  workDate,
}) => {
  const [hoveredOpKey, setHoveredOpKey] = useState<string | null>(null);

  // Group rows by Operator + Module to enable clean rowSpan merging
  const groupedOperators = useMemo(() => {
    const map = new Map<string, OperatorGroup>();

    data.forEach((row) => {
      const key = `${row.NIK || "UNKNOWN"}_${row.MODULE || "DEFAULT"}`;
      const existing = map.get(key);
      if (existing) {
        existing.rows.push(row);
        if (row.OUTPUT_PER_OP > existing.outputPerOp) {
          existing.outputPerOp = row.OUTPUT_PER_OP;
        }
        if (row.OUTPUT_PER_OP_ALL_TIME > existing.outputPerOpAllTime) {
          existing.outputPerOpAllTime = row.OUTPUT_PER_OP_ALL_TIME;
        }
      } else {
        map.set(key, {
          key,
          nik: row.NIK,
          namaOp: row.NAMA_OP,
          empNo: row.EMPNO,
          module: row.MODULE,
          splitModule: row.SPLIT_MODULE,
          outputPerOp: row.OUTPUT_PER_OP || 0,
          outputPerOpAllTime: row.OUTPUT_PER_OP_ALL_TIME || 0,
          rows: [row],
        });
      }
    });

    return Array.from(map.values());
  }, [data]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!data.length) return;
    const exportRows = data.map((r, i) => ({
      No: i + 1,
      Period: r.WORK_DATE,
      Style: r.STYLE,
      "Prep ID": r.PREP_ID,
      Module: r.MODULE,
      "Sub Module": r.SPLIT_MODULE || "",
      NIK: r.NIK,
      "Operator Name": r.NAMA_OP,
      Flow: r.FLOW,
      "Process No": r.PROCESS_NO,
      "Process Name": r.PROSES_NAME,
      "Auto Seq": r.AUTO_SEQ,
      "Emp No": r.EMPNO,
      "Operator Output (Today)": r.OUTPUT_PER_OP,
      "Operator Output (All Time)": r.OUTPUT_PER_OP_ALL_TIME,
      "Process Output (Today)": r.OUTPUT_PER_PROCESS,
      "Process Output (All Time)": r.OUTPUT_PER_PROCESS_ALL_TIME,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Process_Output_History");
    const filename = `Process_Output_History_${lineNo || "Line"}_${workDate || "Date"}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Loading process output data...</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/60 border border-slate-800 rounded-2xl text-center space-y-3">
        <div className="p-3 bg-slate-800 rounded-full text-slate-400">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-200">No data found</h3>
        <p className="text-xs text-slate-400 max-w-md">
          Please select Factory, Line, Style, and Date, then click the Lookup button to load data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* TABLE CONTROLS (TITLE & EXPORT) */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            Process Output Detail Per Operator
          </h2>
          <span className="text-xs text-slate-400">
            ({groupedOperators.length} operators • {data.length} processes)
          </span>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 shadow-sm"
          title="Export data to Excel"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* MERGED DATA TABLE */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/70 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto max-h-[750px] custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            {/* TWO-TIER STICKY HEADER */}
            <thead className="sticky top-0 z-20 bg-slate-950/95 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 shadow-md backdrop-blur-md">
              {/* Category Group Header (Tier 1) */}
              <tr className="border-b border-slate-800/80 bg-slate-900/90 text-[10px] font-bold">
                <th colSpan={3} className="px-3 py-2 border-r border-slate-800 text-slate-300 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Operator Identity</span>
                  </div>
                </th>
                <th colSpan={4} className="px-3 py-2 border-r border-slate-800 text-slate-300 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Process &amp; Flow Specifications</span>
                  </div>
                </th>
                <th colSpan={2} className="px-3 py-2 border-r border-slate-800 text-center text-cyan-300 bg-cyan-950/30 tracking-wider">
                  <div className="flex items-center justify-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Output Per Operator</span>
                  </div>
                </th>
                <th colSpan={2} className="px-3 py-2 text-center text-emerald-300 bg-emerald-950/30 tracking-wider">
                  <div className="flex items-center justify-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Output Per Process</span>
                  </div>
                </th>
              </tr>

              {/* Specific Column Names (Tier 2) */}
              <tr className="bg-slate-950">
                <th className="px-3 py-2.5 font-bold text-center w-12 border-r border-slate-800">No</th>
                <th className="px-3 py-2.5 font-bold border-r border-slate-800 w-28">Module</th>
                <th className="px-3 py-2.5 font-bold border-r border-slate-800 w-52">Operator</th>
                <th className="px-3 py-2.5 font-bold border-r border-slate-800 w-24 text-center">Flow</th>
                <th className="px-3 py-2.5 font-bold border-r border-slate-800 w-16 text-center">Proc No</th>
                <th className="px-3 py-2.5 font-bold border-r border-slate-800 min-w-[200px]">Process Name</th>
                <th className="px-2.5 py-2.5 font-bold border-r border-slate-800 w-14 text-center">Seq</th>

                {/* 4 MAIN OUTPUT HEADERS */}
                <th className="px-3 py-2.5 font-black border-r border-slate-800 text-right bg-cyan-950/40 text-cyan-300 w-32">
                  <div className="flex items-center justify-end gap-1">
                    <span>TODAY</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 font-black border-r border-slate-800 text-right bg-blue-950/30 text-blue-300 w-32">
                  <div className="flex items-center justify-end gap-1">
                    <span>ALL TIME</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 font-black border-r border-slate-800 text-right bg-emerald-950/40 text-emerald-300 w-32">
                  <div className="flex items-center justify-end gap-1">
                    <span>TODAY</span>
                  </div>
                </th>
                <th className="px-3 py-2.5 font-black text-right bg-indigo-950/40 text-indigo-300 w-32">
                  <div className="flex items-center justify-end gap-1">
                    <span>ALL TIME</span>
                  </div>
                </th>
              </tr>
            </thead>

            {/* MERGED TBODY BY OPERATOR GROUP */}
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {groupedOperators.map((group, groupIdx) => {
                const modStyle = getModuleStyle(group.module);
                const rowCount = group.rows.length;
                const isEvenGroup = groupIdx % 2 === 0;
                const isHovered = hoveredOpKey === group.key;

                return (
                  <React.Fragment key={group.key}>
                    {group.rows.map((row, rIdx) => {
                      const isFirstRow = rIdx === 0;
                      const isLastRow = rIdx === rowCount - 1;

                      // Group boundary: Distinct separator after each operator block
                      const rowBorderClass = isLastRow
                        ? "border-b-2 border-slate-700/80"
                        : "border-b border-slate-800/40";

                      // Subtle background highlight for the entire operator group on hover
                      const bgClass = isHovered
                        ? "bg-slate-800/50"
                        : isEvenGroup
                          ? "bg-slate-900/25"
                          : "bg-slate-900/60";

                      return (
                        <tr
                          key={`${group.key}_${row.FLOW}_${row.PROCESS_NO}_${rIdx}`}
                          onMouseEnter={() => setHoveredOpKey(group.key)}
                          onMouseLeave={() => setHoveredOpKey(null)}
                          className={`${bgClass} ${rowBorderClass} transition-colors duration-150`}
                        >
                          {/* 1. MERGED NO */}
                          {isFirstRow && (
                            <td
                              rowSpan={rowCount}
                              className="px-3 py-3 text-center font-mono font-bold text-slate-400 border-r border-slate-800/80 align-middle bg-slate-950/30"
                            >
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-800/80 text-[11px] text-slate-300 border border-slate-700/50 shadow-inner">
                                {groupIdx + 1}
                              </span>
                            </td>
                          )}

                          {/* 2. MERGED MODULE */}
                          {isFirstRow && (
                            <td
                              rowSpan={rowCount}
                              className="px-3 py-3 border-r border-slate-800/80 align-middle"
                            >
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className="inline-block px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider shadow-sm"
                                  style={{
                                    backgroundColor: modStyle.bgHex,
                                    color: modStyle.textHex,
                                  }}
                                >
                                  {group.module || "-"}
                                </span>
                                {group.splitModule && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[110px]" title={group.splitModule}>
                                    {group.splitModule}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          {/* 3. MERGED OPERATOR PROFILE */}
                          {isFirstRow && (
                            <td
                              rowSpan={rowCount}
                              className="px-3 py-3 border-r border-slate-800/80 align-middle"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-indigo-500/20 shrink-0">
                                  {group.namaOp ? group.namaOp.charAt(0).toUpperCase() : "O"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-white text-xs truncate max-w-[180px]" title={group.namaOp}>
                                    {group.namaOp || "-"}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-mono text-slate-400">
                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                                      {group.nik}
                                    </span>
                                    {group.empNo > 0 && (
                                      <span className="text-slate-400 font-medium">#{group.empNo}</span>
                                    )}
                                    {rowCount > 1 && (
                                      <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold">
                                        {rowCount} Processes
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}

                          {/* 4. PROCESS FLOW */}
                          <td className="px-3 py-2.5 text-center border-r border-slate-800/60 align-middle">
                            {row.FLOW ? (
                              <span className="inline-block px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm">
                                {row.FLOW}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          {/* 5. PROCESS NO */}
                          <td className="px-3 py-2.5 text-center font-mono text-slate-300 border-r border-slate-800/60 align-middle">
                            {row.PROCESS_NO || "-"}
                          </td>

                          {/* 6. PROCESS NAME */}
                          <td className="px-3 py-2.5 font-medium text-slate-200 border-r border-slate-800/60 align-middle">
                            <span title={row.PROSES_NAME} className="line-clamp-2 max-w-[280px]">
                              {row.PROSES_NAME || "-"}
                            </span>
                          </td>

                          {/* 7. SEQ */}
                          <td className="px-2.5 py-2.5 text-center font-mono text-slate-400 border-r border-slate-800/60 align-middle">
                            {row.AUTO_SEQ || "-"}
                          </td>

                          {/* 8. MERGED OP OUTPUT (TODAY) */}
                          {isFirstRow && (
                            <td
                              rowSpan={rowCount}
                              className="px-3 py-3 text-right font-mono font-bold bg-cyan-950/20 border-r border-slate-800/80 align-middle"
                            >
                              <div className="flex flex-col items-end gap-1">
                                <span
                                  className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 font-black text-sm shadow-sm"
                                  title={`Total output today for ${group.namaOp}`}
                                >
                                  {group.outputPerOp.toLocaleString()}
                                </span>
                              </div>
                            </td>
                          )}

                          {/* 9. MERGED OP OUTPUT (ALL TIME) */}
                          {isFirstRow && (
                            <td
                              rowSpan={rowCount}
                              className="px-3 py-3 text-right font-mono font-bold bg-blue-950/20 border-r border-slate-800/80 align-middle"
                            >
                              <span
                                className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-200 font-black text-sm shadow-sm"
                                title={`Total all-time output for ${group.namaOp}`}
                              >
                                {group.outputPerOpAllTime.toLocaleString()}
                              </span>
                            </td>
                          )}

                          {/* 10. PROCESS OUTPUT (TODAY) */}
                          <td className="px-3 py-2.5 text-right font-mono font-extrabold bg-emerald-950/25 border-r border-slate-800/60 text-emerald-300 align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              <span
                                className="px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 shadow-sm text-xs"
                                title={`Process output: ${row.OUTPUT_PER_PROCESS.toLocaleString()} pcs`}
                              >
                                {row.OUTPUT_PER_PROCESS.toLocaleString()}
                              </span>
                            </div>
                          </td>

                          {/* 11. PROCESS OUTPUT (ALL TIME) */}
                          <td className="px-3 py-2.5 text-right font-mono font-extrabold bg-indigo-950/25 text-indigo-300 align-middle">
                            <span
                              className="px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 shadow-sm text-xs"
                              title={`All-time flow accumulation: ${row.OUTPUT_PER_PROCESS_ALL_TIME.toLocaleString()} pcs`}
                            >
                              {row.OUTPUT_PER_PROCESS_ALL_TIME.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProcessOutputHistoryTable;
