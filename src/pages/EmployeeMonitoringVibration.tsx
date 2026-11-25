import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { fetchVibrationData, fetchLines, convertNoLineToLine } from '../services/api';
import { VibrationDataResponse } from '../types/api';
import Header from '../components/EmployeeMonitoringVibration/Header';
import { VibrationTable } from '../components/EmployeeMonitoringVibration/VibrationTable';
import { format } from 'date-fns';
import { Activity, TrendingUp, TrendingDown, Users, Gauge } from 'lucide-react';


const EmployeeMonitoringVibration: React.FC = () => {
  const [filters, setFilters] = useState({
    date: new Date(),
    factory: "",
    line: ''
  });

  const [actualLineName, setActualLineName] = useState<string>("");
  const [vibrationData, setVibrationData] = useState<VibrationDataResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPart, setSelectedPart] = useState<string>('all');
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const autoRefreshIntervalRef = useRef<number>();
  const isFetchingRef = useRef(false);
  const requestSeqRef = useRef(0);

  const summary = useMemo(() => {
    const row = vibrationData.find((r) =>
      r.PCT_ABOVE_100 != null ||
      r.PCT_BELOW_100 != null ||
      r.TOTAL_OPERATOR_ACTIVE != null ||
      r.TOTAL_OP_ABOVE_100 != null ||
      r.TOTAL_OP_BELOW_100 != null
    );

    return {
      pctAbove100: row?.PCT_ABOVE_100 ?? '-',
      pctBelow100: row?.PCT_BELOW_100 ?? '-',
      totalOperatorActive: row?.TOTAL_OPERATOR_ACTIVE ?? '-',
      totalOpAbove100: row?.TOTAL_OP_ABOVE_100 ?? '-',
      totalOpBelow100: row?.TOTAL_OP_BELOW_100 ?? '-',
    };
  }, [vibrationData]);
  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
    // Stop auto refresh when filters change
    stopAutoRefresh();
  };

  // Fungsi untuk fetch data tanpa loading state
  const fetchDataSilently = async () => {
    if (!filters.line) return;

    try {
      console.log('Silent fetch started at:', new Date().toLocaleTimeString());
      const seq = ++requestSeqRef.current;
      const isStale = () => seq !== requestSeqRef.current;
      const data = await fetchVibrationData({
        lineNo: filters.line,
        workdate: format(filters.date, 'yyyy-MM-dd')
      });
      if (isStale()) return; // Drop outdated
      setVibrationData(data);
      console.log('Auto refresh completed at:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Auto refresh encountered some errors:', error);
    }
  };

  // Start auto refresh
  const startAutoRefresh = useCallback(() => {
    console.log('Starting auto refresh service...');
    if (autoRefreshIntervalRef.current) {
      console.log('Clearing existing interval...');
      window.clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = undefined;
    }

    // Set interval untuk refresh setiap 1 menit
    const intervalId = window.setInterval(() => {
      if (document.hidden) { return; }
      if (filters.line) {
        console.log('Auto refresh triggered at:', new Date().toLocaleTimeString());
        fetchDataSilently();
      } else {
        console.log('Line not selected, skipping auto refresh');
      }
    }, 60000); // 60000 ms = 1 menit

    // Simpan ID interval
    autoRefreshIntervalRef.current = intervalId;
    setIsAutoRefreshEnabled(true);
    console.log('Auto refresh service started with interval ID:', intervalId);

    // Lakukan refresh pertama segera
    if (filters.line) {
      console.log('Performing initial auto refresh...');
      fetchDataSilently();
    }
  }, [filters]);

  // Stop auto refresh
  const stopAutoRefresh = useCallback(() => {
    console.log('Stopping auto refresh service...');
    if (autoRefreshIntervalRef.current) {
      window.clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = undefined;
    }
    setIsAutoRefreshEnabled(false);
  }, []);

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

  const handleLookup = async () => {
    if (!filters.line) return;

    // Jika sedang fetching, batalkan
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, cancelling...');
      return;
    }

    try {
      // Set flag fetching
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const data = await fetchVibrationData({
        lineNo: filters.line,
        workdate: format(filters.date, 'yyyy-MM-dd')
      });
      setVibrationData(data);
      // Update actualLineName if not already set
      if (!actualLineName) {
        try {
          const linesData = await fetchLines(filters.factory);
          const selectedLine = linesData.find(l => l.NOLINE === filters.line);
          setActualLineName(selectedLine?.LINE || filters.line);
        } catch (e) {
          // fallback to line number if conversion fails
          setActualLineName(filters.line);
        }
      }

      // Start auto refresh setelah fetch pertama berhasil
      startAutoRefresh();
      setIsAutoRefreshEnabled(true);
    } catch (error) {
      console.error('Error fetching vibration data:', error);
      setError('Failed to load vibration data');
      // Stop auto refresh jika terjadi error
      stopAutoRefresh();
      setIsAutoRefreshEnabled(false);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Header
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onLookup={handleLookup}
        onLineNameChange={setActualLineName}
      />

      <div className="p-4">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-600/30 to-blue-600/20 border border-cyan-500/20">
                <Activity className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Employee Vibration Data</h2>
                <div className="text-xs text-slate-400">Realtime sensor monitoring & operator behavior summary</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm text-gray-300">
                Date {format(filters.date, 'yyyy-MM-dd')} | Line {actualLineName} | Style {vibrationData[0]?.STYLENO || ''}
              </h3>
              {isAutoRefreshEnabled && (
                <div className="flex items-center gap-1 bg-green-900/50 text-green-300 px-2 py-1 rounded-md text-xs font-medium">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Realtime</span>
                </div>
              )}
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by Employee Name, CBID, or NIK"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="w-48">
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Parts</option>
                {Array.from(new Set(vibrationData.map(row => row.PART))).sort().map(part => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Widget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-900/30 via-slate-900/40 to-slate-800 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-200/80">Percentage OP Vibration &gt; Button 100%</div>
                  <div className="text-lg font-semibold text-emerald-200">{summary.pctAbove100}</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
                  <TrendingUp className="w-5 h-5 text-emerald-300" />
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-900/30 via-slate-900/40 to-slate-800 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-rose-200/80">Percentage OP Vibration &lt; Button 100%</div>
                  <div className="text-lg font-semibold text-rose-200">{summary.pctBelow100}</div>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-400/20">
                  <TrendingDown className="w-5 h-5 text-rose-300" />
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-900/30 via-slate-900/40 to-slate-800 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-sky-200/80">Total Operator Active</div>
                  <div className="text-lg font-semibold text-slate-100">{summary.totalOperatorActive}</div>
                </div>
                <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-400/20">
                  <Users className="w-5 h-5 text-sky-300" />
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-lime-500/20 bg-gradient-to-br from-lime-900/25 via-slate-900/40 to-slate-800 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-lime-200/80">Total OP Vibration &gt; Button 100%</div>
                  <div className="text-lg font-semibold text-lime-200">{summary.totalOpAbove100}</div>
                </div>
                <div className="p-2 rounded-lg bg-lime-500/10 border border-lime-400/20">
                  <Gauge className="w-5 h-5 text-lime-300" />
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-lime-500/10 rounded-full blur-2xl" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-900/25 via-slate-900/40 to-slate-800 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-orange-200/80">Total OP Vibration &lt; Button 100%</div>
                  <div className="text-lg font-semibold text-orange-200">{summary.totalOpBelow100}</div>
                </div>
                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-400/20">
                  <Gauge className="w-5 h-5 text-orange-300" />
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-orange-500/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>

        {error ? (
          <div className="text-red-500 text-center py-4 bg-red-900/20 rounded-lg mb-4">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <VibrationTable 
              data={vibrationData.filter(row => {
                // Filter berdasarkan search query
                const matchesSearch = !searchQuery ? true : (
                  row.E_NAME.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  row.SERIAL_NO.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  row.NIK.toLowerCase().includes(searchQuery.toLowerCase())
                );

                // Filter berdasarkan part
                const matchesPart = selectedPart === 'all' ? true : row.PART === selectedPart;

                return matchesSearch && matchesPart;
              })}
              isLoading={isLoading} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeMonitoringVibration;
