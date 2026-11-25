// src/components/History/Header.tsx

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronRight, History } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { LineResponse, DISPLAY_FACTORY_CODES, DisplayFactoryCode, mapDisplayToApiFactory } from '../../types/api';
import { fetchLines, convertNoLineToLine, setCurrentFactory } from '../../services/api';
import "react-datepicker/dist/react-datepicker.css";

interface HeaderProps {
  filters: {
    date: Date;
    factory: DisplayFactoryCode;
    line: string;
    crdMonth: string[];
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
  
  const [isLineDropdownOpen, setIsLineDropdownOpen] = useState(false);
  const [showSubLines, setShowSubLines] = useState<string | null>(null);
  const lineDropdownRef = useRef<HTMLDivElement>(null);

  const [isCrdDropdownOpen, setIsCrdDropdownOpen] = useState(false);
  const crdDropdownRef = useRef<HTMLDivElement>(null);

  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const currentYear = new Date().getFullYear();
    const months = [
      { value: '01', label: 'January' }, { value: '02', label: 'February' },
      { value: '03', label: 'March' }, { value: '04', label: 'April' },
      { value: '05', label: 'May' }, { value: '06', label: 'June' },
      { value: '07', label: 'July' }, { value: '08', label: 'August' },
      { value: '09', label: 'September' }, { value: '10', label: 'October' },
      { value: '11', label: 'November' }, { value: '12', label: 'December' },
    ];
    
    for (let year = currentYear; year >= currentYear - 2; year--) {
      months.forEach(month => {
        options.push({
          value: `${year}-${month.value}`,
          label: `${month.label} ${year}`
        });
      });
    }
    return options;
  }, []);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lineDropdownRef.current && !lineDropdownRef.current.contains(event.target as Node)) {
        setIsLineDropdownOpen(false);
        setShowSubLines(null);
      }
      if (crdDropdownRef.current && !crdDropdownRef.current.contains(event.target as Node)) {
        setIsCrdDropdownOpen(false);
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
      const apiFactory = mapDisplayToApiFactory(value);
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
  
  const handleCrdMonthChange = (monthValue: string) => {
    const currentSelection = filters.crdMonth;
    let newSelection;

    if (currentSelection.includes(monthValue)) {
      newSelection = currentSelection.filter(month => month !== monthValue);
    } else {
      newSelection = [...currentSelection, monthValue];
    }
    onFiltersChange({ ...filters, crdMonth: newSelection });
  };
  
  const renderCrdButtonLabel = () => {
    const selectionCount = filters.crdMonth.length;
    if (selectionCount === 0) {
      return "Select CRD Month";
    }
    if (selectionCount === 1) {
      const selectedOption = monthOptions.find(opt => opt.value === filters.crdMonth[0]);
      return selectedOption ? selectedOption.label : "Select CRD Month";
    }
    return `${selectionCount} months selected`;
  };

  const inputClasses = "px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-gray-800 text-gray-200 shadow-sm";
  const labelClasses = "text-sm font-medium text-gray-300 uppercase tracking-wide";
  const groupClasses = "flex items-center gap-3";

  const style = document.createElement('style');
  style.textContent = `
    .custom-scrollbar::-webkit-scrollbar { width: 12px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #1F2937; border-radius: 6px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #4B5563; border-radius: 6px; border: 2px solid #1F2937; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6B7280; }
  `;
  document.head.appendChild(style);

  return (
    <div className={`bg-gray-900 border-b border-gray-700 shadow-sm z-50 relative ${className || ''}`}>
      <div className="mx-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
          <div className="flex items-center gap-3">
            <History className="w-8 h-8 text-yellow-400" />
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Production History
            </h1>
          </div>
          
          <div className="flex-1 flex flex-wrap items-center justify-end gap-4 lg:gap-6">
            {/* Date Picker */}
            <div className={groupClasses}>
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className={labelClasses}>Date</label>
              <DatePicker
                selected={filters.date}
                onChange={(date: Date) => handleFilterChange('date', date)}
                dateFormat="yyyy-MM-dd"
                className={inputClasses}
                highlightDates={[new Date()]}
                dayClassName={date =>
                  date.toDateString() === new Date().toDateString() 
                    ? "bg-yellow-900 rounded-full font-bold text-yellow-300"
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
              <div className="relative" ref={lineDropdownRef}>
                <button
                  className={`${inputClasses} min-w-[150px] text-left flex justify-between items-center`}
                  onClick={() => setIsLineDropdownOpen(!isLineDropdownOpen)}
                >
                  {loading ? 'Loading...'
                    : error ? 'Error loading lines'
                    : filters.line ? lines.find(l => l.NOLINE === filters.line)?.LINE || 'Select Line'
                    : 'Select Line'
                  }
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isLineDropdownOpen ? 'transform rotate-180' : ''}`}
                  />
                </button>
                {isLineDropdownOpen && !loading && !error && lines.length > 0 && (
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
                                  filters.line === subLine.NOLINE ? 'bg-yellow-900 text-yellow-200' : ''
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

            {/* CRD Month Dropdown */}
            <div className={groupClasses}>
              <label className={labelClasses}>CRD Month</label>
              <div className="relative" ref={crdDropdownRef}>
                <button
                  className={`${inputClasses} min-w-[200px] text-left flex justify-between items-center`}
                  onClick={() => setIsCrdDropdownOpen(!isCrdDropdownOpen)}
                >
                  <span>{renderCrdButtonLabel()}</span>
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCrdDropdownOpen ? 'transform rotate-180' : ''}`}
                  />
                </button>
                {isCrdDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto custom-scrollbar">
                    {monthOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-700 cursor-pointer text-gray-200">
                        <input
                          type="checkbox"
                          className="w-4 h-4 bg-gray-700 border-gray-500 rounded text-yellow-600 focus:ring-yellow-500"
                          checked={filters.crdMonth.includes(option.value)}
                          onChange={() => handleCrdMonthChange(option.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Lookup Button */}
            <button
              onClick={onLookup}
              disabled={loading || !filters.line}
              className="px-6 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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