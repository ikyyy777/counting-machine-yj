import React, { useState, useEffect } from 'react';
import { BarChart3, Clock, AlertCircle, RefreshCcw, Search, Table2, LayoutDashboard, X, Filter, AlertTriangle, Activity, Trash2, CheckCircle2 } from 'lucide-react';
import { makeApiRequest, clearAllAuth, setCurrentFactory, executeHapusReset0 } from '../services/api';
import { mapDisplayToApiFactory } from '../types/api';
import { useNavigate } from 'react-router-dom';
import { Sidebar, Header } from './Home';

// Type helper (bisa juga dari api.ts, ini fallback)
const getUserProfile = () => {
  try {
    const raw = localStorage.getItem('auth_token_v2');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.userData || null;
  } catch {
    return null;
  }
};

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const user = getUserProfile();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'notReset' | 'delayedCb' | 'linePerformance'>('notReset');
  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [delayTime, setDelayTime] = useState<number>(3);
  const [factory, setFactory] = useState<string>('YONGJIN 2');
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);

  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setData([]);
    setColumnFilters({});
    setActiveFilterColumn(null);

    try {
      const apiFactory = typeof mapDisplayToApiFactory === 'function' ? mapDisplayToApiFactory(factory as any) : factory;
      setCurrentFactory(apiFactory);

      let endpoint = '';
      let params: any = { workDate };

      if (activeTab === 'notReset') {
        endpoint = 'GET_CEK_NOTRESET0';
      } else if (activeTab === 'delayedCb') {
        endpoint = 'GET_DELAYED_CB';
        params.delayTime = delayTime;
      } else if (activeTab === 'linePerformance') {
        endpoint = 'GET_LINE_PERFORMANCE_QC';
      }

      const response: any = await makeApiRequest('get', endpoint, { params });
      
      if (response && response.data) {
        setData(response.data);
      } else if (Array.isArray(response)) {
        setData(response);
      } else {
        setData([]);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err?.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, workDate, delayTime, factory]);

  const handleNavigation = (item: any) => {
    if (item.label === "Logout") {
      clearAllAuth();
      navigate("/login");
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setResetMessage(null);
    try {
      const resp = await executeHapusReset0(workDate, factory);
      if (resp && resp.status === 'success') {
        const rowsText = resp.rowsAffected !== undefined && resp.rowsAffected >= 0
          ? ` (${resp.rowsAffected} records terhapus)`
          : '';
        setResetMessage({
          type: 'success',
          text: `Berhasil mengeksekusi Hapus Reset 0 untuk tanggal ${workDate} di ${factory}${rowsText}.`,
        });
        setIsResetModalOpen(false);
        await fetchData();
      } else {
        throw new Error(resp?.message || 'Gagal mengeksekusi Hapus Reset 0.');
      }
    } catch (err: any) {
      console.error('Error executing Hapus Reset 0:', err);
      setResetMessage({
        type: 'error',
        text: err?.message || 'Gagal mengeksekusi CBC_WEB_HAPUS_RESET0.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const filteredData = data.filter((item) => {
    let match = true;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      match = Object.values(item).some(
        (val) => val && String(val).toLowerCase().includes(searchLower)
      );
    }
    if (!match) return false;

    // Column Filters
    for (const col of Object.keys(columnFilters)) {
      const selectedVals = columnFilters[col];
      if (selectedVals && selectedVals.length > 0) {
        let cellValue = item[col];
        if (cellValue && typeof cellValue === 'object') {
           if (cellValue.Hours !== undefined && cellValue.Minutes !== undefined) {
              cellValue = `${String(cellValue.Hours).padStart(2,'0')}:${String(cellValue.Minutes).padStart(2,'0')}`;
           } else {
              cellValue = JSON.stringify(cellValue);
           }
        }
        const strVal = String(cellValue || '-');
        if (!selectedVals.includes(strVal)) {
          return false;
        }
      }
    }
    return true;
  });

  const getUniqueValues = (col: string) => {
    const vals = new Set<string>();
    data.forEach(item => {
      let displayVal = item[col];
      if (displayVal && typeof displayVal === 'object') {
        if (displayVal.Hours !== undefined && displayVal.Minutes !== undefined) {
          displayVal = `${String(displayVal.Hours).padStart(2,'0')}:${String(displayVal.Minutes).padStart(2,'0')}`;
        } else {
          displayVal = JSON.stringify(displayVal);
        }
      }
      vals.add(String(displayVal || '-'));
    });
    return Array.from(vals).sort();
  };

  const handleCheckboxChange = (col: string, val: string) => {
    setColumnFilters(prev => {
      const existing = prev[col] || [];
      if (existing.includes(val)) {
        return { ...prev, [col]: existing.filter(v => v !== val) };
      } else {
        return { ...prev, [col]: [...existing, val] };
      }
    });
  };

  const getColumnDisplayName = (col: string) => {
    const upperCol = col.toUpperCase();
    if (upperCol === 'E_NAME' || upperCol === 'NAME') return 'OPERATOR NAME';
    if (upperCol === 'LINE_NAME') return 'LINE';
    if (upperCol === 'JAM' || upperCol === 'LAST_JAM' || upperCol === 'JAM_PULANG') return 'LAST COUNTING';
    if (upperCol === 'STYLE_NO') return 'STYLE';
    if (upperCol === 'QTY') return 'QUANTITY';
    if (upperCol === 'MACHINE_NAME') return 'MACHINE NAME';
    return upperCol.replace(/_/g, ' ');
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-400">Loading data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-red-400">
          <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
          <p>{error}</p>
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Table2 className="w-12 h-12 mb-4 opacity-30" />
          <p>No data available for the selected criteria.</p>
        </div>
      );
    }

    const columns = Object.keys(filteredData[0]);
    const filterableColumns = columns; // Apply filter to all columns

    return (
      <div className="overflow-auto max-h-[600px] bg-[#111827]/90 rounded-2xl border border-slate-700/60 shadow-2xl relative custom-scrollbar">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-800 shadow-md border-b border-slate-700">
              {columns.map((col) => (
                <th key={col} className="px-6 py-4 bg-slate-800 text-left text-xs font-bold text-slate-200 uppercase tracking-wider whitespace-nowrap group">
                  <div className="flex items-center gap-2">
                    <span>{getColumnDisplayName(col)}</span>
                    {filterableColumns.includes(col) && (
                      <div className="relative">
                        <Filter 
                          className={`w-3.5 h-3.5 cursor-pointer hover:text-blue-400 transition-colors ${columnFilters[col] && columnFilters[col].length > 0 ? 'text-blue-500' : 'text-slate-500'}`}
                          onClick={() => setActiveFilterColumn(activeFilterColumn === col ? null : col)}
                        />
                        {activeFilterColumn === col && (
                          <div className="absolute top-6 left-0 bg-[#1e293b] border border-slate-600 p-3 rounded-lg shadow-xl z-50 min-w-[200px] max-h-64 overflow-y-auto hide-scrollbar">
                            <div className="flex flex-col gap-2">
                              {getUniqueValues(col).map(val => (
                                <label key={val} className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs hover:text-white">
                                  <input 
                                    type="checkbox"
                                    checked={(columnFilters[col] || []).includes(val)}
                                    onChange={() => handleCheckboxChange(col, val)}
                                    className="rounded border-slate-600 bg-[#0f172a] text-blue-500 focus:ring-blue-500 w-4 h-4"
                                  />
                                  {val}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredData.map((row, idx) => {
              let trClassName = "hover:bg-slate-800/50 transition-colors";
              
              if (activeTab === 'linePerformance') {
                const target = Number(row.TARGET_DAY) || 0;
                const actual = Number(row.COUNTING_PROGRAM) || 0;
                if (target > 0) {
                  const rate = (actual / target) * 100;
                  if (rate >= 90) trClassName = "bg-emerald-900/40 hover:bg-emerald-800/50 transition-colors";
                  else if (rate >= 75) trClassName = "bg-yellow-900/40 hover:bg-yellow-800/50 transition-colors";
                  else trClassName = "bg-red-900/40 hover:bg-red-800/50 transition-colors";
                }
              }

              return (
                <tr key={idx} className={trClassName}>
                  {columns.map((col) => {
                    let displayVal = row[col];
                    if (displayVal && typeof displayVal === 'object') {
                      if (displayVal.Hours !== undefined && displayVal.Minutes !== undefined) {
                        displayVal = `${String(displayVal.Hours).padStart(2,'0')}:${String(displayVal.Minutes).padStart(2,'0')}`;
                      } else {
                        displayVal = JSON.stringify(displayVal);
                      }
                    }
                    
                    const isFaded = displayVal === null || displayVal === undefined || displayVal === '' || displayVal === 0 || displayVal === '0';
                    const formattedVal = isFaded ? '-' : String(displayVal);

                    return (
                      <td key={col} className={`px-6 py-3.5 text-sm whitespace-nowrap ${isFaded ? 'text-slate-600' : 'text-slate-200 font-medium'}`}>
                        {formattedVal}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#0a0f1c] text-slate-200 overflow-hidden font-inter selection:bg-blue-500/30 selection:text-white">
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} activeMenu="analytics" />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#0a0f1c]/80 backdrop-blur-sm z-40 flex" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-[#111827] border-r border-slate-800/60 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-white text-xl">Control Box Monitoring</span>
              <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
             <nav className="space-y-2">
                <div onClick={() => navigate('/')} className="cursor-pointer py-3 px-4 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl font-semibold flex items-center"><LayoutDashboard className="w-5 h-5 mr-3"/> Dashboard</div>
                <div onClick={() => navigate('/analytics')} className="cursor-pointer py-3 px-4 bg-blue-500/10 text-blue-400 font-semibold flex items-center"><BarChart3 className="w-5 h-5 mr-3"/> Analytics</div>
             </nav>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <Header user={user} onNavigate={handleNavigation} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 scroll-smooth relative z-10">
          <div className="max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                  Performance Analytics
                </h1>
                <p className="text-slate-400 mt-2 max-w-2xl">
                  Monitor control box resets, delayed control box send data, and overall line performance metrics.
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search data..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={() => fetchData()}
                  className="p-2.5 bg-[#111827] border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-300 rounded-xl transition-all"
                  title="Refresh Data"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-[#111827]/80 backdrop-blur-md rounded-2xl border border-slate-700/60 p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
              <div className="flex bg-[#0a0f1c] p-1.5 rounded-xl w-full md:w-auto overflow-x-auto hide-scrollbar border border-slate-800/80">
                <button
                  onClick={() => setActiveTab('notReset')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none flex items-center justify-center ${activeTab === 'notReset' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  <AlertTriangle className={`w-4 h-4 mr-2 ${activeTab === 'notReset' ? 'text-white' : 'text-slate-500'}`} />
                  Not Reset CB
                </button>
                <button
                  onClick={() => setActiveTab('delayedCb')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none flex items-center justify-center ${activeTab === 'delayedCb' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  <Clock className={`w-4 h-4 mr-2 ${activeTab === 'delayedCb' ? 'text-white' : 'text-slate-500'}`} />
                  Delayed CB
                </button>
                <button
                  onClick={() => setActiveTab('linePerformance')}
                  className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap flex-1 md:flex-none flex items-center justify-center ${activeTab === 'linePerformance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-500' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                >
                  <Activity className={`w-4 h-4 mr-2 ${activeTab === 'linePerformance' ? 'text-white' : 'text-slate-500'}`} />
                  Line Performance QC
                </button>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <label className="text-sm font-medium text-slate-400 whitespace-nowrap">Factory:</label>
                  <select
                    value={factory}
                    onChange={(e) => setFactory(e.target.value)}
                    className="bg-[#111827] border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:w-auto cursor-pointer"
                  >
                    <option value="YONGJIN 1">Yongjin 1</option>
                    <option value="YONGJIN 2">Yongjin 2</option>
                    <option value="YONGJIN 3">Yongjin 3</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <label className="text-sm font-medium text-slate-400 whitespace-nowrap">Date:</label>
                  <input
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className="bg-[#111827] border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:w-auto"
                  />
                </div>
                
                {activeTab === 'delayedCb' && (
                  <div className="flex items-center gap-3 w-full md:w-auto animate-fade-in">
                    <label className="text-sm font-medium text-slate-400 whitespace-nowrap">Min Delay (hrs):</label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={delayTime}
                      onChange={(e) => setDelayTime(Number(e.target.value))}
                      className="bg-[#111827] border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full md:w-24"
                    />
                  </div>
                )}

                {activeTab === 'notReset' && (
                  <button
                    onClick={() => setIsResetModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-500/70 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-rose-950/30 active:scale-95 whitespace-nowrap cursor-pointer ml-auto md:ml-0"
                    title={`Hapus data counting sebelum QTY = 1 untuk tanggal ${workDate}`}
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Hapus Reset 0</span>
                  </button>
                )}
              </div>
            </div>

            {resetMessage && (
              <div
                className={`mb-6 p-4 rounded-2xl border flex items-center justify-between shadow-lg backdrop-blur-md animate-fade-in ${
                  resetMessage.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-emerald-950/20'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-rose-950/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {resetMessage.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span className="text-sm font-medium">{resetMessage.text}</span>
                </div>
                <button
                  onClick={() => setResetMessage(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="animate-fade-in pb-12">
              {renderTable()}
            </div>
          </div>
        </main>
      </div>

      {/* Modal Konfirmasi Hapus Reset 0 */}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-200 animate-scale-in">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">Konfirmasi Hapus Data Reset 0</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Prosedur <code className="text-rose-300 font-mono">CBC_WEB_HAPUS_RESET0</code>
                </p>
              </div>
              <button
                onClick={() => !isResetting && setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-[#0a0f1c] p-4 rounded-xl border border-slate-800 text-sm mb-6">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Factory:</span>
                <span className="font-semibold text-white">{factory}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Target Date:</span>
                <span className="font-semibold text-white">{workDate}</span>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                Tindakan ini akan menghapus data temporary pada tabel <code className="text-amber-400">CBC_COUNTING_TEMP</code> yang jamnya sebelum angka 1 pertama kali muncul di tanggal tersebut (data counter sisa sebelum mesin di-reset).
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isResetting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;

