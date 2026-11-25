import React, { useState } from "react";
import { Check, X, Plus } from "lucide-react";
import { StockOperatorRow, StockOperatorSummary } from "../../types/stockOperator";

interface StockOperatorTableProps {
  data: StockOperatorRow[];
  loading: boolean;
  summary: StockOperatorSummary;
  onSetOutput: (item: StockOperatorRow) => void;
  settingKey?: string | null;
  onSaveMissingOutput?: (nik: string, missingQty: number, predecessorNik?: string) => Promise<boolean>;
}

const getStatusStyle = (color?: string) => ({
  backgroundColor: color ? `${color}20` : "#64748b20",
  color: color || "#cbd5e1",
  border: `1px solid ${color || "#64748b"}55`,
});

const StockOperatorTable: React.FC<StockOperatorTableProps> = ({
  data,
  loading,
  summary,
  onSetOutput,
  settingKey,
  onSaveMissingOutput,
}) => {
  const [editingMissingNik, setEditingMissingNik] = useState<string | null>(null);
  const [tempMissingQty, setTempMissingQty] = useState<string>("");

  const handleSaveMissingOutput = async (row: StockOperatorRow) => {
    if (!onSaveMissingOutput) return;
    const qty = parseInt(tempMissingQty, 10);
    if (isNaN(qty)) return;
    
    const predNik = (row as any).MERGED_EMP_NIK || undefined;
    const success = await onSaveMissingOutput(row.NIK, qty, predNik);
    if (success) {
      setEditingMissingNik(null);
    }
  };

  return (
    <div className="style-card animate-fade-in-up bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden shadow-lg">
      <div className="style-card-header px-5 py-4 flex items-center gap-3 border-b border-slate-700/60 bg-slate-800/40">
        <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500"></div>
        <div>
          <h3 className="text-lg font-semibold text-white">Operator Stock Detail</h3>
          <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider">
            Output, stock, QC output, and status by operator
          </p>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-800/60">
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-left border-b border-slate-700/60 bg-[#151f32]">
                Operator Detail
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 bg-[#151f32]">
                Module
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 bg-[#151f32]">
                Split Module
              </th>
              <th colSpan={2} className="px-4 py-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider text-center border-b border-slate-700/60 border-l border-blue-500/15 bg-blue-500/[0.05]">
                Process Flow
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-emerald-400 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 border-l border-emerald-500/15 bg-emerald-500/[0.05]">
                Output All
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-cyan-400 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 border-l border-cyan-500/15 bg-cyan-500/[0.05]">
                Output Daily
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-purple-400 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 border-l border-purple-500/15 bg-purple-500/[0.05]">
                Stock
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 border-l border-amber-500/15 bg-amber-500/[0.05]">
                Stock Days
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-rose-400 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 border-l border-rose-500/15 bg-rose-500/[0.05]">
                Missing Output
              </th>
            </tr>
            <tr className="bg-slate-800/60">
              <th className="px-4 py-1.5 border-b border-slate-700/60 bg-[#151f32]"></th>
              <th className="px-4 py-1.5 border-b border-slate-700/60 bg-[#151f32]"></th>
              <th className="px-4 py-1.5 border-b border-slate-700/60 bg-[#151f32]"></th>
              <th className="px-4 py-1.5 text-[9px] font-bold text-blue-400/70 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 border-l border-blue-500/15 bg-blue-500/[0.02]">
                Flow No
              </th>
              <th className="px-4 py-1.5 text-[9px] font-bold text-blue-400/70 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 border-l border-blue-500/15 bg-blue-500/[0.02]">
                Process Name
              </th>
              <th className="px-4 py-1.5 border-b border-slate-700/60 border-l border-emerald-500/15 bg-emerald-500/[0.02]"></th>
              <th className="px-4 py-1.5 border-b border-slate-700/60 border-l border-cyan-500/15 bg-cyan-500/[0.02]"></th>
              <th className="px-4 py-1.5 border-b border-slate-700/60 border-l border-purple-500/15 bg-purple-500/[0.02]"></th>
              <th className="px-4 py-1.5 border-b border-slate-700/60 border-l border-amber-500/15 bg-amber-500/[0.02]"></th>
              <th className="px-4 py-1.5 border-b border-slate-700/60 border-l border-rose-500/15 bg-rose-500/[0.02]"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-slate-400">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              (() => {
                const flattened: { row: StockOperatorRow; flow: any }[] = [];
                data.forEach((item) => {
                  if (item.FLOWS && item.FLOWS.length > 0) {
                    item.FLOWS.forEach((flow) => {
                      flattened.push({ row: item, flow });
                    });
                  } else {
                    flattened.push({
                      row: item,
                      flow: { FLOW_NO: item.FLOW_NO, PROCESS_NAME: item.PROCESS_NAME, AUTO_SEQ: 999999 },
                    });
                  }
                });


                const rowsWithSpan = flattened.map((item, index) => {
                  let isFirst = false;
                  let rowSpan = 1;

                  if (
                    index === 0 ||
                    flattened[index - 1].row.NIK !== item.row.NIK ||
                    flattened[index - 1].row.MODULE !== item.row.MODULE
                  ) {
                    isFirst = true;
                    let count = 1;
                    for (let i = index + 1; i < flattened.length; i++) {
                      if (
                        flattened[i].row.NIK === item.row.NIK &&
                        flattened[i].row.MODULE === item.row.MODULE
                      ) {
                        count++;
                      } else {
                        break;
                      }
                    }
                    rowSpan = count;
                  } else {
                    rowSpan = 0;
                  }

                  return { ...item, isFirst, rowSpan };
                });

                let currentOperatorBg = "bg-transparent";

                return rowsWithSpan.map((item, index) => {
                  const { row, flow, isFirst, rowSpan } = item;
                  const rowKey = `${row.NIK}_${row.MODULE}`;

                  if (isFirst) {
                    currentOperatorBg = currentOperatorBg === "bg-transparent" ? "bg-slate-800/[0.15]" : "bg-transparent";
                  }

                  const borderClass = rowSpan === 0 && !isFirst && index < rowsWithSpan.length - 1 && !rowsWithSpan[index + 1].isFirst 
                    ? "" 
                    : "border-b border-slate-800/40";
                    
                  const operatorBorderClass = "border-b border-slate-800/40";

                  return (
                    <tr
                      key={`${rowKey}_${index}`}
                      className={`compact-row table-row-accent transition-colors ${currentOperatorBg}`}
                    >
                      {isFirst && (
                        <>
                          <td rowSpan={rowSpan} className={`px-4 py-2.5 text-left ${operatorBorderClass} align-top`}>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{row.E_NAME}</span>
                              <span className="text-[10px] text-slate-400">{row.NIK}</span>
                              {row.MERGED_EMP_NAME && (
                                <span
                                  className="text-[10px] text-amber-300 font-medium mt-1 inline-block bg-amber-500/10 border border-amber-400/30 rounded px-1.5 py-0.5 leading-tight max-w-[140px] truncate"
                                  title={`Output replace dari operator sebelumnya: ${row.MERGED_EMP_NAME} (${row.MERGED_EMP_NIK || ""})`}
                                >
                                  + Replace: {row.MERGED_EMP_NAME}
                                </span>
                              )}
                            </div>
                          </td>
                          <td rowSpan={rowSpan} className={`px-4 py-2.5 text-center ${operatorBorderClass} align-top`}>
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 mt-1">
                              {row.MODULE}
                            </span>
                          </td>
                          <td rowSpan={rowSpan} className={`px-4 py-2.5 text-center ${operatorBorderClass} align-top`}>
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mt-1">
                              {row.SPLIT_MODULE || "-"}
                            </span>
                          </td>
                        </>
                      )}

                      <td className={`px-4 py-2.5 text-center ${borderClass} border-l border-blue-500/10 bg-blue-500/[0.02]`}>
                        <span className="text-[11px] text-blue-300 font-mono font-medium">{flow.FLOW_NO || "-"}</span>
                      </td>
                      <td className={`px-4 py-2.5 text-left ${borderClass} border-l border-blue-500/10 bg-blue-500/[0.02] max-w-[200px] truncate`} title={flow.PROCESS_NAME}>
                        <span className="text-xs text-slate-300 truncate block">{flow.PROCESS_NAME || "-"}</span>
                      </td>

                      {isFirst && (
                        <>
                          <td rowSpan={rowSpan} className={`px-4 py-2.5 text-center font-semibold text-emerald-300 ${operatorBorderClass} border-l border-emerald-500/10 bg-emerald-500/[0.02] align-top`}>
                            <span className="mt-1.5 block">{row.ACTUAL}</span>
                          </td>
                          <td rowSpan={rowSpan} className={`px-4 py-2.5 text-center font-semibold text-cyan-300 ${operatorBorderClass} border-l border-cyan-500/10 bg-cyan-500/[0.02] align-top`}>
                            <span className="mt-1.5 block">{row.TODAY_OUTPUT ?? '-'}</span>
                          </td>
                          <td rowSpan={rowSpan} className={`px-4 py-2.5 text-center font-bold text-purple-300 ${operatorBorderClass} border-l border-purple-500/10 bg-purple-500/[0.02] align-top`}>
                            <span className="mt-1.5 block">{row.STOCK_OP}</span>
                          </td>
                          <td rowSpan={rowSpan} className={`px-4 py-2.5 text-center font-bold text-amber-300 ${operatorBorderClass} border-l border-amber-500/10 bg-amber-500/[0.02] align-top`}>
                            <span className="mt-1.5 block">{row.STOCK_DAYS ?? '-'}</span>
                          </td>
                          <td rowSpan={rowSpan} className={`px-4 py-2.5 text-center ${operatorBorderClass} border-l border-rose-500/10 bg-rose-500/[0.02] align-top`}>
                            <div className="mt-1.5">
                              {editingMissingNik === row.NIK ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <input
                                    type="number"
                                    value={tempMissingQty}
                                    onChange={(e) => setTempMissingQty(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveMissingOutput(row);
                                      if (e.key === "Escape") setEditingMissingNik(null);
                                    }}
                                    className="w-16 px-1 py-0.5 bg-slate-900 border border-blue-500 rounded text-center text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveMissingOutput(row)}
                                    className="p-0.5 hover:bg-emerald-500/20 text-emerald-400 rounded transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingMissingNik(null)}
                                    className="p-0.5 hover:bg-rose-500/20 text-rose-400 rounded transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <span
                                    onClick={() => {
                                      setEditingMissingNik(row.NIK);
                                      setTempMissingQty(String(row.MISSING_OUTPUT || ""));
                                    }}
                                    className="group flex items-center justify-center gap-1 text-slate-300 hover:text-blue-400 transition-colors duration-200 cursor-pointer font-bold"
                                    title="Click to add/edit missing output"
                                  >
                                    {row.MISSING_OUTPUT ? (
                                      <span className={row.MISSING_OUTPUT < 0 ? "text-rose-400 font-bold" : "text-blue-400"}>{row.MISSING_OUTPUT.toLocaleString()}</span>
                                    ) : (
                                      <>
                                        <Plus className="w-3 h-3 text-slate-500 opacity-60 group-hover:opacity-100 group-hover:text-blue-400 transition-all duration-200" />
                                        <span className="text-[10px] text-slate-500 group-hover:text-blue-400 opacity-60 group-hover:opacity-100">Add</span>
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                });
              })()
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl mb-2">📊</span>
                    <p>No operator data found.</p>
                    <p className="text-xs text-slate-500">Please select filters and click Lookup.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>
    </div>
  );
};

export default StockOperatorTable;