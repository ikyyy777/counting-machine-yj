import React, { useEffect, useState, useRef } from 'react';
import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { FACTORY_CODES, FactoryCode } from '../../types/api';
import { fetchLines } from '../../services/api';
import "react-datepicker/dist/react-datepicker.css";

interface HeaderProps {
  filters: {
    date: Date;
    factory: string;
    line: string;
  };
  onFiltersChange: (filters: any) => void;
  className?: string;
  onLineNameChange?: (lineName: string) => void;
  onLookup?: () => void; // opsional, tidak digunakan (no-op)
}

const Header: React.FC<HeaderProps> = ({ 
  filters, 
  onFiltersChange, 
  className
}) => {
  const [lines, setLines] = useState<any[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [showSubLines, setShowSubLines] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filters.factory) {
      setLoadingLines(true);
      fetchLines(filters.factory)
        .then((data) => {
          setLines(data);
        })
        .catch(() => setLines([]))
        .finally(() => setLoadingLines(false));
    } else {
      setLines([]);
      setLoadingLines(false);
    }
  }, [filters.factory]);
  // Samakan style dengan Header.tsx (History)
  const inputClasses = "px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-800 text-gray-200 shadow-sm";
  const labelClasses = "text-sm font-medium text-gray-300 uppercase tracking-wide";
  const groupClasses = "flex items-center gap-3";

  const handleFilterChange = (key: string, value: any) => {
    if (key === 'factory') {
      onFiltersChange({
        ...filters,
        factory: value
      });
    } else if (key === 'line') {
      onFiltersChange({
        ...filters,
        line: value
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

  // Group lines by main line
  const groupLines = (lines: any[]): { mainLine: string; subLines: any[] }[] => {
    const groups: { [key: string]: any[] } = {};
    lines.forEach(line => {
      const mainLineMatch = line.LINE.match(/([0-9]+)/);
      if (mainLineMatch) {
        const mainLine = String(parseInt(mainLineMatch[1], 10));
        if (!groups[mainLine]) groups[mainLine] = [];
        groups[mainLine].push(line);
      }
    });
    return Object.entries(groups)
      .map(([mainLine, subLines]) => ({ mainLine, subLines: subLines.sort((a, b) => a.LINE.localeCompare(b.LINE)) }))
      .sort((a, b) => Number(a.mainLine) - Number(b.mainLine));
  };

  // Close dropdown on outside click
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

  return (
    <div className={`bg-gray-900 border-b border-gray-700 shadow-sm z-50 relative ${className || ''}`}>
      <div className="mx-6">
        {/* Gunakan py-4 seperti Header.tsx */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Daily Report Sewing
            </h1>
          </div>
          
          <div className="flex-1 flex flex-wrap items-center justify-end gap-4 lg:gap-6">
            {/* Date Picker */}
            <div className={groupClasses}>
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
                onChange={(e) => handleFilterChange('factory', e.target.value as FactoryCode)}
                className={inputClasses}
              >
                <option value="">Select Factory</option>
                {FACTORY_CODES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>

            {/* Line Dropdown Grouped */}
            <div className={groupClasses + " relative"}>
              <label className={labelClasses}>Line</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  className={`${inputClasses} min-w-[150px] text-left flex justify-between items-center`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={loadingLines || lines.length === 0}
                >
                  {loadingLines ? (
                    'Loading...'
                  ) : filters.line ? (
                    lines.find(l => l.NOLINE === filters.line)?.LINE || 'Select Line'
                  ) : (
                    'Select Line'
                  )}
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                  />
                </button>
                {isDropdownOpen && !loadingLines && lines.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
                    {groupLines(lines).map(({ mainLine, subLines }) => (
                      <div key={mainLine} className="relative">
                        <button
                          className={`w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-gray-200 ${showSubLines === mainLine ? 'bg-gray-700' : ''}`}
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
                                className={`w-full px-8 py-2 text-left hover:bg-gray-600 text-gray-200 ${filters.line === line.NOLINE ? 'bg-gray-600' : ''}`}
                                onClick={e => handleSubLineClick(line.NOLINE, e)}
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

            {/* Lookup Button (no-op) */}
            <button
              type="button"
              onClick={() => { /* no-op */ }}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm"
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
