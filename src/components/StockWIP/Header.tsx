import React from 'react';
import DatePicker from 'react-datepicker';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Building2 } from 'lucide-react'
import 'react-datepicker/dist/react-datepicker.css';

const FACTORIES = [
  { label: 'YONGJIN 1', value: 'YONGJIN 1' },
  { label: 'YONGJIN 2-1', value: 'YONGJIN 2-1' },
  { label: 'YONGJIN 2-2', value: 'YONGJIN 2-2' },
  { label: 'YONGJIN 3', value: 'YONGJIN 3' },
];



interface StockWIPHeaderProps {
  factory: string;
  date: Date;
  onFactoryChange: (factory: string) => void;
  onDateChange: (date: Date) => void;
  onLookup: () => void;
  loading?: boolean;
}

const StockWIPHeader: React.FC<StockWIPHeaderProps> = ({
  factory,
  date,
  onFactoryChange,
  onDateChange,
  onLookup,
  loading = false,
}) => {

  const navigate = useNavigate();
  return (
    <div className="bg-gray-900 border-b border-gray-700 shadow-sm">
      <div className="mx-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4">

        {/* Title */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-yellow-400">
            WIP LINE AND WIP ROOM STOCK
          </span>
        </div>

        {/* Filters */}
        <div className="flex-1 flex flex-wrap items-center justify-end gap-6">

         <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 uppercase tracking-wide">
              <CalendarDays className="w-4 h-4 text-sky-400" />
              Work Date
            </label>

           <DatePicker
              selected={date}
              onChange={(d: Date) => onDateChange(d)}
              dateFormat="yyyy-MM-dd"
              className="
                h-10 rounded-lg border border-slate-700 bg-slate-900/80 px-3
                text-sm text-slate-100
                focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
              "
            />

        </div>

          {/* Factory */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 uppercase tracking-wide">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Factory
            </label>
           <select
              value={factory}
              onChange={e => onFactoryChange(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-gray-200
                        focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              {FACTORIES.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>


          </div>

          {/* Lookup */}
         <div className="flex gap-2">
         <button
            onClick={onLookup}
            disabled={loading}
            className={`
              px-4 py-2 rounded
              ${loading 
                ? 'bg-blue-400 cursor-not-allowed opacity-70' 
                : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {loading ? 'Loading...' : 'Lookup'}
          </button>

          <button
            onClick={() => navigate('/stock-wip-history')}
            className="px-4 py-2 bg-purple-700 rounded"
          >
            View History
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default StockWIPHeader;
