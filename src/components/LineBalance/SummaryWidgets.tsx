import React from 'react';
import { AlertTriangle, CheckCircle2, FileMinus } from 'lucide-react';

interface SummaryWidgetsProps {
  bottleneckTTL: number;
  actionCompleted: number;
  noActionTaken: number;
}

const SummaryWidgets: React.FC<SummaryWidgetsProps> = ({
  bottleneckTTL,
  actionCompleted,
  noActionTaken,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
      <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-3 shadow-lg border-l-4 border-rose-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-rose-400/80">Bottleneck TTL</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-1 font-mono text-white">{String(bottleneckTTL).padStart(2, '0')}</h2>
          </div>
          <div className="bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-rose-400/80">
          <span className="inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2" />
          </span>
          <span>Requires attention</span>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-3 shadow-lg border-l-4 border-emerald-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Action Completed</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-1 font-mono text-white">{String(actionCompleted).padStart(2, '0')}</h2>
          </div>
          <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-400/80">
          <span className="inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
          </span>
          <span>Resolution tracking</span>
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-3 shadow-lg border-l-4 border-amber-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-amber-400/80">No Action Taken</p>
            <h2 className="text-3xl sm:text-4xl font-bold mt-1 font-mono text-white">{String(noActionTaken).padStart(2, '0')}</h2>
          </div>
          <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
            <FileMinus className="w-4 h-4 text-amber-400" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-400/80">
          <span className="inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
          </span>
          <span>Pending follow-up</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryWidgets;
