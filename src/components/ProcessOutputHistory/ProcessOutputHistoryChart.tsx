import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { ProcessOutputHistoryResponse } from '../../types/api';

type ChartMetric = 'ACTUAL' | 'ASM_OUT' | 'AVERAGE_PER_PART' | 'TOTAL_QTY_ALL';

type ChartRow = {
  name: string;
  value: number;
  status: string;
  raw: ProcessOutputHistoryResponse;
};

interface Props {
  data: ProcessOutputHistoryResponse[];
  metric?: ChartMetric;
  topN?: number;
  className?: string;
}

// --- KONFIGURASI DIMENSI ---
const ROW_HEIGHT = 45;   // Tinggi setiap baris data
const AXIS_HEIGHT = 35;  // Tinggi area X-Axis (garis ukur di atas)

const ProcessOutputHistoryChart: React.FC<Props> = ({ data, metric = 'ACTUAL', topN, className }) => {
  const [colWidths, setColWidths] = useState({ operatorName: 200, processName: 200 });
  const dragRef = useRef<null | {
    col: 'operatorName' | 'processName';
    startX: number;
    startWidth: number;
  }>(null);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { col, startX, startWidth } = dragRef.current;
      const delta = e.clientX - startX;
      const next = Math.min(500, Math.max(80, startWidth + delta));
      setColWidths((prev) => ({ ...prev, [col]: next }));
    };

    const onMouseUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const chartData = useMemo<ChartRow[]>(() => {
    // Custom sorting order for PART (Process Name)
    const sortOrder = ['PART', 'LINING', 'HOOD', 'FRONT', 'BACKSLEEVE', 'BACK SLEEVE', 'JOIN', 'ASSEMBLY'];
    
    const getSortOrder = (part: string) => {
      const normalized = String(part ?? '').toUpperCase().trim();
      const idx = sortOrder.findIndex(s => normalized.includes(s));
      return idx === -1 ? sortOrder.length : idx;
    };

    const sorted = [...(data || [])].sort((a, b) => {
      const ap = String(a.PART ?? '').toUpperCase().trim();
      const bp = String(b.PART ?? '').toUpperCase().trim();
      
      const orderA = getSortOrder(ap);
      const orderB = getSortOrder(bp);
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // If same order group, sort alphabetically within group
      return ap.localeCompare(bp, undefined, { numeric: true, sensitivity: 'base' });
    });

    const limited = typeof topN === 'number' ? sorted.slice(0, Math.max(1, topN)) : sorted;

    return limited.map((item) => ({
      name: item.E_NAME,
      value: Number((item as any)[metric] ?? 0),
      status: String(item.STATUS_OUTPUT ?? ''),
      raw: item
    }));
  }, [data, metric, topN]);

  const maxValue = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.max(...chartData.map(r => r.value));
  }, [chartData]);

  // Total tinggi container = (Jumlah Data * Tinggi Baris) + Tinggi Axis
  const totalChartHeight = (chartData.length * ROW_HEIGHT) + AXIS_HEIGHT;

  const getBarColor = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === 'deficient') return '#ef4444';
    if (s === 'sufficient') return '#22c55e';
    return '#60a5fa';
  };

  return (
    <div className={`bg-gray-900 rounded-lg shadow-sm border border-gray-700 flex flex-col ${className || ''}`}>
      
      {/* --- HEADER JUDUL KOLOM --- */}
      <div className="flex items-center border-b border-gray-700 bg-gray-800 text-gray-200 text-sm font-bold rounded-t-lg select-none z-10">
        <div className="relative px-4 py-3 border-r border-gray-700" style={{ width: colWidths.processName }}>
          Module
          <div
            className="absolute right-0 top-0 h-full w-[6px] cursor-col-resize hover:bg-blue-500 z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              dragRef.current = { col: 'processName', startX: e.clientX, startWidth: colWidths.processName };
            }}
          />
        </div>
        <div className="relative px-4 py-3 border-r border-gray-700" style={{ width: colWidths.operatorName }}>
          Operator Name
          <div
            className="absolute right-0 top-0 h-full w-[6px] cursor-col-resize hover:bg-blue-500 z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              dragRef.current = { col: 'operatorName', startX: e.clientX, startWidth: colWidths.operatorName };
            }}
          />
        </div>
        <div className="flex-1 px-4 py-3">
          Output Graph ({metric})
        </div>
      </div>

      {/* --- BODY SCROLLABLE --- */}
      <div className="overflow-y-auto max-h-[70vh] custom-scrollbar bg-gray-900 relative">
        <div className="flex" style={{ height: totalChartHeight }}>
          
          {/* BAGIAN KIRI: Teks (Module & Operator) */}
          <div className="flex-none flex flex-col border-r border-gray-700 bg-gray-900">
            
            {/* [PENTING] Spacer ini menyeimbangkan tinggi XAxis di sebelah kanan */}
            {/* Supaya baris data pertama dimulai di posisi yang sama dengan bar pertama */}
            <div 
              className="border-b border-gray-800 bg-gray-900/50" 
              style={{ height: AXIS_HEIGHT, width: '100%' }} 
            />

            {chartData.map((row, idx) => (
              <div 
                key={`row-text-${idx}`} 
                className="flex border-b border-gray-800 hover:bg-gray-800 transition-colors"
                style={{ height: ROW_HEIGHT }}
              >
                <div 
                  className="px-4 flex items-center text-sm text-gray-300 border-r border-gray-800 truncate"
                  style={{ width: colWidths.processName }}
                  title={row.raw.PART}
                >
                  {row.raw.PART}
                </div>
                <div 
                  className="px-4 flex items-center text-sm text-gray-300 truncate"
                  style={{ width: colWidths.operatorName }}
                  title={row.raw.E_NAME}
                >
                  {row.raw.E_NAME}
                </div>
              </div>
            ))}
          </div>

          {/* BAGIAN KANAN: Chart */}
          <div className="flex-1 min-w-0 bg-gray-900 relative">
            <ResponsiveContainer width="100%" height={totalChartHeight}>
              <BarChart
                layout="vertical"
                data={chartData}
                // Margin 0 supaya chart mepet ke batas container
                margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                barCategoryGap={0}
              >
                {/* Grid Vertikal saja, horizontal dimatikan agar tidak double line dengan border HTML */}
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} vertical={true} />
                
                {/* XAxis Height diset SAMA dengan Spacer di kiri (AXIS_HEIGHT).
                   Ini yang bikin bar terdorong ke bawah, makanya kiri butuh spacer.
                */}
                <XAxis 
                  type="number" 
                  orientation="top" 
                  stroke="#6B7280" 
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  domain={[0, Math.ceil(maxValue * 1.15)]}
                  height={AXIS_HEIGHT} 
                />

                <YAxis type="category" dataKey="name" hide width={0} />

                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    borderColor: '#374151',
                    color: '#F3F4F6',
                    borderRadius: '6px'
                  }}
                  itemStyle={{ color: '#F3F4F6' }}
                  formatter={(val: number, _name: string, props: any) => {
                    const r = props.payload.raw;
                    return [`${val} (Part: ${r.PART})`, metric];
                  }}
                />

                <Bar 
                  dataKey="value" 
                  // Bar lebih kecil dari ROW_HEIGHT agar ada jarak atas bawah (centering)
                  barSize={ROW_HEIGHT - 12} 
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    style={{ fill: '#D1D5DB', fontSize: '12px', fontWeight: '600' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default ProcessOutputHistoryChart;