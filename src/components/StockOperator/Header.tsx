import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, ChevronRight, Boxes } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { DashboardFilters } from "../../types/dashboard";
import {
  LineResponse,
  StyleResponse,
  DISPLAY_FACTORY_CODES,
  DisplayFactoryCode,
  mapDisplayToApiFactory,
} from "../../types/api";
import {
  fetchLines,
  fetchStyles,
  convertNoLineToLine,
  setCurrentFactory,
} from "../../services/api";
import { fetchStylePeriod } from "../../services/stockOperator";

interface StockOperatorHeaderProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  onLookup: () => void;
  onLineNameChange?: (lineName: string) => void;
  hideTitle?: boolean;
  title?: string;
  icon?: React.ReactNode;
}

interface GroupedLine {
  mainLine: string;
  subLines: LineResponse[];
}

const StockOperatorHeader: React.FC<StockOperatorHeaderProps> = ({
  filters,
  onFiltersChange,
  onLookup,
  onLineNameChange,
  hideTitle = false,
  title,
  icon,
}) => {
  const [lines, setLines] = useState<LineResponse[]>([]);
  const [styles, setStyles] = useState<StyleResponse[]>([]);
  const [periods, setPeriods] = useState<{ Col_Style: string; PERIOD: string }[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [lineError, setLineError] = useState<string | null>(null);
  const [showSubLines, setShowSubLines] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loading = loadingLines || loadingStyles || loadingPeriods;

  const groupLines = (items: LineResponse[]): GroupedLine[] => {
    const groups: Record<string, LineResponse[]> = {};

    items.forEach((line) => {
      const match = line.LINE.match(/(\d+)/);
      if (!match) return;

      const mainLine = String(parseInt(match[1], 10));
      if (!groups[mainLine]) groups[mainLine] = [];
      groups[mainLine].push(line);
    });

    return Object.entries(groups)
      .map(([mainLine, subLines]) => ({
        mainLine,
        subLines: subLines.sort((a, b) => a.LINE.localeCompare(b.LINE)),
      }))
      .sort((a, b) => Number(a.mainLine) - Number(b.mainLine));
  };

  const groupedLines = useMemo(() => groupLines(lines), [lines]);

  useEffect(() => {
    const loadLines = async () => {
      if (!filters.factory) {
        setLines([]);
        setLoadingLines(false);
        return;
      }

      setLoadingLines(true);
      setLineError(null);

      try {
        const data = await fetchLines(filters.factory);
        setLines(data);

        if (data.length > 0 && !data.find((l) => l.NOLINE === filters.line)) {
          onFiltersChange({
            ...filters,
            line: data[0].NOLINE,
            style: "",
          });

          if (onLineNameChange) {
            onLineNameChange(data[0].LINE);
          }
        }
      } catch (error) {
        console.error("Error fetching lines:", error);
        setLineError("Failed to load lines");
        setLines([]);
      } finally {
        setLoadingLines(false);
      }
    };

    loadLines();
  }, [filters.factory]);

  useEffect(() => {
    const loadStyles = async () => {
      if (!filters.line) {
        setStyles([]);
        return;
      }

      setLoadingStyles(true);

      try {
        const data = await fetchStyles({
          line_id: filters.line,
          office: filters.factory,
          date: filters.date,
        });

        setStyles(data);

        if (data.length > 0) {
          const styleExists = data.find((s) => s.STYLE === filters.style);
          if (!styleExists) {
            onFiltersChange({
              ...filters,
              style: data[0].STYLE,
            });
          }
        } else if (filters.style) {
          onFiltersChange({
            ...filters,
            style: "",
          });
        }
      } catch (error) {
        console.error("Error fetching styles:", error);
        setStyles([]);
        if (filters.style) {
          onFiltersChange({
            ...filters,
            style: "",
          });
        }
      } finally {
        setLoadingStyles(false);
      }
    };

    loadStyles();
  }, [filters.line, filters.factory, filters.date]);

  useEffect(() => {
    const loadPeriods = async () => {
      if (!filters.line || !filters.style) {
        setPeriods([]);
        if (filters.period) {
          onFiltersChange({ ...filters, period: "" });
        }
        return;
      }

      setLoadingPeriods(true);
      try {
        const data = await fetchStylePeriod({
          lineNo: filters.line,
          style: filters.style,
        });
        
        // Urutkan DESC (paling baru di atas)
        const sortedData = [...data].sort((a, b) => b.PERIOD.localeCompare(a.PERIOD));
        
        setPeriods(sortedData);

        if (sortedData.length > 0) {
          const periodExists = sortedData.find((p) => p.PERIOD === filters.period);
          if (!periodExists) {
            onFiltersChange({
              ...filters,
              period: sortedData[0].PERIOD,
            });
          }
        } else if (filters.period) {
          onFiltersChange({
            ...filters,
            period: "",
          });
        }
      } catch (error) {
        console.error("Error fetching periods:", error);
        setPeriods([]);
        if (filters.period) {
          onFiltersChange({ ...filters, period: "" });
        }
      } finally {
        setLoadingPeriods(false);
      }
    };

    loadPeriods();
  }, [filters.line, filters.style]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setShowSubLines(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFilterChange = (
    key: keyof DashboardFilters,
    value: string | Date,
  ) => {
    if (key === "factory") {
      const apiFactory = mapDisplayToApiFactory(value as DisplayFactoryCode);
      setCurrentFactory(apiFactory);

      onFiltersChange({
        ...filters,
        factory: value as string,
        line: "",
        style: "",
        period: "",
      });

      if (onLineNameChange) {
        onLineNameChange("");
      }
      return;
    }

    if (key === "line") {
      const actualLineName = convertNoLineToLine(lines, value as string);

      onFiltersChange({
        ...filters,
        line: value as string,
        style: "",
        period: "",
      });

      if (onLineNameChange) {
        onLineNameChange(actualLineName);
      }
      return;
    }

    if (key === "date") {
      onFiltersChange({
        ...filters,
        date: value as Date,
      });
      return;
    }

    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleLineClick = (mainLine: string) => {
    setShowSubLines(showSubLines === mainLine ? null : mainLine);

    const group = groupedLines.find((g) => g.mainLine === mainLine);
    if (group && group.subLines.length === 1) {
      handleFilterChange("line", group.subLines[0].NOLINE);
      setIsDropdownOpen(false);
      setShowSubLines(null);
    }
  };

  const handleSubLineClick = (
    noLine: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    handleFilterChange("line", noLine);
    setIsDropdownOpen(false);
    setShowSubLines(null);
  };

  const inputClasses =
    "px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-800 text-gray-200 shadow-sm";
  const labelClasses =
    "text-sm font-medium text-gray-300 uppercase tracking-wide";
  const groupClasses = "flex items-center gap-3";

  return (
    <div className={hideTitle ? "" : "bg-gray-900 border-b border-gray-700 shadow-sm"}>
      <div className={hideTitle ? "" : "mx-6"}>
        <div className={`flex flex-col lg:flex-row lg:items-center gap-4 ${hideTitle ? "py-1" : "py-4"}`}>
          {!hideTitle && (
            <div className="flex items-center gap-3">
              {icon || <Boxes className="w-8 h-8 text-purple-400" />}
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                {title || "Stock Operator Monitoring"}
              </h1>
            </div>
          )}

          <div className={`flex-1 flex flex-wrap items-center ${hideTitle ? "justify-start" : "justify-end"} gap-4 lg:gap-5`}>
            <div className={groupClasses}>
              <Calendar className="w-5 h-5 text-gray-400" />
              <label className={labelClasses}>Date</label>
              <DatePicker
                selected={filters.date}
                onChange={(date) => {
                  if (date) handleFilterChange("date", date);
                }}
                dateFormat="yyyy-MM-dd"
                className={inputClasses}
              />
            </div>

            <div className={groupClasses}>
              <label className={labelClasses}>Factory</label>
              <select
                value={filters.factory || ""}
                onChange={(e) => handleFilterChange("factory", e.target.value)}
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

            <div className={`${groupClasses} relative z-[999]`}>
              <label className={labelClasses}>Line</label>
              <div className="relative z-[999]" ref={dropdownRef}>
                <button
                  type="button"
                  className={`${inputClasses} min-w-[170px] text-left flex justify-between items-center`}
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                >
                  {loadingLines
                    ? "Loading..."
                    : lineError
                      ? "Error loading lines"
                      : filters.line
                        ? lines.find((l) => l.NOLINE === filters.line)?.LINE ||
                          "Select Line"
                        : "Select Line"}
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && !loadingLines && !lineError && lines.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full min-w-[200px] max-h-[420px] overflow-y-auto rounded-md border border-gray-600 bg-gray-800 shadow-2xl z-[1000]">
                    {groupedLines.map(({ mainLine, subLines }) => (
                      <div key={mainLine}>
                        <button
                          type="button"
                          className={`w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center justify-between text-gray-200 ${
                            showSubLines === mainLine ? "bg-gray-700" : ""
                          }`}
                          onClick={() => handleLineClick(mainLine)}
                        >
                          <span>Line {mainLine}</span>
                          {subLines.length > 1 && (
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                                showSubLines === mainLine ? "rotate-90" : ""
                              }`}
                            />
                          )}
                        </button>

                        {showSubLines === mainLine && subLines.length > 1 && (
                          <div className="bg-gray-800">
                            {subLines.map((subLine) => (
                              <button
                                key={subLine.NOLINE}
                                type="button"
                                className={`w-full px-6 py-2 text-left hover:bg-gray-700 text-gray-200 ${
                                  filters.line === subLine.NOLINE
                                    ? "bg-purple-900 text-purple-200"
                                    : ""
                                }`}
                                onClick={(e) =>
                                  handleSubLineClick(subLine.NOLINE, e)
                                }
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

            <div className={groupClasses}>
              <label className={labelClasses}>Style</label>
              <select
                value={filters.style}
                onChange={(e) => handleFilterChange("style", e.target.value)}
                className={`${inputClasses} min-w-[150px]`}
                disabled={loadingStyles || styles.length === 0}
              >
                {loadingStyles ? (
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

            <div className={groupClasses}>
              <label className={labelClasses}>Period</label>
              <select
                value={filters.period || ""}
                onChange={(e) => handleFilterChange("period", e.target.value)}
                className={`${inputClasses} min-w-[150px]`}
                disabled={loadingPeriods || periods.length === 0}
              >
                {loadingPeriods ? (
                  <option>Loading...</option>
                ) : periods.length === 0 ? (
                  <option value="">No periods available</option>
                ) : (
                  periods.map((p) => (
                    <option key={p.PERIOD} value={p.PERIOD}>
                      {p.PERIOD}
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={onLookup}
              disabled={loading || !filters.line || !filters.style || !filters.period}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? "Loading..." : "Lookup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockOperatorHeader;