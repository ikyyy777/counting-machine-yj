import React from 'react';
import { TrendingUp, FileText } from 'lucide-react';

interface HourlyOutputProps {
  data: { time: string; output: number }[];
}

const HourlyOutput: React.FC<HourlyOutputProps> = ({ data }) => {
  // Fungsi untuk mapping jam
  const getHourLabel = (hour: number, dayOfWeek: number) => {
    // Mapping default untuk tampilan jam
    const mapping = {
      8: '8',
      9: '9',
      10: '10',
      11: '11',
      13: '1',
      14: '2',
      15: '3',
      16: '4',
      17: '5',
      18: '6',
      19: '7',
      20: '8'
    };

    // Pangkat 3 jam untuk Senin-Kamis: 19, 20
    // Pangkat 3 jam untuk Jumat: 11, 19, 20
    let isSup3 = false;
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      if (hour === 19 || hour === 20) isSup3 = true;
    } else if (dayOfWeek === 5) {
      if (hour === 11 || hour === 19 || hour === 20) isSup3 = true;
    }
    const label = mapping[hour as keyof typeof mapping] || hour.toString();
    return isSup3 ? <>{label}<sup>3</sup></> : label;
  };

  // Fungsi untuk menggabungkan output berdasarkan jam
  const consolidateHourlyData = (data: { time: string; output: number }[]) => {
    const consolidatedData = new Map<number, number>();
    
    data.forEach(item => {
      const hour = parseInt(item.time);
      
      // Aturan penggabungan
      let targetHour = hour;
      if (hour === 6 || hour === 7) targetHour = 8;
      if (hour === 12) targetHour = 13;
      if (hour === 21) targetHour = 20;
      
      const currentValue = consolidatedData.get(targetHour) || 0;
      consolidatedData.set(targetHour, currentValue + item.output);
    });

    // Konversi Map ke array dan urutkan berdasarkan jam
    return Array.from(consolidatedData.entries())
      .filter(([hour]) => hour >= 8 && hour <= 20) // Hanya tampilkan jam 8-20
      .sort(([hourA], [hourB]) => hourA - hourB)
      .map(([hour, output]) => ({
        time: hour.toString(),
        output
      }));
  };

  const consolidatedData = consolidateHourlyData(data);
  const dayOfWeek = new Date().getDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu

  // Split data into two columns
  const midPoint = Math.ceil(consolidatedData.length / 2);
  const leftColumnData = consolidatedData.slice(0, midPoint);
  const rightColumnData = consolidatedData.slice(midPoint);

 return (
    <div className="bg-gray-900 p-3 lg:p-4 rounded-lg shadow-sm border border-gray-700 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 lg:mb-4">
        <TrendingUp className="w-6 h-6 lg:w-10 lg:h-10 text-blue-400" />
        <span className="text-xl lg:text-3xl font-bold text-gray-200">HOURLY PRODUCTION</span>
      </div>

      {/* 2. Grid Data: Pastikan div ini tertutup SEBELUM tombol dimulai */}
      <div className="grid grid-cols-2 gap-3 lg:gap-6 mt-3 lg:mt-6">
        {/* Left Column */}
        <div className="flex flex-col gap-2 lg:gap-4">
          {leftColumnData.map((item, index) => (
            <div key={index} className="bg-gray-800 px-4 py-3 lg:px-8 lg:py-6 rounded-lg flex justify-between items-center">
              <div className="text-2xl lg:text-5xl text-gray-400 min-w-[60px] lg:min-w-[100px]">
                {getHourLabel(parseInt(item.time), dayOfWeek)}
              </div>
              <div className="text-3xl lg:text-6xl font-bold text-gray-100">
                {item.output}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-2 lg:gap-4">
          {rightColumnData.map((item, index) => (
            <div key={index} className="bg-gray-800 px-4 py-3 lg:px-8 lg:py-6 rounded-lg flex justify-between items-center">
              <div className="text-2xl lg:text-5xl text-gray-400 min-w-[60px] lg:min-w-[100px]">
                {getHourLabel(parseInt(item.time), dayOfWeek)}
              </div>
              <div className="text-3xl lg:text-6xl font-bold text-gray-100">
                {item.output}
              </div>
            </div>
          ))}
        </div>
      </div> {/* <-- TUTUP GRID DI SINI */}
      <div className="mt-10 mb-4 flex justify-center w-full"> 
        <a 
          href="http://192.168.55.105:1409/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="
            flex items-center justify-center gap-3 
            w-full max-w-[300px] lg:max-w-[500px] 
            bg-blue-600 hover:bg-blue-700 
            text-white font-bold py-3 lg:py-5 
            rounded-lg transition-all shadow-lg
          "
        >
          <FileText className="w-5 h-5 lg:w-8 lg:h-8" />
          <span className="text-lg lg:text-3xl uppercase tracking-wider">
            ENDLINE QC Report
          </span>
        </a>
      </div>

    </div> 
  );
};

export default HourlyOutput;