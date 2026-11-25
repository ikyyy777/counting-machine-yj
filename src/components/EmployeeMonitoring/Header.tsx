import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Monitor, ChevronDown, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { DashboardFilters } from '../../types/dashboard';
import { LineResponse, DISPLAY_FACTORY_CODES, DisplayFactoryCode, StyleResponse, mapDisplayToApiFactory } from '../../types/api';
import { fetchLines, fetchStyles, convertNoLineToLine, setCurrentFactory } from '../../services/api';
import "react-datepicker/dist/react-datepicker.css";

interface HeaderProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onLookup: () => void;
  className?: string;
  onLineNameChange?: (lineName: string) => void;
  title?: string;
}

interface GroupedLine {
  mainLine: string;
  subLines: LineResponse[];
}

const Header: React.FC<HeaderProps> = ({ filters, onFiltersChange, onLookup, className, onLineNameChange, title = "Employee Monitoring CB" }) => {
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
      // Ambil nomor line utama (angka pertama sebelum huruf atau dash)
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
        
        if (data.length > 0) {
          const newLine = data[0].NOLINE;
          if (!data.find(l => l.NOLINE === filters.line)) {
            onFiltersChange({ ...filters, line: newLine });
          }
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

  // Fetch styles when line, date, or factory changes
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

        if (data.length > 0) {
          if (!data.find(s => s.STYLE === filters.style)) {
            onFiltersChange({ ...filters, style: data[0].STYLE });
          }
        } else {
          setStyles([]);
          onFiltersChange({ ...filters, style: '' });
        }
      } catch (error) {
        console.error('Error fetching styles:', error);
        setStyles([]);
        onFiltersChange({ ...filters, style: '' });
      } finally {
        setLoading(false);
      }
    };

    getStyles();
  }, [filters.line, filters.date, filters.factory]);

  useEffect(() => {
    if (!filters.factory) {
      onFiltersChange({ ...filters, factory: "YONGJIN 2-1" });
    }
  }, []);

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

  const handleFilterChange = (key: keyof DashboardFilters, value: any) => {
    if (key === 'factory') {
      // Switch server when factory changes (map split factories back to API factory)
      const apiFactory = mapDisplayToApiFactory(value as DisplayFactoryCode);
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
      // Panggil callback untuk update nama line yang sudah dikonversi
      if (onLineNameChange) {
        onLineNameChange(actualLineName);
      }
    } else if (key === 'date') {
      onFiltersChange({
        ...filters,
        date: value
      });
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  };

  const handleLineClick = (mainLine: string) => {
    // Toggle sub-lines visibility
    setShowSubLines(showSubLines === mainLine ? null : mainLine);
    
    // Jika line utama hanya memiliki satu sub-line, langsung pilih sub-line tersebut
    const groupedLines = groupLines(lines);
    const group = groupedLines.find(g => g.mainLine === mainLine);
    if (group && group.subLines.length === 1) {
      handleFilterChange('line', group.subLines[0].NOLINE);
      setIsDropdownOpen(false);
      setShowSubLines(null);
    }
  };

  const handleSubLineClick = (noLine: string, event: React.MouseEvent) => {
    event.stopPropagation();
    handleFilterChange('line', noLine);
    setIsDropdownOpen(false);
    setShowSubLines(null);
  };

  const inputClasses = "px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-gray-200 shadow-sm";
  const labelClasses = "text-sm font-medium text-gray-300 uppercase tracking-wide";
  const groupClasses = "flex items-center gap-3";

  // Tambahkan style untuk custom scrollbar di bagian atas file setelah import statements
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
            <Monitor className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
          
          <div className="flex-1 flex flex-wrap items-center justify-end gap-4 lg:gap-6">
            {/* Date Picker */}
            <div className={groupClasses}>
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className={labelClasses}>Date</label>
              <DatePicker
                selected={filters.date}
                onChange={(date) => handleFilterChange('date', date)}
                dateFormat="yyyy-MM-dd"
                className={inputClasses}
                highlightDates={[new Date()]}
                dayClassName={date =>
                  date.toDateString() === new Date().toDateString() 
                    ? "bg-blue-900 rounded-full font-bold text-blue-300"
                    : null
                }
              />
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
                          <div className="bg-gray-800">
                            {subLines.map((subLine) => (
                              <button
                                key={subLine.NOLINE}
                                className={`w-full px-6 py-2 text-left hover:bg-gray-700 text-gray-200 ${
                                  filters.line === subLine.NOLINE ? 'bg-blue-900 text-blue-200' : ''
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

            {/* Style Dropdown */}
            <div className={groupClasses}>
              <label className={labelClasses}>Style</label>
              <select
                value={filters.style}
                onChange={(e) => handleFilterChange('style', e.target.value)}
                className={`${inputClasses} min-w-[120px]`}
                disabled={loading || styles.length === 0}
              >
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
              disabled={loading || !filters.line || !filters.style}
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