import React, { useMemo, useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";
import { parseISO, format as formatDate } from "date-fns";
import { X, GitFork, Activity, ChevronLeft, ChevronRight, Edit3, Check, Plus, Users } from "lucide-react";
import { CBSewingOutputRow, CBSewingOutputTask } from "../../types/cbSewingOutput";
import { resolveOperatorFlow, assignConnectionLanes, getFlowStyle } from "./flowUtils";
import { OperatorFlowArrows } from "./OperatorFlowArrows";
import { toast } from "react-toastify";

export interface GroupedProcessRow extends CBSewingOutputRow {
  _isGroupedRow?: boolean;
  _groupedOperators?: CBSewingOutputRow[];
}

export interface CBSewingOutputTableProps {
  data: CBSewingOutputRow[];
  dateColumns: string[];
  loading: boolean;
  showFlowArrows?: boolean;
  viewMode?: "merged" | "original";
  groupMode?: "grouped" | "operator";
  onEditWorkHours?: (
    op: CBSewingOutputRow,
    dateStr: string,
    currentWh: number,
    groupedOps?: CBSewingOutputRow[]
  ) => void;
  onSaveMissingOutput?: (nik: string, missingQty: number, style?: string, predecessorNik?: string) => Promise<boolean>;
}

// Module Color Mapping (User Defined Color Palette)
export interface ModuleColor {
  bgHex: string;
  textHex: string;
}

const MODULE_COLOR_MAP: Record<string, ModuleColor> = {
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
  "SEAM SEAL": { bgHex: "#748B97", textHex: "#ffffff" },
  CROSSBAR: { bgHex: "#748B97", textHex: "#ffffff" },
  "WELDING BONDING": { bgHex: "#748B97", textHex: "#ffffff" },
  WELDING: { bgHex: "#748B97", textHex: "#ffffff" },
  BONDING: { bgHex: "#748B97", textHex: "#ffffff" },
  "PROCESS IN WAREHOUSE": { bgHex: "#748B97", textHex: "#ffffff" },
  WAREHOUSE: { bgHex: "#748B97", textHex: "#ffffff" },
};

export const getModuleStyle = (moduleName: string): ModuleColor => {
  const clean = (moduleName || "").toUpperCase().trim();
  if (MODULE_COLOR_MAP[clean]) return MODULE_COLOR_MAP[clean];
  for (const [key, val] of Object.entries(MODULE_COLOR_MAP)) {
    if (clean.includes(key)) return val;
  }
  return { bgHex: "#748B97", textHex: "#ffffff" };
};

// Reusable sticky border styles
const stickyBorder = { boxShadow: "inset -1px 0 0 #334155" } as React.CSSProperties;
const lastLeftStickyBorder = { boxShadow: "inset -2px 0 0 #475569" } as React.CSSProperties;
const firstRightStickyBorder = {
  boxShadow: "inset 2px 0 0 #475569, inset -1px 0 0 #334155",
} as React.CSSProperties;
const rightStickyBorder = { boxShadow: "inset -1px 0 0 #334155" } as React.CSSProperties;

const SUB_ROW_CONFIGS = [
  { key: "wh", label: "Work Hours", color: "text-cyan-300", badgeBg: "bg-cyan-950/70 border-cyan-800/60 text-cyan-300" },
  { key: "avg", label: "Average", color: "text-amber-300", badgeBg: "bg-amber-950/70 border-amber-800/60 text-amber-300" },
  { key: "output", label: "CB Output", color: "text-emerald-400", badgeBg: "bg-emerald-950/70 border-emerald-800/60 text-emerald-300" },
] as const;

/**
 * Extract primary process grouping key (stripping .D and suffixes).
 * Matching logic in LineDetails.tsx for Grouped Mode.
 */
export const getPrimaryFlowKey = (row: CBSewingOutputRow, idx: number): string => {
  const rawFlow = row.FLOW_NO ?? "";
  const tokens = rawFlow.split(",").map((s) => s.trim()).filter(Boolean);
  if (tokens.length > 0) {
    const first = tokens[0];
    const dotDIdx = first.indexOf(".D");
    let base = dotDIdx !== -1 ? first.substring(0, dotDIdx) : first;
    if (base.includes("_")) base = base.split("_")[0];
    return base.toUpperCase().trim();
  }
  if (row.TASKS && row.TASKS.length > 0) {
    const t = row.TASKS.find((task) => task.FLOW_NO && task.FLOW_NO.trim());
    if (t && t.FLOW_NO) {
      const tTokens = t.FLOW_NO.split(",").map((s) => s.trim()).filter(Boolean);
      if (tTokens.length > 0) {
        const first = tTokens[0];
        const dotDIdx = first.indexOf(".D");
        let base = dotDIdx !== -1 ? first.substring(0, dotDIdx) : first;
        if (base.includes("_")) base = base.split("_")[0];
        return base.toUpperCase().trim();
      }
    }
  }
  const proc = (row.PROCESS_NO || row.PROCESS_NAME || "").trim().toUpperCase();
  if (proc) return `PROC_${proc}`;
  return `SOLO_${row.NIK || idx}`;
};

/**
 * Resolves downstream target operator group info (names, combined output, peer list).
 * In Grouped Mode: targets that share the same base flow are aggregated as a group (OP B + OP C).
 */
export const getTargetGroupInfo = (targetNik?: string | null, allData?: CBSewingOutputRow[]) => {
  if (!targetNik || !allData || !targetNik.trim() || targetNik === "-") return null;
  const normNik = targetNik.trim().toUpperCase();
  const targetOp = allData.find((r) => String(r.NIK || "").trim().toUpperCase() === normNik);
  if (!targetOp) return null;
  const targetKey = getPrimaryFlowKey(targetOp, 0);
  const peers = allData.filter((r) => getPrimaryFlowKey(r, 0) === targetKey);
  const totalOut = peers.reduce((sum, r) => sum + Number(r.TOTAL_OUTPUT ?? r.ACTUAL ?? 0), 0);
  const names = peers.map((r) => r.E_NAME || r.NIK).join(" + ");
  return { names, totalOut, peers, targetKey, targetOp };
};

/**
 * Pengecualian: Mendeteksi apakah suatu operator merupakan operator terakhir di module ASSEMBLY
 */
export const isLastAssemblyOperator = (op: CBSewingOutputRow, allData?: CBSewingOutputRow[]): boolean => {
  const isAssembly = (op.MODULE || "").toUpperCase().trim().includes("ASSEMBLY");
  if (!isAssembly || !allData || allData.length === 0) return false;
  const assemblyOps = allData.filter((r) => (r.MODULE || "").toUpperCase().trim().includes("ASSEMBLY"));
  if (assemblyOps.length === 0) return false;
  const maxSeq = Math.max(...assemblyOps.map((r) => Number(r.AUTO_SEQ || 0)));
  return Number(op.AUTO_SEQ || 0) >= maxSeq && maxSeq > 0;
};

/**
 * Group raw operators inside a module when groupMode === 'grouped'.
 */
export const getGroupedProcessRows = (
  operators: CBSewingOutputRow[],
  dates: string[],
  groupMode: "grouped" | "operator",
  allData?: CBSewingOutputRow[]
): GroupedProcessRow[] => {
  if (groupMode === "operator") {
    return operators.map((op) => ({
      ...op,
      _isGroupedRow: false,
      _groupedOperators: [op],
    }));
  }

  const flowKeyMap = new Map<string, number[]>();
  operators.forEach((op, idx) => {
    const key = getPrimaryFlowKey(op, idx);
    if (!flowKeyMap.has(key)) flowKeyMap.set(key, []);
    flowKeyMap.get(key)!.push(idx);
  });

  const emitted = new Set<number>();
  const rows: GroupedProcessRow[] = [];

  operators.forEach((op, idx) => {
    if (emitted.has(idx)) return;

    const key = getPrimaryFlowKey(op, idx);
    const groupIndices = flowKeyMap.get(key) ?? [idx];
    const groupOps = groupIndices.map((i) => operators[i]);

    if (groupOps.length < 2) {
      emitted.add(idx);
      const isLastAssem = isLastAssemblyOperator(op, allData || operators);
      // In grouped mode, prefer STOCK_GROUPED from server, fallback to dynamic target group calculation
      const targetInfo = isLastAssem ? null : getTargetGroupInfo(op.FLOW_TARGET_NIK, allData || operators);
      const calculatedGroupStock = targetInfo ? Number(op.TOTAL_OUTPUT ?? op.ACTUAL ?? 0) - targetInfo.totalOut : 0;
      const soloStock = isLastAssem
        ? 0
        : (op.STOCK_GROUPED !== null && op.STOCK_GROUPED !== undefined)
        ? Number(op.STOCK_GROUPED)
        : (targetInfo ? calculatedGroupStock : Number(op.STOCK_OP ?? 0));

      rows.push({
        ...op,
        STOCK_GROUPED: soloStock,
        STOCK_OP: isLastAssem ? 0 : Number(op.STOCK_OP ?? 0),
        FLOW_TARGET_NIK: isLastAssem ? "" : op.FLOW_TARGET_NIK,
        FLOW_TARGET_NAME: isLastAssem ? "" : op.FLOW_TARGET_NAME,
        FLOW_TARGET_FLOW: isLastAssem ? "" : op.FLOW_TARGET_FLOW,
        _isGroupedRow: false,
        _groupedOperators: [op],
      });
    } else {
      groupIndices.forEach((i) => emitted.add(i));

      const rep: CBSewingOutputRow = { ...groupOps[0] };

      // Aggregate Daily Outputs, Original Outputs, and Work Hours
      const dailyOutputs: Record<string, number> = {};
      const origDailyOutputs: Record<string, number> = {};
      const dailyWorkHours: Record<string, number> = {};

      dates.forEach((dStr) => {
        const mergedSum = groupOps.reduce(
          (s, o) => s + Number(o.DAILY_OUTPUTS?.[dStr] ?? o[dStr] ?? 0),
          0
        );
        const origSum = groupOps.reduce(
          (s, o) => s + Number(o.ORIGINAL_DAILY_OUTPUTS?.[dStr] ?? o["ORIG_" + dStr] ?? 0),
          0
        );
        const whSum = groupOps.reduce(
          (s, o) => s + Number(o.DAILY_WORK_HOURS?.[dStr] ?? o["WH_" + dStr] ?? 0),
          0
        );

        dailyOutputs[dStr] = mergedSum;
        origDailyOutputs[dStr] = origSum;
        dailyWorkHours[dStr] = whSum;
      });

      rep.DAILY_OUTPUTS = dailyOutputs;
      rep.ORIGINAL_DAILY_OUTPUTS = origDailyOutputs;
      rep.DAILY_WORK_HOURS = dailyWorkHours;

      // Aggregate totals
      rep.TOTAL_OUTPUT = groupOps.reduce((s, o) => s + Number(o.TOTAL_OUTPUT || 0), 0);
      rep.ORIGINAL_TOTAL_OUTPUT = groupOps.reduce(
        (s, o) => s + Number(o.ORIGINAL_TOTAL_OUTPUT ?? o.TOTAL_OUTPUT ?? 0),
        0
      );
      rep.MISSING_OUTPUT = groupOps.reduce((s, o) => s + Number(o.MISSING_OUTPUT || 0), 0);
      rep.ETC_PERSON = groupOps.reduce((s, o) => s + Number(o.ETC_PERSON || 0), 0);

      // Stock Grouped: use STOCK_GROUPED from server (prefer operator in group with non-zero STOCK_GROUPED)
      const isLastAssem = isLastAssemblyOperator(rep, allData || operators);
      const validStockGrouped = groupOps.find(
        (o) => o.STOCK_GROUPED !== null && o.STOCK_GROUPED !== undefined && Number(o.STOCK_GROUPED) !== 0
      )?.STOCK_GROUPED;
      const targetInfo = isLastAssem ? null : getTargetGroupInfo(rep.FLOW_TARGET_NIK, allData || operators);
      const calculatedGroupStock = targetInfo ? rep.TOTAL_OUTPUT - targetInfo.totalOut : 0;
      const grpStock = isLastAssem
        ? 0
        : Number(
            validStockGrouped !== undefined && validStockGrouped !== null
              ? validStockGrouped
              : (rep.STOCK_GROUPED !== null && rep.STOCK_GROUPED !== undefined
                  ? rep.STOCK_GROUPED
                  : (targetInfo ? calculatedGroupStock : (rep.STOCK_OP ?? 0)))
          );
      rep.STOCK_GROUPED = grpStock;
      rep.STOCK_OP = grpStock; // In grouped mode, stock column reads this value
      if (isLastAssem) {
        rep.FLOW_TARGET_NIK = "";
        rep.FLOW_TARGET_NAME = "";
        rep.FLOW_TARGET_FLOW = "";
      }

      // Combine TASKS without duplicates
      const combinedTasks: CBSewingOutputTask[] = [];
      const taskKeys = new Set<string>();
      groupOps.forEach((o) => {
        if (o.TASKS && o.TASKS.length > 0) {
          o.TASKS.forEach((t) => {
            const k = `${t.FLOW_NO || ""}_${t.PROCESS_NAME || ""}`;
            if (!taskKeys.has(k)) {
              taskKeys.add(k);
              combinedTasks.push(t);
            }
          });
        } else if (o.PROCESS_NAME) {
          const k = `${o.FLOW_NO || ""}_${o.PROCESS_NAME || ""}`;
          if (!taskKeys.has(k)) {
            taskKeys.add(k);
            combinedTasks.push({
              FLOW_NO: o.FLOW_NO,
              PROCESS_NO: o.PROCESS_NO,
              PROCESS_NAME: o.PROCESS_NAME,
              AUTO_SEQ: o.AUTO_SEQ,
              SPLIT_MODULE: o.SPLIT_MODULE,
            });
          }
        }
      });
      rep.TASKS = combinedTasks;

      // Flow target: prefer operator in group with non-empty FLOW_TARGET_NIK pointing OUTSIDE the group
      const groupNiks = new Set(groupOps.map((o) => (o.NIK || "").trim().toUpperCase()));
      const externalTargetOp = groupOps.find(
        (o) => o.FLOW_TARGET_NIK && o.FLOW_TARGET_NIK.trim() && !groupNiks.has(o.FLOW_TARGET_NIK.trim().toUpperCase())
      );
      const validTargetOp = externalTargetOp || groupOps.find(
        (o) => o.FLOW_TARGET_NIK && o.FLOW_TARGET_NIK.trim()
      );
      if (validTargetOp) {
        rep.FLOW_TARGET_NIK = validTargetOp.FLOW_TARGET_NIK;
        rep.FLOW_TARGET_NAME = validTargetOp.FLOW_TARGET_NAME;
        rep.FLOW_TARGET_FLOW = validTargetOp.FLOW_TARGET_FLOW;
      }

      // Flow No: ensure rep has non-empty FLOW_NO
      if (!rep.FLOW_NO || !rep.FLOW_NO.trim()) {
        const validFlowOp = groupOps.find((o) => o.FLOW_NO && o.FLOW_NO.trim());
        if (validFlowOp) {
          rep.FLOW_NO = validFlowOp.FLOW_NO;
        }
      }

      // Process Name: ensure rep has non-empty PROCESS_NAME
      if (!rep.PROCESS_NAME || !rep.PROCESS_NAME.trim()) {
        const validProcOp = groupOps.find((o) => o.PROCESS_NAME && o.PROCESS_NAME.trim());
        if (validProcOp) {
          rep.PROCESS_NAME = validProcOp.PROCESS_NAME;
          rep.PROCESS_NO = validProcOp.PROCESS_NO;
        }
      }

      rows.push({
        ...rep,
        _isGroupedRow: true,
        _groupedOperators: groupOps,
      });
    }
  });

  return rows;
};

interface MissingOutputCellProps {
  nik: string;
  styleNo?: string;
  currentMissingOutput: number;
  updatedBy?: string | null;
  updatedAt?: string | null;
  solidBg: string;
  flowOffset: number;
  groupedOps?: CBSewingOutputRow[];
  mergedEmpNik?: string | null;
  mergedEmpName?: string | null;
  missingSourceNik?: string | null;
  onSave?: (nik: string, qty: number, style?: string, predecessorNik?: string) => Promise<boolean>;
}

const MissingOutputCell: React.FC<MissingOutputCellProps> = React.memo(
  ({
    nik,
    styleNo,
    currentMissingOutput,
    updatedBy,
    updatedAt,
    solidBg,
    flowOffset,
    groupedOps,
    mergedEmpNik,
    mergedEmpName,
    missingSourceNik,
    onSave,
  }) => {
    const isMultiOp = !!(groupedOps && groupedOps.length > 1);

    const [isEditing, setIsEditing] = useState(false);
    const [editingTargetOp, setEditingTargetOp] = useState<CBSewingOutputRow | null>(null);
    const [tempQty, setTempQty] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [localQty, setLocalQty] = useState<number>(currentMissingOutput);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keep localQty synchronized whenever parent's currentMissingOutput prop changes
    useEffect(() => {
      setLocalQty(currentMissingOutput);
    }, [currentMissingOutput]);

    const handleStartEditSingle = () => {
      setEditingTargetOp(null);
      setTempQty(localQty !== 0 ? String(localQty) : "");
      setIsEditing(true);
    };

    const handleStartEditGroupOp = (targetOp: CBSewingOutputRow) => {
      setEditingTargetOp(targetOp);
      const cur = Number(targetOp.MISSING_OUTPUT || 0);
      setTempQty(cur !== 0 ? String(cur) : "");
      setIsEditing(true);
    };

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleConfirmSave = async () => {
      const trimmed = tempQty.trim();
      const val = trimmed === "" ? 0 : parseInt(trimmed, 10);
      if (isNaN(val)) {
        toast.error("Please enter a valid number (use 0 to remove missing output)");
        return;
      }

      const targetOp = editingTargetOp;
      const targetNik = targetOp ? targetOp.NIK : nik;
      const targetStyle = targetOp ? (targetOp.STYLE || styleNo) : styleNo;
      const targetPredNik = targetOp
        ? (targetOp.MISSING_SOURCE_NIK || targetOp.MERGED_EMP_NIK || undefined)
        : (missingSourceNik || mergedEmpNik || undefined);

      if (!isMultiOp) {
        setLocalQty(val);
      }
      setIsEditing(false);

      if (onSave) {
        setIsSaving(true);
        try {
          const ok = await onSave(targetNik, val, targetStyle, targetPredNik);
          if (ok && editingTargetOp) {
            editingTargetOp.MISSING_OUTPUT = val;
          } else if (!ok && !isMultiOp) {
            setLocalQty(currentMissingOutput);
          }
        } catch {
          if (!isMultiOp) setLocalQty(currentMissingOutput);
        } finally {
          setIsSaving(false);
          setEditingTargetOp(null);
        }
      }
    };

    const hasMerged = !!(mergedEmpName || mergedEmpNik || missingSourceNik);
    const mergedLabel = mergedEmpName || mergedEmpNik || missingSourceNik;
    const singleUpdateTooltip = localQty !== 0 || updatedBy
      ? `Missing Output: ${localQty.toLocaleString()}${hasMerged ? ` (Replaced: ${mergedLabel})` : ''}${updatedBy ? ` | Last updated by: ${updatedBy}${updatedAt ? ` (${updatedAt})` : ''}` : ''}`
      : `Click to add/edit missing output${hasMerged ? ` (Replaces: ${mergedLabel})` : ''}`;

    return (
      <td
        rowSpan={3}
        className="sticky z-[30] text-center font-mono px-1 py-1 border-b border-slate-700 align-middle text-xs w-[100px] min-w-[100px] max-w-[100px]"
        style={{
          ...firstRightStickyBorder,
          right: `${flowOffset + 250}px`,
          backgroundColor: solidBg,
        }}
      >
        {isEditing ? (
          <div
            className="flex flex-col items-center justify-center gap-1 p-1 bg-slate-900 border border-blue-500 rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {editingTargetOp && (
              <span className="text-[9px] text-blue-300 font-sans font-bold truncate max-w-[85px]" title={editingTargetOp.E_NAME}>
                {editingTargetOp.E_NAME.split(" ")[0]}
              </span>
            )}
            <div className="flex items-center justify-center gap-1">
              <input
                ref={inputRef}
                type="number"
                value={tempQty}
                onChange={(e) => setTempQty(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmSave();
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setEditingTargetOp(null);
                  }
                }}
                className="w-16 px-1 py-0.5 bg-slate-950 border border-blue-500 rounded text-center text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-400"
                placeholder="0"
              />
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors active:scale-90 disabled:opacity-50"
                title="Save Missing Output (Enter)"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditingTargetOp(null);
                }}
                className="p-1 hover:bg-rose-500/20 text-rose-400 rounded transition-colors active:scale-90"
                title="Cancel (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : isMultiOp ? (
          <div
            className="flex flex-col items-center justify-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={`font-bold font-mono text-xs ${localQty < 0 ? "text-rose-400 font-extrabold" : localQty > 0 ? "text-blue-400 font-extrabold" : "text-slate-500"
                }`}
            >
              {localQty !== 0 ? localQty.toLocaleString() : "-"}
            </span>
            <div className="flex flex-col gap-0.5 w-full">
              {groupedOps!.map((opItem) => {
                const opMissing = Number(opItem.MISSING_OUTPUT || 0);
                const opUpdatedBy = opItem.MISSING_OUTPUT_UPDATED_BY;
                const opUpdatedAt = opItem.MISSING_OUTPUT_UPDATED_AT;
                return (
                  <button
                    key={opItem.NIK}
                    type="button"
                    onClick={() => handleStartEditGroupOp(opItem)}
                    className="flex items-center justify-between text-[9px] px-1 py-0.5 rounded bg-slate-800/80 hover:bg-blue-600/30 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
                    title={`Klik untuk edit Missing Output ${opItem.E_NAME || opItem.NIK}${opUpdatedBy ? ` | Last updated by: ${opUpdatedBy}${opUpdatedAt ? ` (${opUpdatedAt})` : ''}` : ''}`}
                  >
                    <span className="truncate max-w-[50px] font-sans font-semibold">
                      {opItem.E_NAME?.split(" ")[0]}
                    </span>
                    <span className={opMissing < 0 ? "text-rose-400 font-bold font-mono" : opMissing > 0 ? "text-blue-300 font-bold font-mono" : "text-slate-500"}>
                      {opMissing !== 0 ? opMissing.toLocaleString() : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center leading-tight"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              onClick={handleStartEditSingle}
              className="group inline-flex items-center justify-center gap-1 text-slate-400 hover:text-blue-400 py-0.5 px-1.5 rounded hover:bg-blue-500/10 transition-all duration-200 cursor-pointer font-medium"
              title={singleUpdateTooltip}
            >
              {localQty !== 0 ? (
                <span className={`${localQty < 0 ? "text-rose-400 hover:text-rose-300" : "text-blue-400 hover:text-blue-300"} font-bold font-mono tracking-tight text-xs flex items-center gap-1`}>
                  {localQty.toLocaleString()}
                  {isSaving && (
                    <span className={`inline-block w-2.5 h-2.5 border-2 ${localQty < 0 ? "border-rose-400" : "border-blue-400"} border-t-transparent rounded-full animate-spin`} />
                  )}
                </span>
              ) : isSaving ? (
                <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100 group-hover:text-blue-400 transition-all duration-200" />
                  <span className="text-[10px] opacity-70 group-hover:opacity-100">
                    Add
                  </span>
                </>
              )}
            </span>
            {localQty !== 0 && updatedBy && (
              <span
                className="text-[9px] text-slate-400 font-sans font-medium truncate max-w-[90px] leading-none mt-0.5 cursor-pointer hover:text-blue-300 transition-colors"
                title={`Missing Output last updated by ${updatedBy}${updatedAt ? ` on ${updatedAt}` : ""}${hasMerged ? ` (Predecessor: ${mergedLabel})` : ""}`}
                onClick={handleStartEditSingle}
              >
                by {updatedBy}
              </span>
            )}
            {hasMerged && (
              <span
                className="text-[8px] text-amber-400/80 font-sans truncate max-w-[90px] leading-tight cursor-pointer hover:text-amber-300"
                title={`Operator ini melanjutkan flow/output dari: ${mergedLabel}`}
                onClick={handleStartEditSingle}
              >
                ↪ {mergedEmpName ? mergedEmpName.split(" ")[0] : mergedLabel}
              </span>
            )}
          </div>
        )}
      </td>
    );
  }
);

MissingOutputCell.displayName = "MissingOutputCell";

// Memoized individual operator / process row group (3 sub-rows per row)
interface OperatorRowGroupProps {
  op: GroupedProcessRow;
  currentOpNumber: number;
  isEvenOp: boolean;
  moduleName: string;
  totalModRows: number;
  renderModCell: boolean;
  modStyle: ModuleColor;
  allSortedDates: string[];
  flowColumnWidth: number;
  flowOffset: number;
  showFlowArrows: boolean;
  totalQcHelperOutput: number;
  isSelected: boolean;
  isHovered: boolean;
  viewMode?: "merged" | "original";
  groupMode?: "grouped" | "operator";
  allRows?: CBSewingOutputRow[];
  onSelect: (opKey: string) => void;
  onHover: (opKey: string | null) => void;
  setAnchorRef: (key: string, el: HTMLDivElement | null) => void;
  onEditWorkHours?: (
    op: CBSewingOutputRow,
    dateStr: string,
    currentWh: number,
    groupedOps?: CBSewingOutputRow[]
  ) => void;
  onSaveMissingOutput?: (nik: string, missingQty: number, style?: string, predecessorNik?: string) => Promise<boolean>;
}

const OperatorRowGroup: React.FC<OperatorRowGroupProps> = React.memo(
  ({
    op,
    currentOpNumber,
    isEvenOp,
    moduleName,
    totalModRows,
    renderModCell,
    modStyle,
    allSortedDates,
    flowColumnWidth,
    flowOffset,
    showFlowArrows,
    totalQcHelperOutput,
    isSelected,
    isHovered,
    viewMode = "merged",
    groupMode = "grouped",
    allRows,
    onSelect,
    onHover,
    setAnchorRef,
    onEditWorkHours,
    onSaveMissingOutput,
  }) => {
    const isGrp = !!(op._isGroupedRow && op._groupedOperators && op._groupedOperators.length > 1);
    const ops = op._groupedOperators ?? [op];
    const opKey = `${op.NIK}-${op.MODULE}`;

    let solidBg = isEvenOp ? "#0b1329" : "#111c38";
    if (isSelected) {
      solidBg = "#1e1b4b"; // Indigo-950 when selected
    } else if (isHovered) {
      solidBg = "#172554"; // Blue-950 when hovered
    }

    let opTotalWh = 0;
    allSortedDates.forEach((dStr) => {
      const whVal = op.DAILY_WORK_HOURS?.[dStr] ?? op["WH_" + dStr] ?? 0;
      opTotalWh += Number(whVal || 0);
    });

    const isOriginal = viewMode === "original";
    const opTotalOutput = isOriginal
      ? Number(op.ORIGINAL_TOTAL_OUTPUT ?? op.TOTAL_OUTPUT ?? 0)
      : Number(op.TOTAL_OUTPUT || 0);
    const opOverallAvg =
      opTotalWh > 0 && opTotalOutput > 0 ? Math.round(opTotalOutput / opTotalWh) : 0;
    const opBalance = opTotalOutput - totalQcHelperOutput;

    const isLastAssem = isLastAssemblyOperator(op, allRows);
    // Stock selection: Grouped Mode shows STOCK_GROUPED, Operator Mode shows STOCK_OP
    const displayStock = isLastAssem
      ? 0
      : groupMode === "grouped"
        ? (op.STOCK_GROUPED !== null && op.STOCK_GROUPED !== undefined
            ? Number(op.STOCK_GROUPED)
            : Number(op.STOCK_OP ?? 0))
        : Number(op.STOCK_OP ?? 0);

    return (
      <>
        {SUB_ROW_CONFIGS.map((cfg, subIdx) => {
          const isFirstSubRow = subIdx === 0;
          const isLastSubRow = subIdx === 2;
          const subRowBorderClass = isLastSubRow ? "border-b border-slate-700" : "border-b border-slate-800/40";

          return (
            <tr
              key={`row-${opKey}-${cfg.key}`}
              className={`cursor-pointer ${isSelected
                  ? "bg-indigo-950/80"
                  : isHovered
                    ? "bg-blue-950/60"
                    : isEvenOp
                      ? "bg-[#0b1329]"
                      : "bg-[#111c38]"
                } hover:bg-indigo-950/50`}
              onMouseEnter={() => onHover(opKey)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(opKey)}
              title={
                isSelected
                  ? "Klik untuk membatalkan tracking proses/operator ini"
                  : "Klik untuk lock / tracking alur garis flow nya"
              }
            >
              {/* STICKY LEFT: Module */}
              {renderModCell && isFirstSubRow && (
                <td
                  rowSpan={totalModRows}
                  className="sticky left-0 z-[30] font-bold text-center px-2 py-3 align-middle uppercase tracking-wider text-[11px] w-[90px] min-w-[90px] max-w-[90px] border-b border-slate-800"
                  style={{
                    ...stickyBorder,
                    backgroundColor: modStyle.bgHex,
                    color: modStyle.textHex,
                  }}
                >
                  <div className="writing-vertical-lr rotate-180 md:writing-mode-horizontal md:rotate-0 inline-block font-extrabold">
                    {moduleName}
                  </div>
                </td>
              )}

              {/* STICKY LEFT: No */}
              {isFirstSubRow && (
                <td
                  rowSpan={3}
                  className="sticky left-[90px] z-[30] text-center font-mono font-bold text-slate-300 px-2 py-2 align-middle w-[50px] min-w-[50px] max-w-[50px] border-b border-slate-700"
                  style={{ ...stickyBorder, backgroundColor: solidBg }}
                >
                  <div className="flex items-center justify-center gap-1">
                    {isSelected && <Activity className="w-3 h-3 text-indigo-400 animate-pulse shrink-0" />}
                    <span>{currentOpNumber}</span>
                  </div>
                </td>
              )}

              {/* STICKY LEFT: Operator / Process */}
              {isFirstSubRow && (
                <td
                  rowSpan={3}
                  className={`sticky left-[140px] z-[30] font-medium text-slate-100 px-2.5 py-2 align-middle w-[145px] min-w-[145px] max-w-[145px] border-b border-slate-700 ${isSelected ? "border-l-2 border-l-indigo-400" : ""
                    }`}
                  style={{ ...stickyBorder, backgroundColor: solidBg }}
                >
                  {isGrp ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold tracking-tight">
                          <Users className="w-2.5 h-2.5 shrink-0" />
                          <span>{ops.length} Ops Grouped</span>
                        </span>
                        {isSelected && (
                          <span className="px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 text-[8px] font-sans font-bold">
                            Tracked
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 max-h-[85px] overflow-y-auto custom-scrollbar pr-0.5">
                        {ops.map((item) => (
                          <div
                            key={item.NIK}
                            className="p-1 rounded bg-slate-800/80 border border-slate-700/60 hover:border-blue-500/50 transition-colors"
                          >
                            <div className="flex items-center justify-between text-[10px] leading-tight">
                              <span
                                className="font-bold text-slate-100 truncate max-w-[85px]"
                                title={item.E_NAME}
                              >
                                {item.E_NAME || "-"}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono shrink-0">
                                {item.NIK}
                              </span>
                            </div>
                            {item.MERGED_EMP_NAME && (
                              <div
                                className="mt-0.5 text-[8px] text-amber-300 truncate max-w-[110px]"
                                title={`Replace: ${item.MERGED_EMP_NAME}`}
                              >
                                <span className="font-semibold text-amber-400">Repl:</span> {item.MERGED_EMP_NAME}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`font-semibold truncate max-w-[125px] ${isSelected ? "text-indigo-200 font-bold" : "text-white"
                            }`}
                          title={op.E_NAME}
                        >
                          {op.E_NAME || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{op.NIK}</span>
                        {isSelected && (
                          <span className="px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 text-[9px] font-sans font-bold">
                            Tracked
                          </span>
                        )}
                      </div>
                      {op.MERGED_EMP_NAME && (
                        <div
                          className="mt-1 text-[9px] text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded px-1 py-0.5 font-sans leading-tight truncate max-w-[130px]"
                          title={`Output replace dari operator sebelumnya: ${op.MERGED_EMP_NAME} (${op.MERGED_EMP_NIK || ""})`}
                        >
                          <span className="font-semibold text-amber-400">Replace:</span> {op.MERGED_EMP_NAME}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              )}

              {/* STICKY LEFT: Pembagian Kerja */}
              {isFirstSubRow && (
                <td
                  rowSpan={3}
                  className="sticky left-[285px] z-[30] px-3 py-1.5 align-middle text-slate-300 text-[11px] w-[220px] min-w-[220px] max-w-[220px] border-b border-slate-700"
                  style={{ ...stickyBorder, backgroundColor: solidBg }}
                >
                  <div className="flex flex-col gap-1 max-h-[85px] overflow-y-auto custom-scrollbar pr-1">
                    {op.TASKS && op.TASKS.length > 0 ? (
                      op.TASKS.map((task, tIdx) => {
                        const flowStyle = task.FLOW_NO ? getFlowStyle(task.FLOW_NO) : null;
                        return (
                          <div key={tIdx} className="flex items-center gap-1.5 leading-tight">
                            {task.FLOW_NO && flowStyle && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border shrink-0 ${flowStyle.badgeClass}`}
                                title={`Flow No: ${task.FLOW_NO} (${flowStyle.name})`}
                              >
                                {task.FLOW_NO}
                              </span>
                            )}
                            <span className="truncate max-w-[160px]" title={task.PROCESS_NAME || ""}>
                              {task.PROCESS_NAME || "-"}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-1.5 leading-tight">
                        {op.FLOW_NO && (() => {
                          const flowStyle = getFlowStyle(op.FLOW_NO);
                          return (
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border shrink-0 ${flowStyle.badgeClass}`}
                              title={`Flow No: ${op.FLOW_NO} (${flowStyle.name})`}
                            >
                              {op.FLOW_NO}
                            </span>
                          );
                        })()}
                        <span className="truncate max-w-[180px]" title={op.PROCESS_NAME || ""}>
                          {op.PROCESS_NAME || "-"}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
              )}

              {/* STICKY LEFT: ETC */}
              {isFirstSubRow && (
                <td
                  rowSpan={3}
                  className="sticky left-[505px] z-[30] text-center font-mono px-2 py-2 align-middle w-[65px] min-w-[65px] max-w-[65px] border-b border-slate-700"
                  style={{ ...stickyBorder, backgroundColor: solidBg }}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span
                      className="text-amber-300 font-bold text-[11px]"
                      title={
                        isGrp
                          ? `Total ETC Person Group (${ops.length} ops): ${op.ETC_PERSON ?? 0}`
                          : `ETC Person: ${op.ETC_PERSON ?? 0}`
                      }
                    >
                      {op.ETC_PERSON !== undefined && op.ETC_PERSON !== null && op.ETC_PERSON > 0
                        ? Number(op.ETC_PERSON).toFixed(op.ETC_PERSON % 1 === 0 ? 0 : 2)
                        : "-"}
                    </span>
                    {op.EMP_GROUP && (
                      <span className="text-[9px] text-slate-500 font-sans font-medium" title={`Group: ${op.EMP_GROUP}`}>
                        G{op.EMP_GROUP}
                      </span>
                    )}
                  </div>
                </td>
              )}

              {/* STICKY LEFT: Data Type */}
              <td
                className={`sticky left-[570px] z-[30] text-center px-2 py-1 align-middle w-[90px] min-w-[90px] max-w-[90px] ${subRowBorderClass}`}
                style={{ ...lastLeftStickyBorder, backgroundColor: solidBg }}
              >
                <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-tight inline-block ${cfg.badgeBg}`}>
                  {cfg.label}
                </span>
              </td>

              {/* SCROLLABLE DATES CELLS */}
              {allSortedDates.map((dStr) => {
                const mergedVal = Number(op.DAILY_OUTPUTS?.[dStr] ?? op[dStr] ?? 0);
                const origVal = Number(op.ORIGINAL_DAILY_OUTPUTS?.[dStr] ?? op["ORIG_" + dStr] ?? 0);
                const outputVal = isOriginal ? origVal : mergedVal;
                const whVal = op.DAILY_WORK_HOURS?.[dStr] ?? op["WH_" + dStr] ?? 0;

                const isMergedDay = Boolean(op.MERGED_EMP_NAME && mergedVal > origVal);

                let cellText = "-";
                let cellClass = "text-slate-600";
                let cellBg = "";

                if (isMergedDay) {
                  if (cfg.key === "output") {
                    cellBg = "bg-amber-500/25 text-amber-200 font-extrabold border-amber-500/40 shadow-inner";
                  } else if (cfg.key === "avg") {
                    cellBg = "bg-amber-500/15 text-amber-300 font-bold";
                  }
                }

                if (cfg.key === "wh") {
                  if (whVal > 0) {
                    cellText = (whVal % 1 === 0 ? whVal.toFixed(0) : whVal.toFixed(1)) + "h";
                    cellClass = "text-cyan-300 font-semibold";
                  }

                  return (
                    <td
                      key={dStr}
                      onClick={() => onEditWorkHours?.(op, dStr, whVal, isGrp ? ops : undefined)}
                      className={`text-center font-mono px-1 py-1 border-r ${subRowBorderClass} align-middle ${cellClass} text-[11px] cursor-pointer hover:bg-cyan-950/70 hover:text-cyan-200 transition-all group/whcell`}
                      title={
                        isGrp
                          ? `Klik untuk edit Work Hours operator dalam group ini pada tanggal ${dStr}`
                          : `Klik untuk edit Work Hours tanggal ${dStr} (${op.E_NAME || op.NIK})`
                      }
                    >
                      <div className="flex items-center justify-center gap-0.5 px-0.5 py-0.5 rounded hover:bg-cyan-500/10">
                        <span>{cellText}</span>
                        <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover/whcell:opacity-100 text-cyan-400 transition-opacity shrink-0" />
                      </div>
                    </td>
                  );
                } else if (cfg.key === "avg") {
                  if (whVal > 0 && outputVal > 0) {
                    const avg = Math.round(outputVal / whVal);
                    cellText = avg.toLocaleString();
                    if (!isMergedDay) cellClass = "text-amber-300 font-bold";
                  }
                } else if (cfg.key === "output") {
                  if (outputVal > 0) {
                    cellText = outputVal.toLocaleString();
                    if (!isMergedDay) cellClass = "text-emerald-400 font-bold";
                  }
                }

                const tooltipTitle = (() => {
                  if (cfg.key === "output" && isGrp && outputVal > 0) {
                    const breakdown = ops
                      .map((o) => {
                        const val = isOriginal
                          ? Number(o.ORIGINAL_DAILY_OUTPUTS?.[dStr] ?? o["ORIG_" + dStr] ?? 0)
                          : Number(o.DAILY_OUTPUTS?.[dStr] ?? o[dStr] ?? 0);
                        return `${(o.E_NAME || o.NIK).split(" ")[0]}: ${val.toLocaleString()}`;
                      })
                      .join(" + ");
                    return `Tanggal ${dStr}: Total Output ${outputVal.toLocaleString()} (${breakdown})`;
                  }
                  if (isMergedDay) {
                    return `Tanggal ${dStr}: Output replace (digabung) dari operator terdahulu (${op.MERGED_EMP_NAME}). Original: ${origVal}, Total Output: ${mergedVal}`;
                  }
                  return undefined;
                })();

                return (
                  <td
                    key={dStr}
                    className={`text-center font-mono px-1.5 py-1.5 border-r ${subRowBorderClass} align-middle ${cellClass} text-[11px] ${cellBg}`}
                    title={tooltipTitle}
                  >
                    {cellText}
                  </td>
                );
              })}

              {/* STICKY RIGHT: Missing Output */}
              {isFirstSubRow && (
                <MissingOutputCell
                  nik={op.NIK}
                  styleNo={op.STYLE}
                  currentMissingOutput={Number(op.MISSING_OUTPUT || 0)}
                  updatedBy={op.MISSING_OUTPUT_UPDATED_BY}
                  updatedAt={op.MISSING_OUTPUT_UPDATED_AT}
                  solidBg={solidBg}
                  flowOffset={flowOffset}
                  groupedOps={isGrp ? ops : undefined}
                  mergedEmpNik={op.MERGED_EMP_NIK}
                  mergedEmpName={op.MERGED_EMP_NAME}
                  missingSourceNik={op.MISSING_SOURCE_NIK}
                  onSave={onSaveMissingOutput}
                />
              )}

              {/* STICKY RIGHT: Total */}
              <td
                className={`sticky z-[30] text-right font-mono font-bold px-3 py-1.5 ${subRowBorderClass} align-middle text-[11px] w-[85px] min-w-[85px] max-w-[85px]`}
                style={{
                  ...rightStickyBorder,
                  right: `${flowOffset + 165}px`,
                  backgroundColor: solidBg,
                }}
              >
                {cfg.key === "wh" ? (
                  <span className="text-cyan-300">
                    {opTotalWh > 0 ? (opTotalWh % 1 === 0 ? opTotalWh.toFixed(0) : opTotalWh.toFixed(1)) + "h" : "-"}
                  </span>
                ) : cfg.key === "avg" ? (
                  <span className="text-amber-300">
                    {opOverallAvg > 0 ? opOverallAvg.toLocaleString() : "-"}
                  </span>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="text-emerald-400">
                      {opTotalOutput > 0 ? opTotalOutput.toLocaleString() : "-"}
                    </span>
                    {isGrp && opTotalOutput > 0 && (
                      <span
                        className="text-[9px] text-slate-500 font-mono font-normal truncate max-w-[75px]"
                        title={ops
                          .map((o) => {
                            const val = isOriginal
                              ? Number(o.ORIGINAL_TOTAL_OUTPUT ?? o.TOTAL_OUTPUT ?? 0)
                              : Number(o.TOTAL_OUTPUT || 0);
                            return `${(o.E_NAME || o.NIK).split(" ")[0]}: ${val.toLocaleString()}`;
                          })
                          .join(" + ")}
                      >
                        {ops
                          .map((o) => {
                            const val = isOriginal
                              ? Number(o.ORIGINAL_TOTAL_OUTPUT ?? o.TOTAL_OUTPUT ?? 0)
                              : Number(o.TOTAL_OUTPUT || 0);
                            return val.toLocaleString();
                          })
                          .join("+")}
                      </span>
                    )}
                  </div>
                )}
              </td>

              {/* STICKY RIGHT: Stok (Grouped or Per-Op based on groupMode) */}
              {isFirstSubRow && (
                <td
                  rowSpan={3}
                  className={`sticky z-[30] text-right font-mono font-bold px-3 py-2 border-b border-slate-700 align-middle text-xs w-[80px] min-w-[80px] max-w-[80px] ${Number(displayStock) < 0
                      ? "text-rose-400 font-extrabold"
                      : groupMode === "grouped"
                        ? "text-blue-300 font-extrabold"
                        : "text-purple-300"
                    }`}
                  style={{
                    ...rightStickyBorder,
                    right: `${flowOffset + 85}px`,
                    backgroundColor: solidBg,
                  }}
                  title={
                    isLastAssem
                      ? "Stok: 0 (Proses Akhir Module ASSEMBLY - Tanpa Downstream Target)"
                      : groupMode === "grouped"
                      ? (() => {
                          const currName = isGrp
                            ? (op._groupedOperators ?? [op]).map((o) => o.E_NAME || o.NIK).join(" + ")
                            : (op.E_NAME || op.NIK);
                          const currOut = Number(op.TOTAL_OUTPUT || op.ACTUAL || 0);
                          const tgtGrp = getTargetGroupInfo(op.FLOW_TARGET_NIK, allRows);
                          if (tgtGrp) {
                            return `Stok Grouped: [${currName}] (${currOut.toLocaleString()}) − [${tgtGrp.names}] (${tgtGrp.totalOut.toLocaleString()}) = ${Number(displayStock).toLocaleString()}`;
                          }
                          return op.FLOW_TARGET_NAME
                            ? `Stok Grouped: [${currName}] (${currOut.toLocaleString()}) − [${op.FLOW_TARGET_NAME}] = ${Number(displayStock).toLocaleString()}`
                            : `Stok Grouped: ${Number(displayStock).toLocaleString()}`;
                        })()
                      : op.FLOW_TARGET_NAME
                        ? `Stok (Yongjin 2-2): ${op.E_NAME || op.NIK} (${Number(op.TOTAL_OUTPUT || op.ACTUAL || 0).toLocaleString()}) − ${op.FLOW_TARGET_NAME} = ${Number(op.STOCK_OP || 0).toLocaleString()}`
                        : `Stok: ${Number(op.STOCK_OP || 0).toLocaleString()}`
                  }
                >
                  {Number(displayStock).toLocaleString()}
                </td>
              )}

              {/* STICKY RIGHT: Balance */}
              {isFirstSubRow && (
                <td
                  rowSpan={3}
                  className={`sticky z-[30] text-right font-mono font-bold px-3 py-2 border-b border-slate-700 align-middle text-xs w-[85px] min-w-[85px] max-w-[85px] ${opBalance < 0
                      ? "text-rose-400 font-extrabold"
                      : "text-cyan-300"
                    }`}
                  style={{
                    ...rightStickyBorder,
                    right: `${flowOffset}px`,
                    backgroundColor: solidBg,
                  }}
                  title={`Balance: Total CB Output (${opTotalOutput.toLocaleString()}) - Total QC/Helper Output (${totalQcHelperOutput.toLocaleString()}) = ${opBalance.toLocaleString()}`}
                >
                  {opBalance.toLocaleString()}
                </td>
              )}

              {/* DEDICATED FLOW ARROWS COLUMN (TRANSPARENT ANCHOR CELL) */}
              {showFlowArrows && isFirstSubRow && (
                <td
                  rowSpan={3}
                  className="sticky right-0 z-[30] border-b border-slate-700 align-middle p-0 pointer-events-none select-none"
                  style={{
                    ...rightStickyBorder,
                    width: `${flowColumnWidth}px`,
                    minWidth: `${flowColumnWidth}px`,
                    maxWidth: `${flowColumnWidth}px`,
                    backgroundColor: solidBg,
                  }}
                >
                  {/* Invisible anchor element measured by getBoundingClientRect */}
                  <div
                    ref={(el) => setAnchorRef(opKey, el)}
                    className="w-full h-8 opacity-0 pointer-events-none"
                  />
                </td>
              )}
            </tr>
          );
        })}
      </>
    );
  }
);

OperatorRowGroup.displayName = "OperatorRowGroup";

export const CBSewingOutputTable: React.FC<CBSewingOutputTableProps> = ({
  data,
  dateColumns,
  loading,
  showFlowArrows = true,
  viewMode = "merged",
  groupMode = "grouped",
  onEditWorkHours,
  onSaveMissingOutput,
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const floatingScrollbarRef = useRef<HTMLDivElement>(null);
  const flowGroupRef = useRef<SVGGElement>(null);
  const sliderInputRef = useRef<HTMLInputElement>(null);

  const [showFloatingScroll, setShowFloatingScroll] = useState(false);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [floatingStyle, setFloatingStyle] = useState<React.CSSProperties>({});

  // Flow Arrows & DOM positions
  const anchorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [operatorPositions, setOperatorPositions] = useState<
    Map<string, { x: number; y: number; width: number; height: number }>
  >(new Map());
  const [canvasDimensions, setCanvasDimensions] = useState<{ width: number; height: number; clientWidth: number }>({
    width: 0,
    height: 0,
    clientWidth: 0,
  });
  const [flowColumnX, setFlowColumnX] = useState<number>(0);

  // Flow inner-scroll ref-based animation
  const flowScrollXRef = useRef(0);
  const flowScrollTarget = useRef(0);
  const flowAnimRunning = useRef(false);
  const maxFlowScrollRef = useRef(0);
  const flowColWidthRef = useRef(90);

  // Hover & Click-to-Pin State for Operator Flow Tracking
  const [highlightedOpKey, setHighlightedOpKey] = useState<string | null>(null);
  const [selectedOpKey, setSelectedOpKey] = useState<string | null>(null);

  const isSyncingTableScroll = useRef(false);
  const isSyncingFloatingScroll = useRef(false);

  // Stable anchor ref callback
  const setAnchorRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) anchorRefs.current.set(key, el);
    else anchorRefs.current.delete(key);
  }, []);

  // Stable select/hover callbacks
  const handleSelectOperator = useCallback((opKey: string) => {
    setSelectedOpKey((prev) => (prev === opKey ? null : opKey));
  }, []);

  const handleHoverOperator = useCallback((opKey: string | null) => {
    setHighlightedOpKey(opKey);
  }, []);

  // Group Dates chronologically by Month
  const monthGroups = useMemo(() => {
    if (!dateColumns || dateColumns.length === 0) return [];

    const sortedDates = [...dateColumns].sort((a, b) => a.localeCompare(b));
    const groups: { monthKey: string; monthLabel: string; dates: string[] }[] = [];

    sortedDates.forEach((dStr) => {
      let dateObj: Date;
      try {
        dateObj = parseISO(dStr);
      } catch {
        dateObj = new Date(dStr);
      }
      const monthKey = formatDate(dateObj, "yyyy-MM");
      const monthLabel = formatDate(dateObj, "MMMM yyyy").toUpperCase();

      const existing = groups.find((g) => g.monthKey === monthKey);
      if (existing) {
        existing.dates.push(dStr);
      } else {
        groups.push({ monthKey, monthLabel, dates: [dStr] });
      }
    });

    return groups;
  }, [dateColumns]);

  const allSortedDates = useMemo(() => {
    return monthGroups.flatMap((g) => g.dates);
  }, [monthGroups]);

  // Total CB Output for operator(s) with MODULE === 'HELPER' and PEMBAGIAN KERJA === 'QC'
  const totalQcHelperOutput = useMemo(() => {
    return data
      .filter((r) => {
        const mod = (r.MODULE || "").toUpperCase().trim();
        const isHelper = mod === "HELPER" || mod.includes("HELPER");
        if (!isHelper) return false;

        const proc = (r.PROCESS_NAME || "").toUpperCase().trim();
        if (proc === "QC" || proc.includes("QC")) return true;

        if (r.TASKS && r.TASKS.length > 0) {
          return r.TASKS.some((t) => {
            const p = (t.PROCESS_NAME || "").toUpperCase().trim();
            return p === "QC" || p.includes("QC");
          });
        }

        const splitMod = (r.SPLIT_MODULE || "").toUpperCase().trim();
        return splitMod === "QC" || splitMod.includes("QC");
      })
      .reduce((sum, r) => sum + Number(r.TOTAL_OUTPUT || 0), 0);
  }, [data]);

  // Group Rows by Module (preserving natural data order, but placing HELPER below ASSEMBLY)
  const moduleGroups = useMemo(() => {
    const map = new Map<string, CBSewingOutputRow[]>();

    data.forEach((row) => {
      const mod = (row.MODULE || "OTHER").trim();
      if (!map.has(mod)) {
        map.set(mod, []);
      }
      map.get(mod)!.push(row);
    });

    const groups = Array.from(map.entries()).map(([moduleName, rawOperators]) => {
      const style = getModuleStyle(moduleName);
      const operators = getGroupedProcessRows(rawOperators, allSortedDates, groupMode, data);
      return {
        moduleName,
        operators,
        totalRows: operators.length * 3,
        style,
      };
    });

    // Place HELPER module directly below ASSEMBLY module if both exist
    const helperIndex = groups.findIndex(
      (g) => g.moduleName.toUpperCase().trim() === "HELPER" || g.moduleName.toUpperCase().includes("HELPER")
    );
    const assemblyIndex = groups.findIndex(
      (g) => g.moduleName.toUpperCase().trim() === "ASSEMBLY" || g.moduleName.toUpperCase().includes("ASSEMBLY")
    );

    if (helperIndex !== -1 && assemblyIndex !== -1 && helperIndex < assemblyIndex) {
      const [helperGroup] = groups.splice(helperIndex, 1);
      const newAssemblyIndex = groups.findIndex(
        (g) => g.moduleName.toUpperCase().trim() === "ASSEMBLY" || g.moduleName.toUpperCase().includes("ASSEMBLY")
      );
      groups.splice(newAssemblyIndex + 1, 0, helperGroup);
    }

    return groups;
  }, [data, allSortedDates, groupMode]);

  // All flattened displayed rows (for resolveOperatorFlow and click/hover details)
  const allDisplayRows = useMemo(() => {
    return moduleGroups.flatMap((g) => g.operators);
  }, [moduleGroups]);

  // Resolve process flow relationships from active displayed rows
  const flowResult = useMemo(() => {
    return resolveOperatorFlow(allDisplayRows);
  }, [allDisplayRows]);

  // Assign vertical routing lanes based on operator positions
  const { routedConnections, totalLanes } = useMemo(() => {
    return assignConnectionLanes(flowResult.connections, operatorPositions);
  }, [flowResult.connections, operatorPositions]);

  // Full Diagram width needed for all lanes (24px per lane)
  const fullFlowDiagramWidth = useMemo(() => {
    if (!showFlowArrows || flowResult.connections.length === 0) return 180;
    return Math.max(180, 44 + totalLanes * 24);
  }, [showFlowArrows, flowResult.connections.length, totalLanes]);

  // Visible width of FLOW column in the table (minimum 180px, max 260px)
  const flowColumnWidth = useMemo(() => {
    if (!showFlowArrows || flowResult.connections.length === 0) return 90;
    return Math.min(260, Math.max(180, fullFlowDiagramWidth));
  }, [showFlowArrows, flowResult.connections.length, fullFlowDiagramWidth]);

  // Maximum horizontal scroll available inside the FLOW column
  const maxFlowScroll = useMemo(() => {
    return Math.max(0, fullFlowDiagramWidth - flowColumnWidth);
  }, [fullFlowDiagramWidth, flowColumnWidth]);

  useEffect(() => {
    maxFlowScrollRef.current = maxFlowScroll;
  }, [maxFlowScroll]);
  useEffect(() => {
    flowColWidthRef.current = flowColumnWidth;
  }, [flowColumnWidth]);

  // GPU-accelerated translate3d transform
  const applyFlowTransform = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;
    const colW = flowColWidthRef.current;
    const visibleFlowLeft = scrollLeft + clientWidth - colW;
    const translateX = visibleFlowLeft - flowScrollXRef.current;

    if (flowGroupRef.current) {
      flowGroupRef.current.style.transform = `translate3d(${translateX}px, 0px, 0px)`;
    }
    if (sliderInputRef.current) {
      sliderInputRef.current.value = String(Math.round(flowScrollXRef.current));
    }
  }, []);

  // Smooth animation loop
  const runFlowAnimation = useCallback(() => {
    if (!flowAnimRunning.current) return;
    const current = flowScrollXRef.current;
    const target = flowScrollTarget.current;
    const diff = target - current;

    if (Math.abs(diff) < 0.2) {
      flowScrollXRef.current = target;
      flowAnimRunning.current = false;
      applyFlowTransform();
      return;
    }
    flowScrollXRef.current = current + diff * 0.22;
    applyFlowTransform();
    requestAnimationFrame(runFlowAnimation);
  }, [applyFlowTransform]);

  const setFlowScrollTarget = useCallback(
    (delta: number) => {
      const clamped = Math.max(
        0,
        Math.min(maxFlowScrollRef.current, flowScrollTarget.current + delta)
      );
      flowScrollTarget.current = clamped;
      if (!flowAnimRunning.current) {
        flowAnimRunning.current = true;
        requestAnimationFrame(runFlowAnimation);
      }
    },
    [runFlowAnimation]
  );

  const setFlowScrollImmediate = useCallback(
    (value: number) => {
      const clamped = Math.max(0, Math.min(maxFlowScrollRef.current, value));
      flowScrollXRef.current = clamped;
      flowScrollTarget.current = clamped;
      applyFlowTransform();
    },
    [applyFlowTransform]
  );

  // Wheel listener for horizontal scroll over the FLOW column
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container || !showFlowArrows) return;

    const handleWheel = (e: WheelEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const colW = flowColWidthRef.current;
      const flowStart = rect.width - colW;

      if (mouseX >= flowStart - 6 && maxFlowScrollRef.current > 0) {
        const raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (raw === 0) return;
        const speed = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? 300 : 1;
        const delta = raw * speed * 0.6;

        e.preventDefault();
        e.stopPropagation();

        const next = Math.max(
          0,
          Math.min(maxFlowScrollRef.current, flowScrollTarget.current + delta)
        );
        flowScrollTarget.current = next;
        if (!flowAnimRunning.current) {
          flowAnimRunning.current = true;
          requestAnimationFrame(runFlowAnimation);
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [showFlowArrows, runFlowAnimation]);

  // Details for currently selected operator / group
  const selectedOpDetails = useMemo(() => {
    if (!selectedOpKey) return null;
    const found = allDisplayRows.find((r) => `${r.NIK}-${r.MODULE}` === selectedOpKey);
    const incoming = flowResult.connections.filter((c) => c.targetKey === selectedOpKey);
    const outgoing = flowResult.connections.filter((c) => c.sourceKey === selectedOpKey);
    return {
      op: found,
      incoming,
      outgoing,
    };
  }, [selectedOpKey, allDisplayRows, flowResult.connections]);

  // Measure actual table dimensions
  const updateOperatorPositions = useCallback(() => {
    if (!tableRef.current || !tableContainerRef.current || !showFlowArrows) return;

    const container = tableContainerRef.current;
    const table = tableRef.current;
    const tableRect = table.getBoundingClientRect();

    const newPositions = new Map<string, { x: number; y: number; width: number; height: number }>();

    anchorRefs.current.forEach((el, key) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const y = rect.top - tableRect.top + rect.height / 2;
      newPositions.set(key, { x: 0, y, width: rect.width, height: rect.height });
    });

    const tableH = table.offsetHeight;
    const tableW = table.offsetWidth;
    const clientW = container.clientWidth;
    const scrollL = container.scrollLeft;
    const colW = flowColWidthRef.current;
    const initialFlowX = scrollL + clientW - colW;

    setOperatorPositions(newPositions);
    setFlowColumnX(initialFlowX);
    setCanvasDimensions({ width: tableW, height: tableH, clientWidth: clientW });

    applyFlowTransform();
  }, [showFlowArrows, applyFlowTransform]);

  useLayoutEffect(() => {
    const handleRecalc = () => {
      requestAnimationFrame(updateOperatorPositions);
    };

    handleRecalc();

    const resizeObserver = new ResizeObserver(() => {
      handleRecalc();
    });

    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current);
    }
    if (tableRef.current) {
      resizeObserver.observe(tableRef.current);
    }

    window.addEventListener("resize", handleRecalc);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleRecalc);
    };
  }, [data, allSortedDates, showFlowArrows, groupMode, updateOperatorPositions]);

  // Fast zero-React-render horizontal scroll handler
  const handleTableScroll = () => {
    if (!tableContainerRef.current) return;
    const scrollLeft = tableContainerRef.current.scrollLeft;

    applyFlowTransform();

    if (isSyncingTableScroll.current) {
      isSyncingTableScroll.current = false;
      return;
    }
    if (floatingScrollbarRef.current) {
      isSyncingFloatingScroll.current = true;
      floatingScrollbarRef.current.scrollLeft = scrollLeft;
    }
  };

  const handleFloatingScroll = () => {
    if (isSyncingFloatingScroll.current) {
      isSyncingFloatingScroll.current = false;
      return;
    }
    if (tableContainerRef.current && floatingScrollbarRef.current) {
      isSyncingTableScroll.current = true;
      tableContainerRef.current.scrollLeft = floatingScrollbarRef.current.scrollLeft;
      applyFlowTransform();
    }
  };

  useEffect(() => {
    let ticking = false;
    const updateDimensionsAndVisibility = () => {
      if (!tableContainerRef.current) return;
      const rect = tableContainerRef.current.getBoundingClientRect();
      const scrollW = tableContainerRef.current.scrollWidth;
      const clientW = tableContainerRef.current.clientWidth;

      setTableScrollWidth(scrollW);

      const hasHorizontalScroll = scrollW > clientW + 5;
      const isTableInView = rect.top < window.innerHeight && rect.bottom > 60;

      if (hasHorizontalScroll && isTableInView) {
        setShowFloatingScroll(true);
        setFloatingStyle({
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        });
        if (floatingScrollbarRef.current && !isSyncingFloatingScroll.current) {
          floatingScrollbarRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
        }
      } else {
        setShowFloatingScroll(false);
      }
      ticking = false;
    };

    const onScrollThrottled = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateDimensionsAndVisibility);
        ticking = true;
      }
    };

    updateDimensionsAndVisibility();

    window.addEventListener("scroll", onScrollThrottled, { passive: true });
    window.addEventListener("resize", updateDimensionsAndVisibility);

    return () => {
      window.removeEventListener("scroll", onScrollThrottled);
      window.removeEventListener("resize", updateDimensionsAndVisibility);
    };
  }, [data, allSortedDates]);

  const flowOffset = showFlowArrows ? flowColumnWidth : 0;

  return (
    <>
      {/* ACTIVE TRACKING PINNED BANNER */}
      {selectedOpDetails && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-indigo-950/90 border border-indigo-500/50 rounded-xl text-xs shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span className="font-bold text-white flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-indigo-400" />
              Tracking Alur {selectedOpDetails.op?._isGroupedRow ? "Group Proses" : "Operator"}:
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-900/90 border border-indigo-600 text-white font-bold tracking-wide">
              {selectedOpDetails.op?._isGroupedRow && selectedOpDetails.op?._groupedOperators && selectedOpDetails.op._groupedOperators.length > 1
                ? `[Group ${selectedOpDetails.op.FLOW_NO ? `(${selectedOpDetails.op.FLOW_NO})` : ""}] ${selectedOpDetails.op._groupedOperators.map(o => o.E_NAME || o.NIK).join(", ")}`
                : `${selectedOpDetails.op?.E_NAME || selectedOpKey} (${selectedOpDetails.op?.NIK})`}
            </span>
            <span className="text-slate-300 text-[11px]">
              Modul: <strong className="text-amber-300">{selectedOpDetails.op?.MODULE}</strong> | Keluar:{" "}
              <strong className="text-emerald-300">{selectedOpDetails.outgoing.length}</strong>
              {Number(selectedOpDetails.op?.MISSING_OUTPUT || 0) !== 0 && (
                <>
                  {" "} | Missing Output: <strong className="text-rose-300 font-bold">{selectedOpDetails.op?.MISSING_OUTPUT}</strong>
                  {selectedOpDetails.op?.MISSING_OUTPUT_UPDATED_BY && (
                    <span className="text-slate-400 font-normal">
                      {" "}(Last updated by: <strong className="text-blue-300">{selectedOpDetails.op.MISSING_OUTPUT_UPDATED_BY}</strong>)
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => setSelectedOpKey(null)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-800/80 hover:bg-rose-900/80 hover:border-rose-700 text-white text-[11px] font-semibold border border-indigo-700 transition-all active:scale-95"
            title="Matikan tracking flow"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Tracking</span>
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl flex flex-col relative">
        <div
          ref={tableContainerRef}
          onScroll={handleTableScroll}
          className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-210px)] custom-scrollbar relative"
        >
          <div className="relative min-w-full w-max">
            <table ref={tableRef} className="border-separate border-spacing-0 text-xs w-max min-w-full">
              <colgroup>
                {/* Sticky Left */}
                <col style={{ width: "90px", minWidth: "90px", maxWidth: "90px" }} />
                <col style={{ width: "50px", minWidth: "50px", maxWidth: "50px" }} />
                <col style={{ width: "145px", minWidth: "145px", maxWidth: "145px" }} />
                <col style={{ width: "220px", minWidth: "220px", maxWidth: "220px" }} />
                <col style={{ width: "65px", minWidth: "65px", maxWidth: "65px" }} />
                <col style={{ width: "90px", minWidth: "90px", maxWidth: "90px" }} />
                {/* Scrollable Dates */}
                {allSortedDates.map((d) => (
                  <col key={`col-${d}`} style={{ width: "52px", minWidth: "52px" }} />
                ))}
                {/* Sticky Right: Missing Output, Total, Stok, Balance */}
                <col style={{ width: "100px", minWidth: "100px", maxWidth: "100px" }} />
                <col style={{ width: "85px", minWidth: "85px", maxWidth: "85px" }} />
                <col style={{ width: "80px", minWidth: "80px", maxWidth: "80px" }} />
                <col style={{ width: "85px", minWidth: "85px", maxWidth: "85px" }} />
                {/* Sticky Right: Dedicated Dynamic Flow Column */}
                {showFlowArrows && (
                  <col
                    style={{
                      width: `${flowColumnWidth}px`,
                      minWidth: `${flowColumnWidth}px`,
                      maxWidth: `${flowColumnWidth}px`,
                    }}
                  />
                )}
              </colgroup>

              <thead className="sticky top-0 z-50">
                <tr className="bg-slate-800 text-white font-bold tracking-wider text-center">
                  {/* STICKY LEFT COLUMNS */}
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-50 bg-slate-800 px-2 py-2 text-center w-[90px] min-w-[90px] max-w-[90px] border-b border-slate-700"
                    style={stickyBorder}
                  >
                    MODULE
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[90px] z-50 bg-slate-800 px-2 py-2 text-center w-[50px] min-w-[50px] max-w-[50px] border-b border-slate-700"
                    style={stickyBorder}
                  >
                    NO
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[140px] z-50 bg-slate-800 px-3 py-2 text-left w-[145px] min-w-[145px] max-w-[145px] border-b border-slate-700"
                    style={stickyBorder}
                  >
                    {groupMode === "grouped" ? "OPERATOR / PROSES" : "OPERATOR"}
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[285px] z-50 bg-slate-800 px-3 py-2 text-left w-[220px] min-w-[220px] max-w-[220px] border-b border-slate-700"
                    style={stickyBorder}
                  >
                    PEMBAGIAN KERJA
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[505px] z-50 bg-slate-800 px-2 py-2 text-center w-[65px] min-w-[65px] max-w-[65px] border-b border-slate-700"
                    style={stickyBorder}
                  >
                    ETC (Person)
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky left-[570px] z-50 bg-slate-800 px-2 py-2 text-center w-[90px] min-w-[90px] max-w-[90px] border-b border-slate-700 font-extrabold text-cyan-300"
                    style={lastLeftStickyBorder}
                  >
                    DATA TYPE
                  </th>

                  {/* SCROLLABLE MONTH HEADER COLUMNS */}
                  {monthGroups.map((grp) => (
                    <th
                      key={grp.monthKey}
                      colSpan={grp.dates.length}
                      className="bg-indigo-950 text-indigo-200 px-3 py-1.5 text-center font-bold tracking-widest border-r border-b border-slate-700"
                    >
                      {grp.monthLabel}
                    </th>
                  ))}

                  {/* STICKY RIGHT COLUMNS (MISSING OUTPUT, TOTAL, STOCK, BALANCE) */}
                  <th
                    rowSpan={2}
                    className="sticky z-50 bg-rose-950 text-rose-300 px-2 py-2 text-center border-b border-slate-700 w-[100px] min-w-[100px] max-w-[100px] font-bold"
                    style={{
                      ...firstRightStickyBorder,
                      right: `${flowOffset + 250}px`,
                    }}
                  >
                    Missing Output
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky z-50 bg-emerald-950 text-emerald-300 px-3 py-2 text-center border-b border-slate-700 w-[85px] min-w-[85px] max-w-[85px] font-bold"
                    style={{
                      ...rightStickyBorder,
                      right: `${flowOffset + 165}px`,
                    }}
                  >
                    Total
                  </th>
                  <th
                    rowSpan={2}
                    className={`sticky z-50 ${groupMode === "grouped" ? "bg-blue-950 text-blue-300" : "bg-purple-950 text-purple-300"
                      } px-2 py-2 text-center border-b border-slate-700 w-[80px] min-w-[80px] max-w-[80px] font-bold`}
                    style={{
                      ...rightStickyBorder,
                      right: `${flowOffset + 85}px`,
                    }}
                    title={
                      groupMode === "grouped"
                        ? "Stok Grouped: Akumulasi stok proses/flow gabungan antar operator"
                        : "Stok Operator: Alokasi stok per individual operator (Yongjin 2-2)"
                    }
                  >
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span>Stok</span>
                      <span className={`text-[9px] font-bold ${groupMode === "grouped" ? "text-blue-400" : "text-purple-400"}`}>
                        {groupMode === "grouped" ? "(Grouped)" : "(Per Op)"}
                      </span>
                    </div>
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky z-50 bg-cyan-950 text-cyan-300 px-3 py-2 text-center border-b border-slate-700 w-[85px] min-w-[85px] max-w-[85px] font-bold"
                    style={{
                      ...rightStickyBorder,
                      right: `${flowOffset}px`,
                    }}
                  >
                    Balance
                  </th>

                  {/* STICKY RIGHT: DEDICATED PROCESS FLOW COLUMN WITH HORIZONTAL SCROLL NAVIGATOR */}
                  {showFlowArrows && (
                    <th
                      rowSpan={2}
                      className="sticky right-0 z-50 bg-indigo-950 text-indigo-200 px-2 py-2 text-center border-b border-slate-700 font-bold select-none"
                      style={{
                        ...rightStickyBorder,
                        width: `${flowColumnWidth}px`,
                        minWidth: `${flowColumnWidth}px`,
                        maxWidth: `${flowColumnWidth}px`,
                      }}
                      title="Proses alur kerja operator jahit berdasarkan Flow No. Scroll horizontal untuk melihat semua garis."
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <div className="flex items-center justify-center gap-1">
                          <span>FLOW</span>
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                            {flowResult.connections.length}
                          </span>
                        </div>

                        {/* Interactive Horizontal Scroll Controller for Flow Column */}
                        {maxFlowScroll > 0 && (
                          <div
                            className="flex items-center gap-1 bg-slate-900/90 px-1.5 py-0.5 rounded-lg border border-indigo-500/40 shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFlowScrollTarget(-40);
                              }}
                              className="p-0.5 rounded hover:bg-indigo-800/80 text-indigo-200 active:scale-95 transition-transform"
                              title="Geser flow ke kiri"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>

                            <input
                              ref={sliderInputRef}
                              type="range"
                              min={0}
                              max={maxFlowScroll}
                              defaultValue={0}
                              onChange={(e) => setFlowScrollImmediate(Number(e.target.value))}
                              className="w-14 h-1 bg-indigo-950 accent-indigo-400 rounded cursor-pointer"
                              title="Scroll horizontal flow lanes"
                            />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFlowScrollTarget(40);
                              }}
                              className="p-0.5 rounded hover:bg-indigo-800/80 text-indigo-200 active:scale-95 transition-transform"
                              title="Geser flow ke kanan"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                </tr>

                <tr className="bg-slate-800 text-slate-300 text-center font-semibold">
                  {allSortedDates.map((dStr) => {
                    let dayNum = dStr;
                    try {
                      const parsed = parseISO(dStr);
                      dayNum = formatDate(parsed, "d");
                    } catch {
                      dayNum = dStr.split("-").pop() || dStr;
                    }
                    return (
                      <th
                        key={dStr}
                        className="px-2 py-1.5 text-center border-r border-b border-slate-700 w-[52px] min-w-[52px] text-[11px] font-mono bg-slate-800 hover:bg-slate-700/60 transition-colors"
                        title={dStr}
                      >
                        {dayNum}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="text-slate-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6 + allSortedDates.length + 4 + (showFlowArrows ? 1 : 0)}
                      className="text-center py-16 text-slate-400 bg-[#0b1329]"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Loading CB Sewing Output data...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6 + allSortedDates.length + 4 + (showFlowArrows ? 1 : 0)}
                      className="text-center py-16 text-slate-400 bg-[#0b1329]"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="text-base font-semibold text-slate-300">
                          No sewing output data found
                        </span>
                        <span className="text-xs text-slate-500">
                          Silakan pilih Factory, Line, Style, dan Work Date lalu klik Search / Lookup.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (() => {
                  let globalOpCounter = 0;
                  return moduleGroups.map((modGrp) => {
                    const modStyle = modGrp.style || getModuleStyle(modGrp.moduleName);
                    let isFirstModRow = true;

                    return modGrp.operators.map((op, opIdx) => {
                      globalOpCounter++;
                      const currentOpNumber = globalOpCounter;
                      const renderModCell = isFirstModRow;
                      isFirstModRow = false;

                      const opKey = `${op.NIK}-${op.MODULE}`;
                      const isSelected = selectedOpKey === opKey;
                      const isHovered = highlightedOpKey === opKey;

                      return (
                        <OperatorRowGroup
                          key={opKey}
                          op={op}
                          currentOpNumber={currentOpNumber}
                          isEvenOp={opIdx % 2 === 0}
                          moduleName={modGrp.moduleName}
                          totalModRows={modGrp.totalRows}
                          renderModCell={renderModCell}
                          modStyle={modStyle}
                          allSortedDates={allSortedDates}
                          flowColumnWidth={flowColumnWidth}
                          flowOffset={flowOffset}
                          showFlowArrows={showFlowArrows}
                          totalQcHelperOutput={totalQcHelperOutput}
                          isSelected={isSelected}
                          isHovered={isHovered}
                          viewMode={viewMode}
                          groupMode={groupMode}
                          allRows={data}
                          onSelect={handleSelectOperator}
                          onHover={handleHoverOperator}
                          setAnchorRef={setAnchorRef}
                          onEditWorkHours={onEditWorkHours}
                          onSaveMissingOutput={onSaveMissingOutput}
                        />
                      );
                    });
                  });
                })()}
              </tbody>
            </table>

            {/* PROCESS FLOW SVG ARROW CONNECTORS */}
            {showFlowArrows && flowResult.connections.length > 0 && canvasDimensions.height > 0 && (
              <OperatorFlowArrows
                ref={flowGroupRef}
                connections={flowResult.connections}
                routedConnections={routedConnections}
                totalLanes={totalLanes}
                operatorPositions={operatorPositions}
                containerWidth={canvasDimensions.width}
                containerHeight={canvasDimensions.height}
                flowColumnX={flowColumnX}
                flowColumnWidth={fullFlowDiagramWidth}
                highlightOperatorKey={highlightedOpKey}
                selectedOperatorKey={selectedOpKey}
                onSelectOperator={handleSelectOperator}
              />
            )}
          </div>
        </div>
      </div>

      {/* FLOATING HORIZONTAL SCROLLBAR */}
      <div
        ref={floatingScrollbarRef}
        onScroll={handleFloatingScroll}
        className={`fixed bottom-0 z-50 overflow-x-auto overflow-y-hidden bg-slate-950/95 backdrop-blur-md border-t border-slate-700/80 shadow-[0_-4px_16px_rgba(0,0,0,0.6)] transition-opacity duration-200 ${showFloatingScroll ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        style={{
          ...floatingStyle,
          height: "12px",
        }}
      >
        <div style={{ width: `${tableScrollWidth}px`, height: "1px" }} />
      </div>
    </>
  );
};