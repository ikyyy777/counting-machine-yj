// src/pages/History.tsx

import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Header from '../components/History/Header';
import { HistoryTableSkeleton } from '../components/History/Skeletons';
import { POHistoryResponse, DisplayFactoryCode } from '../types/api';
import { fetchPOHistory, updatePOHistoryLabor, STORAGE_KEYS } from '../services/api';
import { toast } from 'react-toastify';


// ===================================================================
// === Komponen Portal
// === Komponen ini akan me-render menu filter di luar container tabel
// ===================================================================
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    return mounted ? createPortal(children, document.body) : null;
};


// --- INTERFACES AND INITIAL DATA ---
interface HistoryFilters {
    date: Date;
    factory: DisplayFactoryCode;
    line: string;
    style: string;
    crdMonth: string[];
}

type ColumnFilterKeys = 'Col_Buyer' | 'Col_FileNo' | 'Col_Style' | 'Col_Color' | 'PO_NO';
type SortField = "default" | "po" | "buyer" | "color" | "season" | "startSew" | "endSew" | "targetDay" | "orderQty" | "prodQty" | "crd" | "fileNo";
type SortOrder = "asc" | "desc";
interface SubRowData {
    input_module: number;
    qc_end_line: number;
    hangtag: number;
    polybag: number;
    packing: number;
    labor_created_at: string | null;
    labor_updated_at: string | null;
    labor_created_by: string;
    labor_updated_by: string;
}
interface SizeData { [key: string]: SubRowData; }
const initialSubRowData: SubRowData = {
    input_module: 0, qc_end_line: 0, hangtag: 0, polybag: 0, packing: 0,
    labor_created_at: null, labor_updated_at: null, labor_created_by: '', labor_updated_by: ''
};
interface ModalProps {
    isOpen: boolean; onClose: () => void; data: SizeData; onDataChange: (data: SizeData) => void;
    onSaveSuccess?: () => void;
    poDetails: {
        poNo: string; startSew: string; endSew: string; style: string; line: number | string;
        color: string; fileNo: string | number; crd: string; detId?: string | number;
        targetData?: { [key: string]: number; }; sizeType?: 'numeric' | 'letter' | 'mixed';
    };
}

// --- SUB-COMPONENTS ---
const QuantityTableWithLabels = ({ title, processField, poDetails, data, onDataChange, setDirtyMap }: {
    title: string; processField: keyof SubRowData; poDetails: ModalProps['poDetails'];
    data: SizeData; onDataChange: (data: SizeData) => void;
    setDirtyMap: React.Dispatch<React.SetStateAction<Record<string, Partial<Record<keyof SubRowData, boolean>>>>>;
}) => {
    const availableSizes = React.useMemo(() => Object.keys(poDetails.targetData || {}), [poDetails.targetData]);
    const [localValues, setLocalValues] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const newLocalValues: { [key: string]: string } = {};
        availableSizes.forEach(size => {
            const value = data[size]?.[processField];
            newLocalValues[size] = (typeof value === 'number' ? value : 0).toString();
        });
        setLocalValues(newLocalValues);
    }, [data, processField, availableSizes]);

    const calculateTotal = (size: string) => poDetails.targetData?.[size] || 0;
    const calculateProcessTotal = () => Object.values(data).reduce((sum, sizeData) => sum + (Number(sizeData[processField]) || 0), 0);
    const calculateProcessBalance = (size: string) => (Number(data[size]?.[processField]) || 0) - calculateTotal(size);
    const grandTotalTarget = Object.values(poDetails.targetData || {}).reduce((sum, val) => sum + val, 0);

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 text-center">{title}</h3>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-600">
                            <th className="border border-gray-500 px-3 py-2 text-left text-sm font-medium text-gray-400"></th>
                            {availableSizes.map(size => (
                                <th key={size} className="border border-gray-500 px-3 py-2 text-center text-sm font-medium text-gray-200">
                                    {size.toUpperCase()}
                                </th>
                            ))}
                            <th className="border border-gray-500 px-3 py-2 text-center text-sm font-medium text-gray-200">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th className="border border-gray-500 px-3 py-2 text-left text-sm text-gray-400 bg-gray-800/50 font-medium">QTY TOTAL</th>
                            {availableSizes.map(size => (
                                <td key={size} className="border border-gray-500 px-3 py-2 text-center text-sm text-gray-300 bg-gray-800/50">
                                    {calculateTotal(size)}
                                </td>
                            ))}
                            <td className="border border-gray-500 px-3 py-2 text-center text-sm text-gray-300 bg-gray-800/50 font-semibold">
                                {grandTotalTarget}
                            </td>
                        </tr>
                        <tr>
                            <th className="border border-gray-500 px-3 py-2 text-left text-sm text-gray-400 bg-gray-800/50 font-medium">QTY INPUT</th>
                            {availableSizes.map(size => (
                                <td key={`${processField}-${size}`} className="border border-gray-500 px-1 py-1">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={localValues[size] ?? ''}
                                        placeholder="0"
                                        onChange={e => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            setLocalValues(prev => ({ ...prev, [size]: value }));
                                        }}
                                        onBlur={() => {
                                            const newData = { ...data };
                                            if (!newData[size]) {
                                                newData[size] = { ...initialSubRowData };
                                            }
                                            const committedValue = localValues[size] === '' ? 0 : Number(localValues[size]);
                                            
                                            if (newData[size][processField] !== committedValue) {
                                                newData[size] = { ...newData[size], [processField]: committedValue };
                                                onDataChange(newData);
                                                setDirtyMap(prev => ({ ...prev, [size]: { ...(prev[size] || {}), [processField]: true } }));
                                            }
                                        }}
                                        className="w-full bg-gray-700 text-gray-300 px-2 py-1 text-center text-sm border-none focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded"
                                    />
                                </td>
                            ))}
                            <td className="border border-gray-500 px-3 py-2 text-center text-sm text-gray-300 font-semibold bg-gray-700/50">
                                {calculateProcessTotal()}
                            </td>
                        </tr>
                        <tr>
                            <th className="border border-gray-500 px-3 py-2 text-left text-sm text-gray-400 bg-gray-800/50 font-medium">BALANCE</th>
                            {availableSizes.map(size => (
                                <td key={`${processField}-${size}-balance`} className={`border border-gray-500 px-3 py-2 text-center text-sm font-medium ${calculateProcessBalance(size) < 0 ? 'text-red-400' : calculateProcessBalance(size) === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {calculateProcessBalance(size)}
                                </td>
                            ))}
                            <td className={`border border-gray-500 px-3 py-2 text-center text-sm font-semibold ${calculateProcessTotal() - grandTotalTarget < 0 ? 'text-red-400' : calculateProcessTotal() - grandTotalTarget === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {calculateProcessTotal() - grandTotalTarget}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, data, onDataChange, onSaveSuccess, poDetails }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const username = authToken ? JSON.parse(authToken).userData.username : 'SYSTEM';
    const [dirtyMap, setDirtyMap] = useState<Record<string, Partial<Record<keyof SubRowData, boolean>>>>({});

    useEffect(() => {
        if (!isOpen) {
            setDirtyMap({});
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const apiCalls = [];
            for (const size in dirtyMap) {
                for (const field in dirtyMap[size]) {
                    const processName = field.toUpperCase() as any;
                    const value = data[size]?.[field as keyof SubRowData] as number || 0;
                    
                    const requestData = {
                        PO_NO: poDetails.poNo,
                        START_SEW: poDetails.startSew,
                        END_SEW: poDetails.endSew,
                        SIZE_CODE: size.toUpperCase(),
                        PROCESS: processName,
                        VALUE: value,
                        USER: username,
                        DET_ID: String(poDetails.detId ?? ''),
                    };
                    apiCalls.push(updatePOHistoryLabor(requestData));
                }
            }

            const responses = await Promise.all(apiCalls);
            const firstError = responses.find(res => res.status === 'error');
            if (firstError) {
                throw new Error(firstError.message || 'One of the save processes failed.');
            }

            toast.success('Data saved successfully');
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to save data';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    const processFields: { title: string; field: keyof SubRowData }[] = [
        { title: 'INPUT MODULE', field: 'input_module' },
        { title: 'QC END LINE', field: 'qc_end_line' },
        { title: 'HANGTAG', field: 'hangtag' },
        { title: 'POLYBAG', field: 'polybag' },
        { title: 'PACKING', field: 'packing' },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Input Per Process</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>

                <div className="p-4 overflow-y-auto space-y-4">
                    <div className="bg-gray-900/50 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 text-sm">
                        <div className="text-gray-300"><span className="font-semibold text-gray-400">LINE:</span> {poDetails.line}</div>
                        <div className="text-gray-300"><span className="font-semibold text-gray-400">FILE NO:</span> {poDetails.fileNo}</div>
                        <div className="text-gray-300"><span className="font-semibold text-gray-400">PO NO:</span> {poDetails.poNo}</div>
                        <div className="text-gray-300"><span className="font-semibold text-gray-400">STYLE:</span> {poDetails.style}</div>
                        <div className="text-gray-300"><span className="font-semibold text-gray-400">COLOR:</span> {poDetails.color}</div>
                        <div className="text-gray-300"><span className="font-semibold text-gray-400">CRD:</span> {format(new Date(poDetails.crd), 'yyyy-MM-dd')}</div>
                        <div className="text-gray-300"><span className="font-semibold text-gray-400">START:</span> {format(new Date(poDetails.startSew), 'yyyy-MM-dd HH:mm')}</div>
                        <div className="text-gray-300"><span className="font-semibold text-gray-400">END:</span> {format(new Date(poDetails.endSew), 'yyyy-MM-dd HH:mm')}</div>
                    </div>

                    {error && <div className="text-red-400 bg-red-900/30 p-3 rounded">{error}</div>}
                    
                    {processFields.map(({ title, field }) => (
                        <QuantityTableWithLabels
                            key={field}
                            title={title}
                            processField={field}
                            poDetails={poDetails}
                            data={data}
                            onDataChange={onDataChange}
                            setDirtyMap={setDirtyMap}
                        />
                    ))}
                </div>

                <div className="p-4 mt-auto border-t border-gray-700 flex justify-end gap-4">
                    <button onClick={onClose} disabled={loading} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50">
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={loading || Object.keys(dirtyMap).length === 0} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN HISTORY PAGE COMPONENT ---
const History: React.FC = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<HistoryFilters>({
        date: new Date(), factory: "" as any, line: "", style: "", crdMonth: [],
    });
    const [loading, setLoading] = useState(false);
    const [actualLineName, setActualLineName] = useState<string>("");
    const [data, setData] = useState<POHistoryResponse[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("default");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [showAllRows, setShowAllRows] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, SizeData>>({});
    const [selectedRow, setSelectedRow] = useState<POHistoryResponse | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [columnFilters, setColumnFilters] = useState<Partial<Record<ColumnFilterKeys, string>>>({});
    const [openFilterMenu, setOpenFilterMenu] = useState<ColumnFilterKeys | null>(null);
    const [filterSearchTerms, setFilterSearchTerms] = useState<Partial<Record<ColumnFilterKeys, string>>>({});

    const handleLookup = async () => {
        if (!filters.line) {
            toast.error("Please select a line first.");
            return;
        }
        setLoading(true);
        setError(null);
        setColumnFilters({});
        try {
            const result = await fetchPOHistory({
                line: Number(filters.line),
                workdate: format(filters.date, 'yyyy-MM-dd')
            });
            setData(result);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch data";
            setError(errorMessage);
            toast.error(errorMessage);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    const handleColumnFilterChange = (column: ColumnFilterKeys, value: string) => {
        setColumnFilters(prev => ({ ...prev, [column]: value }));
        setOpenFilterMenu(null);
    };

    const toggleFilterMenu = (column: ColumnFilterKeys) => {
        setFilterSearchTerms(prev => ({ ...prev, [column]: '' }));
        setOpenFilterMenu(prev => (prev === column ? null : column));
    };

    const handleFilterSearchChange = (column: ColumnFilterKeys, searchTerm: string) => {
        setFilterSearchTerms(prev => ({ ...prev, [column]: searchTerm }));
    };

    const getPoKey = (row: POHistoryResponse) => `${row.PO_NO}_${row.Col_StartSew}_${row.Col_EndSew}`;
    const parseProcessString = (processStr?: string | null): { [key: string]: number } => {
        const result: { [key: string]: number } = {};
        if (!processStr) return result;
        processStr.split(',').forEach(part => {
            const [key, value] = part.split('=').map(s => s.trim());
            if (key && value && !isNaN(Number(value))) {
                let normalizedKey = key.toUpperCase();
                if (normalizedKey === '2XL') normalizedKey = 'XXL';
                if (normalizedKey === '3XL') normalizedKey = 'XXXL';
                result[normalizedKey] = Number(value);
            }
        });
        return result;
    };
    const calculateTotalFromSizes = (row: POHistoryResponse, field: keyof POHistoryResponse) => {
        const processString = row[field] as string | undefined | null;
        if (!processString) return 0;
        const parsedData = parseProcessString(processString);
        return Object.values(parsedData).reduce((sum, current) => sum + current, 0);
    };
    const renderProcessTotalWithPercentage = (row: POHistoryResponse, field: keyof POHistoryResponse) => {
        const processTotal = calculateTotalFromSizes(row, field);
        const prodQty = Number(row.Col_ProdQty);
        if (prodQty === 0) {
            return `${processTotal} (0%)`;
        }
        const percentage = (processTotal / prodQty) * 100;
        return `${processTotal} (${percentage.toFixed(0)}%)`;
    };
    const detectSizeType = (colSize: string): 'numeric' | 'letter' | 'mixed' => {
        if (!colSize) return 'letter';
        if (colSize.includes('(') && colSize.includes(')')) return 'mixed';
        const sizePattern = /\[([^=]+)=(\d+)\]/g;
        let match;
        let allNumeric = true;
        let hasAnySize = false;
        while ((match = sizePattern.exec(colSize)) !== null) {
            hasAnySize = true;
            const sizeKey = match[1].trim();
            if (/[a-zA-Z]/.test(sizeKey)) {
                allNumeric = false;
                break;
            }
        }
        if (!hasAnySize || allNumeric) return 'numeric';
        return 'letter';
    };
    const parseColSizeDynamic = (colSize: string): { sizes: { [key: string]: number }, type: 'numeric' | 'letter' | 'mixed' } => {
        if (!colSize) return { sizes: {}, type: 'letter' };
        const type = detectSizeType(colSize);
        const sizes: { [key: string]: number } = {};
        const sizePattern = /\[([^=]+)=(\d+)\]/g;
        let match;
        while ((match = sizePattern.exec(colSize)) !== null) {
            const sizeKey = match[1].trim();
            const quantity = parseInt(match[2], 10);
            if (type === 'numeric' || type === 'mixed') {
                sizes[sizeKey] = quantity;
            } else {
                let normalizedKey = sizeKey.toUpperCase();
                if (normalizedKey === '2XL') normalizedKey = 'XXL';
                if (normalizedKey === '3XL') normalizedKey = 'XXXL';
                sizes[normalizedKey] = quantity;
            }
        }
        return { sizes, type };
    };

    const uniqueValues = useMemo(() => {
        const getUnique = (key: ColumnFilterKeys) =>
            [...new Set(data.map(item => String(item[key] || '').trim()).filter(Boolean))].sort();
        return {
            Col_Buyer: getUnique('Col_Buyer'),
            Col_FileNo: getUnique('Col_FileNo'),
            Col_Style: getUnique('Col_Style'),
            Col_Color: getUnique('Col_Color'),
            PO_NO: getUnique('PO_NO'),
        };
    }, [data]);

    const filteredAndSortedData = useMemo(() => {
        let result = [...data];
        if (searchQuery) {
            const lowercasedQuery = searchQuery.toLowerCase();
            result = result.filter(row =>
                row.PO_NO?.toLowerCase().includes(lowercasedQuery) ||
                row.Col_FileNo?.toString().toLowerCase().includes(lowercasedQuery)
            );
        }
        if (filters.crdMonth.length > 0) {
            result = result.filter(row => {
                if (!row.Col_CRD) return false;
                const rowCrdMonth = format(new Date(row.Col_CRD), 'yyyy-MM');
                return filters.crdMonth.includes(rowCrdMonth);
            });
        }
        const activeColumnFilters = Object.entries(columnFilters).filter(([, value]) => value);
        if (activeColumnFilters.length > 0) {
            result = result.filter(row => {
                return activeColumnFilters.every(([key, value]) => {
                    return String(row[key as ColumnFilterKeys] || '').trim() === value;
                });
            });
        }
        const now = new Date();
        result.forEach(row => {
            row.isActive = (new Date(row.Col_StartSew) <= now && new Date(row.Col_EndSew) > now) ? 1: 0;
        });
        if (!showAllRows && filters.crdMonth.length === 0) {
            const activeIndex = result.findIndex(row => row.isActive === 1);
            if (activeIndex !== -1) {
                result = result.slice(activeIndex);
            }
        }
        if (sortField === "default") return result;
        return [...result].sort((a, b) => {
            let valA: any = a[sortField as keyof POHistoryResponse];
            let valB: any = b[sortField as keyof POHistoryResponse];
            if (sortField === 'crd' || sortField === 'startSew' || sortField === 'endSew') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }
            const comparison = typeof valA === 'string' ? valA.localeCompare(valB) : valA - valB;
            return sortOrder === "asc" ? comparison : -comparison;
        });
    }, [data, searchQuery, sortField, sortOrder, showAllRows, filters.crdMonth, columnFilters]);

    const handleRowClick = (row: POHistoryResponse) => {
        const poKey = getPoKey(row);
        const { sizes: targetQuantities } = parseColSizeDynamic(row.Col_Size || '');
        const newData: SizeData = {};
        const inputMap = parseProcessString(row.INPUT_MODULE);
        const qcMap = parseProcessString(row.QC_END_LINE);
        const hangtagMap = parseProcessString(row.HANGTAG);
        const polybagMap = parseProcessString(row.POLYBAG);
        const packingMap = parseProcessString(row.PACKING);
        Object.keys(targetQuantities).forEach(sizeKey => {
            newData[sizeKey] = {
                ...initialSubRowData,
                input_module: inputMap[sizeKey] || 0,
                qc_end_line: qcMap[sizeKey] || 0,
                hangtag: hangtagMap[sizeKey] || 0,
                polybag: polybagMap[sizeKey] || 0,
                packing: packingMap[sizeKey] || 0,
            };
        });
        setExpandedRows(prev => ({ ...prev, [poKey]: newData }));
        setSelectedRow(row);
        setIsModalOpen(true);
    };
    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedRow(null);
    };
    const handleDataChange = (newData: SizeData) => {
        if (selectedRow) {
            const poKey = getPoKey(selectedRow);
            setExpandedRows(prev => ({ ...prev, [poKey]: newData }));
        }
    };
    const handleSaveSuccess = () => handleLookup();
    const handleSummaryClick = () => {
        if (!filters.line) {
            toast.error('Please select a line first');
            return;
        }
        const formattedDate = format(filters.date, 'yyyy-MM-dd');
        navigate(`/summary?linecode=${filters.line}&workdate=${formattedDate}`);
    };

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
        const anchorRef = useRef<HTMLTableCellElement>(null);
        const menuRef = useRef<HTMLDivElement>(null);
        const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

        useLayoutEffect(() => {
            if (isMenuOpen && anchorRef.current) {
                const rect = anchorRef.current.getBoundingClientRect();
                setMenuPosition({ top: rect.bottom + 2, left: rect.left });
            }
        }, [isMenuOpen]);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node) && anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
                    onToggleMenu();
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [isMenuOpen, onToggleMenu]);

        const filteredOptions = useMemo(() => {
            if (!searchTerm) return uniqueValues[column];
            return uniqueValues[column].filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));
        }, [column, searchTerm, uniqueValues]);

        return (
            <th ref={anchorRef} className="px-4 py-3 text-left text-xs font-medium uppercase sticky top-0 bg-gray-700">
                <div className="flex items-center gap-2 relative">
                    <span>{title}</span>
                    <button onClick={onToggleMenu} className={`focus:outline-none ${isActive ? 'text-yellow-400' : 'text-gray-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                {isMenuOpen && menuPosition && (
                    <Portal>
                        <div ref={menuRef} style={{ position: 'fixed', top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                            className="w-56 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-50 flex flex-col">
                            <div className="p-2 border-b border-gray-600">
                                <input type="text" placeholder={`Find ${title}...`} value={searchTerm}
                                    onChange={(e) => handleFilterSearchChange(column, e.target.value)}
                                    className="w-full px-2 py-1 bg-gray-900 text-gray-200 rounded border border-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 text-sm" autoFocus />
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                <button onClick={() => handleColumnFilterChange(column, '')} className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 font-bold">-- All --</button>
                                {filteredOptions.map(value => (
                                    <button key={value} onClick={() => handleColumnFilterChange(column, value)} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{value}</button>
                                ))}
                                {filteredOptions.length === 0 && <span className="block text-center px-4 py-2 text-sm text-gray-500">Not found</span>}
                            </div>
                        </div>
                    </Portal>
                )}
            </th>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Header filters={filters} onFiltersChange={setFilters} onLookup={handleLookup} className="bg-gray-900" onLineNameChange={setActualLineName} />
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Production Order History</h2>
                    <h3 className="text-sm text-gray-300">Date: {format(filters.date, 'yyyy-MM-dd')} | Line: {actualLineName || filters.line}</h3>
                </div>
                <div className="flex gap-4 items-center mb-4">
                    <input type="text" placeholder="Search by PO or File No" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-yellow-500" />
                    <select value={`${sortField}-${sortOrder}`} onChange={(e) => { const [field, order] = e.target.value.split('-') as [SortField, SortOrder]; setSortField(field); setSortOrder(order); }}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-yellow-500">
                        <option value="default-asc">Default Sort</option>
                        <option value="po-asc">Sort by PO (A-Z)</option>
                        <option value="po-desc">Sort by PO (Z-A)</option>
                        <option value="buyer-asc">Sort by Buyer (A-Z)</option>
                        <option value="buyer-desc">Sort by Buyer (Z-A)</option>
                    </select>
                    <button onClick={() => setShowAllRows(!showAllRows)} className={`px-4 py-2 rounded-lg transition-colors ${showAllRows ? 'bg-yellow-600' : 'bg-gray-700'}`}>
                        {showAllRows ? 'Show Active' : 'Show All'}
                    </button>
                    <button onClick={handleSummaryClick} className="px-6 py-2 bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={!filters.line}>Summary</button>
                </div>
                
                {error && <div className="text-red-500 text-center p-4 bg-red-900/20 rounded-lg mb-4">{error}</div>}
                
                {loading ? <HistoryTableSkeleton /> : (
                    <div className="overflow-auto max-h-[calc(100vh-250px)] rounded-lg border border-gray-700">
                        <table className="min-w-full bg-gray-800">
                            <thead className="bg-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Line</th>
                                    <FilterableHeader title="Buyer" column="Col_Buyer" isMenuOpen={openFilterMenu === 'Col_Buyer'} onToggleMenu={() => toggleFilterMenu('Col_Buyer')} />
                                    <FilterableHeader title="File No" column="Col_FileNo" isMenuOpen={openFilterMenu === 'Col_FileNo'} onToggleMenu={() => toggleFilterMenu('Col_FileNo')} />
                                    <FilterableHeader title="Style" column="Col_Style" isMenuOpen={openFilterMenu === 'Col_Style'} onToggleMenu={() => toggleFilterMenu('Col_Style')} />
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Order Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Prod Qty</th>
                                    <FilterableHeader title="Color" column="Col_Color" isMenuOpen={openFilterMenu === 'Col_Color'} onToggleMenu={() => toggleFilterMenu('Col_Color')} />
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">CRD</th>
                                    <FilterableHeader title="PO No" column="PO_NO" isMenuOpen={openFilterMenu === 'PO_NO'} onToggleMenu={() => toggleFilterMenu('PO_NO')} />
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Target/Day</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Start Sew</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">End Sew</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Input Module</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">QC End Line</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Hangtag</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Polybag</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Packing</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">CB Output</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedData.length === 0 ? (
                                    <tr><td colSpan={19} className="text-center py-8 text-gray-400">No data available.</td></tr>
                                ) : (
                                    filteredAndSortedData.map((row, index) => (
                                        <tr key={`${row.PO_NO}-${index}`} className={`transition-colors ${row.isActive ? 'bg-green-900/30' : 'hover:bg-gray-700'}`}>
                                            <td className="px-4 py-3 text-sm">{row.Col_Line}</td>
                                            <td className="px-4 py-3 text-sm">{row.Col_Buyer}</td>
                                            <td className="px-4 py-3 text-sm">{row.Col_FileNo}</td>
                                            <td className="px-4 py-3 text-sm">{row.Col_Style}</td>
                                            <td className="px-4 py-3 text-sm">{row.Col_OrderQty}</td>
                                            <td className="px-4 py-3 text-sm">{row.Col_ProdQty}</td>
                                            <td className="px-4 py-3 text-sm">{row.Col_Color}</td>
                                            <td className="px-4 py-3 text-sm w-[110px]">{format(new Date(row.Col_CRD), 'yyyy-MM-dd')}</td>
                                            <td className="px-4 py-3 text-sm">{row.PO_NO}</td>
                                            <td className="px-4 py-3 text-sm">{row.TargetDay}</td>
                                            <td className="px-4 py-3 text-sm">{format(new Date(row.Col_StartSew), 'yyyy-MM-dd HH:mm')}</td>
                                            <td className="px-4 py-3 text-sm">{format(new Date(row.Col_EndSew), 'yyyy-MM-dd HH:mm')}</td>
                                            <td className="px-4 py-3 text-sm">{renderProcessTotalWithPercentage(row, 'INPUT_MODULE')}</td>
                                            <td className="px-4 py-3 text-sm">{renderProcessTotalWithPercentage(row, 'QC_END_LINE')}</td>
                                            <td className="px-4 py-3 text-sm">{renderProcessTotalWithPercentage(row, 'HANGTAG')}</td>
                                            <td className="px-4 py-3 text-sm">{renderProcessTotalWithPercentage(row, 'POLYBAG')}</td>
                                            <td className="px-4 py-3 text-sm">{renderProcessTotalWithPercentage(row, 'PACKING')}</td>
                                            <td className="px-4 py-3 text-sm">{row.CB_Output}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <button onClick={() => handleRowClick(row)} className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm">Input</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {selectedRow && (
                <Modal isOpen={isModalOpen} onClose={handleModalClose} data={expandedRows[getPoKey(selectedRow)] || {}} onDataChange={handleDataChange} onSaveSuccess={handleSaveSuccess}
                    poDetails={{
                        poNo: selectedRow.PO_NO || '', startSew: selectedRow.Col_StartSew, endSew: selectedRow.Col_EndSew,
                        style: selectedRow.Col_Style || '', line: selectedRow.Col_Line, color: selectedRow.Col_Color || '',
                        fileNo: selectedRow.Col_FileNo || '', crd: selectedRow.Col_CRD, detId: selectedRow.DetID,
                        targetData: parseColSizeDynamic(selectedRow.Col_Size || '').sizes,
                        sizeType: parseColSizeDynamic(selectedRow.Col_Size || '').type,
                    }}
                />
            )}
        </div>
    );
}

export default History;