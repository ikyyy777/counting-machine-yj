import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, RefreshCcw, Zap, X, Calendar, Search, Edit2, Edit3, Check, Tag, Users, UserCheck, Target, ChevronDown, Plus, Clock, RotateCcw, Info, Activity, Sparkles, FileSpreadsheet } from "lucide-react";
import { format, parseISO } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fetchOutputModuleTotal, saveTargetOverride, saveUphOverride, saveMissingOutput } from "../services/integratedLineMonitoring";
import { fetchEmployeeDetailHistory, fetchAlgorismArrows, getAuthToken, fetchManualTargetWH, setCurrentFactory, fetchStyles } from "../services/api";
import { saveWorkingHoursOverride, saveLineWorkingHoursOverride } from "../services/stockOperator";
import { fetchCBSewingOutput } from "../services/cbSewingOutput";
import { CBSewingOutputRow } from "../types/cbSewingOutput";
import { Xwrapper, useXarrow } from "react-xarrows";
import { toast } from "react-toastify";
import { IntegratedLineMonitoringResponse } from "../types/api";
import {
  exportJoinAssemblyExcel,
  exportMultiLineJoinAssemblyExcel,
  mapRawOpRowsToJoinAssembly,
  ExportLineSheetInput,
} from "../utils/exportLineDetailsExcel";

interface OutputModuleTotalResponse {
  LINE_CODE: string;
  STYLE_NO: string;
  PART: string;
  TARGET_PRD: number;
  TOTALOUT: number;
  TOTALIN: number;
  TOTALOUT_TODAY: number;
  TOTALIN_TODAY: number;
}

interface FeedingLine {
  id: string;
  partKey: string;
  name: string;
  input: number;
  inputToday: number;
  waiting: number;
  output: number;
  outputToday: number;
  uph: number;
  idleTime: string;
  status: "insufficient" | "normal" | "delay";
  statusText: string;
}

interface ProcessItem {
  no: number;
  autoSeq?: number;
  name: string;
  role: string;
  worker: string;
  nik?: string;
  uphTarget: number;
  uphActual: number;
  cumulative: number;
  wip: number;
  bottleneckTime: string;
  bottleneckHours?: number;
  history: { date: string; value: number }[];
  status: "good" | "warning" | "critical";
  statusText: string;
  flowNo?: string;
  totalOutputAlltime?: number;
  totalStockAlltime?: number;
  stockGrouped?: number;
  stockDays?: number;
  dailyTarget?: number;
  operatorType?: string;
  isOverline?: boolean;
  originalLineName?: string;
  missingOutput?: number;
  workingHours?: number;
  currentWorkHours?: number;
  isManualWh?: boolean;
  mainProcess?: string;
  flowPredNik?: string;
  flowPredName?: string;
  flowPredFlow?: string;
  flowPredModule?: string;
  flowPredOutput?: number;
  isFirstProcess?: boolean;
  flowTargetNik?: string;
  flowTargetName?: string;
  flowTargetFlow?: string;
  flowTargetModule?: string;
  flowTargetOutput?: number;
  _isGroupedRow?: boolean;
  _groupedOperators?: ProcessItem[];
  _groupedOutput?: number;
  _groupedStock?: number;
}

interface LineDetailsProps {
  lineName: string;
  lineCode: string;
  styleNo: string;
  factory: string;
  date: string;
  onBack: () => void;
  lineItem?: IntegratedLineMonitoringResponse;
  onLineChange?: (lineName: string) => void;
  allLines?: IntegratedLineMonitoringResponse[];
  onDateChange?: (date: string) => void;
  onStyleChange?: (style: string) => void;
}

const renderCompareBadge = (diff?: number, pct?: number | null) => {
  if (diff === undefined || diff === null || diff === 0) return null;
  const isPositive = diff > 0;
  const badgeClass = isPositive
    ? "text-emerald-400"
    : "text-rose-450";
  const arrow = isPositive ? "↑" : "↓";
  const diffStr = isPositive ? `+${diff.toLocaleString()}` : diff.toLocaleString();
  const pctStr =
    pct !== null && pct !== undefined
      ? ` (${isPositive && pct >= 0 ? "+" : ""}${pct.toFixed(0)}%)`
      : "";
  return (
    <span
      className={`text-[10px] font-extrabold ${badgeClass} inline-flex items-center gap-0.5`}
      title="Compared to Yesterday"
    >
      <span>{arrow}</span>
      <span>
        {diffStr}
        {pctStr}
      </span>
    </span>
  );
};

const getPreviousWorkday = (startDate: Date, steps: number): Date => {
  const currentDate = new Date(startDate);
  let stepsRemaining = steps;
  while (stepsRemaining > 0) {
    currentDate.setDate(currentDate.getDate() - 1);
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) { // 0 is Sunday, 6 is Saturday
      stepsRemaining--;
    }
  }
  return currentDate;
};

const renderOperatorTypeBadge = (type: string | undefined) => {
  const normType = (type || "Operator Biasa").trim();
  switch (normType) {
    case "Sewing Supporter":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider whitespace-nowrap">
          Sew Supporter
        </span>
      );
    case "Press (Seamsealing)":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider whitespace-nowrap">
          Seam Seal
        </span>
      );
    case "Iron (Welbon)":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wider whitespace-nowrap">
          Iron Welbon
        </span>
      );
    case "Press (Welbon)":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider whitespace-nowrap">
          Press Welbon
        </span>
      );
    case "CROSSBAR":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ff0000]/10 text-[#ff0000] border border-[#ff0000]/20 uppercase tracking-wider whitespace-nowrap">
          Crossbar
        </span>
      );
    case "Operator Biasa":
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/40 text-slate-400 border border-slate-700/30 uppercase tracking-wider whitespace-nowrap">
          Sewing
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/40 text-slate-400 border border-slate-700/30 uppercase tracking-wider whitespace-nowrap">
          {normType}
        </span>
      );
  }
};

const resolveMainProcess = (item: any): string => {
  if (!item) return "-";
  if (item.MAIN_PROCESS_NAME && String(item.MAIN_PROCESS_NAME).trim()) {
    return String(item.MAIN_PROCESS_NAME).trim();
  }
  if (Array.isArray(item.FLOWS)) {
    const mainFlow = item.FLOWS.find((f: any) => Number(f.MAIN_PROC ?? 0) === 1);
    if (mainFlow && mainFlow.PROCESS_NAME) {
      return String(mainFlow.PROCESS_NAME).trim();
    }
  }
  if (Array.isArray(item.TASKS)) {
    const mainTask = item.TASKS.find((t: any) => Number(t.MAIN_PROC ?? 0) === 1);
    if (mainTask && mainTask.PROCESS_NAME) {
      return String(mainTask.PROCESS_NAME).trim();
    }
  }
  if (Number(item.MAIN_PROC ?? 0) === 1 && item.PROCESS_NAME) {
    return String(item.PROCESS_NAME).trim();
  }
  if (item.PROCESS_NAME && String(item.PROCESS_NAME).trim()) {
    return String(item.PROCESS_NAME).trim();
  }
  if (item.name && String(item.name).trim()) {
    return String(item.name).trim();
  }
  return "-";
};

export const getModuleBadgeStyle = (modName?: string): string => {
  if (!modName) return "bg-slate-800/80 text-slate-300 border-slate-700/50";
  const m = modName.toUpperCase().replace(/\s+/g, "");
  if (m.includes("FRONT")) return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (m.includes("BACK")) return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
  if (m.includes("COLLAR")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (m.includes("SLEEVE")) return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  if (m.includes("POCKET")) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (m.includes("HOOD")) return "bg-purple-500/15 text-purple-300 border-purple-500/30";
  if (m.includes("MAIN") || m.includes("MF") || m.includes("ASSEMBLY")) return "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return "bg-slate-800/80 text-slate-300 border-slate-700/50";
};

export interface StockFlowDetail {
  receiverName: string;
  receiverNik?: string;
  receiverModule: string;
  receiverFlow: string;
  receiverOutput: number;

  providerName: string;
  providerNik?: string;
  providerModule: string;
  providerFlow: string;
  providerOutput?: number;

  stockVal: number;
  isInitialProcess?: boolean;
  isGrouped?: boolean;
}

/**
 * Extract primary process grouping key (stripping .D and suffixes).
 */
export const getPrimaryFlowKey = (flowNo?: string, fallbackId?: string | number): string => {
  const rawFlow = (flowNo ?? "").trim();
  const tokens = rawFlow.split(",").map((s) => s.trim()).filter(Boolean);
  if (!tokens.length) return rawFlow || `_solo_${fallbackId ?? 0}`;
  const first = tokens[0];
  const dotDIdx = first.indexOf(".D");
  let base = dotDIdx !== -1 ? first.substring(0, dotDIdx) : first;
  if (base.includes("_")) base = base.split("_")[0];
  return base.toUpperCase().trim();
};

export interface TargetGroupInfo {
  targetName: string;
  targetNik?: string;
  targetFlow: string;
  targetModule: string;
  targetOutput: number;
  isGroup: boolean;
  groupOps: ProcessItem[];
}

/**
 * Resolves downstream target operator group info (names, combined output, peer list).
 * In Grouped Mode: targets sharing the same base flow are aggregated as a group (OP B + OP C).
 */
export const isLastAssemblyProcess = (p: ProcessItem, allProcesses?: ProcessItem[]): boolean => {
  const isAssembly = (p.role || "").toUpperCase().trim() === "ASSEMBLY";
  if (!isAssembly || !allProcesses || allProcesses.length === 0) return false;
  const assemblyOps = allProcesses.filter((x) => (x.role || "").toUpperCase().trim() === "ASSEMBLY");
  if (assemblyOps.length === 0) return false;
  const maxSeq = Math.max(...assemblyOps.map((x) => x.autoSeq ?? x.no ?? 0));
  const currentSeq = p.autoSeq ?? p.no ?? 0;
  return currentSeq >= maxSeq && maxSeq > 0;
};

export const resolveTargetGroupInfo = (
  p: ProcessItem,
  allProcesses?: ProcessItem[],
  isGroupedMode: boolean = false
): TargetGroupInfo | null => {
  if (isLastAssemblyProcess(p, allProcesses)) return null;

  const targetNik = p.flowTargetNik ? p.flowTargetNik.trim() : "";
  if (!targetNik || targetNik === "-") return null;

  const normTargetNik = targetNik.toUpperCase();
  const foundTarget = (allProcesses || []).find(
    (o) => o.nik && o.nik.trim().toUpperCase() === normTargetNik
  );

  if (!isGroupedMode || !foundTarget) {
    return {
      targetName: p.flowTargetName || foundTarget?.worker || targetNik,
      targetNik: targetNik,
      targetFlow: p.flowTargetFlow || foundTarget?.flowNo || "-",
      targetModule: p.flowTargetModule || foundTarget?.role || "-",
      targetOutput: p.flowTargetOutput !== undefined ? p.flowTargetOutput : (foundTarget?.totalOutputAlltime ?? 0),
      isGroup: false,
      groupOps: foundTarget ? [foundTarget] : [],
    };
  }

  // Grouped Mode: find all operators sharing target's base flow key
  const targetKey = getPrimaryFlowKey(foundTarget.flowNo, foundTarget.nik);
  const currentNiks = new Set((p._groupedOperators ?? [p]).map((o) => (o.nik || "").trim().toUpperCase()));

  const targetPeers = (allProcesses || []).filter((o) => {
    const oNik = (o.nik || "").trim().toUpperCase();
    if (currentNiks.has(oNik)) return false;
    return getPrimaryFlowKey(o.flowNo, o.nik) === targetKey;
  });

  if (targetPeers.length > 0) {
    const totalOut = targetPeers.reduce((sum, o) => sum + (o.totalOutputAlltime ?? 0), 0);
    const names = targetPeers.map((o) => o.worker || o.nik).join(" + ");
    const niks = targetPeers.map((o) => o.nik).filter(Boolean).join(", ");
    return {
      targetName: names,
      targetNik: niks,
      targetFlow: targetPeers[0].flowNo || p.flowTargetFlow || "-",
      targetModule: targetPeers[0].role || p.flowTargetModule || "-",
      targetOutput: totalOut,
      isGroup: targetPeers.length > 1,
      groupOps: targetPeers,
    };
  }

  return {
    targetName: p.flowTargetName || foundTarget.worker || targetNik,
    targetNik: targetNik,
    targetFlow: p.flowTargetFlow || foundTarget.flowNo || "-",
    targetModule: p.flowTargetModule || foundTarget.role || "-",
    targetOutput: foundTarget.totalOutputAlltime ?? 0,
    isGroup: false,
    groupOps: [foundTarget],
  };
};

/**
 * Calculate Stock Days for a grouped process row:
 * Stock Days = Group Stock / Total Group Daily Output (fallback to Total Daily Target)
 */
const getGroupStockDays = (
  calcStock: number,
  ops: ProcessItem[],
  isInitialProcess: boolean
): string => {
  if (isInitialProcess) return "0.0";
  const totalDailyOutput = ops.reduce((sum, op) => sum + (op.cumulative ?? 0), 0);
  if (totalDailyOutput > 0) {
    return (calcStock / totalDailyOutput).toFixed(1);
  }
  const totalTarget = ops.reduce((sum, op) => sum + (op.dailyTarget ?? 0), 0);
  if (totalTarget > 0) {
    return (calcStock / totalTarget).toFixed(1);
  }
  return "0.0";
};

/**
 * Calculate Stock Days for a per-operator row:
 * Stock Days = Operator Stock / Operator Daily Output (fallback to Daily Target)
 */
const getOperatorStockDays = (p: ProcessItem): string => {
  if (p.stockDays !== undefined && p.stockDays !== null) {
    return `${Number(p.stockDays).toFixed(1)}`;
  }
  const stockVal = p.totalStockAlltime ?? 0;
  if (p.cumulative && p.cumulative > 0) {
    return (stockVal / p.cumulative).toFixed(1);
  }
  if (p.dailyTarget && p.dailyTarget > 0) {
    return (stockVal / p.dailyTarget).toFixed(1);
  }
  return "0.0";
};

const renderStockBadgeWithSource = (
  p: ProcessItem,
  groupStock?: number,
  isGroupedMode?: boolean,
  allLineProcesses?: ProcessItem[],
  onOpenDetail?: (detail: StockFlowDetail) => void
) => {
  const isGrp = Boolean(isGroupedMode);
  const ops = isGrp && p._groupedOperators && p._groupedOperators.length > 0 ? p._groupedOperators : [p];
  const currentName = ops.map((op) => op.worker || op.nik).join(" + ") || "Operator";
  const currentNik = ops.map((op) => op.nik).filter(Boolean).join(", ");
  const currentModule = p.role || "-";
  const currentFlow = p.flowNo || "-";
  const currentOut = isGrp
    ? (p._groupedOutput !== undefined ? p._groupedOutput : (p.totalOutputAlltime ?? 0))
    : (p.totalOutputAlltime ?? 0);

  const isLastAssem = isLastAssemblyProcess(p, allLineProcesses);
  const targetInfo = isLastAssem ? null : resolveTargetGroupInfo(p, allLineProcesses, isGrp);
  const hasTarget = targetInfo !== null;

  const stockVal = isLastAssem
    ? 0
    : (groupStock !== undefined
        ? groupStock
        : (isGrp
            ? (p._groupedStock ?? p.stockGrouped ?? (hasTarget ? currentOut - targetInfo.targetOutput : 0))
            : (p.totalStockAlltime ?? (hasTarget ? currentOut - targetInfo.targetOutput : 0))));

  const stockColorClass =
    stockVal < 0
      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
      : stockVal > 200
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : stockVal === 0
      ? "bg-slate-800/80 text-slate-400 border-slate-700/50"
      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

  if (!hasTarget) {
    const tooltipText = isLastAssem
      ? `Final Process of Module ASSEMBLY (Stock = 0 pcs):\nOperator [${currentName}] in module ASSEMBLY is the final process on the line and has no downstream target.`
      : `Final Process (Stock = ${stockVal.toLocaleString()} pcs):\nOperator [${currentName}] with flow [${currentFlow}] (Module: ${currentModule}) has no downstream target in this line.`;

    const detailObj: StockFlowDetail = {
      providerName: currentName,
      providerNik: currentNik,
      providerModule: currentModule,
      providerFlow: currentFlow,
      providerOutput: currentOut,
      receiverName: "-",
      receiverModule: "-",
      receiverFlow: "-",
      receiverOutput: 0,
      stockVal,
      isInitialProcess: true,
      isGrouped: isGrp,
    };

    return (
      <div className="inline-flex items-center justify-center gap-1.5">
        <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border shadow-xs ${stockColorClass}`}>
          {stockVal.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenDetail) onOpenDetail(detailObj);
          }}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 border border-slate-600/40 cursor-pointer transition-colors shrink-0"
          title={tooltipText}
        >
          <Info className="w-2.5 h-2.5" />
        </button>
      </div>
    );
  }

  const calcText = isGrp
    ? `${ops.length > 1 ? "Group " : ""}Output [${currentName}] (${currentOut.toLocaleString()}) − ${targetInfo.isGroup ? "Group " : ""}Output [${targetInfo.targetName}] (${targetInfo.targetOutput.toLocaleString()}) = ${stockVal.toLocaleString()}`
    : `Output [${currentName}] (${currentOut.toLocaleString()}) − Output [${targetInfo.targetName}] (${targetInfo.targetOutput.toLocaleString()}) = ${stockVal.toLocaleString()}`;

  const tooltipText = isGrp
    ? `Stock Flow Details (Grouped Mode):\n• Current Process: [${currentName}] with flow [${currentFlow}] (Module: ${currentModule})\n• Target Downstream: [${targetInfo.targetName}] (Module: ${targetInfo.targetModule}) with flow [${targetInfo.targetFlow}]\n• Calculation: ${calcText}`
    : `Stock Flow Details (Yongjin 2-2):\n• Current Operator: [${currentName}] with flow [${currentFlow}] (Module: ${currentModule})\n• Target Downstream: [${targetInfo.targetName}] (Module: ${targetInfo.targetModule}) with flow [${targetInfo.targetFlow}]\n• Calculation: ${calcText}`;

  const detailObj: StockFlowDetail = {
    providerName: currentName,
    providerNik: currentNik,
    providerModule: currentModule,
    providerFlow: currentFlow,
    providerOutput: currentOut,
    receiverName: targetInfo.targetName,
    receiverNik: targetInfo.targetNik,
    receiverModule: targetInfo.targetModule,
    receiverFlow: targetInfo.targetFlow,
    receiverOutput: targetInfo.targetOutput,
    stockVal,
    isInitialProcess: false,
    isGrouped: isGrp,
  };

  return (
    <div className="inline-flex items-center justify-center gap-1.5">
      <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border shadow-xs ${stockColorClass}`}>
        {stockVal.toLocaleString()}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenDetail) onOpenDetail(detailObj);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 cursor-pointer transition-colors shrink-0"
        title={tooltipText}
      >
        <Info className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

const LineDetails: React.FC<LineDetailsProps> = ({
  lineName,
  lineCode,
  styleNo,
  factory,
  date,
  onBack,
  lineItem,
  onLineChange,
  allLines,
  onDateChange,
  onStyleChange,
}) => {
  const [activeDate, setActiveDate] = useState<string>(date);
  const [activeStyle, setActiveStyle] = useState<string>(styleNo);

  useEffect(() => {
    if (date) setActiveDate(date);
  }, [date]);

  useEffect(() => {
    if (styleNo) setActiveStyle(styleNo);
  }, [styleNo]);

  useEffect(() => {
    // When lineCode changes, reset activeStyle to lineItem's style or styleNo
    const targetStyle = lineItem?.STYLE_NO || styleNo || "";
    if (targetStyle) {
      setActiveStyle(targetStyle);
    }
  }, [lineCode]);

  const baseDate = useMemo(() => {
    try {
      return parseISO(activeDate);
    } catch {
      return new Date();
    }
  }, [activeDate]);

  const dateD1Str = format(getPreviousWorkday(baseDate, 1), "dd MMM");
  const dateD2Str = format(getPreviousWorkday(baseDate, 2), "dd MMM");
  useEffect(() => {
    if (factory) {
      setCurrentFactory(factory);
    }
  }, [factory]);

  // Available styles for the active line and date
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [loadingStyles, setLoadingStyles] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const loadStyles = async () => {
      if (!lineCode || !factory || !activeDate) return;
      setLoadingStyles(true);
      try {
        const parsedDate = parseISO(activeDate);
        const res = await fetchStyles({
          line_id: lineCode,
          office: factory,
          date: parsedDate,
        });
        if (!isMounted) return;
        const stylesFromApi = res.map((s) => s.STYLE).filter(Boolean);
        
        // ONLY use styles that belong to this line and date from API or lineItem fallback
        let validStyles: string[] = [];
        if (stylesFromApi.length > 0) {
          validStyles = Array.from(new Set(stylesFromApi.map((s) => s.trim()).filter(Boolean)));
        } else if (lineItem?.STYLE_NO) {
          validStyles = [lineItem.STYLE_NO.trim()];
        }

        setAvailableStyles(validStyles);

        // Auto-select valid style if activeStyle is not in validStyles for this line
        if (validStyles.length > 0) {
          setActiveStyle((prevActive) => {
            if (prevActive && validStyles.includes(prevActive)) {
              return prevActive;
            }
            const fallbackStyle = (lineItem?.STYLE_NO && validStyles.includes(lineItem.STYLE_NO.trim()))
              ? lineItem.STYLE_NO.trim()
              : validStyles[0];
            if (fallbackStyle !== prevActive) {
              onStyleChange?.(fallbackStyle);
            }
            return fallbackStyle;
          });
        }
      } catch (err) {
        console.error("Failed to load styles for line:", err);
        const fallback = lineItem?.STYLE_NO ? [lineItem.STYLE_NO.trim()] : [];
        if (isMounted) {
          setAvailableStyles(fallback);
          if (fallback.length > 0) {
            setActiveStyle((prevActive) => {
              if (prevActive && fallback.includes(prevActive)) return prevActive;
              if (fallback[0] !== prevActive) {
                onStyleChange?.(fallback[0]);
              }
              return fallback[0];
            });
          }
        }
      } finally {
        if (isMounted) setLoadingStyles(false);
      }
    };

    loadStyles();
    return () => {
      isMounted = false;
    };
  }, [lineCode, factory, activeDate]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<"today" | "cumulative">("today");
  const [activePartModal, setActivePartModal] = useState<FeedingLine | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<{ worker: string; processName: string; nik?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModule, setFilterModule] = useState(true);
  const [showNullCbOutput, setShowNullCbOutput] = useState(false);
  const [activeStockDetail, setActiveStockDetail] = useState<StockFlowDetail | null>(null);

  const [apiData, setApiData] = useState<OutputModuleTotalResponse[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const silentRefreshRef = React.useRef(false);
  const silentRefreshTimerRef = React.useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (silentRefreshTimerRef.current !== null) {
        window.clearTimeout(silentRefreshTimerRef.current);
      }
    };
  }, []);

  // Pending missing output updates ref to protect optimistic updates from stale server cache
  const pendingMissingOutputsRef = React.useRef<Map<string, { qty: number; timestamp: number }>>(new Map());

  // Cache of all operator rows from GetCBSewingOutputData
  const [allOpData, setAllOpData] = useState<CBSewingOutputRow[]>([]);

  const [operatorHistory, setOperatorHistory] = useState<any[]>([]);
  const [operatorAlltimeOutput, setOperatorAlltimeOutput] = useState<number>(0);
  const [arrows, setArrows] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);


  const [cbOperatorsCount, setCbOperatorsCount] = useState<number | null>(null);
  const [dbProcesses, setDbProcesses] = useState<ProcessItem[]>([]);
  const updateXarrow = useXarrow();

  const [modalProcesses, setModalProcesses] = useState<ProcessItem[]>([]);
  const [loadingModalProcesses, setLoadingModalProcesses] = useState(false);

  const [editingModulePart, setEditingModulePart] = useState<string | null>(null);
  const [editingTargetValue, setEditingTargetValue] = useState<string>("");

  const [editingUphNik, setEditingUphNik] = useState<string | null>(null);
  const [tempUphTarget, setTempUphTarget] = useState<string>("");

  const [editingMissingNik, setEditingMissingNik] = useState<string | null>(null);
  const [tempMissingQty, setTempMissingQty] = useState<string>("");

  const [editingWorkHoursNik, setEditingWorkHoursNik] = useState<string | null>(null);
  const [tempWorkHours, setTempWorkHours] = useState<string>("");

  // Manual Target WH state
  const [manualTargetWH, setManualTargetWH] = useState<{ TARGET: number | null, WORKING_HOUR: number | null }>({ TARGET: null, WORKING_HOUR: null });

  // Toggle: group rows with same process into combined rows vs show per-operator
  const [groupByProcess, setGroupByProcess] = useState<boolean>(true);
  // Separate toggle for the Detailed Process Flow modal
  const [modalGroupByProcess, setModalGroupByProcess] = useState<boolean>(true);

  // Working Hours State
  const [isWorkHoursModalOpen, setIsWorkHoursModalOpen] = useState<boolean>(false);
  const [tempWorkingHours, setTempWorkingHours] = useState<string>("");
  const [isSavingWorkHours, setIsSavingWorkHours] = useState<boolean>(false);
  const [selectedOpForWorkHours, setSelectedOpForWorkHours] = useState<{
    nik: string;
    name: string;
    currentHours: number;
    currentWorkHours: number;
    isManual: boolean;
  } | null>(null);

  // Bulk Working Hours State (All operators on the line)
  const [isBulkWorkHoursModalOpen, setIsBulkWorkHoursModalOpen] = useState<boolean>(false);
  const [bulkWorkingHours, setBulkWorkingHours] = useState<string>("");
  const [isSavingBulkWorkHours, setIsSavingBulkWorkHours] = useState<boolean>(false);

  const activeWorkingHours = allOpData[0]?.WORKING_HOURS ?? 11;
  const activeCurrentWorkHours = allOpData[0]?.CURRENT_WORK_HOURS ?? activeWorkingHours;
  const isManualWorkHours = Boolean(allOpData[0]?.IS_MANUAL_WH);

  const handleOpenBulkWorkHoursModal = () => {
    setBulkWorkingHours(String(activeWorkingHours));
    setIsBulkWorkHoursModalOpen(true);
  };

  const handleSaveBulkWorkHours = async (hours: number) => {
    if (hours < 0) {
      toast.error("Working hours cannot be negative");
      return;
    }

    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error("Failed to parse auth token", err);
    }

    const allNiksSet = new Set<string>();
    allOpData.forEach((op) => {
      if (op.NIK) allNiksSet.add(op.NIK.trim());
    });
    dbProcesses.forEach((p) => {
      if (p.nik) allNiksSet.add(p.nik.trim());
    });
    modalProcesses.forEach((p) => {
      if (p.nik) allNiksSet.add(p.nik.trim());
    });
    const niks = Array.from(allNiksSet);

    setIsSavingBulkWorkHours(true);
    try {
      const res = await saveLineWorkingHoursOverride({
        workDate: activeDate,
        lineCode,
        styleNo: activeStyle,
        workingHours: hours,
        updatedBy: updaterUser,
        niks,
      });

      if (res.success) {
        if (hours <= 0) {
          toast.success(`Working hours for all operators on Line ${lineName} reset to automatic.`);
        } else {
          toast.success(
            `Working hours for all operators on Line ${lineName} (${niks.length > 0 ? niks.length + " " : ""}operators) successfully set to ${hours} hrs.`
          );
        }
        setIsBulkWorkHoursModalOpen(false);
        handleRefresh(true);
      } else {
        toast.error("Failed to update working hours for operators on this line.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update operator working hours.");
    } finally {
      setIsSavingBulkWorkHours(false);
    }
  };

  const handleOpenWorkHoursModalForOp = (op: {
    nik?: string;
    worker?: string;
    workingHours?: number;
    currentWorkHours?: number;
    isManualWh?: boolean;
  }) => {
    if (!op.nik) {
      toast.error("Operator NIK not available");
      return;
    }
    const currentHours = op.workingHours ?? activeWorkingHours;
    setSelectedOpForWorkHours({
      nik: op.nik,
      name: op.worker || op.nik,
      currentHours,
      currentWorkHours: op.currentWorkHours ?? currentHours,
      isManual: Boolean(op.isManualWh),
    });
    setTempWorkingHours(String(currentHours));
    setIsWorkHoursModalOpen(true);
  };

  const handleOpenWorkHoursModal = () => {
    if (allOpData.length > 0 && allOpData[0]?.NIK) {
      handleOpenWorkHoursModalForOp({
        nik: allOpData[0].NIK,
        worker: allOpData[0].E_NAME || allOpData[0].NIK,
        workingHours: activeWorkingHours,
        currentWorkHours: activeCurrentWorkHours,
        isManualWh: isManualWorkHours,
      });
    } else {
      toast.error("No operator data available to edit work hours");
    }
  };
  void handleOpenWorkHoursModal;

  const handleSaveWorkHours = async (hours: number) => {
    if (!selectedOpForWorkHours?.nik) {
      toast.error("Operator NIK not selected");
      return;
    }
    if (hours < 0) {
      toast.error("Working hours cannot be negative");
      return;
    }

    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error("Failed to parse auth token", err);
    }

    setIsSavingWorkHours(true);
    try {
      const success = await saveWorkingHoursOverride({
        workDate: activeDate,
        lineCode,
        styleNo: activeStyle,
        nik: selectedOpForWorkHours.nik,
        workingHours: hours,
        updatedBy: updaterUser,
      });

      if (success) {
        if (hours <= 0) {
          toast.success(`Working hours for ${selectedOpForWorkHours.name} reset to automatic.`);
        } else {
          toast.success(`Working hours for ${selectedOpForWorkHours.name} set to ${hours} hrs.`);
        }
        setIsWorkHoursModalOpen(false);
        setSelectedOpForWorkHours(null);
        handleRefresh(true);
      } else {
        toast.error("Failed to update working hours override.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update working hours override.");
    } finally {
      setIsSavingWorkHours(false);
    }
  };

  const handleSaveInlineWorkHours = async (nik: string | undefined) => {
    if (!nik) {
      toast.error("Operator NIK not available");
      return;
    }
    const hours = parseFloat(tempWorkHours);
    if (isNaN(hours) || hours < 0) {
      toast.error("Invalid working hours value");
      return;
    }

    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error("Failed to parse auth token", err);
    }

    try {
      const success = await saveWorkingHoursOverride({
        workDate: activeDate,
        lineCode,
        styleNo: activeStyle,
        nik,
        workingHours: hours,
        updatedBy: updaterUser,
      });

      if (success) {
        toast.success(`Working hours set to ${hours} hrs.`);
        setEditingWorkHoursNik(null);
        setTempWorkHours("");
        handleRefresh(true);
      } else {
        toast.error("Failed to update working hours override.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update working hours override.");
    }
  };


  const handleSaveModuleTarget = async (partKey: string, targetVal: number) => {
    if (targetVal < 0) {
      toast.error("Target Prod cannot be negative");
      return;
    }

    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error("Failed to parse auth token", err);
    }

    // Optimistic Update: Update state immediately so UI changes instantly
    const previousApiData = [...apiData];
    const previousDbProcesses = [...dbProcesses];
    const previousModalProcesses = [...modalProcesses];

    setApiData((prev) =>
      prev.map((item) =>
        String(item.PART).toUpperCase() === partKey.toUpperCase()
          ? { ...item, TARGET_PRD: targetVal }
          : item
      )
    );
    setDbProcesses((prev) =>
      prev.map((item) =>
        String(item.role).toUpperCase() === partKey.toUpperCase()
          ? { ...item, dailyTarget: targetVal }
          : item
      )
    );
    setModalProcesses((prev) =>
      prev.map((item) =>
        String(item.role).toUpperCase() === partKey.toUpperCase()
          ? { ...item, dailyTarget: targetVal }
          : item
      )
    );
    setEditingModulePart(null);

    try {
      const success = await saveTargetOverride({
        workDate: activeDate,
        lineCode,
        styleNo: activeStyle,
        part: partKey,
        targetProd: targetVal,
        updatedBy: updaterUser,
      });

      if (success) {
        toast.success(`Target for ${partKey} updated successfully.`);
        handleRefresh();
      } else {
        // Rollback
        setApiData(previousApiData);
        setDbProcesses(previousDbProcesses);
        setModalProcesses(previousModalProcesses);
        toast.error("Failed to save target override.");
      }
    } catch (err: any) {
      // Rollback
      setApiData(previousApiData);
      setDbProcesses(previousDbProcesses);
      setModalProcesses(previousModalProcesses);
      toast.error(err.message || "Failed to save target override.");
    }
  };

  const prevParamsRef = React.useRef({ lineCode: "", styleNo: "", date: "" });
  const prevFetchKeyRef = React.useRef<string>("");

  useEffect(() => {
    let active = true;

    const loadAllData = async () => {
      if (!lineCode || !activeStyle || !activeDate || !factory) {
        setLoadingData(false);
        setIsBackgroundSyncing(false);
        return;
      }

      const currentFetchKey = `${factory}|${lineCode}|${activeStyle}|${activeDate}|${filterModule}|${refreshKey}`;
      if (prevFetchKeyRef.current === currentFetchKey) {
        setLoadingData(false);
        setIsBackgroundSyncing(false);
        return; // Guard against redundant duplicate API calls
      }
      prevFetchKeyRef.current = currentFetchKey;

      const isLineOrDateChanged =
        prevParamsRef.current.lineCode !== lineCode ||
        prevParamsRef.current.styleNo !== activeStyle ||
        prevParamsRef.current.date !== activeDate;

      // Update the ref
      prevParamsRef.current = { lineCode, styleNo: activeStyle, date: activeDate };

      const shouldUseSilentSync = !isLineOrDateChanged && (silentRefreshRef.current || dbProcesses.length > 0);
      silentRefreshRef.current = false;

      if (isLineOrDateChanged) {
        setLoadingData(true);
        setIsBackgroundSyncing(false);
        // Clear previous data to prevent layout flash of stale data
        setApiData([]);
        setDbProcesses([]);
        setArrows([]);
        setCbOperatorsCount(null);
      } else if (shouldUseSilentSync) {
        // Keep current table visible & interactive during background sync (zero skeleton flash)
        setIsBackgroundSyncing(true);
      } else {
        setLoadingData(true);
      }

      try {
        const isManualRefresh = refreshKey > 0;
        // Fetch data sources in parallel: module totals, operator master data, arrows, and manual target
        // (CBC_WEB_GET_EMPLOYEE_STATS disabled as requested)
        const [totalRes, opMasterRes, arrowRes, manualTargetRes] = await Promise.all([
          fetchOutputModuleTotal({ factory, dateFrom: activeDate, lineCode, styleNo: activeStyle, noCache: isManualRefresh }).catch((err) => {
            console.error("Failed to load output module total data:", err);
            return null;
          }),
          fetchCBSewingOutput({
            factory,
            lineNo: lineCode,
            styleNo: activeStyle,
            workDate: activeDate,
            filterModule,
            noCache: isManualRefresh,
          }).catch((err) => {
            console.error("Failed to load sewing output data:", err);
            return null;
          }),
          fetchAlgorismArrows({
            lineNo: parseInt(lineCode, 10) || 1,
            styleNo: activeStyle,
            factory,
          }).catch((err) => {
            console.error("Failed to load algorism arrows:", err);
            return null;
          }),
          fetchManualTargetWH({
            factory,
            lineno: lineCode,
            styleno: activeStyle,
            workdate: activeDate,
          }).catch((err) => {
            console.error("Failed to load manual target WH:", err);
            return { TARGET: null, WORKING_HOUR: null };
          })
        ]);

        if (!active) return;

        // 1. Process totalRes (Sub-Lines) & Fallback from opMasterRes if empty or missing parts
        const now = Date.now();
        const rawOpRows = opMasterRes?.data ?? [];
        const keysToDelete = new Set<string>();
        const opRows = rawOpRows.map((row) => {
          const rowNik = String(row.NIK || "").trim().toUpperCase();
          const rowMerged = String(row.MERGED_EMP_NIK || "").trim().toUpperCase();
          const pendingKey = pendingMissingOutputsRef.current.has(rowNik)
            ? rowNik
            : Array.from(pendingMissingOutputsRef.current.keys()).find((k) => rowMerged.includes(k));

          if (pendingKey) {
            const pending = pendingMissingOutputsRef.current.get(pendingKey)!;
            if (now - pending.timestamp > 60000) {
              keysToDelete.add(pendingKey);
              return row;
            }

            const serverMissing = Number(row.MISSING_OUTPUT ?? 0);
            if (serverMissing === pending.qty) {
              keysToDelete.add(pendingKey);
              return row;
            } else {
              const diff = pending.qty - serverMissing;
              return {
                ...row,
                MISSING_OUTPUT: pending.qty,
                TOTAL_OUTPUT: Number(row.TOTAL_OUTPUT || 0) + diff,
                ACTUAL: Number(row.ACTUAL || row.TOTAL_OUTPUT || 0) + diff,
                BALANCE: Number(row.BALANCE || 0) + diff,
              };
            }
          }
          return row;
        });

        keysToDelete.forEach((k) => pendingMissingOutputsRef.current.delete(k));

        setAllOpData(opRows);

        let finalMapped: OutputModuleTotalResponse[] = [];

        if (totalRes && totalRes.length > 0) {
          finalMapped = totalRes.map((item: any) => ({
            LINE_CODE: lineCode,
            STYLE_NO: activeStyle,
            PART: String(item.PART ?? ""),
            TARGET_PRD: Number(item.TARGET_PRD ?? 0),
            TOTALIN: Number(item.TOTALIN ?? 0),
            TOTALOUT: Number(item.TOTALOUT ?? 0),
            TOTALOUT_TODAY: Number(item.TOTALOUT_TODAY ?? 0),
            TOTALIN_TODAY: Number(item.TOTALIN_TODAY ?? 0),
          }));
        }

        // Extract distinct MODULEs from opMasterRes
        const opModules = Array.from(
          new Set(
            opRows
              .map((r) => String(r.MODULE ?? "").trim())
              .filter((m) => m && !["JOIN", "ASSEMBLY"].includes(m.toUpperCase()))
          )
        );

        // Add any missing modules from opMasterRes into finalMapped so all modules render in Feeding Lines
        opModules.forEach((mod) => {
          if (!finalMapped.some((item: OutputModuleTotalResponse) => item.PART.toUpperCase() === mod.toUpperCase())) {
            const modRows = opRows.filter((r) => String(r.MODULE ?? "").toUpperCase() === mod.toUpperCase());
            const totalActual = modRows.reduce((sum, r) => sum + Number(r.ACTUAL ?? r.TOTAL_OUTPUT ?? 0), 0);
            const totalToday = modRows.reduce((sum, r) => sum + Number(r.TODAY_OUTPUT ?? 0), 0);
            const targetPrd = Number(modRows[0]?.TARGET_PROD ?? 0);

            finalMapped.push({
              LINE_CODE: lineCode,
              STYLE_NO: activeStyle,
              PART: mod,
              TARGET_PRD: targetPrd,
              TOTALIN: totalActual,
              TOTALOUT: totalActual,
              TOTALOUT_TODAY: totalToday,
              TOTALIN_TODAY: totalToday,
            });
          }
        });

        // Apply manual target from API if available
        if (manualTargetRes && manualTargetRes.TARGET !== null) {
          finalMapped = finalMapped.map((item) => ({
            ...item,
            TARGET_PRD: manualTargetRes.TARGET ?? item.TARGET_PRD
          }));
        }

        // Store manual target in state for use in modal
        setManualTargetWH(manualTargetRes);

        setApiData(finalMapped);

        if (opRows.length > 0) {
          // Build a map for operator's Main Process name (from MAIN_PROCESS_NAME, FLOWS, or MAIN_PROC === 1)
          const mainProcMap = new Map<string, string>();
          opRows.forEach((item) => {
            const nik = String(item.NIK ?? "").trim();
            if (!nik || nik === "-") return;

            let mainName = item.MAIN_PROCESS_NAME ? String(item.MAIN_PROCESS_NAME).trim() : "";

            if (!mainName && Array.isArray((item as any).FLOWS)) {
              const mainFlow = (item as any).FLOWS.find((f: any) => Number(f.MAIN_PROC ?? 0) === 1);
              if (mainFlow && mainFlow.PROCESS_NAME) {
                mainName = String(mainFlow.PROCESS_NAME).trim();
              }
            }
            if (!mainName && Array.isArray((item as any).TASKS)) {
              const mainTask = (item as any).TASKS.find((t: any) => Number(t.MAIN_PROC ?? 0) === 1);
              if (mainTask && mainTask.PROCESS_NAME) {
                mainName = String(mainTask.PROCESS_NAME).trim();
              }
            }
            if (!mainName && Number(item.MAIN_PROC ?? 0) === 1) {
              mainName = String(item.PROCESS_NAME ?? "").trim();
            }

            if (mainName) {
              mainProcMap.set(nik, mainName);
            }
          });

          const mapped: ProcessItem[] = opRows.map((item, idx: number) => {
            const statusStr = String(item.STATUS_OUTPUT ?? "").toLowerCase();
            let status: "good" | "warning" | "critical" = "good";
            if (statusStr.includes("deficient") || statusStr.includes("shortage")) {
              status = "warning";
            } else if (statusStr.includes("idle")) {
              status = "critical";
            }

            const history = [
              { date: "D-2", value: Number(item.AVG_1ST_OUTPUT ?? (item as any)["1ST_AVG_OUTPUT"] ?? 0) },
              { date: "D-1", value: Number(item.AVG_2ND_OUTPUT ?? (item as any)["2ND_AVG_OUTPUT"] ?? 0) },
              { date: "Today", value: Number(item.AVG_3RD_OUTPUT ?? (item as any)["3RD_AVG_OUTPUT"] ?? item.TODAY_OUTPUT ?? item.ACTUAL ?? item.TOTAL_OUTPUT ?? 0) },
            ];

            const operatorType = String(item.OPERATOR_TYPE ?? "Operator Biasa");

            // Use manual target from API if available, otherwise use TARGET_PROD
            const dailyTarget = (manualTargetRes && manualTargetRes.TARGET !== null)
              ? manualTargetRes.TARGET
              : Number(item.TARGET_PROD ?? 0);

            const nik = String(item.NIK ?? "").trim();
            const procName = String(item.PROCESS_NAME ?? "").trim();
            const resolvedMain = resolveMainProcess(item);
            const mainProcess = resolvedMain !== "-" ? resolvedMain : (mainProcMap.get(nik) || (Number(item.MAIN_PROC ?? 0) === 1 ? procName : (procName || "-")));

            // Downstream target resolution (Yongjin 2-2 stock formula: Op A - Op B = Op A's Stock)
            const targetNik = item.FLOW_TARGET_NIK ? String(item.FLOW_TARGET_NIK).trim() : "";
            let targetName = item.FLOW_TARGET_NAME ? String(item.FLOW_TARGET_NAME).trim() : "";
            const targetFlow = item.FLOW_TARGET_FLOW ? String(item.FLOW_TARGET_FLOW).trim() : "";
            let targetModule = "";
            let targetOutput: number | undefined = undefined;

            if (targetNik && targetNik !== "-") {
              const foundTarget = opRows.find((r) => String(r.NIK ?? "").trim() === targetNik)
                || allOpData.find((r) => String(r.NIK ?? "").trim() === targetNik);
              if (foundTarget) {
                if (!targetName && (foundTarget.E_NAME || (foundTarget as any).WORKER)) {
                  targetName = String(foundTarget.E_NAME || (foundTarget as any).WORKER).trim();
                }
                targetModule = String(foundTarget.MODULE ?? (foundTarget as any).PART ?? "").trim();
                targetOutput = Number(foundTarget.TOTAL_OUTPUT ?? foundTarget.ACTUAL ?? 0);
              }
            }

            // Predecessor resolution (operator that targets this operator)
            const foundPred = opRows.find((r) => String(r.FLOW_TARGET_NIK ?? "").trim() === nik)
              || allOpData.find((r) => String(r.FLOW_TARGET_NIK ?? "").trim() === nik);
            const predNik = foundPred ? String(foundPred.NIK ?? "").trim() : "";
            const predName = foundPred ? String((foundPred.E_NAME || (foundPred as any).WORKER) ?? "").trim() : "";
            const predFlow = foundPred ? String(foundPred.FLOW_NO ?? "").trim() : "";
            const predModule = foundPred ? String(foundPred.MODULE ?? (foundPred as any).PART ?? "").trim() : "";
            const predOutput = foundPred ? Number(foundPred.TOTAL_OUTPUT ?? foundPred.ACTUAL ?? 0) : undefined;

            const isFirstProcess = !predNik || predNik === "-";

            return {
              no: Number(item.EMPNO ?? item.AUTO_SEQ ?? idx + 1),
              autoSeq: item.AUTO_SEQ != null ? Number(item.AUTO_SEQ) : undefined,
              name: procName,
              role: String(item.MODULE ?? "").trim(),
              worker: String(item.E_NAME ?? "").trim(),
              nik,
              uphTarget: Number(item.TARGET_PER_HOUR ?? 50),
              dailyTarget,
              uphActual: Number(item.AVERAGE_PER_HOUR ?? item.AVERAGE ?? 0),
              cumulative: Number(item.TODAY_OUTPUT ?? item.ACTUAL ?? 0),
              wip: Number(item.STOCK_OP ?? 0),
              bottleneckTime: item.STOCK_DAYS !== undefined && item.STOCK_DAYS !== null
                ? `${Number(item.STOCK_DAYS).toFixed(1)} Days`
                : "0 Days",
              bottleneckHours: Number(item.STOCK_DAYS ?? 0),
              status,
              statusText: String(item.STATUS_OUTPUT ?? "Sufficient"),
              history,
              flowNo: String(item.FLOW_NO ?? ""),
              totalOutputAlltime: Number(item.TOTAL_OUTPUT ?? item.ACTUAL ?? 0),
              totalStockAlltime: Number(item.STOCK_OP ?? 0),
              stockGrouped: item.STOCK_GROUPED != null ? Number(item.STOCK_GROUPED) : Number(item.STOCK_OP ?? 0),
              stockDays: item.STOCK_DAYS != null ? Number(item.STOCK_DAYS) : undefined,
              operatorType,
              isOverline: false,
              originalLineName: "",
              missingOutput: Number(item.MISSING_OUTPUT ?? 0),
              workingHours: item.WORKING_HOURS != null ? Number(item.WORKING_HOURS) : 11,
              currentWorkHours: item.CURRENT_WORK_HOURS != null ? Number(item.CURRENT_WORK_HOURS) : 11,
              isManualWh: Boolean(item.IS_MANUAL_WH),
              mainProcess,
              flowPredNik: predNik,
              flowPredName: predName,
              flowPredFlow: predFlow,
              flowPredModule: predModule,
              flowPredOutput: predOutput,
              isFirstProcess,
              flowTargetNik: targetNik || undefined,
              flowTargetName: targetName || undefined,
              flowTargetFlow: targetFlow || undefined,
              flowTargetModule: targetModule || undefined,
              flowTargetOutput: targetOutput,
            };
          });

          const filteredMapped = mapped.filter(item => item.nik && item.nik !== "-");
          setDbProcesses(filteredMapped);
        } else {
          setDbProcesses([]);
        }

        // 3. Process arrowRes (Arrows layout)
        if (arrowRes && arrowRes.length > 0) {
          setArrows(arrowRes);
        } else {
          // Generate default fallback arrows based on active parts
          const fallback: any[] = [];
          const activeParts = finalMapped.map((m: any) => m.PART.toUpperCase());
          
          const hasJoin = activeParts.includes("JOIN");
          const hasAssembly = activeParts.includes("ASSEMBLY");
          const hasFinish = activeParts.includes("FINISH");

          finalMapped.forEach((m: any) => {
            const part = m.PART.toUpperCase();
            if (!["JOIN", "ASSEMBLY", "FINISH"].includes(part)) {
              if (hasJoin) {
                fallback.push({ ArrowId: Math.random(), FromPart: part, ToPart: "JOIN" });
              } else if (hasAssembly) {
                fallback.push({ ArrowId: Math.random(), FromPart: part, ToPart: "ASSEMBLY" });
              }
            }
          });

          if (hasJoin && hasAssembly) {
            fallback.push({ ArrowId: Math.random(), FromPart: "JOIN", ToPart: "ASSEMBLY" });
          }
          if (hasAssembly && hasFinish) {
            fallback.push({ ArrowId: Math.random(), FromPart: "ASSEMBLY", ToPart: "FINISH" });
          }

          setArrows(fallback);
        }

        // 4. Process CB Operators count (CBC_WEB_GET_EMPLOYEE_STATS disabled as requested)
        setCbOperatorsCount(null);

      } catch (err) {
        console.error("Error setting layout details data:", err);
      } finally {
        if (active) {
          setLoadingData(false);
          setIsBackgroundSyncing(false);
        }
      }
    };

    loadAllData();
    return () => {
      active = false;
      prevFetchKeyRef.current = "";
    };
  }, [factory, activeDate, lineCode, activeStyle, refreshKey, filterModule]);

  // Cache storage for Operator Production History charts (SWR Cache)
  const operatorHistoryCacheRef = React.useRef<Record<string, { history: any[]; alltimeOutput: number }>>({});

  // Load operator production history when selected
  useEffect(() => {
    if (!selectedOperator) {
      setOperatorHistory([]);
      return;
    }

    const loadOperatorHistory = async () => {
      let targetNik = selectedOperator.nik;
      if (!targetNik) {
        const match = modalProcesses.find(p => p.worker === selectedOperator.worker) 
                   || dbProcesses.find(p => p.worker === selectedOperator.worker);
        targetNik = match?.nik || "";
      }

      if (!targetNik) {
        setOperatorHistory([]);
        return;
      }

      const cacheKey = `${targetNik}_${activeStyle}_${activeDate}`;

      // Check cache first: if exists, load immediately to prevent spinner block
      if (operatorHistoryCacheRef.current[cacheKey]) {
        setOperatorHistory(operatorHistoryCacheRef.current[cacheKey].history);
        setOperatorAlltimeOutput(operatorHistoryCacheRef.current[cacheKey].alltimeOutput);
        setLoadingHistory(false);
      } else {
        setLoadingHistory(true);
      }

      try {
        const response = await fetchEmployeeDetailHistory({
          nik: targetNik,
          style: activeStyle,
          workdate: activeDate
        });

        if (response && response.length > 0) {
          const item = response[0];
          const historyDays = [];
          
          const alltimeOutputVal = Number(item.TOTAL_OUTPUT_ALLTIME ?? 0);

          // 1. Today
          if (item.WORK_DATE) {
            historyDays.push({
              WORK_DATE: String(item.WORK_DATE).split("T")[0].split(" ")[0],
              ACTUAL: Number(item.OUTPUT_TODAY ?? 0)
            });
          }

          // 2. D-1 to D-7
          for (let i = 1; i <= 7; i++) {
            const dateKey = `DATE_MIN_${i}`;
            const qtyKey = `QTY_MIN_${i}`;
            if (item[dateKey]) {
              historyDays.push({
                WORK_DATE: String(item[dateKey]).split("T")[0].split(" ")[0],
                ACTUAL: Number(item[qtyKey] ?? 0)
              });
            }
          }

          // Sort by WORK_DATE descending
          const sorted = historyDays.sort((a, b) =>
            String(b.WORK_DATE).localeCompare(String(a.WORK_DATE))
          );

          // Save to cache and update state
          operatorHistoryCacheRef.current[cacheKey] = {
            history: sorted,
            alltimeOutput: alltimeOutputVal,
          };

          setOperatorHistory(sorted);
          setOperatorAlltimeOutput(alltimeOutputVal);
        } else {
          operatorHistoryCacheRef.current[cacheKey] = { history: [], alltimeOutput: 0 };
          setOperatorHistory([]);
          setOperatorAlltimeOutput(0);
        }
      } catch (error) {
        console.error("Failed to load operator history:", error);
        // Fallback to cache if exists
        if (!operatorHistoryCacheRef.current[cacheKey]) {
          setOperatorHistory([]);
        }
      } finally {
        setLoadingHistory(false);
      }
    };

    loadOperatorHistory();
  }, [selectedOperator, activeStyle, activeDate]);

  // Cache storage for Detailed Process Flow modals (SWR Cache)
  const modalCacheRef = React.useRef<Record<string, ProcessItem[]>>({});

  // Populate detailed process flow from already-fetched allOpData (no new API call)
  useEffect(() => {
    if (!activePartModal) {
      setModalProcesses([]);
      return;
    }

    setLoadingModalProcesses(false);

    const targetPart = activePartModal.partKey.toUpperCase().replace(/\s+/g, "");
    const filtered = allOpData.filter((item) => {
      const mod = String(item.MODULE ?? "").toUpperCase().replace(/\s+/g, "");
      const splitMod = String(item.SPLIT_MODULE ?? "").toUpperCase().replace(/\s+/g, "");
      if (targetPart.includes("BACKSLEEVE") || targetPart.includes("BACKSLEVEE")) {
        return mod.includes("BACKSLEEVE") || mod.includes("BACKSLEVEE") || splitMod.includes("BACKSLEEVE") || splitMod.includes("BACKSLEVEE");
      }
      return mod === targetPart || splitMod === targetPart;
    });

    const mapped: ProcessItem[] = filtered.map((item, idx) => {
      const statusStr = String(item.STATUS_OUTPUT ?? "").toLowerCase();
      const status: "good" | "warning" | "critical" = statusStr.includes("deficient") ? "warning" : "good";

      // Use manual target from API if available, otherwise use TARGET_PROD
      const dailyTarget = (manualTargetWH && manualTargetWH.TARGET !== null)
        ? manualTargetWH.TARGET
        : Number(item.TARGET_PROD ?? 0);

      const nik = String(item.NIK ?? "").trim();
      const procName = String(item.PROCESS_NAME ?? "").trim();
      const resolvedMain = resolveMainProcess(item);
      const mainProcess = resolvedMain !== "-" ? resolvedMain : (procName || "-");

      // Downstream target resolution (GetCBSewingOutputData returns FLOW_TARGET_* fields)
      const targetNik = item.FLOW_TARGET_NIK ? String(item.FLOW_TARGET_NIK).trim() : "";
      let targetName = item.FLOW_TARGET_NAME ? String(item.FLOW_TARGET_NAME).trim() : "";
      const targetFlow = item.FLOW_TARGET_FLOW ? String(item.FLOW_TARGET_FLOW).trim() : "";
      let targetModule = "";
      let targetOutput: number | undefined = undefined;

      if (targetNik && targetNik !== "-") {
        const foundTarget = allOpData.find((r) => String(r.NIK ?? "").trim() === targetNik);
        if (foundTarget) {
          if (!targetName && (foundTarget.E_NAME || (foundTarget as any).WORKER)) {
            targetName = String(foundTarget.E_NAME || (foundTarget as any).WORKER).trim();
          }
          targetModule = String(foundTarget.MODULE ?? (foundTarget as any).PART ?? "").trim();
          targetOutput = Number(foundTarget.TOTAL_OUTPUT ?? foundTarget.ACTUAL ?? 0);
        }
      }

      // Predecessor resolution: find which operator in allOpData targets this NIK
      const foundPred = allOpData.find((r) => String(r.FLOW_TARGET_NIK ?? "").trim() === nik);
      const predNik = foundPred ? String(foundPred.NIK ?? "").trim() : "";
      const predName = foundPred ? String((foundPred.E_NAME || (foundPred as any).WORKER) ?? "").trim() : "";
      const predFlow = foundPred ? String(foundPred.FLOW_NO ?? "").trim() : "";
      const predModule = foundPred ? String(foundPred.MODULE ?? (foundPred as any).PART ?? "").trim() : "";
      const predOutput = foundPred ? Number(foundPred.TOTAL_OUTPUT ?? foundPred.ACTUAL ?? 0) : undefined;

      const isFirstProcess = !predNik || predNik === "-";

      return {
        no: Number(item.EMPNO ?? item.AUTO_SEQ ?? idx + 1),
        autoSeq: item.AUTO_SEQ != null ? Number(item.AUTO_SEQ) : undefined,
        name: procName,
        role: String(item.MODULE ?? ""),
        worker: String(item.E_NAME ?? ""),
        nik,
        uphTarget: Number(item.TARGET_PER_HOUR ?? 50),
        dailyTarget,
        uphActual: Number(item.AVERAGE_PER_HOUR ?? item.AVERAGE ?? 0),
        cumulative: Number(item.TODAY_OUTPUT ?? item.ACTUAL ?? 0),
        wip: Number(item.STOCK_OP ?? 0),
        bottleneckTime: item.STOCK_DAYS !== undefined && item.STOCK_DAYS !== null
          ? `${Number(item.STOCK_DAYS).toFixed(1)} Days`
          : "0 Days",
        bottleneckHours: Number(item.STOCK_DAYS ?? 0),
        history: [],
        status,
        statusText: String(item.STATUS_OUTPUT ?? "Sufficient"),
        flowNo: String(item.FLOW_NO ?? ""),
        totalOutputAlltime: Number(item.TOTAL_OUTPUT ?? item.ACTUAL ?? 0),
        totalStockAlltime: Number(item.STOCK_OP ?? 0),
        stockGrouped: item.STOCK_GROUPED != null ? Number(item.STOCK_GROUPED) : Number(item.STOCK_OP ?? 0),
        operatorType: String(item.OPERATOR_TYPE ?? "Operator Biasa"),
        isOverline: false,
        originalLineName: "",
        missingOutput: Number(item.MISSING_OUTPUT ?? 0),
        workingHours: item.WORKING_HOURS != null ? Number(item.WORKING_HOURS) : 11,
        currentWorkHours: item.CURRENT_WORK_HOURS != null ? Number(item.CURRENT_WORK_HOURS) : 11,
        isManualWh: Boolean(item.IS_MANUAL_WH),
        mainProcess,
        flowPredNik: predNik,
        flowPredName: predName,
        flowPredFlow: predFlow,
        flowPredModule: predModule,
        flowPredOutput: predOutput,
        isFirstProcess,
        flowTargetNik: targetNik || undefined,
        flowTargetName: targetName || undefined,
        flowTargetFlow: targetFlow || undefined,
        flowTargetModule: targetModule || undefined,
        flowTargetOutput: targetOutput,
      };
    });

    setModalProcesses(mapped);
  }, [activePartModal, allOpData]);

  useEffect(() => {
    updateXarrow();
    
    // Trigger update on resize and scroll since they directly change elements' physical positions
    window.addEventListener("resize", updateXarrow);
    window.addEventListener("scroll", updateXarrow, true); // true for capture to catch scroll inside containers

    const timer = setInterval(updateXarrow, 3000); // Less aggressive interval
    
    return () => {
      window.removeEventListener("resize", updateXarrow);
      window.removeEventListener("scroll", updateXarrow, true);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrows, apiData, dbProcesses]);

  const activeDataList = apiData.filter(
    (item) => !["JOIN", "ASSEMBLY"].includes(String(item.PART ?? "").toUpperCase())
  );

  // Helper to format part display names
  const getPartDisplayName = (part: string) => {
    switch (part.toUpperCase()) {
      case "FRONT":
        return "Front";
      case "BACK SLEEVE":
        return "Back Sleeve";
      case "PART":
        return "Part";
      case "LINING":
        return "Lining";
      case "HOOD":
        return "Hood";
      case "JOIN":
        return "Join";
      case "ASSEMBLY":
        return "Assembly";
      default:
        return `${part}`;
    }
  };

  // Convert SP data list into FeedingLine model format
  const feedingLines: FeedingLine[] = activeDataList.map((item, idx) => {
    const wip = Math.abs(item.TOTALIN - item.TOTALOUT);
    
    const uphTarget = item.TARGET_PRD;

    let status: "insufficient" | "normal" | "delay" = "normal";
    let statusText = "Normal Flow";
    let idleTime = "0 Hours";

    if (wip > 100) {
      status = "delay";
      statusText = `WIP Accumulation`;
    } else if (wip === 0 && item.TOTALIN > 0) {
      status = "normal";
      statusText = "Balanced Flow";
    }

    return {
      id: `feed-${idx}`,
      partKey: item.PART,
      name: getPartDisplayName(item.PART),
      input: item.TOTALIN,
      inputToday: item.TOTALIN_TODAY,
      waiting: wip,
      output: item.TOTALOUT,
      outputToday: item.TOTALOUT_TODAY,
      uph: uphTarget,
      idleTime,
      status,
      statusText,
    };
  });

  // Helper to filter processes by showNullCbOutput and searchQuery
  const filterProcesses = (processes: ProcessItem[], includeSearch: boolean = true) => {
    let result = processes;
    if (!showNullCbOutput) {
      result = result.filter((p) => (p.totalOutputAlltime ?? 0) > 0);
    }
    if (includeSearch && searchQuery.trim()) {
      const cleanQuery = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.worker.toLowerCase().includes(cleanQuery) ||
          p.name.toLowerCase().includes(cleanQuery) ||
          p.role.toLowerCase().includes(cleanQuery) ||
          (p.nik && p.nik.toLowerCase().includes(cleanQuery))
      );
    }
    return result;
  };

  // Dynamically group/partition processes from DB
  const activeJoinProcesses = filterProcesses(
    dbProcesses.filter((p) => p.role.toUpperCase() === "JOIN")
  );

  const activeAssemblyProcesses = filterProcesses(
    dbProcesses.filter((p) => p.role.toUpperCase() === "ASSEMBLY")
  );

  const activeFinishProcesses = filterProcesses(
    dbProcesses.filter(
      (p) =>
        p.role.toUpperCase() === "FINISH" ||
        p.role.toUpperCase() === "QC" ||
        p.name.toLowerCase().includes("finish") ||
        p.name.toLowerCase().includes("inspect") ||
        p.name.toLowerCase().includes("qc")
    )
  );

  const visibleModalProcesses = filterProcesses(modalProcesses, false);

  interface RowConnectionInfo {
    isGrouped: boolean;
    rowBg: string;
    borderTop: string;
    borderBottom: string;
    topGroup?: {
      flowKey: string;
      color: string;
      borderTColor: string;
      borderBColor: string;
    };
    bottomGroup?: {
      flowKey: string;
      color: string;
      borderTColor: string;
      borderBColor: string;
    };
    isJunction: boolean;
  }

  /**
   * Returns a map from row index → connection info for operators that share processes.
   * Distinct shared processes receive distinct colors. If an operator is a junction
   * between two different shared groups (e.g. AGUS SETIAWAN sharing MF31 with top and MF33 with bottom),
   * the connecting bracket is clearly split into 2 distinct lines so users aren't confused.
   */
  const getSharedFlowGroups = (
    processes: ProcessItem[]
  ): Map<number, RowConnectionInfo> => {
    const getKeys = (p: ProcessItem) => {
      const rawFlow = p.flowNo ?? "";
      const tokens = rawFlow.split(",").map((s) => s.trim()).filter(Boolean);
      return tokens.map((token) => {
        const dotDIdx = token.indexOf(".D");
        if (dotDIdx !== -1) return token.substring(0, dotDIdx);
        if (token.includes("_")) return token.split("_")[0];
        return token;
      }).filter(Boolean);
    };

    const palette = [
      { border: "border-amber-400", borderB: "border-b-amber-400", borderT: "border-t-amber-400", borderRow: "border-amber-500/40", bg: "bg-amber-500/5 hover:bg-amber-500/10" },
      { border: "border-cyan-400", borderB: "border-b-cyan-400", borderT: "border-t-cyan-400", borderRow: "border-cyan-500/40", bg: "bg-cyan-500/5 hover:bg-cyan-500/10" },
      { border: "border-purple-400", borderB: "border-b-purple-400", borderT: "border-t-purple-400", borderRow: "border-purple-500/40", bg: "bg-purple-500/5 hover:bg-purple-500/10" },
      { border: "border-emerald-400", borderB: "border-b-emerald-400", borderT: "border-t-emerald-400", borderRow: "border-emerald-500/40", bg: "bg-emerald-500/5 hover:bg-emerald-500/10" },
      { border: "border-pink-400", borderB: "border-b-pink-400", borderT: "border-t-pink-400", borderRow: "border-pink-500/40", bg: "bg-pink-500/5 hover:bg-pink-500/10" },
    ];

    // Find all distinct shared flows between adjacent rows
    const sharedFlowKeys: string[] = [];
    processes.forEach((p, idx) => {
      if (idx < processes.length - 1) {
        const next = processes[idx + 1];
        const common = getKeys(p).filter((k) => getKeys(next).includes(k));
        common.forEach((k) => {
          if (!sharedFlowKeys.includes(k)) sharedFlowKeys.push(k);
        });
      }
    });

    const getColor = (key: string) => {
      const idx = Math.max(0, sharedFlowKeys.indexOf(key));
      return palette[idx % palette.length];
    };

    const result = new Map<number, RowConnectionInfo>();

    processes.forEach((p, idx) => {
      const prev = idx > 0 ? processes[idx - 1] : null;
      const next = idx < processes.length - 1 ? processes[idx + 1] : null;

      const topCommon = prev ? getKeys(p).filter((k) => getKeys(prev).includes(k)) : [];
      const bottomCommon = next ? getKeys(p).filter((k) => getKeys(next).includes(k)) : [];

      const topFlow = topCommon.length > 0 ? topCommon[0] : null;
      const bottomFlow = bottomCommon.length > 0 ? bottomCommon[0] : null;

      if (!topFlow && !bottomFlow) {
        return;
      }

      const isJunction = Boolean(topFlow && bottomFlow && topFlow !== bottomFlow);
      const topColor = topFlow ? getColor(topFlow) : null;
      const bottomColor = bottomFlow ? getColor(bottomFlow) : null;

      let rowBg = "hover:bg-slate-800/20";
      let borderTop = "";
      let borderBottom = "";

      if (isJunction) {
        rowBg = "bg-slate-800/25 hover:bg-slate-800/40";
        borderTop = "border-t border-slate-700/60";
      } else if (topColor && !bottomColor) {
        rowBg = topColor.bg;
        borderBottom = `border-b-2 ${topColor.borderRow}`;
      } else if (!topColor && bottomColor) {
        rowBg = bottomColor.bg;
        borderTop = `border-t-2 ${bottomColor.borderRow}`;
      } else if (topColor) {
        rowBg = topColor.bg;
      }

      result.set(idx, {
        isGrouped: true,
        rowBg,
        borderTop,
        borderBottom,
        topGroup: topFlow && topColor ? {
          flowKey: topFlow,
          color: topColor.border,
          borderTColor: topColor.borderT,
          borderBColor: topColor.borderB,
        } : undefined,
        bottomGroup: bottomFlow && bottomColor ? {
          flowKey: bottomFlow,
          color: bottomColor.border,
          borderTColor: bottomColor.borderT,
          borderBColor: bottomColor.borderB,
        } : undefined,
        isJunction,
      });
    });

    return result;
  };

  const renderSharedGroupLine = (group: RowConnectionInfo | undefined) => {
    if (!group || !group.isGrouped) return null;

    if (group.isJunction && group.topGroup && group.bottomGroup) {
      return (
        <>
          {/* Top Group Bracket (Amber - Closes previous shared group) */}
          <div
            className={`absolute left-0 w-2.5 top-0 bottom-1/2 border-l-2 border-b-2 rounded-bl-sm ${group.topGroup.color} ${group.topGroup.borderBColor} z-10`}
            title={`Shared Flow: ${group.topGroup.flowKey}`}
          />
          {/* Bottom Group Bracket (Cyan - Opens next shared group) */}
          <div
            className={`absolute left-0 w-2.5 top-1/2 bottom-0 border-l-2 border-t-2 rounded-tl-sm ${group.bottomGroup.color} ${group.bottomGroup.borderTColor} z-10`}
            title={`Shared Flow: ${group.bottomGroup.flowKey}`}
          />
          {/* Junction indicator dots */}
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
            <span className={`w-1 h-1 rounded-full ${group.topGroup.color.replace('border-', 'bg-')}`} />
            <span className={`w-1 h-1 rounded-full ${group.bottomGroup.color.replace('border-', 'bg-')}`} />
          </div>
        </>
      );
    }

    if (group.topGroup && group.bottomGroup && group.topGroup.flowKey === group.bottomGroup.flowKey) {
      return (
        <>
          <div className={`absolute left-0 top-0 bottom-0 border-l-2 ${group.topGroup.color} z-10`} title={`Shared Flow: ${group.topGroup.flowKey}`} />
          <div className={`absolute left-0 w-2.5 top-1/2 border-t-2 ${group.topGroup.color} z-10`} />
        </>
      );
    }

    if (group.topGroup && !group.bottomGroup) {
      return (
        <div
          className={`absolute left-0 w-2.5 top-0 bottom-1/2 border-l-2 border-b-2 rounded-bl-sm ${group.topGroup.color} ${group.topGroup.borderBColor} z-10`}
          title={`Shared Flow: ${group.topGroup.flowKey}`}
        />
      );
    }

    if (!group.topGroup && group.bottomGroup) {
      return (
        <div
          className={`absolute left-0 w-2.5 top-1/2 bottom-0 border-l-2 border-t-2 rounded-tl-sm ${group.bottomGroup.color} ${group.bottomGroup.borderTColor} z-10`}
          title={`Shared Flow: ${group.bottomGroup.flowKey}`}
        />
      );
    }

    return null;
  };

  const joinSharedGroups = getSharedFlowGroups(activeJoinProcesses);
  const assemblySharedGroups = getSharedFlowGroups(activeAssemblyProcesses);
  const finishSharedGroups = getSharedFlowGroups(activeFinishProcesses);

  /**
   * Groups processes by their primary flow key.
   * Returns aggregated rows: Output All-time = SUM, Stock All-time = sum of all operators in group.
   * Falls back to individual rows if the group has only 1 operator.
   */
  type GroupedProcessRow = ProcessItem & {
    _isGroupedRow?: boolean;
    _groupedOperators?: ProcessItem[];
    _groupedOutput?: number;
    _groupedStock?: number;
  };

  const getGroupedProcessRows = (processes: ProcessItem[]): GroupedProcessRow[] => {
    // Build a map from primary flow key → list of (idx, process)
    const flowKeyMap = new Map<string, number[]>();
    processes.forEach((p, idx) => {
      const primaryKey = getPrimaryFlowKey(p.flowNo, idx);
      if (!flowKeyMap.has(primaryKey)) flowKeyMap.set(primaryKey, []);
      flowKeyMap.get(primaryKey)!.push(idx);
    });

    // Build ordered result, tracking which indices already emitted
    const emitted = new Set<number>();
    const rows: GroupedProcessRow[] = [];

    processes.forEach((p, idx) => {
      if (emitted.has(idx)) return;

      const primaryKey = getPrimaryFlowKey(p.flowNo, idx);
      const groupIdxs = flowKeyMap.get(primaryKey) ?? [idx];
      const groupProcs = groupIdxs.map((i) => processes[i]);

      if (groupProcs.length < 2) {
        // Solo row – in grouped mode, prefer stockGrouped from server/grouped calculation
        emitted.add(idx);
        const isLastAssem = isLastAssemblyProcess(p, dbProcesses);
        const opStock = isLastAssem ? 0 : Number(p.totalStockAlltime ?? p.wip ?? 0);
        const targetInfo = isLastAssem ? null : resolveTargetGroupInfo(p, dbProcesses, true);
        const calculatedGroupStock = targetInfo ? (p.totalOutputAlltime ?? 0) - targetInfo.targetOutput : 0;
        const soloStock = isLastAssem
          ? 0
          : p.stockGrouped !== null && p.stockGrouped !== undefined
          ? Number(p.stockGrouped)
          : (targetInfo ? calculatedGroupStock : opStock);

        rows.push({
          ...p,
          stockGrouped: soloStock,
          totalStockAlltime: opStock,
          flowTargetNik: isLastAssem ? "" : p.flowTargetNik,
          flowTargetName: isLastAssem ? "" : p.flowTargetName,
          flowTargetFlow: isLastAssem ? "" : p.flowTargetFlow,
          _isGroupedRow: false,
          _groupedStock: soloStock,
        });
      } else {
        // Grouped row – sum Output, use STOCK_GROUPED from server for stock, list all operators
        const totalOutput = groupProcs.reduce((s, op) => s + (op.totalOutputAlltime ?? 0), 0);
        groupIdxs.forEach((i) => emitted.add(i));
        // Representative row = prefer process targeting outside the group, fallback to first process
        const groupNiks = new Set(groupProcs.map((o) => (o.nik || "").trim().toUpperCase()));
        const extTargetProc = groupProcs.find(
          (o) => o.flowTargetNik && o.flowTargetNik.trim() && !groupNiks.has(o.flowTargetNik.trim().toUpperCase())
        );
        const rep = extTargetProc || groupProcs[0];

        // Prefer operator in group with non-zero stockGrouped, fallback to first operator with non-null stockGrouped, then fallback to calculation
        const isLastAssem = isLastAssemblyProcess(rep, dbProcesses);
        const validStock = isLastAssem
          ? 0
          : (groupProcs.find((op) => op.stockGrouped !== null && op.stockGrouped !== undefined && Number(op.stockGrouped) !== 0)?.stockGrouped
            ?? groupProcs.find((op) => op.stockGrouped !== null && op.stockGrouped !== undefined)?.stockGrouped);

        const targetInfo = isLastAssem ? null : resolveTargetGroupInfo(rep, dbProcesses, true);
        const calculatedGroupStock = targetInfo ? totalOutput - targetInfo.targetOutput : 0;
        const totalStock = isLastAssem
          ? 0
          : validStock !== undefined && validStock !== null
          ? Number(validStock)
          : (targetInfo ? calculatedGroupStock : 0);

        rows.push({
          ...rep,
          stockGrouped: totalStock,
          flowTargetNik: isLastAssem ? "" : rep.flowTargetNik,
          flowTargetName: isLastAssem ? "" : rep.flowTargetName,
          flowTargetFlow: isLastAssem ? "" : rep.flowTargetFlow,
          _isGroupedRow: true,
          _groupedOperators: groupProcs,
          _groupedOutput: totalOutput,
          _groupedStock: totalStock,
        });
      }
    });

    return rows;
  };

  const joinGroupedRows = getGroupedProcessRows(activeJoinProcesses);
  const assemblyGroupedRows = getGroupedProcessRows(activeAssemblyProcesses);
  const finishGroupedRows = getGroupedProcessRows(activeFinishProcesses);

  /**
   * Compute cross-module links:
   * For each feeding-line module (sub-line), find JOIN/ASSEMBLY operators whose
   * FLOW_NO includes an underscore suffix (e.g. MF26.D_PPFA6) where the suffix
   * flow code (PPFA6) belongs to an operator in that module.
   *
   * Returns: Map<partKey, { outputOperator: ProcessItem, linkedRows: { nik: string; rowIdPrefix: string }[] }>
   */
  const crossModuleLinks = React.useMemo(() => {
    const result = new Map<string, { outputOperator: ProcessItem; linkedRows: { nik: string; rowIdPrefix: string }[] }>();

    // Build a lookup: flowCode -> { operator, module }
    const flowToOp = new Map<string, { op: ProcessItem; module: string }>();
    dbProcesses.forEach((p) => {
      const module = p.role.toUpperCase();
      if (["JOIN", "ASSEMBLY"].includes(module)) return;
      const flows = (p.flowNo ?? "").split(",").map((s) => s.trim()).filter(Boolean);
      flows.forEach((f) => {
        // Extract the base flow code (before . or _ if any)
        const baseCode = f.split(".")[0].split("_")[0];
        if (baseCode) flowToOp.set(baseCode.toUpperCase(), { op: p, module: p.role });
      });
    });

    // Scan JOIN and ASSEMBLY for underscore-target flows
    const sections: { procs: ProcessItem[]; prefix: string }[] = [
      { procs: activeJoinProcesses, prefix: "row-join" },
      { procs: activeAssemblyProcesses, prefix: "row-assembly" },
    ];

    sections.forEach(({ procs, prefix }) => {
      procs.forEach((p) => {
        if (!p.nik) return;
        const flows = (p.flowNo ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        flows.forEach((f) => {
          // Look for underscore pattern: e.g. MF18_FPFC4 or MF26.D_PPFA6
          const underscoreIdx = f.lastIndexOf("_");
          if (underscoreIdx === -1) return;
          const targetCode = f.substring(underscoreIdx + 1).toUpperCase();
          if (!targetCode) return;

          const match = flowToOp.get(targetCode);
          if (!match) return;

          const partKey = match.module;
          const nikStr = p.nik;
          if (!nikStr) return;
          if (!result.has(partKey)) {
            result.set(partKey, { outputOperator: match.op, linkedRows: [] });
          }
          const entry = result.get(partKey)!;
          if (!entry.linkedRows.some((r) => r.nik === nikStr)) {
            entry.linkedRows.push({ nik: nikStr, rowIdPrefix: prefix });
          }
        });
      });
    });

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbProcesses, activeJoinProcesses, activeAssemblyProcesses]);


  const handleSaveUph = async (nik: string) => {
    if (!lineCode || !activeStyle || !activeDate || !factory) return;
    const uphVal = parseFloat(tempUphTarget);
    if (isNaN(uphVal) || uphVal < 0) {
      toast.error("Please enter a valid UPH number");
      return;
    }

    // Optimistic Update: Update both dbProcesses and modalProcesses states immediately
    const previousDbProcesses = [...dbProcesses];
    const previousModalProcesses = [...modalProcesses];

    setDbProcesses((prev) =>
      prev.map((item) => (item.nik === nik ? { ...item, uphTarget: uphVal } : item))
    );
    setModalProcesses((prev) =>
      prev.map((item) => (item.nik === nik ? { ...item, uphTarget: uphVal } : item))
    );
    setEditingUphNik(null);

    try {
      const success = await saveUphOverride({
        lineCode,
        styleNo: activeStyle,
        nik,
        uphTarget: uphVal,
        updatedBy: "USER",
      });

      if (success) {
        toast.success("UPH Target updated successfully");
        modalCacheRef.current = {}; // clear cache
        setRefreshKey((prev) => prev + 1); // trigger reload in background
      } else {
        // Rollback
        setDbProcesses(previousDbProcesses);
        setModalProcesses(previousModalProcesses);
        toast.error("Failed to update UPH Target");
      }
    } catch (err) {
      // Rollback
      setDbProcesses(previousDbProcesses);
      setModalProcesses(previousModalProcesses);
      toast.error("Failed to update UPH Target");
    }
  };

  const handleSaveMissingOutput = async (
    nik: string,
    customQty?: number,
    customStyle?: string,
    predecessorNik?: string
  ): Promise<boolean> => {
    const targetQty = customQty !== undefined ? customQty : parseInt(tempMissingQty, 10);
    if (isNaN(targetQty)) {
      toast.error("Please enter a valid number (use 0 to remove missing output)");
      return false;
    }

    const effectiveStyle = customStyle || activeStyle || lineItem?.STYLE_NO || "";
    if (!effectiveStyle) {
      toast.error("Style is required to save missing output");
      return false;
    }

    const effectiveLine =
      lineCode ||
      lineItem?.LINE_CODE ||
      allLines?.find((l) => l.LINE_NAME === lineName)?.LINE_CODE ||
      lineName ||
      "";
    if (!effectiveLine) {
      toast.error("Line is required to save missing output");
      return false;
    }

    setEditingMissingNik(null);

    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error("Failed to parse auth token", err);
    }

    const normNik = String(nik || "").trim().toUpperCase();

    // Find current missing output for this nik
    const currentProcess =
      dbProcesses.find((p) => String(p.nik || "").trim().toUpperCase() === normNik) ||
      modalProcesses.find((p) => String(p.nik || "").trim().toUpperCase() === normNik);
    const currentOp = allOpData.find(
      (r) => String(r.NIK || "").trim().toUpperCase() === normNik
    );

    // Resolve predecessor NIK ONLY if explicitly passed or present on the row as merged/source
    // NOTE: NEVER use flowPredNik here! flowPredNik represents the upstream process/station in the layout sequence (e.g. operator A feeds operator B), NOT a replaced operator.
    const resolvedPredNik =
      predecessorNik ||
      currentOp?.MISSING_SOURCE_NIK ||
      currentOp?.MERGED_EMP_NIK ||
      undefined;
    // resolvedPredNik may be a comma-separated list (MERGED_EMP_NIK) -> evaluate EACH NIK separately.
    // Only truly replaced operators are cleared. Never clear:
    //  - the edited operator itself
    //  - an operator that is still active (present as a row in the current layout)
    //  - a source that is also merged into ANOTHER operator (its missing output is shared)
    const predList = resolvedPredNik
      ? Array.from(
          new Set(
            String(resolvedPredNik)
              .split(",")
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean)
          )
        )
      : [];
    const safePredList = predList.filter((pNik) => {
      if (pNik === normNik) return false;
      const isActive = allOpData.some((r) => String(r.NIK || "").trim().toUpperCase() === pNik);
      if (isActive) return false;
      const sharedWithOther = allOpData.some((r) => {
        const rNik = String(r.NIK || "").trim().toUpperCase();
        if (rNik === normNik) return false;
        return String(r.MERGED_EMP_NIK || "")
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .includes(pNik);
      });
      return !sharedWithOther;
    });
    const normPredNik: string | undefined = safePredList.length > 0 ? safePredList.join(",") : undefined;

    const currentMissing = currentProcess?.missingOutput ?? currentOp?.MISSING_OUTPUT ?? 0;
    const diff = targetQty - currentMissing;

    // Track in pending map for the edited NIK to protect optimistic state from stale server cache
    pendingMissingOutputsRef.current.set(normNik, { qty: targetQty, timestamp: Date.now() });
    safePredList.forEach((pNik) => {
      pendingMissingOutputsRef.current.set(pNik, { qty: 0, timestamp: Date.now() });
    });

    // Optimistic Update: Update state immediately so UI changes instantly
    const previousDbProcesses = [...dbProcesses];
    const previousModalProcesses = [...modalProcesses];
    const previousAllOpData = [...allOpData];

    setAllOpData((prev) =>
      prev.map((item) => {
        const itemNik = String(item.NIK || "").trim().toUpperCase();
        if (itemNik === normNik) {
          return {
            ...item,
            MISSING_OUTPUT: targetQty,
            MISSING_OUTPUT_UPDATED_BY: updaterUser,
            MISSING_OUTPUT_UPDATED_AT: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
            TOTAL_OUTPUT: Math.max(0, Number(item.TOTAL_OUTPUT ?? item.ACTUAL ?? 0) + diff),
            ACTUAL: Math.max(0, Number(item.ACTUAL ?? item.TOTAL_OUTPUT ?? 0) + diff),
            BALANCE: Number(item.BALANCE ?? item.STOCK_OP ?? 0) + diff,
          };
        } else if (safePredList.includes(itemNik)) {
          const predMissing = Number(item.MISSING_OUTPUT || 0);
          return {
            ...item,
            MISSING_OUTPUT: 0,
            MISSING_OUTPUT_UPDATED_BY: null,
            MISSING_OUTPUT_UPDATED_AT: null,
            TOTAL_OUTPUT: Math.max(0, Number(item.TOTAL_OUTPUT ?? item.ACTUAL ?? 0) - predMissing),
            ACTUAL: Math.max(0, Number(item.ACTUAL ?? item.TOTAL_OUTPUT ?? 0) - predMissing),
            BALANCE: Number(item.BALANCE ?? item.STOCK_OP ?? 0) - predMissing,
          };
        }
        return item;
      })
    );

    setDbProcesses((prev) =>
      prev.map((item) => {
        const itemNik = String(item.nik || "").trim().toUpperCase();
        if (itemNik === normNik) {
          return {
            ...item,
            missingOutput: targetQty,
            totalOutputAlltime: Math.max(0, (item.totalOutputAlltime ?? 0) + diff),
          };
        } else if (safePredList.includes(itemNik)) {
          const predMissing = item.missingOutput ?? 0;
          return {
            ...item,
            missingOutput: 0,
            totalOutputAlltime: Math.max(0, (item.totalOutputAlltime ?? 0) - predMissing),
          };
        }
        return item;
      })
    );

    setModalProcesses((prev) =>
      prev.map((item) => {
        const itemNik = String(item.nik || "").trim().toUpperCase();
        if (itemNik === normNik) {
          return {
            ...item,
            missingOutput: targetQty,
            totalOutputAlltime: Math.max(0, (item.totalOutputAlltime ?? 0) + diff),
          };
        } else if (safePredList.includes(itemNik)) {
          const predMissing = item.missingOutput ?? 0;
          return {
            ...item,
            missingOutput: 0,
            totalOutputAlltime: Math.max(0, (item.totalOutputAlltime ?? 0) - predMissing),
          };
        }
        return item;
      })
    );

    try {
      const success = await saveMissingOutput({
        factory,
        nik,
        styleNo: effectiveStyle,
        missingQty: targetQty,
        updatedBy: updaterUser,
        workDate: activeDate,
        predecessorNik: normPredNik,
        lineCode: effectiveLine,
      });

      if (success) {
        if (targetQty === 0) {
          toast.success(`Missing output cleared successfully`);
        } else if (targetQty < 0) {
          toast.success(
            `Output reduced by ${Math.abs(targetQty).toLocaleString()} (Missing Output: ${targetQty.toLocaleString()})`
          );
        } else if (currentMissing !== 0) {
          toast.success(
            `Missing output updated from ${currentMissing.toLocaleString()} to ${targetQty.toLocaleString()}`
          );
        } else {
          toast.success(`Successfully saved ${targetQty.toLocaleString()} missing output`);
        }
        // Debounce silent background reconciliation so rapid edits never flash skeletons or race
        modalCacheRef.current = {};
        if (silentRefreshTimerRef.current !== null) {
          window.clearTimeout(silentRefreshTimerRef.current);
        }
        silentRefreshTimerRef.current = window.setTimeout(() => {
          silentRefreshTimerRef.current = null;
          handleRefresh(false);
        }, 600);
        return true;
      } else {
        pendingMissingOutputsRef.current.delete(normNik);
        safePredList.forEach((k) => pendingMissingOutputsRef.current.delete(k));
        setAllOpData(previousAllOpData);
        setDbProcesses(previousDbProcesses);
        setModalProcesses(previousModalProcesses);
        toast.error("Failed to save missing output");
        return false;
      }
    } catch (err) {
      pendingMissingOutputsRef.current.delete(normNik);
      safePredList.forEach((k) => pendingMissingOutputsRef.current.delete(k));
      setAllOpData(previousAllOpData);
      setDbProcesses(previousDbProcesses);
      setModalProcesses(previousModalProcesses);
      toast.error("An error occurred while saving missing output");
      return false;
    }
  };


  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isCustomExportModalOpen, setIsCustomExportModalOpen] = useState(false);
  const [selectedExportLineKeys, setSelectedExportLineKeys] = useState<string[]>([]);
  const [customExportSearch, setCustomExportSearch] = useState("");
  const [customExportProgress, setCustomExportProgress] = useState<{ done: number; total: number } | null>(null);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showExportMenu]);

  const customExportLineOptions = useMemo(() => {
    const source: { key: string; lineCode: string; lineName: string; styleNo: string }[] = [];
    const seen = new Set<string>();

    if (allLines && allLines.length > 0) {
      allLines.forEach((item) => {
        const lCode = String(item.LINE_CODE || "").trim();
        const lName = String(item.LINE_NAME || "").trim();
        const sNo = String(item.STYLE_NO || "").trim();
        if (!lCode || !sNo) return;
        const key = `${lCode}||${sNo}`;
        if (seen.has(key)) return;
        seen.add(key);
        source.push({ key, lineCode: lCode, lineName: lName || lCode, styleNo: sNo });
      });
    }

    if (lineCode && activeStyle) {
      const currentKey = `${lineCode}||${activeStyle}`;
      if (!seen.has(currentKey)) {
        source.unshift({ key: currentKey, lineCode, lineName, styleNo: activeStyle });
      }
    }

    return source.sort((a, b) =>
      a.lineName.localeCompare(b.lineName, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [allLines, lineCode, lineName, activeStyle]);

  const filteredCustomExportOptions = useMemo(() => {
    const q = customExportSearch.trim().toLowerCase();
    if (!q) return customExportLineOptions;
    return customExportLineOptions.filter(
      (opt) =>
        opt.lineName.toLowerCase().includes(q) ||
        opt.styleNo.toLowerCase().includes(q) ||
        opt.lineCode.toLowerCase().includes(q)
    );
  }, [customExportLineOptions, customExportSearch]);

  const handleOpenCustomExportModal = () => {
    setShowExportMenu(false);
    setCustomExportSearch("");
    const currentKey = lineCode && activeStyle ? `${lineCode}||${activeStyle}` : "";
    setSelectedExportLineKeys(currentKey ? [currentKey] : []);
    setIsCustomExportModalOpen(true);
  };

  const handleToggleExportLine = (key: string) => {
    setSelectedExportLineKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleExportJoinAssemblyExcel = async () => {
    setShowExportMenu(false);
    const joinRowsToExport = groupByProcess ? joinGroupedRows : activeJoinProcesses;
    const assemblyRowsToExport = groupByProcess ? assemblyGroupedRows : activeAssemblyProcesses;

    if (joinRowsToExport.length === 0 && assemblyRowsToExport.length === 0) {
      toast.info("No JOIN or ASSEMBLY module data available to export.");
      return;
    }

    try {
      setIsExportingExcel(true);
      const d2ExcelLabel = format(getPreviousWorkday(baseDate, 2), "dd-MMM");
      const d1ExcelLabel = format(getPreviousWorkday(baseDate, 1), "dd-MMM");

      await exportJoinAssemblyExcel({
        factory,
        lineName,
        styleNo: activeStyle,
        workDate: activeDate,
        dateD2Label: d2ExcelLabel,
        dateD1Label: d1ExcelLabel,
        joinRows: joinRowsToExport,
        assemblyRows: assemblyRowsToExport,
      });
      toast.success("JOIN & ASSEMBLY Excel exported successfully.");
    } catch (err) {
      console.error("Failed to export JOIN & ASSEMBLY Excel:", err);
      toast.error("Failed to export Excel.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCustomLinesExcel = async () => {
    const chosen = customExportLineOptions.filter((opt) =>
      selectedExportLineKeys.includes(opt.key)
    );
    if (chosen.length === 0) {
      toast.info("Please select at least 1 line to export.");
      return;
    }

    try {
      setIsExportingExcel(true);
      setCustomExportProgress({ done: 0, total: chosen.length });

      const d2ExcelLabel = format(getPreviousWorkday(baseDate, 2), "dd-MMM");
      const d1ExcelLabel = format(getPreviousWorkday(baseDate, 1), "dd-MMM");
      const currentKey = `${lineCode}||${activeStyle}`;
      const results: (ExportLineSheetInput | null)[] = new Array(chosen.length).fill(null);
      let completed = 0;

      // Fetch selected lines with concurrency limit of 3 to avoid overloading IIS/MSSQL
      const concurrency = 3;
      let cursor = 0;
      const worker = async () => {
        while (cursor < chosen.length) {
          const idx = cursor++;
          const target = chosen[idx];
          try {
            if (target.key === currentKey) {
              results[idx] = {
                factory,
                lineName: target.lineName,
                styleNo: target.styleNo,
                joinRows: groupByProcess ? joinGroupedRows : activeJoinProcesses,
                assemblyRows: groupByProcess ? assemblyGroupedRows : activeAssemblyProcesses,
              };
            } else {
              const res = await fetchCBSewingOutput({
                factory,
                lineNo: target.lineCode,
                styleNo: target.styleNo,
                workDate: activeDate,
                filterModule,
              });
              const { joinRows, assemblyRows } = mapRawOpRowsToJoinAssembly(res?.data ?? [], {
                groupByProcess,
                showNullCbOutput,
              });
              results[idx] = {
                factory,
                lineName: target.lineName,
                styleNo: target.styleNo,
                joinRows,
                assemblyRows,
              };
            }
          } catch (err) {
            console.error(`Failed fetching line ${target.lineName} (${target.styleNo}):`, err);
            results[idx] = {
              factory,
              lineName: target.lineName,
              styleNo: target.styleNo,
              joinRows: [],
              assemblyRows: [],
            };
          } finally {
            completed += 1;
            setCustomExportProgress({ done: completed, total: chosen.length });
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(concurrency, chosen.length) }, () => worker()));

      const validSheets = results.filter((s): s is ExportLineSheetInput => s !== null);
      await exportMultiLineJoinAssemblyExcel({
        factory,
        workDate: activeDate,
        dateD2Label: d2ExcelLabel,
        dateD1Label: d1ExcelLabel,
        sheets: validSheets,
      });

      toast.success(`Exported Excel for ${validSheets.length} line(s) successfully.`);
      setIsCustomExportModalOpen(false);
    } catch (err) {
      console.error("Failed to export custom lines Excel:", err);
      toast.error("Failed to export custom lines Excel.");
    } finally {
      setIsExportingExcel(false);
      setCustomExportProgress(null);
    }
  };

  const handleRefresh = (showLoading = false) => {
    silentRefreshRef.current = !showLoading;
    if (showLoading && dbProcesses.length === 0) {
      setLoadingData(true);
    } else {
      setIsBackgroundSyncing(true);
    }
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200 font-inter selection:bg-blue-500/30 selection:text-white pb-12 w-full">
      <style>{`
        /* Float the calendar popper on top of all elements */
        .react-datepicker-popper {
          z-index: 9999 !important;
        }

        .react-datepicker {
          background-color: #1e293b !important;
          border: 1px solid #334155 !important;
          border-radius: 1rem !important;
          color: #f1f5f9 !important;
          font-family: inherit !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.6) !important;
          overflow: hidden;
        }

        .react-datepicker__header {
          background-color: #0f172a !important;
          border-bottom: 1px solid #334155 !important;
          border-top-left-radius: 1rem !important;
          border-top-right-radius: 1rem !important;
          padding-top: 12px !important;
          padding-bottom: 8px !important;
        }

        .react-datepicker__current-month,
        .react-datepicker__day-name,
        .react-datepicker-time__header {
          color: #f1f5f9 !important;
          font-weight: 700 !important;
        }

        .react-datepicker__day-name {
          color: #94a3b8 !important;
        }

        .react-datepicker__day {
          color: #e2e8f0 !important;
        }

        .react-datepicker__day:hover {
          background-color: #334155 !important;
          color: #ffffff !important;
          border-radius: 0.5rem !important;
        }

        .react-datepicker__day--today {
          font-weight: 800 !important;
          color: #3b82f6 !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          border-radius: 0.5rem !important;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #2563eb !important;
          color: #ffffff !important;
          border-radius: 0.5rem !important;
          font-weight: bold !important;
        }

        .react-datepicker__navigation {
          top: 12px !important;
        }

        .react-datepicker__day--outside-month {
          color: #475569 !important;
        }
      `}</style>

      {/* Sticky Top Header (Tier 1: Sleek Navigation & Action Bar) */}
      <header className="sticky top-0 z-40 w-full bg-[#0c1222]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-2.5 shadow-md">
        <div className="flex items-center justify-between gap-3 flex-wrap lg:flex-nowrap">
          {/* Left Cluster: Navigation, Line Identity, Date & Style */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={onBack}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 transition-all duration-150 flex items-center justify-center shrink-0 shadow-sm active:scale-95"
              title="Back to Line List"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Line Selector Badge */}
            <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 gap-2 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              {allLines && allLines.length > 0 && onLineChange ? (
                <div className="relative flex items-center">
                  <select
                    value={lineName}
                    onChange={(e) => onLineChange(e.target.value)}
                    className="appearance-none bg-transparent text-white font-extrabold text-sm tracking-tight pr-5 focus:outline-none cursor-pointer"
                    title="Switch Line"
                  >
                    {allLines.map((line) => (
                      <option key={line.LINE_CODE} value={line.LINE_NAME} className="bg-slate-950 text-slate-200 font-semibold text-xs">
                        LINE {line.LINE_NAME}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 pointer-events-none" />
                </div>
              ) : (
                <span className="font-extrabold text-white text-sm tracking-tight">LINE {lineName}</span>
              )}
            </div>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Date Picker Pill */}
            <div className="relative flex items-center" title="Change Production Date">
              <div className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-slate-700 focus-within:border-blue-500/80 transition-all shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0 pointer-events-none" />
                <DatePicker
                  selected={baseDate}
                  onChange={(d: Date | null) => {
                    if (d) {
                      const newDateStr = format(d, "yyyy-MM-dd");
                      setActiveDate(newDateStr);
                      onDateChange?.(newDateStr);
                    }
                  }}
                  dateFormat="dd MMM yyyy"
                  className="bg-transparent text-blue-300 font-bold text-xs w-[84px] focus:outline-none cursor-pointer tracking-wide"
                />
                <ChevronDown className="w-3 h-3 text-slate-500 pointer-events-none -ml-1 shrink-0" />
              </div>
            </div>

            {/* Style Selector Pill */}
            <div className="relative flex items-center" title="Filter Style">
              <div className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-800 hover:border-slate-700 focus-within:border-indigo-500/80 transition-all shadow-sm max-w-[210px]">
                <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0 pointer-events-none" />
                <select
                  value={activeStyle}
                  onChange={(e) => {
                    const newStyle = e.target.value;
                    setActiveStyle(newStyle);
                    onStyleChange?.(newStyle);
                  }}
                  disabled={loadingStyles && availableStyles.length === 0}
                  className="appearance-none bg-transparent text-indigo-300 font-bold text-xs tracking-tight pr-5 focus:outline-none cursor-pointer truncate max-w-[140px]"
                >
                  {loadingStyles && availableStyles.length === 0 ? (
                    <option className="bg-slate-950 text-slate-400">Loading styles...</option>
                  ) : availableStyles.length === 0 ? (
                    <option value={activeStyle} className="bg-slate-950 text-slate-200">
                      {activeStyle || "No styles"}
                    </option>
                  ) : (
                    availableStyles.map((s) => (
                      <option key={s} value={s} className="bg-slate-950 text-slate-200 font-semibold text-xs">
                        {s}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 pointer-events-none absolute right-2.5 shrink-0" />
              </div>
            </div>
          </div>

          {/* Right Cluster: Search, Toggles, Bulk WH & Refresh */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search op, NIK, process..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900/80 border border-slate-800 focus:border-blue-500/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-40 sm:w-48 lg:w-56 focus:w-64 transition-all duration-200 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 p-0.5 text-slate-400 hover:text-white rounded transition-colors"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Module Toggle Chip */}
            <button
              type="button"
              onClick={() => setFilterModule(!filterModule)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 select-none shadow-sm active:scale-95 ${
                filterModule
                  ? "bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30"
                  : "bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="Filter operators by module assignment only"
            >
              <span className={`w-2 h-2 rounded-full ${filterModule ? "bg-blue-400 shadow-sm shadow-blue-400/50" : "bg-slate-600"}`} />
              <span>Module</span>
            </button>

            {/* Show Null CB Output Toggle Chip */}
            <button
              type="button"
              onClick={() => setShowNullCbOutput(!showNullCbOutput)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 select-none shadow-sm active:scale-95 ${
                showNullCbOutput
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30"
                  : "bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="Show operators with 0 output"
            >
              <span className={`w-2 h-2 rounded-full ${showNullCbOutput ? "bg-indigo-400 shadow-sm shadow-indigo-400/50" : "bg-slate-600"}`} />
              <span>Show 0</span>
            </button>

            {/* Bulk Edit Work Hours Button */}
            <button
              onClick={handleOpenBulkWorkHoursModal}
              className="px-2.5 py-1.5 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/60 hover:border-cyan-600/80 rounded-xl text-xs font-bold text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 group"
              title="Edit working hours for all operators on this line"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">Bulk WH</span>
              <span className="bg-cyan-500/20 text-cyan-200 px-1.5 py-0.2 rounded text-[10px] font-extrabold border border-cyan-500/30">
                {activeWorkingHours}h
              </span>
            </button>

            {/* Export Excel Dropdown (Export this line / Export custom lines) */}
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((prev) => !prev)}
                disabled={isExportingExcel}
                className="px-2.5 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 hover:border-emerald-600/80 rounded-xl text-xs font-bold text-emerald-300 hover:text-emerald-200 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export Excel (Module JOIN & ASSEMBLY)"
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-400 ${isExportingExcel ? "animate-pulse" : ""}`} />
                <span className="hidden sm:inline">{isExportingExcel ? "Exporting..." : "Export Excel"}</span>
                <ChevronDown className={`w-3 h-3 text-emerald-400 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0f172a] border border-slate-700/80 rounded-xl shadow-2xl shadow-black/60 py-1.5 z-50">
                  <button
                    type="button"
                    onClick={handleExportJoinAssemblyExcel}
                    disabled={loadingData || (activeJoinProcesses.length === 0 && activeAssemblyProcesses.length === 0)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-500/10 flex flex-col gap-0.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-xs font-bold text-slate-100">Export this line</span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {lineName} — {activeStyle} (1 sheet)
                    </span>
                  </button>
                  <div className="my-1 border-t border-slate-800" />
                  <button
                    type="button"
                    onClick={handleOpenCustomExportModal}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-500/10 flex flex-col gap-0.5 transition-colors"
                  >
                    <span className="text-xs font-bold text-emerald-300">Export custom lines</span>
                    <span className="text-[10px] text-slate-400">
                      Select multiple lines (multi-sheet)
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => handleRefresh(true)}
              disabled={loadingData || isBackgroundSyncing}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm disabled:opacity-60"
              title="Refresh Data"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loadingData || isBackgroundSyncing ? "animate-spin text-blue-400" : ""}`} />
              <span className="hidden sm:inline">{isBackgroundSyncing ? "Syncing..." : "Refresh"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tier 2: Executive Production KPI Strip */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-5 pb-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Style & Line Identity */}
          <div className="bg-[#0f172a]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3.5 transition-all duration-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Style & Line</span>
              <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                <Tag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-white truncate" title={activeStyle || "-"}>
              {activeStyle || "-"}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>LINE {lineName}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-500 font-medium">{factory}</span>
            </div>
          </div>

          {/* Card 2: Attendance */}
          <div className="bg-[#0f172a]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3.5 transition-all duration-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attendance</span>
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <UserCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-400 flex items-baseline gap-1.5">
              <span>{lineItem?.ATTENDING ?? 0}</span>
              <span className="text-xs font-bold text-slate-400">
                / {cbOperatorsCount !== null ? cbOperatorsCount : (lineItem?.LAYOUT_EMPLOYEE ?? lineItem?.TOTAL_EMPLOYEE ?? 0)} Ops
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
              {(() => {
                const total = cbOperatorsCount !== null ? cbOperatorsCount : (lineItem?.LAYOUT_EMPLOYEE ?? lineItem?.TOTAL_EMPLOYEE ?? 0);
                const attending = lineItem?.ATTENDING ?? 0;
                const pct = total > 0 ? Math.round((attending / total) * 100) : 0;
                return (
                  <span className={pct >= 90 ? "text-emerald-400 font-bold" : pct >= 75 ? "text-amber-400 font-bold" : "text-rose-400 font-bold"}>
                    {pct}% Present
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Card 3: Target Output */}
          <div className="bg-[#0f172a]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3.5 transition-all duration-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Prod</span>
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <Target className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-400 flex items-baseline gap-1">
              <span>{(manualTargetWH.TARGET ?? lineItem?.TARGET_PROD ?? 0).toLocaleString()}</span>
              <span className="text-xs font-normal text-slate-400">Pcs</span>
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              Daily Target
            </div>
          </div>

          {/* Card 4: Today QC Prod */}
          <div className="bg-[#0f172a]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3.5 transition-all duration-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Today QC Prod</span>
              <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-white flex items-baseline gap-1.5">
              <span>{(lineItem?.TODAY_QC_COUNTING ?? 0).toLocaleString()}</span>
              <span className="text-xs font-normal text-slate-400">Pcs</span>
            </div>
            <div className="mt-0.5 min-h-[16px] flex items-center">
              {lineItem ? renderCompareBadge(lineItem.TODAY_QC_DIFF, lineItem.TODAY_QC_PCT) : <span className="text-[11px] text-slate-500">-</span>}
            </div>
          </div>

          {/* Card 5: Avg / Hour */}
          <div className="bg-[#0f172a]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3.5 transition-all duration-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg / Hour</span>
              <div className="p-1.5 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-amber-300 flex items-baseline gap-1">
              <span>{(lineItem?.TOTAL_QC_AVG_PER_HOUR ?? 0).toLocaleString()}</span>
              <span className="text-xs font-normal text-slate-400">Pcs/h</span>
            </div>
            <div className="mt-0.5 min-h-[16px] flex items-center">
              {lineItem ? renderCompareBadge(lineItem.AVG_HOUR_DIFF, lineItem.AVG_HOUR_PCT) : <span className="text-[11px] text-slate-500">-</span>}
            </div>
          </div>

          {/* Card 6: Work Hours */}
          <div
            onClick={handleOpenBulkWorkHoursModal}
            className="bg-[#0f172a]/70 hover:bg-[#0f172a] border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-3.5 transition-all duration-200 shadow-sm relative overflow-hidden group cursor-pointer"
            title="Click to edit working hours for this line"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Work Hours</span>
              <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20 group-hover:scale-105 transition-transform">
                <Edit3 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-cyan-300 flex items-baseline gap-1">
              <span>{activeWorkingHours}</span>
              <span className="text-xs font-normal text-slate-400">Hours</span>
            </div>
            <div className="text-[11px] font-semibold text-cyan-400/80 group-hover:text-cyan-300 mt-0.5 flex items-center gap-1">
              <span>Quick Edit</span>
              <span className="text-[10px]">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Flow Grid Layout */}
      <Xwrapper>
        <div className="w-full px-4 sm:px-6 lg:px-8 mt-5 relative">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start relative z-20">
          
          {/* LEFT COLUMN: Feeding Lines */}
          <div className="xl:col-span-3 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Feeding Lines (Sub-Lines)
                {loadingData && (
                  <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded animate-pulse font-bold border border-blue-500/30">
                    Loading...
                  </span>
                )}
              </h2>
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("today")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    viewMode === "today" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setViewMode("cumulative")}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    viewMode === "cumulative" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Cumulative
                </button>
              </div>
            </div>

            {loadingData ? (
              // Sub-Lines Shimmer Skeleton Loader
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={`sk-sub-${idx}`} className="border border-slate-800 bg-slate-900/10 rounded-2xl p-5 animate-pulse flex flex-col gap-4">
                  <div className="flex items-center justify-between pl-2">
                    <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-2">
                    <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/30 flex flex-col gap-1.5 items-center justify-center h-12">
                      <div className="h-2 bg-slate-800 rounded w-8"></div>
                      <div className="h-3 bg-slate-800 rounded w-12"></div>
                    </div>
                    <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/30 flex flex-col gap-1.5 items-center justify-center h-12">
                      <div className="h-2 bg-slate-800 rounded w-8"></div>
                      <div className="h-3 bg-slate-800 rounded w-12"></div>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-800 rounded w-2/3 ml-2 mt-1"></div>
                </div>
              ))
            ) : (
              feedingLines.map((line) => {
                const borderClass =
                  line.status === "insufficient"
                    ? "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50"
                    : line.status === "delay"
                    ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                    : "border-slate-800 bg-slate-900/20 hover:border-slate-700";

                const currentInput = viewMode === "today" ? line.inputToday : line.input;
                const currentOutput = viewMode === "today" ? line.outputToday : line.output;

                return (
                  <div
                    key={line.id}
                    id={`card-${line.partKey.toUpperCase().replace(/\s+/g, '')}`}
                    onClick={() => setActivePartModal(line)}
                    className={`border rounded-2xl p-5 transition-all duration-300 relative group overflow-hidden cursor-pointer hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.98] ${borderClass}`}
                  >
                    {/* Status Indicator Bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        line.status === "insufficient"
                          ? "bg-rose-500"
                          : line.status === "delay"
                          ? "bg-amber-500"
                          : "bg-blue-500/50"
                      }`}
                    />
                    
                    <div className="flex items-start justify-between mb-3">
                      <span className="font-bold text-slate-200 text-sm pl-2">{line.name}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center mb-4 pl-2">
                      <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Input</div>
                        <div className="text-xs font-extrabold text-slate-300 mt-0.5">{currentInput.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/50">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Output</div>
                        <div className="text-xs font-extrabold text-emerald-400 mt-0.5">{currentOutput.toLocaleString()}</div>
                      </div>
                    </div>

                     <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/50 pt-2.5 pl-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="font-semibold text-slate-500">Target Prod:</span>
                        {editingModulePart === line.partKey ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSaveModuleTarget(line.partKey, parseInt(editingTargetValue, 10) || 0);
                            }}
                            className="flex items-center gap-1.5 w-full"
                          >
                            <input
                              type="number"
                              value={editingTargetValue}
                              onChange={(e) => setEditingTargetValue(e.target.value)}
                              className="bg-slate-900 border border-blue-500/80 rounded px-1.5 py-0.5 text-xs text-white font-bold w-16 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="p-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/30"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingModulePart(null)}
                              className="p-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-500/30"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-white font-bold">{line.uph} Pcs</span>
                            <button
                              onClick={() => {
                                setEditingModulePart(line.partKey);
                                setEditingTargetValue(String(line.uph));
                              }}
                              className="p-1 text-slate-400 hover:text-blue-400 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded transition-colors"
                              title="Edit Target"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cross-module output operator info */}
                    {(() => {
                      const link = crossModuleLinks.get(line.partKey);
                      if (!link) return null;
                      const op = link.outputOperator;
                      const stock = op.wip ?? 0;
                      const stockColor = stock < 0 ? "text-rose-400" : stock === 0 ? "text-slate-400" : "text-emerald-400";
                      return (
                        <div className="mt-2 pl-2 border-t border-blue-500/20 pt-2">
                          <div className="text-[10px] font-bold text-blue-400/80 uppercase tracking-wide mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                            Output to Join
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-semibold text-slate-200">{op.worker}</span>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                              <span>Actual: <span className="text-white font-bold">{(op.totalOutputAlltime ?? 0).toLocaleString()}</span></span>
                              <span>Stock: <span className={`font-bold ${stockColor}`}>{stock.toLocaleString()}</span></span>
                            </div>
                          </div>
                          {/* Xarrow lines from this module card to linked JOIN/ASSEMBLY operator rows (Temporarily disabled) */}
                          {/* {link.linkedRows.map((row) => {
                            const targetId = `${row.rowIdPrefix}-${row.nik.replace(/[^a-zA-Z0-9]/g, '-')}`;
                            const sourceId = `card-${line.partKey.toUpperCase().replace(/\s+/g, '')}`;
                            return (
                              <Xarrow
                                key={`xlink-${sourceId}-${targetId}`}
                                start={sourceId}
                                end={targetId}
                                color="#3b82f6"
                                strokeWidth={1.5}
                                path="smooth"
                                dashness={{ strokeLen: 8, nonStrokeLen: 4 }}
                                startAnchor="right"
                                endAnchor="left"
                                zIndex={5}
                              />
                            );
                          })} */}
                        </div>
                      );
                    })()}

                  </div>
                );
              })
            )}
          </div>
          {/* RIGHT COLUMN: Process Sections Flow */}
          <div className="xl:col-span-9 flex flex-col gap-6">
            {loadingData ? (
              // Shimmer Skeleton Loader for three tables
              Array.from({ length: 3 }).map((_, idx) => {
                return (
                  <div key={`sk-sec-${idx}`} className="border border-slate-800 bg-slate-900/10 rounded-2xl p-6 animate-pulse flex flex-col gap-5">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                      <div className="h-5 bg-slate-800 rounded w-1/4"></div>
                      <div className="h-6 bg-slate-800 rounded w-16"></div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {/* Header skeleton */}
                      <div className="grid grid-cols-11 gap-4 h-6 bg-slate-800/40 rounded px-2"></div>
                      {/* Row skeletons */}
                      <div className="grid grid-cols-11 gap-4 h-10 bg-slate-800/20 rounded px-2"></div>
                      <div className="grid grid-cols-11 gap-4 h-10 bg-slate-800/10 rounded px-2"></div>
                      <div className="grid grid-cols-11 gap-4 h-10 bg-slate-800/5 rounded px-2"></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                {/* 1. JOIN SECTION (조인 구간) */}
                <div id="section-JOIN" className="border border-emerald-500/20 bg-slate-900/10 rounded-2xl p-6 relative">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <h3 className="text-base font-extrabold text-white">Join</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Target Edit Form/Display for JOIN */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-slate-500">Target Prod:</span>
                        {editingModulePart === "JOIN" ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const partKey = activeJoinProcesses[0]?.role || "JOIN";
                              handleSaveModuleTarget(partKey, parseInt(editingTargetValue, 10) || 0);
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="number"
                              value={editingTargetValue}
                              onChange={(e) => setEditingTargetValue(e.target.value)}
                              className="bg-slate-900 border border-blue-500/80 rounded px-1.5 py-0.5 text-xs text-white font-bold w-16 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="p-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/30"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingModulePart(null)}
                              className="p-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-500/30"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-1 group/target">
                            <span className="text-blue-400 font-extrabold">
                              {activeJoinProcesses[0]?.dailyTarget || apiData[0]?.TARGET_PRD || 0} Pcs
                            </span>
                            <button
                              onClick={() => {
                                setEditingModulePart("JOIN");
                                setEditingTargetValue(String(activeJoinProcesses[0]?.dailyTarget || apiData[0]?.TARGET_PRD || 0));
                              }}
                              className="p-1 text-slate-400 hover:text-blue-400 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded transition-colors"
                              title="Edit Target"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold">
                        {activeJoinProcesses.length} ops Active
                      </span>
                      {/* Group by Process Toggle */}
                      <button
                        onClick={() => setGroupByProcess((v) => !v)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          groupByProcess
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25"
                            : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800"
                        }`}
                        title={groupByProcess ? "Click to show per-operator rows" : "Click to group rows by process"}
                      >
                        {groupByProcess ? (
                          <><span className="text-[10px]">📋</span> Grouped</>
                        ) : (
                          <><span className="text-[10px]">📋</span> Per Operator</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-500 font-bold border-b border-slate-800/60 pb-2">
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">No</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">NIK</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Operator</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Main Process</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Module</th>
                           <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Type</th>
                          <th colSpan={2} className="py-1 text-center sticky top-0 bg-[#0c1222] z-10 min-w-[120px] px-0">
                            <div className="border-b border-slate-700/60 pb-1 mb-1">UPH</div>
                            <div className="flex">
                              <div className="flex-1 text-[10px]">Target</div>
                              <div className="flex-1 text-[10px]">Actual</div>
                            </div>
                          </th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Output</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Output (All-Time)</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Missing Output</th>
                          {/* <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Stock</th> */}
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">
                            {groupByProcess ? (
                              <span className="text-blue-400">Stock (Grouped)</span>
                            ) : "Stock (All-Time)"}
                          </th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Stock Days</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">
                            <div className="flex items-center justify-center gap-1">
                              <span>Work Hours</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBulkWorkHoursModal();
                                }}
                                className="p-0.5 hover:bg-cyan-500/20 rounded text-cyan-400/70 hover:text-cyan-300 transition-colors"
                                title="Edit working hours for all operators on this line at once"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </th>
                          <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>{dateD2Str}</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th>
                          <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>{dateD1Str}</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th>
                          {/* <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>Today</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th> */}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {activeJoinProcesses.length === 0 ? (
                          <tr>
                            <td colSpan={15} className="py-8 text-center text-slate-500 font-semibold">
                              No processes found for this module.
                            </td>
                          </tr>
                        ) : groupByProcess ? (
                          // ── GROUPED VIEW ──
                          joinGroupedRows.map((p, idx) => {
                            const isGrp = !!(p._isGroupedRow && p._groupedOperators && p._groupedOperators.length > 1);
                            const ops = p._groupedOperators ?? [p];
                            const rowId = p.nik ? `row-join-${p.nik.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined;
                            return (
                            <tr
                              id={rowId}
                              key={`grp-join-${idx}`}
                              className={`transition-colors relative ${ isGrp ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-slate-800/20" }`}
                            >
                              <td className="py-3.5 text-center font-semibold text-slate-500">{idx + 1}</td>
                              <td className="py-3.5 text-center font-semibold text-slate-400 text-[10px]">
                                {isGrp ? (
                                  <span className="flex flex-col gap-0.5 items-center">
                                    {ops.map((op) => <span key={op.nik}>{op.nik}</span>)}
                                  </span>
                                ) : (p.nik || "-")}
                              </td>
                              <td className="py-3.5 text-slate-400 text-left">
                                {isGrp ? (
                                  <div className="flex flex-col gap-0.5">
                                    {ops.map((op) => (
                                      <span
                                        key={op.nik}
                                        onClick={() => setSelectedOperator({ worker: op.worker, processName: op.name, nik: op.nik })}
                                        className="text-blue-400 font-semibold cursor-pointer hover:underline text-[10px]"
                                      >{op.worker}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span
                                    onClick={() => setSelectedOperator({ worker: p.worker, processName: p.name, nik: p.nik })}
                                    className="text-blue-400 font-semibold cursor-pointer hover:underline"
                                  >{p.worker}</span>
                                )}
                              </td>
                              <td className="py-3.5 text-left font-bold text-white text-[11px]">
                                {isGrp ? (
                                  <div className="flex flex-col gap-0.5">
                                    {ops.map((op) => {
                                      const text = op.mainProcess || "-";
                                      return (
                                        <span
                                          key={op.nik}
                                          className="truncate max-w-[160px] inline-block cursor-help hover:text-blue-300 transition-colors"
                                          title={text}
                                        >
                                          {text}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span
                                    className="truncate max-w-[180px] inline-block cursor-help hover:text-blue-300 transition-colors"
                                    title={p.mainProcess || "-"}
                                  >
                                    {p.mainProcess || "-"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-center text-slate-300">{p.role}</td>
                              <td className="py-3.5 text-center">{renderOperatorTypeBadge(p.operatorType)}</td>
                              <td className="py-3.5 text-center">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-slate-200 font-bold">{ops.reduce((sum, op) => sum + (op.uphTarget ?? 0), 0)}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => op.uphTarget).join(" + ")}</span>
                                  </div>
                                ) : (
                                  p.uphTarget
                                )}
                              </td>
                              <td className="py-3.5 text-center border-l border-slate-800/30">
                                {isGrp ? (
                                  (() => {
                                    const totalActual = ops.reduce((sum, op) => sum + (op.uphActual ?? 0), 0);
                                    const totalTarget = ops.reduce((sum, op) => sum + (op.uphTarget ?? 0), 0);
                                    const color = totalTarget > 0 ? (totalActual / totalTarget < 0.9 ? "text-rose-500" : totalActual / totalTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white";
                                    return (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`font-bold ${color}`}>{Math.round(totalActual)}</span>
                                        <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => Math.round(op.uphActual)).join(" + ")}</span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className={`font-bold ${p.uphTarget > 0 ? (p.uphActual / p.uphTarget < 0.9 ? "text-rose-500" : p.uphActual / p.uphTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white"}`}>{p.uphActual}</span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-200">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-slate-200">{ops.reduce((sum, op) => sum + (op.cumulative ?? 0), 0).toLocaleString()}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => op.cumulative.toLocaleString()).join(" + ")}</span>
                                  </div>
                                ) : p.cumulative.toLocaleString()}
                              </td>
                              {/* Output All-Time: SUM for grouped */}
                              <td className="py-3.5 text-center font-extrabold">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-emerald-400">{(p._groupedOutput ?? 0).toLocaleString()}</span>
                                    <span className="text-[9px] text-slate-500">{ops.map(op => op.totalOutputAlltime?.toLocaleString()).join(" + ")}</span>
                                  </div>
                                ) : <span className="text-slate-400">{(p.totalOutputAlltime ?? 0).toLocaleString()}</span>}
                              </td>
                              <td className="py-3.5 text-center text-slate-400">
                                {isGrp ? (
                                  <span className="flex flex-col gap-0.5 text-[10px] items-center">
                                    {ops.map((op) => {
                                      const mo = op.missingOutput ?? 0;
                                      return (
                                        <span key={op.nik} className={mo < 0 ? "text-rose-400 font-bold" : mo > 0 ? "text-blue-400" : "text-slate-400"}>
                                          {mo.toLocaleString()}
                                        </span>
                                      );
                                    })}
                                  </span>
                                ) : (
                                  <span className={(p.missingOutput ?? 0) < 0 ? "text-rose-400 font-bold" : (p.missingOutput ?? 0) > 0 ? "text-blue-400" : "text-slate-400"}>
                                    {(p.missingOutput ?? 0).toLocaleString()}
                                  </span>
                                )}
                              </td>
                              {/* Stock All-Time: In grouped mode show STOCK_GROUPED from server; in per-op mode show STOCK_OP */}
                              <td className="py-3.5 text-center font-extrabold">
                                {(() => {
                                  const calcStock = groupByProcess
                                    ? Number(p._groupedStock ?? p.stockGrouped ?? p.totalStockAlltime ?? 0)
                                    : Number(p.totalStockAlltime ?? 0);
                                  return renderStockBadgeWithSource(p, calcStock, groupByProcess, dbProcesses, setActiveStockDetail);
                                })()}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">
                                {(() => {
                                  const calcStock = groupByProcess
                                    ? Number(p._groupedStock ?? p.stockGrouped ?? p.totalStockAlltime ?? 0)
                                    : Number(p.totalStockAlltime ?? 0);
                                  return getGroupStockDays(calcStock, ops, false);
                                })()}
                              </td>
                              <td className="py-3.5 text-center">
                                {isGrp ? (
                                  <span className="flex flex-col gap-0.5 text-[10px] items-center">
                                    {ops.map(op => <span key={op.nik}>{op.workingHours ?? 11}h</span>)}
                                  </span>
                                ) : editingWorkHoursNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input type="number" value={tempWorkHours} onChange={(e) => setTempWorkHours(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveInlineWorkHours(p.nik); if (e.key === "Escape") { setEditingWorkHoursNik(null); setTempWorkHours(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} step={0.5} />
                                    <button onClick={() => handleSaveInlineWorkHours(p.nik)} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEditingWorkHoursNik(null); setTempWorkHours(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span onClick={() => { setEditingWorkHoursNik(p.nik || ""); setTempWorkHours(String(p.workingHours ?? 11)); }} className="cursor-pointer hover:text-cyan-400 font-bold flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500" />
                                    {p.workingHours ?? 11}h
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[0]?.value ?? 0}</td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[1]?.value ?? 0}</td>
                            </tr>
                            );
                          })
                        ) : (
                          // ── PER-OPERATOR VIEW (original) ──
                          activeJoinProcesses.map((p, idx) => {
                            const group = joinSharedGroups.get(idx);
                            const rowBg = group?.rowBg || "hover:bg-slate-800/20";
                            const borderTop = group?.borderTop || "";
                            const borderBottom = group?.borderBottom || "";
                            const rowId = p.nik ? `row-join-${p.nik.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined;
                            return (
                            <tr id={rowId} key={`${p.nik}-${p.name}-${idx}`} className={`transition-colors ${rowBg} ${borderTop} ${borderBottom} relative`}>
                               <td
                                className="py-3.5 text-center font-semibold text-slate-500 relative pl-2"
                              >
                                {renderSharedGroupLine(group)}
                                {idx + 1}
                              </td>
                              <td className="py-3.5 text-center font-semibold text-slate-400">{p.nik || "-"}</td>
                              <td className="py-3.5 text-slate-400 text-left">
                                <span
                                  onClick={() => setSelectedOperator({ worker: p.worker, processName: p.name, nik: p.nik })}
                                  className="text-blue-400 font-semibold cursor-pointer hover:underline"
                                >
                                  {p.worker}
                                </span>
                              </td>
                              <td className="py-3.5 text-left font-bold text-white text-[11px]">
                                <span
                                  className="truncate max-w-[180px] inline-block cursor-help hover:text-blue-300 transition-colors"
                                  title={p.mainProcess || "-"}
                                >
                                  {p.mainProcess || "-"}
                                </span>
                              </td>
                              <td className="py-3.5 text-center text-slate-300">{p.role}</td>
                              <td className="py-3.5 text-center">{renderOperatorTypeBadge(p.operatorType)}</td>
                              <td className="py-3.5 text-center">
                                {editingUphNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      value={tempUphTarget}
                                      onChange={(e) => setTempUphTarget(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveUph(p.nik || "");
                                        if (e.key === "Escape") setEditingUphNik(null);
                                      }}
                                      className="w-12 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveUph(p.nik || "")}
                                      className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingUphNik(null)}
                                      className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    <span
                                      onClick={() => {
                                        setEditingUphNik(p.nik || "");
                                        setTempUphTarget(String(p.uphTarget));
                                      }}
                                      className="group flex items-center justify-center gap-1 text-slate-300 hover:text-blue-400 transition-colors duration-200 cursor-pointer font-bold"
                                      title="Click to edit Target UPH"
                                    >
                                      <Edit2 className="w-2.5 h-2.5 text-slate-500 opacity-40 group-hover:opacity-100 group-hover:text-blue-400 transition-all duration-200" />
                                      <span>{p.uphTarget}</span>
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 text-center border-l border-slate-800/30">
                                <span className={`font-bold ${p.uphTarget > 0 ? (p.uphActual / p.uphTarget < 0.9 ? "text-rose-500" : p.uphActual / p.uphTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white"}`}>
                                  {p.uphActual}
                                </span>
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-200">
                                {p.cumulative.toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-400">
                                {(p.totalOutputAlltime ?? 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center">
                                {editingMissingNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      value={tempMissingQty}
                                      onChange={(e) => setTempMissingQty(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10));
                                        if (e.key === "Escape") setEditingMissingNik(null);
                                      }}
                                      className="w-16 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10))}
                                      className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingMissingNik(null)}
                                      className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    <span
                                      onClick={() => {
                                        setEditingMissingNik(p.nik || "");
                                        setTempMissingQty(String(p.missingOutput || ""));
                                      }}
                                      className="group flex items-center justify-center gap-1 text-slate-300 hover:text-blue-400 transition-colors duration-200 cursor-pointer font-bold"
                                      title="Click to add/edit missing output"
                                    >
                                      {p.missingOutput ? (
                                        <span className={p.missingOutput < 0 ? "text-rose-400 font-bold" : "text-blue-400"}>{p.missingOutput.toLocaleString()}</span>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100 group-hover:text-blue-400 transition-all duration-200" />
                                          <span className="text-[10px] text-slate-500 group-hover:text-blue-400 opacity-60 group-hover:opacity-100">Add</span>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </td>
                              {/* <td className="py-3.5 text-center">
                                <span className={`font-extrabold px-2 py-0.5 rounded ${p.wip > 100 ? "bg-rose-500/10 text-rose-400" : "text-blue-400"}`}>
                                  {p.wip}
                                </span>
                              </td> */}
                              <td className="py-3.5 text-center">
                                {renderStockBadgeWithSource(p, undefined, false, dbProcesses, setActiveStockDetail)}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">
                                {getOperatorStockDays(p)}
                              </td>
                              <td className="py-3.5 text-center">
                                {editingWorkHoursNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input type="number" value={tempWorkHours} onChange={(e) => setTempWorkHours(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveInlineWorkHours(p.nik); if (e.key === "Escape") { setEditingWorkHoursNik(null); setTempWorkHours(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} step={0.5} />
                                    <button onClick={() => handleSaveInlineWorkHours(p.nik)} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEditingWorkHoursNik(null); setTempWorkHours(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span onClick={() => { setEditingWorkHoursNik(p.nik || ""); setTempWorkHours(String(p.workingHours ?? 11)); }} className="cursor-pointer hover:text-cyan-400 font-bold flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500" />
                                    {p.workingHours ?? 11}h
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[0]?.value ?? 0}</td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[1]?.value ?? 0}</td>
                              {/* <td className="py-3.5 text-center font-bold text-slate-400">{p.history[2]?.value ?? 0}</td> */}
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. ASSEMBLY SECTION (합목/조합 구간) */}
                <div id="section-ASSEMBLY" className="border border-amber-500/20 bg-slate-900/10 rounded-2xl p-6 relative">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                      <h3 className="text-base font-extrabold text-white">Assembly</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Target Edit Form/Display for ASSEMBLY */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-slate-500">Target Prod:</span>
                        {editingModulePart === "ASSEMBLY" ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const partKey = activeAssemblyProcesses[0]?.role || "ASSEMBLY";
                              handleSaveModuleTarget(partKey, parseInt(editingTargetValue, 10) || 0);
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="number"
                              value={editingTargetValue}
                              onChange={(e) => setEditingTargetValue(e.target.value)}
                              className="bg-slate-900 border border-blue-500/80 rounded px-1.5 py-0.5 text-xs text-white font-bold w-16 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="p-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/30"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingModulePart(null)}
                              className="p-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-500/30"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-1 group/target">
                            <span className="text-blue-400 font-extrabold">
                              {activeAssemblyProcesses[0]?.dailyTarget || apiData[0]?.TARGET_PRD || 0} Pcs
                            </span>
                            <button
                              onClick={() => {
                                setEditingModulePart("ASSEMBLY");
                                setEditingTargetValue(String(activeAssemblyProcesses[0]?.dailyTarget || apiData[0]?.TARGET_PRD || 0));
                              }}
                              className="p-1 text-slate-400 hover:text-blue-400 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded transition-colors"
                              title="Edit Target"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-bold">
                        {activeAssemblyProcesses.length} ops Active
                      </span>
                      {/* Group by Process Toggle */}
                      <button
                        onClick={() => setGroupByProcess((v) => !v)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          groupByProcess
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25"
                            : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800"
                        }`}
                        title={groupByProcess ? "Click to show per-operator rows" : "Click to group rows by process"}
                      >
                        {groupByProcess ? (
                          <><span className="text-[10px]">📋</span> Grouped</>
                        ) : (
                          <><span className="text-[10px]">📋</span> Per Operator</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-500 font-bold border-b border-slate-800/60 pb-2">
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">No</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">NIK</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Operator</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Main Process</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Module</th>
                           <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Type</th>
                          <th colSpan={2} className="py-1 text-center sticky top-0 bg-[#0c1222] z-10 min-w-[120px] px-0">
                            <div className="border-b border-slate-700/60 pb-1 mb-1">UPH</div>
                            <div className="flex">
                              <div className="flex-1 text-[10px]">Target</div>
                              <div className="flex-1 text-[10px]">Actual</div>
                            </div>
                          </th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Output</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Output (All-Time)</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Missing Output</th>
                          {/* <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Stock</th> */}
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">
                            {groupByProcess ? (
                              <span className="text-blue-400">Stock (Grouped)</span>
                            ) : "Stock (All-Time)"}
                          </th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Stock Days</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">
                            <div className="flex items-center justify-center gap-1">
                              <span>Work Hours</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBulkWorkHoursModal();
                                }}
                                className="p-0.5 hover:bg-cyan-500/20 rounded text-cyan-400/70 hover:text-cyan-300 transition-colors"
                                title="Edit working hours for all operators on this line at once"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </th>
                          <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>{dateD2Str}</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th>
                          <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>{dateD1Str}</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th>
                          {/* <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>Today</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th> */}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {activeAssemblyProcesses.length === 0 ? (
                          <tr>
                            <td colSpan={15} className="py-8 text-center text-slate-500 font-semibold">
                              No processes found for this module.
                            </td>
                          </tr>
                        ) : groupByProcess ? (
                          assemblyGroupedRows.map((p, idx) => {
                            const isGrp = !!(p._isGroupedRow && p._groupedOperators && p._groupedOperators.length > 1);
                            const ops = p._groupedOperators ?? [p];
                            const rowId = p.nik ? `row-assembly-${p.nik.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined;
                            return (
                            <tr id={rowId} key={`grp-asm-${idx}`} className={`transition-colors relative ${ isGrp ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-slate-800/20" }`}>
                              <td className="py-3.5 text-center font-semibold text-slate-500">{idx + 1}</td>
                              <td className="py-3.5 text-center font-semibold text-slate-400 text-[10px]">
                                {isGrp ? <span className="flex flex-col gap-0.5 items-center">{ops.map((op) => <span key={op.nik}>{op.nik}</span>)}</span> : (p.nik || "-")}
                              </td>
                              <td className="py-3.5 text-slate-400 text-left">
                                {isGrp ? (
                                  <div className="flex flex-col gap-0.5">
                                    {ops.map((op) => (
                                      <span key={op.nik} onClick={() => setSelectedOperator({ worker: op.worker, processName: op.name, nik: op.nik })} className="text-blue-400 font-semibold cursor-pointer hover:underline text-[10px]">{op.worker}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span onClick={() => setSelectedOperator({ worker: p.worker, processName: p.name, nik: p.nik })} className="text-blue-400 font-semibold cursor-pointer hover:underline">{p.worker}</span>
                                )}
                              </td>
                              <td className="py-3.5 text-slate-400 text-left font-semibold text-[10px]">
                                {isGrp ? (
                                  <div className="flex flex-col gap-0.5">
                                    {ops.map((op) => {
                                      const text = op.mainProcess || "-";
                                      return (
                                        <span
                                          key={op.nik}
                                          className="text-amber-300 font-medium truncate max-w-[180px] inline-block cursor-help hover:text-amber-200 transition-colors"
                                          title={text}
                                        >
                                          {text}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span
                                    className="text-amber-300 font-medium truncate max-w-[180px] inline-block cursor-help hover:text-amber-200 transition-colors"
                                    title={p.mainProcess || "-"}
                                  >
                                    {p.mainProcess || "-"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-center text-slate-300">{p.role}</td>
                              <td className="py-3.5 text-center">{renderOperatorTypeBadge(p.operatorType)}</td>
                              <td className="py-3.5 text-center">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-slate-200 font-bold">{ops.reduce((sum, op) => sum + (op.uphTarget ?? 0), 0)}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => op.uphTarget).join(" + ")}</span>
                                  </div>
                                ) : (
                                  p.uphTarget
                                )}
                              </td>
                              <td className="py-3.5 text-center border-l border-slate-800/30">
                                {isGrp ? (
                                  (() => {
                                    const totalActual = ops.reduce((sum, op) => sum + (op.uphActual ?? 0), 0);
                                    const totalTarget = ops.reduce((sum, op) => sum + (op.uphTarget ?? 0), 0);
                                    const color = totalTarget > 0 ? (totalActual / totalTarget < 0.9 ? "text-rose-500" : totalActual / totalTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white";
                                    return (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`font-bold ${color}`}>{Math.round(totalActual)}</span>
                                        <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => Math.round(op.uphActual)).join(" + ")}</span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className={`font-bold ${p.uphTarget > 0 ? (p.uphActual / p.uphTarget < 0.9 ? "text-rose-500" : p.uphActual / p.uphTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white"}`}>{p.uphActual}</span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-200">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-slate-200">{ops.reduce((sum, op) => sum + (op.cumulative ?? 0), 0).toLocaleString()}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => op.cumulative.toLocaleString()).join(" + ")}</span>
                                  </div>
                                ) : p.cumulative.toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center font-extrabold">
                                {isGrp ? <div className="flex flex-col items-center gap-0.5"><span className="text-emerald-400">{(p._groupedOutput ?? 0).toLocaleString()}</span><span className="text-[9px] text-slate-500">{ops.map(op => op.totalOutputAlltime?.toLocaleString()).join(" + ")}</span></div> : <span className="text-slate-400">{(p.totalOutputAlltime ?? 0).toLocaleString()}</span>}
                              </td>
                              <td className="py-3.5 text-center text-slate-400">
                                {isGrp ? <span className="flex flex-col gap-0.5 text-[10px] items-center">{ops.map((op) => <span key={op.nik}>{(op.missingOutput ?? 0).toLocaleString()}</span>)}</span> : (p.missingOutput ?? 0).toLocaleString()}
                              </td>
                              {/* Stock All-Time: In grouped mode show STOCK_GROUPED from server; in per-op mode show STOCK_OP */}
                              <td className="py-3.5 text-center font-extrabold">
                                {(() => {
                                  const calcStock = groupByProcess
                                    ? Number(p._groupedStock ?? p.stockGrouped ?? p.totalStockAlltime ?? 0)
                                    : Number(p.totalStockAlltime ?? 0);
                                  return renderStockBadgeWithSource(p, calcStock, groupByProcess, dbProcesses, setActiveStockDetail);
                                })()}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">
                                {(() => {
                                  const calcStock = groupByProcess
                                    ? Number(p._groupedStock ?? p.stockGrouped ?? p.totalStockAlltime ?? 0)
                                    : Number(p.totalStockAlltime ?? 0);
                                  return getGroupStockDays(calcStock, ops, false);
                                })()}
                              </td>
                              <td className="py-3.5 text-center">
                                {isGrp ? (
                                  <span className="flex flex-col gap-0.5 text-[10px] items-center">
                                    {ops.map(op => <span key={op.nik}>{op.workingHours ?? 11}h</span>)}
                                  </span>
                                ) : editingWorkHoursNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input type="number" value={tempWorkHours} onChange={(e) => setTempWorkHours(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveInlineWorkHours(p.nik); if (e.key === "Escape") { setEditingWorkHoursNik(null); setTempWorkHours(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} step={0.5} />
                                    <button onClick={() => handleSaveInlineWorkHours(p.nik)} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEditingWorkHoursNik(null); setTempWorkHours(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span onClick={() => { setEditingWorkHoursNik(p.nik || ""); setTempWorkHours(String(p.workingHours ?? 11)); }} className="cursor-pointer hover:text-cyan-400 font-bold flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500" />
                                    {p.workingHours ?? 11}h
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[0]?.value ?? 0}</td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[1]?.value ?? 0}</td>
                            </tr>
                            );
                          })
                        ) : (
                          activeAssemblyProcesses.map((p, idx) => {
                            const group = assemblySharedGroups.get(idx);
                            const rowBg = group?.rowBg || "hover:bg-slate-800/20";
                            const borderTop = group?.borderTop || "";
                            const borderBottom = group?.borderBottom || "";
                            const rowId = p.nik ? `row-assembly-${p.nik.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined;
                            return (
                            <tr id={rowId} key={`${p.nik}-${p.name}-${idx}`} className={`transition-colors ${rowBg} ${borderTop} ${borderBottom} relative`}>
                               <td
                                className="py-3.5 text-center font-semibold text-slate-500 relative pl-2"
                              >
                                {renderSharedGroupLine(group)}
                                {idx + 1}
                              </td>
                              <td className="py-3.5 text-center font-semibold text-slate-400">{p.nik || "-"}</td>
                              <td className="py-3.5 text-slate-400 text-left">
                                <span
                                  onClick={() => setSelectedOperator({ worker: p.worker, processName: p.name, nik: p.nik })}
                                  className="text-blue-400 font-semibold cursor-pointer hover:underline"
                                >
                                  {p.worker}
                                </span>
                              </td>
                              <td className="py-3.5 text-slate-400 text-left font-semibold text-[10px]">
                                <span
                                  className="text-amber-300 font-medium truncate max-w-[180px] inline-block cursor-help hover:text-amber-200 transition-colors"
                                  title={p.mainProcess || "-"}
                                >
                                  {p.mainProcess || "-"}
                                </span>
                              </td>
                              <td className="py-3.5 text-center text-slate-300">{p.role}</td>
                              <td className="py-3.5 text-center">{renderOperatorTypeBadge(p.operatorType)}</td>
                              <td className="py-3.5 text-center">
                                {editingUphNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      value={tempUphTarget}
                                      onChange={(e) => setTempUphTarget(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveUph(p.nik || "");
                                        if (e.key === "Escape") setEditingUphNik(null);
                                      }}
                                      className="w-12 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveUph(p.nik || "")}
                                      className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingUphNik(null)}
                                      className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    <span
                                      onClick={() => {
                                        setEditingUphNik(p.nik || "");
                                        setTempUphTarget(String(p.uphTarget));
                                      }}
                                      className="group flex items-center justify-center gap-1 text-slate-300 hover:text-blue-400 transition-colors duration-200 cursor-pointer font-bold"
                                      title="Click to edit Target UPH"
                                    >
                                      <Edit2 className="w-2.5 h-2.5 text-slate-500 opacity-40 group-hover:opacity-100 group-hover:text-blue-400 transition-all duration-200" />
                                      <span>{p.uphTarget}</span>
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 text-center border-l border-slate-800/30">
                                <span className={`font-bold ${p.uphTarget > 0 ? (p.uphActual / p.uphTarget < 0.9 ? "text-rose-500" : p.uphActual / p.uphTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white"}`}>
                                  {p.uphActual}
                                </span>
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-200">
                                {p.cumulative.toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-400">
                                {(p.totalOutputAlltime ?? 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center">
                                {editingMissingNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      value={tempMissingQty}
                                      onChange={(e) => setTempMissingQty(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10));
                                        if (e.key === "Escape") setEditingMissingNik(null);
                                      }}
                                      className="w-16 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10))}
                                      className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingMissingNik(null)}
                                      className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    <span
                                      onClick={() => {
                                        setEditingMissingNik(p.nik || "");
                                        setTempMissingQty(String(p.missingOutput || ""));
                                      }}
                                      className="group flex items-center justify-center gap-1 text-slate-300 hover:text-blue-400 transition-colors duration-200 cursor-pointer font-bold"
                                      title="Click to add/edit missing output"
                                    >
                                      {p.missingOutput ? (
                                        <span className="text-blue-400">{p.missingOutput.toLocaleString()}</span>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100 group-hover:text-blue-400 transition-all duration-200" />
                                          <span className="text-[10px] text-slate-500 group-hover:text-blue-400 opacity-60 group-hover:opacity-100">Add</span>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </td>
                              {/* <td className="py-3.5 text-center">
                                <span className={`font-extrabold px-2 py-0.5 rounded ${p.wip > 100 ? "bg-rose-500/10 text-rose-400" : "text-blue-400"}`}>
                                  {p.wip}
                                </span>
                              </td> */}
                              <td className="py-3.5 text-center">
                                {renderStockBadgeWithSource(p, undefined, false, dbProcesses, setActiveStockDetail)}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">
                                {getOperatorStockDays(p)}
                              </td>
                              <td className="py-3.5 text-center">
                                {editingWorkHoursNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input type="number" value={tempWorkHours} onChange={(e) => setTempWorkHours(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveInlineWorkHours(p.nik); if (e.key === "Escape") { setEditingWorkHoursNik(null); setTempWorkHours(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} step={0.5} />
                                    <button onClick={() => handleSaveInlineWorkHours(p.nik)} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEditingWorkHoursNik(null); setTempWorkHours(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span onClick={() => { setEditingWorkHoursNik(p.nik || ""); setTempWorkHours(String(p.workingHours ?? 11)); }} className="cursor-pointer hover:text-cyan-400 font-bold flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500" />
                                    {p.workingHours ?? 11}h
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[0]?.value ?? 0}</td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[1]?.value ?? 0}</td>
                              {/* <td className="py-3.5 text-center font-bold text-slate-400">{p.history[2]?.value ?? 0}</td> */}
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. FINISH SECTION (완성) */}
                <div id="section-FINISH" className="border border-cyan-500/20 bg-slate-900/10 rounded-2xl p-6 relative">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></div>
                      <h3 className="text-base font-extrabold text-white">Finish (QC End Line)</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Target Edit Form/Display for FINISH */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-semibold text-slate-500">Target Prod:</span>
                        {editingModulePart === "FINISH" ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const partKey = activeFinishProcesses[0]?.role || "QC";
                              handleSaveModuleTarget(partKey, parseInt(editingTargetValue, 10) || 0);
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <input
                              type="number"
                              value={editingTargetValue}
                              onChange={(e) => setEditingTargetValue(e.target.value)}
                              className="bg-slate-900 border border-blue-500/80 rounded px-1.5 py-0.5 text-xs text-white font-bold w-16 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="p-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded hover:bg-emerald-500/30"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingModulePart(null)}
                              className="p-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded hover:bg-rose-500/30"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-1 group/target">
                            <span className="text-blue-400 font-extrabold">
                              {activeFinishProcesses[0]?.dailyTarget || apiData[0]?.TARGET_PRD || 0} Pcs
                            </span>
                            <button
                              onClick={() => {
                                setEditingModulePart("FINISH");
                                setEditingTargetValue(String(activeFinishProcesses[0]?.dailyTarget || apiData[0]?.TARGET_PRD || 0));
                              }}
                              className="p-1 text-slate-400 hover:text-blue-400 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded transition-colors"
                              title="Edit Target"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-bold">
                        {activeFinishProcesses.length} ops Active
                      </span>
                      {/* Group by Process Toggle */}
                      <button
                        onClick={() => setGroupByProcess((v) => !v)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          groupByProcess
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25"
                            : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800"
                        }`}
                        title={groupByProcess ? "Click to show per-operator rows" : "Click to group rows by process"}
                      >
                        {groupByProcess ? (
                          <><span className="text-[10px]">📋</span> Grouped</>
                        ) : (
                          <><span className="text-[10px]">📋</span> Per Operator</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-500 font-bold border-b border-slate-800/60 pb-2">
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">No</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">NIK</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Operator</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Main Process</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Module</th>
                           <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Type</th>
                          <th colSpan={2} className="py-1 text-center sticky top-0 bg-[#0c1222] z-10 min-w-[120px] px-0">
                            <div className="border-b border-slate-700/60 pb-1 mb-1">UPH</div>
                            <div className="flex">
                              <div className="flex-1 text-[10px]">Target</div>
                              <div className="flex-1 text-[10px]">Actual</div>
                            </div>
                          </th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Output</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Output (All-Time)</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Missing Output</th>
                          {/* <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Stock</th> */}
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">
                            {groupByProcess ? (
                              <span className="text-blue-400">Stock (Grouped)</span>
                            ) : "Stock (All-Time)"}
                          </th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Stock Days</th>
                          <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Work Hours</th>
                          <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>{dateD2Str}</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th>
                          <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>{dateD1Str}</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th>
                          {/* <th className="py-2.5 text-center w-20 whitespace-normal leading-tight sticky top-0 bg-[#0c1222] z-10">
                            <div>Today</div>
                            <div className="text-[9px] text-slate-500 font-medium mt-0.5">(AVG)</div>
                          </th> */}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {activeFinishProcesses.length === 0 ? (
                          <tr>
                            <td colSpan={15} className="py-8 text-center text-slate-500 font-semibold">
                              No processes found for this module.
                            </td>
                          </tr>
                        ) : groupByProcess ? (
                          finishGroupedRows.map((p, idx) => {
                            const isGrp = !!(p._isGroupedRow && p._groupedOperators && p._groupedOperators.length > 1);
                            const ops = p._groupedOperators ?? [p];
                            return (
                            <tr key={`grp-fin-${idx}`} className={`transition-colors relative ${ isGrp ? "bg-blue-500/5 hover:bg-blue-500/10" : "hover:bg-slate-800/20" }`}>
                              <td className="py-3.5 text-center font-semibold text-slate-500">{idx + 1}</td>
                              <td className="py-3.5 text-center font-semibold text-slate-400 text-[10px]">
                                {isGrp ? <span className="flex flex-col gap-0.5 items-center">{ops.map((op) => <span key={op.nik}>{op.nik}</span>)}</span> : (p.nik || "-")}
                              </td>
                              <td className="py-3.5 text-slate-400 text-left">
                                {isGrp ? <div className="flex flex-col gap-0.5">{ops.map((op) => <span key={op.nik} onClick={() => setSelectedOperator({ worker: op.worker, processName: op.name, nik: op.nik })} className="text-blue-400 font-semibold cursor-pointer hover:underline text-[10px]">{op.worker}</span>)}</div> : <span onClick={() => setSelectedOperator({ worker: p.worker, processName: p.name, nik: p.nik })} className="text-blue-400 font-semibold cursor-pointer hover:underline">{p.worker}</span>}
                              </td>
                              <td className="py-3.5 text-slate-400 text-left font-semibold text-[10px]">
                                {isGrp ? (
                                  <div className="flex flex-col gap-0.5">
                                    {ops.map((op) => {
                                      const text = op.mainProcess || "-";
                                      return (
                                        <span
                                          key={op.nik}
                                          className="text-amber-300 font-medium truncate max-w-[180px] inline-block cursor-help hover:text-amber-200 transition-colors"
                                          title={text}
                                        >
                                          {text}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span
                                    className="text-amber-300 font-medium truncate max-w-[180px] inline-block cursor-help hover:text-amber-200 transition-colors"
                                    title={p.mainProcess || "-"}
                                  >
                                    {p.mainProcess || "-"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-center text-slate-300">{p.role}</td>
                              <td className="py-3.5 text-center">{renderOperatorTypeBadge(p.operatorType)}</td>
                              <td className="py-3.5 text-center">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-slate-200 font-bold">{ops.reduce((sum, op) => sum + (op.uphTarget ?? 0), 0)}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => op.uphTarget).join(" + ")}</span>
                                  </div>
                                ) : (
                                  p.uphTarget
                                )}
                              </td>
                              <td className="py-3.5 text-center border-l border-slate-800/30">
                                {isGrp ? (
                                  (() => {
                                    const totalActual = ops.reduce((sum, op) => sum + (op.uphActual ?? 0), 0);
                                    const totalTarget = ops.reduce((sum, op) => sum + (op.uphTarget ?? 0), 0);
                                    const color = totalTarget > 0 ? (totalActual / totalTarget < 0.9 ? "text-rose-500" : totalActual / totalTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white";
                                    return (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`font-bold ${color}`}>{Math.round(totalActual)}</span>
                                        <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => Math.round(op.uphActual)).join(" + ")}</span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className={`font-bold ${p.uphTarget > 0 ? (p.uphActual / p.uphTarget < 0.9 ? "text-rose-500" : p.uphActual / p.uphTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white"}`}>{p.uphActual}</span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-200">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-slate-200">{ops.reduce((sum, op) => sum + (op.cumulative ?? 0), 0).toLocaleString()}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => op.cumulative.toLocaleString()).join(" + ")}</span>
                                  </div>
                                ) : p.cumulative.toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center font-extrabold">
                                {isGrp ? <div className="flex flex-col items-center gap-0.5"><span className="text-emerald-400">{(p._groupedOutput ?? 0).toLocaleString()}</span><span className="text-[9px] text-slate-500">{ops.map(op => op.totalOutputAlltime?.toLocaleString()).join(" + ")}</span></div> : <span className="text-slate-400">{(p.totalOutputAlltime ?? 0).toLocaleString()}</span>}
                              </td>
                              <td className="py-3.5 text-center text-slate-400">
                                {isGrp ? <span className="flex flex-col gap-0.5 text-[10px] items-center">{ops.map((op) => <span key={op.nik}>{(op.missingOutput ?? 0).toLocaleString()}</span>)}</span> : (p.missingOutput ?? 0).toLocaleString()}
                              </td>
                              {/* Stock All-Time: In grouped mode show STOCK_GROUPED from server; in per-op mode show STOCK_OP */}
                              <td className="py-3.5 text-center font-extrabold">
                                {(() => {
                                  const calcStock = groupByProcess
                                    ? Number(p._groupedStock ?? p.stockGrouped ?? p.totalStockAlltime ?? 0)
                                    : Number(p.totalStockAlltime ?? 0);
                                  return renderStockBadgeWithSource(p, calcStock, groupByProcess, dbProcesses, setActiveStockDetail);
                                })()}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">
                                {(() => {
                                  const calcStock = groupByProcess
                                    ? Number(p._groupedStock ?? p.stockGrouped ?? p.totalStockAlltime ?? 0)
                                    : Number(p.totalStockAlltime ?? 0);
                                  return getGroupStockDays(calcStock, ops, false);
                                })()}
                              </td>
                              <td className="py-3.5 text-center">
                                {isGrp ? (
                                  <span className="flex flex-col gap-0.5 text-[10px] items-center">
                                    {ops.map(op => <span key={op.nik}>{op.workingHours ?? 11}h</span>)}
                                  </span>
                                ) : editingWorkHoursNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input type="number" value={tempWorkHours} onChange={(e) => setTempWorkHours(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveInlineWorkHours(p.nik); if (e.key === "Escape") { setEditingWorkHoursNik(null); setTempWorkHours(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} step={0.5} />
                                    <button onClick={() => handleSaveInlineWorkHours(p.nik)} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEditingWorkHoursNik(null); setTempWorkHours(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span onClick={() => { setEditingWorkHoursNik(p.nik || ""); setTempWorkHours(String(p.workingHours ?? 11)); }} className="cursor-pointer hover:text-cyan-400 font-bold flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500" />
                                    {p.workingHours ?? 11}h
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[0]?.value ?? 0}</td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[1]?.value ?? 0}</td>
                            </tr>
                            );
                          })
                        ) : (
                          activeFinishProcesses.map((p, idx) => {
                            const group = finishSharedGroups.get(idx);
                            const rowBg = group?.rowBg || "hover:bg-slate-800/20";
                            const borderTop = group?.borderTop || "";
                            const borderBottom = group?.borderBottom || "";
                            const rowId = p.nik ? `row-finish-${p.nik.replace(/[^a-zA-Z0-9]/g, '-')}` : undefined;
                            return (
                            <tr id={rowId} key={`${p.nik}-${p.name}-${idx}`} className={`transition-colors ${rowBg} ${borderTop} ${borderBottom} relative`}>
                               <td
                                className="py-3.5 text-center font-semibold text-slate-500 relative pl-2"
                              >
                                {renderSharedGroupLine(group)}
                                {idx + 1}
                              </td>
                              <td className="py-3.5 text-center font-semibold text-slate-400">{p.nik || "-"}</td>
                              <td className="py-3.5 text-slate-400 text-left">
                                <span
                                  onClick={() => setSelectedOperator({ worker: p.worker, processName: p.name, nik: p.nik })}
                                  className="text-blue-400 font-semibold cursor-pointer hover:underline"
                                >
                                  {p.worker}
                                </span>
                              </td>
                              <td className="py-3.5 text-slate-400 text-left font-semibold text-[10px]">
                                <span
                                  className="text-amber-300 font-medium truncate max-w-[180px] inline-block cursor-help hover:text-amber-200 transition-colors"
                                  title={p.mainProcess || "-"}
                                >
                                  {p.mainProcess || "-"}
                                </span>
                              </td>
                              <td className="py-3.5 text-center text-slate-300">{p.role}</td>
                              <td className="py-3.5 text-center">{renderOperatorTypeBadge(p.operatorType)}</td>
                              <td className="py-3.5 text-center">
                                {editingUphNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      value={tempUphTarget}
                                      onChange={(e) => setTempUphTarget(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveUph(p.nik || "");
                                        if (e.key === "Escape") setEditingUphNik(null);
                                      }}
                                      className="w-12 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveUph(p.nik || "")}
                                      className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingUphNik(null)}
                                      className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    <span
                                      onClick={() => {
                                        setEditingUphNik(p.nik || "");
                                        setTempUphTarget(String(p.uphTarget));
                                      }}
                                      className="group flex items-center justify-center gap-1 text-slate-300 hover:text-blue-400 transition-colors duration-200 cursor-pointer font-bold"
                                      title="Click to edit Target UPH"
                                    >
                                      <Edit2 className="w-2.5 h-2.5 text-slate-500 opacity-40 group-hover:opacity-100 group-hover:text-blue-400 transition-all duration-200" />
                                      <span>{p.uphTarget}</span>
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 text-center border-l border-slate-800/30">
                                <span className={`font-bold ${p.uphTarget > 0 ? (p.uphActual / p.uphTarget < 0.9 ? "text-rose-500" : p.uphActual / p.uphTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white"}`}>
                                  {p.uphActual}
                                </span>
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-200">
                                {p.cumulative.toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-400">
                                {(p.totalOutputAlltime ?? 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center">
                                {editingMissingNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input
                                      type="number"
                                      value={tempMissingQty}
                                      onChange={(e) => setTempMissingQty(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10));
                                        if (e.key === "Escape") setEditingMissingNik(null);
                                      }}
                                      className="w-16 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10))}
                                      className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingMissingNik(null)}
                                      className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center">
                                    <span
                                      onClick={() => {
                                        setEditingMissingNik(p.nik || "");
                                        setTempMissingQty(String(p.missingOutput || ""));
                                      }}
                                      className="group flex items-center justify-center gap-1 text-slate-300 hover:text-blue-400 transition-colors duration-200 cursor-pointer font-bold"
                                      title="Click to add/edit missing output"
                                    >
                                      {p.missingOutput ? (
                                        <span className="text-blue-400">{p.missingOutput.toLocaleString()}</span>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100 group-hover:text-blue-400 transition-all duration-200" />
                                          <span className="text-[10px] text-slate-500 group-hover:text-blue-400 opacity-60 group-hover:opacity-100">Add</span>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </td>
                              {/* <td className="py-3.5 text-center">
                                <span className={`font-extrabold px-2 py-0.5 rounded ${p.wip > 100 ? "bg-rose-500/10 text-rose-400" : "text-blue-400"}`}>
                                  {p.wip}
                                </span>
                              </td> */}
                              <td className="py-3.5 text-center">
                                {renderStockBadgeWithSource(p, undefined, false, dbProcesses, setActiveStockDetail)}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">
                                {getOperatorStockDays(p)}
                              </td>
                              <td className="py-3.5 text-center">
                                {editingWorkHoursNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input type="number" value={tempWorkHours} onChange={(e) => setTempWorkHours(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveInlineWorkHours(p.nik); if (e.key === "Escape") { setEditingWorkHoursNik(null); setTempWorkHours(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} step={0.5} />
                                    <button onClick={() => handleSaveInlineWorkHours(p.nik)} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEditingWorkHoursNik(null); setTempWorkHours(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span onClick={() => { setEditingWorkHoursNik(p.nik || ""); setTempWorkHours(String(p.workingHours ?? 11)); }} className="cursor-pointer hover:text-cyan-400 font-bold flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500" />
                                    {p.workingHours ?? 11}h
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[0]?.value ?? 0}</td>
                              <td className="py-3.5 text-center font-bold text-slate-400">{p.history[1]?.value ?? 0}</td>
                              {/* <td className="py-3.5 text-center font-bold text-slate-400">{p.history[2]?.value ?? 0}</td> */}
                            </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* react-xarrows Rendering */}
          {/* Arrows removed as requested */}
        </div>
      </div>
    </Xwrapper>
      {/* Modal Detail for Sub-Line/Part */}
      {activePartModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800/85 rounded-3xl shadow-2xl max-w-[92vw] w-full overflow-hidden text-slate-200 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="bg-[#0f172a]/90 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500"></div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    {activePartModal.name} - Detailed Process Flow
                  </h3>
                  <p className="text-slate-500 text-[10px] mt-0.5">Real-time sub-modular monitoring data for LINE {lineName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Show Null CB Output Checkbox in Modal */}
                <label
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer select-none"
                  title="Show operators with 0 Output (All-Time)"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      showNullCbOutput
                        ? "bg-blue-500 border-blue-500"
                        : "bg-slate-900 border-slate-600"
                    }`}
                  >
                    {showNullCbOutput && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={showNullCbOutput}
                    onChange={(e) => setShowNullCbOutput(e.target.checked)}
                  />
                  Show Null CB Output
                </label>

                {/* Modal Group Toggle */}
                <button
                  onClick={() => setModalGroupByProcess((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    modalGroupByProcess
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25"
                      : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800"
                  }`}
                  title={modalGroupByProcess ? "Show per-operator rows" : "Group rows by process"}
                >
                  {modalGroupByProcess ? (
                    <><span>📋</span> Grouped</>
                  ) : (
                    <><span>📋</span> Per Operator</>
                  )}
                </button>
                <button 
                  onClick={() => setActivePartModal(null)}
                  className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Guidance / Stock Traceability Info Bar */}
            <div className="bg-slate-900/90 border-b border-slate-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                  <Info className="w-3 h-3 text-cyan-400" />
                </span>
                <span>
                  <strong className="text-slate-300">Stock Logic:</strong> Stock = Previous Operator Output (Predecessor) − This Operator Output. Initial module process has <strong className="text-emerald-400">Stock 0</strong>.
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Initial Module (Stock 0)</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-cyan-500/20 text-cyan-400">
                    <Info className="w-2 h-2" />
                  </span>
                  <span>Hover icon (i) for stock source details</span>
                </span>
              </div>
            </div>

            {/* Modal Content - Dark Table matching main styling */}
            <div className="p-6 overflow-y-auto bg-slate-900/10 flex-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div className="border border-slate-800/60 bg-[#0c1222] rounded-2xl px-6 pb-6 pt-0 relative max-h-[60vh] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 font-bold border-b border-slate-800/50 pb-2">
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">No</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">NIK</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Operator</th>
                      <th className="py-2.5 text-left pl-3 sticky top-0 bg-[#0c1222] z-10 min-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-amber-400" />
                          <span>Main Process</span>
                        </div>
                      </th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Module</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Type</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">UPH Target</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">UPH Actual</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Output Today</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Output (All-Time)</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Missing Output</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">
                        {groupByProcess ? (
                          <span className="text-blue-400">Stock (Grouped)</span>
                        ) : "Stock (All-Time)"}
                      </th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">Stock Days</th>
                      <th className="py-2.5 text-center sticky top-0 bg-[#0c1222] z-10">
                        <div className="flex items-center justify-center gap-1">
                          <span>Work Hours</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBulkWorkHoursModal();
                            }}
                            className="p-0.5 hover:bg-cyan-500/20 rounded text-cyan-400/70 hover:text-cyan-300 transition-colors"
                            title="Edit working hours for all operators on this line at once"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {loadingModalProcesses ? (
                      // Detailed Process Flow Modal Skeleton Loading (14 cols)
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={`sk-modal-${idx}`} className="animate-pulse">
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-8 mx-auto"></div></td>
                          <td className="py-3.5"><div className="h-4 bg-slate-800/60 rounded w-20 mx-auto"></div></td>
                          <td className="py-3.5"><div className="h-4 bg-slate-800/60 rounded w-28"></div></td>
                          <td className="py-3.5"><div className="h-4 bg-slate-800/60 rounded w-36"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-16 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-16 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-12 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-12 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-14 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-14 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-12 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-28 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-10 mx-auto"></div></td>
                          <td className="py-3.5 text-center"><div className="h-4 bg-slate-800/60 rounded w-12 mx-auto"></div></td>
                        </tr>
                      ))
                    ) : visibleModalProcesses.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-8 text-center text-slate-500 font-semibold">
                          No processes found for this module.
                        </td>
                      </tr>
                    ) : modalGroupByProcess ? (
                      // ── MODAL GROUPED VIEW ──
                      (() => {
                        const modalGrouped = getGroupedProcessRows(visibleModalProcesses);
                        return modalGrouped.map((p, idx) => {
                          const isGrp = !!(p._isGroupedRow && p._groupedOperators && p._groupedOperators.length > 1);
                          const ops = p._groupedOperators ?? [p];
                          // When grouped mode is enabled, use grouped stock for groups or operator stock for solo
                          const groupStock = modalGroupByProcess
                            ? Number(p._groupedStock ?? p.stockGrouped ?? p.totalStockAlltime ?? 0)
                            : Number(p.totalStockAlltime ?? 0);
                          return (
                            <tr
                              key={`modal-grp-${idx}`}
                              className={`transition-colors relative ${ isGrp ? "bg-blue-500/5 hover:bg-blue-500/10 border-t-2 border-t-blue-500/20" : "hover:bg-slate-800/20" }`}
                            >
                              <td className="py-3.5 text-center font-semibold text-slate-500 relative pl-2">
                                {isGrp && (<div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-amber-500/60" />)}
                                {idx + 1}
                              </td>
                              <td className="py-3.5 text-center font-semibold text-slate-400 text-[10px]">
                                {isGrp ? (<span className="flex flex-col gap-0.5 items-center">{ops.map((op) => <span key={op.nik}>{op.nik}</span>)}</span>) : (p.nik || "-")}
                              </td>
                              <td className="py-3.5 text-slate-400 text-left">
                                {isGrp ? (
                                  <div className="flex flex-col gap-0.5">
                                    {ops.map((op) => (
                                      <span key={op.nik} onClick={() => setSelectedOperator({ worker: op.worker, processName: op.name, nik: op.nik })} className="text-blue-400 font-semibold cursor-pointer hover:underline text-[10px]">{op.worker}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span onClick={() => setSelectedOperator({ worker: p.worker, processName: p.name, nik: p.nik })} className="text-blue-400 font-semibold cursor-pointer hover:underline">{p.worker}</span>
                                )}
                              </td>
                              <td className="py-3.5 text-left pl-3 font-semibold text-[11px]">
                                {isGrp ? (
                                  <div className="flex flex-col gap-1.5">
                                    {Array.from(new Set(ops.map((op) => op.mainProcess || op.name || "-"))).map((procText, i) => (
                                      <div key={i} className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                        <span
                                          className="text-amber-300 font-medium truncate max-w-[200px] inline-block hover:text-amber-200 transition-colors cursor-default"
                                          title={procText}
                                        >
                                          {procText}
                                        </span>
                                      </div>
                                    ))}
                                    <span className="text-[9px] text-amber-400/80 font-medium">
                                      👥 {ops.length} operators on this process
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                    <span
                                      className="text-amber-300 font-medium truncate max-w-[220px] inline-block hover:text-amber-200 transition-colors cursor-default"
                                      title={p.mainProcess && p.mainProcess !== "-" ? p.mainProcess : (p.name || "-")}
                                    >
                                      {p.mainProcess && p.mainProcess !== "-" ? p.mainProcess : (p.name || "-")}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 text-center text-slate-300">{p.role}</td>
                              <td className="py-3.5 text-center">{renderOperatorTypeBadge(p.operatorType)}</td>
                              <td className="py-3.5 text-center">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-slate-200 font-bold">{ops.reduce((sum, op) => sum + (op.uphTarget ?? 0), 0)}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => op.uphTarget).join(" + ")}</span>
                                  </div>
                                ) : (
                                  p.uphTarget
                                )}
                              </td>
                              <td className="py-3.5 text-center border-l border-slate-800/30">
                                {isGrp ? (
                                  (() => {
                                    const totalActual = ops.reduce((sum, op) => sum + (op.uphActual ?? 0), 0);
                                    const totalTarget = ops.reduce((sum, op) => sum + (op.uphTarget ?? 0), 0);
                                    const color = totalTarget > 0 ? (totalActual / totalTarget < 0.9 ? "text-rose-500" : totalActual / totalTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white";
                                    return (
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className={`font-bold ${color}`}>{Math.round(totalActual)}</span>
                                        <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => Math.round(op.uphActual)).join(" + ")}</span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className={`font-bold ${p.uphTarget > 0 ? (p.uphActual / p.uphTarget < 0.9 ? "text-rose-500" : p.uphActual / p.uphTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white"}`}>{Math.round(p.uphActual)}</span>
                                )}
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-200">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-slate-200">{ops.reduce((sum, op) => sum + (op.cumulative ?? 0), 0).toLocaleString()}</span>
                                    <span className="text-[9px] text-slate-500 font-normal">{ops.map((op) => op.cumulative.toLocaleString()).join(" + ")}</span>
                                  </div>
                                ) : p.cumulative.toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center font-extrabold text-slate-300">
                                {isGrp ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-emerald-400">{(p._groupedOutput ?? 0).toLocaleString()}</span>
                                    <span className="text-[9px] text-slate-500">{ops.map(op => op.totalOutputAlltime?.toLocaleString()).join(" + ")}</span>
                                  </div>
                                ) : (p.totalOutputAlltime ?? 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 text-center text-slate-400">
                                {isGrp ? (
                                  <span className="flex flex-col gap-0.5 text-[10px] items-center">{ops.map(op => <span key={op.nik}>{(op.missingOutput ?? 0).toLocaleString()}</span>)}</span>
                                ) : editingMissingNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input type="number" value={tempMissingQty} onChange={(e) => setTempMissingQty(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10)); if (e.key === "Escape") { setEditingMissingNik(null); setTempMissingQty(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none" autoFocus />
                                    <button onClick={() => handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10))} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEditingMissingNik(null); setTempMissingQty(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span onClick={() => { setEditingMissingNik(p.nik || ""); setTempMissingQty(String(p.missingOutput || "")); }} className="cursor-pointer hover:text-blue-400 font-bold">{p.missingOutput?.toLocaleString() || "-"}</span>
                                )}
                              </td>
                              <td className="py-3.5 text-center">
                                {renderStockBadgeWithSource(p, groupStock, modalGroupByProcess, dbProcesses, setActiveStockDetail)}
                              </td>
                              <td className="py-3.5 text-center font-bold text-slate-400">
                                {getGroupStockDays(groupStock, ops, false)}
                              </td>
                              <td className="py-3.5 text-center">
                                {isGrp ? (
                                  <span className="flex flex-col gap-0.5 text-[10px] items-center">
                                    {ops.map(op => <span key={op.nik}>{op.workingHours ?? 11}h</span>)}
                                  </span>
                                ) : editingWorkHoursNik === p.nik ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input type="number" value={tempWorkHours} onChange={(e) => setTempWorkHours(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveInlineWorkHours(p.nik); if (e.key === "Escape") { setEditingWorkHoursNik(null); setTempWorkHours(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} step={0.5} />
                                    <button onClick={() => handleSaveInlineWorkHours(p.nik)} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEditingWorkHoursNik(null); setTempWorkHours(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <span onClick={() => { setEditingWorkHoursNik(p.nik || ""); setTempWorkHours(String(p.workingHours ?? 11)); }} className="cursor-pointer hover:text-cyan-400 font-bold flex items-center justify-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500" />
                                    {p.workingHours ?? 11}h
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()
                    ) : (
                      // ── MODAL PER-OPERATOR VIEW ──
                      (() => {
                        const modalSharedGroups = getSharedFlowGroups(visibleModalProcesses);
                        return visibleModalProcesses.map((p, idx) => {
                          const group = modalSharedGroups.get(idx);
                          const rowBg = group?.rowBg || "hover:bg-slate-800/20";
                          const borderTop = group?.borderTop || "";
                          const borderBottom = group?.borderBottom || "";
                          return (
                          <tr key={`${p.nik}-${p.name}-${idx}`} className={`transition-colors relative ${rowBg} ${borderTop} ${borderBottom}`}>
                            <td className="py-3.5 text-center font-semibold text-slate-500 relative pl-2">
                              {renderSharedGroupLine(group)}
                              {idx + 1}
                            </td>
                            <td className="py-3.5 text-center font-semibold text-slate-400">{p.nik || "-"}</td>
                            <td className="py-3.5 text-slate-400 text-left">
                              <span onClick={() => setSelectedOperator({ worker: p.worker, processName: p.name, nik: p.nik })} className="text-blue-400 font-semibold cursor-pointer hover:underline">{p.worker}</span>
                            </td>
                            <td className="py-3.5 text-left pl-3 font-semibold text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                                <span
                                  className="text-amber-300 font-medium truncate max-w-[220px] inline-block hover:text-amber-200 transition-colors cursor-default"
                                  title={p.mainProcess && p.mainProcess !== "-" ? p.mainProcess : (p.name || "-")}
                                >
                                  {p.mainProcess && p.mainProcess !== "-" ? p.mainProcess : (p.name || "-")}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 text-center text-slate-300">{p.role}</td>
                            <td className="py-3.5 text-center">{renderOperatorTypeBadge(p.operatorType)}</td>
                            <td className="py-3.5 text-center">
                              {editingUphNik === p.nik ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <input type="number" value={tempUphTarget} onChange={(e) => setTempUphTarget(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveUph(p.nik || ""); if (e.key === "Escape") setEditingUphNik(null); }} className="w-16 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} />
                                  <button onClick={() => handleSaveUph(p.nik || "")} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setEditingUphNik(null)} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <span onClick={() => { setEditingUphNik(p.nik || ""); setTempUphTarget(String(Math.round(p.uphTarget))); }} className="cursor-pointer hover:text-blue-400 font-bold">{Math.round(p.uphTarget)}</span>
                              )}
                            </td>
                            <td className="py-3.5 text-center border-l border-slate-800/30">
                              <span className={`font-bold ${p.uphTarget > 0 ? (p.uphActual / p.uphTarget < 0.9 ? "text-rose-500" : p.uphActual / p.uphTarget <= 1.2 ? "text-white" : "text-emerald-500") : "text-white"}`}>{Math.round(p.uphActual)}</span>
                            </td>
                            <td className="py-3.5 text-center font-extrabold text-slate-200">{p.cumulative.toLocaleString()}</td>
                            <td className="py-3.5 text-center font-extrabold text-slate-300">{(p.totalOutputAlltime ?? 0).toLocaleString()}</td>
                            <td className="py-3.5 text-center">
                              {editingMissingNik === p.nik ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <input type="number" value={tempMissingQty} onChange={(e) => setTempMissingQty(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10)); if (e.key === "Escape") { setEditingMissingNik(null); setTempMissingQty(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none" autoFocus />
                                  <button onClick={() => handleSaveMissingOutput(p.nik || "", parseInt(tempMissingQty, 10))} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { setEditingMissingNik(null); setTempMissingQty(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <span onClick={() => { setEditingMissingNik(p.nik || ""); setTempMissingQty(String(p.missingOutput || "")); }} className="cursor-pointer hover:text-blue-400 font-bold">{p.missingOutput?.toLocaleString() || "-"}</span>
                              )}
                            </td>
                            <td className="py-3.5 text-center">
                              {renderStockBadgeWithSource(p, undefined, false, dbProcesses, setActiveStockDetail)}
                            </td>
                            <td className="py-3.5 text-center font-bold text-slate-400">
                              {getOperatorStockDays(p)}
                            </td>
                            <td className="py-3.5 text-center">
                              {editingWorkHoursNik === p.nik ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <input type="number" value={tempWorkHours} onChange={(e) => setTempWorkHours(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSaveInlineWorkHours(p.nik); if (e.key === "Escape") { setEditingWorkHoursNik(null); setTempWorkHours(""); } }} className="w-16 px-1 py-0.5 bg-slate-900 border border-cyan-500 rounded text-center text-xs text-white focus:outline-none" autoFocus min={0} step={0.5} />
                                  <button onClick={() => handleSaveInlineWorkHours(p.nik)} className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => { setEditingWorkHoursNik(null); setTempWorkHours(""); }} className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <span onClick={() => { setEditingWorkHoursNik(p.nik || ""); setTempWorkHours(String(p.workingHours ?? 11)); }} className="cursor-pointer hover:text-cyan-400 font-bold flex items-center justify-center gap-1">
                                  <Clock className="w-3 h-3 text-cyan-500" />
                                  {p.workingHours ?? 11}h
                                </span>
                              )}
                            </td>
                          </tr>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>



          </div>
        </div>
      )}
      {/* Interactive Stock Source & Flow Detail Modal */}
      {activeStockDetail && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[10002] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveStockDetail(null)}
        >
          <div 
            className="bg-[#0b0f19] border border-slate-800/90 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0f172a]/95 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                    Stock Flow & Source Details
                    {activeStockDetail.isGrouped && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                        Grouped Mode
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Relationship between stock provider and receiver processes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveStockDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {activeStockDetail.isInitialProcess ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> Final / Initial Process (Stock = {activeStockDetail.stockVal.toLocaleString()} pcs)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Process / Operator <strong className="text-white">{activeStockDetail.providerName}</strong> with flow <code className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs">{activeStockDetail.providerFlow}</code> on module <strong className="text-white">{activeStockDetail.providerModule}</strong> has no downstream target process in this line.
                  </p>
                </div>
              ) : (
                <>
                  {/* Flow Cards: Provider -> Receiver */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                    {/* Card 1: Provider / Current Op */}
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {activeStockDetail.isGrouped ? "Current Process (Stock Provider)" : "Current Operator (Stock Provider)"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            Module: <strong className="text-slate-200">{activeStockDetail.providerModule}</strong>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">
                          {activeStockDetail.providerName}
                        </h4>
                        {activeStockDetail.providerNik && (
                          <p className="text-[11px] font-mono text-slate-500 mb-2">
                            NIK: {activeStockDetail.providerNik}
                          </p>
                        )}
                        <div className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          <span>Flow:</span>
                          <strong className="font-bold">{activeStockDetail.providerFlow}</strong>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Total Output:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {activeStockDetail.providerOutput != null ? activeStockDetail.providerOutput.toLocaleString() : "?"} pcs
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Receiver / Target Downstream */}
                    <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            {activeStockDetail.isGrouped ? "Target Downstream Group (Stock Receiver)" : "Target Downstream Operator (Stock Receiver)"}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            Module: <strong className="text-slate-200">{activeStockDetail.receiverModule}</strong>
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">
                          {activeStockDetail.receiverName}
                        </h4>
                        {activeStockDetail.receiverNik && (
                          <p className="text-[11px] font-mono text-slate-500 mb-2">
                            NIK: {activeStockDetail.receiverNik}
                          </p>
                        )}
                        <div className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          <span>Flow:</span>
                          <strong className="font-bold">{activeStockDetail.receiverFlow}</strong>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Total Output:</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {activeStockDetail.receiverOutput.toLocaleString()} pcs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Narrative Banner */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                    <Activity className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Downstream {activeStockDetail.isGrouped ? "group process" : "operator"} <strong className="text-white">{activeStockDetail.receiverName}</strong> with flow <code className="px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[11px]">{activeStockDetail.receiverFlow}</code> (Module: <strong className="text-white">{activeStockDetail.receiverModule}</strong>) receives stock supply from <strong className="text-white">{activeStockDetail.providerName}</strong> (Module: <strong className="text-white">{activeStockDetail.providerModule}</strong>) with flow <code className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px]">{activeStockDetail.providerFlow}</code>.
                    </p>
                  </div>

                  {/* Calculation Breakdown Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-900/50 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        {activeStockDetail.isGrouped ? "Stock Calculation Formula (Grouped Mode):" : "Stock Calculation Formula (Yongjin 2-2):"}
                      </span>
                      <p className="font-mono text-xs text-slate-300">
                        Output [{activeStockDetail.providerName}] ({activeStockDetail.providerOutput != null ? activeStockDetail.providerOutput.toLocaleString() : "?"}) 
                        {" − "}
                        Output [{activeStockDetail.receiverName}] ({activeStockDetail.receiverOutput != null ? activeStockDetail.receiverOutput.toLocaleString() : "?"})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-xs text-slate-400">Stock Result:</span>
                      <span className={`font-mono font-extrabold text-sm px-3.5 py-1 rounded-full border shadow-sm ${
                        activeStockDetail.stockVal < 0
                          ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          : activeStockDetail.stockVal > 200
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                          : activeStockDetail.stockVal === 0
                          ? "bg-slate-800/80 text-slate-400 border-slate-700/50"
                          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      }`}>
                        {activeStockDetail.stockVal.toLocaleString()} pcs
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#0f172a]/90 border-t border-slate-800/80 px-6 py-3 flex items-center justify-end">
              <button
                onClick={() => setActiveStockDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operator Production History Modal */}
      {selectedOperator && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800/85 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-200 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="bg-[#0f172a]/90 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  {selectedOperator.worker} Production History
                </h3>
              </div>
              <button 
                onClick={() => setSelectedOperator(null)}
                className="p-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto bg-slate-900/10 flex flex-col gap-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned Process</div>
                  <div className="text-sm font-extrabold text-white mt-1.5 whitespace-pre-line leading-relaxed">
                    {selectedOperator.processName.split(/(?=\b\d+\.)/).map((line, idx) => (
                      <div key={idx}>{line.trim()}</div>
                    ))}
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily Target</div>
                  <div className="text-sm font-extrabold text-blue-400 mt-1.5">{(() => {
                    const process = modalProcesses.find(
                      (p) => p.worker === selectedOperator.worker && p.name === selectedOperator.processName
                    ) || dbProcesses.find(
                      (p) => p.worker === selectedOperator.worker && p.name === selectedOperator.processName
                    );
                    return process?.dailyTarget || (process?.uphTarget ?? 50) * 11;
                  })()} Pcs</div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Output (All-Time)</div>
                  <div className="text-sm font-extrabold text-emerald-400 mt-1.5">
                    {operatorAlltimeOutput.toLocaleString()} Pcs
                  </div>
                </div>
              </div>

              {/* History Table */}
              <div className="border border-slate-800/60 bg-slate-900/10 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800/80 text-slate-400 font-bold">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Target</th>
                      <th className="py-3 px-4 text-center">Actual</th>
                      <th className="py-3 px-4 text-center">Rate</th>
                      <th className="py-3 px-4">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 font-semibold">
                          Loading production history...
                        </td>
                      </tr>
                    ) : operatorHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 font-semibold">
                          No production history found for this period.
                        </td>
                      </tr>
                    ) : (
                      operatorHistory.map((row, idx) => {
                        const process = modalProcesses.find(
                          (p) => p.worker === selectedOperator.worker && p.name === selectedOperator.processName
                        ) || dbProcesses.find(
                          (p) => p.worker === selectedOperator.worker && p.name === selectedOperator.processName
                        );
                        const targetVal = process?.dailyTarget || (process?.uphTarget ?? 50) * 11;
                        const actualVal = Number(row.ACTUAL ?? 0);
                        const rate = targetVal > 0 ? Math.round((actualVal / targetVal) * 100) : 0;
                        const isSuccess = rate >= 100;
                        
                        let displayDate = row.WORK_DATE;
                        try {
                          displayDate = format(parseISO(row.WORK_DATE), "dd MMM (eee)");
                        } catch {
                          // fallback
                        }

                        return (
                          <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-300">{displayDate}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-500">{targetVal}</td>
                            <td className="py-3.5 px-4 text-center font-extrabold text-blue-400">{actualVal}</td>
                            <td className={`py-3.5 px-4 text-center font-black ${isSuccess ? "text-emerald-400" : "text-rose-400"}`}>
                              {rate}%
                            </td>
                            <td className="py-3.5 px-4 w-40">
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${Math.min(100, rate)}%` }}
                                  className={`h-full rounded-full ${isSuccess ? "bg-emerald-500" : "bg-rose-500"}`}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-[#0f172a]/95 border-t border-slate-800/80 px-6 py-4 flex justify-end">

            </div>

          </div>
        </div>
      )}

      {/* Working Hours Edit Modal */}
      {isWorkHoursModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {selectedOpForWorkHours ? selectedOpForWorkHours.name : "Operator Working Hours"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {selectedOpForWorkHours?.nik ? `NIK: ${selectedOpForWorkHours.nik} • ` : ""}Line {lineName} • {format(baseDate, "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsWorkHoursModalOpen(false);
                    setSelectedOpForWorkHours(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-5 space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Current Mode:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                      (selectedOpForWorkHours ? selectedOpForWorkHours.isManual : isManualWorkHours)
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      {(selectedOpForWorkHours ? selectedOpForWorkHours.isManual : isManualWorkHours) ? "Manual Override" : "Automatic (Schedule)"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Active Total Hours:</span>
                    <span className="font-extrabold text-white">
                      {selectedOpForWorkHours ? selectedOpForWorkHours.currentHours : activeWorkingHours} Hours
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Set Working Hours (Hours / Day)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={tempWorkingHours}
                    onChange={(e) => setTempWorkingHours(e.target.value)}
                    placeholder="e.g. 8.0 or 10.0"
                    className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    This working hours value applies specifically to this operator for {format(baseDate, "dd MMM yyyy")}.
                  </p>
                </div>

                {/* Quick presets */}
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold mb-1.5 block">Quick Presets:</span>
                  <div className="flex gap-2">
                    {[7, 8, 9, 10, 11].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setTempWorkingHours(String(hrs))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          Number(tempWorkingHours) === hrs
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                            : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {hrs}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
                {(selectedOpForWorkHours ? selectedOpForWorkHours.isManual : isManualWorkHours) ? (
                  <button
                    type="button"
                    disabled={isSavingWorkHours}
                    onClick={() => handleSaveWorkHours(0)}
                    className="px-3 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Auto</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkHoursModalOpen(false);
                      setSelectedOpForWorkHours(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingWorkHours || !tempWorkingHours || Number(tempWorkingHours) <= 0}
                    onClick={() => handleSaveWorkHours(Number(tempWorkingHours))}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingWorkHours ? "Saving..." : "Save Manual Hours"}</span>
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Work Hours Modal (All Operators) */}
      {isBulkWorkHoursModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-inner">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    Bulk Edit Operator Work Hours
                  </h3>
                  <p className="text-xs text-slate-400">
                    Line {lineName} • Style {activeStyle || "-"} • {format(baseDate, "dd MMM yyyy")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkWorkHoursModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              {/* Summary card */}
              <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs space-y-2.5">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    Total Operators in Line:
                  </span>
                  <span className="font-extrabold text-white bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded text-xs">
                    {allOpData.length > 0 ? allOpData.length : dbProcesses.length} Operators
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span className="font-medium">Current Active Hours:</span>
                  <span className="font-extrabold text-cyan-400">
                    {activeWorkingHours} Hours / Day
                  </span>
                </div>
                <div className="text-[11px] text-cyan-200/90 bg-cyan-950/40 border border-cyan-500/20 rounded-lg p-2.5 leading-relaxed">
                  💡 <strong>Info:</strong> The working hours value entered will be directly applied to <strong>all operators on Line {lineName}</strong> for the date {format(baseDate, "dd MMM yyyy")}.
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Set Working Hours for All Operators (Hours / Day)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={bulkWorkingHours}
                  onChange={(e) => setBulkWorkingHours(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && bulkWorkingHours && Number(bulkWorkingHours) > 0) {
                      handleSaveBulkWorkHours(Number(bulkWorkingHours));
                    }
                    if (e.key === "Escape") {
                      setIsBulkWorkHoursModalOpen(false);
                    }
                  }}
                  placeholder="e.g. 12.0 or 9.0"
                  className="w-full bg-slate-900/90 border border-cyan-500/50 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-white font-black text-base focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all placeholder:text-slate-600"
                  autoFocus
                />
              </div>

              {/* Quick presets */}
              <div>
                <span className="text-[11px] text-slate-400 font-semibold mb-1.5 block">Quick Presets:</span>
                <div className="grid grid-cols-6 gap-2">
                  {[7, 8, 9, 10, 11, 12].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setBulkWorkingHours(String(hrs))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        Number(bulkWorkingHours) === hrs
                          ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/20"
                          : "bg-slate-800/60 text-slate-400 border-slate-700/50 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {hrs}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
              <button
                type="button"
                disabled={isSavingBulkWorkHours}
                onClick={() => handleSaveBulkWorkHours(0)}
                className="px-3 py-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                title="Remove manual override for all operators and return to automatic schedule"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All to Auto</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkWorkHoursModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingBulkWorkHours || !bulkWorkingHours || Number(bulkWorkingHours) <= 0}
                  onClick={() => handleSaveBulkWorkHours(Number(bulkWorkingHours))}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingBulkWorkHours ? "Applying..." : "Apply to All Operators"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Multi-Line Export Modal */}
      {isCustomExportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Export Custom Lines (JOIN &amp; ASSEMBLY)</h3>
                  <p className="text-[11px] text-slate-400">
                    Each line will be exported to a separate sheet named <span className="text-emerald-300 font-semibold">{`{line}-{style}`}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isExportingExcel}
                onClick={() => setIsCustomExportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-slate-950/40">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search line or style..."
                  value={customExportSearch}
                  onChange={(e) => setCustomExportSearch(e.target.value)}
                  disabled={isExportingExcel}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/60 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg">
                  {selectedExportLineKeys.length} / {customExportLineOptions.length} selected
                </span>
                <button
                  type="button"
                  disabled={isExportingExcel || filteredCustomExportOptions.length === 0}
                  onClick={() =>
                    setSelectedExportLineKeys((prev) =>
                      Array.from(new Set([...prev, ...filteredCustomExportOptions.map((o) => o.key)]))
                    )
                  }
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40"
                >
                  Select All
                </button>
                <button
                  type="button"
                  disabled={isExportingExcel || selectedExportLineKeys.length === 0}
                  onClick={() => setSelectedExportLineKeys([])}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {filteredCustomExportOptions.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No lines match your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredCustomExportOptions.map((opt) => {
                    const checked = selectedExportLineKeys.includes(opt.key);
                    const isCurrent = opt.key === `${lineCode}||${activeStyle}`;
                    const cleanLine = opt.lineName.replace(/^Line\s*/i, "").trim() || opt.lineName;
                    return (
                      <label
                        key={opt.key}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${
                          checked
                            ? "bg-emerald-500/10 border-emerald-500/50 text-white"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300"
                        } ${isExportingExcel ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleExportLine(opt.key)}
                          className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 bg-slate-800"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold truncate">{opt.lineName}</span>
                            {isCurrent && (
                              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {opt.styleNo} <span className="text-slate-600">• Sheet: {cleanLine}-{opt.styleNo}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {customExportProgress && (
              <div className="px-5 py-2.5 bg-slate-900/80 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold mb-1.5">
                  <span>Fetching data &amp; building workbook...</span>
                  <span>
                    {customExportProgress.done} / {customExportProgress.total} lines
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{
                      width: `${Math.round(
                        (customExportProgress.done / Math.max(1, customExportProgress.total)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="px-5 py-3.5 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-900/60">
              <button
                type="button"
                disabled={isExportingExcel}
                onClick={() => setIsCustomExportModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExportingExcel || selectedExportLineKeys.length === 0}
                onClick={handleExportCustomLinesExcel}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>
                  {isExportingExcel
                    ? "Exporting..."
                    : `Export Excel (${selectedExportLineKeys.length} Line)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineDetails;
