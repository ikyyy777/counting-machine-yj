import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Monitor, ChevronDown, ChevronRight, Search } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { LineResponse, FACTORY_CODES, FactoryCode } from '../../types/api';
import { fetchLines, convertNoLineToLine, setCurrentFactory } from '../../services/api';
import "react-datepicker/dist/react-datepicker.css";

// Definisikan kembali tipe untuk objek filter agar komponen ini mandiri
interface SummaryFilters {
  linecode: string;
  workdate: string;
  factory: FactoryCode;
}

interface SummaryHeaderProps {
  filters: SummaryFilters;
  onFiltersChange: (filters: SummaryFilters) => void;
  onLookup: () => void;
  onBack?: () => void;
  className?: string;
}

interface GroupedLine {
  mainLine: string;
  subLines: LineResponse[];
}

const SummaryHeader: React.FC<SummaryHeaderProps> = ({ 
  filters, 
  onFiltersChange, 
  onLookup,
  onBack, 
  className 
}) => {
  const [lines, setLines] = useState<LineResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubLines, setShowSubLines] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const groupLines = (lines: LineResponse[]): GroupedLine[] => {
    const groups: { [key: string]: LineResponse[] } = {};
    lines.forEach(line => {
      const mainLineMatch = line.LINE.match(/(\d+)/);
      if (mainLineMatch) {
        const mainLine = String(parseInt(mainLineMatch[1], 10));
        if (!groups[mainLine]) { groups[mainLine] = []; }
        groups[mainLine].push(line);
      }
    });
    return Object.entries(groups)
      .map(([mainLine, subLines]) => ({
        mainLine,
        subLines: subLines.sort((a, b) => a.LINE.localeCompare(b.LINE))
      }))
      .sort((a, b) => Number(a.mainLine) - Number(b.mainLine));
  };
  
  // ===================================================================
  // === LOGIKA BARU: Fetch lines dan auto-correct pilihan line
  // ===================================================================
  useEffect(() => {
    const loadLines = async () => {
      if (!filters.factory) {
        setLines([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await fetchLines(filters.factory);
        setLines(data);
        
        // Jika line yang dipilih saat ini tidak valid untuk factory baru,
        // otomatis pilih line pertama dari daftar baru.
        if (data.length > 0 && !data.find(l => l.NOLINE === filters.linecode)) {
          onFiltersChange({ ...filters, linecode: data[0].NOLINE });
        }
      } catch (err) {
        setError('Failed to load lines');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadLines();
  }, [filters.factory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setShowSubLines(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ===================================================================
  // === LOGIKA BARU: Satu fungsi untuk mengubah semua filter
  // ===================================================================
  const handleFilterChange = (key: keyof SummaryFilters, value: any) => {
    if (key === 'factory') {
      // Switch server when factory changes
      setCurrentFactory(value);
      onFiltersChange({
        ...filters,
        factory: value,
        linecode: '', // Reset line saat factory berubah
      });
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  const handleLineClick = (mainLine: string) => {
    setShowSubLines(showSubLines === mainLine ? null : mainLine);
    const groupedLines = groupLines(lines);
    const group = groupedLines.find(g => g.mainLine === mainLine);
    if (group && group.subLines.length === 1) {
      handleFilterChange('linecode', group.subLines[0].NOLINE);
      setIsDropdownOpen(false);
      setShowSubLines(null);
    }
  };

  const handleSubLineClick = (noLine: string, event: React.MouseEvent) => {
    event.stopPropagation();
    handleFilterChange('linecode', noLine);
    setIsDropdownOpen(false);
    setShowSubLines(null);
  };

  const inputClasses = "px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-gray-200 shadow-sm";
  const labelClasses = "text-sm font-medium text-gray-300 uppercase tracking-wide";
  const groupClasses = "flex items-center gap-3";

  return (
    <div className={`bg-gray-900 border-b border-gray-700 shadow-sm ${className || ''}`}>
      <div className="mx-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Summary PO History
            </h1>
            {onBack && (
              <button onClick={onBack} className="ml-4 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm">
                ← Back
              </button>
            )}
          </div>
          
          <div className="flex-1 flex flex-wrap items-center justify-end gap-4 lg:gap-6">
            {/* Date Picker */}
            <div className={groupClasses}>
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className={labelClasses}>Work Date</label>
              <DatePicker
                selected={new Date(filters.workdate)}
                onChange={(date: Date) => handleFilterChange('workdate', date.toISOString().split('T')[0])}
                dateFormat="yyyy-MM-dd"
                className={inputClasses}
              />
            </div>

            {/* Factory Dropdown */}
            <div className={groupClasses}>
              <label className={labelClasses}>Factory</label>
              <select
                value={filters.factory || ''}
                onChange={(e) => handleFilterChange('factory', e.target.value as FactoryCode)}
                className={inputClasses}
              >
                <option value="">Select Factory</option>
                {FACTORY_CODES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>

            {/* Line Dropdown */}
            <div className={groupClasses + " relative"}>
              <label className={labelClasses}>Line</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  className={`${inputClasses} min-w-[150px] text-left flex justify-between items-center`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {loading ? 'Loading...'
                    : error ? 'Error...'
                    : filters.linecode ? (lines.find(l => l.NOLINE === filters.linecode)?.LINE || 'Select Line')
                    : 'Select Line'
                  }
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
                </button>
                {isDropdownOpen && !loading && !error && lines.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto custom-scrollbar">
                    {groupLines(lines).map(({ mainLine, subLines }) => (
                      <div key={mainLine}>
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-gray-200"
                          onClick={() => handleLineClick(mainLine)}
                        >
                          <span>Line {mainLine}</span>
                          {subLines.length > 1 && (
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showSubLines === mainLine ? 'rotate-90' : ''}`} />
                          )}
                        </button>
                        {showSubLines === mainLine && subLines.length > 1 && (
                          <div>
                            {subLines.map((subLine) => (
                              <button
                                key={subLine.NOLINE}
                                className={`w-full px-8 py-2 text-left hover:bg-gray-700 text-gray-200 ${filters.linecode === subLine.NOLINE ? 'bg-blue-900 text-blue-200' : ''}`}
                                onClick={(e) => handleSubLineClick(subLine.NOLINE, e)}
                              >
                                {subLine.LINE}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Lookup Button */}
            <button
              onClick={onLookup}
              disabled={loading || !filters.linecode}
              className={`px-6 py-2 text-white rounded-md transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2 ${loading || !filters.linecode ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Search className="w-4 h-4" />
              {loading ? 'Loading...' : 'Lookup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryHeader;