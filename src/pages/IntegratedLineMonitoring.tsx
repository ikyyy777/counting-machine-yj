import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  Search,
  RefreshCcw,
  Users,
  Activity,
  ArrowLeft,
  Boxes,
  Sparkles,
  Download,
  Tag,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ExcelJS from "exceljs";

import { setCurrentFactory } from "../services/api";
import {
  fetchIntegratedLineMonitoring,
  fetchModuleTotalinPivot,
} from "../services/integratedLineMonitoring";
import {
  IntegratedLineMonitoringResponse,
  DISPLAY_FACTORY_CODES,
  DisplayFactoryCode,
  mapDisplayToApiFactory,
} from "../types/api";
import LineCard from "../components/LineCard";
import LineDetails from "./LineDetails";

const IntegratedLineMonitoring: React.FC = () => {
  const navigate = useNavigate();

  // Filter States
  const [date, setDate] = useState<Date>(new Date());
  const [factory, setFactory] = useState<DisplayFactoryCode>("YONGJIN 2-1");

  // Main Data States
  const [data, setData] = useState<IntegratedLineMonitoringResponse[]>([]);
  const [pivotData, setPivotData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPivot, setLoadingPivot] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [selectedLineName, setSelectedLineName] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [searchQuery] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<{
    date: Date;
    factory: DisplayFactoryCode;
    style?: string;
  } | null>(null);

  // Available unique styles from current monitoring data
  const availableStyles = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      if (item.STYLE_NO && item.STYLE_NO.trim() && item.STYLE_NO.trim() !== "-") {
        set.add(item.STYLE_NO.trim());
      }
    });
    return Array.from(set).sort();
  }, [data]);

  // Reset style filter when factory changes
  useEffect(() => {
    setSelectedStyle("");
  }, [factory]);

  // New Features States: Auto Refresh, Sorting, and Filters
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [sortBy] = useState<
    "line" | "completion" | "todayProd" | "avgHour" | "employee"
  >("line");
  const [sortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter] = useState<
    "all" | "low" | "no_output" | "completed"
  >("all");

  // Filter local search & sub-factory filtering for YONGJIN 2-1 and YONGJIN 2-2
  const filteredData = useMemo(() => {
    // Use the factory that was applied during lookup, not the current UI selection
    const activeFactory = appliedFilters?.factory || factory;

    // 1. Filter by factory sub-lines if YONGJIN 2-1 or YONGJIN 2-2
    let result = data;
    if (activeFactory === "YONGJIN 2-1") {
      result = data.filter((item) => {
        const match = item.LINE_NAME.match(/\d+/);
        if (match) {
          const lineNum = parseInt(match[0], 10);
          return lineNum >= 1 && lineNum <= 24;
        }
        return true; // Keep if no number found, to be safe
      });
    } else if (activeFactory === "YONGJIN 2-2") {
      result = data.filter((item) => {
        const match = item.LINE_NAME.match(/\d+/);
        if (match) {
          const lineNum = parseInt(match[0], 10);
          return lineNum >= 25 && lineNum <= 48;
        }
        return true; // Keep if no number found, to be safe
      });
    }

    // 2. Filter by selected style
    if (selectedStyle) {
      result = result.filter(
        (item) => item.STYLE_NO.trim().toUpperCase() === selectedStyle.trim().toUpperCase()
      );
    }

    // 3. Filter by search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (item) =>
          item.LINE_NAME.toLowerCase().includes(query) ||
          item.STYLE_NO.toLowerCase().includes(query) ||
          item.LINE_CODE.toLowerCase().includes(query),
      );
    }

    // 4. Filter by status filter
    if (statusFilter === "low") {
      result = result.filter((item) => {
        const rate =
          item.TOTAL_ORD_QTY > 0
            ? (item.TOTAL_QC_COUNTING / item.TOTAL_ORD_QTY) * 100
            : 0;
        return rate < 50;
      });
    } else if (statusFilter === "no_output") {
      result = result.filter((item) => item.TODAY_QC_COUNTING === 0);
    } else if (statusFilter === "completed") {
      result = result.filter((item) => {
        const rate =
          item.TOTAL_ORD_QTY > 0
            ? (item.TOTAL_QC_COUNTING / item.TOTAL_ORD_QTY) * 100
            : 0;
        return rate >= 100;
      });
    }

    // 5. Sort the result
    return [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "line") {
        comparison = a.LINE_NAME.localeCompare(b.LINE_NAME, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      } else if (sortBy === "completion") {
        const rateA =
          a.TOTAL_ORD_QTY > 0
            ? (a.TOTAL_QC_COUNTING / a.TOTAL_ORD_QTY) * 100
            : 0;
        const rateB =
          b.TOTAL_ORD_QTY > 0
            ? (b.TOTAL_QC_COUNTING / b.TOTAL_ORD_QTY) * 100
            : 0;
        comparison = rateA - rateB;
      } else if (sortBy === "todayProd") {
        comparison = a.TODAY_QC_COUNTING - b.TODAY_QC_COUNTING;
      } else if (sortBy === "avgHour") {
        comparison = a.TOTAL_QC_AVG_PER_HOUR - b.TOTAL_QC_AVG_PER_HOUR;
      } else if (sortBy === "employee") {
        comparison = a.TOTAL_EMPLOYEE - b.TOTAL_EMPLOYEE;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [
    data,
    selectedStyle,
    searchQuery,
    appliedFilters,
    factory,
    sortBy,
    sortOrder,
    statusFilter,
  ]);

  // Lazy loading state for virtual list performance rendering
  const [visibleCount, setVisibleCount] = useState(12);

  // Reset visible count when data or filter changes
  useEffect(() => {
    setVisibleCount(12);
  }, [filteredData]);

  // Load more items when user scrolls near the bottom of the page
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 300
      ) {
        setVisibleCount((prev) => Math.min(prev + 12, filteredData.length));
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [filteredData]);

  // Lookup Action
  const handleLookup = async (isSilent = false, isRefresh = false) => {
    setLoading(true);
    setHasLookedUp(true);

    if (!isSilent && !isRefresh) {
      setData([]);
      setPivotData([]);
    }

    // Update global currentFactory for correct API URLs
    const apiFactory = mapDisplayToApiFactory(factory);
    setCurrentFactory(apiFactory);

    let currentResults: IntegratedLineMonitoringResponse[] = [];

    try {
      const formattedDate = format(date, "yyyy-MM-dd");

      if (isRefresh) {
        // Only fetch main monitoring data on auto-refresh (bypasses heavy pivot query)
        const results = await fetchIntegratedLineMonitoring({
          factory,
          dateFrom: formattedDate,
        });

        // Sort results by LINE_NAME naturally (e.g. Line 2 before Line 10)
        currentResults = [...results].sort((a, b) =>
          a.LINE_NAME.localeCompare(b.LINE_NAME, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );
        setData(currentResults);
      } else {
        // Progressive Loading: Fetch main data first and show UI immediately
        // Progressive Loading: Fetch main data first and show UI immediately
        const results = await fetchIntegratedLineMonitoring({
          factory,
          dateFrom: formattedDate,
        });

        // Sort results by LINE_NAME naturally (e.g. Line 2 before Line 10)
        currentResults = [...results].sort((a, b) =>
          a.LINE_NAME.localeCompare(b.LINE_NAME, undefined, {
            numeric: true,
            sensitivity: "base",
          })
        );
        setData(currentResults);
        setLoading(false); // Stop fullscreen spinner immediately

        // API INPUT MODULE (fetchModuleTotalinPivot) is temporarily disabled as requested
        setLoadingPivot(false);
        setPivotData([]);
      }

      // Update applied filters now that the data has loaded successfully
      setAppliedFilters({ date, factory });

      if (!isSilent) {
        // Use local variable currentResults to check the actual count instead of stale state
        const displayResults = currentResults;
        if (displayResults.length === 0) {
          toast.info("No monitoring data found for the selected filters.", {
            theme: "dark",
          });
        } else {
          // Calculate filtered count matching factory sub-lines filter
          let displayCount = displayResults.length;
          if (factory === "YONGJIN 2-1") {
            displayCount = displayResults.filter((item) => {
              const match = item.LINE_NAME.match(/\d+/);
              return match
                ? parseInt(match[0], 10) >= 1 && parseInt(match[0], 10) <= 24
                : true;
            }).length;
          } else if (factory === "YONGJIN 2-2") {
            displayCount = displayResults.filter((item) => {
              const match = item.LINE_NAME.match(/\d+/);
              return match
                ? parseInt(match[0], 10) >= 25 && parseInt(match[0], 10) <= 48
                : true;
            }).length;
          }

          toast.success(`Successfully loaded ${displayCount} record(s).`, {
            theme: "dark",
          });
        }
      }
    } catch (error: any) {
      console.error("Lookup error:", error);
      if (!isSilent) {
        toast.error(error?.message || "Failed to fetch monitoring data", {
          theme: "dark",
        });
      }
      setData([]);
      setPivotData([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh timer effect
  useEffect(() => {
    if (!autoRefresh || !hasLookedUp) {
      setCountdown(60);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger Lookup silently and specify isRefresh = true to skip pivot query
          handleLookup(true, true);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefresh, hasLookedUp, date, factory, data]);

  // Export current list to Excel
  const handleExportExcel = async () => {
    if (filteredData.length === 0) {
      toast.warning("No data available to export", { theme: "dark" });
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Integrated Line Monitoring");

    // Enable gridlines
    ws.views = [{ showGridLines: true }];

    // Column Definitions (without header fields to prevent automatic row 1 rendering)
    const columns = [
      { key: "lineName", width: 16 },
      { key: "styleNo", width: 25 },
      { key: "employee", width: 24 },
      { key: "orderQty", width: 16 },
      { key: "todayQc", width: 18 },
      { key: "avgPerHour", width: 16 },
      { key: "totalQc", width: 18 },
      { key: "completionRate", width: 18 },
    ];
    ws.columns = columns as any;

    // 1. Title Row: "Integrated Line Monitoring"
    ws.mergeCells(2, 1, 2, columns.length);
    const titleCell = ws.getCell(2, 1);
    titleCell.value = "Integrated Line Monitoring";
    titleCell.font = {
      name: "Times New Roman",
      bold: true,
      size: 18,
      color: { argb: "FF000000" },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(2).height = 35;

    // Row 3 is kept empty as spacing

    // 2. Header Row styling (Row 4)
    const headerRow = ws.getRow(4);
    headerRow.height = 24;
    headerRow.font = {
      name: "Times New Roman",
      bold: true,
      size: 11,
      color: { argb: "FFFFFFFF" },
    };
    headerRow.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    const headers = [
      "Line Name",
      "Style No",
      "Employee (Operators)",
      "Order Qty",
      "Today QC Output",
      "Avg Per Hour",
      "Total QC Output",
      "Completion Rate",
    ];

    for (let c = 1; c <= columns.length; c++) {
      const cell = ws.getCell(4, c);
      cell.value = headers[c - 1]; // Set header text explicitly
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" }, // Standard theme blue
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
    }

    // 3. Add Data Rows
    filteredData.forEach((item, index) => {
      const completionRateVal =
        item.TOTAL_ORD_QTY > 0
          ? item.TOTAL_QC_COUNTING / item.TOTAL_ORD_QTY
          : 0;

      const newRow = ws.addRow({
        lineName: item.LINE_NAME,
        styleNo: item.STYLE_NO || "-",
        employee: item.TOTAL_EMPLOYEE,
        orderQty: item.TOTAL_ORD_QTY,
        todayQc: item.TODAY_QC_COUNTING,
        avgPerHour: item.TOTAL_QC_AVG_PER_HOUR,
        totalQc: item.TOTAL_QC_COUNTING,
        completionRate: completionRateVal,
      });

      newRow.height = 20;

      // Zebra striping color for alternating rows (odd data rows get a light blue-gray fill)
      const isEvenRow = index % 2 === 0;
      const rowFillColor = isEvenRow ? "FFFFFFFF" : "FFD9E1F2"; // White or Light Blue-gray

      for (let c = 1; c <= columns.length; c++) {
        const cell = newRow.getCell(c);

        // Formats & alignments based on column index
        if (c === 1 || c === 2) {
          // Line Name & Style No: Centered
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (c === 8) {
          // Completion Rate: Percent format, right-aligned
          cell.numFmt = "0.0%";
          cell.alignment = { vertical: "middle", horizontal: "right" };
        } else {
          // Quantities & Averages: Number format with thousands separator, right-aligned
          cell.numFmt = "#,##0";
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }

        cell.font = {
          name: "Times New Roman",
          size: 11,
          color: { argb: "FF000000" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowFillColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFD9D9D9" } },
          left: { style: "thin", color: { argb: "FFD9D9D9" } },
          bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
          right: { style: "thin", color: { argb: "FFD9D9D9" } },
        };
      }
    });

    // Write file to download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const formattedDate = format(appliedFilters?.date || date, "yyyy-MM-dd");
    a.download = `Integrated_Line_Monitoring_${appliedFilters?.factory || factory}_${formattedDate}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success("Excel spreadsheet exported successfully!", {
      theme: "dark",
    });
  };

  // Pivot data Map for O(1) lookups: key is `lineName_styleNo` lowercased and trimmed
  const pivotMap = useMemo(() => {
    const map = new Map<string, any>();
    pivotData.forEach((p) => {
      const line = (p.LINE_NAME || "").trim().toLowerCase();
      const style = (p.STYLE_NO || "").trim().toLowerCase();
      map.set(`${line}_${style}`, p);
    });
    return map;
  }, [pivotData]);

  // Initial lookup on load is removed to prevent loading data before user clicks Lookup



  // Summary Metrics calculations
  const metrics = useMemo(() => {
    const activeLines = filteredData.length;
    const totalEmployee = filteredData.reduce(
      (acc, curr) => acc + curr.TOTAL_EMPLOYEE,
      0,
    );
    const todayQcOutput = filteredData.reduce(
      (acc, curr) => acc + curr.TODAY_QC_COUNTING,
      0,
    );
    const totalQcAvgPerHour = filteredData.reduce(
      (acc, curr) => acc + curr.TOTAL_QC_AVG_PER_HOUR,
      0,
    );

    return {
      activeLines,
      totalEmployee,
      todayQcOutput,
      totalQcAvgPerHour,
    };
  }, [filteredData]);

  const inputClasses =
    "px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-gray-200 shadow-sm";
  const labelClasses =
    "text-sm font-medium text-gray-300 uppercase tracking-wide";
  const groupClasses = "flex items-center gap-3";

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-200 overflow-x-hidden font-inter selection:bg-blue-500/30 selection:text-white pb-12">
      <ToastContainer
        position="bottom-right"
        theme="dark"
        toastClassName="bg-[#111827] border border-slate-800 text-slate-200 rounded-xl shadow-2xl"
      />

      <style>{`
        /* Float the calendar popper on top of all elements */
        .react-datepicker-popper {
          z-index: 9999 !important;
        }

        /* Solid Dark Calendar styling to match dark theme */
        .react-datepicker {
          background-color: #1e293b !important; /* solid slate-800 background */
          border: 1px solid #334155 !important; /* solid border */
          border-radius: 1.25rem !important;
          color: #f1f5f9 !important;
          font-family: inherit !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.6) !important;
          overflow: hidden;
        }

        .react-datepicker__header {
          background-color: #0f172a !important; /* solid header background */
          border-bottom: 1px solid #334155 !important;
          border-top-left-radius: 1.25rem !important;
          border-top-right-radius: 1.25rem !important;
          padding-top: 14px !important;
          padding-bottom: 8px !important;
        }

        .react-datepicker__current-month,
        .react-datepicker__day-name,
        .react-datepicker-time__header {
          color: #f1f5f9 !important;
          font-weight: 700 !important;
        }

        .react-datepicker__day-name {
          color: #94a3b8 !important; /* muted gray for weekday names */
        }

        .react-datepicker__day {
          color: #e2e8f0 !important;
        }

        .react-datepicker__day:hover {
          background-color: #334155 !important; /* hover select color */
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
          background-color: #3556df !important; /* solid deep blue */
          color: #ffffff !important;
          border-radius: 0.5rem !important;
          font-weight: bold !important;
        }

        .react-datepicker__navigation {
          top: 14px !important;
        }

        .react-datepicker__day--outside-month {
          color: #475569 !important; /* very dark gray for days of other months */
        }
      `}</style>

      {/* Sticky Header with Filter Panel */}
      {!selectedLineName && (
        <div className="bg-gray-900 border-b border-gray-700 shadow-sm sticky top-0 z-50">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
              {/* Title / Back Button Section */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/")}
                  className="mr-2 p-2 hover:bg-gray-800 border border-gray-700 rounded-md transition-colors text-gray-400 hover:text-white flex items-center justify-center shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Boxes className="w-8 h-8 text-blue-400 shrink-0" />
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                  Integrated Line Monitoring
                </h1>
              </div>

              {/* Filter Inputs & Action Buttons */}
              <div className="flex-1 flex flex-wrap items-center justify-end gap-4 lg:gap-6">
                {/* Date Selector */}
                <div className={groupClasses}>
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <label className={labelClasses}>Date</label>
                  <DatePicker
                    selected={date}
                    onChange={(d: Date) => d && setDate(d)}
                    dateFormat="yyyy-MM-dd"
                    className={inputClasses}
                  />
                </div>

                {/* Factory Selector */}
                <div className={groupClasses}>
                  <label className={labelClasses}>Factory</label>
                  <select
                    value={factory}
                    onChange={(e) =>
                      setFactory(e.target.value as DisplayFactoryCode)
                    }
                    className={inputClasses}
                  >
                    {DISPLAY_FACTORY_CODES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Style Selector */}
                <div className={groupClasses}>
                  <Tag className="w-5 h-5 text-gray-400" />
                  <label className={labelClasses}>Style</label>
                  <select
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value)}
                    className={`${inputClasses} min-w-[140px]`}
                  >
                    <option value="">All Styles</option>
                    {availableStyles.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lookup Button */}
                <button
                  onClick={() => handleLookup()}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <RefreshCcw className="w-4 h-4" />
                  )}
                  Lookup
                </button>

                {/* Auto-Refresh Toggle */}
                {hasLookedUp && (
                  <div className="flex items-center gap-2 bg-gray-850 border border-gray-700 px-3 py-2 rounded-md text-xs font-semibold select-none shadow-sm">
                    <span className="text-gray-300">Auto Refresh</span>
                    <button
                      onClick={() => setAutoRefresh(!autoRefresh)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoRefresh ? "bg-blue-600" : "bg-gray-600"}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoRefresh ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                    {autoRefresh && (
                      <span className="text-blue-400 font-extrabold text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 ml-1">
                        {countdown}s
                      </span>
                    )}
                  </div>
                )}

                {/* Excel Export Button */}
                {hasLookedUp && (
                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors duration-200 font-medium shadow-sm flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Excel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-blue-600/5 rounded-full blur-[140px] pointer-events-none"></div>

      {selectedLineName ? (
        (() => {
          const selectedItem = data.find((item) => item.LINE_NAME === selectedLineName);
          return (
            <LineDetails
              lineName={selectedLineName}
              lineCode={selectedItem?.LINE_CODE || ""}
              styleNo={selectedStyle || selectedItem?.STYLE_NO || ""}
              factory={appliedFilters?.factory || factory}
              date={format(appliedFilters?.date || date, "yyyy-MM-dd")}
              onBack={() => setSelectedLineName(null)}
              lineItem={selectedItem}
              onLineChange={(name) => {
                setSelectedLineName(name);
                const targetItem = data.find((item) => item.LINE_NAME === name);
                setSelectedStyle(targetItem?.STYLE_NO || "");
              }}
              allLines={data}
              onDateChange={(newDateStr) => {
                try {
                  const newD = parseISO(newDateStr);
                  setDate(newD);
                  if (appliedFilters) {
                    setAppliedFilters({ ...appliedFilters, date: newD });
                  }
                } catch (e) {
                  console.error("Failed to parse date from LineDetails:", e);
                }
              }}
              onStyleChange={(newStyle) => {
                setSelectedStyle(newStyle);
              }}
            />
          );
        })()
      ) : (
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-8">
          {/* Subtitle Header */}
          <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-100">
                Line Performance Dashboard
              </h2>
              <p className="mt-1 text-sm text-slate-400 font-medium">
                Real-time dashboard monitoring production lines, active styles,
                employee, and QC outputs.
              </p>
            </div>

            {hasLookedUp ? (
          <>
            {/* Summary Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {/* Card 1 */}
              <div className="bg-[#111827]/60 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all duration-300"></div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    Active Lines
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-white">
                    {metrics.activeLines}
                  </span>
                  <span className="text-slate-500 text-[10px] font-semibold">
                    Lines
                  </span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#111827]/60 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all duration-300"></div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    Total Employee
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-white">
                    {metrics.totalEmployee}
                  </span>
                  <span className="text-slate-500 text-[10px] font-semibold">
                    Operators
                  </span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#111827]/60 border border-slate-800 rounded-2xl p-4 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all duration-300"></div>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    Total Today Production (QC)
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-white">
                    {metrics.todayQcOutput.toLocaleString()}
                  </span>
                  <span className="text-slate-500 text-[10px] font-semibold">
                    Pcs
                  </span>
                </div>
              </div>
            </div>

            {/* List of Line Cards */}
            <div className="space-y-6">

              {loading && data.length === 0 ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-[#111827]/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden p-6 animate-pulse"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* Column 1 Skeleton: Line Identity */}
                        <div className="lg:col-span-2 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-4 lg:pb-0 pr-0 lg:pr-4">
                          <div className="h-3 w-12 bg-slate-800/80 rounded mb-2"></div>
                          <div className="h-7 w-20 bg-slate-800/80 rounded mb-3"></div>
                          <div className="h-8 w-full bg-slate-800/40 rounded-xl"></div>
                        </div>

                        {/* Column 2 Skeleton: Style & Order details */}
                        <div className="lg:col-span-2 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-4 lg:pb-0 pr-0 lg:pr-4">
                          <div className="mb-3">
                            <div className="h-3 w-16 bg-slate-800/80 rounded mb-2"></div>
                            <div className="h-5 w-32 bg-slate-800/80 rounded"></div>
                          </div>
                          <div>
                            <div className="h-3 w-24 bg-slate-800/80 rounded mb-2"></div>
                            <div className="h-5 w-28 bg-slate-800/80 rounded"></div>
                          </div>
                        </div>

                        {/* Column 3 Skeleton: QC Output & Progress */}
                        <div className="lg:col-span-4 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-slate-800/80 pb-4 lg:pb-0 pr-0 lg:pr-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="h-3 w-28 bg-slate-800/80 rounded mb-2"></div>
                              <div className="h-6 w-20 bg-slate-800/80 rounded"></div>
                            </div>
                            <div>
                              <div className="h-3 w-36 bg-slate-800/80 rounded mb-2"></div>
                              <div className="h-6 w-24 bg-slate-800/80 rounded"></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <div className="h-3 w-48 bg-slate-800/80 rounded"></div>
                              <div className="h-3 w-16 bg-slate-800/80 rounded"></div>
                            </div>
                            <div className="w-full h-2 bg-slate-800/80 rounded-full"></div>
                          </div>
                        </div>

                        {/* Column 4 Skeleton: Modules List */}
                        <div className="lg:col-span-4 flex flex-col justify-center pl-0 lg:pl-4">
                          <div className="h-3 w-32 bg-slate-800/80 rounded mb-2.5"></div>
                          <div className="text-slate-500 text-[11px] italic">this data is temporarily disabled</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredData.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredData.slice(0, visibleCount).map((item, index) => {

                    // Fetch matching pivot modules using O(1) Map lookup
                    const lineKey = `${item.LINE_NAME.trim().toLowerCase()}_${(item.STYLE_NO || "").trim().toLowerCase()}`;
                    const pRow = pivotMap.get(lineKey);

                    const moduleInputs: { name: string; quantity: number }[] =
                      [];
                    if (pRow) {
                      Object.entries(pRow).forEach(([key, val]) => {
                        if (key.toLowerCase().endsWith("_input_all")) {
                          if (val !== null && val !== undefined) {
                            const cleanName = key
                              .slice(0, -10)
                              .replace(/_/g, " ")
                              .trim();
                            moduleInputs.push({
                              name: cleanName,
                              quantity: Number(val),
                            });
                          }
                        }
                      });
                    }

                    return (
                      <LineCard
                        key={`${item.LINE_CODE}_${item.STYLE_NO}_${index}`}
                        item={item}
                        moduleInputs={moduleInputs}
                        loadingPivot={loadingPivot}
                        workDate={format(date, "yyyy-MM-dd")}
                        factory={appliedFilters?.factory || factory}
                        index={index}
                        onRefresh={() => handleLookup(true, true)}
                        onShowDetails={() => {
                          setSelectedLineName(item.LINE_NAME);
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#111827]/60 border border-slate-800 rounded-3xl py-20 text-center text-slate-500 font-medium">
                  No matching records found. Try modifying your filters or
                  search query.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-[#111827]/40 border border-slate-800/80 rounded-3xl p-16 text-center relative overflow-hidden shadow-2xl">
            {/* Ambient background glow inside placeholder */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 max-w-md mx-auto flex flex-col items-center gap-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl">
                <Search className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight mt-2">
                Ready to Monitor
              </h3>
              <p className="text-sm text-slate-400">
                Select a date and factory, then click{" "}
                <strong className="text-blue-400 font-semibold">Lookup</strong>{" "}
                to retrieve monitoring data.
              </p>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default IntegratedLineMonitoring;
