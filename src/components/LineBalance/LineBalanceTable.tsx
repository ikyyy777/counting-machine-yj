import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { LineBalanceRow } from './types';
import { EmployeePerformanceResponse, LineResponse } from '../../types/api';

interface LineBalanceTableProps {
  rows: LineBalanceRow[];
  correctiveActionOptions: string[];
  issueOptions: string[];
  onUpdateRow: (rowIndex: number, patch: Partial<LineBalanceRow>) => void;
  onDeleteRow: (rowIndex: number) => void;
  onPersistRow: (rowIndex: number) => void;
  onAddCorrectiveAction: () => void;
  onAddIssue: () => void;
  onAddCustomRow: () => void;
  moduleOptionsByRow: Record<number, string[]>;
  employeeOptionsByRowModule: Record<string, EmployeePerformanceResponse[]>;
  lineOptions: LineResponse[];
  onCustomLineChange: (rowIndex: number, lineId: string) => void;
}

const LineBalanceTable: React.FC<LineBalanceTableProps> = ({
  rows,
  correctiveActionOptions,
  issueOptions,
  onUpdateRow,
  onDeleteRow,
  onPersistRow,
  onAddCorrectiveAction,
  onAddIssue,
  onAddCustomRow,
  moduleOptionsByRow,
  employeeOptionsByRowModule,
  lineOptions,
  onCustomLineChange,
}) => {
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollbarContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollbarContentRef = React.useRef<HTMLDivElement>(null);

  // Sync scroll between main table and bottom scrollbar
  const handleTableScroll = () => {
    if (tableContainerRef.current && scrollbarContainerRef.current) {
      scrollbarContainerRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  const handleScrollbarScroll = () => {
    if (tableContainerRef.current && scrollbarContainerRef.current) {
      tableContainerRef.current.scrollLeft = scrollbarContainerRef.current.scrollLeft;
    }
  };

  // Update scrollbar content width to match table width
  React.useEffect(() => {
    const updateScrollbarWidth = () => {
      if (tableContainerRef.current && scrollbarContentRef.current) {
        scrollbarContentRef.current.style.width = `${tableContainerRef.current.scrollWidth}px`;
      }
    };

    updateScrollbarWidth();
    window.addEventListener('resize', updateScrollbarWidth);
    return () => window.removeEventListener('resize', updateScrollbarWidth);
  }, [rows]);

  // Show/hide sticky scrollbar based on whether table is in view
  React.useEffect(() => {
    const handleScroll = () => {
      if (tableContainerRef.current && scrollbarContainerRef.current) {
        const tableRect = tableContainerRef.current.getBoundingClientRect();
        const isTableInView = tableRect.bottom > 0 && tableRect.top < window.innerHeight;
        const needsHorizontalScroll = tableContainerRef.current.scrollWidth > tableContainerRef.current.clientWidth;

        if (isTableInView && needsHorizontalScroll && tableRect.bottom > window.innerHeight) {
          scrollbarContainerRef.current.style.display = 'block';
        } else {
          scrollbarContainerRef.current.style.display = 'none';
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [rows]);
  const lineStyleMeta = React.useMemo(() => {
    const counts = new Map<string, number>();
    const firstIndex = new Map<string, number>();

    rows.forEach((r, idx) => {
      const key = r.isCustom ? `custom||${idx}` : `${r.line}||${r.style}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!firstIndex.has(key)) firstIndex.set(key, idx);
    });

    return { counts, firstIndex };
  }, [rows]);

  const moduleMeta = React.useMemo(() => {
    const counts = new Map<string, number>();
    const firstIndex = new Map<string, number>();

    rows.forEach((r, idx) => {
      const key = r.isCustom ? `custom||${idx}` : `${r.line}||${r.style}||${r.module}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!firstIndex.has(key)) firstIndex.set(key, idx);
    });

    return { counts, firstIndex };
  }, [rows]);

  return (
    <>
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl overflow-hidden shadow-xl">
        <div
          ref={tableContainerRef}
          className="overflow-x-auto"
          onScroll={handleTableScroll}
        >
          <table className="w-max min-w-[2200px] text-left border-collapse table-auto">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900/95 backdrop-blur-sm text-[10px] uppercase tracking-widest font-bold text-slate-300">
                <th className="px-4 py-3 border-b border-slate-700/50" colSpan={7}>General</th>
                <th className="px-4 py-3 border-b border-orange-500/30 bg-orange-500/5 text-orange-400 text-center" colSpan={3}>
                  Before
                </th>
                <th className="px-4 py-3 border-b border-blue-500/30 bg-blue-500/5 text-blue-400 text-center" colSpan={2}>
                  After
                </th>
                <th className="px-4 py-3 border-b border-slate-700/50" colSpan={3}>Post-Process</th>
              </tr>
              <tr className="bg-slate-900/95 backdrop-blur-sm text-xs font-semibold uppercase tracking-wider border-b border-slate-700 text-slate-200">
                <th className="px-3 py-4 min-w-[110px]">Line</th>
                <th className="px-3 py-4 min-w-[150px]">Style</th>
                <th className="px-3 py-4 w-[170px] max-w-[170px]">Module</th>
                <th className="px-3 py-4 w-[260px] max-w-[260px]">NIK</th>
                <th className="px-3 py-4 w-[150px]">Operator</th>
                <th className="px-3 py-4 text-center min-w-[420px]">Process</th>
                <th className="px-3 py-4 text-center w-[90px]">Output/Avg</th>
                <th className="px-3 py-4 text-center bg-orange-500/5 w-[90px]">Output/H</th>
                <th className="px-3 py-4 text-center bg-orange-500/5 w-[90px]">Balance</th>
                <th className="px-3 py-4 w-[100px] text-center bg-orange-500/5">Time Check</th>
                <th className="px-3 py-4 text-center bg-blue-500/5 w-[90px]">Output/H</th>
                <th className="px-3 py-4 text-center bg-blue-500/5 w-[90px]">Balance</th>
                <th className="px-3 py-4 w-[140px]">PIC</th>
                <th className="px-3 py-4 min-w-[320px]">Issue</th>
                <th className="px-3 py-4 min-w-[420px]">Corrective Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {rows.flatMap((r, idx) => {
                const lineStyleKey = r.isCustom ? `custom||${idx}` : `${r.line}||${r.style}`;
                const moduleKey = r.isCustom ? `custom||${idx}` : `${r.line}||${r.style}||${r.module}`;

                const showLineStyleCell = lineStyleMeta.firstIndex.get(lineStyleKey) === idx;
                const lineStyleRowSpan = lineStyleMeta.counts.get(lineStyleKey) ?? 1;

                const showModuleCell = moduleMeta.firstIndex.get(moduleKey) === idx;
                const moduleRowSpan = moduleMeta.counts.get(moduleKey) ?? 1;

                const afterBalance = Number(r.afterBalance);
                const afterBalClass = Number.isFinite(afterBalance)
                  ? afterBalance < 0
                    ? 'text-rose-400'
                    : afterBalance > 0
                      ? 'text-emerald-400'
                      : 'text-slate-100'
                  : 'text-slate-100';

                const inputBaseClass =
                  'w-full rounded-md px-2 py-1 text-xs font-mono text-slate-100 placeholder:text-slate-500 ' +
                  'bg-slate-800/70 border border-slate-700/70 shadow-inner ' +
                  'hover:bg-slate-800 hover:border-slate-600 ' +
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60';

                // Standard Row Rendering
                if (!r.isCustom) {
                  const beforeBalance = Number(r.beforeBalance);
                  const isHighBottleneck = Number.isFinite(beforeBalance) ? beforeBalance <= -15 : false;
                  const isWarning = !isHighBottleneck && (Number.isFinite(beforeBalance) ? beforeBalance < 0 : false);
                  const isWithinLimits = !isHighBottleneck && !isWarning;

                  const rowClass = isHighBottleneck
                    ? 'bg-rose-500/[0.03]'
                    : isWarning
                      ? 'bg-orange-500/[0.03]'
                      : isWithinLimits
                        ? 'bg-emerald-500/[0.03]'
                        : '';

                  const beforeBalClass = Number.isFinite(beforeBalance)
                    ? beforeBalance < 0
                      ? 'text-rose-500 font-bold'
                      : beforeBalance > 0
                        ? 'text-emerald-400'
                        : 'text-slate-100'
                    : 'text-slate-100';

                  return (
                    <tr key={`std-${idx}`} className={`hover:bg-slate-700/20 transition-colors ${rowClass}`}>
                      {showLineStyleCell && (
                        <td rowSpan={lineStyleRowSpan} className="px-3 py-2 font-mono text-xs whitespace-nowrap align-middle border-r border-slate-700/30">
                          {r.line}
                        </td>
                      )}
                      {showLineStyleCell && (
                        <td rowSpan={lineStyleRowSpan} className="px-3 py-2 font-semibold text-xs whitespace-nowrap align-middle border-r border-slate-700/30">
                          <div className="h-7 flex items-center">
                            <span className="truncate">{r.style}</span>
                          </div>
                        </td>
                      )}
                      {showModuleCell && (
                        <td rowSpan={moduleRowSpan} className="px-3 py-2 text-xs whitespace-normal align-middle w-[170px] max-w-[170px] border-r border-slate-700/30">
                          {r.module}
                        </td>
                      )}
                      <td className="px-3 py-2 font-mono text-[10px] opacity-70 whitespace-normal align-middle w-[260px] max-w-[260px] overflow-hidden">
                        {r.nik}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium uppercase whitespace-normal align-middle">
                        {r.name}
                      </td>
                      <td className="px-3 py-2 text-[9px] leading-tight align-middle">
                        <div className="flex flex-col gap-1">
                          <div className="bg-slate-800 px-2 py-1 rounded whitespace-pre-wrap break-words">{r.process}</div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-xs whitespace-normal align-middle">
                        {r.outputAvg}
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-sm bg-orange-500/[0.02] whitespace-normal align-middle">
                        {r.beforeOutputH}
                      </td>
                      <td className={`px-3 py-2 text-center font-mono text-sm bg-orange-500/[0.02] whitespace-normal align-middle ${beforeBalClass}`}>
                        {r.beforeBalance}
                      </td>
                      <td className="px-3 py-3 text-center bg-orange-500/[0.02] whitespace-nowrap align-middle">
                        <input
                          className={inputBaseClass + ' text-center'}
                          inputMode="numeric"
                          value={String(r.timeCheck ?? '')}
                          onChange={e => onUpdateRow(idx, { timeCheck: e.target.value })}
                          onBlur={() => onPersistRow(idx)}
                        />
                      </td>
                      <td className="px-3 py-3 text-center bg-blue-500/[0.02] whitespace-nowrap align-middle">
                        <input
                          className={inputBaseClass + ' text-center'}
                          inputMode="numeric"
                          value={String(r.afterOutputH ?? '')}
                          onChange={e => onUpdateRow(idx, { afterOutputH: e.target.value })}
                          onBlur={() => onPersistRow(idx)}
                        />
                      </td>
                      <td className={`px-3 py-3 text-center font-mono text-sm bg-blue-500/[0.02] whitespace-nowrap align-middle ${afterBalClass}`}>
                        {r.afterBalance}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <input
                          className={inputBaseClass + ' font-sans text-xs'}
                          value={String(r.pic ?? '')}
                          placeholder="-"
                          onChange={e => onUpdateRow(idx, { pic: e.target.value })}
                          onBlur={() => onPersistRow(idx)}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <select
                            className={inputBaseClass + ' font-sans text-xs cursor-pointer'}
                            value={String(r.issue ?? '')}
                            onChange={e => onUpdateRow(idx, { issue: e.target.value })}
                            onBlur={() => onPersistRow(idx)}
                          >
                            <option value="">-</option>
                            {issueOptions.map(option => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="shrink-0 w-8 h-8 rounded-md bg-slate-800/70 border border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center"
                            onClick={onAddIssue}
                            title="Add Issue"
                          >
                            <Plus className="w-4 h-4 text-slate-200" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <div className="flex items-center gap-2">
                          <select
                            className={inputBaseClass + ' italic opacity-90 font-sans text-xs cursor-pointer'}
                            value={String(r.correctiveAction ?? '')}
                            onChange={e => onUpdateRow(idx, { correctiveAction: e.target.value })}
                            onBlur={() => onPersistRow(idx)}
                          >
                            <option value="">-</option>
                            {correctiveActionOptions.map(option => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="shrink-0 w-8 h-8 rounded-md bg-slate-800/70 border border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center"
                            onClick={onAddCorrectiveAction}
                            title="Add Corrective Action"
                          >
                            <Plus className="w-4 h-4 text-slate-200" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Custom Row Rendering
                const customModules = r.customModules ?? [];
                // Calculate total rows for this Custom Row Group
                const totalSubRows = customModules.reduce((acc, m) => acc + (m.niks?.length ?? 1) + 1, 0);

                const renderRows: React.ReactNode[] = [];
                let rowCursor = 0;

                customModules.forEach((cm, modIdx) => {
                  // Ensure niks are objects
                  const niks = (cm.niks ?? [{ nik: '' }]).map(n => typeof n === 'string' ? { nik: n } : n);
                  const moduleRowsCount = niks.length + 1; // NIKs + Add Button

                  const selectedModules = new Set(
                    customModules
                      .map(m => String(m.module ?? '').trim())
                      .filter(Boolean)
                      .filter((_, i) => i !== modIdx)
                  );
                  const filteredOptions = (moduleOptionsByRow[idx] ?? []).filter(opt => !selectedModules.has(opt) || opt === cm.module);

                  // Rows for each NIK in this module
                  niks.forEach((nikObj, nikIdx) => {
                    const nikValue = nikObj.nik;
                    const isFirstOfGroup = rowCursor === 0;
                    const isFirstOfModule = nikIdx === 0;

                    const emp = (employeeOptionsByRowModule[`${idx}||${cm.module}`] ?? []).find(e => String(e.NIK) === nikValue);
                    const outputAvg = Number(emp?.AVERAGE_PER_PART ?? 0);
                    const beforeOutputH = Number(emp?.ASM_OUT ?? 0);
                    const beforeBalance = beforeOutputH - outputAvg;

                    // Row colors based on individual operator balance
                    const isHighBottleneck = beforeBalance <= -15;
                    const isWarning = !isHighBottleneck && beforeBalance < 0;
                    const rowClass = isHighBottleneck
                      ? 'bg-rose-500/[0.03]'
                      : isWarning
                        ? 'bg-orange-500/[0.03]'
                        : 'bg-slate-800/[0.01]';

                    const beforeBalClass = beforeBalance < 0
                      ? 'text-rose-500 font-bold'
                      : beforeBalance > 0
                        ? 'text-emerald-400'
                        : 'text-slate-100';

                    const afterBalanceValue = Number(nikObj.afterBalance);
                    const afterBalClass = Number.isFinite(afterBalanceValue)
                      ? afterBalanceValue < 0
                        ? 'text-rose-400'
                        : afterBalanceValue > 0
                          ? 'text-emerald-400'
                          : 'text-slate-100'
                      : 'text-slate-100';

                    renderRows.push(
                      <tr key={`cust-${idx}-${modIdx}-${nikIdx}`} className={`hover:bg-slate-700/20 transition-colors ${rowClass}`}>
                        {/* Line & Style (Group Scoped - Spans ALL modules/operators in this custom row) */}
                        {isFirstOfGroup && (
                          <td rowSpan={totalSubRows} className="px-3 py-2 font-mono text-xs whitespace-nowrap align-top border-r border-slate-700/30">
                            <div className="flex flex-col gap-2 items-start h-full">
                              <div className="h-7 flex items-center">
                                <select
                                  className={inputBaseClass + ' h-7 font-sans text-xs cursor-pointer text-left min-w-[110px]'}
                                  value={String(r.lineId ?? '')}
                                  onChange={e => onCustomLineChange(idx, e.target.value)}
                                >
                                  <option value="">Line</option>
                                  {lineOptions.map(line => (
                                    <option key={String(line.NOLINE)} value={String(line.NOLINE)}>
                                      {line.LINE}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDeleteRow(idx)}
                                className="text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                title="Remove Line"
                              >
                                <Trash2 className="w-3 h-3" /> Remove Line
                              </button>
                            </div>
                          </td>
                        )}
                        {isFirstOfGroup && (
                          <td rowSpan={totalSubRows} className="px-3 py-2 font-semibold text-xs whitespace-nowrap align-top border-r border-slate-700/30">
                            <div className="h-7 flex items-center">
                              <span className="truncate">{r.style}</span>
                            </div>
                          </td>
                        )}

                        {/* Module (Module Scoped) */}
                        {isFirstOfModule && (
                          <td rowSpan={moduleRowsCount} className="px-3 py-2 text-xs whitespace-normal align-top w-[170px] max-w-[170px] border-r border-slate-700/30">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1">
                                <select
                                  className={inputBaseClass + ' h-8 font-sans text-xs cursor-pointer w-full'}
                                  value={String(cm.module ?? '')}
                                  onChange={e => {
                                    const nextModule = e.target.value;
                                    const next = customModules.map((m, i) => {
                                      if (i !== modIdx) return m;
                                      return { module: nextModule, niks: [{ nik: '' }] };
                                    });
                                    onUpdateRow(idx, {
                                      customModules: next,
                                      module: nextModule,
                                      nik: '',
                                      ...{ name: '', process: '', outputAvg: 0, beforeOutputH: 0, beforeBalance: 0 }
                                    });
                                  }}
                                >
                                  <option value="">Select Module</option>
                                  {filteredOptions.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="shrink-0 w-8 h-8 rounded-md bg-slate-800/70 border border-slate-700/70 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 flex items-center justify-center text-slate-400 transition-colors"
                                  onClick={() => {
                                    const newModules = customModules.filter((_, i) => i !== modIdx);
                                    if (newModules.length === 0) {
                                      onDeleteRow(idx);
                                    } else {
                                      onUpdateRow(idx, { customModules: newModules });
                                    }
                                  }}
                                  title="Delete Module"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Add Module Button if last module */}
                              {modIdx === customModules.length - 1 && (
                                <button
                                  type="button"
                                  className="h-8 w-full inline-flex items-center justify-center rounded-md border border-slate-700/70 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-[10px] text-slate-400 gap-1"
                                  onClick={() => {
                                    const next = [...customModules, { module: '', niks: [{ nik: '' }] }];
                                    onUpdateRow(idx, { customModules: next });
                                  }}
                                  title="Add Module"
                                >
                                  <Plus className="w-3 h-3" /> Add Module
                                </button>
                              )}
                            </div>
                          </td>
                        )}

                        {/* NIK */}
                        <td className="px-3 py-2 font-mono text-[10px] opacity-70 whitespace-normal align-top w-[260px] max-w-[260px] overflow-hidden">
                          <div className="flex items-center gap-1">
                            <div className="relative w-full h-8">
                              {/* Visible Fake Input */}
                              <div className="pointer-events-none absolute inset-0 flex items-center px-2 rounded border border-slate-700/50 bg-slate-800 text-[10px] text-slate-200 peer-focus:border-blue-500/50 peer-focus:ring-1 peer-focus:ring-blue-500/50 transition-all">
                                {nikValue || <span className="text-slate-600">Select NIK</span>}
                              </div>
                              {/* Invisible Real Select */}
                              <select
                                className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                value={String(nikValue ?? '')}
                                onChange={e => {
                                  const nextNik = e.target.value;
                                  const next = customModules.map((m, i) => {
                                    if (i !== modIdx) return m;
                                    const nextNiks = (m.niks ?? []).map(n => typeof n === 'string' ? { nik: n } : n);
                                    nextNiks[nikIdx] = { ...nextNiks[nikIdx], nik: nextNik };
                                    return { ...m, niks: nextNiks };
                                  });
                                  // Also define root update if it's the first one, but primarily update customModules
                                  onUpdateRow(idx, {
                                    customModules: next,
                                    module: String(cm.module ?? ''),
                                    nik: nextNik, // Legacy trigger
                                  });
                                }}
                              >
                                <option value="">Select NIK</option>
                                {(employeeOptionsByRowModule[`${idx}||${cm.module}`] ?? []).map(emp => (
                                  <option key={emp.NIK} value={emp.NIK}>{emp.NIK} - {emp.E_NAME}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              className="shrink-0 w-8 h-8 rounded-md bg-slate-800/70 border border-slate-700/70 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 flex items-center justify-center text-slate-400 transition-colors"
                              onClick={() => {
                                // Remove operator logic
                                const next = customModules.map((m, i) => {
                                  if (i !== modIdx) return m;
                                  // Ensure we have array of objects
                                  const currentNiks = (m.niks ?? [{ nik: '' }]).map(n => typeof n === 'string' ? { nik: n } : n);
                                  // Filter out current index
                                  const newNiks = currentNiks.filter((_, i) => i !== nikIdx);
                                  // If this leaves niks empty? We should probably keep at least one empty or just let it become empty (which means it renders 'Add Operator' row only)
                                  // But wait, the loop is over `niks`. If `niks` becomes empty, will `Add Operator` row render?
                                  // Yes, `niks` loop will not run, but `Add Operator` row is pushed AFTER `niks` loop.
                                  // So if `niks` is empty, only Add button row appears. This is perfect.
                                  return { ...m, niks: newNiks };
                                });
                                onUpdateRow(idx, { customModules: next });
                              }}
                              title="Remove Operator"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-3 py-2 text-xs font-medium uppercase whitespace-normal align-top">
                          <div className="flex items-center min-h-[32px]">
                            {String(emp?.E_NAME ?? '')}
                          </div>
                        </td>

                        {/* Process */}
                        <td className="px-3 py-2 text-[9px] leading-tight align-top">
                          <div className="bg-slate-800 px-2 py-1 rounded w-full whitespace-pre-wrap break-words min-h-[32px]">
                            {String(emp?.PROCESS_NAME ?? '')}
                          </div>
                        </td>

                        {/* Stats */}
                        <td className="px-3 py-2 text-center font-mono text-xs whitespace-normal align-top">
                          <div className="min-h-[32px] flex items-center justify-center">
                            {Number(emp?.AVERAGE_PER_PART ?? 0)}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-mono text-sm bg-orange-500/[0.02] whitespace-normal align-top">
                          <div className="min-h-[32px] flex items-center justify-center">
                            {Number(emp?.ASM_OUT ?? 0)}
                          </div>
                        </td>
                        <td className={`px-3 py-2 text-center font-mono text-sm bg-orange-500/[0.02] whitespace-normal align-top ${beforeBalClass}`}>
                          <div className="min-h-[32px] flex items-center justify-center">
                            {beforeBalance}
                          </div>
                        </td>

                        {/* Right Side Inputs (Per Operator) */}
                        <td className="px-3 py-3 text-center bg-orange-500/[0.02] whitespace-nowrap align-top">
                          <input
                            className={inputBaseClass + ' text-center'}
                            inputMode="numeric"
                            value={String(nikObj.timeCheck ?? '')}
                            onChange={e => {
                              const nextVal = e.target.value;
                              const next = customModules.map((m, i) => {
                                if (i !== modIdx) return m;
                                const nextNiks = (m.niks ?? []).map(n => typeof n === 'string' ? { nik: n } : n);
                                nextNiks[nikIdx] = { ...nextNiks[nikIdx], timeCheck: nextVal };
                                return { ...m, niks: nextNiks };
                              });
                              onUpdateRow(idx, { customModules: next });
                            }}
                            onBlur={() => onPersistRow(idx)}
                          />
                        </td>
                        <td className="px-3 py-3 text-center bg-blue-500/[0.02] whitespace-nowrap align-top">
                          <input
                            className={inputBaseClass + ' text-center'}
                            inputMode="numeric"
                            value={String(nikObj.afterOutputH ?? '')}
                            onChange={e => {
                              const nextVal = e.target.value;
                              const afterOut = Number(nextVal);
                              let newBal = 0;
                              if (!Number.isNaN(afterOut) && nextVal !== '') {
                                newBal = afterOut - outputAvg;
                              }

                              const next = customModules.map((m, i) => {
                                if (i !== modIdx) return m;
                                const nextNiks = (m.niks ?? []).map(n => typeof n === 'string' ? { nik: n } : n);
                                nextNiks[nikIdx] = {
                                  ...nextNiks[nikIdx],
                                  afterOutputH: nextVal,
                                  afterBalance: String(newBal)
                                };
                                return { ...m, niks: nextNiks };
                              });
                              onUpdateRow(idx, { customModules: next });
                            }}
                            onBlur={() => onPersistRow(idx)}
                          />
                        </td>
                        <td className={`px-3 py-3 text-center font-mono text-sm bg-blue-500/[0.02] whitespace-nowrap align-top ${afterBalClass}`}>
                          <div className="min-h-[32px] flex items-center justify-center">
                            {nikObj.afterBalance ?? 0}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <input
                            className={inputBaseClass + ' font-sans text-xs'}
                            value={String(nikObj.pic ?? '')}
                            placeholder="-"
                            onChange={e => {
                              const nextVal = e.target.value;
                              const next = customModules.map((m, i) => {
                                if (i !== modIdx) return m;
                                const nextNiks = (m.niks ?? []).map(n => typeof n === 'string' ? { nik: n } : n);
                                nextNiks[nikIdx] = { ...nextNiks[nikIdx], pic: nextVal };
                                return { ...m, niks: nextNiks };
                              });
                              onUpdateRow(idx, { customModules: next });
                            }}
                            onBlur={() => onPersistRow(idx)}
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <select
                              className={inputBaseClass + ' font-sans text-xs cursor-pointer'}
                              value={String(nikObj.issue ?? '')}
                              onChange={e => {
                                const nextVal = e.target.value;
                                const next = customModules.map((m, i) => {
                                  if (i !== modIdx) return m;
                                  const nextNiks = (m.niks ?? []).map(n => typeof n === 'string' ? { nik: n } : n);
                                  nextNiks[nikIdx] = { ...nextNiks[nikIdx], issue: nextVal };
                                  return { ...m, niks: nextNiks };
                                });
                                onUpdateRow(idx, { customModules: next });
                              }}
                              onBlur={() => onPersistRow(idx)}
                            >
                              <option value="">-</option>
                              {issueOptions.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="shrink-0 w-8 h-8 rounded-md bg-slate-800/70 border border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center"
                              onClick={onAddIssue}
                              title="Add Issue"
                            >
                              <Plus className="w-4 h-4 text-slate-200" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <select
                              className={inputBaseClass + ' italic opacity-90 font-sans text-xs cursor-pointer'}
                              value={String(nikObj.correctiveAction ?? '')}
                              onChange={e => {
                                const nextVal = e.target.value;
                                const next = customModules.map((m, i) => {
                                  if (i !== modIdx) return m;
                                  const nextNiks = (m.niks ?? []).map(n => typeof n === 'string' ? { nik: n } : n);
                                  nextNiks[nikIdx] = { ...nextNiks[nikIdx], correctiveAction: nextVal };
                                  return { ...m, niks: nextNiks };
                                });
                                onUpdateRow(idx, { customModules: next });
                              }}
                              onBlur={() => onPersistRow(idx)}
                            >
                              <option value="">-</option>
                              {correctiveActionOptions.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="shrink-0 w-8 h-8 rounded-md bg-slate-800/70 border border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center"
                              onClick={onAddCorrectiveAction}
                              title="Add Corrective Action"
                            >
                              <Plus className="w-4 h-4 text-slate-200" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    rowCursor++;
                  });

                  // Add Operator Button Row for this module
                  renderRows.push(
                    <tr key={`cust-${idx}-${modIdx}-add`} className="hover:bg-slate-700/20 transition-colors">
                      {/* Line & Style (Handled by rowSpan above) */}
                      {/* Module (Handled by rowSpan above) */}

                      {/* NIK (Add Button) */}
                      <td className="px-3 py-2 font-mono text-[10px] opacity-70 whitespace-normal align-top border-none">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center h-8 w-full rounded-md border border-slate-700/70 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-[10px] font-medium text-slate-400 gap-1"
                          onClick={() => {
                            const next = customModules.map((m, i) => {
                              if (i !== modIdx) return m;
                              const currentNiks = (m.niks ?? [{ nik: '' }]).map(n => typeof n === 'string' ? { nik: n } : n);
                              return { ...m, niks: [...currentNiks, { nik: '' }] };
                            });
                            onUpdateRow(idx, { customModules: next });
                          }}
                          disabled={!cm.module}
                          title="Add Operator"
                        >
                          <Plus className="w-3 h-3" /> Add Operator
                        </button>
                      </td>

                      {/* Spacer helper cells for rest of columns to maintain grid structure if needed, 
                          but since rowSpan handles the left/right groups, we just need empty cells for the middle ones? 
                          Wait, this TR only contains cells for NIK, Name, Process, Stats.
                          Line/Style/Module/RightSide are spanned over this row.
                          So I need to provide empty cells for: Name, Process, Stats (5 cols)
                      */}
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  );
                  rowCursor++;
                });

                return renderRows;
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-900/50 flex justify-between items-center border-t border-slate-700/50 text-xs">
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700/70 hover:bg-slate-800 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-xs font-semibold text-slate-200"
            onClick={onAddCustomRow}
          >
            <Plus className="w-4 h-4" />
            Add Line
          </button>

          <div className="text-slate-400">
            Showing <span className="text-white font-medium">1-{rows.length}</span> of{' '}
            <span className="text-white font-medium">{rows.length}</span> operators
          </div>
          <div className="flex gap-2">
            <button type="button" className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
              Previous
            </button>
            <button type="button" className="px-3 py-1.5 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
              Next
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-700/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-8">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>High Bottleneck (&gt;15% Variance)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Warning Stage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Within Limits</span>
            </div>
          </div>
          <div>System Last Sync: Today</div>
        </div>
      </div>

      {/* Sticky bottom scrollbar */}
      <div
        ref={scrollbarContainerRef}
        className="fixed bottom-0 left-0 right-0 z-20 overflow-x-auto overflow-y-hidden bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 shadow-lg"
        style={{ height: '20px', display: 'none' }}
        onScroll={handleScrollbarScroll}
      >
        <div ref={scrollbarContentRef} style={{ height: '1px' }} />
      </div>
    </>
  );
};

export default LineBalanceTable;

