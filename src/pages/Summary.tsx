import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

// Ganti path ini sesuai dengan struktur proyek Anda
import { fetchSummaryPOHistory } from '../services/api';
import { SummaryPOHistoryResponse, SummaryDetailItem, FactoryCode } from '../types/api';
import SummaryHeader from '../components/Summary/Header';

// ===================================================================
// === Komponen Portal
// === Komponen ini akan me-render menu filter di luar container tabel
// ===================================================================
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Anda bisa membuat <div id="portal-root"></div> di file index.html Anda
    // untuk tempat portal yang lebih spesifik, namun document.body juga bisa.
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};


// Tipe untuk filter utama di header
interface SummaryFilters {
  linecode: string;
  workdate: string;
  factory: FactoryCode;
}

// Tipe untuk kunci kolom yang bisa difilter
type ColumnFilterKeys = 'Col_FileNo' | 'Col_Style' | 'Col_Color' | 'Col_Buyer';


const Summary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State untuk filter utama (Line, Workdate, Factory)
  const [filters, setFilters] = useState<SummaryFilters>({
    linecode: searchParams.get('linecode') || '',
    workdate: searchParams.get('workdate') || new Date().toISOString().split('T')[0],
    factory: (searchParams.get('factory') as FactoryCode) || ('' as any),
  });

  // State untuk data, loading, error, dan baris yang diperluas
  const [data, setData] = useState<SummaryPOHistoryResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filterStartSew, setFilterStartSew] = useState<string>('');
  const [filterEndSew, setFilterEndSew] = useState<string>('');
  const [columnFilters, setColumnFilters] = useState<Partial<Record<ColumnFilterKeys, string>>>({});
  const [openFilterMenu, setOpenFilterMenu] = useState<ColumnFilterKeys | null>(null);
  const [filterSearchTerms, setFilterSearchTerms] = useState<Partial<Record<ColumnFilterKeys, string>>>({});

  // useEffect untuk fetch data saat komponen pertama kali dimuat (jika ada params di URL)
  useEffect(() => {
    if (filters.linecode && filters.workdate) {
      fetchData();
    }
  }, []); // Dependensi kosong agar hanya berjalan sekali saat mount

  // Fungsi untuk mengambil data dari API
  const fetchData = async () => {
    if (!filters.linecode || !filters.workdate) {
      toast.warn("Silakan pilih Line dan Workdate terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError(null);
    setColumnFilters({}); // Reset filter kolom setiap kali data baru diambil
    try {
      const response = await fetchSummaryPOHistory({
        line: filters.linecode,
        workdate: filters.workdate
      });
      setData(response);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal mengambil data summary';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk perubahan filter utama
  const handleFiltersChange = (newFilters: SummaryFilters) => {
    setFilters(newFilters);
    setSearchParams({
      linecode: newFilters.linecode,
      workdate: newFilters.workdate,
    });
  };

  // Handler untuk tombol "Lookup" dan "Back"
  const handleLookup = () => fetchData();
  const handleBackToHistory = () => navigate('/history');

  // Handler untuk membuka/menutup detail baris
  const toggleRowExpansion = (fileNo: string) => {
    setExpandedRows(prev => ({ ...prev, [fileNo]: !prev[fileNo] }));
  };

  // Handler untuk memilih item dari dropdown filter kolom
  const handleColumnFilterChange = (column: ColumnFilterKeys, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
    setOpenFilterMenu(null); // Tutup menu setelah memilih
  };

  // Handler untuk perubahan teks pada search bar di dalam filter
  const handleFilterSearchChange = (column: ColumnFilterKeys, searchTerm: string) => {
    setFilterSearchTerms(prev => ({ ...prev, [column]: searchTerm }));
  };

  // Fungsi utilitas untuk parsing dan formatting
  const parseDetailString = (detailString: string): SummaryDetailItem[] => { try { return JSON.parse(detailString); } catch (e) { console.error('Error parsing detail string:', e); return []; } };
  const parseSizeString = (sizeString: string): { [key: string]: number } => { if (!sizeString) return {}; const sizes: { [key: string]: number } = {}; const sizePattern = /\[?([^=,]+)=(\d+)\]?/g; let match; while ((match = sizePattern.exec(sizeString)) !== null) { sizes[match[1].trim()] = parseInt(match[2], 10); } return sizes; };
  const calculateTotalForField = (detail: SummaryDetailItem[], field: keyof SummaryDetailItem): number => { return detail.reduce((total, item) => { const value = item[field]; if (typeof value === 'string' && value.trim() !== '') { const sizes = parseSizeString(value); return total + Object.values(sizes).reduce((sum, qty) => sum + qty, 0); } return total; }, 0); };
  const formatDate = (dateString: string) => { try { return format(new Date(dateString), 'yyyy-MM-dd'); } catch { return dateString; } };

  // Handler untuk membuka/menutup menu filter kolom
  const toggleFilterMenu = (column: ColumnFilterKeys) => {
    setFilterSearchTerms(prev => ({ ...prev, [column]: '' }));
    setOpenFilterMenu(prev => (prev === column ? null : column));
  };

  const uniqueValues = useMemo(() => {
    const getUnique = (key: ColumnFilterKeys) => [...new Set(data.map(item => item[key]?.trim()).filter(Boolean))].sort();
    return {
      Col_FileNo: getUnique('Col_FileNo'),
      Col_Style: getUnique('Col_Style'),
      Col_Color: getUnique('Col_Color'),
      Col_Buyer: getUnique('Col_Buyer'),
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      return (Object.keys(columnFilters) as ColumnFilterKeys[]).every(key => {
        const filterValue = columnFilters[key];
        if (!filterValue) return true; // Lolos jika filter kosong ('All')
        return item[key]?.trim() === filterValue;
      });
    });
  }, [data, columnFilters]);

  // Komponen Reusable untuk Header Kolom yang Bisa Difilter
  interface FilterableHeaderProps {
    title: string;
    column: ColumnFilterKeys;
    isMenuOpen: boolean;
    onToggleMenu: () => void;
  }
  const FilterableHeader: React.FC<FilterableHeaderProps> = ({ title, column, isMenuOpen, onToggleMenu }) => {
    const isActive = !!columnFilters[column];
    const searchTerm = filterSearchTerms[column] || '';

    const anchorRef = useRef<HTMLTableCellElement>(null); // Ref untuk <th> sebagai jangkar posisi
    const menuRef = useRef<HTMLDivElement>(null); // Ref untuk menu dropdown itu sendiri
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

    // useLayoutEffect untuk mengukur posisi jangkar sebelum browser melukis
    useLayoutEffect(() => {
      if (isMenuOpen && anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 2, // Posisi top di bawah header + 2px
          left: rect.left,      // Posisi left sama dengan header
        });
      }
    }, [isMenuOpen]);

    // useEffect untuk menangani klik di luar menu (untuk menutup)
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node) && anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
          onToggleMenu();
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isMenuOpen, onToggleMenu]);

    const filteredOptions = useMemo(() => {
      if (!searchTerm) return uniqueValues[column];
      return uniqueValues[column].filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [column, searchTerm, uniqueValues]);

    return (
      <th ref={anchorRef} className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky top-0 bg-gray-700">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <button onClick={onToggleMenu} className={`focus:outline-none ${isActive ? 'text-yellow-400' : 'text-gray-400'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {isMenuOpen && menuPosition && (
          <Portal>
            <div
              ref={menuRef}
              style={{
                position: 'fixed', // Gunakan 'fixed' agar posisi relatif terhadap viewport
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
              className="w-56 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 flex flex-col"
            >
              <div className="p-2 border-b border-gray-600">
                <input
                  type="text"
                  placeholder={`Find ${title}...`}
                  value={searchTerm}
                  onChange={(e) => handleFilterSearchChange(column, e.target.value)}
                  className="w-full px-2 py-1 bg-gray-900 text-gray-200 rounded border border-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 text-sm"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                <button onClick={() => handleColumnFilterChange(column, '')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 font-bold">
                  -- All --
                </button>
                {filteredOptions.map(value => (
                  <button key={value} onClick={() => handleColumnFilterChange(column, value)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    {value}
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <span className="block text-center px-4 py-2 text-sm text-gray-500">Not found</span>
                )}
              </div>
            </div>
          </Portal>
        )}
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <SummaryHeader
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onLookup={handleLookup}
        onBack={handleBackToHistory}
      />
      <div className="p-4">
        {/* Filter untuk detail row */}
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start Date (Detail)</label>
            <input
              type="date"
              value={filterStartSew}
              onChange={e => setFilterStartSew(e.target.value)}
              className="px-2 py-1 rounded bg-gray-800 border border-gray-600"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">End Date (Detail)</label>
            <input
              type="date"
              value={filterEndSew}
              onChange={e => setFilterEndSew(e.target.value)}
              className="px-2 py-1 rounded bg-gray-800 border border-gray-600"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            <span className="ml-3 text-gray-300">Loading data...</span>
          </div>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-250px)] rounded-lg border border-gray-700">
            <table className="min-w-full bg-gray-800">
              <thead className="bg-gray-700 sticky top-0 z-10">
                <tr>
                  <FilterableHeader title="File No" column="Col_FileNo" isMenuOpen={openFilterMenu === 'Col_FileNo'} onToggleMenu={() => toggleFilterMenu('Col_FileNo')} />
                  <FilterableHeader title="Style" column="Col_Style" isMenuOpen={openFilterMenu === 'Col_Style'} onToggleMenu={() => toggleFilterMenu('Col_Style')} />
                  <FilterableHeader title="Color" column="Col_Color" isMenuOpen={openFilterMenu === 'Col_Color'} onToggleMenu={() => toggleFilterMenu('Col_Color')} />
                  <FilterableHeader title="Buyer" column="Col_Buyer" isMenuOpen={openFilterMenu === 'Col_Buyer'} onToggleMenu={() => toggleFilterMenu('Col_Buyer')} />
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Season</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">CRD</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Order Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total PQty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Input Module</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">QC End Line</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Hangtag</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Polybag</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Packing</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-8 text-center text-gray-400">
                      {data.length === 0 ? "Tidak ada data summary yang tersedia" : "Tidak ada data yang cocok dengan filter Anda"}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    const detailItems = parseDetailString(item.Detail);
                    const isExpanded = expandedRows[item.Col_FileNo];
                    const totalInputModule = calculateTotalForField(detailItems, 'INPUT_MODULE');
                    const totalQCEndLine = calculateTotalForField(detailItems, 'QC_END_LINE');
                    const totalHangtag = calculateTotalForField(detailItems, 'HANGTAG');
                    const totalPolybag = calculateTotalForField(detailItems, 'POLYBAG');
                    const totalPacking = calculateTotalForField(detailItems, 'PACKING');

                    return (
                      <React.Fragment key={`${item.Col_FileNo}-${index}`}>
                        <tr className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-300 font-medium">{item.Col_FileNo?.trim()}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{item.Col_Style}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{item.Col_Color}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{item.Col_Buyer?.trim()}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{item.Col_Season}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{formatDate(item.Col_CRD)}</td>
                          <td className="px-4 py-3 text-sm text-gray-300 font-semibold">{item.OrderQty?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">{item.TotalPQty ? item.TotalPQty.toLocaleString() : '-'}</td>
                          <td className="px-4 py-3 text-sm text-yellow-400">{totalInputModule.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-blue-400">{totalQCEndLine.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-green-400">{totalHangtag.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-purple-400">{totalPolybag.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-orange-400">{totalPacking.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            <button
                              onClick={() => toggleRowExpansion(item.Col_FileNo)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                            >
                              {isExpanded ? 'Tutup' : 'Detail'}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-gray-800/50">
                            <td colSpan={14} className="p-4">
                              <div className="bg-gray-700/50 rounded-lg p-4">
                                <h4 className="text-lg font-semibold text-gray-200 mb-4">
                                  Detail untuk {item.Col_FileNo?.trim()}
                                </h4>

                                {detailItems.length === 0 ? (
                                  <p className="text-gray-400">No details available</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full bg-gray-800 rounded-lg">
                                      <thead className="bg-gray-700">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">PO NO</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Size</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">CB Output</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">Start Sew</th>
                                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase">End Sew</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-700">
                                        {detailItems
                                          .filter(detail => {
                                            if (filterStartSew && filterEndSew) {
                                              const startSew = detail.Col_StartSew ? detail.Col_StartSew.substring(0, 10) : '';
                                              const endSew = detail.Col_EndSew ? detail.Col_EndSew.substring(0, 10) : '';
                                              return startSew >= filterStartSew && endSew <= filterEndSew;
                                            }
                                            return true;
                                          })
                                          .map((detail, detailIndex) => {
                                            const sizes = parseSizeString(detail.Col_Size);
                                            const sizeDisplay = Object.entries(sizes).map(([size, qty]) => `${size}=${qty}`).join(', ') || '-';
                                            return (
                                              <tr key={detailIndex} className="hover:bg-gray-700/50">
                                                <td className="px-3 py-2 text-sm text-gray-300 font-medium">{detail.PO_NO || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-300">{sizeDisplay}</td>
                                                <td className="px-3 py-2 text-sm text-gray-300">{detail.CB_Output || '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-300">{detail.Col_StartSew ? formatDate(detail.Col_StartSew) : '-'}</td>
                                                <td className="px-3 py-2 text-sm text-gray-300">{detail.Col_EndSew ? formatDate(detail.Col_EndSew) : '-'}</td>
                                              </tr>
                                            );
                                          })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary;