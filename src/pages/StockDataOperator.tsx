import React, { useMemo, useState } from "react";
import { Search, RefreshCcw, GitBranch, X, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import StockOperatorHeader from "../components/StockOperator/Header";
import StockOperatorTable from "../components/StockOperator/StockOperatorTable";
import { DashboardFilters } from "../types/dashboard";
import { setOpStatus } from "../services/stockOperator";
import { fetchCBSewingOutput } from "../services/cbSewingOutput";
import { saveMissingOutput } from "../services/integratedLineMonitoring";
import { fetchNewLayoutAct, getAuthToken } from "../services/api";
import { toast } from "react-toastify";
import { StockOperatorRow, StockOperatorSummary } from "../types/stockOperator";

const defaultSummary: StockOperatorSummary = {
  total_operators: 0,
  total_modules: 0,
  total_actual: 0,
  total_stock_op: 0,
  qc_output: 0,
  status_distribution: { sufficient: 0, warning: 0, deficient: 0 }
};

const StockDataOperator: React.FC = () => {
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
  const [data, setData] = useState<StockOperatorRow[]>([]);
  const [apiSummary, setApiSummary] = useState<StockOperatorSummary>(defaultSummary);
  const [loading, setLoading] = useState(false);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [settingKey, setSettingKey] = useState<string | null>(null);

  const [checkMissingFlowModal, setCheckMissingFlowModal] = useState<{
    open: boolean;
    lineCode: string;
    style: string;
    prepId: string;
    loading: boolean;
    error: string | null;
    data: any[];
    flowGroups: { prefix: string; min: string; max: string; allFlows: string[]; missingFlows: string[]; originalFlows: string[] }[];
  }>({
    open: false,
    lineCode: '',
    style: '',
    prepId: '',
    loading: false,
    error: null,
    data: [],
    flowGroups: [],
  });

  const handleCheckMissingFlow = async (lineCode: string, style: string, prepId: string) => {
    if (!lineCode || !style) {
      setErrorMessage("Please select Line and Style first");
      return;
    }
    if (!prepId) {
      setErrorMessage("PREP_ID tidak boleh kosong. Silakan lookup data terlebih dahulu.");
      return;
    }

    setCheckMissingFlowModal(prev => ({
      ...prev,
      open: true,
      lineCode,
      style,
      prepId,
      loading: true,
      error: null,
      data: [],
      flowGroups: [],
    }));

    try {
      const data = await fetchNewLayoutAct({
        lineno: lineCode,
        style,
        prepId,
      });

      // Extract all FLOW_NO values
      const allFlows: string[] = [];
      data.forEach((item: any) => {
        if (item.FLOW_NO) {
          String(item.FLOW_NO).split(',').forEach(f => {
            const trimmed = f.trim();
            if (trimmed) allFlows.push(trimmed);
          });
        }
        if (item.INPUT_FLOW_NO) {
          String(item.INPUT_FLOW_NO).split(',').forEach(f => {
            const trimmed = f.trim();
            if (trimmed) allFlows.push(trimmed);
          });
        }
        if (item.OUTPUT_FLOW_NO) {
          String(item.OUTPUT_FLOW_NO).split(',').forEach(f => {
            const trimmed = f.trim();
            if (trimmed) allFlows.push(trimmed);
          });
        }
      });

      // Group flows by prefix (e.g., "L" from "L1", "L2", "BB3_SFD3", etc.)
      const flowGroupsMap: Record<string, { numbers: number[]; originalFlows: string[] }> = {};
      allFlows.forEach(flow => {
        // Strip .D (case-insensitive) to treat duplicate flows as the base flow
        const cleanFlow = flow.replace(/\.D/gi, '');
        const match = cleanFlow.match(/^([A-Za-z]+)(\d+)(?:_[A-Za-z0-9]+)?$/);
        if (match) {
          const prefix = match[1];
          const num = parseInt(match[2], 10);
          if (!flowGroupsMap[prefix]) {
            flowGroupsMap[prefix] = { numbers: [], originalFlows: [] };
          }
          flowGroupsMap[prefix].numbers.push(num);
          flowGroupsMap[prefix].originalFlows.push(flow);
        }
      });

      // Build flow groups with all flows (present and missing)
      const flowGroups: { prefix: string; min: string; max: string; allFlows: string[]; missingFlows: string[]; originalFlows: string[] }[] = [];
      Object.entries(flowGroupsMap).forEach(([prefix, { numbers, originalFlows }]) => {
        if (numbers.length === 0) return;
        
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const allFlowsInSequence: string[] = [];
        const missingFlows: string[] = [];

        for (let i = min; i <= max; i++) {
          const flowName = `${prefix}${i}`;
          allFlowsInSequence.push(flowName);
          if (!numbers.includes(i)) {
            missingFlows.push(flowName);
          }
        }

        // Sort original flows by their numeric part
        const sortedOriginalFlows = [...originalFlows].sort((a, b) => {
          const cleanA = a.replace(/\.D/gi, '');
          const cleanB = b.replace(/\.D/gi, '');
          const matchA = cleanA.match(/^([A-Za-z]+)(\d+)(?:_[A-Za-z0-9]+)?$/);
          const matchB = cleanB.match(/^([A-Za-z]+)(\d+)(?:_[A-Za-z0-9]+)?$/);
          if (matchA && matchB) {
            const numA = parseInt(matchA[2], 10);
            const numB = parseInt(matchB[2], 10);
            return numA - numB;
          }
          return a.localeCompare(b);
        });

        flowGroups.push({
          prefix,
          min: `${prefix}${min}`,
          max: `${prefix}${max}`,
          allFlows: allFlowsInSequence,
          missingFlows,
          originalFlows: sortedOriginalFlows,
        });
      });

      // Sort flow groups by prefix
      flowGroups.sort((a, b) => a.prefix.localeCompare(b.prefix));

      setCheckMissingFlowModal(prev => ({
        ...prev,
        loading: false,
        data,
        flowGroups,
      }));
    } catch (err: any) {
      setCheckMissingFlowModal(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to check missing flows',
        data: [],
        flowGroups: [],
      }));
    }
  };

  const normalizeFactory = (factory: string) => {
    return factory.split("-")[0].trim();
  };
  const handleSetOutput = async (item: StockOperatorRow) => {
    if (!filters.line || !filters.style) {
      setErrorMessage("Please select Line and Style first");
      return;
    }

    const key = `${item.NIK}_${item.MODULE}`;

    try {
      setErrorMessage("");
      setSettingKey(key);

      await setOpStatus({
        factory: normalizeFactory(filters.factory),
        lineNo: filters.line,
        styleNo: filters.style,
        module: item.MODULE,
        nik: item.NIK,
        status: "OUTPUT",
        dateFrom: filters.date.toISOString().split("T")[0],
      });

      await handleLookup();
    } catch (error) {
      console.error("SetOpStatus error:", error);
      setErrorMessage("Gagal set status operator ke OUTPUT");
    } finally {
      setSettingKey(null);
    }
  };

  const handleSaveMissingOutput = async (nik: string, missingQty: number, predecessorNik?: string): Promise<boolean> => {
    if (!filters.line || !filters.style) {
      toast.error("Please select Line and Style first");
      return false;
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
      const success = await saveMissingOutput({
        nik,
        styleNo: filters.style,
        missingQty,
        updatedBy: updaterUser,
        workDate: format(filters.date, "yyyy-MM-dd"),
        predecessorNik,
        lineCode: filters.line,
      });

      if (success) {
        toast.success(`Missing output saved successfully`);
        // Refresh data di background tanpa loading state agar UI tidak terganggu
        refreshInBackground();
        return true;
      } else {
        toast.error("Failed to save missing output");
        return false;
      }
    } catch (err) {
      toast.error("Failed to save missing output");
      return false;
    }
  };

  // Silent background refresh: update data tanpa trigger loading/flicker di tabel
  const refreshInBackground = async () => {
    if (!filters.line) return;

    setBackgroundRefreshing(true);
    try {
      const workDateStr = filters.date instanceof Date
        ? format(filters.date, "yyyy-MM-dd")
        : String(filters.date).split("T")[0];

      const res = await fetchCBSewingOutput({
        factory: filters.factory,
        lineNo: filters.line,
        styleNo: filters.style || "",
        workDate: workDateStr,
        filterModule: true,
        noCache: true,
      });

      const mappedData: StockOperatorRow[] = (res.data || []).map((item: any) => ({
        WORK_DATE: String(item.WORK_DATE ?? workDateStr),
        STYLE: String(item.STYLE ?? filters.style ?? ""),
        PREP_ID: item.PREP_ID != null ? String(item.PREP_ID) : "",
        MODULE: String(item.MODULE ?? ""),
        SPLIT_MODULE: String(item.SPLIT_MODULE ?? ""),
        NIK: String(item.NIK ?? ""),
        E_NAME: String(item.E_NAME ?? ""),
        ACTUAL: Number(item.TOTAL_OUTPUT ?? item.ACTUAL ?? 0),
        EMPNO: Number(item.EMPNO ?? 0),
        FLOW_NO: String(item.FLOW_NO ?? ""),
        PROCESS_NAME: String(item.PROCESS_NAME ?? ""),
        STOCK_OP: Number(item.STOCK_OP ?? 0),
        AVERAGE: Number(item.AVERAGE ?? 0),
        AVERAGE_PER_PART: Number(item.AVERAGE_PER_PART ?? 0),
        QC_OUTPUT: Number(item.QC_OUTPUT ?? 0),
        SOURCE_TABLE: String(item.SOURCE_TABLE ?? ""),
        OP_STATUS: item.OP_STATUS ?? null,
        STATUS_OUTPUT: String(item.STATUS_OUTPUT ?? ""),
        STATUS_COLOR: String(item.STATUS_COLOR ?? ""),
        FLOWS: Array.isArray(item.TASKS) && item.TASKS.length > 0 
          ? item.TASKS.map((t: any) => ({
              FLOW_NO: String(t.FLOW_NO ?? ""),
              PROCESS_NO: String(t.PROCESS_NO ?? ""),
              PROCESS_NAME: String(t.PROCESS_NAME ?? ""),
              AUTO_SEQ: Number(t.AUTO_SEQ ?? 0),
            }))
          : (Array.isArray(item.FLOWS) ? item.FLOWS : []),
        STOCK_DAYS: item.STOCK_DAYS != null ? Number(item.STOCK_DAYS) : undefined,
        TODAY_OUTPUT: item.TODAY_OUTPUT != null ? Number(item.TODAY_OUTPUT) : undefined,
        MISSING_OUTPUT: item.MISSING_OUTPUT != null ? Number(item.MISSING_OUTPUT) : undefined,
        MERGED_EMP_NIK: item.MERGED_EMP_NIK ? String(item.MERGED_EMP_NIK) : undefined,
        MERGED_EMP_NAME: item.MERGED_EMP_NAME ? String(item.MERGED_EMP_NAME) : undefined,
        ORIGINAL_TOTAL_OUTPUT: item.ORIGINAL_TOTAL_OUTPUT != null ? Number(item.ORIGINAL_TOTAL_OUTPUT) : undefined,
        ORIGINAL_TODAY_OUTPUT: item.ORIGINAL_TODAY_OUTPUT != null ? Number(item.ORIGINAL_TODAY_OUTPUT) : undefined,
        ORIGINAL_DAILY_OUTPUTS: item.ORIGINAL_DAILY_OUTPUTS || {},
      }));

      const summary: StockOperatorSummary = {
        total_operators: res.meta?.totalRecords ?? mappedData.length,
        total_modules: res.meta?.totalModules ?? 0,
        total_actual: res.meta?.grandTotalOutput ?? 0,
        total_stock_op: res.meta?.grandTotalStock ?? 0,
        qc_output: mappedData.length > 0 ? Number(mappedData[0].QC_OUTPUT || 0) : 0,
        status_distribution: { sufficient: 0, warning: 0, deficient: 0 },
      };

      // Update data secara real-time tanpa reset loading state
      setData(mappedData);
      setApiSummary(summary);
    } catch (error) {
      console.error("Background refresh error:", error);
    } finally {
      setBackgroundRefreshing(false);
    }
  };

  const handleLookup = async () => {
    if (!filters.line) {
      setErrorMessage("Please select a Line first");
      return;
    }

    try {
      setErrorMessage("");
      setLoading(true);

      const workDateStr = filters.date instanceof Date
        ? format(filters.date, "yyyy-MM-dd")
        : String(filters.date).split("T")[0];

      const res = await fetchCBSewingOutput({
        factory: filters.factory,
        lineNo: filters.line,
        styleNo: filters.style || "",
        workDate: workDateStr,
        filterModule: true,
        noCache: true,
      });

      const mappedData: StockOperatorRow[] = (res.data || []).map((item: any) => ({
        WORK_DATE: String(item.WORK_DATE ?? workDateStr),
        STYLE: String(item.STYLE ?? filters.style ?? ""),
        PREP_ID: item.PREP_ID != null ? String(item.PREP_ID) : "",
        MODULE: String(item.MODULE ?? ""),
        SPLIT_MODULE: String(item.SPLIT_MODULE ?? ""),
        NIK: String(item.NIK ?? ""),
        E_NAME: String(item.E_NAME ?? ""),
        ACTUAL: Number(item.TOTAL_OUTPUT ?? item.ACTUAL ?? 0),
        EMPNO: Number(item.EMPNO ?? 0),
        FLOW_NO: String(item.FLOW_NO ?? ""),
        PROCESS_NAME: String(item.PROCESS_NAME ?? ""),
        STOCK_OP: Number(item.STOCK_OP ?? 0),
        AVERAGE: Number(item.AVERAGE ?? 0),
        AVERAGE_PER_PART: Number(item.AVERAGE_PER_PART ?? 0),
        QC_OUTPUT: Number(item.QC_OUTPUT ?? 0),
        SOURCE_TABLE: String(item.SOURCE_TABLE ?? ""),
        OP_STATUS: item.OP_STATUS ?? null,
        STATUS_OUTPUT: String(item.STATUS_OUTPUT ?? ""),
        STATUS_COLOR: String(item.STATUS_COLOR ?? ""),
        FLOWS: Array.isArray(item.TASKS) && item.TASKS.length > 0 
          ? item.TASKS.map((t: any) => ({
              FLOW_NO: String(t.FLOW_NO ?? ""),
              PROCESS_NO: String(t.PROCESS_NO ?? ""),
              PROCESS_NAME: String(t.PROCESS_NAME ?? ""),
              AUTO_SEQ: Number(t.AUTO_SEQ ?? 0),
            }))
          : (Array.isArray(item.FLOWS) ? item.FLOWS : []),
        STOCK_DAYS: item.STOCK_DAYS != null ? Number(item.STOCK_DAYS) : undefined,
        TODAY_OUTPUT: item.TODAY_OUTPUT != null ? Number(item.TODAY_OUTPUT) : undefined,
        MISSING_OUTPUT: item.MISSING_OUTPUT != null ? Number(item.MISSING_OUTPUT) : undefined,
        MERGED_EMP_NIK: item.MERGED_EMP_NIK ? String(item.MERGED_EMP_NIK) : undefined,
        MERGED_EMP_NAME: item.MERGED_EMP_NAME ? String(item.MERGED_EMP_NAME) : undefined,
        ORIGINAL_TOTAL_OUTPUT: item.ORIGINAL_TOTAL_OUTPUT != null ? Number(item.ORIGINAL_TOTAL_OUTPUT) : undefined,
        ORIGINAL_TODAY_OUTPUT: item.ORIGINAL_TODAY_OUTPUT != null ? Number(item.ORIGINAL_TODAY_OUTPUT) : undefined,
        ORIGINAL_DAILY_OUTPUTS: item.ORIGINAL_DAILY_OUTPUTS || {},
      }));

      const summary: StockOperatorSummary = {
        total_operators: res.meta?.totalRecords ?? mappedData.length,
        total_modules: res.meta?.totalModules ?? 0,
        total_actual: res.meta?.grandTotalOutput ?? 0,
        total_stock_op: res.meta?.grandTotalStock ?? 0,
        qc_output: mappedData.length > 0 ? Number(mappedData[0].QC_OUTPUT || 0) : 0,
        status_distribution: { sufficient: 0, warning: 0, deficient: 0 },
      };

      setData(mappedData);
      setApiSummary(summary);
    } catch (error) {
      console.error("GetCBSewingOutputData error:", error);
      setErrorMessage("Gagal mengambil data CBSewingOutput");
      setData([]);
      setApiSummary(defaultSummary);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    handleLookup();
  };

  const filteredData = useMemo(() => {
    const keyword = search.toLowerCase();

    return data.filter((item) => {
      return (
        item.E_NAME.toLowerCase().includes(keyword) ||
        item.NIK.toLowerCase().includes(keyword)
      );
    });
  }, [data, search]);

  const computedSummary = useMemo(() => {
    let totalOp = 0;
    let totalOut = 0;
    let totalStock = 0;

    filteredData.forEach((item) => {
      totalOp++;
      totalOut += Number(item.ACTUAL) || 0;
      totalStock += Number(item.STOCK_OP) || 0;
    });

    return {
      total_operators: totalOp,
      total_actual: totalOut,
      total_stock_op: totalStock,
      qc_output: apiSummary.qc_output,
    };
  }, [filteredData, apiSummary.qc_output]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="sticky top-0 z-50 bg-gray-900">
        <StockOperatorHeader
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            setErrorMessage("");
          }}
          onLookup={handleLookup}
          onLineNameChange={setActualLineName}
        />
      </div>

      <div className="min-h-screen bg-gray-900 shadow-sm">
        <div className="mx-4 py-4">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">
                Stock Monitoring Dashboard
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Period {filters.period || "-"} | Line{" "}
                {actualLineName || filters.line || "-"} | Style{" "}
                {filters.style || "-"} | Factory {filters.factory}
              </p>
            </div>
            {backgroundRefreshing && (
              <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                Updating...
              </div>
            )}

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search operator / NIK..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 sm:w-[260px]"
                />
              </div>

              <button
                onClick={handleRefresh}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-white transition hover:bg-slate-700"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>

              <button
                onClick={() => {
                  const prepId = data.length > 0 ? String(data[0].PREP_ID ?? '') : '';
                  if (!prepId) {
                    setErrorMessage("PREP_ID tidak tersedia. Silakan lookup data terlebih dahulu.");
                    return;
                  }
                  handleCheckMissingFlow(filters.line, filters.style, prepId);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 text-emerald-300 transition hover:bg-emerald-500/20 whitespace-nowrap"
              >
                <GitBranch className="h-4 w-4" />
                View Missing Flow
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg border-b-4 border-b-slate-600/50">
              <p className="text-sm text-slate-400">Total Operator</p>
              <h3 className="mt-2 text-3xl font-bold text-white">
                {computedSummary.total_operators}
              </h3>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg border-b-4 border-b-emerald-500/50">
              <p className="text-sm text-slate-400">Total Output</p>
              <h3 className="mt-2 text-3xl font-bold text-emerald-400">
                {computedSummary.total_actual}
              </h3>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg border-b-4 border-b-amber-500/50">
              <p className="text-sm text-slate-400">Total Stock</p>
              <h3 className="mt-2 text-3xl font-bold text-amber-400">
                {computedSummary.total_stock_op}
              </h3>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg border-b-4 border-b-cyan-500/50">
              <p className="text-sm text-slate-400">Total QC Output</p>
              <h3 className="mt-2 text-3xl font-bold text-cyan-400">
                {computedSummary.qc_output}
              </h3>
            </div>
          </div>

          <StockOperatorTable
            data={filteredData}
            loading={loading}
            summary={apiSummary}
            onSetOutput={handleSetOutput}
            settingKey={settingKey}
            onSaveMissingOutput={handleSaveMissingOutput}
          />
        </div>
      </div>

      {/* Check Missing Flow Modal */}
      {checkMissingFlowModal.open && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col animate-modal-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200">Check Missing Flow</h3>
                  <p className="text-xs text-slate-400">
                    Style: <span className="font-mono text-emerald-300">{checkMissingFlowModal.style}</span> | 
                    Line: <span className="font-mono text-emerald-300">{actualLineName || checkMissingFlowModal.lineCode}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckMissingFlowModal(prev => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {checkMissingFlowModal.loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-slate-400">Checking flows...</p>
                </div>
              )}

              {checkMissingFlowModal.error && (
                <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkMissingFlowModal.error}</span>
                </div>
              )}

              {!checkMissingFlowModal.loading && !checkMissingFlowModal.error && (
                <div className="space-y-4">
                  {checkMissingFlowModal.flowGroups.length === 0 ? (
                    <div className="bg-slate-950/20 border border-slate-800/30 rounded-lg p-6 text-center">
                      <p className="text-sm text-slate-400">No flow data found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-800/60">
                            <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700 whitespace-nowrap w-24">Flow Group</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700 whitespace-nowrap w-32">Range</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700 whitespace-nowrap">All Flows</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700 whitespace-nowrap">Missing Flows</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checkMissingFlowModal.flowGroups.map((group: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50 font-semibold whitespace-nowrap">{group.prefix}</td>
                              <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50 font-mono whitespace-nowrap">{group.min} - {group.max}</td>
                              <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50">
                                <div className="flex flex-wrap gap-1">
                                  {group.originalFlows.map((flow: string, fIdx: number) => {
                                    const cleanFlow = flow.replace(/\.D/gi, '');
                                    const match = cleanFlow.match(/^([A-Za-z]+)(\d+)(?:_[A-Za-z0-9]+)?$/);
                                    const baseFlowName = match ? `${match[1]}${match[2]}` : cleanFlow;
                                    const isMissing = group.missingFlows.includes(baseFlowName);
                                    return (
                                      <span
                                        key={fIdx}
                                        className={`px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap ${
                                          isMissing
                                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                        }`}
                                      >
                                        {flow}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50">
                                {group.missingFlows.length === 0 ? (
                                  <span className="text-emerald-400">Good</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {group.missingFlows.map((missing: string, mIdx: number) => (
                                      <span
                                        key={mIdx}
                                        className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono whitespace-nowrap"
                                      >
                                        {missing}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setCheckMissingFlowModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-150 text-xs font-semibold border border-slate-700/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockDataOperator;