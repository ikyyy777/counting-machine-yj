import React, { useEffect, useState, useRef } from 'react';
import { Calendar, ChevronDown, ChevronRight, Waves } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { LineResponse, DISPLAY_FACTORY_CODES, DisplayFactoryCode, mapDisplayToApiFactory } from '../../types/api';
import { fetchLines, convertNoLineToLine, setCurrentFactory } from '../../services/api';
import "react-datepicker/dist/react-datepicker.css";

interface HeaderProps {
  filters: {
    date: Date;
    factory: string;
    line: string;
  };
  onFiltersChange: (filters: any) => void;
  onLookup: () => void;
  className?: string;
  onLineNameChange?: (lineName: string) => void;
}

interface GroupedLine {
  mainLine: string;
  subLines: LineResponse[];
}

const Header: React.FC<HeaderProps> = ({ 
  filters, 
  onFiltersChange, 
  onLookup, 
  className,
  onLineNameChange 
}) => {
  const [lines, setLines] = useState<LineResponse[]>([]);
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

  const handleFilterChange = (key: string, value: any) => {
    if (key === 'factory') {
      // Switch server when factory changes
      const apiFactory = mapDisplayToApiFactory(value as DisplayFactoryCode);
      setCurrentFactory(apiFactory);
      onFiltersChange({
        ...filters,
        factory: value,
        line: ''
      });
    } else if (key === 'line') {
      const actualLineName = convertNoLineToLine(lines, value);
      onFiltersChange({
        ...filters,
        line: value
      });
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
    setShowSubLines(showSubLines === mainLine ? null : mainLine);
    
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

  return (
    <div className={`bg-gray-900 border-b border-gray-700 shadow-sm z-50 relative ${className || ''}`}>
      <div className="mx-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
          <div className="flex items-center gap-3">
            <Waves className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Employee Monitoring Vibration
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
                    : ""
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

            {/* Lookup Button */}
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
