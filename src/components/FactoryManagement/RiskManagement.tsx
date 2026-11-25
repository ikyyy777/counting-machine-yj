import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { fetchFactoryManagement, GraphPageCurveItem, fetchLines, fetchStyles, setCurrentFactory, FactoryManagementResponse, fetchOutputModuleEmployee } from '../../services/api';
import { DISPLAY_FACTORY_CODES, DisplayFactoryCode, mapDisplayToApiFactory, LineResponse, EmployeePerformanceResponse, StyleResponse } from '../../types/api';
import { Calendar, ChevronDown, ChevronRight, AlertTriangle, Package, Shield, Search } from 'lucide-react';

type Filters = {
  Factory: DisplayFactoryCode;
  date: string;
  line: string;
  style: string;
};

type LineData = {
  loading: boolean;
  error: string | null;
  data: GraphPageCurveItem[];
};

const RiskManagement: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    Factory: '' as any,
    date: new Date().toISOString().split('T')[0],
    line: '',
    style: '',
  });
  const [lines, setLines] = useState<LineResponse[]>([]);
  const [styles, setStyles] = useState<StyleResponse[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [errorLines, setErrorLines] = useState<string | null>(null);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const [lineDataMap, setLineDataMap] = useState<Map<string, LineData>>(new Map());
  const [lineSearch, setLineSearch] = useState<string>('');
  const [isFactoryDropdownOpen, setIsFactoryDropdownOpen] = useState(false);
  const factoryDropdownRef = useRef<HTMLDivElement>(null);
  const [detailLines, setDetailLines] = useState<Set<string>>(new Set());
  const [prefetchingAll, setPrefetchingAll] = useState<boolean>(false);
  const [operatorModalOpen, setOperatorModalOpen] = useState(false);
  const [operatorLoading, setOperatorLoading] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const [operatorData, setOperatorData] = useState<EmployeePerformanceResponse[]>([]);
  const [selectedModuleInfo, setSelectedModuleInfo] = useState<{
    workDate: string;
    lineName: string;
    style: string;
    module: string;
    totalOut: number;
  } | null>(null);
  const [showFormula, setShowFormula] = useState<boolean>(false);

  // Load lines for filter dropdown when factory changes
  useEffect(() => {
    const loadLines = async () => {
      if (!filters.Factory) {
        setLines([]);
        setLoadingLines(false);
        return;
      }

      setLoadingLines(true);
      setErrorLines(null);
      try {
        const data = await fetchLines(filters.Factory);
        setLines(data);

        if (data.length > 0) {
          const firstLine = String(data[0].NOLINE);
          setFilters(prev => {
            const current = String(prev.line || '');
            const exists = data.some(l => String(l.NOLINE) === current);
            return {
              ...prev,
              line: exists ? current : firstLine,
              style: '',
            };
          });
        } else {
          setFilters(prev => ({ ...prev, line: '', style: '' }));
        }
      } catch (err: any) {
        setErrorLines(err?.message || 'Failed to load lines');
      } finally {
        setLoadingLines(false);
      }
    };

    loadLines();
  }, [filters.Factory]);

  // Load styles for filter dropdown when line/date/factory changes
  useEffect(() => {
    const loadStyles = async () => {
      if (!filters.line) {
        setStyles([]);
        setFilters(prev => ({ ...prev, style: '' }));
        return;
      }

      try {
        const data = await fetchStyles({
          line_id: String(filters.line),
          office: filters.Factory,
          date: new Date(filters.date),
        });
        setStyles(data);

        if (data.length > 0) {
          const firstStyle = String(data[0].STYLE);
          setFilters(prev => {
            const current = String(prev.style || '');
            const exists = data.some(s => String(s.STYLE) === current);
            return { ...prev, style: exists ? current : firstStyle };
          });
        } else {
          setFilters(prev => ({ ...prev, style: '' }));
        }
      } catch {
        setStyles([]);
        setFilters(prev => ({ ...prev, style: '' }));
      }
    };

    loadStyles();
  }, [filters.Factory, filters.line, filters.date]);

  const renderFormulaModal = () => {
    const node = (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setShowFormula(false)}
        ></div>
        <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-5 w-full max-w-md text-gray-200 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Default Stock Formula</h4>
            <button
              className="px-2 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
              onClick={() => setShowFormula(false)}
            >
              Close
            </button>
          </div>
          <ul className="text-sm space-y-1">
            <li>
              <span className="font-semibold">LINING</span> = LINING Output - ASSEMBLY
              Input
            </li>
            <li>
              <span className="font-semibold">JOIN</span> = Smallest module output - TOTAL
              JOIN Input
            </li>
            <li>
              <span className="font-semibold">Other modules</span> = TOTAL Output per module
              - TOTAL JOIN Input
            </li>
            <li>
              <span className="font-semibold">Stock Days QTY</span> = StockQty value (the
              difference above)
            </li>
          </ul>
        </div>
      </div>
    );

    const container = typeof document !== 'undefined' ? document.body : null;
    return container ? ReactDOM.createPortal(node, container) : null;
  };

  // Convert FactoryManagementResponse (DB fields are mostly UPPERCASE) to GraphPageCurveItem format
  const convertToGraphPageItem = (item: FactoryManagementResponse): GraphPageCurveItem => ({
    Line: (item as any).LINE_NAME || (item as any).LINENAME || (item as any).LINE_CODE,
    'Work Date': (item as any).WORK_DATE || (item as any).work_date,
    Module: (item as any).PART || (item as any).part,
    Part: (item as any).PART || (item as any).part,
    Style: (item as any).STYLE,
    'PO NO': (item as any).PO_NO,
    FILE_NO: (item as any).FILE_NO,
    ORD_QTY: (item as any).ORD_QTY,
    Col_StartSew: (item as any).Col_StartSew,
    'Total Out All': (item as any).TOTALOUT_ALL ?? (item as any).TOTALIN,
    'Total Out Tdy': (item as any).TOTALOUT,
    'Total In All': (item as any).TOTALIN_ALL,
    'Total In Tdy': (item as any).TOTALIN,
    'CRD': (item as any).Col_CRD,
    Col_ProdQty: (item as any).Col_ProdQty,
    BALANCE: (item as any).BALANCE,
    TargetDay: (item as any).TargetDay,
    STOCK_DAYS: (item as any).STOCK_DAYS != null
      ? Number((item as any).STOCK_DAYS).toFixed(1)
      : (item as any).STOCK_DAYS,
  });

  const handleRowClick = async (line: LineResponse, row: GraphPageCurveItem) => {
    const workDate = String(row['Work Date'] || '').split(' ')[0];
    const module = String(row.Module || row.Part || '').trim();
    const style = String(row.Style || '').trim();

    if (!workDate || !module || !style) return;

    const factory = mapDisplayToApiFactory(filters.Factory);

    setSelectedModuleInfo({
      workDate,
      lineName: line.LINE,
      style,
      module,
      totalOut: Number(row['Total Out Tdy'] ?? 0),
    });

    setOperatorModalOpen(true);
    setOperatorLoading(true);
    setOperatorError(null);
    setOperatorData([]);

    try {
      const data = await fetchOutputModuleEmployee({
        factory,
        lineno: String(line.NOLINE),
        styleno: style,
        datefrom: workDate,
        module,
      });
      setOperatorData(data || []);
    } catch (e: any) {
      setOperatorError(e?.message || 'Failed to load operator data');
    } finally {
      setOperatorLoading(false);
    }
  };

  const toggleDetail = (noLine: string) => {
    setDetailLines(prev => {
      const next = new Set(prev);
      if (next.has(noLine)) next.delete(noLine); else next.add(noLine);
      return next;
    });
  };

  // Format CRD date as DD-MMM-YYYY (e.g., 10-Sept-2025)
  const formatCRD = (dateStr: string): string => {
    if (!dateStr) return '';
    const raw = String(dateStr).trim();
    const dateOnly = raw.split(' ')[0] || raw; // e.g. "2026-03-04"
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      const [y, m, dStr] = parts;
      const yearNum = Number(y);
      const monthNum = Number(m);
      const dayNum = Number(dStr);
      if (!isNaN(yearNum) && !isNaN(monthNum) && !isNaN(dayNum)) {
        const d = new Date(yearNum, monthNum - 1, dayNum);
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        const mon = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${mon}-${year}`;
      }
    }
    // Fallback: return the date-only string if parsing fails
    return dateOnly;
  };

  // Reset data when date changes (keep lines for dropdown UX)
  useEffect(() => {
    setExpandedLines(new Set());
    setLineDataMap(new Map());
  }, [filters.date]);

  // Reset everything when factory changes
  useEffect(() => {
    setLines([]);
    setExpandedLines(new Set());
    setLineDataMap(new Map());
  }, [filters.Factory]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (factoryDropdownRef.current && !factoryDropdownRef.current.contains(target)) {
        setIsFactoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFactoryChange = (code: DisplayFactoryCode) => {
    const apiFactory = mapDisplayToApiFactory(code);
    setCurrentFactory(apiFactory);
    setFilters(prev => ({ ...prev, Factory: code, line: '', style: '' }));
    setExpandedLines(new Set());
    setLineDataMap(new Map());
  };


  // Manual lookup handler
  const handleLookup = async () => {
    // Load lines first, then fetch all data once and distribute per line
    setLoadingLines(true);
    setErrorLines(null);
    setExpandedLines(new Set());
    setLineDataMap(new Map());

    try {
      const apiFactory = mapDisplayToApiFactory(filters.Factory);
      const list = lines.length > 0 ? lines : await fetchLines(filters.Factory);
      if (lines.length === 0) setLines(list);

      const listFiltered = filters.line
        ? list.filter(l => String(l.NOLINE) === String(filters.line))
        : list;

      if (listFiltered && listFiltered.length > 0) {
        setPrefetchingAll(true);
        const yesterday = getPreviousWorkday(filters.date);

        // Fetch once for the date range (yesterday..today)
        const allData = await fetchFactoryManagement({
          Factory: apiFactory,
          DateFrom: yesterday,
          DateTo: filters.date,
          LineNo: filters.line ? String(filters.line) : '',
          StyleNo: filters.style ? String(filters.style) : '',
        });

        // Build a new map grouping by NOLINE
        const nextMap = new Map<string, LineData>();
        for (const l of listFiltered) {
          const perLine = allData
            .filter(item => 
              String((item as any).LINE_NAME) === String(l.LINE)
            )
            .map(convertToGraphPageItem);
          nextMap.set(l.NOLINE, {
            loading: false,
            error: null,
            data: perLine,
          });
        }

        setLineDataMap(nextMap);
        // Auto-expand all lines after prefetch completes
        const allExpanded = new Set(listFiltered.map(l => l.NOLINE));
        setExpandedLines(allExpanded);
      }
    } catch (err: any) {
      setErrorLines(err?.message || 'Failed to load lines');
    } finally {
      setPrefetchingAll(false);
      setLoadingLines(false);
    }
  };

  const handleLineClick = (noLine: string) => {
    const isExpanded = expandedLines.has(noLine);
    const newExpanded = new Set(expandedLines);

    if (isExpanded) {
      newExpanded.delete(noLine);
    } else {
      newExpanded.add(noLine);
    }

    setExpandedLines(newExpanded);
  };

  // Get previous workday (skip Saturday & Sunday)
  const getPreviousWorkday = (dateStr: string): string => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    let daysToSubtract = 1;
    if (dayOfWeek === 1) { // Monday
      daysToSubtract = 3; // Previous Friday
    } else if (dayOfWeek === 0) { // Sunday
      daysToSubtract = 2; // Previous Friday
    } else if (dayOfWeek === 6) { // Saturday
      daysToSubtract = 1; // Previous Friday
    }

    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - daysToSubtract);
    return prevDate.toISOString().split('T')[0];
  };

  const measureOf = (row: GraphPageCurveItem) => {
    const totalOut = Number(row['Total Out Tdy'] ?? 0);
    return totalOut || 0;
  };

  // Compare key: Work Date + Line + Style (ignore PO and DetId)
  const compareKeyOf = (row: GraphPageCurveItem) => {
    return [String(row['Work Date']).split(' ')[0], row.Line, row.Style].join('|');
  };

  const moduleNameOf = (row: GraphPageCurveItem) => {
    const name = String(row.Module || row.Part || '').toUpperCase();
    return name;
  };

  // Group and sum modules with same name but different parts, across PO NO
  const processLineData = (data: GraphPageCurveItem[]) => {
    const groupMap = new Map<string, GraphPageCurveItem>();

    data.forEach((row) => {
      const groupKey = compareKeyOf(row);
      const moduleName = moduleNameOf(row);
      // Create unique key: groupKey + moduleName
      const uniqueKey = `${groupKey}|${moduleName}`;

      if (!groupMap.has(uniqueKey)) {
        // First time seeing this module in this group, create entry
        const base: GraphPageCurveItem = { ...row } as any;
        // Initialize collectors set
        (base as any)._poSet = new Set<string>();
        (base as any)._crdSet = new Set<string>();
        const po = String((row as any)['PO NO'] || '').trim();
        if (po) (base as any)._poSet.add(po);
        const crdRaw = String((row as any)['CRD'] || '').trim();
        if (crdRaw) {
          crdRaw.split(',').forEach((part: string) => {
            const v = part.trim();
            if (v) (base as any)._crdSet.add(v);
          });
        }
        groupMap.set(uniqueKey, base);
      } else {
        // Module exists: keep numeric totals from the first row, only merge PO/CRD lists
        const existing = groupMap.get(uniqueKey)!;
        const po = String((row as any)['PO NO'] || '').trim();
        if (po) ((existing as any)._poSet as Set<string>).add(po);
        const crdRaw = String((row as any)['CRD'] || '').trim();
        if (crdRaw) {
          crdRaw.split(',').forEach((part: string) => {
            const v = part.trim();
            if (v) ((existing as any)._crdSet as Set<string>).add(v);
          });
        }
        groupMap.set(uniqueKey, existing);
      }
    });

    // Sort for stable rendering: by date, line, style, then module
    const aggregated = Array.from(groupMap.values()).map((item: any) => {
      const poSet = (item._poSet || new Set<string>()) as Set<string>;
      const list: string[] = Array.from(poSet.values());
      item['PO NO'] = list.join(', ');
      const crdSet = (item._crdSet || new Set<string>()) as Set<string>;
      const crdList: string[] = Array.from(crdSet.values());
      crdList.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      const formatted: string[] = crdList.map((v) => {
        const f = formatCRD(v);
        return f || (String(v).trim().split(' ')[0] || String(v).trim());
      });
      (item as any)['CRD'] = formatted.join(', ');
      delete item._poSet;
      delete item._crdSet;
      return item as GraphPageCurveItem;
    });

    return aggregated;
  };

  // Compute stock quantity based on default formula
  const computeStockForRow = (
    row: GraphPageCurveItem,
  ) => {
    const stockDays = Number((row as any).STOCK_DAYS ?? 0);
    return stockDays || 0;
  };

  // Split data into today and yesterday
  const splitByDate = (data: GraphPageCurveItem[]) => {
    const yesterday = getPreviousWorkday(filters.date);
    const today: GraphPageCurveItem[] = [];
    const yest: GraphPageCurveItem[] = [];

    data.forEach(row => {
      const rowDate = String(row['Work Date']).split(' ')[0];
      if (rowDate === filters.date) {
        today.push(row);
      } else if (rowDate === yesterday) {
        yest.push(row);
      }
    });

    return { today, yesterday: yest };
  };

  // Helper to filter lines based on YONGJIN 2-1 or 2-2
  const filterLinesByFactory = (line: LineResponse): boolean => {
    // Extract line number from LINE string (e.g., "1" from "1", "24" from "24")
    const lineNum = parseInt(line.LINE.match(/^(\d+)/)?.[1] || '0', 10);

    if (filters.Factory === 'YONGJIN 2-1') {
      return lineNum >= 1 && lineNum <= 24;
    } else if (filters.Factory === 'YONGJIN 2-2') {
      return lineNum >= 25 && lineNum <= 48;
    }
    // For other factories, show all lines
    return true;
  };

  // Compute visible lines (only those with any data today or yesterday)
  const visibleLines = useMemo(() => {
    if (!lines) return [] as LineResponse[];
    return lines.filter((l) => {
      // First filter by factory (YONGJIN 2-1 or 2-2)
      if (!filterLinesByFactory(l)) return false;

      const entry = lineDataMap.get(l.NOLINE);
      if (!entry || entry.loading || entry.error) return false;
      const processed = processLineData(entry.data);
      const { today, yesterday } = splitByDate(processed);
      return (today.length > 0) || (yesterday.length > 0);
    });
  }, [lines, lineDataMap, filters.date, filters.Factory]);

  const filteredSortedLines = useMemo(() => {
    const term = lineSearch.trim().toLowerCase();
    let arr = visibleLines;
    if (term) {
      arr = visibleLines.filter(l => l.LINE.toLowerCase().includes(term));
    }
    return [...arr].sort((a, b) => {
      const ma = a.LINE.match(/^(\d+)/);
      const mb = b.LINE.match(/^(\d+)/);
      const na = ma ? Number(ma[1]) : Number.MAX_SAFE_INTEGER;
      const nb = mb ? Number(mb[1]) : Number.MAX_SAFE_INTEGER;
      if (na !== nb) return na - nb;
      return a.LINE.localeCompare(b.LINE);
    });
  }, [visibleLines, lineSearch]);

  function buildAssemblyMap(data: GraphPageCurveItem[]) {
    const map = new Map<string, number>();
    data.forEach((row) => {
      const module = moduleNameOf(row);
      if (module === 'ASSEMBLY') {
        const key = compareKeyOf(row);
        const prev = map.get(key) ?? 0;
        map.set(key, prev + measureOf(row));
      }
    });
    return map;
  }

  // Calculate stats per dataset (Risk logic)
  function computeRiskStats(dataset: GraphPageCurveItem[], assemblyMap: Map<string, number>) {
    let atRisk = 0;
    let safeModules = 0;
    const uniqueModules = new Set<string>();

    dataset.forEach(row => {
      const key = compareKeyOf(row);
      const asm = assemblyMap.get(key) ?? null;
      const moduleName = moduleNameOf(row);
      const value = measureOf(row);
      if (moduleName) uniqueModules.add(moduleName);
      if (asm !== null && moduleName !== 'ASSEMBLY') {
        if (value > asm * 1.2) atRisk++; else safeModules++;
      }
    });

    return { totalRows: dataset.length, atRisk, safeModules, uniqueModules: uniqueModules.size };
  }

  // Helper function to render table rows for a dataset
  const renderTableRows = (dataset: GraphPageCurveItem[], assemblyMap: Map<string, number>, line: LineResponse) => {
    if (dataset.length === 0) {
      return (
        <tr>
          <td colSpan={15} className="px-4 py-8 text-center text-gray-500">
            <div className="flex flex-col items-center gap-2">
              <Package className="w-12 h-12 text-gray-600" />
              <p>No data available</p>
            </div>
          </td>
        </tr>
      );
    }

    return dataset.reduce<JSX.Element[]>((acc, row, idx) => {
      const key = compareKeyOf(row);
      const asm = assemblyMap.get(key) ?? null;
      const moduleName = moduleNameOf(row);
      const value = measureOf(row);
      const shouldHighlight = asm !== null && moduleName !== 'ASSEMBLY' && value > asm * 1.2;

      const stockQty = computeStockForRow(row);

      // Insert a blank separator row when Style changes
      if (idx > 0 && dataset[idx - 1].Style !== row.Style) {
        acc.push(
          <tr key={`sep-${idx}`}>
            <td colSpan={15} className="h-3"></td>
          </tr>
        );
      }

      acc.push(
        <tr
          key={`row-${idx}`}
          onClick={() => handleRowClick(line, row)}
          className={`cursor-pointer transition-colors duration-150 ${shouldHighlight
            ? 'bg-orange-900/20 border-l-4 border-orange-500 hover:bg-orange-900/30'
            : 'hover:bg-gray-700/30'
            }`}
        >
          <td className="px-4 py-3 text-sm font-medium text-gray-200">{row.Style}</td>
          <td className="px-4 py-3 text-sm text-gray-300" title={String(row['PO NO'] || '')}>
            <div className="truncate max-w-[140px] sm:max-w-[220px] md:max-w-[300px] lg:max-w-[420px]">
              {String(row['PO NO'] || '') || '-'}
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-gray-300" title={String((row as any).FILE_NO || '')}>
            <div className="truncate max-w-[110px] sm:max-w-[180px] md:max-w-[240px] lg:max-w-[280px]">
              {String((row as any).FILE_NO || '') || '-'}
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
            {Number((row as any).ORD_QTY ?? 0).toLocaleString()}
          </td>
          <td className="px-4 py-3 text-sm text-gray-300" title={String((row as any)['CRD'] || '')}>
            <div className="truncate max-w-[60px] sm:max-w-[120px] md:max-w-[120px] lg:max-w-[120px]">
              {String((row as any)['CRD'] || '') || '-'}
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-gray-300" title={String((row as any).Col_StartSew || '')}>
            <div className="truncate max-w-[90px] sm:max-w-[140px] md:max-w-[160px] lg:max-w-[180px]">
              {String((row as any).Col_StartSew || '').split(' ')[0] || '-'}
            </div>
          </td>
          <td className="px-4 py-3 text-sm">
            <span className={`px-2 py-1 rounded-md font-medium ${moduleName === 'ASSEMBLY'
              ? 'bg-purple-500/20 text-purple-300'
              : shouldHighlight
                ? 'bg-orange-500/20 text-orange-300'
                : 'bg-green-500/20 text-green-300'
              }`}>
              {row.Module || row.Part || '-'}
            </span>
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
            {Number((row as any).Col_ProdQty ?? 0).toLocaleString()}
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
            {Number((row as any).BALANCE ?? 0).toLocaleString()}
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
            {Number((row as any).TargetDay ?? 0).toLocaleString()}
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
            {Number(row['Total In All'] ?? 0).toLocaleString()}
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
            {Number(row['Total In Tdy'] ?? 0).toLocaleString()}
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
            {Number(row['Total Out All'] ?? 0).toLocaleString()}
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold">
            <span className={shouldHighlight ? 'text-orange-400' : 'text-gray-300'}>
              {Number(row['Total Out Tdy'] ?? 0).toLocaleString()}
            </span>
          </td>
          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-300">
            {Number(stockQty ?? 0).toLocaleString()}
          </td>
        </tr>
      );

      return acc;
    }, []);
  };

  // Render line widget with data
  const renderLineWidget = (line: LineResponse) => {
    const lineData = lineDataMap.get(line.NOLINE);
    const isExpanded = expandedLines.has(line.NOLINE);

    if (!isExpanded) return null;

    if (!lineData) return null;

    if (lineData.loading) {
      return (
        <div className="px-6 py-8">
          <div className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-400">Loading data for {line.LINE}...</span>
          </div>
        </div>
      );
    }

    if (lineData.error) {
      return (
        <div className="px-6 py-4">
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-red-400 font-semibold text-sm mb-1">Error Loading Data</h4>
              <p className="text-red-300 text-sm">{lineData.error}</p>
            </div>
          </div>
        </div>
      );
    }

    const displayed = processLineData(lineData.data);
    const { today: todayDisplayed, yesterday: yesterdayDisplayed } = splitByDate(displayed);
    const assemblyMap = buildAssemblyMap(displayed);
    const statsToday = computeRiskStats(todayDisplayed, assemblyMap);
    const statsYesterday = computeRiskStats(yesterdayDisplayed, assemblyMap);

    return (
      <div className="px-6 py-4 space-y-4 bg-gray-800/20">
        {/* Summary Stats: Today & Yesterday */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-300 uppercase font-semibold">Total Records</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Today:{' '}
                    <span className="text-xl font-bold text-white">
                      {statsToday.totalRows}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Yesterday:{' '}
                    <span className="font-semibold text-gray-200">
                      {statsYesterday.totalRows}
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-900/40 to-red-800/20 border border-orange-700/50 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-300 uppercase font-semibold">At Risk</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Today:{' '}
                    <span className="text-xl font-bold text-white">
                      {statsToday.atRisk}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Yesterday:{' '}
                    <span className="font-semibold text-gray-200">
                      {statsYesterday.atRisk}
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-300 uppercase font-semibold">Safe Status</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Today:{' '}
                    <span className="text-xl font-bold text-white">
                      {statsToday.safeModules}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Yesterday:{' '}
                    <span className="font-semibold text-gray-200">
                      {statsYesterday.safeModules}
                    </span>
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => toggleDetail(line.NOLINE)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-lg transition-colors duration-200"
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">{detailLines.has(line.NOLINE) ? 'Hide' : 'Show'} Detail</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${detailLines.has(line.NOLINE) ? 'transform rotate-180' : ''}`} />
            </button>
          </div>
          {/* Detail Tables - Toggleable per line */}
          {detailLines.has(line.NOLINE) && (
            <>
              {/* Today & Yesterday vertical */}
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Today - {filters.date}
                  </h3>
                  <div className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Style</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">PO Number</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">File No</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Ord Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">CRD</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Start Sew</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Module</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Prod Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Balance</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Target Day</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total In All</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total In Tdy</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total Out All</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total Out Tdy</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Stock Days</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {renderTableRows(todayDisplayed, assemblyMap, line)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-400 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Yesterday - {getPreviousWorkday(filters.date)}
                  </h3>
                  <div className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-800 to-gray-700 border-b border-gray-600">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Style</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">PO Number</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">File No</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Ord Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">CRD</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Start Sew</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Module</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Prod Qty</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Balance</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Target Day</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total In All</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total In Tdy</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total Out All</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total Out Tdy</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Stock Days</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                          {renderTableRows(yesterdayDisplayed, assemblyMap, line)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        {displayed.length > 0 && (
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500/40 border-2 border-orange-500 rounded"></div>
              <span className="text-gray-400">Module &gt; Assembly TOTAL OUT × 1.2 (At Risk)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/20 border border-green-500 rounded"></div>
              <span className="text-gray-400">Safe Status</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Factory Dropdown */}
        <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2.5 rounded-lg border border-gray-700 relative" ref={factoryDropdownRef}>
          <Package className="w-4 h-4 text-orange-400" />
          <label className="text-xs font-medium text-gray-400 uppercase">Factory</label>
          <button
            className="bg-transparent text-sm text-gray-200 focus:outline-none min-w-[140px] text-left flex justify-between items-center gap-2 cursor-pointer"
            onClick={() => setIsFactoryDropdownOpen(!isFactoryDropdownOpen)}
          >
            <span>{filters.Factory || 'Select'}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isFactoryDropdownOpen ? 'transform rotate-180' : ''}`} />
          </button>
          {isFactoryDropdownOpen && (
            <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
              {DISPLAY_FACTORY_CODES.map((code: DisplayFactoryCode) => (
                <button
                  key={code}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200 ${filters.Factory === code ? 'bg-orange-900 text-orange-200' : ''}`}
                  onClick={() => {
                    handleFactoryChange(code);
                    setIsFactoryDropdownOpen(false);
                  }}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2.5 rounded-lg border border-gray-700">
          <Calendar className="w-4 h-4 text-orange-400" />
          <label className="text-xs font-medium text-gray-400 uppercase">Date</label>
          <input
            type="date"
            className="bg-transparent text-sm text-gray-200 focus:outline-none w-32"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
        </div>

        {/* Line */}
        <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2.5 rounded-lg border border-gray-700">
          <label className="text-xs font-medium text-gray-400 uppercase">Line</label>
          <select
            className="bg-gray-900 text-sm text-gray-200 focus:outline-none min-w-[120px] border border-gray-700 rounded px-2 py-1"
            value={filters.line}
            onChange={(e) => setFilters((f) => ({ ...f, line: e.target.value, style: '' }))}
            disabled={loadingLines || lines.length === 0}
          >
            <option value="" className="bg-gray-900 text-gray-200">Select</option>
            {lines.map((l) => (
              <option key={String(l.NOLINE)} value={String(l.NOLINE)} className="bg-gray-900 text-gray-200">
                {l.LINE}
              </option>
            ))}
          </select>
        </div>

        {/* Style */}
        <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2.5 rounded-lg border border-gray-700">
          <label className="text-xs font-medium text-gray-400 uppercase">Style</label>
          <select
            className="bg-gray-900 text-sm text-gray-200 focus:outline-none min-w-[140px] border border-gray-700 rounded px-2 py-1"
            value={filters.style}
            onChange={(e) => setFilters((f) => ({ ...f, style: e.target.value }))}
            disabled={loadingLines || !filters.line || styles.length === 0}
          >
            <option value="" className="bg-gray-900 text-gray-200">Select</option>
            {styles.map((s) => (
              <option key={String(s.STYLE)} value={String(s.STYLE)} className="bg-gray-900 text-gray-200">
                {s.STYLE}
              </option>
            ))}
          </select>
        </div>

        {/* Lookup Button */}
        <button
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold shadow-lg shadow-orange-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleLookup}
          disabled={loadingLines || prefetchingAll || !filters.line || !filters.style}
        >
          <Search className={`w-4 h-4 ${loadingLines || prefetchingAll ? 'animate-spin' : ''}`} />
          {loadingLines || prefetchingAll ? 'Loading...' : 'Lookup Lines'}
        </button>

      </div>

      {/* Error Message for Lines */}
      {errorLines && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-red-400 font-semibold text-sm mb-1">Error Loading Lines</h4>
            <p className="text-red-300 text-sm">{errorLines}</p>
          </div>
        </div>
      )}

      {(operatorModalOpen || operatorLoading || operatorError) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-white">Operator Output Detail</h2>
                {selectedModuleInfo && (
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedModuleInfo.workDate} • Line {selectedModuleInfo.lineName} • Style {selectedModuleInfo.style} • Module {selectedModuleInfo.module} • Total Out {selectedModuleInfo.totalOut.toLocaleString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setOperatorModalOpen(false);
                  setOperatorData([]);
                  setOperatorError(null);
                }}
                className="px-3 py-1.5 text-sm rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {operatorLoading && (
                <div className="flex items-center justify-center py-10">
                  <svg className="animate-spin h-6 w-6 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="ml-3 text-gray-300 text-sm">Loading operator data...</span>
                </div>
              )}

              {!operatorLoading && operatorError && (
                <div className="m-4 bg-red-900/30 border border-red-700/60 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-red-300 font-semibold text-sm mb-1">Failed to load operator data</h4>
                    <p className="text-red-200 text-xs">{operatorError}</p>
                  </div>
                </div>
              )}

              {!operatorLoading && !operatorError && (
                <div className="p-4 overflow-auto">
                  {operatorData.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">No operator data available for this module.</div>
                  ) : (
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-800 border-b border-gray-700">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">No</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Work Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">NIK</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Name</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Actual</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">ASM Out</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Avg/Part</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Total All</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {operatorData.map((op, idx) => (
                          <tr key={idx} className="hover:bg-gray-800/60">
                            <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{idx + 1}</td>
                            <td className="px-3 py-2 text-gray-300 whitespace-nowrap">{String(op.WORK_DATE).split(' ')[0]}</td>
                            <td className="px-3 py-2 text-gray-200 whitespace-nowrap">{op.NIK}</td>
                            <td className="px-3 py-2 text-gray-200 whitespace-nowrap">{op.E_NAME}</td>
                            <td className="px-3 py-2 text-right text-gray-200">{Number(op.ACTUAL ?? 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-gray-200">{Number(op.ASM_OUT ?? 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-gray-200">{Number(op.AVERAGE_PER_PART ?? 0).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right text-gray-200">{Number(op.TOTAL_QTY_ALL ?? 0).toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${op.STATUS_OUTPUT === 'Deficient'
                                  ? 'bg-red-500/20 text-red-300'
                                  : op.STATUS_OUTPUT === 'Sufficient'
                                    ? 'bg-green-500/20 text-green-300'
                                    : 'bg-gray-500/20 text-gray-200'
                                  }`}
                              >
                                {op.STATUS_OUTPUT}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lines Loading State */}
      {(loadingLines || prefetchingAll) && (
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-6 w-6 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="ml-3 text-gray-300">Loading lines and modules...</span>
        </div>
      )}

      {/* Expandable Lines List */}
      {!loadingLines && !prefetchingAll && !errorLines && visibleLines.length > 0 && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-gray-800/50 px-4 py-2.5 rounded-lg border border-gray-700 w-full md:w-96">
            <Search className="w-4 h-4 text-orange-400" />
            <input
              type="text"
              value={lineSearch}
              onChange={(e) => setLineSearch(e.target.value)}
              placeholder="Search line..."
              className="bg-transparent text-sm text-gray-200 focus:outline-none w-full"
            />
          </div>

          {filteredSortedLines.map((line) => {
            const isExpanded = expandedLines.has(line.NOLINE);
            return (
              <div key={line.NOLINE} className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden">
                {/* Line Header - Clickable */}
                <button
                  onClick={() => handleLineClick(line.NOLINE)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <ChevronRight
                      className={`w-5 h-5 text-orange-400 transition-transform duration-200 ${isExpanded ? 'transform rotate-90' : ''}`}
                    />
                    <span className="text-2xl font-bold text-gray-100">LINE {line.LINE}</span>
                  </div>
                </button>

                {/* Line Data Widget - Shown when expanded */}
                {renderLineWidget(line)}
              </div>
            );
          })}
        </div>
      )}

      {/* No Lines Message */}
      {!loadingLines && !prefetchingAll && !errorLines && (lines.length === 0 || visibleLines.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="w-16 h-16 text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No lines with data for this factory and date</p>
        </div>
      )}
      {showFormula && renderFormulaModal()}
    </div>
  );
};

export default RiskManagement;

