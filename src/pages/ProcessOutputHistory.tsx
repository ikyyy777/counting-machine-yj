import React, { useMemo, useState, useDeferredValue } from "react";
import { Search, RefreshCcw, AlertCircle, Activity, Filter, Users, Layers, CalendarCheck, CheckCircle2, TrendingUp } from "lucide-react";
import { format as formatDt } from "date-fns";
import StockOperatorHeader from "../components/StockOperator/Header";
import ProcessOutputHistoryTable from "../components/ProcessOutputHistory/ProcessOutputHistoryTable";
import { DashboardFilters } from "../types/dashboard";
import { fetchCBOpDataPerProcess } from "../services/cbSewingOutput";
import { CBOpDataPerProcessRow, CBOpDataPerProcessMeta } from "../types/cbSewingOutput";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProcessOutputHistory: React.FC = () => {
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

  // State Data Output Per Process (CBC_GET_ALL_OP_DATA_PER_PROCESS)
  const [data, setData] = useState<CBOpDataPerProcessRow[]>([]);
  const [meta, setMeta] = useState<CBOpDataPerProcessMeta | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLookup = async (isManual = true) => {
    if (!filters.line) {
      if (isManual) setErrorMessage("Please select a Line first");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const workDateStr = formatDt(filters.date, "yyyy-MM-dd");
      const res = await fetchCBOpDataPerProcess({
        factory: filters.factory,
        lineNo: filters.line,
        styleNo: filters.style || "",
        workDate: workDateStr,
        filterModule: filterModule,
      });

      setData(res.data || []);
      setMeta(res.meta);

      if (isManual) {
        toast.success(`Process output data successfully loaded (${res.data.length} records)`);
      }
    } catch (err: any) {
      console.error("Error fetching process output history:", err);
      const msg = err?.message || "Failed to load process output history. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
      setData([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const deferredSearch = useDeferredValue(search);

  // Filtered rows
  const filteredData = useMemo(() => {
    if (!deferredSearch.trim()) return data;
    const s = deferredSearch.toLowerCase();
    return data.filter(
      (r) =>
        (r.NAMA_OP || "").toLowerCase().includes(s) ||
        (r.NIK || "").toLowerCase().includes(s) ||
        (r.MODULE || "").toLowerCase().includes(s) ||
        (r.FLOW || "").toLowerCase().includes(s) ||
        (r.PROSES_NAME || "").toLowerCase().includes(s) ||
        (r.PROCESS_NO || "").toLowerCase().includes(s)
    );
  }, [data, deferredSearch]);

  // Summary Metrics computed from filtered rows
  const summary = useMemo(() => {
    const distinctOps = new Set<string>();
    const distinctModules = new Set<string>();
    const processedOpToday = new Set<string>();
    let totalOpToday = 0;
    let totalOpAllTime = 0;
    let totalProcessToday = 0;
    let totalProcessAllTime = 0;

    filteredData.forEach((r) => {
      if (r.NIK) {
        distinctOps.add(r.NIK);
        if (!processedOpToday.has(r.NIK)) {
          processedOpToday.add(r.NIK);
          totalOpToday += r.OUTPUT_PER_OP || 0;
          totalOpAllTime += r.OUTPUT_PER_OP_ALL_TIME || 0;
        }
      }
      if (r.MODULE) distinctModules.add(r.MODULE);
      totalProcessToday += r.OUTPUT_PER_PROCESS || 0;
      totalProcessAllTime += r.OUTPUT_PER_PROCESS_ALL_TIME || 0;
    });

    return {
      totalRecords: filteredData.length,
      totalOperators: distinctOps.size,
      totalModules: distinctModules.size,
      totalOpToday,
      totalOpAllTime,
      totalProcessToday,
      totalProcessAllTime,
    };
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-100 font-inter p-4 md:p-6 space-y-5">
      <ToastContainer
        theme="dark"
        position="top-right"
        autoClose={3000}
        style={{ zIndex: 99999999 }}
        className="!z-[99999999]"
      />

      {/* HEADER & FILTER CONTROLS */}
      <div className="flex flex-col gap-4 bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-md relative z-[9999]">
        <div className="flex items-center space-x-3.5 border-b border-slate-800 pb-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Process Output History
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Operator &amp; Process Breakdown
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive process output report per sewing operator with dynamic flow all-time accumulation and proportional process distribution
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

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Operator */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Total Operators</p>
            <p className="text-lg font-black text-white font-mono">{summary.totalOperators}</p>
          </div>
        </div>

        {/* Total Process */}
        <div className="bg-slate-900/80 border border-slate-800/80 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400">Total Processes</p>
            <p className="text-lg font-black text-white font-mono">{summary.totalRecords}</p>
          </div>
        </div>

        {/* Op Output (Today) */}
        <div className="bg-slate-900/80 border border-cyan-500/20 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-lg">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-cyan-300">Op Output (Today)</p>
            <p className="text-lg font-black text-cyan-200 font-mono">
              {summary.totalOpToday.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Process Output (Today) */}
        <div className="bg-slate-900/80 border border-emerald-500/20 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-emerald-300">Process Output (Today)</p>
            <p className="text-lg font-black text-emerald-300 font-mono">
              {summary.totalProcessToday.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Process (All Time) */}
        <div className="bg-slate-900/80 border border-indigo-500/20 p-3.5 rounded-xl flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-indigo-300">Process (All Time)</p>
            <p className="text-lg font-black text-indigo-300 font-mono">
              {summary.totalProcessAllTime.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ACTION & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl relative z-20">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Operator, NIK, Flow, Process, Module..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Filter Module Toggle */}
          <button
            onClick={() => {
              setFilterModule((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              filterModule
                ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Filter main modules only (PART, LINING, HOOD, FRONT, BACK & SLEEVE, JOIN, ASSEMBLY, QC)"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Main Modules</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => handleLookup(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
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
      <ProcessOutputHistoryTable
        data={filteredData}
        loading={loading}
        styleNo={filters.style}
        lineNo={filters.line}
        workDate={formatDt(filters.date, "yyyy-MM-dd")}
      />
    </div>
  );
};

export const ProcessOutputHistoryPage = ProcessOutputHistory;
export default ProcessOutputHistory;
