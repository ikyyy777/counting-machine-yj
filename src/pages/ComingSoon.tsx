import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Hammer, Sparkles } from "lucide-react";

const ComingSoon: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-slate-200 flex flex-col items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Dynamic background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 max-w-md w-full text-center bg-[#111827]/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
        {/* Animated Icon Container */}
        <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl animate-bounce">
          <Hammer className="w-10 h-10 text-blue-400" />
          <Clock className="w-5 h-5 text-indigo-400 absolute -bottom-1 -right-1 bg-[#111827] border border-slate-800 rounded-full p-0.5" />
        </div>

        {/* Content */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Coming Soon
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
          Detailed Monitoring
        </h1>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          We are currently building this view to provide deeper real-time insights, granular timelines, and historical comparison charts for this line.
        </p>

        {/* Action Button */}
        <button
          onClick={() => navigate(-1)}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98] active:translate-y-[1px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
};

export default ComingSoon;
