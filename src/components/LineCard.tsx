import React, { useState, useEffect } from "react";
import { Sparkles, Tag, ChevronRight, Hash } from "lucide-react";
import { IntegratedLineMonitoringResponse } from "../types/api";
import { saveEmployeeOverride } from "../services/integratedLineMonitoring";
import { toast } from "react-toastify";
import { getAuthToken } from "../services/api";

interface LineCardProps {
  item: IntegratedLineMonitoringResponse;
  moduleInputs: { name: string; quantity: number }[];
  onShowDetails?: () => void;
  loadingPivot?: boolean;
  workDate: string;
  factory: string;
  onRefresh: () => void;
  index?: number;
}

const renderCompareBadge = (diff?: number, pct?: number | null) => {
  if (diff === undefined || diff === null || diff === 0) return null;
  const isPositive = diff > 0;
  const badgeClass = isPositive
    ? "text-emerald-400"
    : "text-rose-400";
  const arrow = isPositive ? "↑" : "↓";
  const diffStr = isPositive ? `+${diff.toLocaleString()}` : diff.toLocaleString();
  const pctStr =
    pct !== null && pct !== undefined
      ? ` (${isPositive && pct >= 0 ? "+" : ""}${pct.toFixed(0)}%)`
      : "";
  return (
    <span
      className={`text-[11px] font-extrabold ${badgeClass} inline-flex items-center gap-0.5`}
      title="Compared to Yesterday"
    >
      <span>{arrow}</span>
      <span>
        {diffStr}
        {pctStr}
      </span>
    </span>
  );
};

const LineCard: React.FC<LineCardProps> = ({
  item,
  moduleInputs,
  onShowDetails,
  loadingPivot,
  workDate,
  factory,
  onRefresh,
  index,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayEmployee, setDisplayEmployee] = useState(item.ACTUAL_EMPLOYEE ?? item.TOTAL_EMPLOYEE);
  const [tempEmployee, setTempEmployee] = useState(item.ACTUAL_EMPLOYEE ?? item.TOTAL_EMPLOYEE);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [displayTarget, setDisplayTarget] = useState(item.TARGET_PROD ?? 0);
  const [tempTarget, setTempTarget] = useState(item.TARGET_PROD ?? 0);
  const [loading, setLoading] = useState(false);
  const [cbOperatorsCount, setCbOperatorsCount] = useState<number | null>(null);

  // CBC_WEB_GET_EMPLOYEE_STATS disabled as requested
  // cbOperatorsCount defaults to null, which falls back to item.LAYOUT_EMPLOYEE ?? item.TOTAL_EMPLOYEE


  const [isEditingAbsent, setIsEditingAbsent] = useState(false);
  const [displayAbsent, setDisplayAbsent] = useState(item.ABSENT ?? 0);
  const [tempAbsent, setTempAbsent] = useState(item.ABSENT ?? 0);

  useEffect(() => {
    setDisplayEmployee(item.ACTUAL_EMPLOYEE ?? item.TOTAL_EMPLOYEE);
    setTempEmployee(item.ACTUAL_EMPLOYEE ?? item.TOTAL_EMPLOYEE);
    setDisplayTarget(item.TARGET_PROD ?? 0);
    setTempTarget(item.TARGET_PROD ?? 0);
    setDisplayAbsent(item.ABSENT ?? 0);
    setTempAbsent(item.ABSENT ?? 0);
  }, [item.ACTUAL_EMPLOYEE, item.TOTAL_EMPLOYEE, item.TARGET_PROD, item.ABSENT]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempEmployee < 0) {
      toast.error("Employee count cannot be negative");
      return;
    }
    if (tempEmployee < displayAbsent) {
      toast.error("Total Operator cannot be less than Absent count");
      return;
    }
    
    // Get logged-in user from auth token
    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error("Failed to parse auth token", err);
    }

    // Optimistic Update: Immediately update display and close input
    const originalValue = displayEmployee;
    setDisplayEmployee(tempEmployee);
    setIsEditing(false);
    setLoading(true);

    try {
      const success = await saveEmployeeOverride({
        workDate,
        lineCode: item.LINE_CODE,
        styleNo: item.STYLE_NO,
        actualEmployee: tempEmployee,
        attending: tempEmployee - displayAbsent,
        absent: displayAbsent,
        updatedBy: updaterUser,
      });
      if (success) {
        toast.success(`Successfully updated employee count for ${item.LINE_NAME}`, {
          theme: "dark",
        });
        onRefresh();
      } else {
        toast.error("Failed to save employee override");
        setDisplayEmployee(originalValue);
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
      setDisplayEmployee(originalValue);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAbsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempAbsent < 0) {
      toast.error("Absent count cannot be negative");
      return;
    }
    if (tempAbsent > displayEmployee) {
      toast.error("Absent count cannot exceed Total Operator");
      return;
    }

    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error(err);
    }

    const originalValue = displayAbsent;
    setDisplayAbsent(tempAbsent);
    setIsEditingAbsent(false);
    setLoading(true);

    try {
      const success = await saveEmployeeOverride({
        workDate,
        lineCode: item.LINE_CODE,
        styleNo: item.STYLE_NO,
        actualEmployee: displayEmployee,
        attending: displayEmployee - tempAbsent,
        absent: tempAbsent,
        updatedBy: updaterUser,
      });
      if (success) {
        toast.success(`Successfully updated absent count for ${item.LINE_NAME}`, {
          theme: "dark",
        });
        onRefresh();
      } else {
        toast.error("Failed to save absent override");
        setDisplayAbsent(originalValue);
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
      setDisplayAbsent(originalValue);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempTarget < 0) {
      toast.error("Target Prod cannot be negative");
      return;
    }

    // Get logged-in user from auth token
    let updaterUser = "PRODUCTION_USER";
    try {
      const auth = getAuthToken();
      if (auth?.userData?.username) {
        updaterUser = auth.userData.username;
      }
    } catch (err) {
      console.error("Failed to parse auth token", err);
    }

    // Optimistic Update: Immediately update display and close input
    const originalValue = displayTarget;
    setDisplayTarget(tempTarget);
    setIsEditingTarget(false);
    setLoading(true);

    try {
      const success = await saveEmployeeOverride({
        workDate,
        lineCode: item.LINE_CODE,
        styleNo: item.STYLE_NO,
        actualEmployee: displayEmployee,
        targetProd: tempTarget,
        updatedBy: updaterUser,
      });
      if (success) {
        toast.success(`Successfully updated target prod for ${item.LINE_NAME}`, {
          theme: "dark",
        });
        onRefresh();
      } else {
        toast.error("Failed to save target override");
        setDisplayTarget(originalValue);
      }
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
      setDisplayTarget(originalValue);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group bg-gradient-to-br from-[#111827]/70 to-[#0b0f19]/80 backdrop-blur-2xl border border-slate-800/80 rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:border-slate-700/60 hover:shadow-lg flex flex-col lg:flex-row items-stretch">
      {/* 1. Line Identification */}
      <div className="w-full lg:w-[200px] p-3 border-b lg:border-b-0 lg:border-r border-slate-800/60 flex flex-col justify-center relative bg-slate-900/20">
        <div className="flex items-center justify-between lg:justify-start gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block leading-none mb-0.5">Line</span>
              <span className="text-lg font-black text-white leading-none">{item.LINE_NAME}</span>
            </div>
          </div>
          {/* Mobile Details button */}
          {onShowDetails && (
            <button 
              className="lg:hidden flex items-center justify-center gap-0.5 px-2.5 py-1 bg-blue-500/10 hover:bg-blue-600 border border-blue-500/20 text-blue-400 hover:text-white rounded-lg text-[11px] font-black tracking-wider transition-all shadow-sm active:scale-95"
              onClick={onShowDetails}
              title="View Line Details"
            >
              <span>Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-auto">
          {/* Total Operator */}
          <div 
            onClick={() => {
              if (!isEditing) {
                setTempEmployee(displayEmployee);
                setIsEditing(true);
              }
            }}
            className={`flex-1 px-1.5 py-1 bg-[#0f172a]/40 border rounded flex flex-col items-center justify-center text-xs cursor-pointer transition-all ${isEditing ? 'border-solid border-blue-500/50 bg-blue-500/[0.04]' : 'border-dashed border-blue-500/35 hover:border-blue-500/60 hover:bg-[#0f172a]/60'}`}
            title="Click to edit Total Operator"
          >
            <span className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Total Op</span>
            {isEditing ? (
              <form onSubmit={handleSave} className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number" min="0" disabled={loading}
                  className="w-8 bg-slate-950 text-white font-bold text-center rounded border border-slate-700 px-0.5 py-0.5 text-[10px] focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={tempEmployee}
                  onChange={(e) => setTempEmployee(Number(e.target.value))}
                  onBlur={() => setIsEditing(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsEditing(false);
                  }}
                  autoFocus
                />
              </form>
            ) : (
              <span className="font-bold text-blue-400 text-sm hover:text-blue-300 transition-colors">{displayEmployee}</span>
            )}
          </div>
          {/* Attending (Auto-calculated: Total Op - Absent) */}
          <div className="flex-1 px-1.5 py-1 bg-[#0f172a]/40 border border-slate-800/80 rounded flex flex-col items-center justify-center text-xs">
            <span className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Attend</span>
            <span className="font-bold text-emerald-400 text-sm">{Math.max(0, displayEmployee - displayAbsent)}</span>
          </div>
          {/* Absent (Manual input) */}
          <div 
            onClick={() => {
              if (!isEditingAbsent) {
                setTempAbsent(displayAbsent);
                setIsEditingAbsent(true);
              }
            }}
            className={`flex-1 px-1.5 py-1 bg-[#0f172a]/40 border rounded flex flex-col items-center justify-center text-xs cursor-pointer transition-all ${isEditingAbsent ? 'border-solid border-rose-500/50 bg-rose-500/[0.04]' : 'border-dashed border-rose-500/35 hover:border-rose-500/60 hover:bg-[#0f172a]/60'}`}
            title="Click to edit Absent count"
          >
            <span className="text-[8px] text-slate-500 uppercase font-bold mb-0.5">Absent</span>
            {isEditingAbsent ? (
              <form onSubmit={handleSaveAbsent} className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number" min="0" disabled={loading}
                  className="w-8 bg-slate-950 text-white font-bold text-center rounded border border-slate-700 px-0.5 py-0.5 text-[10px] focus:outline-none focus:border-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={tempAbsent}
                  onChange={(e) => setTempAbsent(Number(e.target.value))}
                  onBlur={() => setIsEditingAbsent(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsEditingAbsent(false);
                  }}
                  autoFocus
                />
              </form>
            ) : (
              <span className="font-bold text-rose-450 text-sm hover:text-rose-300 transition-colors">{displayAbsent}</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Style & Operator Info */}
      <div className="w-full lg:w-[260px] p-3 border-b lg:border-b-0 lg:border-r border-slate-800/60 flex flex-col justify-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/5 border border-indigo-500/20 rounded-md w-fit">
          <Tag className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-xs font-bold text-indigo-300 truncate" title={item.STYLE_NO}>
            {item.STYLE_NO || "-"}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-1.5">
          {/* Layout MP */}
          <div className="px-2 py-1 bg-[#0f172a]/20 border border-slate-800/50 rounded flex items-center justify-between text-[10px]">
            <span className="text-slate-500">C/B Qty</span>
            <span className="font-bold text-slate-300">{cbOperatorsCount !== null ? cbOperatorsCount : (item.LAYOUT_EMPLOYEE ?? item.TOTAL_EMPLOYEE)}</span>
          </div>

          {/* Order Qty */}
          <div className="px-2 py-1 bg-[#0f172a]/20 border border-slate-800/50 rounded flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Order Qty</span>
            <span className="font-bold text-slate-300">{item.TOTAL_ORD_QTY?.toLocaleString() || 0}</span>
          </div>
          {/* Target Prod */}
          <div 
            onClick={() => {
              if (!isEditingTarget) {
                setTempTarget(displayTarget);
                setIsEditingTarget(true);
              }
            }}
            className={`col-span-2 px-2.5 py-1.5 bg-[#0f172a]/60 border rounded flex items-center justify-between cursor-pointer transition-all ${isEditingTarget ? 'border-solid border-amber-500/60 bg-amber-500/[0.06]' : 'border-dashed border-amber-500/35 hover:border-amber-500/60 hover:bg-[#0f172a]/80'}`}
          >
            <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Target Prod</span>
            {isEditingTarget ? (
              <form onSubmit={handleSaveTarget} className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <input
                  type="number" min="0" disabled={loading}
                  className="w-16 bg-slate-950 text-amber-400 font-extrabold text-center rounded border border-amber-500/50 px-1 py-0.5 text-xs focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={tempTarget}
                  onChange={(e) => setTempTarget(Number(e.target.value))}
                  onBlur={() => setIsEditingTarget(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setIsEditingTarget(false);
                  }}
                  autoFocus
                />
              </form>
            ) : (
              <span className="text-sm font-black text-amber-400 hover:text-amber-300 transition-colors">{displayTarget || 0}</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Production Data */}
      <div className="w-full lg:flex-1 lg:min-w-[200px] p-3 border-b lg:border-b-0 lg:border-r border-slate-800/60 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-3 h-full">
          <div className="flex flex-col justify-center">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Today Production (QC)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 leading-none">{item.TODAY_QC_COUNTING?.toLocaleString() || 0}</span>
              {renderCompareBadge(item.TODAY_QC_DIFF, item.TODAY_QC_PCT)}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1">Avg / Hour</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-amber-400 leading-none">{item.TOTAL_QC_AVG_PER_HOUR?.toLocaleString() || 0}</span>
              {renderCompareBadge(item.AVG_HOUR_DIFF, item.AVG_HOUR_PCT)}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Module Cumulative Input */}
      <div className="w-full lg:flex-1 lg:min-w-[250px] p-3 flex flex-col justify-center">
        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1.5">Module Input</span>
        <div className="text-slate-400 text-[11px] italic flex items-center gap-1.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 shrink-0"></span>
          <span>this data is temporarily disabled</span>
        </div>
      </div>

      {/* 5. Actions / Details (Desktop) */}
      {onShowDetails && (
        <div className="hidden lg:flex w-[85px] items-center justify-center border-l border-slate-800/60 bg-slate-900/10">
          <button 
            className="flex items-center justify-center gap-0.5 px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-600 border border-blue-500/20 text-blue-400 hover:text-white rounded-lg text-[11px] font-black tracking-wider transition-all shadow-sm active:scale-95"
            onClick={onShowDetails}
            title="View Line Details"
          >
            <span>Details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default LineCard;
