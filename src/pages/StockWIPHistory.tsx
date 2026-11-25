// src/pages/StockWIPHistory.tsx
import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { fetchStockWIP } from '../services/stockWIP';
import { WIPRow } from '../types/stockWIP';
import StockWIPTable from '../components/StockWIP/Table';

const StockWIPHistory: React.FC = () => {
  const [factory, setFactory] = useState('YONGJIN 2');
  const [dateFrom, setDateFrom] = useState(new Date());
  const [dateTo, setDateTo] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WIPRow[]>([]);

  const FACTORIES = [
    { label: 'YONGJIN 1', value: 'YONGJIN 1' },
    { label: 'YONGJIN 2-1', value: 'YONGJIN 2-1' },
    { label: 'YONGJIN 2-2', value: 'YONGJIN 2-2' },
    { label: 'YONGJIN 3', value: 'YONGJIN 3' },
    ];
  const navigate = useNavigate();
  const handleLookup = async () => {
    setLoading(true);
    try {
      const raw = await fetchStockWIP({
        factory,
        dateFrom: format(dateFrom, 'yyyy-MM-dd'),
        dateTo: format(dateTo, 'yyyy-MM-dd'),
      });

      setData(raw);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const aggregatedData = useMemo(() => {
  const map: Record<string, any> = {};

  data.forEach((row) => {
    const key = `${row.LINE_CODE}_${row.STYLE}_${row.ITEM ?? ''}`;
    const partKey = row.PART.toUpperCase();

    if (!map[key]) {
      map[key] = {
        LINE_CODE: row.LINE_CODE,
        LINE_NAME: row.LINE_NAME,
        STYLE: row.STYLE,
        STYLE_DISPLAY: row.STYLE_DISPLAY,
        ITEM: row.ITEM,
        parts: {},
      };
    }

    if (!map[key].parts[partKey]) {
      map[key].parts[partKey] = {
        ...row,
        STOCK_QTY: 0,
        WIP_ROOM_STOCK: 0,
        PERJAM_TOTAL: 0,
        DAY_COUNT: 0,
      };
    }

    const part = map[key].parts[partKey];

    // ✅ SUM STOCK
    part.STOCK_QTY += row.STOCK_QTY ?? 0;

    // ✅ SUM ROOM STOCK
    part.WIP_ROOM_STOCK += row.WIP_ROOM_STOCK ?? 0;

    // ✅ SUM PERJAM
    part.PERJAM_TOTAL += row.PERJAM_OUTPUT ?? 0;

    // ✅ Hitung jumlah baris (hari)
    part.DAY_COUNT += 1;
  });

  const result: WIPRow[] = [];

  Object.values(map).forEach((group: any) => {
    Object.values(group.parts).forEach((part: any) => {

      part.PERJAM_OUTPUT =
        part.DAY_COUNT > 0
          ? Number((part.PERJAM_TOTAL / part.DAY_COUNT).toFixed(2))
          : 0;

      result.push(part);
    });
  });

  return result;
}, [data]);

  // group untuk StockWIPTable
  const grouped = useMemo(() => {
    const map: Record<string, WIPRow[]> = {};
    aggregatedData.forEach((r) => {
      const key = `${r.LINE_CODE}_${r.STYLE}_${r.ITEM ?? ''}`;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [aggregatedData]);

  return (
    
   <div className="min-h-screen bg-gray-900 text-white p-6">
    <button
        onClick={() => navigate('/stock-wip')}
        className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
    >
        ← Back
    </button>

    <h1 className="text-2xl font-bold mb-6">
        Stock WIP History
    </h1>
      {/* FILTER */}
     <div className="flex gap-4 mb-6 items-end flex-wrap">

        {/* Factory */}
        <div>
            <label className="block text-sm mb-1">FACTORY

            </label>
            <select
            value={factory}
            onChange={(e) => setFactory(e.target.value)}
            className="bg-gray-800 border border-gray-600 px-3 py-2 rounded"
            >
            {FACTORIES.map((f) => (
                <option key={f.value} value={f.value}>
                {f.label}
                </option>
            ))}
            </select>
        </div>

        {/* Date From */}
        <div>
            <label className="block text-sm mb-1">START DATE</label>
            <input
            type="date"
            value={format(dateFrom, 'yyyy-MM-dd')}
            onChange={(e) => setDateFrom(new Date(e.target.value))}
            className="bg-gray-800 border border-gray-600 px-3 py-2 rounded"
            />
        </div>

        {/* Date To */}
        <div>
            <label className="block text-sm mb-1">END DATE</label>
            <input
            type="date"
            value={format(dateTo, 'yyyy-MM-dd')}
            onChange={(e) => setDateTo(new Date(e.target.value))}
            className="bg-gray-800 border border-gray-600 px-3 py-2 rounded"
            />
        </div>

        <button
            onClick={handleLookup}
            className="px-4 py-2 bg-blue-600 rounded"
        >
            Lookup
        </button>

        </div>

      {loading && (
        <div className="text-gray-400 mb-4">
          Loading...
        </div>
      )}

      {!loading && aggregatedData.length === 0 && (
        <div className="text-gray-500">
          No Data
        </div>
      )}

      {aggregatedData.length > 0 && (
        <>
          <div className="mb-4 text-sm text-gray-400">
            Range: {format(dateFrom, 'dd MMM yyyy')} -{' '}
            {format(dateTo, 'dd MMM yyyy')}
            <br />
            Raw Rows: {data.length} | After Aggregation:{' '}
            {aggregatedData.length}
          </div>

          <StockWIPTable
            grouped={grouped}
            onReload={handleLookup}
            readOnly={true}
          />
        </>
      )}
    </div>
  );
};

export default StockWIPHistory;