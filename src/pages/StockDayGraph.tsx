import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Header from '../components/StockDayGraph/Header';
import ModuleDistributionChart from '../components/StockDayGraph/ModuleDistributionChart';
import MetricsPanel from '../components/StockDayGraph/MetricsPanel';
import EmployeeChart from '../components/StockDayGraph/EmployeeChart';
import { ChartSkeleton, MetricsPanelSkeleton, EmployeeChartSkeleton, BottleneckTableSkeleton } from '../components/StockDayGraph/Skeletons';
import { DashboardFilters } from '../types/dashboard';
import { InOutChartResponse, PerformanceMetricsResponse, EmployeePerformanceByPart, LineResponse, OutputDetailResponse } from '../types/api';
import { fetchInOutChart, fetchPerformanceMetrics, fetchHourlyProduction, fetchEmployeePerformanceData, fetchLines, updateEmployeeCbid, fetchAvailableCbid, fetchManualTargetWH } from '../services/api';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, Search, X } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { DetailModal } from '../components/StockDayGraph/EmployeeChart';
import { fetchStockOperator } from '../services/stockOperator';

// Hourly mapping is handled by the service; UI uses data as-is

const partColors: { [key: string]: string } = {
  'PART': '#ffcc00',
  'LINING': '#ffcc00',
  'HOOD': '#ffcc00',
  'FRONT': '#ffcc00',
  'BACK SLEEVE': '#ffcc00',
  'BACKSLEEVE': '#ffcc00',
  'JOIN': '#ffcc00',
  'ASSEMBLY': '#ffcc00'
};

// Warna random untuk part lainnya
const randomColors = [
  '#ffcc00', // Hijau
];

// Fungsi untuk mendapatkan warna berdasarkan part name
const getColorByIndex = (partName: string, allParts: string[]): string => {
  // Cek apakah part memiliki warna spesifik
  const normalizedPartName = partName.toUpperCase();
  for (const [key, color] of Object.entries(partColors)) {
    if (normalizedPartName.includes(key)) {
      return color;
    }
  }

  // Jika tidak ada warna spesifik, gunakan warna random
  const index = allParts.indexOf(partName);
  return randomColors[index % randomColors.length];
};

const AvailableCbidModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lineNo: string;
  factory: string;
}> = ({ isOpen, onClose, lineNo, factory }) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [availableData, setAvailableData] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!lineNo || !isOpen) return;
    try {
      setLoading(true);
      const res = await fetchAvailableCbid({ lineNo });
      setAvailableData(res || []);
    } catch (e) {
      toast.error('Failed to load available CBID');
    } finally {
      setLoading(false);
    }
  }, [lineNo, isOpen]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] transition-all duration-300 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-[90vw] max-w-lg flex flex-col transform scale-100 transition-all duration-300 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-4 sm:p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold">Available CBID</h3>
            <p className="text-sm text-blue-200 mt-1">Line {lineNo}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blue-700/50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto custom-scrollbar bg-gray-900 max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : availableData.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No available CBID found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-700 text-sm">
                <thead>
                  <tr>
                    {Object.keys(availableData[0] || {}).map((key) => (
                      <th key={key} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 bg-gray-800">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {availableData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                      {Object.keys(item).map((key) => (
                        <td key={key} className="px-4 py-2 text-gray-200 font-medium whitespace-nowrap">
                          {item[key] != null ? String(item[key]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-800 bg-gray-900 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors font-semibold"
          >
            Close
          </button>
          <button
            onClick={async () => {
              try {
                setGenerating(true);
                await updateEmployeeCbid({
                  lineId: lineNo,
                  officeCode: factory,
                  createdBy: 'SYSTEM'
                });
                toast.success('CBID Generated successfully');
                await loadData();
              } catch (error) {
                toast.error('Failed to generate CBID');
              } finally {
                setGenerating(false);
              }
            }}
            disabled={generating || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {generating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Generate New CBID
          </button>
        </div>
      </div>
    </div>
  );
};


// Dummy data generators
const generateDummyChartData = (): InOutChartResponse[] => {
  const parts = ['PART', 'LINING', 'HOOD', 'FRONT', 'BACK SLEEVE', 'JOIN', 'ASSEMBLY'];
  return parts.map(part => ({
    PART: part,
    TOTALIN: Math.floor(Math.random() * 500) + 200,
    TOTALOUT: Math.floor(Math.random() * 500) + 200,
    WORK_DATE: new Date().toISOString().split('T')[0]
  }));
};

const generateDummyMetrics = (): PerformanceMetricsResponse => {
  const target = Math.floor(Math.random() * 1000) + 500;
  const actual = Math.floor(Math.random() * target);
  return {
    LINENAME: 'LINE 1',
    WORK_DATE: new Date().toISOString().split('T')[0],
    TARGET: target,
    ACTUAL: actual,
    ACHIEVEMENT: (actual / target) * 100,
    TargetDay: target,
    TargetDay_Percentage: ((actual / target) * 100).toFixed(2),
  };
};

const generateDummyHourlyData = () => {
  return Array.from({ length: 14 }, (_, i) => ({
    time: `${String(i + 8).padStart(2, '0')}:00`,
    output: Math.floor(Math.random() * 100) + 20
  }));
};

const generateDummyEmployeeData = (): { byPart: EmployeePerformanceByPart; bySplitModule: EmployeePerformanceByPart } => {
  const parts = ['PART', 'LINING', 'HOOD', 'FRONT', 'BACK SLEEVE', 'JOIN', 'ASSEMBLY'];
  const byPart: EmployeePerformanceByPart = {};

  parts.forEach(part => {
    const employeeCount = Math.floor(Math.random() * 8) + 3;
    byPart[part] = {
      chartData: Array.from({ length: employeeCount }, (_, i) => ({
        name: `Employee ${i + 1}`,
        output: Math.floor(Math.random() * 100) + 20,
        average: Math.floor(Math.random() * 80) + 30,
        nik: `NIK${1000 + i}`,
        employeeName: `Employee ${i + 1}`,
        statusColor: Math.random() > 0.3 ? '#10b981' : '#ef4444'
      })),
      tableData: Array.from({ length: employeeCount }, (_, i) => ({
        name: `Employee ${i + 1}`,
        nik: `NIK${1000 + i}`,
        actual: Math.floor(Math.random() * 100) + 20,
        asmOutput: Math.floor(Math.random() * 100) + 20,
        target: Math.floor(Math.random() * 100) + 50,
        isBottleneck: Math.random() > 0.7,
        status: Math.random() > 0.3 ? 'Active' : 'Inactive',
        statusColor: Math.random() > 0.3 ? '#10b981' : '#ef4444'
      }))
    };
  });

  return { byPart, bySplitModule: byPart };
};

const processStockDataToState = (rawData: any[], dateStr: string) => {
  const moduleMap = new Map<string, any[]>();
  rawData.forEach(item => {
    const mod = item.MODULE || 'UNKNOWN';
    if (!moduleMap.has(mod)) {
      moduleMap.set(mod, []);
    }
    moduleMap.get(mod)!.push(item);
  });

  const newChartData: InOutChartResponse[] = [];
  const newByPart: EmployeePerformanceByPart = {};
  const newBySplitModule: EmployeePerformanceByPart = {};

  moduleMap.forEach((items, mod) => {
    const lastOp = items[items.length - 1];
    const lastStockDays = lastOp.STOCK_DAYS != null ? Number(lastOp.STOCK_DAYS) : 0;
    newChartData.push({
      PART: mod,
      TOTALIN: 0,
      TOTALOUT: Math.max(0, lastStockDays),
      WORK_DATE: dateStr
    });

    newByPart[mod] = {
      chartData: items.map(op => {
        const sd = op.STOCK_DAYS != null ? Number(op.STOCK_DAYS) : 0;
        return {
          name: op.E_NAME,
          output: Math.max(0, sd),
          average: op.AVERAGE_PER_PART || 0,
          nik: op.NIK,
          employeeName: op.E_NAME,
          statusColor: op.STATUS_COLOR,
          cbOutput: op.TODAY_OUTPUT || 0,
          actual: op.ACTUAL || 0,
          stockDays: sd,
          stockOp: op.STOCK_OP != null ? Number(op.STOCK_OP) : 0
        };
      }),
      tableData: items.map(op => ({
        name: op.E_NAME,
        nik: op.NIK,
        actual: op.TODAY_OUTPUT || 0,
        asmOutput: op.QC_OUTPUT || 0,
        target: op.AVERAGE_PER_PART || 0,
        isBottleneck: op.STATUS_OUTPUT === 'Deficient' || op.STATUS_OUTPUT === 'Warning',
        status: op.STATUS_OUTPUT,
        statusColor: op.STATUS_COLOR
      }))
    };
  });

  const splitModuleMap = new Map<string, any[]>();
  rawData.forEach(item => {
    const mod = item.SPLIT_MODULE || item.MODULE || 'UNKNOWN';
    if (!splitModuleMap.has(mod)) {
      splitModuleMap.set(mod, []);
    }
    splitModuleMap.get(mod)!.push(item);
  });

  splitModuleMap.forEach((items, mod) => {
    newBySplitModule[mod] = {
        chartData: items.map(op => {
          const sd = op.STOCK_DAYS != null ? Number(op.STOCK_DAYS) : 0;
          return {
            name: op.E_NAME,
            output: Math.max(0, sd),
            average: op.AVERAGE_PER_PART || 0,
            nik: op.NIK,
            employeeName: op.E_NAME,
            statusColor: op.STATUS_COLOR,
            cbOutput: op.TODAY_OUTPUT || 0,
            actual: op.ACTUAL || 0,
            stockDays: sd,
            stockOp: op.STOCK_OP != null ? Number(op.STOCK_OP) : 0
          };
        }),
        tableData: items.map(op => ({
          name: op.E_NAME,
          nik: op.NIK,
          actual: op.TODAY_OUTPUT || 0,
          asmOutput: op.QC_OUTPUT || 0,
          target: op.AVERAGE_PER_PART || 0,
          isBottleneck: op.STATUS_OUTPUT === 'Deficient' || op.STATUS_OUTPUT === 'Warning',
          status: op.STATUS_OUTPUT,
          statusColor: op.STATUS_COLOR
        }))
    };
  });

  return { newChartData, newByPart, newBySplitModule };
};

const StockDayGraph: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    date: new Date(),
    factory: "",
    line: "",
    style: "",
    startTime: '06:00',
    endTime: '21:00',
  });

  // Tambahkan state untuk menyimpan LINE yang sudah dikonversi
  const [actualLineName, setActualLineName] = useState<string>("");

  // Tambahkan state untuk error per widget
  const [widgetErrors, setWidgetErrors] = useState<{
    chart?: string;
    metrics?: string;
    hourly?: string;
    employee?: string;
  }>({});

  const [chartData, setChartData] = useState<InOutChartResponse[]>([]);
  const [metricsData, setMetricsData] = useState<PerformanceMetricsResponse | null>(null);
  const [hourlyData, setHourlyData] = useState<{ time: string; output: number }[]>([]);
  const [ytdHourlyData, setYtdHourlyData] = useState<{ time: string; output: number }[]>([]);
  const [avgPerHour, setAvgPerHour] = useState<number | null>(null);
  const [avgPerHourYesterday, setAvgPerHourYesterday] = useState<number | null>(null);
  const [workingHour, setWorkingHour] = useState<number | null>(null);
  const [jamPulang, setJamPulang] = useState<string>('');
  const [employeeData, setEmployeeData] = useState<{ byPart: EmployeePerformanceByPart; bySplitModule: EmployeePerformanceByPart }>({ byPart: {}, bySplitModule: {} });
  const [chartMode, setChartMode] = useState<'main' | 'split'>('main');
  const [lines, setLines] = useState<LineResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmployeeCharts, setShowEmployeeCharts] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const [, setLastSuccessParams] = useState<{
    factory: string;
    line: string;
    style: string;
    date: Date;
  } | null>(null);

  const [bottleneckCurrentPage, setBottleneckCurrentPage] = useState(1);
  const [bottleneckSlideDirection, setBottleneckSlideDirection] = useState<'left' | 'right'>('right');
  const bottleneckSlideIntervalRef = useRef<number>();
  const tablesPerPage = 4;

  const [showAllModules, setShowAllModules] = useState(false);
  const [showNullCBOutput, setShowNullCBOutput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAvailableCbidModalOpen, setIsAvailableCbidModalOpen] = useState(false);

  const activeEmployeeData = useMemo(() => {
    return chartMode === 'split' ? employeeData.bySplitModule : employeeData.byPart;
  }, [employeeData, chartMode]);

  const filteredEmployeeDataEntries = useMemo(() => {
    let entries = Object.entries(activeEmployeeData);
    if (!showAllModules) {
      const assemblyIndex = entries.findIndex(([key]) => key.toUpperCase() === 'ASSEMBLY');
      if (assemblyIndex !== -1) {
        entries = entries.slice(0, assemblyIndex + 1);
      }
    }

    if (!showNullCBOutput) {
      entries = entries.map(([partName, partData]) => [
        partName,
        {
          ...partData,
          chartData: partData.chartData.filter(op => {
            const td = partData.tableData.find(t => t.nik === op.nik);
            return td ? td.actual > 0 : true;
          }),
          tableData: partData.tableData.filter(op => op.actual > 0)
        }
      ]);
    }
    return entries;
  }, [activeEmployeeData, showAllModules, showNullCBOutput]);

  const searchedEmployeeDataEntries = useMemo(() => {
    if (!searchQuery.trim()) return filteredEmployeeDataEntries;

    const query = searchQuery.toLowerCase();

    const mergedChartData: any[] = [];
    const mergedTableData: any[] = [];

    filteredEmployeeDataEntries.forEach(([partName, partData]) => {
      const matchingChart = (partData.chartData || []).filter((op: any) =>
        (op.name || op.E_NAME || '').toLowerCase().includes(query)
      ).map((op: any) => ({ ...op, name: `${op.name || op.E_NAME} (${partName})` }));

      const matchingTable = (partData.tableData || []).filter((op: any) =>
        (op.name || op.E_NAME || '').toLowerCase().includes(query)
      ).map((op: any) => ({ ...op, name: `${op.name || op.E_NAME} (${partName})` }));

      mergedChartData.push(...matchingChart);
      mergedTableData.push(...matchingTable);
    });

    if (mergedChartData.length === 0 && mergedTableData.length === 0) {
      return [];
    }

    return [['Search Results', {
      chartData: mergedChartData,
      tableData: mergedTableData
    }]] as Array<[string, any]>;
  }, [filteredEmployeeDataEntries, searchQuery]);

  // Ubah chartsPerPage menjadi dinamis
  const chartsPerPage = useMemo(() => {
    // Cek jika ada part dengan 10 bar atau lebih
    const adaChartBesar = searchedEmployeeDataEntries.some(([, data]) => Array.isArray(data.chartData) && data.chartData.length >= 10);
    return adaChartBesar ? 2 : 3;
  }, [searchedEmployeeDataEntries]);
  const slideIntervalRef = useRef<number>();
  const autoRefreshIntervalRef = useRef<number>();
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [isFullScaleMode, setIsFullScaleMode] = useState(false);
  const isFetchingRef = useRef(false);
  const requestSeqRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isEmployeeAutoScrollEnabled, setIsEmployeeAutoScrollEnabled] = useState(true);
  const [isBottleneckAutoScrollEnabled, setIsBottleneckAutoScrollEnabled] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<OutputDetailResponse[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State untuk swipe functionality
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);

  // Definisikan fetchDataSilently sebagai fungsi biasa

  async function fetchDataSilently(params: {
    factory: string;
    line: string;
    style: string;
    period?: string;
    date: Date;
  }) {
    console.log('Silent fetch started at:', new Date().toLocaleTimeString());
    const seq = ++requestSeqRef.current;
    const isStale = () => seq !== requestSeqRef.current;

    try {
      const wasFullScreen = isFullScaleMode;

      // simulate delay
      await new Promise(r => setTimeout(r, 500));
      if (isStale()) return;

      const dateStr = params.date.toISOString().split('T')[0];
      const noline = params.line; // Assuming line is already line number, can map with fetchLines if needed like in EmployeeMonitoring

      let dateFromStr = dateStr;
      if (params.period) {
        const parts = params.period.split(" - ");
        if (parts.length >= 1) {
          const rawStart = parts[0].trim();
          dateFromStr = rawStart.length === 8
            ? `${rawStart.slice(0, 4)}-${rawStart.slice(4, 6)}-${rawStart.slice(6, 8)}`
            : rawStart;
        }
      }

      const stockData = await fetchStockOperator({
        factory: params.factory,
        lineNo: noline,
        styleNo: params.style,
        dateFrom: dateFromStr,
        dateTo: dateStr,
      });

      const { newChartData, newByPart, newBySplitModule } = processStockDataToState(stockData.data || [], dateStr);

      setChartData(newChartData);
      setEmployeeData({ byPart: newByPart, bySplitModule: newBySplitModule });

      let manualTarget: number | null = null;
      let manualWH: number | null = null;
      try {
        const manualResult = await fetchManualTargetWH({
          factory: params.factory,
          lineno: noline,
          styleno: params.style,
          workdate: dateStr
        });
        manualTarget = manualResult.TARGET;
        manualWH = manualResult.WORKING_HOUR;
      } catch (err) {
        console.error('Error fetching manual target:', err);
      }

      try {
        const metricsResult = await fetchPerformanceMetrics({
          workdate: dateStr,
          linename: noline,
          styleno: params.style,
          factory: params.factory
        });
        if (isStale()) return;
        if (metricsResult && metricsResult[0]) {
          const updatedMetrics = { ...metricsResult[0] };
          if (manualTarget !== null) updatedMetrics.TARGET = manualTarget;
          setMetricsData(updatedMetrics);
        } else if (!metricsData) {
          const dummyMetrics: PerformanceMetricsResponse = {
            LINENAME: noline,
            WORK_DATE: dateStr,
            TARGET: manualTarget || 0,
            ACTUAL: 0,
            ACHIEVEMENT: 0,
            TargetDay: 0,
            TargetDay_Percentage: '0',
          };
          setMetricsData(dummyMetrics);
        }
      } catch (error) {
        if (!metricsData) {
          const dummyMetrics: PerformanceMetricsResponse = {
            LINENAME: noline,
            WORK_DATE: dateStr,
            TARGET: manualTarget || 0,
            ACTUAL: 0,
            ACHIEVEMENT: 0,
            TargetDay: 0,
            TargetDay_Percentage: '0',
          };
          setMetricsData(dummyMetrics);
        }
      }

      try {
        const hourlyResult = await fetchHourlyProduction({
          datefrom: dateStr,
          lineno: noline,
        });
        if (isStale()) return;
        if (hourlyResult.today) {
          setHourlyData(hourlyResult.today);
        }
        if (hourlyResult.yesterday) {
          setYtdHourlyData(hourlyResult.yesterday);
        }
        setAvgPerHour(typeof hourlyResult.avgPerHour === 'number' ? hourlyResult.avgPerHour : null);
        setAvgPerHourYesterday(typeof hourlyResult.avgPerHourYesterday === 'number' ? hourlyResult.avgPerHourYesterday : null);
        setWorkingHour(manualWH !== null ? manualWH : (typeof hourlyResult.workingHour === 'number' ? hourlyResult.workingHour : null));
        setJamPulang(typeof hourlyResult.jamPulang === 'string' ? hourlyResult.jamPulang : '');
      } catch (error) {
        console.error('Error fetching hourly production:', error);
      }

      if (wasFullScreen && !isFullScaleMode) {
        document.documentElement.requestFullscreen();
        document.body.style.zoom = "60%";
        document.body.style.overflow = "hidden";
        document.body.style.background = "rgb(249 250 251)";
        setIsFullScaleMode(true);
      }
    } catch (error) {
      console.error('Auto refresh error:', error);
    }
  }


  const startAutoRefresh = useCallback(() => {
    console.log('Starting auto refresh service...');
    if (autoRefreshIntervalRef.current) {
      console.log('Clearing existing interval...');
      window.clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = undefined;
    }

    // Set interval untuk refresh setiap 30 detik
    const intervalId = window.setInterval(() => {
      if (document.hidden) { return; }
      // Gunakan filters langsung untuk auto refresh
      if (filters.line && filters.style && filters.period) {
        console.log('Auto refresh triggered at:', new Date().toLocaleTimeString());
        fetchDataSilently({
          factory: filters.factory,
          line: filters.line,
          style: filters.style,
          period: filters.period,
          date: filters.date
        });
      } else {
        console.log('Line, Style, or Period not selected, skipping auto refresh');
      }
    }, 120000); // 120000 ms = 120 detik

    // Simpan ID interval
    autoRefreshIntervalRef.current = intervalId;
    setIsAutoRefreshEnabled(true);
    console.log('Auto refresh service started with interval ID:', intervalId);

    // Lakukan refresh pertama segera
    if (filters.line && filters.style && filters.period) {
      console.log('Performing initial auto refresh...');
      fetchDataSilently({
        factory: filters.factory,
        line: filters.line,
        style: filters.style,
        period: filters.period,
        date: filters.date
      });
    } else {
      console.log('Line, Style, or Period not selected, skipping initial refresh');
    }
  }, [filters, isFullScaleMode]);

  // Cleanup effect untuk auto refresh
  useEffect(() => {
    return () => {
      console.log('Cleaning up auto refresh service...');
      if (autoRefreshIntervalRef.current) {
        window.clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = undefined;
      }
    };
  }, []);

  const stopAutoRefresh = useCallback(() => {
    console.log('Stopping auto refresh service...');
    if (autoRefreshIntervalRef.current) {
      window.clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = undefined;
    }
    setIsAutoRefreshEnabled(false);
  }, []);

  // Modifikasi handleLookup untuk menangani data kosong

  const handleLookup = async () => {
    if (!filters.line || !filters.style || !filters.period) {
      setWidgetErrors({ metrics: 'Silakan pilih line, style, dan period terlebih dahulu' });
      return;
    }

    if (isFetchingRef.current) {
      abortControllerRef.current?.abort();
    }

    try {
      isFetchingRef.current = true;
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setWidgetErrors({});
      setChartData([]);
      setMetricsData(null);
      setHourlyData([]);
      setYtdHourlyData([]);
      setEmployeeData({ byPart: {}, bySplitModule: {} });
      setCurrentPage(1);

      await new Promise(r => setTimeout(r, 800));

      const dateStr = filters.date.toISOString().split('T')[0];

      let dateFromStr = dateStr;
      if (filters.period) {
        const parts = filters.period.split(" - ");
        if (parts.length >= 1) {
          const rawStart = parts[0].trim();
          dateFromStr = rawStart.length === 8
            ? `${rawStart.slice(0, 4)}-${rawStart.slice(4, 6)}-${rawStart.slice(6, 8)}`
            : rawStart;
        }
      }

      let currentLines = lines;
      if (currentLines.length === 0) {
        try {
          currentLines = await fetchLines(filters.factory);
          setLines(currentLines);
        } catch (err) {
          console.error('Error fetching lines:', err);
        }
      }
      const selectedLine = currentLines.find(line => line.NOLINE === filters.line);
      const noline = selectedLine?.NOLINE || filters.line;
      setActualLineName(selectedLine?.LINE || filters.line);

      const stockData = await fetchStockOperator({
        factory: filters.factory,
        lineNo: noline,
        styleNo: filters.style,
        dateFrom: dateFromStr,
        dateTo: dateStr,
      });

      const { newChartData, newByPart, newBySplitModule } = processStockDataToState(stockData.data || [], dateStr);

      setChartData(newChartData);
      setEmployeeData({ byPart: newByPart, bySplitModule: newBySplitModule });

      let manualTarget: number | null = null;
      let manualWH: number | null = null;
      try {
        const manualResult = await fetchManualTargetWH({
          factory: filters.factory,
          lineno: noline,
          styleno: filters.style,
          workdate: dateStr
        });
        manualTarget = manualResult.TARGET;
        manualWH = manualResult.WORKING_HOUR;
      } catch (err) {
        console.error('Error fetching manual target:', err);
      }

      try {
        const metricsResult = await fetchPerformanceMetrics({
          workdate: dateStr,
          linename: noline,
          styleno: filters.style,
          factory: filters.factory
        });
        if (metricsResult && metricsResult[0]) {
          const updatedMetrics = { ...metricsResult[0] };
          if (manualTarget !== null) updatedMetrics.TARGET = manualTarget;
          setMetricsData(updatedMetrics);
        } else {
          const dummyMetrics: PerformanceMetricsResponse = {
            LINENAME: noline,
            WORK_DATE: dateStr,
            TARGET: manualTarget || 0,
            ACTUAL: 0,
            ACHIEVEMENT: 0,
            TargetDay: 0,
            TargetDay_Percentage: '0',
          };
          setMetricsData(dummyMetrics);
        }
      } catch (err) {
        const dummyMetrics: PerformanceMetricsResponse = {
          LINENAME: noline,
          WORK_DATE: dateStr,
          TARGET: 0,
          ACTUAL: 0,
          ACHIEVEMENT: 0,
          TargetDay: 0,
          TargetDay_Percentage: '0',
        };
        setMetricsData(dummyMetrics);
      }

      try {
        const hourlyResult = await fetchHourlyProduction({
          datefrom: dateStr,
          lineno: noline,
        });
        if (hourlyResult.today) {
          setHourlyData(hourlyResult.today);
        }
        if (hourlyResult.yesterday) {
          setYtdHourlyData(hourlyResult.yesterday);
        }
        setAvgPerHour(typeof hourlyResult.avgPerHour === 'number' ? hourlyResult.avgPerHour : null);
        setAvgPerHourYesterday(typeof hourlyResult.avgPerHourYesterday === 'number' ? hourlyResult.avgPerHourYesterday : null);
        setWorkingHour(manualWH !== null ? manualWH : (typeof hourlyResult.workingHour === 'number' ? hourlyResult.workingHour : null));
        setJamPulang(typeof hourlyResult.jamPulang === 'string' ? hourlyResult.jamPulang : '');
      } catch (err) {
        const dummyHourly = Array.from({ length: 24 }, (_, i) => ({
          time: `${String(i).padStart(2, '0')}:00`,
          output: 0
        }));
        setHourlyData(dummyHourly);
        setYtdHourlyData(dummyHourly);
        setAvgPerHour(null);
        setAvgPerHourYesterday(null);
        setWorkingHour(null);
        setJamPulang('');
      }

      setLastSuccessParams({
        factory: filters.factory,
        line: filters.line,
        style: filters.style,
        date: filters.date
      });

      startAutoRefresh();
    } catch (err) {
      console.error('Error during fetch:', err);
      stopAutoRefresh();
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };
  // Fungsi untuk membagi chart ke dalam pages sesuai aturan custom
  const paginatedCharts = useMemo(() => {
    const pages: Array<Array<[string, any]>> = [];
    let i = 0;
    while (i < searchedEmployeeDataEntries.length) {
      // Cek apakah salah satu dari 2 chart berikutnya punya >=10 bar
      const nextTwo = searchedEmployeeDataEntries.slice(i, i + 2);
      const adaBesar = nextTwo.some(([, data]) => Array.isArray(data.chartData) && data.chartData.length >= 10);
      if (adaBesar) {
        pages.push(nextTwo);
        i += 2;
      } else {
        // Ambil 3 chart jika tidak ada yang besar
        const nextThree = searchedEmployeeDataEntries.slice(i, i + 3);
        pages.push(nextThree);
        i += 3;
      }
    }
    return pages;
  }, [searchedEmployeeDataEntries]);

  // totalPages dan getCurrentCharts sekarang berdasarkan paginatedCharts
  const totalPages = paginatedCharts.length;
  const getCurrentCharts = useCallback(() => {
    return paginatedCharts[currentPage - 1] || [];
  }, [paginatedCharts, currentPage]);

  // Perbaikan: Gunakan window.setInterval agar return value selalu number (bukan Timeout)
  const handlePageChange = useCallback((page: number) => {
    setSlideDirection(page > currentPage ? 'left' : 'right');
    setCurrentPage(page);
    // Reset interval ketika user mengklik pagination
    if (slideIntervalRef.current) {
      window.clearInterval(slideIntervalRef.current);
    }
    if (isEmployeeAutoScrollEnabled && totalPages > 1) {
      slideIntervalRef.current = window.setInterval(() => {
        setSlideDirection('left');
        setCurrentPage(prev => prev === totalPages ? 1 : prev + 1);
      }, 10000);
    }
  }, [currentPage, totalPages, isEmployeeAutoScrollEnabled]);

  // Perbaikan: Gunakan window.setInterval dan window.clearInterval
  useEffect(() => {
    const startAutoSlide = () => {
      if (slideIntervalRef.current) {
        window.clearInterval(slideIntervalRef.current);
      }

      if (showEmployeeCharts && totalPages > 1 && isEmployeeAutoScrollEnabled) {
        slideIntervalRef.current = window.setInterval(() => {
          setSlideDirection('left');
          setCurrentPage(prev => prev === totalPages ? 1 : prev + 1);
        }, 10000);
      }
    };

    startAutoSlide();

    return () => {
      if (slideIntervalRef.current) {
        window.clearInterval(slideIntervalRef.current);
      }
    };
  }, [showEmployeeCharts, totalPages, isEmployeeAutoScrollEnabled]);

  // Memoize transformedData dengan warna yang konsisten
  const uniqueParts = useMemo(() => Array.from(new Set(chartData.map(item => item.PART))), [chartData]);
  const transformedData = useMemo(() => {
    const data = chartData.map(item => ({
      name: item.PART,
      input: item.TOTALIN,
      output: item.TOTALOUT,
      color: getColorByIndex(item.PART, uniqueParts)
    }));

    if (!showAllModules) {
      const assemblyIndex = data.findIndex(item => item.name.toUpperCase() === 'ASSEMBLY');
      if (assemblyIndex !== -1) {
        return data.slice(0, assemblyIndex + 1);
      }
    }

    return data;
  }, [chartData, uniqueParts, showAllModules]);

  // Cari part dengan output terkecil
  const minOutputPart = useMemo(() => {
    if (!transformedData.length) return null;
    const minOutput = Math.min(...transformedData.map(item => item.output));
    const minPart = transformedData.find(item => item.output === minOutput)?.name;
    return minPart || null;
  }, [transformedData]);

  // Memoize metrics data dengan dependency yang lengkap
  const metricsConfig = useMemo(() => ({
    todaysGoal: metricsData?.TARGET || 0,
    currentPerformance: metricsData?.ACTUAL || 0,
    achievementRate: metricsData?.ACHIEVEMENT || 0,
    hourlyProduction: hourlyData
  }), [metricsData, hourlyData]);

  // Current diambil dari total QC hourly, achievement dihitung manual
  const currentFromQC = useMemo(() => {
    return (hourlyData || []).reduce((sum, item) => sum + (item.output || 0), 0);
  }, [hourlyData]);

  const manualAchievement = useMemo(() => {
    const target = metricsData?.TARGET || 0;
    if (target <= 0) return 0;
    return (currentFromQC / target) * 100;
  }, [currentFromQC, metricsData]);

  const operatorBreakdown = useMemo(() => {
    return filteredEmployeeDataEntries.map(([partName, partData]) => ({
      label: partName,
      value: partData.chartData?.length || 0,
    }));
  }, [filteredEmployeeDataEntries]);
  // Hitung total operator dari semua part
  const totalOperators = useMemo(() => {
    return filteredEmployeeDataEntries.reduce((total, [, partData]) => {
      return total + (partData.chartData?.length || 0);
    }, 0);
  }, [filteredEmployeeDataEntries]);

  // Menghitung total halaman untuk bottleneck tables
  const bottleneckTotalPages = useMemo(() => {
    const tableCount = searchedEmployeeDataEntries.filter(([, data]) => data.tableData.length > 0).length;
    return Math.ceil(tableCount / tablesPerPage);
  }, [searchedEmployeeDataEntries]);

  // Get current bottleneck tables
  const getCurrentBottleneckTables = useCallback(() => {
    const tables = searchedEmployeeDataEntries.filter(([, data]) => data.tableData.length > 0);
    const indexOfLastTable = bottleneckCurrentPage * tablesPerPage;
    const indexOfFirstTable = indexOfLastTable - tablesPerPage;
    return tables.slice(indexOfFirstTable, indexOfLastTable);
  }, [searchedEmployeeDataEntries, bottleneckCurrentPage, tablesPerPage]);

  // Perbaikan: Gunakan window.setInterval dan window.clearInterval
  const handleBottleneckPageChange = useCallback((page: number) => {
    setBottleneckSlideDirection(page > bottleneckCurrentPage ? 'left' : 'right');
    setBottleneckCurrentPage(page);
    // Reset interval ketika user mengklik pagination
    if (bottleneckSlideIntervalRef.current) {
      window.clearInterval(bottleneckSlideIntervalRef.current);
    }
    if (isBottleneckAutoScrollEnabled && bottleneckTotalPages > 1) {
      bottleneckSlideIntervalRef.current = window.setInterval(() => {
        setBottleneckSlideDirection('left');
        setBottleneckCurrentPage(prev => prev === bottleneckTotalPages ? 1 : prev + 1);
      }, 10000);
    }
  }, [bottleneckCurrentPage, bottleneckTotalPages, isBottleneckAutoScrollEnabled]);

  // Auto slide effect untuk bottleneck tables
  useEffect(() => {
    const startAutoSlide = () => {
      if (bottleneckSlideIntervalRef.current) {
        window.clearInterval(bottleneckSlideIntervalRef.current);
      }

      if (bottleneckTotalPages > 1 && isBottleneckAutoScrollEnabled) {
        bottleneckSlideIntervalRef.current = window.setInterval(() => {
          setBottleneckSlideDirection('left');
          setBottleneckCurrentPage(prev => prev === bottleneckTotalPages ? 1 : prev + 1);
        }, 10000);
      }
    };

    startAutoSlide();

    return () => {
      if (bottleneckSlideIntervalRef.current) {
        clearInterval(bottleneckSlideIntervalRef.current);
      }
    };
  }, [bottleneckTotalPages, isBottleneckAutoScrollEnabled]);

  // Handler untuk klik karyawan
  const handleEmployeeClick = (employeeData: OutputDetailResponse[]) => {
    setSelectedEmployee(employeeData);
    setIsModalOpen(true);
  };

  // Modifikasi handleTouchStart
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    setTouchEnd(null);
    setTouchStart(touch.clientX);
    setIsSwiping(false); // Reset isSwiping state
  };

  // Modifikasi handleTouchMove
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.targetTouches[0];
    const currentX = touch.clientX;
    const diff = currentX - touchStart;

    // Hanya set isSwiping jika pergerakan cukup signifikan
    if (Math.abs(diff) > 10) {
      setIsSwiping(true);
    }

    setSwipeOffset(diff * 0.3);
    setTouchEnd(currentX);
  };

  // Modifikasi handleTouchEnd
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      setIsSwiping(false);
      return;
    }

    const distance = touchEnd - touchStart;

    // Hanya proses swipe jika memang sedang swiping
    if (isSwiping) {
      if (distance < -50 && currentPage < totalPages) {
        setSlideDirection('left');
        handlePageChange(currentPage + 1);
      } else if (distance > 50 && currentPage > 1) {
        setSlideDirection('right');
        handlePageChange(currentPage - 1);
      }
    }

    // Reset states
    setTouchStart(null);
    setTouchEnd(null);
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  // Mouse drag functionality untuk desktop
  const [mouseStart, setMouseStart] = useState<number | null>(null);
  const [mouseEnd, setMouseEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setMouseEnd(null);
    setMouseStart(e.clientX);
    setIsDragging(true);
    setSwipeOffset(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && mouseStart) {
      const diff = e.clientX - mouseStart; // Ubah arah diff
      setSwipeOffset(diff * 0.3); // Dampen the movement
      setMouseEnd(e.clientX);
    }
  };

  const handleMouseUp = () => {
    if (!mouseStart || !mouseEnd) {
      setSwipeOffset(0);
      setIsDragging(false);
      return;
    }

    const distance = mouseEnd - mouseStart; // Ubah arah distance
    const isLeftSwipe = distance < -50; // Drag kiri = mouse bergerak ke kiri
    const isRightSwipe = distance > 50; // Drag kanan = mouse bergerak ke kanan

    if (isLeftSwipe && currentPage < totalPages) {
      // Swipe left - next page
      setSlideDirection('left');
      handlePageChange(currentPage + 1);
    } else if (isRightSwipe && currentPage > 1) {
      // Swipe right - previous page
      setSlideDirection('right');
      handlePageChange(currentPage - 1);
    }

    // Reset mouse states
    setMouseStart(null);
    setMouseEnd(null);
    setIsDragging(false);
    setSwipeOffset(0);
  };

  const Section1Loading = () => (
    <div className="grid grid-cols-1 gap-4">
      <ChartSkeleton />
    </div>
  );

  const Section2Loading = () => (
    <div className="grid grid-cols-1 gap-4 min-h-[400px]">
      {[...Array(2)].map((_, i) => (
        <EmployeeChartSkeleton key={i} />
      ))}
    </div>
  );

  // Tambahkan event listener untuk fullscreenchange
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScaleMode(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Modifikasi fungsi toggleFullScaleMode
  const toggleFullScaleMode = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <ToastContainer
        position="top-right"
        autoClose={10000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      {/* Header dengan prop baru */}
      <div className={`sticky top-0 z-50 ${isFullScaleMode ? 'hidden' : 'bg-gray-900'}`}>
        <Header title="Stock Day Graph"
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            stopAutoRefresh();
          }}
          onLookup={handleLookup}
          className="bg-gray-900"
          onLineNameChange={setActualLineName}
        />
      </div>

      {/* Main content dengan padding yang disesuaikan */}
      <div className={`relative ${isFullScaleMode ? 'pt-0' : ''}`}>
        {/* Tombol Full Scale Mode */}
        <button
          onClick={toggleFullScaleMode}
          className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 ${isFullScaleMode
            ? 'bg-red-900 hover:bg-red-800'
            : 'bg-blue-900 hover:bg-blue-800'
            } text-white`}
          title={isFullScaleMode ? "Exit Full Scale Mode" : "Enter Full Scale Mode"}
        >
          {isFullScaleMode ? (
            <Minimize2 className="w-6 h-6" />
          ) : (
            <Maximize2 className="w-6 h-6" />
          )}
        </button>

        {/* Main Container */}
        <div className="bg-gray-900 shadow-sm min-h-screen">
          {/* Section 1 */}
          <div className="mx-4 py-2">
            <div className="flex flex-row justify-between items-center mb-2">
              <h2 className="text-lg font-semibold text-gray-100">Module Stock Day</h2>
              <div className="flex items-center gap-2">
                <h3 className="text-sm text-gray-300">
                  Date {filters.date.toISOString().split('T')[0]} | Line {actualLineName} | Style {filters.style}
                </h3>
                {isAutoRefreshEnabled && (
                  <div className="flex items-center gap-1 bg-green-900/50 text-green-300 px-2 py-1 rounded-md text-xs font-medium">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Realtime</span>
                  </div>
                )}
              </div>
            </div>
            {widgetErrors.metrics ? (
              <div className="text-red-400 text-center py-4">{widgetErrors.metrics}</div>
            ) : loading ? (
              <Section1Loading />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <ModuleDistributionChart
                  data={transformedData}
                  title="Stock Day"
                  type="output"
                  color={transformedData[0]?.color || randomColors[0]}
                  className="min-h-[250px]"
                />
              </div>
            )}
          </div>

          {/* Section 2 */}
          <div className="mx-4 py-2">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-100">Operator Stock Day</h2>
                <div className="flex items-center bg-gray-800 rounded-lg p-0.5 border border-gray-700">
                  <button
                    onClick={() => { setChartMode('main'); setCurrentPage(1); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${chartMode === 'main'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                      }`}
                  >
                    Main Module
                  </button>
                  <button
                    onClick={() => { setChartMode('split'); setCurrentPage(1); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${chartMode === 'split'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                      }`}
                  >
                    Split Module
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (!filters.line) {
                      toast.warning('Please select a line first');
                      return;
                    }
                    setIsAvailableCbidModalOpen(true);
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-200"
                >
                  Check Available CBID
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Search operator..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-gray-800 text-gray-200 border border-gray-700 rounded-md pl-8 pr-8 py-1 text-xs focus:outline-none focus:border-blue-500 w-32 sm:w-48 placeholder-gray-500"
                  />
                  <Search className="absolute left-2 w-3.5 h-3.5 text-gray-400" />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 text-gray-400 hover:text-gray-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded-md transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAllModules}
                    onChange={(e) => {
                      setShowAllModules(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="rounded bg-gray-900 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                  />
                  Show All Modules
                </label>
                <label className="flex items-center gap-2 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded-md transition-colors cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showNullCBOutput}
                    onChange={(e) => {
                      setShowNullCBOutput(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="rounded bg-gray-900 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                  />
                  Show Null CB Output
                </label>
                {totalPages > 1 && showEmployeeCharts && (
                  <button
                    onClick={() => setIsEmployeeAutoScrollEnabled(!isEmployeeAutoScrollEnabled)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
                    title={isEmployeeAutoScrollEnabled ? "Disable Auto Scroll" : "Enable Auto Scroll"}
                  >
                    {isEmployeeAutoScrollEnabled ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span className="hidden sm:inline">Stop Auto Scroll</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span className="hidden sm:inline">Start Auto Scroll</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setShowEmployeeCharts(!showEmployeeCharts)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
                >
                  {showEmployeeCharts ? (
                    <>
                      Hide Charts <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Show Charts <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
                {totalPages > 1 && showEmployeeCharts && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="hidden sm:inline">Swipe to navigate</span>
                    <div className="flex gap-1">
                      <ChevronLeft className="w-3 h-3" />
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {showEmployeeCharts && (
              loading ? <Section2Loading /> : (
                <div>
                  <div
                    className="relative overflow-hidden cursor-grab active:cursor-grabbing"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <div
                      className={`employee-charts-container transition-all duration-500 ease-in-out select-none ${isSwiping ? 'pointer-events-none' : ''
                        }`}
                      style={{
                        transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : 'none',
                        transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
                      }}
                    >
                      {getCurrentCharts().map(([part, data], idx, arr) => {
                        const uniqueParts = Array.from(new Set(Object.keys(activeEmployeeData)));
                        const isSingleChart = arr.length === 1;
                        const isRedPart = part === minOutputPart;
                        const chartContent = (
                          <EmployeeChart
                            data={data.chartData}
                            bottleneckData={data.tableData}
                            title={part}
                            color={getColorByIndex(part, uniqueParts)}
                            className="min-h-[250px]"
                            filters={{
                              factory: filters.factory,
                              date: filters.date,
                              line: filters.line,
                              style: filters.style
                            }}
                            targetDay={metricsData?.TARGET || 0}
                            onEmployeeClick={handleEmployeeClick}
                            isRedPart={isRedPart}
                          />
                        );
                        return (
                          <div key={part} className="animate-fade-in">
                            {chartContent}
                          </div>
                        );
                      })}
                    </div>

                    {/* Swipe indicator */}
                    {totalPages > 1 && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <div
                            key={page}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${currentPage === page
                              ? 'bg-blue-400'
                              : 'bg-gray-500'
                              }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pagination buttons (optional, bisa disembunyikan) */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-2">
                      <button
                        onClick={() => {
                          setSlideDirection('right');
                          handlePageChange(currentPage === 1 ? totalPages : currentPage - 1);
                        }}
                        className="p-1 rounded-full hover:bg-gray-800 transition-colors text-gray-300"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => {
                              setSlideDirection(page > currentPage ? 'left' : 'right');
                              handlePageChange(page);
                            }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${currentPage === page
                              ? 'bg-blue-900 text-blue-200'
                              : 'text-gray-300 hover:bg-gray-800'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          setSlideDirection('left');
                          handlePageChange(currentPage === totalPages ? 1 : currentPage + 1);
                        }}
                        className="p-1 rounded-full hover:bg-gray-800 transition-colors text-gray-300"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <DetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        factory={filters.factory}
        data={selectedEmployee}
        date={filters.date}
        lineNo={filters.line}
      />
      <AvailableCbidModal
        isOpen={isAvailableCbidModalOpen}
        onClose={() => setIsAvailableCbidModalOpen(false)}
        lineNo={filters.line}
        factory={filters.factory}
      />
    </div>
  );
};

export default StockDayGraph;