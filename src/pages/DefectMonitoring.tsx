import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/DefectMonitoring/Header';
import ProductionInfo from '../components/DefectMonitoring/ProductionInfo';
import HourlyOutput from '../components/DefectMonitoring/HourlyOutput';
import { ProductionInfoSkeleton, HourlyOutputSkeleton } from '../components/DefectMonitoring/Skeletons';
import { DefectFilters, DefectData } from '../types/defect';
import { Maximize2, Minimize2 } from 'lucide-react';
import { fetchDefectInfo, fetchTopDefects, fetchLines, convertNoLineToLine } from '../services/api';
import { format } from 'date-fns';

const DefectMonitoring: React.FC = () => {
  const [filters, setFilters] = useState<DefectFilters>({
    date: new Date(),
    factory: "",
    line: "",
    style: "",
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const autoRefreshIntervalRef = useRef<number>();
  const isFetchingRef = useRef(false);
  const requestSeqRef = useRef(0);
  const [actualLineName, setActualLineName] = useState<string>("");
  const [lines, setLines] = useState<any[]>([]);

  const [data, setData] = useState<DefectData>({
    style: "",
    color: "",
    buyer: "",
    orderQty: "",
    inspection: 0,
    defectCount: 0,
    topDefects: [],
    output: 0,
    target: 0,
    outputPerHour: 0,
    targetPerHour: 0,
    targetPercentage: 0,
    defectPercentage: 0,
    hourlyOutputs: [],
    poNumber: 0,
    totalRepair: 0 // Tambahkan initial state untuk totalRepair
  });

  // Tambahkan state untuk memantau pembaruan data
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    document.body.style.background = "rgb(17, 24, 39)";
  }, []);

  // Tambahkan useEffect untuk auto refresh UI
  useEffect(() => {
    let intervalId: number;

    if (isAutoRefreshEnabled && filters.line && filters.style) {
      intervalId = window.setInterval(() => {
        if (!document.hidden) {
          fetchDataSilently().then(() => {
            // Update lastUpdate untuk memicu render ulang
            setLastUpdate(new Date());
          });
        }
      }, 5000); // Refresh setiap 5 detik
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [isAutoRefreshEnabled, filters.line, filters.style]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
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

  // Fungsi untuk fetch data tanpa loading state
  const fetchDataSilently = async () => {
    if (!filters.line || !filters.style || isFetchingRef.current) return;

    console.log('Silent fetch started at:', new Date().toLocaleTimeString());
    isFetchingRef.current = true;
    const seq = ++requestSeqRef.current;
    const isStale = () => seq !== requestSeqRef.current;

    try {
      const formattedDate = format(filters.date, 'yyyy-MM-dd');
      
      // 1. Get lines data if not already loaded
      let currentLines = lines;
      if (currentLines.length === 0) {
        console.log('Fetching lines data...');
        try {
          currentLines = await fetchLines(filters.factory);
          setLines(currentLines);
        } catch (error) {
          console.error('Error fetching lines:', error);
        }
      }

      const selectedLine = currentLines.find(line => line.NOLINE === filters.line);
      const noline = selectedLine?.NOLINE || filters.line;
      setActualLineName(selectedLine?.LINE || filters.line);

      // 2. Fetch defect info
      console.log('Fetching defect info...');
      const defectInfo = await fetchDefectInfo(filters.style, noline, formattedDate, filters.factory);
      if (isStale()) return; // Drop outdated

      // 3. Fetch top defects
      console.log('Fetching top defects...');
      const topDefects = await fetchTopDefects(noline, formattedDate, filters.factory);
      if (isStale()) return; // Drop outdated

      const hourlyData = [
        { time: "6", output: defectInfo.H06 },
        { time: "7", output: defectInfo.H07 },
        { time: "8", output: defectInfo.H08 },
        { time: "9", output: defectInfo.H09 },
        { time: "10", output: defectInfo.H10 },
        { time: "11", output: defectInfo.H11 },
        { time: "12", output: defectInfo.H12 },
        { time: "13", output: defectInfo.H13 },
        { time: "14", output: defectInfo.H14 },
        { time: "15", output: defectInfo.H15 },
        { time: "16", output: defectInfo.H16 },
        { time: "17", output: defectInfo.H17 },
        { time: "18", output: defectInfo.H18 },
        { time: "19", output: defectInfo.H19 },
        { time: "20", output: defectInfo.H20 },
        { time: "21", output: defectInfo.H21 }
      ];

      // Filter data yang memiliki output > 0 dan hanya jam kerja valid (8-21)
      const productiveHours = hourlyData.filter(item => {
        const hour = parseInt(item.time);
        return hour >= 8 && hour <= 21 && item.output > 0;
      });

      // Hitung total output dari jam-jam yang produktif
      const totalOutput = productiveHours.reduce((sum, item) => sum + item.output, 0);
      
      // Jumlah jam produktif adalah jumlah data yang memiliki output
      const totalProductiveHours = productiveHours.length;
      
      // Hitung output per jam
      const outputPerHour = totalProductiveHours > 0 ? Math.round(totalOutput / totalProductiveHours) : 0;
      const targetPerHour = Math.round(defectInfo.TARGET_DAY / 8); // Assuming 8-hour workday

      const newData = {
        style: defectInfo.STYLE_NO,
        color: defectInfo.COLOR,
        buyer: defectInfo.BUYER.trim(),
        orderQty: `${defectInfo.ORDER_QTY}/${defectInfo.PROD_QTY}`,
        inspection: defectInfo.TOTAL_INSPECTION,
        defectCount: defectInfo.TOTAL_DEFECT,
        topDefects: topDefects.map(d => d.DEFECT_NAME),
        output: defectInfo.ASM_OUT,
        target: defectInfo.TARGET_DAY,
        outputPerHour,
        targetPerHour,
        targetPercentage: Math.round((defectInfo.ASM_OUT / defectInfo.TARGET_DAY) * 100),
        defectPercentage: Math.round((defectInfo.TOTAL_DEFECT / defectInfo.TOTAL_INSPECTION) * 100) || 0,
        hourlyOutputs: hourlyData,
        poNumber: defectInfo.PO_NUMBER,
        totalRepair: defectInfo.TOTAL_REPAIR
      };

      // Update data hanya jika ada perubahan
      if (JSON.stringify(data) !== JSON.stringify(newData)) {
        setData(newData);
        console.log('Data updated at:', new Date().toLocaleTimeString());
      }

      console.log('Silent fetch completed at:', new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error during silent fetch:', err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  // Start auto refresh
  const startAutoRefresh = useCallback(() => {
    console.log('Starting auto refresh service...');
    if (autoRefreshIntervalRef.current) {
      window.clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = undefined;
    }

    const intervalId = window.setInterval(() => {
      if (filters.line && filters.style) {
        console.log('Auto refresh triggered at:', new Date().toLocaleTimeString());
        fetchDataSilently();
      }
    }, 10000); // 10 detik

    autoRefreshIntervalRef.current = intervalId;
    setIsAutoRefreshEnabled(true);
  }, [filters]);

  // Cleanup effect untuk auto refresh
  useEffect(() => {
    return () => {
      console.log('Cleaning up auto refresh service...');
      if (autoRefreshIntervalRef.current) {
        window.clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = undefined;
      }
      setIsAutoRefreshEnabled(false);
    };
  }, []);

  const handleLookup = async () => {
    if (!filters.line || !filters.style) return;

    setLoading(true);
    setError(null);

    try {
      const formattedDate = format(filters.date, 'yyyy-MM-dd');
      
      // 1. Get lines data if not already loaded
      let currentLines = lines;
      if (currentLines.length === 0) {
        console.log('Fetching lines data...');
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

      // 2. Fetch defect info
      console.log('Fetching defect info...');
      const defectInfo = await fetchDefectInfo(filters.style, noline, formattedDate, filters.factory);

      // 3. Fetch top defects
      console.log('Fetching top defects...');
      const topDefects = await fetchTopDefects(noline, formattedDate, filters.factory);

      // Transform API data to match our component's data structure
      const hourlyData = [
        { time: "6", output: defectInfo.H06 },
        { time: "7", output: defectInfo.H07 },
        { time: "8", output: defectInfo.H08 },
        { time: "9", output: defectInfo.H09 },
        { time: "10", output: defectInfo.H10 },
        { time: "11", output: defectInfo.H11 },
        { time: "12", output: defectInfo.H12 },
        { time: "13", output: defectInfo.H13 },
        { time: "14", output: defectInfo.H14 },
        { time: "15", output: defectInfo.H15 },
        { time: "16", output: defectInfo.H16 },
        { time: "17", output: defectInfo.H17 },
        { time: "18", output: defectInfo.H18 },
        { time: "19", output: defectInfo.H19 },
        { time: "20", output: defectInfo.H20 },
        { time: "21", output: defectInfo.H21 }
      ];

      // Filter data yang memiliki output > 0 dan hanya jam kerja valid (8-21)
      const productiveHours = hourlyData.filter(item => {
        const hour = parseInt(item.time);
        return hour >= 8 && hour <= 21 && item.output > 0;
      });

      // Hitung total output dari jam-jam yang produktif
      const totalOutput = productiveHours.reduce((sum, item) => sum + item.output, 0);
      
      // Jumlah jam produktif adalah jumlah data yang memiliki output
      const totalProductiveHours = productiveHours.length;
      
      // Hitung output per jam
      const outputPerHour = totalProductiveHours > 0 ? Math.round(totalOutput / totalProductiveHours) : 0;
      const targetPerHour = Math.round(defectInfo.TARGET_DAY / 8); // Assuming 8-hour workday

      setData({
        style: defectInfo.STYLE_NO,
        color: defectInfo.COLOR,
        buyer: defectInfo.BUYER.trim(),
        orderQty: `${defectInfo.ORDER_QTY}/${defectInfo.PROD_QTY}`,
        inspection: defectInfo.TOTAL_INSPECTION,
        defectCount: defectInfo.TOTAL_DEFECT,
        topDefects: topDefects.map(d => d.DEFECT_NAME),
        output: defectInfo.ASM_OUT,
        target: defectInfo.TARGET_DAY,
        outputPerHour,
        targetPerHour,
        targetPercentage: Math.round((defectInfo.ASM_OUT / defectInfo.TARGET_DAY) * 100),
        defectPercentage: Math.round((defectInfo.TOTAL_DEFECT / defectInfo.TOTAL_INSPECTION) * 100) || 0,
        hourlyOutputs: hourlyData,
        poNumber: defectInfo.PO_NUMBER,
        totalRepair: defectInfo.TOTAL_REPAIR
      });

      // Langsung mulai auto refresh setelah lookup berhasil
      startAutoRefresh();
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data');
      setIsAutoRefreshEnabled(false);
      if (autoRefreshIntervalRef.current) {
        window.clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = undefined;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Header */}
      <Header
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
          setIsAutoRefreshEnabled(false);
          if (autoRefreshIntervalRef.current) {
            window.clearInterval(autoRefreshIntervalRef.current);
            autoRefreshIntervalRef.current = undefined;
          }
        }}
        onLookup={handleLookup}
        className="bg-gray-900"
      />

      {/* Main Content */}
      <div className="p-2 lg:p-4">
        {/* Info Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2 lg:mb-4">
          <h2 className="text-lg lg:text-2xl font-semibold text-gray-100 mb-2 lg:mb-0">Defect Monitoring Dashboard</h2>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2">
            <h3 className="text-sm lg:text-lg text-gray-300">
              Date {format(filters.date, 'yyyy-MM-dd')} | Line {actualLineName} | Style {filters.style}
            </h3>
            {isAutoRefreshEnabled && (
              <div className="flex items-center gap-1 bg-green-900/50 text-green-300 px-2 lg:px-3 py-1 lg:py-1.5 rounded-md text-sm lg:text-base font-medium">
                <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                <span>Realtime Data</span>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-3 lg:gap-6 h-[calc(100vh-120px)] lg:h-[calc(100vh-140px)]">
            <ProductionInfoSkeleton />
            <HourlyOutputSkeleton />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-3 lg:gap-6 h-[calc(100vh-120px)] lg:h-[calc(100vh-140px)]">
            <ProductionInfo data={data} />
            <HourlyOutput data={data.hourlyOutputs} />
          </div>
        )}
      </div>

      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className={`fixed bottom-4 right-4 p-2 rounded-full shadow-lg transition-all duration-300 ${
          isFullscreen 
            ? 'bg-red-900 hover:bg-red-800' 
            : 'bg-blue-900 hover:bg-blue-800'
        } text-white`}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="w-6 h-6" />
        ) : (
          <Maximize2 className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};

export default DefectMonitoring;
