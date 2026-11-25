import React, { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { DISPLAY_FACTORY_CODES, DisplayFactoryCode, LineResponse, mapDisplayToApiFactory } from '../../types/api';
import { fetchGraphPage, GraphPageCurveItem, fetchLines, setCurrentFactory, convertNoLineToLine } from '../../services/api';
import { Calendar, ChevronDown, ChevronRight, LineChart as LineChartIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type Filters = {
  dateFrom: Date;
  dateTo: Date;
  factory: DisplayFactoryCode;
  line: string; // use NOLINE as in other pages
};

type GroupKey = string; // Style name

const GraphPage: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    dateFrom: new Date(),
    dateTo: new Date(),
    factory: '' as any,
    line: ''
  });

  const [lines, setLines] = useState<LineResponse[]>([]);
  const [isLineDropdownOpen, setIsLineDropdownOpen] = useState(false);
  const [showSubLines, setShowSubLines] = useState<string | null>(null);
  const lineDropdownRef = useRef<HTMLDivElement>(null);
  const [isFactoryDropdownOpen, setIsFactoryDropdownOpen] = useState(false);
  const factoryDropdownRef = useRef<HTMLDivElement>(null);
  const [loadingLines, setLoadingLines] = useState(false);
  const [errorLines, setErrorLines] = useState<string | null>(null);

  const [rawData, setRawData] = useState<GraphPageCurveItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorData, setErrorData] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] = useState<GroupKey | 'ALL'>('ALL');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Module selection
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  // PO Number selection
  const [selectedPOs, setSelectedPOs] = useState<string[]>([]);

  // Load lines whenever factory/date changes (follow pattern in History/Header)
  useEffect(() => {
    const loadLines = async () => {
      if (!filters.factory) {
        setLines([]);
        setLoadingLines(false);
        return;
      }

      setLoadingLines(true);
      setErrorLines(null);
      try {
        const data = await fetchLines(filters.factory);
        setLines(data);
        if (data.length > 0) {
          const newLine = data[0].NOLINE;
          if (!data.find(l => l.NOLINE === filters.line)) {
            setFilters(prev => ({ ...prev, line: newLine }));
          }
        }
      } catch (err) {
        console.error(err);
        setErrorLines('Failed to load lines');
      } finally {
        setLoadingLines(false);
      }
    };
    loadLines();
  }, [filters.factory]);

  // Outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (lineDropdownRef.current && !lineDropdownRef.current.contains(target)) {
        setIsLineDropdownOpen(false);
        setShowSubLines(null);
      }
      if (factoryDropdownRef.current && !factoryDropdownRef.current.contains(target)) {
        setIsFactoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
  const handleFilterChange = (key: keyof Filters, value: any) => {
    if (key === 'factory') {
      const apiFactory = mapDisplayToApiFactory(value as DisplayFactoryCode);
      setCurrentFactory(apiFactory);
      setFilters(prev => ({ ...prev, factory: value as DisplayFactoryCode, line: '' }));
    } else if (key === 'line') {
      setFilters(prev => ({ ...prev, line: String(value) }));
    } else if (key === 'dateFrom') {
      setFilters(prev => ({ ...prev, dateFrom: value as Date }));
    } else if (key === 'dateTo') {
      setFilters(prev => ({ ...prev, dateTo: value as Date }));
    }
  };

  const groupLines = (linesArr: LineResponse[]) => {
    const groups: { [key: string]: LineResponse[] } = {};
    linesArr.forEach(line => {
      const match = line.LINE.match(/(\d+)/);
      if (match) {
        const main = String(parseInt(match[1], 10));
        if (!groups[main]) groups[main] = [];
        groups[main].push(line);
      }
    });
    return Object.entries(groups)
      .map(([mainLine, subLines]) => ({
        mainLine,
        subLines: subLines.sort((a, b) => a.LINE.localeCompare(b.LINE))
      }))
      .sort((a, b) => Number(a.mainLine) - Number(b.mainLine));
  };

  const handleLineClick = (mainLine: string) => {
    setShowSubLines(showSubLines === mainLine ? null : mainLine);
    const groups = groupLines(lines);
    const group = groups.find(g => g.mainLine === mainLine);
    if (group && group.subLines.length === 1) {
      handleFilterChange('line', group.subLines[0].NOLINE);
      setIsLineDropdownOpen(false);
      setShowSubLines(null);
    }
  };

  const handleSubLineClick = (noLine: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleFilterChange('line', noLine);
    setIsLineDropdownOpen(false);
    setShowSubLines(null);
  };

  // Fetch Graph Data
  const lookup = async () => {
    if (!filters.line) return;
    setLoadingData(true);
    setErrorData(null);
    try {
      const dateFromStr = filters.dateFrom.toISOString().split('T')[0];
      const dateToStr = filters.dateTo.toISOString().split('T')[0];
      const res = await fetchGraphPage({
        Factory: mapDisplayToApiFactory(filters.factory),
        LineNo: filters.line,
        StyleNo: '',
        DateFrom: dateFromStr,
        DateTo: dateToStr,
      });
      const data = Array.isArray(res) ? res : [];
      console.log('📊 Raw data received:', data.length, 'items');
      console.log('📅 Date range:', dateFromStr, 'to', dateToStr);
      console.log('🔍 Sample data:', data.slice(0, 3));
      
      // Group by date to see distribution
      const dateDistribution = new Map<string, number>();
      data.forEach(item => {
        const dateKey = item['Work Date'].split(' ')[0];
        dateDistribution.set(dateKey, (dateDistribution.get(dateKey) || 0) + 1);
      });
      console.log('📊 Data distribution by date:', Object.fromEntries(Array.from(dateDistribution.entries()).sort()));
      
      setRawData(data);
    } catch (err: any) {
      console.error(err);
      setErrorData(err?.message || 'Failed to fetch data');
      setRawData([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Group data by Style only (combine all PO NO for same Style)
  const grouped = useMemo(() => {
    const map = new Map<GroupKey, { info: any; items: GraphPageCurveItem[] }>();
    
    console.log('🔄 Grouping data by Style, total items:', rawData.length);
    
    rawData.forEach(item => {
      // Use Style as the key
      const key: GroupKey = item.Style;
      
      if (!map.has(key)) {
        // Collect all unique PO numbers with their details for this style
        const poDetailsMap = new Map<string, { orderQty: number; color: string }>();
        rawData.filter(i => i.Style === item.Style).forEach(i => {
          const po = i['PO NO'] || '(Empty)'; // Use '(Empty)' as placeholder for null/empty PO
          if (!poDetailsMap.has(po)) {
            poDetailsMap.set(po, {
              orderQty: Number(i['Order Qty']) || 0,
              color: i.Color || '-'
            });
          }
        });
        
        map.set(key, {
          info: {
            style: item.Style,
            poDetails: poDetailsMap,
          },
          items: []
        });
      }
      map.get(key)!.items.push(item);
    });
    
    console.log('📦 Total styles (groups) created:', map.size);
    console.log('📦 Styles:', Array.from(map.keys()));
    
    // Sort each group by Work Date
    for (const group of map.values()) {
      group.items.sort((a, b) => new Date(a['Work Date']).getTime() - new Date(b['Work Date']).getTime());
    }
    
    return map;
  }, [rawData]);

  // Reset to ALL when data changes
  useEffect(() => {
    if (rawData.length > 0) {
      setSelectedStyle('ALL');
    }
  }, [rawData]);
  
  // Toggle module visibility
  const toggleModule = (module: string) => {
    setSelectedModules(prev => 
      prev.includes(module) 
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };
  
  // Select all modules
  const selectAllModules = (modules: string[]) => {
    setSelectedModules(modules);
  };
  
  // Deselect all modules
  const deselectAllModules = () => {
    setSelectedModules([]);
  };
  
  // Toggle PO visibility
  const togglePO = (po: string) => {
    setSelectedPOs(prev => 
      prev.includes(po) 
        ? prev.filter(p => p !== po)
        : [...prev, po]
    );
  };
  
  // Select all POs
  const selectAllPOs = (pos: string[]) => {
    setSelectedPOs(pos);
  };
  
  // Deselect all POs
  const deselectAllPOs = () => {
    setSelectedPOs([]);
  };

  // Format date to "Sep-10" format
  const formatChartDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month}-${day}`;
  };

  // Prepare chart data for selected style or all styles - all modules in one chart
  const chartDataByStyle = useMemo(() => {
    type StyleResult = {
      styleKey: string;
      info: any;
      chartData: any[];
      modules: string[];
      totalAssembly: number;
      perModuleTotals: Map<string, number>;
    };
    
    const processStyle = (styleKey: string, group: { info: any; items: GraphPageCurveItem[] }): StyleResult => {
      // Filter items by selected styles and POs if any
      let filteredItems = selectedStyles.length === 0 
        ? group.items 
        : group.items.filter(item => selectedStyles.includes(item.Style));
      
      // Further filter by selected POs if any
      if (selectedPOs.length > 0) {
        filteredItems = filteredItems.filter(item => {
          const po = item['PO NO'] || '(Empty)'; // Use '(Empty)' as placeholder for null/empty PO
          return selectedPOs.includes(po);
        });
      }
      
      // Group by date and module, sum Total In/Out (combine all PO NO)
      const dateModuleMap = new Map<string, Map<string, { totalIn: number; totalOut: number }>>();
      const modulesSet = new Set<string>();
      
      filteredItems.forEach(item => {
        const dateKey = item['Work Date'].split(' ')[0]; // Get just the date part
        const module = item.Module || 'Unknown';
        modulesSet.add(module);
        
        if (!dateModuleMap.has(dateKey)) {
          dateModuleMap.set(dateKey, new Map());
        }
        
        const moduleMap = dateModuleMap.get(dateKey)!;
        const existing = moduleMap.get(module) || { totalIn: 0, totalOut: 0 };
        
        existing.totalIn += Number(item['Total In'] || 0);
        existing.totalOut += Number(item['Total Out'] || 0);
        
        moduleMap.set(module, existing);
      });
      
      console.log(`📈 Style ${styleKey} - Dates in chart:`, Array.from(dateModuleMap.keys()).sort());
      console.log(`📈 Style ${styleKey} - Modules:`, Array.from(modulesSet));
      
      // Calculate totals across the fetched date range (all POs)
      const totalAssembly = filteredItems
        .filter(i => String(i.Module || '').toUpperCase() === 'ASSEMBLY')
        .reduce((sum, i) => sum + Number(i['Total Out'] || 0), 0);
      const perModuleTotals = new Map<string, number>();
      filteredItems
        .filter(i => String(i.Module || '').toUpperCase() !== 'ASSEMBLY')
        .forEach(i => {
          const module = String(i.Module || 'Unknown');
          const prev = perModuleTotals.get(module) || 0;
          perModuleTotals.set(module, prev + Number(i['Total Out'] || 0));
        });
      
      // Convert to chart data format - one row per date with all modules
      const chartData = Array.from(dateModuleMap.entries())
        .map(([date, moduleMap]) => {
          const row: any = { 
            date: formatChartDate(date),
            rawDate: date // Keep raw date for sorting
          };
          
          // Add data for each module
          for (const module of modulesSet) {
            const data = moduleMap.get(module) || { totalIn: 0, totalOut: 0 };
            row[`${module}_In`] = data.totalIn;
            row[`${module}_Out`] = data.totalOut;
          }
          
          return row;
        })
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate));
      
      return {
        styleKey,
        info: group.info,
        chartData,
        modules: Array.from(modulesSet).sort(),
        totalAssembly,
        perModuleTotals
      };
    };
    
    if (selectedStyle === 'ALL') {
      const result: StyleResult[] = [];
      for (const [styleKey, group] of grouped) {
        result.push(processStyle(styleKey, group));
      }
      return result;
    }
    
    // Single style selected
    if (!selectedStyle || !grouped.has(selectedStyle)) return [];
    const group = grouped.get(selectedStyle)!;
    return [processStyle(selectedStyle, group)];
  }, [grouped, selectedStyle, selectedStyles, selectedPOs]);
  
  // Sum of totals across displayed styles
  const totalAssemblyAll = useMemo(() => {
    return chartDataByStyle.reduce((sum, s) => sum + (s.totalAssembly || 0), 0);
  }, [chartDataByStyle]);
  const perModuleTotalsAll = useMemo(() => {
    const totals = new Map<string, number>();
    chartDataByStyle.forEach(s => {
      s.perModuleTotals.forEach((total, module) => {
        const prev = totals.get(module) || 0;
        totals.set(module, prev + total);
      });
    });
    return totals;
  }, [chartDataByStyle]);
  
  // Auto-select all modules and POs when raw data changes (initial load only)
  useEffect(() => {
    if (rawData.length > 0) {
      const allModules = new Set<string>();
      const allPOs = new Set<string>();
      
      rawData.forEach(item => {
        if (item.Module) allModules.add(item.Module);
        const po = item['PO NO'] || '(Empty)'; // Use '(Empty)' as placeholder for null/empty PO
        allPOs.add(po);
      });
      
      if (allModules.size > 0) {
        setSelectedModules(Array.from(allModules));
      }
      if (allPOs.size > 0) {
        setSelectedPOs(Array.from(allPOs));
      }
    }
  }, [rawData]);

  const lineName = useMemo(() => convertNoLineToLine(lines, filters.line), [lines, filters.line]);

  // Extract unique styles from data
  const availableStyles = useMemo(() => {
    const stylesSet = new Set<string>();
    rawData.forEach(item => {
      if (item.Style) stylesSet.add(item.Style);
    });
    return Array.from(stylesSet).sort();
  }, [rawData]);

  // Get production dates grouped by style
  const productionCalendar = useMemo(() => {
    const calendar = new Map<string, Set<string>>(); // date -> Set of styles
    
    rawData.forEach(item => {
      const dateKey = item['Work Date'].split(' ')[0]; // Get just the date part
      if (!calendar.has(dateKey)) {
        calendar.set(dateKey, new Set());
      }
      calendar.get(dateKey)!.add(item.Style);
    });
    
    const sortedDates = Array.from(calendar.keys()).sort();
    console.log('📅 Production calendar dates:', sortedDates);
    console.log('📊 Total unique dates:', calendar.size);
    
    // Show details for each date
    sortedDates.forEach(date => {
      const styles = calendar.get(date);
      console.log(`  ${date}: ${styles ? Array.from(styles).join(', ') : 'none'}`);
    });
    
    return calendar;
  }, [rawData]);

  // Filter calendar by selected styles
  const filteredCalendar = useMemo(() => {
    if (selectedStyles.length === 0) return productionCalendar;
    
    const filtered = new Map<string, Set<string>>();
    for (const [date, styles] of productionCalendar) {
      const matchingStyles = Array.from(styles).filter(s => selectedStyles.includes(s));
      if (matchingStyles.length > 0) {
        filtered.set(date, new Set(matchingStyles));
      }
    }
    return filtered;
  }, [productionCalendar, selectedStyles]);

  // Generate calendar days for the date range
  const calendarDays = useMemo(() => {
    const days: Array<{ date: string; styles: string[] }> = [];
    const start = new Date(filters.dateFrom);
    const end = new Date(filters.dateTo);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const styles = filteredCalendar.get(dateKey);
      days.push({
        date: dateKey,
        styles: styles ? Array.from(styles) : []
      });
    }
    
    return days;
  }, [filters.dateFrom, filters.dateTo, filteredCalendar]);

  const toggleStyleFilter = (style: string) => {
    setSelectedStyles(prev => 
      prev.includes(style) 
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 border-b border-gray-700 shadow-xl z-50 relative">
        <div className="mx-6">
          <div className="flex flex-col gap-4 py-6">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg">
                <LineChartIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  Graph Page - Production Analysis
                </h1>
                <p className="text-sm text-gray-400 mt-1">Visualization of Output data by Module based on DetID & PO</p>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Date From */}
              <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <label className="text-xs font-medium text-gray-400 uppercase">From</label>
                <DatePicker
                  selected={filters.dateFrom}
                  onChange={(d: Date) => handleFilterChange('dateFrom', d)}
                  dateFormat="yyyy-MM-dd"
                  className="bg-transparent text-sm text-gray-200 focus:outline-none w-28"
                />
              </div>

              {/* Date To */}
              <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <label className="text-xs font-medium text-gray-400 uppercase">To</label>
                <DatePicker
                  selected={filters.dateTo}
                  onChange={(d: Date) => handleFilterChange('dateTo', d)}
                  dateFormat="yyyy-MM-dd"
                  className="bg-transparent text-sm text-gray-200 focus:outline-none w-28"
                />
              </div>

              {/* Factory */}
              <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700 relative">
                <label className="text-xs font-medium text-gray-400 uppercase">Factory</label>
                <div className="relative" ref={factoryDropdownRef}>
                  <button
                    className="bg-transparent text-sm text-gray-200 focus:outline-none min-w-[140px] text-left flex justify-between items-center gap-2 cursor-pointer"
                    onClick={() => setIsFactoryDropdownOpen(!isFactoryDropdownOpen)}
                  >
                    <span>{filters.factory || 'Select'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isFactoryDropdownOpen ? 'transform rotate-180' : ''}`} />
                  </button>
                  {isFactoryDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                      {DISPLAY_FACTORY_CODES.map(code => (
                        <button
                          key={code}
                          className={`w-full px-4 py-2 text-left hover:bg-gray-700 text-gray-200 ${filters.factory === code ? 'bg-yellow-900 text-yellow-200' : ''}`}
                          onClick={() => {
                            handleFilterChange('factory', code);
                            setIsFactoryDropdownOpen(false);
                          }}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Dropdown */}
              <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700 relative">
                <label className="text-xs font-medium text-gray-400 uppercase">Line</label>
                <div className="relative" ref={lineDropdownRef}>
                  <button
                    className="bg-transparent text-sm text-gray-200 focus:outline-none min-w-[120px] text-left flex justify-between items-center gap-2 cursor-pointer"
                    onClick={() => setIsLineDropdownOpen(!isLineDropdownOpen)}
                  >
                    <span>{loadingLines ? 'Loading...'
                      : errorLines ? 'Error'
                      : filters.line ? (lineName || 'Select')
                      : 'Select'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isLineDropdownOpen ? 'transform rotate-180' : ''}`} />
                  </button>
                  {isLineDropdownOpen && !loadingLines && !errorLines && lines.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-[800px] overflow-y-auto">
                      {groupLines(lines).map(({ mainLine, subLines }) => (
                        <div key={mainLine} className="relative">
                          <button
                            className={`w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-gray-200 ${showSubLines === mainLine ? 'bg-gray-700' : ''}`}
                            onClick={() => handleLineClick(mainLine)}
                          >
                            <span>Line {mainLine}</span>
                            {subLines.length > 1 && (
                              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showSubLines === mainLine ? 'transform rotate-90' : ''}`} />
                            )}
                          </button>
                          {showSubLines === mainLine && subLines.length > 1 && (
                            <div className="bg-gray-800">
                              {subLines.map((sub) => (
                                <button
                                  key={sub.NOLINE}
                                  className={`w-full px-6 py-2 text-left hover:bg-gray-700 text-gray-200 ${filters.line === sub.NOLINE ? 'bg-yellow-900 text-yellow-200' : ''}`}
                                  onClick={(e) => handleSubLineClick(sub.NOLINE, e)}
                                >
                                  {sub.LINE}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Lookup */}
              <button
                onClick={lookup}
                disabled={loadingLines || !filters.line}
                className="ml-auto px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {loadingData ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : 'Lookup Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 flex gap-6 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[1800px] mx-auto">
        {/* Left Sidebar - Calendar */}
        <aside className="w-80 flex-shrink-0">
          <div className="sticky top-4 space-y-4">
            {/* Style Filter */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></div>
                Filter by Style
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableStyles.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No styles available</p>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedStyles([])}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedStyles.length === 0
                          ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                          : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-700/50'
                      }`}
                    >
                      All Styles
                    </button>
                    {availableStyles.map(style => (
                      <button
                        key={style}
                        onClick={() => toggleStyleFilter(style)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedStyles.includes(style)
                            ? 'bg-blue-500/20 border border-blue-500/50 text-blue-300'
                            : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-700/50'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Production Calendar */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2 flex-shrink-0">
                <div className="w-1 h-5 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                Production Calendar
              </h3>
              <div 
                className="space-y-1 overflow-y-auto flex-1 pr-2 pb-5" 
                style={{ 
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#4B5563 #1F2937'
                }}
              >
                {calendarDays.map(({ date, styles }) => {
                  const dateObj = new Date(date);
                  const isSelected = selectedDate === date;
                  const hasProduction = styles.length > 0;
                  
                  return (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(isSelected ? null : date)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-yellow-500/20 border border-yellow-500/50'
                          : hasProduction
                          ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'
                          : 'bg-gray-800/30 border border-gray-700/50 opacity-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-shrink-0">
                          <div className="text-sm font-semibold text-white">
                            {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="text-xs text-gray-400">
                            {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </div>
                        {hasProduction && (
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1 justify-end">
                              {styles.map((style, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-0.5 bg-green-500/20 border border-green-500/40 rounded text-xs font-semibold text-green-300 truncate"
                                  title={style}
                                >
                                  {style}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
        {/* Stats Cards - First Row (4 columns max) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/50 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-300 uppercase font-semibold">Total Groups</p>
                <p className="text-2xl font-bold text-white mt-1">{grouped.size}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <LineChartIcon className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-300 uppercase font-semibold">Selected Line</p>
                <p className="text-2xl font-bold text-white mt-1">{lineName || '-'}</p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/50 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-300 uppercase font-semibold">Styles Displayed</p>
                <p className="text-2xl font-bold text-white mt-1">{chartDataByStyle.length}</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-900/40 to-orange-800/20 border border-yellow-700/50 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-yellow-300 uppercase font-semibold">Total Assembly Output</p>
                <p className="text-2xl font-bold text-white mt-1">{totalAssemblyAll.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h2l1 2h10l1-2h2m-6 8a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Module Cards - Second Row (responsive grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from(perModuleTotalsAll.entries()).sort((a, b) => b[1] - a[1]).map(([module, total], idx) => {
            const colors = [
              { bg: 'from-teal-900/40 to-teal-800/20', border: 'border-teal-700/50', text: 'text-teal-300', iconBg: 'bg-teal-500/20', icon: 'text-teal-400' },
              { bg: 'from-cyan-900/40 to-cyan-800/20', border: 'border-cyan-700/50', text: 'text-cyan-300', iconBg: 'bg-cyan-500/20', icon: 'text-cyan-400' },
              { bg: 'from-indigo-900/40 to-indigo-800/20', border: 'border-indigo-700/50', text: 'text-indigo-300', iconBg: 'bg-indigo-500/20', icon: 'text-indigo-400' },
              { bg: 'from-pink-900/40 to-pink-800/20', border: 'border-pink-700/50', text: 'text-pink-300', iconBg: 'bg-pink-500/20', icon: 'text-pink-400' },
              { bg: 'from-rose-900/40 to-rose-800/20', border: 'border-rose-700/50', text: 'text-rose-300', iconBg: 'bg-rose-500/20', icon: 'text-rose-400' },
              { bg: 'from-amber-900/40 to-amber-800/20', border: 'border-amber-700/50', text: 'text-amber-300', iconBg: 'bg-amber-500/20', icon: 'text-amber-400' },
            ];
            const color = colors[idx % colors.length];
            
            return (
              <div key={module} className={`bg-gradient-to-br ${color.bg} border ${color.border} rounded-xl p-4 shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${color.text} uppercase font-semibold`}>{module}</p>
                    <p className="text-2xl font-bold text-white mt-1">{total.toLocaleString()}</p>
                  </div>
                  <div className={`p-3 ${color.iconBg} rounded-lg`}>
                    <svg className={`w-6 h-6 ${color.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        {errorData && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400 font-medium">{errorData}</span>
            </div>
          </div>
        )}
        
        {loadingData && (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="animate-spin h-12 w-12 text-yellow-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-300 font-medium">Loading chart data...</p>
            </div>
          </div>
        )}
        
        {!loadingData && chartDataByStyle.length > 0 ? (
          <div className="space-y-8">
            {chartDataByStyle.map(({ styleKey, info, chartData, modules, totalAssembly }) => {
              // Color palette for modules
              const moduleColors = [
                '#60A5FA', // Blue
                '#34D399', // Green
                '#F59E0B', // Orange
                '#EC4899', // Pink
                '#8B5CF6', // Purple
                '#14B8A6', // Teal
                '#F97316', // Deep Orange
                '#A78BFA', // Light Purple
              ];
              
              return (
                <div key={styleKey} className="space-y-4">
                  {/* Style Header Card */}
                  <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/50 rounded-xl p-5 shadow-lg">
                    <div className="flex flex-col gap-4">
                      {/* Top row: Style + metrics */}
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-300 uppercase">Style</span>
                          <span className="px-3 py-1 bg-blue-500/20 rounded text-lg font-bold text-blue-200">
                            {info.style}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                            <span className="text-xs font-semibold text-purple-300">
                              {modules.length} Module{modules.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
                            <span className="text-xs font-semibold text-green-300">
                              Assembly Output: {totalAssembly.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="h-px bg-gray-700/60" />
                      {/* PO Section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="text-gray-400 text-sm">PO Numbers</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => selectAllPOs(Array.from(info.poDetails.keys()))}
                              className="px-2 py-0.5 text-xs font-medium text-blue-300 hover:text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded transition-all"
                            >
                              Select All
                            </button>
                            <button
                              onClick={deselectAllPOs}
                              className="px-2 py-0.5 text-xs font-medium text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition-all"
                            >
                              Deselect All
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                          {Array.from(info.poDetails.entries() as IterableIterator<[string, { orderQty: number; color: string }]>).map(([po, details], idx) => (
                            <button
                              key={idx}
                              onClick={() => togglePO(po)}
                              className={`relative group flex items-center gap-2 px-2 py-1 rounded border transition-all ${
                                selectedPOs.includes(po)
                                  ? 'bg-yellow-500/20 border-yellow-500/40 shadow-sm'
                                  : 'bg-gray-800/30 border-gray-700/50 opacity-70 hover:opacity-90'
                              }`}
                            >
                              <div
                                className={`w-3 h-3 rounded border-2 flex items-center justify-center transition-all ${
                                  selectedPOs.includes(po)
                                    ? 'border-yellow-500 bg-yellow-500'
                                    : 'border-gray-600'
                                }`}
                              >
                                {selectedPOs.includes(po) && (
                                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-yellow-300 truncate max-w-[160px]" title={po}>
                                {po}
                              </span>
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                                <div className="text-xs space-y-1">
                                  <div>
                                    <span className="text-gray-400">Order Qty:</span>
                                    <span className="ml-2 text-green-300 font-semibold">{details.orderQty?.toLocaleString() || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Color:</span>
                                    <span className="ml-2 text-blue-300 font-semibold">{details.color}</span>
                                  </div>
                                </div>
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                                  <div className="border-4 border-transparent border-t-gray-600"></div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Single Chart with All Modules */}
                  <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
                    {/* Chart Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                        Output by Module
                      </h3>
                      <div className="px-3 py-1 bg-gray-700/50 border border-gray-600 rounded-lg">
                        <span className="text-xs font-medium text-gray-300">{chartData.length} data points</span>
                      </div>
                    </div>
                    
                    {/* Module Selection with Checkboxes */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-300">Select Modules to Display</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => selectAllModules(modules)}
                            className="px-3 py-1 text-xs font-medium text-blue-300 hover:text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded transition-all"
                          >
                            Select All
                          </button>
                          <button
                            onClick={deselectAllModules}
                            className="px-3 py-1 text-xs font-medium text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded transition-all"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {modules.map((module, idx) => (
                          <button
                            key={module}
                            onClick={() => toggleModule(module)}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all ${
                              selectedModules.includes(module)
                                ? 'bg-gray-700/70 border-gray-600 shadow-md'
                                : 'bg-gray-800/30 border-gray-700/50 opacity-50 hover:opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                  selectedModules.includes(module)
                                    ? 'border-yellow-500 bg-yellow-500'
                                    : 'border-gray-600'
                                }`}
                              >
                                {selectedModules.includes(module) && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: moduleColors[idx % moduleColors.length] }}></div>
                            </div>
                            <span className="text-sm font-semibold text-gray-200">{module}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-800/50 rounded-lg p-4" style={{ width: '100%', height: 500 }}>
                      {selectedModules.length === 0 || selectedPOs.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <svg className="w-16 h-16 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-gray-400 text-sm font-medium">
                              {selectedModules.length === 0 && selectedPOs.length === 0 
                                ? 'No modules and PO numbers selected'
                                : selectedModules.length === 0 
                                ? 'No modules selected' 
                                : 'No PO numbers selected'}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              {selectedModules.length === 0 && selectedPOs.length === 0 
                                ? 'Please select at least one module and one PO number to display'
                                : selectedModules.length === 0 
                                ? 'Please select at least one module to display' 
                                : 'Please select at least one PO number to display'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart 
                            data={chartData} 
                            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
                            barCategoryGap="15%"
                            barGap={2}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fill: '#D1D5DB', fontSize: 11 }} 
                              stroke="#6B7280"
                              tickLine={{ stroke: '#6B7280' }}
                            />
                            <YAxis 
                              tick={{ fill: '#D1D5DB', fontSize: 11 }} 
                              stroke="#6B7280"
                              tickLine={{ stroke: '#6B7280' }}
                            />
                            <Tooltip
                              contentStyle={{ 
                                backgroundColor: '#1F2937', 
                                border: '1px solid #374151', 
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                              }}
                              labelStyle={{ color: '#93C5FD', fontWeight: 'bold' }}
                              itemStyle={{ color: '#D1D5DB', fontSize: 11 }}
                              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            />
                            <Legend 
                              wrapperStyle={{ paddingTop: '15px' }}
                              iconType="circle"
                            />
                            
                            {/* Generate lines for selected modules */}
                            {modules
                              .filter(module => selectedModules.includes(module))
                              .map((module) => {
                                const originalIdx = modules.indexOf(module);
                                const color = moduleColors[originalIdx % moduleColors.length];
                                
                                return (
                                  <Line 
                                    key={`${module}-line`}
                                    type="monotone"
                                    dataKey={`${module}_Out`}
                                    stroke={color}
                                    strokeWidth={3}
                                    dot={{ 
                                      fill: color, 
                                      r: 6, 
                                      strokeWidth: 2, 
                                      stroke: '#1F2937' 
                                    }}
                                    activeDot={{ r: 8, strokeWidth: 2 }}
                                    name={module}
                                    connectNulls
                                    isAnimationActive={true}
                                  />
                                );
                              })}
                          </ComposedChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loadingData && (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
              <div className="flex flex-col items-center justify-center py-20">
                <div className="p-4 bg-gray-800/50 rounded-full mb-4">
                  <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm font-medium">No data available</p>
                <p className="text-gray-500 text-xs mt-1">Please select line and click Lookup to view chart</p>
              </div>
            </div>
          )
        )}
        </div>
      </main>
    </div>
  );
};

export default GraphPage;

