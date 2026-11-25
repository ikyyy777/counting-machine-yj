import React, { useMemo, useState } from 'react';
import LineBalanceTable from '../components/LineBalance/LineBalanceTable';
import SummaryWidgets from '../components/LineBalance/SummaryWidgets';
import { LineBalanceRow } from '../components/LineBalance/types';
import { Calendar, Scale, Search, Loader2, Clock, ChevronDown } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ExcelJS from 'exceljs';
import {
  createCorrectiveActionMaster,
  createIssueMaster,
  fetchCorrectiveActionMaster,
  fetchIssueMaster,
  fetchLineBalanceData,
  fetchLineBalanceManualInput,
  fetchLines,
  fetchOutputModuleEmployee,
  fetchOutputModules,
  fetchStyles,
  convertNoLineToLine,
  upsertLineBalanceManualInput,
} from '../services/api';
import { EmployeePerformanceResponse } from '../types/api';
import { LineResponse } from '../types/api';

const LineBalance: React.FC = () => {
  const [rows, setRows] = useState<LineBalanceRow[]>([]);
  const [factory, setFactory] = useState<string>('YONGJIN 2-1');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [startHour, setStartHour] = useState<string>('07:00');
  const [endHour, setEndHour] = useState<string>('16:00');
  const [isLoading, setIsLoading] = useState(false);
  const [lineOptions, setLineOptions] = useState<LineResponse[]>([]);
  const [moduleOptionsByRow, setModuleOptionsByRow] = useState<Record<number, string[]>>({});
  const [employeeOptionsByRowModule, setEmployeeOptionsByRowModule] = useState<Record<string, EmployeePerformanceResponse[]>>({});
  const [correctiveActionOptions, setCorrectiveActionOptions] = useState<string[]>([]);
  const [issueOptions, setIssueOptions] = useState<string[]>([]);
  const [workDateStr, setWorkDateStr] = useState<string>('');
  const [isAddCaOpen, setIsAddCaOpen] = useState(false);
  const [newCaValue, setNewCaValue] = useState('');
  const [isSavingCa, setIsSavingCa] = useState(false);
  const [saveCaError, setSaveCaError] = useState<string>('');
  const [isAddIssueOpen, setIsAddIssueOpen] = useState(false);
  const [newIssueValue, setNewIssueValue] = useState('');
  const [isSavingIssue, setIsSavingIssue] = useState(false);
  const [saveIssueError, setSaveIssueError] = useState<string>('');

  const inputClasses =
    'px-3 py-2 border border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-800 text-gray-200 shadow-sm';
  const labelClasses = 'text-sm font-medium text-gray-300 uppercase tracking-wide';

  const ModernTimePicker: React.FC<{
    label: string;
    value: string;
    onChange: (next: string) => void;
  }> = ({ label, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [hh, mm] = value.split(':');

    const hours = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className="relative" ref={containerRef}>
        <div className="flex flex-col gap-1.5">
          <label className={labelClasses}>{label}</label>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`${inputClasses} flex items-center justify-between gap-3 min-w-[110px] hover:border-blue-500/50 transition-all duration-200 group`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="font-mono font-medium tracking-wider">{value}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 z-[100] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 min-w-[240px] animate-in fade-in zoom-in duration-200">
            <div className="flex gap-4">
              <div className="flex-1 min-w-[60px]">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2 px-1">Hour</div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {hours.map(h => (
                    <button
                      key={h}
                      onClick={() => {
                        onChange(`${h}:${mm}`);
                      }}
                      className={`w-full py-1.5 text-xs rounded-md transition-all ${hh === h
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-px bg-gray-800" />

              <div className="flex-1 min-w-[60px]">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2 px-1">Min</div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {minutes.map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        onChange(`${hh}:${m}`);
                        setIsOpen(false);
                      }}
                      className={`w-full py-1.5 text-xs rounded-md transition-all ${mm === m
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between items-center">
              <span className="text-[10px] text-gray-500 italic">24h Format</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const summary = useMemo(() => {
    const bottleneckTTL = rows.filter(r => Number(r.beforeBalance) < 0).length;
    const actionCompleted = rows.filter(r => String(r.correctiveAction).trim().length > 0).length;
    const noActionTaken = rows.length - actionCompleted;
    return { bottleneckTTL, actionCompleted, noActionTaken };
  }, [rows]);

  React.useEffect(() => {
    let cancelled = false;
    const loadLines = async () => {
      try {
        const data = await fetchLines(factory);
        if (cancelled) return;
        setLineOptions(data);
      } catch (e) {
        console.error('Failed to fetch lines:', e);
        if (cancelled) return;
        setLineOptions([]);
      }
    };

    loadLines();
    return () => {
      cancelled = true;
    };
  }, [factory]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const master = await fetchCorrectiveActionMaster({ onlyActive: true });
        if (cancelled) return;
        setCorrectiveActionOptions(master.map(m => m.Corrective_Actions).filter(Boolean));
      } catch (e) {
        console.error('Failed to fetch corrective action master:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExportExcel = async () => {
    const dateStr = workDateStr || (selectedDate ? selectedDate.toISOString().split('T')[0] : '');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Line Balance', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 5 }]
    });

    const columns = [
      { header: 'Line', key: 'line', width: 8 },
      { header: 'Style', key: 'style', width: 22 },
      { header: 'Module', key: 'module', width: 12 },
      { header: 'NIK', key: 'nik', width: 14 },
      { header: 'Operator', key: 'name', width: 18 },
      { header: 'Process', key: 'process', width: 46 },
      { header: 'Output/Avg', key: 'outputAvg', width: 12 },
      { header: 'Output/H', key: 'beforeOutputH', width: 14 },
      { header: 'Balance', key: 'beforeBalance', width: 14 },
      { header: 'Time Check', key: 'timeCheck', width: 12 },
      { header: 'Output/H', key: 'afterOutputH', width: 14 },
      { header: 'Balance', key: 'afterBalance', width: 14 },
      { header: 'PIC', key: 'pic', width: 16 },
      { header: 'Issue', key: 'issue', width: 22 },
      { header: 'Corrective Action', key: 'correctiveAction', width: 32 },
    ];

    ws.columns = columns as any;

    ws.mergeCells(1, 1, 1, columns.length);
    ws.getCell(1, 1).value = 'Line Balance Team Bottleneck Checklist';
    ws.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FF111827' } };
    ws.getCell(1, 1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 28;

    ws.mergeCells(2, 1, 2, columns.length);
    ws.getCell(2, 1).value = `Factory: ${factory}    Work Date: ${dateStr}`;
    ws.getCell(2, 1).font = { bold: true, size: 11, color: { argb: 'FF374151' } };
    ws.getCell(2, 1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 18;

    ws.mergeCells(3, 1, 3, columns.length);
    ws.getCell(3, 1).value = `Bottleneck TTL: ${summary.bottleneckTTL}    Action Completed: ${summary.actionCompleted}    No Action Taken: ${summary.noActionTaken}`;
    ws.getCell(3, 1).font = { size: 10, color: { argb: 'FF6B7280' } };
    ws.getCell(3, 1).alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(3).height = 16;

    const groupHeaderRowIndex = 4;
    const headerRowIndex = 5;

    // Group header (banded columns) - match UI: General | Before | After | Post-Process
    ws.mergeCells(groupHeaderRowIndex, 1, groupHeaderRowIndex, 7);
    ws.getCell(groupHeaderRowIndex, 1).value = 'General';
    ws.mergeCells(groupHeaderRowIndex, 8, groupHeaderRowIndex, 10);
    ws.getCell(groupHeaderRowIndex, 8).value = 'BEFORE';
    ws.mergeCells(groupHeaderRowIndex, 11, groupHeaderRowIndex, 12);
    ws.getCell(groupHeaderRowIndex, 11).value = 'AFTER';
    ws.mergeCells(groupHeaderRowIndex, 13, groupHeaderRowIndex, 15);
    ws.getCell(groupHeaderRowIndex, 13).value = 'Post-Process';

    const groupRow = ws.getRow(groupHeaderRowIndex);
    groupRow.height = 18;
    groupRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    groupRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // General band
    for (let c = 1; c <= 7; c++) {
      const cell = ws.getCell(groupHeaderRowIndex, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    }
    // BEFORE band (orange)
    for (let c = 8; c <= 10; c++) {
      const cell = ws.getCell(groupHeaderRowIndex, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9A3412' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFF97316' } },
        left: { style: 'thin', color: { argb: 'FFF97316' } },
        bottom: { style: 'thin', color: { argb: 'FFF97316' } },
        right: { style: 'thin', color: { argb: 'FFF97316' } },
      };
    }
    // AFTER band (blue)
    for (let c = 11; c <= 12; c++) {
      const cell = ws.getCell(groupHeaderRowIndex, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF60A5FA' } },
        left: { style: 'thin', color: { argb: 'FF60A5FA' } },
        bottom: { style: 'thin', color: { argb: 'FF60A5FA' } },
        right: { style: 'thin', color: { argb: 'FF60A5FA' } },
      };
    }
    // Post-Process band
    for (let c = 13; c <= 15; c++) {
      const cell = ws.getCell(groupHeaderRowIndex, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    }

    // Column header row
    const headerRow = ws.getRow(headerRowIndex);
    headerRow.height = 22;
    headerRow.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    for (let c = 1; c <= columns.length; c++) {
      const cell = ws.getCell(headerRowIndex, c);
      cell.value = columns[c - 1].header;

      // Match UI banding
      let fill = 'FF0F172A';
      let borderColor = 'FF334155';
      if (c >= 8 && c <= 10) {
        fill = 'FF7C2D12';
        borderColor = 'FFF97316';
      } else if (c >= 11 && c <= 12) {
        fill = 'FF1E3A8A';
        borderColor = 'FF60A5FA';
      }

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
      cell.border = {
        top: { style: 'thin', color: { argb: borderColor } },
        left: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'thin', color: { argb: borderColor } },
        right: { style: 'thin', color: { argb: borderColor } },
      };
    }

    const dataStartRow = headerRowIndex + 1;
    rows.forEach(r => {
      ws.addRow({
        line: String(r.line ?? ''),
        style: String(r.style ?? ''),
        module: String(r.module ?? ''),
        nik: String(r.nik ?? ''),
        name: String(r.name ?? ''),
        process: String(r.process ?? '').replace(/\r\n/g, '\n'),
        outputAvg: Number(r.outputAvg ?? 0),
        beforeOutputH: Number(r.beforeOutputH ?? 0),
        beforeBalance: Number(r.beforeBalance ?? 0),
        timeCheck: String(r.timeCheck ?? ''),
        afterOutputH: r.afterOutputH === '' ? '' : Number(r.afterOutputH ?? 0),
        afterBalance: Number(r.afterBalance ?? 0),
        pic: String(r.pic ?? ''),
        issue: String(r.issue ?? '').replace(/\r\n/g, '\n'),
        correctiveAction: String(r.correctiveAction ?? '').replace(/\r\n/g, '\n'),
      });
    });

    const estimateLineCount = (value: unknown, colWidth: number) => {
      const text = String(value ?? '').replace(/\r\n/g, '\n');
      if (!text) return 1;

      // Excel column width is roughly character count, but wrapping depends on font, zoom, and word boundaries.
      // Use a *more conservative* heuristic to avoid clipped wrapped text.
      const approxCharsPerLine = Math.max(8, Math.floor(colWidth * 0.85));
      return text
        .split('\n')
        .map(line => Math.max(1, Math.ceil(line.length / approxCharsPerLine)))
        .reduce((a, b) => a + b, 0);
    };

    const lastRow = ws.rowCount;
    for (let rowIdx = dataStartRow; rowIdx <= lastRow; rowIdx++) {
      const row = ws.getRow(rowIdx);

      // Make sure wrapped text is fully visible (especially Process)
      const processLines = estimateLineCount(row.getCell(6).value, columns[5].width ?? 46);
      const issueLines = estimateLineCount(row.getCell(14).value, columns[13].width ?? 22);
      const caLines = estimateLineCount(row.getCell(15).value, columns[14].width ?? 32);
      const styleLines = estimateLineCount(row.getCell(2).value, columns[1].width ?? 22);

      // Add padding lines because Excel render can clip the last line when close to boundary.
      const maxLines = Math.max(processLines, issueLines, caLines, styleLines, 1) + 1;
      row.height = Math.max(18, maxLines * 16);

      for (let colIdx = 1; colIdx <= columns.length; colIdx++) {
        const cell = ws.getCell(rowIdx, colIdx);
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
        if (colIdx === 6 || colIdx === 15) {
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        } else if (colIdx === 2 || colIdx === 14) {
          cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        }
      }

      const beforeBal = Number(row.getCell(9).value ?? 0);
      if (Number.isFinite(beforeBal) && beforeBal < 0) {
        row.getCell(9).font = { bold: true, color: { argb: 'FFB91C1C' } };
      }

      const afterBal = Number(row.getCell(12).value ?? 0);
      if (Number.isFinite(afterBal) && afterBal < 0) {
        row.getCell(12).font = { bold: true, color: { argb: 'FFDC2626' } };
      }
    }

    // Merge repeated cells (Line+Style, Module) to make export easier to read
    const mergeLineStyle = () => {
      let start = 0;
      while (start < rows.length) {
        const base = rows[start];
        const key = `${base.line}||${base.style}`;
        let end = start;
        while (end + 1 < rows.length) {
          const next = rows[end + 1];
          const nextKey = `${next.line}||${next.style}`;
          if (nextKey !== key) break;
          end++;
        }

        const fromRow = dataStartRow + start;
        const toRow = dataStartRow + end;
        if (toRow > fromRow) {
          ws.mergeCells(fromRow, 1, toRow, 1); // Line
          ws.mergeCells(fromRow, 2, toRow, 2); // Style
          ws.getCell(fromRow, 1).alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
          ws.getCell(fromRow, 2).alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        }

        start = end + 1;
      }
    };

    const mergeModule = () => {
      let start = 0;
      while (start < rows.length) {
        const base = rows[start];
        const key = `${base.line}||${base.style}||${base.module}`;
        let end = start;
        while (end + 1 < rows.length) {
          const next = rows[end + 1];
          const nextKey = `${next.line}||${next.style}||${next.module}`;
          if (nextKey !== key) break;
          end++;
        }

        const fromRow = dataStartRow + start;
        const toRow = dataStartRow + end;
        if (toRow > fromRow) {
          ws.mergeCells(fromRow, 3, toRow, 3); // Module
          ws.getCell(fromRow, 3).alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
        }

        start = end + 1;
      }
    };

    const applyGroupSeparators = () => {
      // Add medium borders between different (Line+Style) groups
      for (let i = 0; i < rows.length; i++) {
        const curr = rows[i];
        const prev = i > 0 ? rows[i - 1] : null;
        const currKey = `${curr.line}||${curr.style}`;
        const prevKey = prev ? `${prev.line}||${prev.style}` : null;

        const rowIndex = dataStartRow + i;
        const isGroupStart = i === 0 || currKey !== prevKey;
        if (isGroupStart) {
          for (let colIdx = 1; colIdx <= columns.length; colIdx++) {
            const cell = ws.getCell(rowIndex, colIdx);
            cell.border = {
              ...(cell.border ?? {}),
              top: { style: 'medium', color: { argb: 'FF94A3B8' } },
            };
          }
        }
      }

      // Ensure last row has a medium bottom border
      if (rows.length > 0) {
        for (let colIdx = 1; colIdx <= columns.length; colIdx++) {
          const cell = ws.getCell(dataStartRow + rows.length - 1, colIdx);
          cell.border = {
            ...(cell.border ?? {}),
            bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
          };
        }
      }
    };

    mergeLineStyle();
    mergeModule();
    applyGroupSeparators();

    ws.getColumn(7).numFmt = '0';
    ws.getColumn(8).numFmt = '0';
    ws.getColumn(9).numFmt = '0';
    ws.getColumn(11).numFmt = '0';
    ws.getColumn(12).numFmt = '0';

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LineBalance_${factory}_${dateStr || 'export'}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };


  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const master = await fetchIssueMaster({ onlyActive: true });
        if (cancelled) return;
        setIssueOptions(master.map(m => m.Issue).filter(Boolean));
      } catch (e) {
        console.error('Failed to fetch issue master:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCorrectiveActions = async () => {
    const master = await fetchCorrectiveActionMaster({ onlyActive: true });
    setCorrectiveActionOptions(master.map(m => m.Corrective_Actions).filter(Boolean));
  };

  const refreshIssues = async () => {
    const master = await fetchIssueMaster({ onlyActive: true });
    setIssueOptions(master.map(m => m.Issue).filter(Boolean));
  };

  const isValidTimeHHmm = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value ?? ''));

  const handleLookup = async () => {
    if (!selectedDate || !factory) return;

    const safeStartHour = isValidTimeHHmm(startHour) ? startHour : '07:00';
    const safeEndHour = isValidTimeHHmm(endHour) ? endHour : '16:00';
    if (safeStartHour !== startHour) setStartHour(safeStartHour);
    if (safeEndHour !== endHour) setEndHour(safeEndHour);

    setIsLoading(true);
    try {
      // Format date to YYYY-MM-DD
      const dateStr = selectedDate.toISOString().split('T')[0];
      setWorkDateStr(dateStr);

      const response = await fetchLineBalanceData({
        factory: factory,
        workdate: dateStr,
        starthour: safeStartHour,
        endhour: safeEndHour,
      });

      const manualInputs = await fetchLineBalanceManualInput({
        factory: factory,
        workDate: dateStr
      });

      const manualMap = new Map<string, (typeof manualInputs)[number]>();
      manualInputs.forEach(m => {
        const key = `${m.Factory}||${dateStr}||${m.Line}||${m.Style}||${m.Module}||${m.NIK}`;
        manualMap.set(key, m);
      });

      if (response && response.lines) {
        const newRows: LineBalanceRow[] = [];

        response.lines.forEach(lineData => {
          if (lineData.operators) {
            lineData.operators.forEach(op => {
              // Hanya tampilkan yang deficient
              if (op.status?.label === 'Deficient') {
                const lineValue = String(lineData.line_name ?? lineData.line_code);
                const rowKey = `${factory}||${dateStr}||${lineValue}||${lineData.style}||${op.part}||${op.nik}`;
                const manual = manualMap.get(rowKey);

                const afterOutputHValue = String(manual?.AfterOutputH ?? '');
                const afterOutputHNum = Number(afterOutputHValue);
                const outputAvgNum = Number(op.average_qc_output ?? 0);
                const afterBalanceValue = afterOutputHValue === ''
                  ? 0
                  : (!Number.isNaN(afterOutputHNum) && !Number.isNaN(outputAvgNum))
                    ? afterOutputHNum - outputAvgNum
                    : 0;

                newRows.push({
                  line: lineValue,
                  style: lineData.style,
                  module: op.part,
                  nik: op.nik,
                  name: op.name,
                  process: op.process,
                  outputAvg: op.average_qc_output ?? 0,
                  beforeOutputH: op.average_output ?? 0,
                  beforeBalance: op.balance ?? 0,
                  timeCheck: String(manual?.TimeCheck ?? ''),
                  afterOutputH: afterOutputHValue,
                  afterBalance: afterBalanceValue,
                  pic: String(manual?.PIC ?? ''),
                  issue: String(manual?.Issue ?? ''),
                  correctiveAction: String(manual?.CorrectiveAction ?? ''),
                  alasanLainnya: ''
                });
              }
            });
          }
        });



        // Sort rows to ensure proper grouping for rowSpans
        newRows.sort((a, b) => {
          if (a.line !== b.line) {
            const aNum = Number(a.line);
            const bNum = Number(b.line);
            const aIsNum = Number.isFinite(aNum);
            const bIsNum = Number.isFinite(bNum);

            if (aIsNum && bIsNum) return aNum - bNum;
            if (aIsNum && !bIsNum) return -1;
            if (!aIsNum && bIsNum) return 1;
            return String(a.line).localeCompare(String(b.line));
          }
          if (a.style !== b.style) return a.style.localeCompare(b.style);
          return a.module.localeCompare(b.module);
        });

        setRows(newRows);
        setModuleOptionsByRow({});
        setEmployeeOptionsByRowModule({});
      }
    } catch (error) {
      console.error('Failed to fetch line balance data:', error);
      // Optional: Add toast or error state here
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomRow = () => {
    const newRow: LineBalanceRow = {
      isCustom: true,
      lineId: '',
      line: '',
      style: '',
      module: '',
      customModules: [{ module: '', niks: [{ nik: '' }] }],
      nik: '',
      name: '',
      process: '',
      outputAvg: 0,
      beforeOutputH: 0,
      beforeBalance: 0,
      timeCheck: '',
      afterOutputH: '',
      afterBalance: 0,
      pic: '',
      issue: '',
      correctiveAction: '',
      alasanLainnya: '',
    };

    setRows(prev => [...prev, newRow]);
  };

  const openAddCorrectiveActionModal = () => {
    setSaveCaError('');
    setNewCaValue('');
    setIsAddCaOpen(true);
  };

  const openAddIssueModal = () => {
    setSaveIssueError('');
    setNewIssueValue('');
    setIsAddIssueOpen(true);
  };

  const submitAddCorrectiveAction = async () => {
    const trimmed = String(newCaValue ?? '').trim();
    if (!trimmed) {
      setSaveCaError('Corrective action is required.');
      return;
    }

    setIsSavingCa(true);
    setSaveCaError('');
    try {
      const res = await createCorrectiveActionMaster({
        correctiveAction: trimmed,
        createdBy: ''
      });

      if (res?.status && String(res.status).toLowerCase() !== 'success') {
        throw new Error(res?.message || 'Failed to save corrective action');
      }

      await refreshCorrectiveActions();
      setIsAddCaOpen(false);
    } catch (e: any) {
      setSaveCaError(String(e?.message ?? e ?? 'Failed to save corrective action'));
    } finally {
      setIsSavingCa(false);
    }
  };

  const submitAddIssue = async () => {
    const trimmed = String(newIssueValue ?? '').trim();
    if (!trimmed) {
      setSaveIssueError('Issue is required.');
      return;
    }

    setIsSavingIssue(true);
    setSaveIssueError('');
    try {
      const res = await createIssueMaster({
        issue: trimmed,
        createdBy: ''
      });

      if (res?.status && String(res.status).toLowerCase() !== 'success') {
        throw new Error(res?.message || 'Failed to save issue');
      }

      await refreshIssues();
      setIsAddIssueOpen(false);
    } catch (e: any) {
      setSaveIssueError(String(e?.message ?? e ?? 'Failed to save issue'));
    } finally {
      setIsSavingIssue(false);
    }
  };

  const persistRow = async (rowIndex: number) => {
    if (!workDateStr) return;
    const r = rows[rowIndex];
    if (!r) return;

    if (r.isCustom) {
      // Handle custom row persistence
      const customModules = r.customModules ?? [];
      for (const mod of customModules) {
        const moduleName = String(mod.module ?? '').trim();
        const niks = mod.niks ?? [];

        for (const nikEntry of niks) {
          const opData = typeof nikEntry === 'string' ? { nik: nikEntry } : nikEntry;
          const nikValue = String(opData.nik ?? '').trim();

          try {
            await upsertLineBalanceManualInput({
              factory,
              workDate: workDateStr,
              line: String(r.line ?? ''),
              style: String(r.style ?? ''),
              module: moduleName,
              nik: nikValue,
              timeCheck: String(opData.timeCheck ?? ''),
              afterOutputH: String(opData.afterOutputH ?? ''),
              pic: String(opData.pic ?? ''),
              issue: String(opData.issue ?? ''),
              correctiveAction: String(opData.correctiveAction ?? ''),
              updatedBy: '',
            });
          } catch (e) {
            console.error('Failed to persist custom line balance manual input:', e);
          }
        }
      }
      return;
    }

    try {
      await upsertLineBalanceManualInput({
        factory,
        workDate: workDateStr,
        line: String(r.line ?? ''),
        style: String(r.style ?? ''),
        module: String(r.module ?? ''),
        nik: String(r.nik ?? ''),
        timeCheck: String(r.timeCheck ?? ''),
        afterOutputH: String(r.afterOutputH ?? ''),
        pic: String(r.pic ?? ''),
        issue: String(r.issue ?? ''),
        correctiveAction: String(r.correctiveAction ?? ''),
        updatedBy: '',
      });
    } catch (e) {
      console.error('Failed to persist line balance manual input:', e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="bg-gray-900 border-b border-gray-700 shadow-sm">
        <div className="mx-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
            <div className="flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                Line Balance
              </h1>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row lg:items-end justify-end gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClasses}>
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Date
                    </span>
                  </label>
                  <DatePicker
                    selected={selectedDate}
                    onChange={date => setSelectedDate(date)}
                    dateFormat="yyyy-MM-dd"
                    className={inputClasses}
                    popperClassName="!z-50"
                  />
                </div>

                <ModernTimePicker label="Start Hour" value={startHour} onChange={setStartHour} />
                <ModernTimePicker label="End Hour" value={endHour} onChange={setEndHour} />

                <div className="flex flex-col gap-1.5">
                  <label className={labelClasses}>Factory</label>
                  <select className={inputClasses} value={factory} onChange={e => setFactory(e.target.value)}>
                    <option value="YONGJIN 2-1">YONGJIN 2-1</option>
                    <option value="YONGJIN 2-2">YONGJIN 2-2</option>
                    <option value="YONGJIN 1">YONGJIN 1</option>
                    <option value="YONGJIN 3">YONGJIN 3</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={handleLookup}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Lookup
                </button>

                <button
                  onClick={handleExportExcel}
                  disabled={isLoading || rows.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-6 py-4">
        <div className="mb-4">
          <SummaryWidgets
            bottleneckTTL={summary.bottleneckTTL}
            actionCompleted={summary.actionCompleted}
            noActionTaken={summary.noActionTaken}
          />
        </div>

        <LineBalanceTable
          rows={rows}
          correctiveActionOptions={correctiveActionOptions}
          issueOptions={issueOptions}
          onAddCustomRow={addCustomRow}
          moduleOptionsByRow={moduleOptionsByRow}
          employeeOptionsByRowModule={employeeOptionsByRowModule}
          lineOptions={lineOptions}
          onCustomLineChange={async (rowIndex, lineId) => {
            const lineName = convertNoLineToLine(lineOptions, lineId);

            setModuleOptionsByRow(prevOpts => {
              const next = { ...prevOpts };
              delete next[rowIndex];
              return next;
            });
            setEmployeeOptionsByRowModule(prev => {
              const next: Record<string, EmployeePerformanceResponse[]> = {};
              const prefix = `${rowIndex}||`;
              for (const [k, v] of Object.entries(prev)) {
                if (!k.startsWith(prefix)) next[k] = v;
              }
              return next;
            });

            setRows(prev => prev.map((r, idx) => {
              if (idx !== rowIndex) return r;
              return {
                ...r,
                lineId,
                line: lineName,
                style: '',
                module: '',
                customModules: [{ module: '', niks: [{ nik: '' }] }],
                nik: '',
                name: '',
                process: '',
                outputAvg: 0,
                beforeOutputH: 0,
                beforeBalance: 0,
              };
            }));

            if (!lineId || !selectedDate) return;

            try {
              const styles = await fetchStyles({
                line_id: lineId,
                office: factory,
                date: selectedDate,
              });
              const style =
                (styles ?? [])
                  .map(s => String(s?.STYLE ?? '').trim())
                  .find(s => s && s !== '-') ?? '';

              setRows(prev => prev.map((r, idx) => {
                if (idx !== rowIndex) return r;
                return { ...r, style };
              }));

              const dateStr = workDateStr || selectedDate.toISOString().split('T')[0];
              if (lineName && style && dateStr) {
                try {
                  const modules = await fetchOutputModules({
                    factory,
                    lineno: String(lineId),
                    styleno: style,
                    datefrom: dateStr,
                  });
                  setModuleOptionsByRow(prev => ({ ...prev, [rowIndex]: modules }));
                } catch (e) {
                  console.error('Failed to fetch module options:', e);
                }
              }
            } catch (e) {
              console.error('Failed to fetch styles for line:', e);
            }
          }}
          onAddCorrectiveAction={() => {
            openAddCorrectiveActionModal();
          }}
          onAddIssue={() => {
            openAddIssueModal();
          }}
          onUpdateRow={(rowIndex, patch) => {
            const currentRow = rows[rowIndex];

            if (currentRow?.isCustom && 'module' in patch) {
              const nextModule = String((patch as Partial<LineBalanceRow>).module ?? '').trim();
              const key = `${rowIndex}||${nextModule}`;
              if (!nextModule) {
                setEmployeeOptionsByRowModule(prev => {
                  const next = { ...prev };
                  delete next[key];
                  return next;
                });
              } else {
                const lineNo = String(currentRow.lineId ?? '').trim();
                const style = String(currentRow.style ?? '').trim();
                const dateStr = workDateStr || (selectedDate ? selectedDate.toISOString().split('T')[0] : '');

                if (lineNo && style && dateStr) {
                  (async () => {
                    try {
                      const employees = await fetchOutputModuleEmployee({
                        factory,
                        lineno: lineNo,
                        styleno: style,
                        datefrom: dateStr,
                        module: nextModule,
                      });
                      setEmployeeOptionsByRowModule(prev => ({ ...prev, [key]: employees }));
                    } catch (e) {
                      console.error('Failed to fetch employee options:', e);
                    }
                  })();
                }
              }
            }

            setRows(prev => prev.map((r, idx) => {
              if (idx !== rowIndex) return r;

              const updatedRow = { ...r, ...patch };

              if (r.isCustom) {
                if ('line' in patch) {
                  setModuleOptionsByRow(prevOpts => {
                    const next = { ...prevOpts };
                    delete next[rowIndex];
                    return next;
                  });
                  setEmployeeOptionsByRowModule(prev => {
                    const next: Record<string, EmployeePerformanceResponse[]> = {};
                    const prefix = `${rowIndex}||`;
                    for (const [k, v] of Object.entries(prev)) {
                      if (!k.startsWith(prefix)) next[k] = v;
                    }
                    return next;
                  });
                  updatedRow.module = '';
                  updatedRow.customModules = [{ module: '', niks: [{ nik: '' }] }];
                  updatedRow.nik = '';
                  updatedRow.name = '';
                  updatedRow.process = '';
                }

                if ('nik' in patch) {
                  const nextNik = String((patch as Partial<LineBalanceRow>).nik ?? '').trim();
                  const moduleForNik = String((patch as Partial<LineBalanceRow>).module ?? updatedRow.module ?? '').trim();
                  if (nextNik) {
                    const emp = (employeeOptionsByRowModule[`${rowIndex}||${moduleForNik}`] ?? []).find(e => String(e.NIK) === nextNik);
                    if (emp) {
                      const beforeOutputH = Number(emp.ASM_OUT ?? 0);
                      const outputAvg = Number(emp.AVERAGE_PER_PART ?? 0);
                      const beforeBalance = beforeOutputH - outputAvg;
                      updatedRow.name = String(emp.E_NAME ?? '');
                      updatedRow.process = String(emp.PROCESS_NAME ?? updatedRow.process ?? '');
                      updatedRow.outputAvg = outputAvg;
                      updatedRow.beforeOutputH = beforeOutputH;
                      updatedRow.beforeBalance = beforeBalance;
                    }
                  } else {
                    updatedRow.name = '';
                    updatedRow.process = '';
                    updatedRow.outputAvg = 0;
                    updatedRow.beforeOutputH = 0;
                    updatedRow.beforeBalance = 0;
                  }
                }
              }

              // Calculate After Balance if afterOutputH is updated
              if ('afterOutputH' in patch) {
                const rawAfter = (patch as Partial<LineBalanceRow>).afterOutputH;
                if (rawAfter === '' || rawAfter === null || rawAfter === undefined) {
                  updatedRow.afterBalance = 0;
                } else {
                  const afterOutputH = Number(updatedRow.afterOutputH);
                  const outputAvg = Number(updatedRow.outputAvg);

                  if (!Number.isNaN(afterOutputH) && !Number.isNaN(outputAvg)) {
                    updatedRow.afterBalance = afterOutputH - outputAvg;
                  } else {
                    updatedRow.afterBalance = 0;
                  }
                }
              }

              return updatedRow;
            }));
          }}
          onDeleteRow={(rowIndex) => {
            setRows(prev => {
              const next = prev.filter((_, idx) => idx !== rowIndex);
              return next;
            });

            // Cleanup options cache
            setModuleOptionsByRow(prev => {
              const next = { ...prev };
              delete next[rowIndex];
              // Shift subsequent indices down
              const keys = Object.keys(next).map(Number).sort((a, b) => a - b);
              keys.forEach(key => {
                if (key > rowIndex) {
                  next[key - 1] = next[key];
                  delete next[key];
                }
              });
              return next;
            });

            setEmployeeOptionsByRowModule(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(key => {
                const parts = key.split('||');
                const rIdx = Number(parts[0]);
                if (rIdx === rowIndex) {
                  delete next[key];
                } else if (rIdx > rowIndex) {
                  const newKey = `${rIdx - 1}||${parts.slice(1).join('||')}`;
                  next[newKey] = next[key];
                  delete next[key];
                }
              });
              return next;
            });
          }}
          onPersistRow={persistRow}
        />

        {isAddCaOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => {
                if (isSavingCa) return;
                setIsAddCaOpen(false);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl border border-slate-700/60 bg-slate-900 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-700/50">
                  <div className="text-sm font-bold tracking-wide text-slate-100 uppercase">
                    Add Corrective Action
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Add a new item to master data (will appear in dropdown).
                  </div>
                </div>

                <div className="px-5 py-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Corrective Action
                  </label>
                  <input
                    autoFocus
                    className="w-full rounded-lg bg-slate-800/70 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
                    placeholder="e.g. Re-train operator"
                    value={newCaValue}
                    disabled={isSavingCa}
                    onChange={e => setNewCaValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitAddCorrectiveAction();
                      if (e.key === 'Escape') {
                        if (isSavingCa) return;
                        setIsAddCaOpen(false);
                      }
                    }}
                  />

                  {saveCaError ? (
                    <div className="mt-3 text-xs text-rose-400">
                      {saveCaError}
                    </div>
                  ) : null}
                </div>

                <div className="px-5 py-4 border-t border-slate-700/50 flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSavingCa}
                    onClick={() => setIsAddCaOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSavingCa}
                    onClick={() => {
                      submitAddCorrectiveAction();
                    }}
                  >
                    {isSavingCa ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAddIssueOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => {
                if (isSavingIssue) return;
                setIsAddIssueOpen(false);
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-xl border border-slate-700/60 bg-slate-900 shadow-2xl">
                <div className="px-5 py-4 border-b border-slate-700/50">
                  <div className="text-sm font-bold tracking-wide text-slate-100 uppercase">
                    Add Issue
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Add a new item to master data (will appear in dropdown).
                  </div>
                </div>

                <div className="px-5 py-4">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Issue
                  </label>
                  <input
                    autoFocus
                    className="w-full rounded-lg bg-slate-800/70 border border-slate-700/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60"
                    placeholder="e.g. Needle broken"
                    value={newIssueValue}
                    disabled={isSavingIssue}
                    onChange={e => setNewIssueValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitAddIssue();
                      if (e.key === 'Escape') {
                        if (isSavingIssue) return;
                        setIsAddIssueOpen(false);
                      }
                    }}
                  />

                  {saveIssueError ? (
                    <div className="mt-3 text-xs text-rose-400">
                      {saveIssueError}
                    </div>
                  ) : null}
                </div>

                <div className="px-5 py-4 border-t border-slate-700/50 flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSavingIssue}
                    onClick={() => setIsAddIssueOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSavingIssue}
                    onClick={() => {
                      submitAddIssue();
                    }}
                  >
                    {isSavingIssue ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LineBalance;
