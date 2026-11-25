import React, { useMemo, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';

interface ProcessData {
  title: string;
  field: string;
  qty: number;
  balance: number;
}

interface SummaryChartProps {
  data: ProcessData[];
}

const SummaryChart: React.FC<SummaryChartProps> = React.memo(({ data }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Menghitung nilai maksimum dari qty dan balance
  const maxValue = useMemo(() => {
    const maxQty = Math.max(...data.map(item => item.qty));
    const maxBalance = Math.max(...data.map(item => item.balance));
    // Mengambil nilai tertinggi dan membulatkan ke atas ke puluhan terdekat
    const maxFromBoth = Math.max(maxQty, maxBalance);
    return Math.ceil(maxFromBoth / 10) * 10;
  }, [data]);

  const processedData = useMemo(() => {
    return data.map(item => ({
      name: item.title,
      qty: item.qty,
      color: item.balance === 0 ? '#22C55E' : item.balance < 0 ? '#EF4444' : '#FBBF24'
    }));
  }, [data]);

  return (
    <div className={`bg-gray-900 p-4 ${isMobile ? 'p-2' : ''} rounded-lg shadow-sm border border-gray-700`}>
      <h3 className={`text-2xl ${isMobile ? 'text-lg' : ''} font-semibold text-gray-100 mb-4`}>Process Progress Summary</h3>
      <div style={{ 
        height: isMobile ? '400px' : '400px',
        width: '100%'
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData}
            maxBarSize={isMobile ? 50 : 80}
            margin={isMobile ? 
              { top: 20, right: 30, left: 20, bottom: 20 } : 
              { top: 30, right: 30, left: 20, bottom: 20 }
            }
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name"
              tick={{ 
                fill: "#D1D5DB",
                fontSize: isMobile ? 12 : 14,
                fontWeight: "bold"
              }}
              height={isMobile ? 60 : 60}
              interval={0}
              stroke="#D1D5DB"
              padding={{ left: isMobile ? 10 : 20, right: isMobile ? 10 : 20 }}
            />
            <YAxis 
              tick={{ 
                fontSize: isMobile ? 12 : 14, 
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
                fontSize: isMobile ? '12px' : '14px',
                color: '#D1D5DB'
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              formatter={(value: number, name: string, props: any) => {
                const item = data.find(d => d.title === props.payload.name);
                return [
                  <div>
                    <span style={{ 
                      fontWeight: 600, 
                      fontSize: isMobile ? '12px' : '14px',
                      color: props.payload.color
                    }}>
                      QTY: {value}
                    </span>
                    {item && (
                      <div style={{ 
                        fontWeight: 600, 
                        fontSize: isMobile ? '12px' : '14px',
                        color: item.balance === 0 ? '#22C55E' : item.balance < 0 ? '#EF4444' : '#FBBF24'
                      }}>
                        Balance: {item.balance}
                      </div>
                    )}
                  </div>,
                  ''
                ];
              }}
              labelStyle={{ 
                color: '#D1D5DB', 
                fontWeight: 500, 
                fontSize: isMobile ? '12px' : '14px' 
              }}
            />
            <Bar 
              dataKey="qty" 
              name="Progress"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
            >
              {
                processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))
              }
              <LabelList 
                dataKey="qty" 
                position="top"
                style={{ 
                  fill: '#D1D5DB',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: 'bold'
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default SummaryChart;
