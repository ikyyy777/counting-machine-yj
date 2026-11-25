import React from 'react';
import {
  Target,
  TrendingUp,
  Clock,
  Calculator,
  TrendingDown,
  History,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DashboardMetrics } from '../../types/dashboard';

interface OperatorBreakdownItem {
  label: string;
  value: number;
}

interface MetricsPanelProps {
  metrics: DashboardMetrics;
  className?: string;
  date?: Date;
  ytdHourlyProduction?: { time: string; output: number; total?: number }[];
  avgPerHourFromSp?: number | null;
  avgPerHourYesterdayFromSp?: number | null;
  workingHourFromSp?: number | null;
  jamPulangFromSp?: string;
  totalOperators?: number;
  operatorBreakdown?: OperatorBreakdownItem[];
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({
  metrics,
  className,
  date,
  ytdHourlyProduction,
  avgPerHourFromSp,
  avgPerHourYesterdayFromSp,
  workingHourFromSp,
  jamPulangFromSp,
  totalOperators = 0,
  operatorBreakdown = [],
}) => {
  const [showOperatorDetail, setShowOperatorDetail] = React.useState(false);

  const getAchievementColor = (rate: number) => {
    if (rate >= 90) return 'text-green-300 bg-green-900';
    if (rate >= 75) return 'text-yellow-300 bg-yellow-900';
    return 'text-red-300 bg-red-900';
  };

  // Fungsi untuk menghitung total jam kerja
  const calculateWorkingHours = (hourlyData: { time: string; output: number }[]) => {
    if (!hourlyData || hourlyData.length === 0) return 0;

    const hours = hourlyData
      .map(item => parseInt(item.time.split(':')[0]))
      .filter(hour => hour >= 8 && hour <= 21);

    if (hours.length === 0) return 0;

    let workingHours = hours.length;

    // Kurangi 1 jam untuk istirahat jika ada data yang mencakup jam istirahat (12:00)
    if (hours.some(h => h < 13) && hours.some(h => h > 12)) {
      workingHours -= 1;
    }

    return workingHours;
  };

  // Fungsi untuk menghitung average output untuk full day
  const calculateFullDayAverageOutput = (
    hourlyData: { time: string; output: number }[],
    _selectedDate?: Date
  ) => {
    if (!hourlyData || hourlyData.length === 0) return 0;

    // Filter data yang memiliki output > 0
    const productiveHours = hourlyData.filter(item => {
      const hour = parseInt(item.time.split(':')[0]);
      return hour >= 8 && hour <= 21 && item.output > 0;
    });

    if (productiveHours.length === 0) return 0;

    const totalOutput = productiveHours.reduce((sum, item) => sum + item.output, 0);
    const totalProductiveHours = productiveHours.length;

    return totalProductiveHours > 0
      ? Math.round(totalOutput / totalProductiveHours)
      : 0;
  };

  // Fungsi untuk menghitung average output berdasarkan jam saat ini (khusus hari ini)
  const calculateCurrentDayAverageOutput = (
    hourlyData: { time: string; output: number }[]
  ) => {
    if (!hourlyData || hourlyData.length === 0) return 0;

    const currentHour = new Date().getHours();

    const filteredData = hourlyData.filter(item => {
      const hour = parseInt(item.time.split(':')[0]);
      return hour >= 8 && hour <= currentHour;
    });

    const totalOutput = filteredData.reduce((sum, item) => sum + item.output, 0);

    let totalHours = currentHour - 8 + 1;

    if (currentHour >= 13) {
      totalHours -= 1;
    }

    return totalHours > 0 ? Math.round(totalOutput / totalHours) : 0;
  };

  // Cek apakah tanggal yang dipilih adalah hari ini
  const isToday = (selectedDate?: Date) => {
    if (!selectedDate) return true;

    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  };

  // Hitung average output berdasarkan tanggal yang dipilih
  const averageOutput = isToday(date)
    ? calculateCurrentDayAverageOutput(metrics.hourlyProduction)
    : calculateFullDayAverageOutput(metrics.hourlyProduction, date);

  // Dapatkan tanggal kemarin
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Hitung average output untuk kemarin (selalu full day)
  const averageYtdOutput = calculateFullDayAverageOutput(
    ytdHourlyProduction || [],
    yesterday
  );

  const displayAvgOutput =
    typeof avgPerHourFromSp === 'number' ? avgPerHourFromSp : averageOutput;

  const displayAvgYtdOutput =
    typeof avgPerHourYesterdayFromSp === 'number'
      ? avgPerHourYesterdayFromSp
      : averageYtdOutput;

  const displayWorkingHour =
    typeof workingHourFromSp === 'number'
      ? workingHourFromSp
      : calculateWorkingHours(metrics.hourlyProduction);

  const displayJamPulang = (jamPulangFromSp ?? '').trim();

  // Tambahkan fungsi untuk mapping jam
  const getHourLabel = (hour: number, dayOfWeek: number) => {
    const mapping = {
      8: '7-8',
      9: '8-9',
      10: '9-10',
      11: '10-11',
      12: '11-12',
      13: '12-1',
      14: '1-2',
      15: '2-3',
      16: '3-4',
      17: '4-5',
      18: '5-6',
      19: '6-7',
      20: '7-8',
      21: '8-9',
    };

    let isSup3 = false;
    if (dayOfWeek >= 1 && dayOfWeek <= 4) {
      if (hour === 19 || hour === 20) isSup3 = true;
    } else if (dayOfWeek === 5) {
      if (hour === 11 || hour === 19 || hour === 20) isSup3 = true;
    }

    const label = mapping[hour as keyof typeof mapping] || hour.toString();
    return isSup3 ? (
      <>
        {label}
        <sup>3</sup>
      </>
    ) : (
      label
    );
  };

  const totalProduction = metrics.hourlyProduction
    .filter(item => {
      const hour = parseInt(item.time.split(':')[0]);
      return hour >= 8 && hour <= 21;
    })
    .reduce((sum, item) => sum + item.output, 0);

  const hasOperatorBreakdown = operatorBreakdown.length > 0;

  return (
    <div
      className={`bg-gray-900 p-2 sm:p-3 md:p-4 rounded-lg shadow-sm border border-gray-700 ${
        className || ''
      }`}
    >
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="flex flex-col p-2 sm:p-3 bg-blue-900/50 rounded-lg h-[90px] sm:h-[100px]">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            <span className="text-lg sm:text-[24px] font-bold text-gray-200">
              Target
            </span>
          </div>
          <span className="text-2xl sm:text-[50px] font-bold text-blue-300 text-center mt-auto">
            {metrics.todaysGoal.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col p-2 sm:p-3 bg-gray-800 rounded-lg h-[90px] sm:h-[100px]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
            <span className="text-lg sm:text-[24px] font-bold text-gray-200">
              Current
            </span>
          </div>
          <span className="text-2xl sm:text-[50px] font-bold text-gray-100 text-center mt-auto">
            {metrics.currentPerformance.toLocaleString()}
          </span>
        </div>

        <div
          className={`flex flex-col p-2 sm:p-3 rounded-lg h-[90px] sm:h-[100px] ${getAchievementColor(
            metrics.achievementRate
          )}`}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
            <span className="text-lg sm:text-[24px] font-bold text-gray-200">
              Achievement Rate
            </span>
          </div>
          <span className="text-2xl sm:text-[50px] font-bold text-center mt-auto">
            {metrics.achievementRate.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Hourly Production Table */}
      <div className="grid grid-cols-12 gap-2 sm:gap-3">
        <div className="col-span-12 lg:col-span-8">
          <h4 className="text-lg sm:text-xl font-bold text-gray-100 mb-2 sm:mb-3">
            Hourly Production
          </h4>

          <div className="space-y-2 sm:space-y-3">
            {/* Regular Hours Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2">
              {metrics.hourlyProduction
                .filter(item => {
                  const hour = parseInt(item.time.split(':')[0]);
                  const isFriday =
                    typeof date !== 'undefined'
                      ? new Date(date).getDay() === 5
                      : new Date().getDay() === 5;

                  if (hour === 13) return false;

                  return hour >= 8 && (isFriday ? hour <= 20 : hour <= 21);
                })
                .map((item, index) => {
                  const dayOfWeek =
                    typeof date !== 'undefined'
                      ? new Date(date).getDay()
                      : new Date().getDay();

                  const hour = parseInt(item.time.split(':')[0]);

                  return (
                    <div
                      key={index}
                      className="bg-gray-800 p-1.5 sm:p-2 rounded-lg h-[70px] sm:h-[80px] flex flex-col justify-between"
                    >
                      <div className="text-base sm:text-[24px] text-gray-400">
                        {getHourLabel(hour, dayOfWeek)}
                      </div>
                      <div className="text-base sm:text-[24px] font-bold text-gray-100 text-center">
                        {item.output}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Special Row for 9 PM dan Total Production */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
              {/* Jam 9 (21:00) khusus hari Jumat */}
              {(() => {
                const isFriday =
                  typeof date !== 'undefined'
                    ? new Date(date).getDay() === 5
                    : new Date().getDay() === 5;

                if (isFriday) {
                  const hour21Data = metrics.hourlyProduction.find(
                    item => parseInt(item.time.split(':')[0]) === 21
                  );

                  if (hour21Data) {
                    return (
                      <div className="bg-gray-800 p-1.5 sm:p-2 rounded-lg h-[70px] sm:h-[90px] flex flex-col justify-between">
                        <div className="text-base sm:text-[24px] text-gray-400">
                          {getHourLabel(21, 5)}
                        </div>
                        <div className="text-base sm:text-[24px] font-bold text-gray-100 text-center">
                          {hour21Data.output}
                        </div>
                      </div>
                    );
                  }
                }

                return <div />;
              })()}

              {/* Total Production */}
              {(() => {
                const isFriday =
                  typeof date !== 'undefined'
                    ? new Date(date).getDay() === 5
                    : new Date().getDay() === 5;

                const totalColSpan = isFriday ? 'col-span-2' : 'col-span-3';

                return (
                  <div
                    className={`flex items-center justify-between p-2 sm:p-3 bg-emerald-900/50 rounded-lg h-[70px] sm:h-[90px] ${totalColSpan}`}
                  >
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                      <span className="text-lg sm:text-[24px] font-bold text-gray-200">
                        Total
                      </span>
                    </div>
                    <span className="text-2xl sm:text-[50px] font-bold text-emerald-300">
                      {totalProduction.toLocaleString()}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Average Metrics */}
        <div className="col-span-12 lg:col-span-4 space-y-2 sm:space-y-3">
          <div className="flex flex-col p-2 sm:p-3 bg-indigo-900/50 rounded-lg h-[90px] sm:h-[100px]">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
              <span className="text-lg sm:text-[24px] font-bold text-gray-200">
                Avg Output
              </span>
            </div>
            <span className="text-2xl sm:text-[50px] font-bold text-indigo-300 text-center mt-auto">
              {Number(displayAvgOutput || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col p-2 sm:p-3 bg-purple-900/50 rounded-lg h-[90px] sm:h-[100px]">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              <span className="text-lg sm:text-[24px] font-bold text-gray-200">
                Avg Yesterday Output
              </span>
            </div>
            <span className="text-2xl sm:text-[50px] font-bold text-purple-300 text-center mt-auto">
              {Number(displayAvgYtdOutput || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-emerald-900/40 border border-emerald-800">
              <span className="text-xs sm:text-sm font-semibold text-emerald-200">
                Working Hour
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-100">
                {Number(displayWorkingHour || 0).toLocaleString()}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-cyan-900/40 border border-cyan-800">
              <span className="text-xs sm:text-sm font-semibold text-cyan-200">
                Last Button QC
              </span>
              <span className="text-xs sm:text-sm font-bold text-cyan-100">
                {displayJamPulang || '-'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!hasOperatorBreakdown) return;
              setShowOperatorDetail(prev => !prev);
            }}
            className={`flex flex-col p-2 sm:p-3 bg-blue-900/50 rounded-lg h-[90px] sm:h-[100px] transition-colors ${
              hasOperatorBreakdown
                ? 'cursor-pointer hover:bg-blue-900/70'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-left">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                <span className="text-lg sm:text-[24px] font-bold text-gray-200">
                  Total CB Operators
                </span>
              </div>

              {hasOperatorBreakdown && (
                <div className="text-blue-300">
                  {showOperatorDetail ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              )}
            </div>

            <span className="text-2xl sm:text-[50px] font-bold text-blue-300 text-center mt-auto">
              {totalOperators}
            </span>
          </button>

          {showOperatorDetail && hasOperatorBreakdown && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm sm:text-lg font-bold text-gray-100">
                  Operator Detail
                </h5>
                <span className="text-xs sm:text-sm text-gray-400">
                  Breakdown per module
                </span>
              </div>

              <div className="space-y-2">
                {operatorBreakdown.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm sm:text-base text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-sm sm:text-lg font-bold text-blue-300">
                      {item.value}
                    </span>
                  </div>
                ))}

                <div className="flex items-center justify-between bg-blue-900/40 rounded-lg px-3 py-2 border border-blue-800">
                  <span className="text-sm sm:text-base font-semibold text-gray-200">
                    Total Detail
                  </span>
                  <span className="text-sm sm:text-lg font-bold text-blue-200">
                    {operatorBreakdown
                      .reduce((sum, item) => sum + item.value, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;