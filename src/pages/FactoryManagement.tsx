import React, { useState } from 'react';
import NeedsManagement from '../components/FactoryManagement/NeedsManagement';
import RiskManagement from '../components/FactoryManagement/RiskManagement';
import { Factory, AlertTriangle, TrendingUp, Download } from 'lucide-react';

const FactoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'needs' | 'risk'>('needs');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 border-b border-gray-700 shadow-xl">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-6">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg shadow-lg">
                <Factory className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Factory Management
                </h1>
                <p className="text-sm text-gray-400 mt-1">Monitor production needs and identify potential risks</p>
              </div>
            </div>

            {/* Tabs Row */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveTab('needs')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'needs'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                    : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
                Needs Management
              </button>
              <button
                onClick={() => setActiveTab('risk')}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'risk'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg scale-105'
                    : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                Risk Management
              </button>

              {activeTab === 'needs' && (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('factoryManagement:exportNeedsExcel'))}
                  className="ml-auto flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 bg-gray-800/50 border border-gray-700 text-gray-200 hover:bg-gray-700/50"
                >
                  <Download className="w-5 h-5" />
                  Export Excel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full px-3 sm:px-6 lg:px-10 py-6 lg:py-8">
        {/* Render both components but hide inactive one to preserve state */}
        <div className={activeTab === 'needs' ? 'block' : 'hidden'}>
          <NeedsManagement />
        </div>
        <div className={activeTab === 'risk' ? 'block' : 'hidden'}>
          <RiskManagement />
        </div>
      </main>
    </div>
  );
};

export default FactoryManagement;

