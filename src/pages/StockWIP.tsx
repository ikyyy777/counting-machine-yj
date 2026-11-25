// src/pages/StockWIP.tsx
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import StockWIPHeader from '../components/StockWIP/Header';
import StockWIPTable from '../components/StockWIP/Table';
import { WIPRow } from '../types/stockWIP';
import { fetchStockWIP } from '../services/stockWIP';
//import { useNavigate } from 'react-router-dom';

const LINES_PER_PAGE = 7;
const AUTO_SCROLL_INTERVAL = 25000;

const StockWIP: React.FC = () => {
  const [factory, setFactory] = useState('YONGJIN 2');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WIPRow[]>([]);

  const [currentPage, setCurrentPage] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  //const navigate = useNavigate();
  const handleLookup = async (resetPage = true) => {
  setLoading(true);
  try {
    const formatted = format(date, 'yyyy-MM-dd');

    const json = await fetchStockWIP({
      factory,
      dateFrom: formatted,
      dateTo: formatted,
    });

    setData(json);

    if (resetPage) {
      setCurrentPage(0);
    }

  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const grouped = useMemo(() => {
    const map: Record<string, WIPRow[]> = {};
    data.forEach(r => {
      const key = `${r.LINE_CODE}_${r.STYLE}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [data]);

  const pages = useMemo(() => {
    const entries = Object.entries(grouped); // [[key, rows]]
    const result: typeof entries[] = [];
    for (let i = 0; i < entries.length; i += LINES_PER_PAGE) {
      result.push(entries.slice(i, i + LINES_PER_PAGE));
    }
    return result;
  }, [grouped]);

  const totalPages = pages.length;

  React.useEffect(() => {
    if (!autoScroll || totalPages <= 1) return;

    const timer = setInterval(() => {
      setCurrentPage(prev => (prev === totalPages - 1 ? 0 : prev + 1));
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(timer);
  }, [autoScroll, totalPages]);

  const currentGrouped = useMemo(() => {
    if (!pages.length) return {};
    return Object.fromEntries(pages[currentPage]);
  }, [pages, currentPage]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <StockWIPHeader
        factory={factory}
        date={date}
        onFactoryChange={setFactory}
        onDateChange={setDate}
        onLookup={handleLookup}
        loading={loading}
      />

      <div className="p-6">
        {/* CONTROL */}

        {totalPages > 0 && (
          <div className="flex items-center mb-6">

            {/* LEFT SIDE */}
            <div className="flex items-center gap-6">

              {/* PAGE */}
              <div className="text-sm text-gray-300 leading-none flex items-center">
                Page {currentPage + 1} / {totalPages}
              </div>

              {/* LEGEND */}
              <div className="flex items-center gap-4 text-sm leading-none">

                <span className="text-gray-400 font-semibold">
                  ITEM (JAKET & PANT)
                </span>

                <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-600 bg-yellow-900/30 text-yellow-400">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  seam,padd → Lebih 3 jam
                </span>

                <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-red-600 bg-red-900/30 text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  seam,down → Lebih 2 jam
                </span>

                <span className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-600 bg-orange-900/30 text-orange-400">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  Normal → Lebih 4 jam
                </span>

              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-2 ml-auto text-sm">
              <button
                onClick={() => setCurrentPage(p => (p === 0 ? totalPages - 1 : p - 1))}
                className="px-3 py-1 bg-gray-700 rounded"
              >
                ◀
              </button>

              <button
                onClick={() => setAutoScroll(v => !v)}
                className="px-3 py-1 bg-blue-700 rounded"
              >
                {autoScroll ? 'Stop AutoScroll' : 'Start AutoScroll'}
              </button>

              <button
                onClick={() => setCurrentPage(p => (p === totalPages - 1 ? 0 : p + 1))}
                className="px-3 py-1 bg-gray-700 rounded"
              >
                ▶
              </button>
            </div>


          </div>
        )}



        {/* TABLE */}
        {Object.keys(currentGrouped).length > 0 ? (
          <StockWIPTable
            grouped={currentGrouped}
            onReload={handleLookup}
          />

        ) : (
          <div className="text-gray-400 text-center py-10 border border-dashed border-gray-600 rounded-lg">
            {loading ? 'Loading...' : 'No data'}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockWIP;
