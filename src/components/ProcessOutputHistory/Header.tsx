import React, { useEffect, useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';
import { DISPLAY_FACTORY_CODES, DisplayFactoryCode, LineResponse, mapDisplayToApiFactory } from '../../types/api';
import { fetchLines, setCurrentFactory } from '../../services/api';

export type ProcessOutputHistoryFilters = {
  dateFrom: Date;
  dateTo: Date;
  factory: DisplayFactoryCode;
  line: string;
  style: string;
};

interface GroupedLine {
  mainLine: string;
  subLines: LineResponse[];
}

interface HeaderProps {
  filters: ProcessOutputHistoryFilters;
  onFiltersChange: (filters: ProcessOutputHistoryFilters) => void;
  onLookup: () => void;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ filters, onFiltersChange, onLookup, className }) => {
  const [lines, setLines] = useState<LineResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isLineDropdownOpen, setIsLineDropdownOpen] = useState(false);
  const [showSubLines, setShowSubLines] = useState<string | null>(null);
  const lineDropdownRef = useRef<HTMLDivElement>(null);

  const groupLines = (linesArr: LineResponse[]): GroupedLine[] => {
    const groups: { [key: string]: LineResponse[] } = {};

    linesArr.forEach(line => {
      const match = line.LINE.match(/(\d+)/);
      if (match) {
        const main = String(parseInt(match[1], 10));
        if (!groups[main]) groups[main] = [];
        groups[main].push(line);
      }
    });

    return Object.entries(groups)
      .map(([mainLine, subLines]) => ({
        mainLine,
        subLines: subLines.sort((a, b) => a.LINE.localeCompare(b.LINE))
      }))
      .sort((a, b) => Number(a.mainLine) - Number(b.mainLine));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (lineDropdownRef.current && !lineDropdownRef.current.contains(target)) {
        setIsLineDropdownOpen(false);
        setShowSubLines(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        if (!filters.line && data.length > 0) {
          const newLine = data[0].NOLINE;
          onFiltersChange({ ...filters, line: newLine });
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

  const handleFilterChange = (key: keyof ProcessOutputHistoryFilters, value: any) => {
    if (key === 'factory') {
      const apiFactory = mapDisplayToApiFactory(value as DisplayFactoryCode);
      setCurrentFactory(apiFactory);
      onFiltersChange({
        ...filters,
        factory: value,
        line: '',
        style: ''
      });
      return;
    }

    if (key === 'line') {
      onFiltersChange({
        ...filters,
        line: String(value),
        style: ''
      });
      return;
    }

    onFiltersChange({ ...filters, [key]: value });
  };

  const handleLineClick = (mainLine: string) => {
    setShowSubLines(showSubLines === mainLine ? null : mainLine);

    const groups = groupLines(lines);
    const group = groups.find(g => g.mainLine === mainLine);
    if (group && group.subLines.length === 1) {
      handleFilterChange('line', group.subLines[0].NOLINE);
      setIsLineDropdownOpen(false);
      setShowSubLines(null);
    }
  };

  const handleSubLineClick = (noLine: string, event: React.MouseEvent) => {
    event.stopPropagation();
    handleFilterChange('line', noLine);
    setIsLineDropdownOpen(false);
    setShowSubLines(null);
  };

  const inputClasses = 'px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-gray-200 shadow-sm';
  const labelClasses = 'text-sm font-medium text-gray-300 uppercase tracking-wide';
  const groupClasses = 'flex items-center gap-3';

  // [PERBAIKAN 1]: Tambahkan relative dan z-30 di container utama
  // z-30 dipilih supaya lebih tinggi dari z-10 yang ada di header tabel chart
  return (
    <div className={`bg-gray-900 border-b border-gray-700 shadow-sm relative z-30 ${className || ''}`}>
      <div className="mx-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Process Output History
            </h1>
          </div>

          <div className="flex-1 flex flex-wrap items-center justify-end gap-4 lg:gap-6">
            <div className={groupClasses}>
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className={labelClasses}>Date From</label>
              {/* [PERBAIKAN 2]: Tambahkan popperClassName agar popup kalender punya z-index tinggi */}
              <DatePicker
                selected={filters.dateFrom}
                onChange={(date) => handleFilterChange('dateFrom', date)}
                dateFormat="yyyy-MM-dd"
                className={inputClasses}
                popperClassName="!z-50" 
              />
            </div>

            <div className={groupClasses}>
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className={labelClasses}>Date To</label>
              {/* [PERBAIKAN 2]: Tambahkan popperClassName agar popup kalender punya z-index tinggi */}
              <DatePicker
                selected={filters.dateTo}
                onChange={(date) => handleFilterChange('dateTo', date)}
                dateFormat="yyyy-MM-dd"
                className={inputClasses}
                popperClassName="!z-50"
              />
            </div>

            <div className={groupClasses}>
              <label className={labelClasses}>Factory</label>
              <select
                value={filters.factory || ''}
                onChange={(e) => handleFilterChange('factory', e.target.value as DisplayFactoryCode)}
                className={inputClasses}
              >
                <option value="">Select Factory</option>
                {DISPLAY_FACTORY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div className={groupClasses + ' relative'}>
              <label className={labelClasses}>Line</label>
              <div className="relative" ref={lineDropdownRef}>
                <button
                  className={`${inputClasses} min-w-[150px] text-left flex justify-between items-center`}
                  onClick={() => setIsLineDropdownOpen(!isLineDropdownOpen)}
                >
                  {loading ? (
                    'Loading...'
                  ) : error ? (
                    'Error loading lines'
                  ) : filters.line ? (
                    lines.find(l => String(l.NOLINE) === String(filters.line))?.LINE || filters.line
                  ) : (
                    'Select Line'
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isLineDropdownOpen ? 'transform rotate-180' : ''}`}
                  />
                </button>

                {isLineDropdownOpen && !loading && !error && lines.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-[800px] overflow-y-auto">
                    {groupLines(lines).map(({ mainLine, subLines }) => (
                      <div key={mainLine} className="relative">
                        <button
                          className={`w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-gray-200 ${showSubLines === mainLine ? 'bg-gray-700' : ''
                            }`}
                          onClick={() => handleLineClick(mainLine)}
                        >
                          <span>Line {mainLine}</span>
                          {subLines.length > 1 && (
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showSubLines === mainLine ? 'transform rotate-90' : ''
                                }`}
                            />
                          )}
                        </button>

                        {showSubLines === mainLine && subLines.length > 1 && (
                          <div className="bg-gray-800">
                            {subLines.map((subLine) => (
                              <button
                                key={subLine.NOLINE}
                                className={`w-full px-6 py-2 text-left hover:bg-gray-700 text-gray-200 ${filters.line === subLine.NOLINE ? 'bg-blue-900 text-blue-200' : ''
                                  }`}
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

            <button
              onClick={onLookup}
              disabled={loading || !filters.line}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? 'Loading...' : 'Lookup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;