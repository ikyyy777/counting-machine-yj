import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Monitor, ChevronDown, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { DefectFilters } from '../../types/defect';
import { LineResponse, StyleResponse, DISPLAY_FACTORY_CODES, mapDisplayToApiFactory } from '../../types/api';
import { fetchLines, fetchStyles, convertNoLineToLine, setCurrentFactory } from '../../services/api';
import "react-datepicker/dist/react-datepicker.css";

interface HeaderProps {
  filters: DefectFilters;
  onFiltersChange: (filters: DefectFilters) => void;
  onLookup: () => void;
  className?: string;
}

interface GroupedLine {
  mainLine: string;
  subLines: LineResponse[];
}

const Header: React.FC<HeaderProps> = ({ filters, onFiltersChange, onLookup, className }) => {
  const [lines, setLines] = useState<LineResponse[]>([]);
  const [styles, setStyles] = useState<StyleResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubLines, setShowSubLines] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fungsi untuk mengelompokkan line
  const groupLines = (lines: LineResponse[]): GroupedLine[] => {
    const groups: { [key: string]: LineResponse[] } = {};
    
    lines.forEach(line => {
      const mainLineMatch = line.LINE.match(/(\d+)/);
      if (mainLineMatch) {
        const mainLine = String(parseInt(mainLineMatch[1], 10));
        if (!groups[mainLine]) {
          groups[mainLine] = [];
        }
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

  // Fetch lines when factory changes
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
        
        if (data.length > 0 && !data.find(l => l.NOLINE === filters.line)) {
          onFiltersChange({ ...filters, line: data[0].NOLINE });
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

  // Fetch styles when line changes
  useEffect(() => {
    const getStyles = async () => {
      if (!filters.line) return;

      try {
        setLoading(true);
        const data = await fetchStyles({
          line_id: filters.line,
          office: filters.factory,
          date: filters.date
        });
        setStyles(data);

        if (data.length > 0 && !data.find(s => s.STYLE === filters.style)) {
          onFiltersChange({ ...filters, style: data[0].STYLE });
        }
      } catch (error) {
        console.error('Error fetching styles:', error);
        setStyles([]);
      } finally {
        setLoading(false);
      }
    };

    getStyles();
  }, [filters.line, filters.date, filters.factory]);

  // Event handler untuk menutup dropdown ketika mengklik di luar
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

  const handleLineClick = (mainLine: string) => {
    setShowSubLines(showSubLines === mainLine ? null : mainLine);
    
    const groupedLines = groupLines(lines);
    const group = groupedLines.find(g => g.mainLine === mainLine);
    if (group && group.subLines.length === 1) {
      onFiltersChange({ ...filters, line: group.subLines[0].NOLINE });
      setIsDropdownOpen(false);
      setShowSubLines(null);
    }
  };

  const handleSubLineClick = (noLine: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onFiltersChange({ ...filters, line: noLine });
    setIsDropdownOpen(false);
    setShowSubLines(null);
  };

  const handleFilterChange = (key: keyof DefectFilters, value: any) => {
    if (key === 'factory') {
      // Switch server when factory changes
      const apiFactory = mapDisplayToApiFactory(value);
      setCurrentFactory(apiFactory);
      onFiltersChange({
        ...filters,
        factory: value,
        line: '',
        style: ''
      });
    } else if (key === 'line') {
      const actualLineName = convertNoLineToLine(lines, value);
      onFiltersChange({
        ...filters,
        line: value,
        style: ''
      });
    } else if (key === 'date') {
      onFiltersChange({
        ...filters,
        date: value
      });
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  const inputClasses = "px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-800 text-gray-200 shadow-sm";
  const labelClasses = "text-sm font-medium text-gray-300 uppercase tracking-wide";
  const groupClasses = "flex items-center gap-3";

  // Custom scrollbar style
  const style = document.createElement('style');
  style.textContent = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 12px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
      background: #1F2937;
      border-radius: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #4B5563;
      border-radius: 6px;
      border: 2px solid #1F2937;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #6B7280;
    }
  `;
  document.head.appendChild(style);

  return (
    <div className={`bg-gray-900 border-b border-gray-700 shadow-sm ${className || ''}`}>
      <div className="mx-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-red-400" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
              Defect Monitoring
            </h1>
          </div>
          
          <div className="flex-1 flex flex-wrap items-center justify-end gap-4 lg:gap-6">
            {/* Date Picker */}
            <div className={groupClasses}>
              <label className={labelClasses}>Date</label>
              <div className="relative">
                <DatePicker
                  selected={filters.date}
                  onChange={(date: Date) => handleFilterChange('date', date)}
                  dateFormat="yyyy-MM-dd"
                  className={inputClasses}
                  highlightDates={[new Date()]}
                  dayClassName={date =>
                    date.toDateString() === new Date().toDateString() 
                      ? "bg-red-900 rounded-full font-bold text-red-300"
                      : null
                  }
                />
                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Factory Dropdown */}
            <div className={groupClasses}>
              <label className={labelClasses}>Factory</label>
              <select
                value={filters.factory || ''}
                onChange={(e) => handleFilterChange('factory', e.target.value)}
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

            {/* Line Dropdown */}
            <div className={groupClasses + " relative"}>
              <label className={labelClasses}>Line</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  className={`${inputClasses} min-w-[150px] text-left flex justify-between items-center`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  {loading ? (
                    'Loading...'
                  ) : error ? (
                    'Error loading lines'
                  ) : filters.line ? (
                    lines.find(l => l.NOLINE === filters.line)?.LINE || 'Select Line'
                  ) : (
                    'Select Line'
                  )}
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                  />
                </button>
                {isDropdownOpen && !loading && !error && lines.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-[800px] overflow-y-auto custom-scrollbar">
                    {groupLines(lines).map(({ mainLine, subLines }) => (
                      <div key={mainLine} className="relative">
                        <button
                          className={`w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-gray-200 ${
                            showSubLines === mainLine ? 'bg-gray-700' : ''
                          }`}
                          onClick={() => handleLineClick(mainLine)}
                        >
                          <span>Line {mainLine}</span>
                          {subLines.length > 1 && (
                            <ChevronRight 
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                showSubLines === mainLine ? 'transform rotate-90' : ''
                              }`}
                            />
                          )}
                        </button>
                        {showSubLines === mainLine && subLines.length > 1 && (
                          <div className="bg-gray-700">
                            {subLines.map(line => (
                              <button
                                key={line.NOLINE}
                                className={`w-full px-8 py-2 text-left hover:bg-gray-600 text-gray-200 ${
                                  filters.line === line.NOLINE ? 'bg-gray-600' : ''
                                }`}
                                onClick={(e) => handleSubLineClick(line.NOLINE, e)}
                              >
                                {line.LINE}
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

            {/* Style Dropdown */}
            <div className={groupClasses}>
              <label className={labelClasses}>Style</label>
              <select
                value={filters.style}
                onChange={(e) => handleFilterChange('style', e.target.value)}
                className={`${inputClasses} min-w-[120px]`}
                disabled={loading || styles.length === 0}
              >
                <option value="">Select Style</option>
                {loading ? (
                  <option>Loading...</option>
                ) : styles.length === 0 ? (
                  <option value="">No styles available</option>
                ) : (
                  styles.map((style) => (
                    <option key={style.STYLE} value={style.STYLE}>
                      {style.STYLE}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Lookup Button */}
            <button
              onClick={onLookup}
              disabled={!filters.line || !filters.style}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Lookup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header; 