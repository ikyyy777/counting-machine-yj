import React, { useMemo, useState, useDeferredValue, useRef } from "react";
import { Search, RefreshCcw, AlertCircle, FileSpreadsheet, Filter, GitFork, Clock, RotateCcw, Check, X, User, Users } from "lucide-react";
import { format as formatDt, parseISO } from "date-fns";
import StockOperatorHeader from "../components/StockOperator/Header";
import { CBSewingOutputTable } from "../components/CBSewingOutput/CBSewingOutputTable";
import { DashboardFilters } from "../types/dashboard";
import { fetchCBSewingOutput } from "../services/cbSewingOutput";
import { saveWorkingHoursOverride } from "../services/stockOperator";
import { saveMissingOutput } from "../services/integratedLineMonitoring";
import { getAuthToken } from "../services/api";
import { CBSewingOutputRow, CBSewingOutputMeta } from "../types/cbSewingOutput";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CBSewingOutput: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    date: new Date(),
    factory: "",
    line: "",
    style: "",
    period: "",
    startTime: "06:00",
    endTime: "21:00",
  });

  const [actualLineName, setActualLineName] = useState<string>("");
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState<boolean>(true);
  const [showFlowArrows, setShowFlowArrows] = useState<boolean>(true);

  // Grouping Mode: Grouped (default) vs Per Operator
  const [groupMode, setGroupMode] = useState<"grouped" | "operator">("grouped");
  const [viewMode, setViewMode] = useState<"merged" | "original">("merged");

  // State Data Kalender Harian (CBC_GET_ALL_OP_SEWING_OUTPUT_DATA)
  const [data, setData] = useState<CBSewingOutputRow[]>([]);
  const [meta, setMeta] = useState<CBSewingOutputMeta | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Map of normalized NIK -> { qty: number, timestamp: number } to protect optimistic updates
  // from being overwritten by stale/cached responses from remote IIS server
  const pendingMissingOutputsRef = useRef<Map<string, { qty: number; timestamp: number }>>(new Map());

  // Edit Work Hours Modal State (Date-targeted per operator or group)
  const [selectedOpForWorkHours, setSelectedOpForWorkHours] = useState<{
    op: CBSewingOutputRow;
    dateStr: string;
    currentWh: number;
    groupedOps?: CBSewingOutputRow[];
  } | null>(null);
  const [activeTargetOpForWh, setActiveTargetOpForWh] = useState<CBSewingOutputRow | null>(null);
  const [tempWorkingHours, setTempWorkingHours] = useState<string>("");
  const [isSavingWorkHours, setIsSavingWorkHours] = useState<boolean>(false);

  const handleLookup = async (isManual = true) => {
    if (!filters.line) {
      if (isManual) setErrorMessage("Please select a Line first");
      return;
    }

    if (isManual) {
      setLoading(true);
      setErrorMessage("");
    }

    try {
      const workDateStr = formatDt(filters.date, "yyyy-MM-dd");
      const res = await fetchCBSewingOutput({
        factory: filters.factory,
        lineNo: filters.line,
        styleNo: filters.style || "",
        workDate: workDateStr,
        filterModule: filterModule,
        noCache: true,
      });

      const now = Date.now();
      const rawRows = res.data || [];
      const keysToDelete = new Set<string>();
      const mergedData = rawRows.map((row) => {
        const rowNik = String(row.NIK || "").trim().toUpperCase();
        const rowMerged = String(row.MERGED_EMP_NIK || "").trim().toUpperCase();
        const pendingKey = pendingMissingOutputsRef.current.has(rowNik)
          ? rowNik
          : Array.from(pendingMissingOutputsRef.current.keys()).find((k) => rowMerged.includes(k));

        if (pendingKey) {
          const pending = pendingMissingOutputsRef.current.get(pendingKey)!;
          // Discard if older than 60 seconds
          if (now - pending.timestamp > 60000) {
            keysToDelete.add(pendingKey);
            return row;
          }

          const serverMissing = Number(row.MISSING_OUTPUT ?? 0);
          if (serverMissing === pending.qty) {
            // Server has officially caught up!
            keysToDelete.add(pendingKey);
            return row;
          } else {
            // Server returned cached or stale data. Override with pending value!
            const diff = pending.qty - serverMissing;
            return {
              ...row,
              MISSING_OUTPUT: pending.qty,
              TOTAL_OUTPUT: Number(row.TOTAL_OUTPUT || 0) + diff,
              BALANCE: Number(row.BALANCE || 0) + diff,
            };
          }
        }
        return row;
      });

      keysToDelete.forEach((k) => pendingMissingOutputsRef.current.delete(k));

      setData(mergedData);
      setMeta(res.meta);

      if (isManual) {
        toast.success(`Daily calendar data successfully loaded (${mergedData.length} records)`);
      }
    } catch (err: any) {
      console.error("Error fetching CB sewing output:", err);
      const msg = err?.message || "Failed to load sewing output data. Please try again.";
      if (isManual) {
        setErrorMessage(msg);
        toast.error(msg);
        setData([]);
        setMeta(null);
      }
    } finally {
      if (isManual) {
        setLoading(false);
      }
    }
  };

  const handleOpenEditWorkHours = (
    op: CBSewingOutputRow,
    dateStr: string,
    currentWh: number,
    groupedOps?: CBSewingOutputRow[]
  ) => {
    setSelectedOpForWorkHours({ op, dateStr, currentWh, groupedOps });
    setActiveTargetOpForWh(op);
    setTempWorkingHours(currentWh > 0 ? String(currentWh) : "11");
  };

  const handleSaveWorkHours = async (hours: number) => {
    if (!selectedOpForWorkHours) return;
    const targetOp = activeTargetOpForWh || selectedOpForWorkHours.op;
    const { dateStr } = selectedOpForWorkHours;

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
        workDate: dateStr,
        lineCode: filters.line,
        styleNo: filters.style || targetOp.STYLE || "",
        nik: targetOp.NIK,
        workingHours: hours,
        updatedBy: updaterUser,
      });

      if (success) {
        if (hours <= 0) {
          toast.success(`Working hours for ${targetOp.E_NAME || targetOp.NIK} on ${dateStr} reset to auto.`);
        } else {
          toast.success(`Working hours for ${targetOp.E_NAME || targetOp.NIK} on ${dateStr} successfully saved: ${hours} hrs.`);
        }
        setSelectedOpForWorkHours(null);
        setActiveTargetOpForWh(null);
        handleLookup(false);
      } else {
        toast.error("Failed to update working hours override.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update working hours override.");
    } finally {
      setIsSavingWorkHours(false);
    }
  };

  const handleSaveMissingOutput = async (
    nik: string,
    missingQty: number,
    style?: string,
    predecessorNik?: string
  ): Promise<boolean> => {
    const styleNo = style || filters.style;
    if (!styleNo) {
      toast.error("Style is required to save missing output");
      return false;
    }

    if (isNaN(missingQty)) {
      toast.error("Please enter a valid number (use 0 to remove missing output)");
      return false;
    }

    const normNik = String(nik || "").trim().toUpperCase();
    const normPredNik = predecessorNik ? String(predecessorNik).trim().toUpperCase() : undefined;
    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error("Failed to parse auth token", err);
    }

    const currentOp = data.find((r) => {
      const rNik = String(r.NIK || "").trim().toUpperCase();
      return rNik === normNik;
    });
    const currentMissing = currentOp?.MISSING_OUTPUT ?? 0;
    const diff = missingQty - currentMissing;

    // Track in pending map for the edited NIK
    pendingMissingOutputsRef.current.set(normNik, { qty: missingQty, timestamp: Date.now() });
    if (normPredNik) {
      // Clear predecessor in pending map if predecessor was passed
      pendingMissingOutputsRef.current.set(normPredNik, { qty: 0, timestamp: Date.now() });
    }

    // 1. Instant Optimistic Update: Update state immediately for the target operator row
    const prevData = [...data];
    setData((prev) =>
      prev.map((row) => {
        const rNik = String(row.NIK || "").trim().toUpperCase();
        if (rNik === normNik) {
          return {
            ...row,
            MISSING_OUTPUT: missingQty,
            MISSING_OUTPUT_UPDATED_BY: updaterUser,
            MISSING_OUTPUT_UPDATED_AT: formatDt(new Date(), "yyyy-MM-dd HH:mm:ss"),
            TOTAL_OUTPUT: Math.max(0, Number(row.TOTAL_OUTPUT || 0) + diff),
            BALANCE: Number(row.BALANCE || 0) + diff,
          };
        } else if (normPredNik && rNik === normPredNik) {
          // Clear missing output from predecessor row if it exists separately
          const predMissing = Number(row.MISSING_OUTPUT || 0);
          return {
            ...row,
            MISSING_OUTPUT: 0,
            MISSING_OUTPUT_UPDATED_BY: null,
            MISSING_OUTPUT_UPDATED_AT: null,
            TOTAL_OUTPUT: Math.max(0, Number(row.TOTAL_OUTPUT || 0) - predMissing),
            BALANCE: Number(row.BALANCE || 0) - predMissing,
          };
        }
        return row;
      })
    );

    try {
      const workDateStr = formatDt(filters.date, "yyyy-MM-dd");
      const success = await saveMissingOutput({
        nik,
        styleNo,
        missingQty,
        updatedBy: updaterUser,
        workDate: workDateStr,
        predecessorNik,
        lineCode: filters.line,
      });

      if (success) {
        if (missingQty === 0) {
          toast.success(`Missing output cleared successfully`);
        } else if (missingQty < 0) {
          toast.success(`Output reduced by ${Math.abs(missingQty).toLocaleString()} (Missing Output: ${missingQty.toLocaleString()})`);
        } else if (currentMissing !== 0) {
          toast.success(`Missing output updated from ${currentMissing.toLocaleString()} to ${missingQty.toLocaleString()}`);
        } else {
          toast.success(`Successfully saved ${missingQty.toLocaleString()} missing output`);
        }
        // Background refresh to synchronize data with server SP after short delay
        setTimeout(() => {
          handleLookup(false);
        }, 1500);
        return true;
      } else {
        pendingMissingOutputsRef.current.delete(normNik);
        setData(prevData);
        toast.error("Failed to save missing output");
        return false;
      }
    } catch (err: any) {
      pendingMissingOutputsRef.current.delete(normNik);
      setData(prevData);
      toast.error(err?.message || "Failed to save missing output");
      return false;
    }
  };

  const formattedModalDate = useMemo(() => {
    if (!selectedOpForWorkHours?.dateStr) return "";
    try {
      return formatDt(parseISO(selectedOpForWorkHours.dateStr), "dd MMMM yyyy");
    } catch {
      return selectedOpForWorkHours.dateStr;
    }
  }, [selectedOpForWorkHours?.dateStr]);

  const deferredSearch = useDeferredValue(search);

  // Filtered rows for Calendar Data (CBC_GET_ALL_OP_SEWING_OUTPUT_DATA)
  const filteredData = useMemo(() => {
    if (!deferredSearch.trim()) return data;
    const s = deferredSearch.toLowerCase();
    return data.filter(
      (r) =>
        (r.E_NAME || "").toLowerCase().includes(s) ||
        (r.NIK || "").toLowerCase().includes(s) ||
        (r.MODULE || "").toLowerCase().includes(s) ||
        (r.FLOW_NO || "").toLowerCase().includes(s) ||
        (r.PROCESS_NAME || "").toLowerCase().includes(s) ||
        (r.TASKS || []).some((t) => (t.PROCESS_NAME || "").toLowerCase().includes(s))
    );
  }, [data, deferredSearch]);

  const activeModalOp = activeTargetOpForWh || selectedOpForWorkHours?.op;

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 font-inter p-4 md:p-6 space-y-5">
      <ToastContainer
        theme="dark"
        position="top-right"
        autoClose={3000}
        style={{ zIndex: 99999999 }}
        className="!z-[99999999]"
      />

      {/* HEADER & EMBEDDED CONTROLS (SINGLE HEADER) */}
      <div className="flex flex-col gap-4 bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md relative z-[9999]">
        <div className="flex items-center space-x-3.5 border-b border-slate-800 pb-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-500/20 text-white">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              CB Sewing Output
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Daily Calendar Report
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily sewing operator output report with day-to-day calendar tracking and process flow connectors
            </p>
          </div>
        </div>

        {/* EMBEDDED FILTER BUTTONS (Date, Factory, Line, Style, Period, Lookup) */}
        <div>
          <StockOperatorHeader
            filters={filters}
            onFiltersChange={setFilters}
            onLookup={() => handleLookup(true)}
            onLineNameChange={setActualLineName}
            hideTitle={true}
          />
        </div>
      </div>

      {/* ACTION & SEARCH BAR */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl relative z-20">
        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Operator, NIK, Process, Module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full xl:w-auto justify-end flex-wrap">
          {/* Grouping Mode Segmented Control (Grouped vs Per Operator) */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-700/80 rounded-lg shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => setGroupMode("grouped")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${groupMode === "grouped"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-400 hover:text-slate-200"
                }`}
              title="Mode Grouped: Menggabungkan operator dengan proses/flow yang sama, menampilkan Stock Grouped dan akumulasi output"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Grouped</span>
            </button>
            <button
              type="button"
              onClick={() => setGroupMode("operator")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${groupMode === "operator"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-400 hover:text-slate-200"
                }`}
              title="Mode Per-Operator: Menampilkan setiap operator secara individual dengan alur alokasi stok per operator"
            >
              <User className="w-3.5 h-3.5" />
              <span>Per Operator</span>
            </button>
          </div>

          {/* Output View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-900 border border-slate-700/80 rounded-lg shrink-0 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("merged")}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === "merged"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
                }`}
              title="Menampilkan total output akumulasi gabungan dengan operator pengganti"
            >
              Output Digabung
            </button>
            <button
              type="button"
              onClick={() => setViewMode("original")}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === "original"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
                }`}
              title="Menampilkan output original murni per hari hanya yang dikerjakan oleh operator tersebut"
            >
              Output Original
            </button>
          </div>

          {/* Flow Arrows Toggle */}
          <button
            type="button"
            onClick={() => setShowFlowArrows((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${showFlowArrows
                ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            title="Show / Hide process flow arrows between operators (Flow No Connectors)"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Process Flow</span>
          </button>

          {/* Filter Module Toggle */}
          <button
            type="button"
            onClick={() => {
              setFilterModule((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${filterModule
                ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            title="Filter main modules only (PART, LINING, HOOD, FRONT, BACK & SLEEVE, JOIN, ASSEMBLY, QC)"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Modules</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => handleLookup(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Loading..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="flex items-center justify-between p-4 bg-rose-950/40 border border-rose-600/40 rounded-xl text-rose-300 text-sm">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => handleLookup(true)}
            className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* MAIN DATA TABLE */}
      <CBSewingOutputTable
        data={filteredData}
        dateColumns={meta?.dateColumns || []}
        loading={loading}
        showFlowArrows={showFlowArrows}
        viewMode={viewMode}
        groupMode={groupMode}
        onEditWorkHours={handleOpenEditWorkHours}
        onSaveMissingOutput={handleSaveMissingOutput}
      />

      {/* MODAL EDIT WORK HOURS (DATE-TARGETED PER OPERATOR OR MULTI-OPERATOR GROUP) */}
      {selectedOpForWorkHours && activeModalOp && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 md:p-6 max-w-md w-full text-slate-100 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl shadow-inner">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {selectedOpForWorkHours.groupedOps && selectedOpForWorkHours.groupedOps.length > 1
                      ? `Edit Work Hours: ${activeModalOp.E_NAME || activeModalOp.NIK}`
                      : selectedOpForWorkHours.op.E_NAME || "Edit Work Hours"}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <User className="w-3 h-3 text-slate-500" />
                    <span>NIK: {activeModalOp.NIK}</span>
                    <span>•</span>
                    <span className="text-cyan-400 font-semibold">{activeModalOp.MODULE}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedOpForWorkHours(null);
                  setActiveTargetOpForWh(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-4">
              {/* Group Operator Switcher Tabs if multiple operators */}
              {selectedOpForWorkHours.groupedOps && selectedOpForWorkHours.groupedOps.length > 1 && (
                <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-400" />
                      Pilih Operator dalam Group ({selectedOpForWorkHours.groupedOps.length}):
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedOpForWorkHours.groupedOps.map((opItem) => {
                      const isAct = activeModalOp.NIK === opItem.NIK;
                      const opWh = opItem.DAILY_WORK_HOURS?.[selectedOpForWorkHours.dateStr] ?? opItem["WH_" + selectedOpForWorkHours.dateStr] ?? 0;
                      return (
                        <button
                          key={opItem.NIK}
                          type="button"
                          onClick={() => {
                            setActiveTargetOpForWh(opItem);
                            setTempWorkingHours(opWh > 0 ? String(opWh) : "11");
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${isAct
                              ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25 border border-cyan-400/40"
                              : "bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60 hover:bg-slate-700"
                            }`}
                        >
                          <span className="truncate max-w-[85px]">{opItem.E_NAME || opItem.NIK}</span>
                          <span className="text-[10px] opacity-75 font-mono">({opWh}h)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Target Date & Details Info Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2.5">
                <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/80 pb-2">
                  <span className="font-semibold text-slate-300">Work Date:</span>
                  <span className="font-bold px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono">
                    {formattedModalDate} ({selectedOpForWorkHours.dateStr})
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Process / Flow:</span>
                  <span className="font-medium text-slate-200 truncate max-w-[200px]" title={activeModalOp.PROCESS_NAME}>
                    {activeModalOp.FLOW_NO ? `[${activeModalOp.FLOW_NO}] ` : ""}{activeModalOp.PROCESS_NAME || "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Current Working Hours:</span>
                  <span className="font-extrabold text-cyan-300 font-mono">
                    {(() => {
                      const cur = activeModalOp.DAILY_WORK_HOURS?.[selectedOpForWorkHours.dateStr] ?? activeModalOp["WH_" + selectedOpForWorkHours.dateStr] ?? 0;
                      return cur > 0 ? `${cur} Hrs` : "Auto (Default)";
                    })()}
                  </span>
                </div>
              </div>

              {/* Input Working Hours */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Set Working Hours for {activeModalOp.E_NAME || activeModalOp.NIK} (Hours / Day)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  value={tempWorkingHours}
                  onChange={(e) => setTempWorkingHours(e.target.value)}
                  placeholder="e.g. 8.0 or 10.0"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Perubahan jam kerja ini berlaku <strong className="text-cyan-300 font-semibold">khusus tanggal {selectedOpForWorkHours.dateStr}</strong> untuk {activeModalOp.E_NAME || activeModalOp.NIK}.
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
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${Number(tempWorkingHours) === hrs
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

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
              {(() => {
                const cur = activeModalOp.DAILY_WORK_HOURS?.[selectedOpForWorkHours.dateStr] ?? activeModalOp["WH_" + selectedOpForWorkHours.dateStr] ?? 0;
                return cur > 0 ? (
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
                );
              })()}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOpForWorkHours(null);
                    setActiveTargetOpForWh(null);
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
                  <span>{isSavingWorkHours ? "Saving..." : "Save Working Hours"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CBSewingOutput;