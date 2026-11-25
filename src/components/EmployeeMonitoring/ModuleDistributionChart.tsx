import React, { useMemo, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { ModuleData } from '../../types/dashboard';

interface ModuleDistributionChartProps {
  data: ModuleData[];
  title: string;
  type: 'input' | 'output';
  color: string;
  className?: string;
}

const ModuleDistributionChart: React.FC<ModuleDistributionChartProps> = React.memo(({ data, title, type, color, className }) => {
  const [isMobile, setIsMobile] = useState(false);
  const dataKey = type === 'input' ? 'input' : 'output';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fungsi untuk menyingkat nama modul
  const shortenModuleName = (name: string): string => {
    const lowerName = name.toLowerCase().trim();
    
    // Mapping untuk penyingkatan nama
    const shortNames: { [key: string]: string } = {
      'back sleeve': 'BACKSLV',
      'assembly': 'ASMBL',
      'seamsealing': 'SMSL',
      'seamseling': 'SMSL',
      'backsleeve': 'BACKSLV',
      'sewing supporter': 'SS'
    };

    // Cek setiap kemungkinan match
    for (const [longName, shortName] of Object.entries(shortNames)) {
      if (lowerName.includes(longName)) {
        return shortName;
      }
    }
    
    return name.toUpperCase();
  };

  // Menghitung nilai maksimum dari input dan output
  const maxValue = useMemo(() => {
    const maxInput = Math.max(...data.map(item => item.input));
    const maxOutput = Math.max(...data.map(item => item.output));
    // Mengambil nilai tertinggi dan membulatkan ke atas ke puluhan terdekat
    const maxFromBoth = Math.max(maxInput, maxOutput);
    return Math.ceil(maxFromBoth / 10) * 10;
  }, [data]);

  // Memoize data dengan nama yang disingkat
  const processedData = useMemo(() => {
    return data.map(item => {
      let barColor = '#34d399'; // hijau muda agak gelap (default)
      const partName = item.name.toUpperCase();
      if (partName.includes('JOIN') || partName.includes('ASSEMBLY')) {
        barColor = '#065f46'; // hijau gelap
      }
      return {
        ...item,
        name: shortenModuleName(item.name),
        color: barColor
      };
    });
  }, [data]);

  // Fungsi untuk mengatur posisi teks secara zigzag
  const customTickFormatter = (value: string, index: number) => {
    // Singkat nama modul
    const shortenedName = shortenModuleName(value);
    // Geser ke bawah untuk indeks ganjil (zigzag)
    const dy = index % 2 === 0 ? '0.5em' : '2em';
    return { value: shortenedName, dy };
  };

  // Memoize chart configuration dengan ukuran responsif
  const chartConfig = useMemo(() => ({
    dataKey,
    barProps: {
      radius: [4, 4, 0, 0] as [number, number, number, number]
    },
    labelProps: {
      position: "top" as const,
      style: { 
        fill: '#4B5563',
        fontSize: isMobile ? '14px' : '24px',
        fontWeight: 'bold'
      }
    }
  }), [dataKey, isMobile]);
  
  return (
    <div className={`bg-gray-900 p-4 ${isMobile ? 'p-2' : ''} rounded-lg shadow-sm border border-gray-700 ${className || ''}`}>
      <h3 className={`text-2xl ${isMobile ? 'text-lg' : ''} font-semibold text-gray-100 mb-4`}>{title}</h3>
      <div style={{ 
        height: isMobile ? '400px' : '400px',
        width: '100%'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData}
            maxBarSize={isMobile ? 50 : 80}
            layout="horizontal"
            margin={isMobile ? 
              { top: 20, right: 30, left: 20, bottom: 20 } : 
              { top: 30, right: 30, left: 20, bottom: 20 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name"
              tick={(props) => {
                const { x, y, payload } = props;
                const { value, dy } = customTickFormatter(payload.value, payload.index);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={isMobile ? (payload.index % 2 === 0 ? '0.3em' : '1.5em') : dy}
                      textAnchor="middle"
                      fill="#D1D5DB"
                      fontSize={isMobile ? 14 : 14}
                      fontWeight="bold"
                    >
                      {value}
                    </text>
                  </g>
                );
              }}
              height={isMobile ? 40 : 60}
              interval={0}
              stroke="#D1D5DB"
              padding={{ left: isMobile ? 10 : 20, right: isMobile ? 10 : 20 }}
            />
            <YAxis 
              tick={{ 
                fontSize: isMobile ? 16 : 18, 
                fill: "#D1D5DB" 
              }}
              stroke="#D1D5DB"
              domain={[0, maxValue]}
              allowDataOverflow={false}
              width={isMobile ? 35 : 45}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                fontSize: isMobile ? '14px' : '24px',
                color: '#D1D5DB'
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              formatter={(value: number, name: string, props: any) => {
                const color = props.payload.color;
                const originalName = data.find(item => shortenModuleName(item.name) === name)?.name || name;
                return [
                  <span style={{ 
                    color: color, 
                    fontWeight: 600, 
                    fontSize: isMobile ? '16' : '18px' 
                  }}>
                    {`${originalName} : ${value}`}
                  </span>,
                  null
                ];
              }}
              labelStyle={{ 
                color: '#D1D5DB', 
                fontWeight: 500, 
                fontSize: isMobile ? '16px' : '18px' 
              }}
            />
            <Bar 
              dataKey={dataKey}
              fill={color}
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList 
                dataKey={dataKey} 
                position="top"
                style={{ 
                  fill: '#D1D5DB',
                  fontSize: isMobile ? '16px' : '24px',
                  fontWeight: 'bold'
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function untuk React.memo
  if (prevProps.type !== nextProps.type) return false;
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.data.length !== nextProps.data.length) return false;
  
  // Deep comparison untuk data
  return prevProps.data.every((item, index) => {
    const nextItem = nextProps.data[index];
    return (
      item.name === nextItem.name &&
      item.input === nextItem.input &&
      item.output === nextItem.output &&
      item.color === nextItem.color
    );
  });
});

export default ModuleDistributionChart;