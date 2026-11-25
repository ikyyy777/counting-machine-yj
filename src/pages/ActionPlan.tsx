import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ClipboardList, Search, ChevronDown, ChevronRight, Building2, GitBranch, Settings2, Layers, ArrowRightLeft, X, GripVertical, CheckCircle2, AlertCircle, Package, Hash, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  fetchActionPlanNew,
  fetchLines,
  fetchNewLayoutAct,
  fetchModuleListAct,
  splitModuleAct,
  setCurrentFactory,
  upsertActionPlanModuleSplit,
  removeFlowFromModuleAct,
  deleteSplitModuleAct,
} from '../services/api';
import { DISPLAY_FACTORY_CODES, DisplayFactoryCode, mapDisplayToApiFactory, LineResponse } from '../types/api';

type Filters = {
  Factory: DisplayFactoryCode;
  date: string;
  line: string;
};

type LoadState = {
  loading: boolean;
  error: string | null;
  data: any[];
};

type SplitRule = {
  from: string;
  parts: string[];
  style: string;
  lineCode: string;
};

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
  moduleFrom: string;
  moduleSelected: string;
  originalModule: string;
  lineCode: string;
  style: string;
  prepId?: string;
  workDate: string;
  nikIn: string;
  nikOut: string;
  mpNoIn?: string;
  mfNoIn?: string;
  pfNoIn?: string;
  sfNoIn?: string;
  flowNoIn?: string;
  mpNoOut?: string;
  mfNoOut?: string;
  pfNoOut?: string;
  sfNoOut?: string;
  flowNoOut?: string;
} | null;

type LayoutRow = {
  NIK?: string;
  E_NAME?: string;
  STYLE_NO?: string;
  LINE_CODE?: string;
  PART?: string;
  MODULE?: string;
  PROCESS_NO?: any;
  PROCESS_NAME?: string;
  EMPNO?: any;
  MP_NO?: string;
  MF_NO?: string;
  PF_NO?: string;
  SF_NO?: string;
  FLOW_NO?: string;
  INPUT_FLOW_NO?: string;
  OUTPUT_FLOW_NO?: string;
  SPLIT_MODULE?: string;
  [key: string]: any;
};

const LAYOUT_IN_COLUMNS = ['FLOW_NO_IN', 'PROCESS_NAME_IN'] as const;
const LAYOUT_OUT_COLUMNS = ['FLOW_NO_OUT', 'PROCESS_NAME_OUT'] as const;
type LayoutInColumn = typeof LAYOUT_IN_COLUMNS[number];
type LayoutOutColumn = typeof LAYOUT_OUT_COLUMNS[number];

const STICKY_LEFT_COLS = ['LINE_NAME', 'PART', 'SPLIT_MODULE', 'STYLE'] as const;
type StickyLeftCol = typeof STICKY_LEFT_COLS[number];
const STICKY_LEFT_WIDTHS: Record<StickyLeftCol, number> = {
  LINE_NAME: 120,
  PART: 140,
  SPLIT_MODULE: 200,
  STYLE: 150,
};

const getStickyLeft = (col: string) => {
  if (!STICKY_LEFT_COLS.includes(col as StickyLeftCol)) return null;
  const idx = STICKY_LEFT_COLS.indexOf(col as StickyLeftCol);
  const left = STICKY_LEFT_COLS.slice(0, idx).reduce((acc, c) => acc + STICKY_LEFT_WIDTHS[c], 0);
  return {
    left,
    width: STICKY_LEFT_WIDTHS[col as StickyLeftCol],
    isLast: col === 'STYLE',
  };
};

const normalizeModulePart = (value: any) => String(value ?? '').trim().toUpperCase();
const splitKey = (lineCode: string, style: string, moduleFrom: string) => `${String(lineCode ?? '').trim()}|${String(style ?? '').trim()}|${normalizeModulePart(moduleFrom)}`;

const formatNumber = (value: any): string => {
  if (value == null || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US');
};

const formatDateShort = (value: any): string => {
  if (!value) return '-';
  const s = String(value).slice(0, 10);
  if (s.length < 10) return s || '-';
  try {
    const d = new Date(s);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
};

const MANUAL_COLUMNS: string[] = [
  'LINE_NAME',
  'PART',
  'SPLIT_MODULE',
  'STYLE',
  'Col_CuttSchedule',
  'BUYER',
  'Col_Schedule',
  'Col_TimeETC',
  'TOTALIN',
  'TOTALOUT',
  'TOTALIN_ALL',
  'TOTALOUT_ALL',
  'Col_StartSew',
  'Col_EndSew',
  'Col_ProdQty',
  'ORD_QTY',
  'BALANCE',
  'TargetDay',
  'STOCK_QTY',
  'STOCK_DAYS',
  'BALANCE_DAYS',
  ...LAYOUT_IN_COLUMNS,
  ...LAYOUT_OUT_COLUMNS,
];

const MODULE_OPTIONS = [
  { group: 'Part', options: ['Before Former Part', 'Former Part', 'Part', 'Before Down Part', 'Down Part', 'Before Seamsealing Part', 'Seamsealing Part', 'Before Bonding Part', 'Bonding Part', 'Part Placket', 'Part Cuff', 'Part Collar'] },
  { group: 'Lining', options: ['Before Former Lining', 'Former Lining', 'Lining', 'Before Down Lining', 'Down Lining', 'Before Seamsealing Lining', 'Seamsealing Lining', 'Before Bonding Lining', 'Bonding Lining'] },
  { group: 'Hood', options: ['Before Former Hood', 'Former Hood', 'Hood', 'Before Down Hood', 'Down Hood', 'Before Seamsealing Hood', 'Seamsealing Hood', 'Before Bonding Hood', 'Bonding Hood'] },
  { group: 'Front', options: ['Before Former Front', 'Former Front', 'Front', 'Before Down Front', 'Down Front', 'Before Seamsealing Front', 'Seamsealing Front', 'Before Bonding Front', 'Bonding Front'] },
  { group: 'Backsleeve', options: ['Before Former Backsleeve', 'Former Backsleeve', 'Backsleeve', 'Before Down Backsleeve', 'Down Backsleeve', 'Before Seamsealing Backsleeve', 'Seamsealing Backsleeve', 'Before Bonding Backsleeve', 'Bonding Backsleeve'] },
  { group: 'Join', options: ['Before Former Join', 'Former Join', 'Join', 'Before Down Join', 'Down Join', 'Before Seamsealing Join', 'Seamsealing Join', 'Before Bonding Join', 'Bonding Join'] },
  { group: 'Assembly', options: ['Before Former Assembly', 'Former Assembly', 'Assembly', 'Before Down Assembly', 'Down Assembly', 'Before Seamsealing Assembly', 'Seamsealing Assembly', 'Before Bonding Assembly', 'Bonding Assembly'] },
];

const getModuleSortScore = (moduleName: string) => {
  const name = String(moduleName || '').trim().toUpperCase();
  
  for (let i = 0; i < MODULE_OPTIONS.length; i++) {
    const group = MODULE_OPTIONS[i];
    const baseScore = (i + 1) * 100;
    const optIdx = group.options.findIndex(opt => opt.toUpperCase() === name);
    if (optIdx !== -1) {
      return baseScore + optIdx;
    }
  }

  // Fallback for names not exactly matching the list
  if (name.includes('PART')) return 199;
  if (name.includes('LINING')) return 299;
  if (name.includes('HOOD')) return 399;
  if (name.includes('FRONT')) return 499;
  if (name.includes('BACKSLEEVE') || name.includes('BACK SLEEVE')) return 599;
  if (name.includes('JOIN')) return 699;
  if (name.includes('ASSEMBLY')) return 799;
  
  return 9999;
};

const COLUMN_LABELS: Record<string, string> = {
  LINE_NAME: 'Line',
  PART: 'Main Module',
  SPLIT_MODULE: 'Split Module',
  STYLE: 'Style#',
  BUYER: 'Buyer',
  Col_CuttSchedule: 'Cutt Schedule',
  Col_Schedule: 'Module Schedule',
  Col_TimeETC: 'Time ETC',
  TOTALIN: 'Total In (Today)',
  TOTALOUT: 'Total Out (Today)',
  TOTALIN_ALL: 'Total In (All)',
  TOTALOUT_ALL: 'Total Out (All)',
  Col_StartSew: 'Start Sew',
  Col_EndSew: 'End Sew',
  Col_ProdQty: 'Prod Qty',
  ORD_QTY: 'Order Qty',
  BALANCE: 'Balance',
  TargetDay: 'Target/Day',
  STOCK_QTY: 'Stock Qty',
  STOCK_DAYS: 'Stock By Target & Output',
  BALANCE_DAYS: 'Balance Days',
  FLOW_NO_IN: 'Flow',
  PROCESS_NAME_IN: 'Process Name',
  FLOW_NO_OUT: 'Flow',
  PROCESS_NAME_OUT: 'Process Name',
};

const COLUMN_ALIGNMENTS: Record<string, 'left' | 'center' | 'right'> = {
  LINE_NAME: 'center',
  PART: 'center',
  SPLIT_MODULE: 'left',
  STYLE: 'center',
  BUYER: 'center',
  Col_CuttSchedule: 'center',
  Col_Schedule: 'center',
  Col_TimeETC: 'center',
  TOTALIN: 'right',
  TOTALOUT: 'right',
  TOTALIN_ALL: 'right',
  TOTALOUT_ALL: 'right',
  Col_StartSew: 'center',
  Col_EndSew: 'center',
  Col_ProdQty: 'right',
  ORD_QTY: 'right',
  BALANCE: 'right',
  TargetDay: 'right',
  STOCK_QTY: 'right',
  STOCK_DAYS: 'right',
  BALANCE_DAYS: 'right',
  FLOW_NO_IN: 'center',
  PROCESS_NAME_IN: 'center',
  FLOW_NO_OUT: 'center',
  PROCESS_NAME_OUT: 'center',
};

const getAlignmentClass = (col: string) => {
  return COLUMN_ALIGNMENTS[col] || 'center';
};

const getFlexJustifyClass = (col: string) => {
  const align = COLUMN_ALIGNMENTS[col];
  if (align === 'left') return 'justify-start';
  if (align === 'right') return 'justify-end';
  return 'justify-center';
};

const ActionPlan: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    Factory: '' as any,
    date: new Date().toISOString().split('T')[0],
    line: '',
  });

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const topScrollInnerRef = useRef<HTMLDivElement>(null);
  const [topScrollWidth, setTopScrollWidth] = useState(0);

  const [lines, setLines] = useState<LineResponse[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [errorLines, setErrorLines] = useState<string | null>(null);

  const [state, setState] = useState<LoadState>({
    loading: false,
    error: null,
    data: [],
  });

  const [isFactoryDropdownOpen, setIsFactoryDropdownOpen] = useState(false);
  const factoryDropdownRef = useRef<HTMLDivElement>(null);

  const [editMode, setEditMode] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [splitRules, setSplitRules] = useState<Record<string, SplitRule>>({});
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitModalFrom] = useState('');
  const [splitModalStyle] = useState('');
  const [splitModalLineCode] = useState('');
  const [splitModalCount, setSplitModalCount] = useState(2);
  const [splitModalParts, setSplitModalParts] = useState<string[]>([]);
  const [layoutCache, setLayoutCache] = useState<Record<string, LayoutRow[]>>({});

  const [opModalOpen, setOpModalOpen] = useState(false);
  const [opModalLineCode, setOpModalLineCode] = useState('');
  const [opModalStyle, setOpModalStyle] = useState('');
  const [opModalPart, setOpModalPart] = useState('');
  const [opModalWorkDate, setOpModalWorkDate] = useState('');
  const [opModalNikIn, setOpModalNikIn] = useState('');
  const [opModalNikOut, setOpModalNikOut] = useState('');
  const [opModalFlowNoIn, setOpModalFlowNoIn] = useState('');
  const [opModalFlowNoOut, setOpModalFlowNoOut] = useState('');
  const [opModalSearch, setOpModalSearch] = useState('');
  const [opModalShowAll, setOpModalShowAll] = useState(false);
  const [opModalPrepId, setOpModalPrepId] = useState('');
  const [opModalLayoutData, setOpModalLayoutData] = useState<any[]>([]);
  const [loadingOpModalLayout, setLoadingOpModalLayout] = useState(false);
  const [errorOpModalLayout, setErrorOpModalLayout] = useState<string | null>(null);
  const [savingOpModal, setSavingOpModal] = useState(false);
  const [errorOpModal, setErrorOpModal] = useState<string | null>(null);

  // Delete Flow Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    flowNo: string;
    splitModule: string;
    originalModule: string;
  } | null>(null);
  const [deletingFlow, setDeletingFlow] = useState(false);
  const [deleteFlowError, setDeleteFlowError] = useState<string | null>(null);

  // Check Missing Flow Modal State
  const [checkMissingFlowModal, setCheckMissingFlowModal] = useState<{
    open: boolean;
    lineCode: string;
    style: string;
    prepId: string;
    loading: boolean;
    error: string | null;
    data: any[];
    flowGroups: { prefix: string; min: string; max: string; allFlows: string[]; missingFlows: string[]; originalFlows: string[] }[];
  }>({
    open: false,
    lineCode: '',
    style: '',
    prepId: '',
    loading: false,
    error: null,
    data: [],
    flowGroups: [],
  });

  // View Layout Modal State
  const [viewLayoutModal, setViewLayoutModal] = useState<{
    open: boolean;
    lineCode: string;
    style: string;
    prepId: string;
    loading: boolean;
    error: string | null;
    data: any[];
  }>({
    open: false,
    lineCode: '',
    style: '',
    prepId: '',
    loading: false,
    error: null,
    data: [],
  });

  // Delete Module Confirmation State
  const [deleteModuleConfirm, setDeleteModuleConfirm] = useState<{
    lineCode: string;
    styleNo: string;
    moduleName: string;
    prepId?: string;
  } | null>(null);
  const [deletingModule, setDeletingModule] = useState(false);
  const [deleteModuleError, setDeleteModuleError] = useState<string | null>(null);

  // Module Modal States
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleModalMode, setModuleModalMode] = useState<'add' | 'edit'>('add');
  const [moduleModalLineCode, setModuleModalLineCode] = useState('');
  const [moduleModalStyle, setModuleModalStyle] = useState('');
  const [moduleModalPrepId, setModuleModalPrepId] = useState('');
  const [moduleModalPart, setModuleModalPart] = useState('');
  const [moduleModalName, setModuleModalName] = useState('');
  const [moduleModalSelectedExisting, setModuleModalSelectedExisting] = useState('');
  const [moduleModalSplitCount, setModuleModalSplitCount] = useState(3);
  const [moduleModalSplitNames, setModuleModalSplitNames] = useState<string[]>(['', '', '']);

  const handleSplitCountChange = (count: number) => {
    setModuleModalSplitCount(count);
    setModuleModalSplitNames(prev => {
      const nextNames = [...prev];
      if (nextNames.length < count) {
        for (let i = nextNames.length; i < count; i++) {
          nextNames.push('');
        }
      } else if (nextNames.length > count) {
        nextNames.splice(count);
      }
      return nextNames;
    });
  };

  const [moduleModalFlowList, setModuleModalFlowList] = useState('');
  const [moduleModalSearch, setModuleModalSearch] = useState('');
  const [moduleModalModuleFilter, setModuleModalModuleFilter] = useState('');
  const [moduleModalList, setModuleModalList] = useState<string[]>([]);
  const [loadingModuleModalList, setLoadingModuleModalList] = useState(false);
  const [moduleModalLayoutData, setModuleModalLayoutData] = useState<any[]>([]);
  const [loadingModuleModalLayout, setLoadingModuleModalLayout] = useState(false);
  const [savingModuleModal, setSavingModuleModal] = useState(false);
  const [errorModuleModal, setErrorModuleModal] = useState<string | null>(null);
  const [draggedFlowIndex, setDraggedFlowIndex] = useState<number | null>(null);
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());
  const [showAllModules, setShowAllModules] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (factoryDropdownRef.current && !factoryDropdownRef.current.contains(target)) {
        setIsFactoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onWindowClick = () => setContextMenu(null);
    window.addEventListener('click', onWindowClick);
    return () => window.removeEventListener('click', onWindowClick);
  }, []);

  useEffect(() => {
    const loadLines = async () => {
      if (!filters.Factory) {
        setLines([]);
        setLoadingLines(false);
        return;
      }

      setLoadingLines(true);
      setErrorLines(null);
      try {
        const data = await fetchLines(filters.Factory);
        setLines(data);
        if (data.length > 0) {
          const firstLine = String(data[0].NOLINE);
          setFilters(prev => {
            const current = String(prev.line || '');
            const exists = data.some(l => String(l.NOLINE) === current);
            return { ...prev, line: exists ? current : firstLine };
          });
        } else {
          setFilters(prev => ({ ...prev, line: '' }));
        }
      } catch (err: any) {
        setErrorLines(err?.message || 'Failed to load lines');
      } finally {
        setLoadingLines(false);
      }
    };
    loadLines();
  }, [filters.Factory]);

  useEffect(() => {
    if (!opModalOpen || !opModalLineCode || !opModalStyle || !opModalPrepId) {
      setOpModalLayoutData([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingOpModalLayout(true);
      setErrorOpModalLayout(null);
      try {
        const data = await fetchNewLayoutAct({
          lineno: opModalLineCode,
          style: opModalStyle,
          prepId: opModalPrepId,
        });
        if (cancelled) return;
        setOpModalLayoutData(data);
      } catch (err: any) {
        if (cancelled) return;
        setErrorOpModalLayout(err?.message || 'Failed to load layout data');
        setOpModalLayoutData([]);
      } finally {
        if (!cancelled) {
          setLoadingOpModalLayout(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [opModalOpen, opModalLineCode, opModalStyle, opModalPrepId]);

  useEffect(() => {
    if (!moduleModalOpen || !moduleModalLineCode || !moduleModalStyle || !moduleModalPrepId) {
      setModuleModalLayoutData([]);
      setModuleModalList([]);
      return;
    }

    // Reset states on modal open
    setModuleModalName('');
    setModuleModalSelectedExisting('');
    setModuleModalFlowList('');
    setModuleModalSearch('');
    setModuleModalModuleFilter('');
    setErrorModuleModal(null);
    setModuleModalSplitCount(3);
    setModuleModalSplitNames(['', '', '']);

    let cancelled = false;
    (async () => {
      setLoadingModuleModalLayout(true);
      try {
        const data = await fetchNewLayoutAct({
          lineno: moduleModalLineCode,
          style: moduleModalStyle,
          prepId: moduleModalPrepId,
        });
        if (cancelled) return;
        setModuleModalLayoutData(data);
      } catch (err: any) {
        if (cancelled) return;
        setModuleModalLayoutData([]);
      } finally {
        if (!cancelled) {
          setLoadingModuleModalLayout(false);
        }
      }
    })();

    (async () => {
      setLoadingModuleModalList(true);
      try {
        const data = await fetchModuleListAct({
          lineno: moduleModalLineCode,
          style: moduleModalStyle,
          prepId: moduleModalPrepId,
        });
        if (cancelled) return;
        const names = data.map((item: any) => String(item.MODULE_NAME ?? item.module_name ?? '')).filter(Boolean);
        names.sort((a: string, b: string) => getModuleSortScore(a) - getModuleSortScore(b));
        setModuleModalList(names);
      } catch (err: any) {
        if (cancelled) return;
        setModuleModalList([]);
      } finally {
        if (!cancelled) {
          setLoadingModuleModalList(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [moduleModalOpen, moduleModalLineCode, moduleModalStyle, moduleModalPrepId, moduleModalPart]);

  const uniqueModuleModalFlows = useMemo(() => {
    const flows = new Set<string>();
    moduleModalLayoutData.forEach((item: any) => {
      if (item.FLOW_NO) {
        String(item.FLOW_NO).split(',').forEach(f => {
          const trimmed = f.trim();
          if (trimmed) flows.add(trimmed);
        });
      }
      if (item.INPUT_FLOW_NO) {
        String(item.INPUT_FLOW_NO).split(',').forEach(f => {
          const trimmed = f.trim();
          if (trimmed) flows.add(trimmed);
        });
      }
      if (item.OUTPUT_FLOW_NO) {
        String(item.OUTPUT_FLOW_NO).split(',').forEach(f => {
          const trimmed = f.trim();
          if (trimmed) flows.add(trimmed);
        });
      }
    });
    return Array.from(flows).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [moduleModalLayoutData]);

  const handleFlowDragStart = (index: number) => {
    setDraggedFlowIndex(index);
  };

  const handleFlowDrop = (index: number) => {
    if (draggedFlowIndex === null) return;
    const flows = moduleModalFlowList
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    if (draggedFlowIndex === index) return;

    const reordered = [...flows];
    const [removed] = reordered.splice(draggedFlowIndex, 1);
    reordered.splice(index, 0, removed);

    setModuleModalFlowList(reordered.join(', '));
    setDraggedFlowIndex(null);
  };

  const handleFlowDragEnd = () => {
    setDraggedFlowIndex(null);
  };

  const handleDeleteFlow = (flowToDelete: string) => {
    const flows = moduleModalFlowList
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const updated = flows.filter(f => f !== flowToDelete.toUpperCase());
    setModuleModalFlowList(updated.join(', '));
  };

  const computedModuleModalInOut = useMemo(() => {
    const listParts = moduleModalFlowList
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    return {
      input: listParts.length > 0 ? listParts[0] : '',
      output: listParts.length > 0 ? listParts[listParts.length - 1] : '',
      list: listParts,
    };
  }, [moduleModalFlowList]);

  const uniqueModulesInLayout = useMemo(() => {
    const mods = new Set<string>();
    moduleModalLayoutData.forEach((item: any) => {
      const mod = String(item.SPLIT_MODULE ?? item.MODULE ?? item.PART ?? '').trim();
      if (mod) mods.add(mod);
    });
    return Array.from(mods).sort((a, b) => getModuleSortScore(a) - getModuleSortScore(b));
  }, [moduleModalLayoutData]);

  const groupedAndFilteredModuleFlows = useMemo(() => {
    const groupedByNik: Record<string, any> = {};
    let emptyNikCounter = 0;

    moduleModalLayoutData.forEach((item: any) => {
      let key = String(item.NIK ?? '').trim();
      if (!key) {
        emptyNikCounter++;
        key = `__empty_nik_${emptyNikCounter}`;
      }

      const modVal = String(item.SPLIT_MODULE ?? item.MODULE ?? item.PART ?? '').trim();

      if (!groupedByNik[key]) {
        groupedByNik[key] = {
          NIK: item.NIK ?? '',
          E_NAME: item.E_NAME ?? '',
          EMPNO: item.EMPNO ?? '',
          ITEMS: [{
            PROCESS_NAME: item.PROCESS_NAME || '',
            FLOW_NO: item.FLOW_NO || '',
            SPLIT_MODULE: modVal,
          }]
        };
      } else {
        groupedByNik[key].ITEMS.push({
          PROCESS_NAME: item.PROCESS_NAME || '',
          FLOW_NO: item.FLOW_NO || '',
          SPLIT_MODULE: modVal,
        });
      }
    });

    const list = Object.values(groupedByNik);

    const byModule = moduleModalModuleFilter
      ? list.map(group => {
        const filteredItems = group.ITEMS.filter((item: any) =>
          String(item.SPLIT_MODULE ?? '').toUpperCase() === moduleModalModuleFilter.toUpperCase()
        );
        return { ...group, ITEMS: filteredItems };
      }).filter(group => group.ITEMS.length > 0)
      : list;

    const q = moduleModalSearch.trim().toLowerCase();
    if (q) {
      return byModule.map(group => {
        const filteredItems = group.ITEMS.filter((item: any) => {
          const proc = String(item.PROCESS_NAME ?? '').toLowerCase();
          const mod = String(item.SPLIT_MODULE ?? '').toLowerCase();
          const flow = String(item.FLOW_NO ?? '').toLowerCase();
          return proc.includes(q) || mod.includes(q) || flow.includes(q);
        });
        const nik = String(group.NIK ?? '').toLowerCase();
        const name = String(group.E_NAME ?? '').toLowerCase();
        const matchOperator = nik.includes(q) || name.includes(q);

        if (matchOperator) {
          return group;
        } else {
          return { ...group, ITEMS: filteredItems };
        }
      }).filter(group => group.ITEMS.length > 0);
    }

    return byModule;
  }, [moduleModalLayoutData, moduleModalModuleFilter, moduleModalSearch]);

  // Pre-populate when an existing module is selected to be edited
  useEffect(() => {
    if (moduleModalOpen && moduleModalMode === 'edit' && moduleModalSelectedExisting && moduleModalLayoutData.length > 0) {
      const partNorm = normalizeModulePart(moduleModalSelectedExisting);
      const matchingRows = moduleModalLayoutData.filter(r => {
        const modVal = normalizeModulePart(r?.SPLIT_MODULE ?? r?.ORIGINAL_MODULE ?? r?.MODULE ?? r?.PART);
        return modVal === partNorm;
      });

      const flows = new Set<string>();

      matchingRows.forEach((r: any) => {
        if (r.FLOW_NO) {
          String(r.FLOW_NO).split(',').forEach(f => {
            const trimmed = f.trim();
            if (trimmed) flows.add(trimmed);
          });
        }
      });

      setModuleModalFlowList(Array.from(flows).join(', '));
    } else {
      setModuleModalFlowList('');
    }
  }, [moduleModalOpen, moduleModalMode, moduleModalSelectedExisting, moduleModalLayoutData]);

  const handleFactoryChange = (code: DisplayFactoryCode) => {
    const apiFactory = mapDisplayToApiFactory(code);
    setCurrentFactory(apiFactory);
    setFilters(prev => ({ ...prev, Factory: code, line: '' }));
  };

  const handleLookup = async () => {
    setState({ loading: true, error: null, data: [] });
    try {
      const resp = await fetchActionPlanNew({
        factory: filters.Factory,
        workdate: filters.date,
        lineno: String(filters.line || ''),
      });

      // resp is the full response object { status, total_styles, data: [...] }
      const envelope = resp as any;
      const status = String(envelope?.status ?? '').toLowerCase();
      if (status && status !== 'success') {
        setState({ loading: false, error: envelope?.message || 'Failed to load action plan', data: [] });
        return;
      }

      const styles: any[] = Array.isArray(envelope?.data) ? envelope.data : (Array.isArray(resp) ? resp : []);

      // Fetch all module lists concurrently to detect newly split but empty modules
      const moduleListPromises = styles.map(async (style) => {
        const styleNo = String(style?.style_no ?? '');
        const lineCode = String(style?.line_code ?? filters.line ?? '');
        const prepId = String(style?.prep_id ?? '');
        try {
          if (!lineCode || !styleNo || !prepId) return { styleNo, data: [] };
          const data = await fetchModuleListAct({ lineno: lineCode, style: styleNo, prepId });
          return { styleNo, data };
        } catch {
          return { styleNo, data: [] };
        }
      });
      const moduleListResults = await Promise.all(moduleListPromises);
      const moduleListMap = new Map(moduleListResults.map(r => [r.styleNo, r.data]));

      // Flatten styles → modules into rows the table can render
      const rows: any[] = [];
      for (const style of styles) {
        const styleNo = String(style?.style_no ?? '');
        const lineCode = String(style?.line_code ?? filters.line ?? '');
        const prepId = String(style?.prep_id ?? '');
        const modules: any[] = Array.isArray(style?.modules) ? style.modules : [];

        const existingModules = new Set<string>();
        let firstRowLineName = '';

        for (const module of modules) {
          const raw = module?.raw_data ?? {};
          if (!firstRowLineName) firstRowLineName = String(raw.LINE_NAME ?? '');
          
          const modName = String(module?.display_module ?? module?.main_module ?? raw.DISPLAY_MODULE ?? raw.MAIN_MODULE ?? '').trim();
          if (modName) existingModules.add(modName.toUpperCase());

          rows.push({
            LINE_NAME: String(raw.LINE_NAME),
            LINE_CODE: lineCode,
            PART: String(module?.main_module ?? raw.MAIN_MODULE ?? modName).trim(),
            SPLIT_MODULE: (() => {
              const v = String(raw.SPLIT_MODULE ?? module?.subpart_nm ?? '').trim();
              return v === '-' ? '' : v;
            })(),
            STYLE: styleNo,
            STYLE_NAME: '',
            BUYER: '',
            Col_CuttSchedule: '',
            Col_Schedule: '',
            Col_TimeETC: '',
            TOTALIN: Number(module?.today_in_cb_qty ?? raw.TODAY_IN_CB_QTY ?? 0),
            TOTALOUT: Number(module?.today_out_cb_qty ?? raw.TODAY_OUT_CB_QTY ?? 0),
            TOTALIN_ALL: Number(module?.totalin_all ?? raw.TOTALIN_ALL ?? 0),
            TOTALOUT_ALL: Number(module?.totalout_all ?? raw.TOTALOUT_ALL ?? 0),
            Col_StartSew: String(module?.sch_start_sew ?? raw.SCH_START_SEW ?? '').slice(0, 10),
            Col_EndSew: String(module?.sch_end_sew ?? raw.SCH_END_SEW ?? '').slice(0, 10),
            Col_ProdQty: Number(module?.sch_prod_qty ?? raw.SCH_PROD_QTY ?? 0),
            ORD_QTY: Number(module?.sch_ord_qty ?? raw.SCH_ORD_QTY ?? 0),
            BALANCE: Number(module?.balance ?? raw.BALANCE ?? 0),
            TargetDay: Number(module?.prod_target_day ?? raw.PROD_TARGET_DAY ?? 0),
            STOCK_QTY: Number(module?.stock_qty ?? raw.STOCK_QTY ?? 0),
            STOCK_DAYS: Number(module?.stock_days ?? raw.STOCK_DAYS ?? 0),
            BALANCE_DAYS: Number(module?.balance_days ?? raw.BALANCE_DAYS ?? 0),
            WORK_DATE: filters.date,
            // Layout IN (from module data)
            NIK_IN: String(module?.empno_in ?? raw.EMPNO_IN ?? ''),
            FLOW_NO_IN: String(module?.input_flow_no ?? raw.INPUT_FLOW_NO ?? ''),
            PROCESS_NAME_IN: String(raw.INPUT_FLOW_NO_PROCESS_NAME ?? ''),
            // Layout OUT (from module data)
            NIK_OUT: String(module?.empno_out ?? raw.EMPNO_OUT ?? ''),
            FLOW_NO_OUT: String(module?.output_flow_no ?? raw.OUTPUT_FLOW_NO ?? ''),
            PROCESS_NAME_OUT: String(raw.OUTPUT_FLOW_NO_PROCESS_NAME ?? ''),
            PREP_ID: prepId,
            ORIGINAL_MODULE: String(module?.main_module ?? raw.MAIN_MODULE ?? ''),
            __operators: [],
            __raw: raw,
          });
        }

        // Add missing split modules
        const additionalModulesData = moduleListMap.get(styleNo) || [];
        for (const item of additionalModulesData) {
          const modName = String(item.MODULE_NAME ?? item.module_name ?? '').trim();
          if (modName && !existingModules.has(modName.toUpperCase())) {
            rows.push({
              LINE_NAME: firstRowLineName,
              LINE_CODE: lineCode,
              PART: modName,
              STYLE: styleNo,
              STYLE_NAME: '',
              BUYER: '',
              Col_CuttSchedule: '',
              Col_Schedule: '',
              Col_TimeETC: '',
              TOTALIN: 0,
              TOTALOUT: 0,
              TOTALIN_ALL: 0,
              TOTALOUT_ALL: 0,
              Col_StartSew: '',
              Col_EndSew: '',
              Col_ProdQty: 0,
              ORD_QTY: 0,
              BALANCE: 0,
              TargetDay: 0,
              STOCK_QTY: 0,
              STOCK_DAYS: 0,
              BALANCE_DAYS: 0,
              WORK_DATE: filters.date,
              NIK_IN: '',
              FLOW_NO_IN: '',
              PROCESS_NAME_IN: '',
              NIK_OUT: '',
              FLOW_NO_OUT: '',
              PROCESS_NAME_OUT: '',
              PREP_ID: prepId,
              ORIGINAL_MODULE: '__NEW_SPLIT__',
              __operators: [],
              __raw: {},
              __localEmpty: true,
            });
            existingModules.add(modName.toUpperCase());
          }
        }
      }

      setState({ loading: false, error: null, data: rows });
    } catch (e: any) {
      setState({ loading: false, error: e?.message || 'Failed to load action plan', data: [] });
    }
  };

  const handleCheckMissingFlow = async (lineCode: string, style: string, prepId: string) => {
    setCheckMissingFlowModal(prev => ({
      ...prev,
      open: true,
      lineCode,
      style,
      prepId,
      loading: true,
      error: null,
      data: [],
      flowGroups: [],
    }));

    try {
      const data = await fetchNewLayoutAct({
        lineno: lineCode,
        style,
        prepId,
      });

      // Extract all FLOW_NO values
      const allFlows: string[] = [];
      data.forEach((item: any) => {
        if (item.FLOW_NO) {
          String(item.FLOW_NO).split(',').forEach(f => {
            const trimmed = f.trim();
            if (trimmed) allFlows.push(trimmed);
          });
        }
        if (item.INPUT_FLOW_NO) {
          String(item.INPUT_FLOW_NO).split(',').forEach(f => {
            const trimmed = f.trim();
            if (trimmed) allFlows.push(trimmed);
          });
        }
        if (item.OUTPUT_FLOW_NO) {
          String(item.OUTPUT_FLOW_NO).split(',').forEach(f => {
            const trimmed = f.trim();
            if (trimmed) allFlows.push(trimmed);
          });
        }
      });

      // Group flows by prefix (e.g., "L" from "L1", "L2", "BB3_SFD3", etc.)
      // Handle flows with suffixes like "BB3_SFD3" - extract the number part
      const flowGroupsMap: Record<string, { numbers: number[]; originalFlows: string[] }> = {};
      allFlows.forEach(flow => {
        // Strip .D (case-insensitive) to treat duplicate flows as the base flow
        const cleanFlow = flow.replace(/\.D/gi, '');
        // Match pattern like "BB1", "BB2", "BB3_SFD3", "L1", "L2", etc.
        const match = cleanFlow.match(/^([A-Za-z]+)(\d+)(?:_[A-Za-z0-9]+)?$/);
        if (match) {
          const prefix = match[1];
          const num = parseInt(match[2], 10);
          if (!flowGroupsMap[prefix]) {
            flowGroupsMap[prefix] = { numbers: [], originalFlows: [] };
          }
          flowGroupsMap[prefix].numbers.push(num);
          flowGroupsMap[prefix].originalFlows.push(flow);
        }
      });

      // Build flow groups with all flows (present and missing)
      const flowGroups: { prefix: string; min: string; max: string; allFlows: string[]; missingFlows: string[]; originalFlows: string[] }[] = [];
      Object.entries(flowGroupsMap).forEach(([prefix, { numbers, originalFlows }]) => {
        if (numbers.length === 0) return;
        
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        const allFlowsInSequence: string[] = [];
        const missingFlows: string[] = [];

        for (let i = min; i <= max; i++) {
          const flowName = `${prefix}${i}`;
          allFlowsInSequence.push(flowName);
          if (!numbers.includes(i)) {
            missingFlows.push(flowName);
          }
        }

        // Sort original flows by their numeric part
        const sortedOriginalFlows = [...originalFlows].sort((a, b) => {
          const cleanA = a.replace(/\.D/gi, '');
          const cleanB = b.replace(/\.D/gi, '');
          const matchA = cleanA.match(/^([A-Za-z]+)(\d+)(?:_[A-Za-z0-9]+)?$/);
          const matchB = cleanB.match(/^([A-Za-z]+)(\d+)(?:_[A-Za-z0-9]+)?$/);
          if (matchA && matchB) {
            const numA = parseInt(matchA[2], 10);
            const numB = parseInt(matchB[2], 10);
            return numA - numB;
          }
          return a.localeCompare(b);
        });

        flowGroups.push({
          prefix,
          min: `${prefix}${min}`,
          max: `${prefix}${max}`,
          allFlows: allFlowsInSequence,
          missingFlows,
          originalFlows: sortedOriginalFlows,
        });
      });

      // Sort flow groups by prefix
      flowGroups.sort((a, b) => a.prefix.localeCompare(b.prefix));

      setCheckMissingFlowModal(prev => ({
        ...prev,
        loading: false,
        data,
        flowGroups,
      }));
    } catch (err: any) {
      setCheckMissingFlowModal(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to check missing flows',
        data: [],
        flowGroups: [],
      }));
    }
  };

  const handleViewLayout = async (lineCode: string, style: string, prepId: string) => {
    setViewLayoutModal(prev => ({
      ...prev,
      open: true,
      lineCode,
      style,
      prepId,
      loading: true,
      error: null,
      data: [],
    }));

    try {
      const data = await fetchNewLayoutAct({
        lineno: lineCode,
        style,
        prepId,
      });

      setViewLayoutModal(prev => ({
        ...prev,
        loading: false,
        data,
      }));
    } catch (err: any) {
      setViewLayoutModal(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Failed to load layout',
        data: [],
      }));
    }
  };

  const columns = useMemo(() => {
    const first = state.data && state.data.length > 0 ? state.data[0] : null;
    if (!first || typeof first !== 'object') return MANUAL_COLUMNS;
    const keys = new Set(Object.keys(first));
    return MANUAL_COLUMNS.filter(c => {
      if (keys.has(c)) return true;
      if (c === 'TOTALIN') return keys.has('TODAY_IN_CB_QTY');
      if (c === 'TOTALOUT') return keys.has('TODAY_OUT_CB_QTY');
      return false;
    });
  }, [state.data]);

  const hasLayoutColumns = useMemo(() => {
    const keys = new Set(columns);
    return LAYOUT_IN_COLUMNS.some(c => keys.has(c)) || LAYOUT_OUT_COLUMNS.some(c => keys.has(c));
  }, [columns]);

  const baseColumns = useMemo(() => {
    const layout = new Set<string>([...LAYOUT_IN_COLUMNS, ...LAYOUT_OUT_COLUMNS]);
    return columns.filter(c => !layout.has(c));
  }, [columns]);

  const formatCell = (value: any): React.ReactNode => {
    if (value == null || value === '') return <span className="text-slate-500">-</span>;

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-500">-</span>;
      return (
        <div className="flex flex-wrap gap-1.5 max-w-[360px]">
          {value.slice(0, 20).map((v, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-xs bg-slate-700/70 text-slate-200 border border-slate-600 whitespace-nowrap"
              title={String(v)}
            >
              {String(v)}
            </span>
          ))}
          {value.length > 20 && (
            <span className="px-2 py-0.5 rounded-md text-xs bg-slate-700/40 text-slate-300 border border-slate-600">
              +{value.length - 20} more
            </span>
          )}
        </div>
      );
    }

    const text = String(value);
    if (text.length > 60) {
      return <span className="whitespace-normal break-words" title={text}>{text}</span>;
    }
    return <span className="whitespace-nowrap" title={text}>{text}</span>;
  };

  const groupedRows = useMemo(() => {
    const srcRows = Array.isArray(state.data) ? state.data : [];

    const expandedRows = srcRows.flatMap((r) => {
      const part = normalizeModulePart(r?.PART);
      const lineCode = String(r?.LINE_CODE ?? filters.line ?? '').trim();
      const style = String(r?.STYLE ?? '').trim();
      const key = splitKey(lineCode, style, part);
      const rule = splitRules[key];
      if (!rule || !Array.isArray(rule.parts) || rule.parts.length === 0) {
        const prepId = String((r as any)?.PREP_ID ?? '').trim();
        const layoutKey = `${lineCode}|${style}|${prepId}`;
        const layoutRows = layoutCache[layoutKey];
        if (layoutRows && layoutRows.length > 0) {
          const moduleRows = layoutRows.filter(x =>
            normalizeModulePart(
              (x as any)?.SPLIT_MODULE ??
              (x as any)?.split_module ??
              (x as any)?.MODULE ??
              (x as any)?.PART ??
              (x as any)?.module ??
              (x as any)?.part
            ) === part
          );
          if (moduleRows.length > 0) {
            let inputFlow = '';
            let outputFlow = '';
            moduleRows.forEach((row: any) => {
              const inVal = row.INPUT_FLOW_NO ?? row.input_flow_no;
              const outVal = row.OUTPUT_FLOW_NO ?? row.output_flow_no;
              if (inVal && !inputFlow) inputFlow = String(inVal).trim();
              if (outVal && !outputFlow) outputFlow = String(outVal).trim();
            });

            const rowIn = moduleRows.find(x => String(x.FLOW_NO ?? x.flow_no ?? '').trim() === inputFlow);
            const rowOut = moduleRows.find(x => String(x.FLOW_NO ?? x.flow_no ?? '').trim() === outputFlow);

            const nikIn = rowIn ? String(rowIn.NIK ?? rowIn.nik ?? '').trim() : '';
            const nikOut = rowOut ? String(rowOut.NIK ?? rowOut.nik ?? '').trim() : '';

            const processIn = rowIn ? String(rowIn.PROCESS_NAME ?? rowIn.process_name ?? '').trim() : '';
            const processOut = rowOut ? String(rowOut.PROCESS_NAME ?? rowOut.process_name ?? '').trim() : '';

            return [{
              ...r,
              FLOW_NO_IN: inputFlow || r.FLOW_NO_IN,
              FLOW_NO_OUT: outputFlow || r.FLOW_NO_OUT,
              NIK_IN: nikIn || r.NIK_IN,
              NIK_OUT: nikOut || r.NIK_OUT,
              PROCESS_NAME_IN: processIn || r.PROCESS_NAME_IN,
              PROCESS_NAME_OUT: processOut || r.PROCESS_NAME_OUT,
            }];
          }
        }
        return [r];
      }

      const prepId = String((r as any)?.PREP_ID ?? '').trim();
      const layoutKey = `${lineCode}|${style}|${prepId}`;
      const layoutRows = layoutCache[layoutKey] || [];
      const moduleRows = layoutRows.filter(x =>
        normalizeModulePart(
          (x as any)?.SPLIT_MODULE ??
          (x as any)?.split_module ??
          (x as any)?.MODULE ??
          (x as any)?.PART ??
          (x as any)?.module ??
          (x as any)?.part
        ) === part
      );

      const empNos = moduleRows
        .map(x => Number((x as any)?.EMPNO))
        .filter(n => !isNaN(n));
      const minEmp = empNos.length ? Math.min(...empNos) : null;
      const maxEmp = empNos.length ? Math.max(...empNos) : null;

      const nikIn = minEmp == null ? '' : moduleRows.filter(x => Number((x as any)?.EMPNO) === minEmp).map(x => String((x as any)?.NIK ?? '').trim()).filter(Boolean).join(', ');
      const nikOut = maxEmp == null ? '' : moduleRows.filter(x => Number((x as any)?.EMPNO) === maxEmp).map(x => String((x as any)?.NIK ?? '').trim()).filter(Boolean).join(', ');

      const processIn = minEmp == null ? '' : String(moduleRows.find(x => Number((x as any)?.EMPNO) === minEmp)?.PROCESS_NAME ?? '');
      const processOut = maxEmp == null ? '' : String(moduleRows.find(x => Number((x as any)?.EMPNO) === maxEmp)?.PROCESS_NAME ?? '');

      const layoutAgg = (emp: number | null, col: keyof LayoutRow) => {
        if (emp == null) return '';
        const vals = moduleRows
          .filter(x => Number((x as any)?.EMPNO) === emp)
          .map(x => String((x as any)?.[col] ?? '').trim())
          .filter(Boolean);
        return Array.from(new Set(vals)).join(', ');
      };

      return rule.parts.map((p, idx) => {
        if (idx === 0) {
          return { ...r, PART: p, __splitFrom: part };
        }

        const emptyRow: any = {
          LINE_NAME: r?.LINE_NAME,
          PART: p,
          STYLE: r?.STYLE,
          WORK_DATE: r?.WORK_DATE,
          LINE_CODE: r?.LINE_CODE,
          NIK_IN: nikIn,
          NIK_OUT: nikOut,
          PROCESS_NAME_IN: processIn,
          PROCESS_NAME_OUT: processOut,
          FLOW_NO_IN: layoutAgg(minEmp, 'FLOW_NO'),
          FLOW_NO_OUT: layoutAgg(maxEmp, 'FLOW_NO'),
          __localEmpty: true,
          __splitFrom: part,
        };
        return emptyRow;
      });
    });

    const rows = expandedRows;
    const map = new Map<string, any[]>();
    rows.forEach((r) => {
      const style = String(r?.STYLE ?? '').trim() || '(No Style)';
      const bucket = map.get(style) || [];
      bucket.push(r);
      map.set(style, bucket);
    });
    return Array.from(map.entries()).map(([style, items]) => {
      const sortedItems = [...items].sort((a, b) => getModuleSortScore(a?.PART) - getModuleSortScore(b?.PART));
      return { style, items: sortedItems };
    });
  }, [state.data, splitRules, layoutCache, filters.line]);

  useEffect(() => {
    const unique = new Set<string>();
    (Array.isArray(state.data) ? state.data : []).forEach(r => {
      const lineCode = String(r?.LINE_CODE ?? filters.line ?? '').trim();
      const style = String(r?.STYLE ?? '').trim();
      const prepId = String((r as any)?.PREP_ID ?? '').trim();
      if (lineCode && style && prepId) unique.add(`${lineCode}|${style}|${prepId}`);
    });

    const missing = Array.from(unique).filter(k => layoutCache[k] == null);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const k of missing) {
        const [lineCode, style, prepId] = k.split('|');
        try {
          const rows = await fetchNewLayoutAct({ lineno: lineCode, style, prepId });
          if (cancelled) return;
          setLayoutCache(prev => ({ ...prev, [k]: rows as any }));
        } catch {
          if (cancelled) return;
          setLayoutCache(prev => ({ ...prev, [k]: [] }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.data, filters.line, layoutCache]);


  const inputClasses = "px-3.5 py-2.5 border border-slate-600/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-slate-800/80 text-gray-100 shadow-sm transition-all duration-200 hover:border-slate-500/60";
  const labelClasses = "text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-gray-950 flex flex-col">
      {/* ── Header ── */}
      <div className="glass sticky top-0 z-40 border-b border-slate-700/40 shadow-lg shadow-black/20">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 py-4">
            {/* Title */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-glow-blue">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Action Plan
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Production monitoring & module management</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex-1 flex flex-wrap items-end justify-end gap-3 lg:gap-4">
              {/* Date */}
              <div className="glass-light rounded-xl px-3.5 py-3 min-w-[160px]">
                <label className={labelClasses}>
                  <Calendar className="w-3 h-3 inline-block mr-1 -mt-0.5 text-blue-400" />
                  Date
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                  className={inputClasses + ' w-full'}
                />
              </div>

              {/* Factory */}
              <div className="glass-light rounded-xl px-3.5 py-3 min-w-[180px] relative" ref={factoryDropdownRef}>
                <label className={labelClasses}>
                  <Building2 className="w-3 h-3 inline-block mr-1 -mt-0.5 text-blue-400" />
                  Factory
                </label>
                <button
                  type="button"
                  onClick={() => setIsFactoryDropdownOpen(v => !v)}
                  className={`${inputClasses} w-full text-left flex justify-between items-center gap-2`}
                >
                  <span className="truncate">{filters.Factory || 'Select Factory'}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isFactoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isFactoryDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in-up">
                    {DISPLAY_FACTORY_CODES.map(code => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          handleFactoryChange(code);
                          setIsFactoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center gap-2 ${code === filters.Factory
                          ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-400'
                          : 'text-gray-300 hover:bg-slate-700/60 border-l-2 border-transparent'
                          }`}
                      >
                        {code === filters.Factory && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        <span className={code === filters.Factory ? '' : 'ml-5'}>{code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Line */}
              <div className="glass-light rounded-xl px-3.5 py-3 min-w-[180px]">
                <label className={labelClasses}>
                  <GitBranch className="w-3 h-3 inline-block mr-1 -mt-0.5 text-blue-400" />
                  Line
                </label>
                <select
                  value={filters.line}
                  onChange={(e) => setFilters(prev => ({ ...prev, line: e.target.value }))}
                  className={`${inputClasses} w-full`}
                >
                  {lines.map(l => (
                    <option key={l.NOLINE} value={String(l.NOLINE)}>
                      {l.LINE}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-end gap-2.5 pb-0.5">
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={state.loading || loadingLines || !!errorLines}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 inline-flex items-center gap-2 active:scale-[0.98]"
                >
                  <Search className="w-4 h-4" />
                  {state.loading ? 'Loading...' : 'Lookup'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAllModules(v => !v)}
                  className="px-5 py-2.5 rounded-lg transition-all duration-200 font-semibold text-sm inline-flex items-center gap-2 active:scale-[0.98] bg-indigo-700/40 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40"
                >
                  {showAllModules ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAllModules ? 'Hide Sub Modules' : 'Show All Modules'}
                </button>
                {/* tombol edit - hidden sementara */}
                {/* <button
                  type="button"
                  onClick={() => {
                    setEditMode(v => !v);
                    setContextMenu(null);
                  }}
                  className={`relative px-5 py-2.5 rounded-lg transition-all duration-200 font-semibold text-sm inline-flex items-center gap-2 active:scale-[0.98] ${editMode
                    ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-700/70 hover:bg-slate-600/80 text-slate-300 hover:text-white border border-slate-600/50'
                    }`}
                >
                  <Settings2 className="w-4 h-4" />
                  {editMode ? 'Edit: ON' : 'Edit'}
                  {editMode && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse-subtle shadow-glow-emerald" />
                  )}
                </button> */}
              </div>
            </div>
          </div>
          {errorLines && (
            <div className="pb-3 flex items-center gap-2 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm text-red-300">{errorLines}</span>
            </div>
          )}
        </div>
      </div>

      <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-5 lg:py-6 max-w-full mx-auto">
        <div ref={tableScrollRef} className="overflow-auto max-h-[calc(100vh-200px)] custom-scrollbar space-y-4">

          {/* Loading State */}
          {state.loading && (
            <div className="style-card animate-fade-in-up">
              <div className="px-6 py-16 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 border-[3px] border-blue-500/30 rounded-full"></div>
                    <div className="absolute inset-0 w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">Loading action plan data...</p>
                    <p className="text-xs text-slate-500 mt-1">This may take up to 1 minute</p>
                  </div>
                  <div className="w-full max-w-2xl space-y-2 mt-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3">
                        <div className="skeleton-shimmer h-8 flex-[2]"></div>
                        <div className="skeleton-shimmer h-8 flex-[3]"></div>
                        <div className="skeleton-shimmer h-8 flex-1"></div>
                        <div className="skeleton-shimmer h-8 flex-1"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {!state.loading && state.error && (
            <div className="style-card animate-fade-in-up">
              <div className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-300">Failed to load data</p>
                    <p className="text-xs text-red-400/70 mt-1 max-w-md">{state.error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data — Hybrid Card-Table per Style Group */}
          {!state.loading && !state.error && state.data && state.data.length > 0 && (
            groupedRows.map((g) => {
              // Filter items based on ASSEMBLY position
              const allModuleNames = g.items.map(row => String(row?.PART ?? ''));
              let assemblyIdx = -1;
              for (let i = allModuleNames.length - 1; i >= 0; i--) {
                if (allModuleNames[i].toUpperCase().includes('ASSEMBLY')) {
                  assemblyIdx = i;
                  break;
                }
              }
              const visibleItems = !showAllModules && assemblyIdx !== -1
                ? g.items.slice(0, assemblyIdx + 1)
                : g.items;
              const hiddenCount = g.items.length - visibleItems.length;
              const isCollapsed = collapsedCards.has(g.style);
              const toggleCollapse = () => {
                setCollapsedCards(prev => {
                  const next = new Set(prev);
                  if (next.has(g.style)) {
                    next.delete(g.style);
                  } else {
                    next.add(g.style);
                  }
                  return next;
                });
              };

              // Row-level constants
              const NUMERIC_COLS = new Set(['TOTALIN', 'TOTALOUT', 'TOTALIN_ALL', 'TOTALOUT_ALL', 'Col_ProdQty', 'ORD_QTY', 'BALANCE', 'TargetDay', 'STOCK_QTY', 'STOCK_DAYS', 'BALANCE_DAYS']);
              const DATE_COLS = new Set(['Col_CuttSchedule', 'Col_Schedule', 'Col_StartSew', 'Col_EndSew']);

              return (
                <div key={g.style} className="style-card animate-fade-in-up">
                  {/* Card Header */}
                  <div className="style-card-header px-5 py-3 flex items-center gap-3" onClick={toggleCollapse}>
                    <div className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500"></div>
                    <Package className="w-4 h-4 text-blue-400/70" />
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Style</span>
                    <span className="text-sm font-bold text-blue-300">{g.style}</span>
                    <div className="ml-auto flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const prepId = g.items[0]?.PREP_ID || '';
                          const lineCode = g.items[0]?.LINE_CODE || filters.line;
                          handleViewLayout(lineCode, g.style, prepId);
                        }}
                        className="text-[10px] font-medium text-blue-300 px-2.5 py-1 bg-blue-700/30 rounded-full border border-blue-600/30 hover:bg-blue-700/50 transition-colors"
                      >
                        View Layout
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const prepId = g.items[0]?.PREP_ID || '';
                          const lineCode = g.items[0]?.LINE_CODE || filters.line;
                          handleCheckMissingFlow(lineCode, g.style, prepId);
                        }}
                        className="text-[10px] font-medium text-emerald-300 px-2.5 py-1 bg-emerald-700/30 rounded-full border border-emerald-600/30 hover:bg-emerald-700/50 transition-colors"
                      >
                        Check Missing Flow
                      </button>
                      <span className="text-[10px] font-medium text-slate-400 px-2.5 py-1 bg-slate-700/50 rounded-full border border-slate-600/30">
                        {visibleItems.length} {visibleItems.length === 1 ? 'module' : 'modules'}
                        {hiddenCount > 0 && (
                          <span className="ml-1 text-indigo-400">(+{hiddenCount} hidden)</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Card Body — Compact Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-slate-800/60">
                            {baseColumns.map((c) => {
                              const sticky = getStickyLeft(c);
                              const className = `px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 ${sticky ? 'sticky bg-[#1e293b] z-20' : 'bg-[#151f32]'} ${sticky ? 'border-r border-slate-700/40' : ''} ${sticky?.isLast ? 'frozen-shadow border-r-2 border-slate-600/50' : ''}`;
                              const style = sticky ? ({ left: sticky.left, minWidth: sticky.width, width: sticky.width, maxWidth: sticky.width } as React.CSSProperties) : undefined;
                              return (
                                <th key={c} rowSpan={2} className={className} style={style}>
                                  {COLUMN_LABELS[c] ?? c}
                                </th>
                              );
                            })}
                            {hasLayoutColumns && (
                              <>
                                <th colSpan={2} className="px-4 py-2 text-[10px] font-bold text-emerald-400 uppercase tracking-wider text-center border-b border-slate-700/60 border-l border-emerald-500/15 bg-emerald-500/[0.05]">
                                  Layout (Input)
                                </th>
                                <th colSpan={2} className="px-4 py-2 text-[10px] font-bold text-amber-400 uppercase tracking-wider text-center border-b border-slate-700/60 border-l-2 border-amber-500/20 bg-amber-500/[0.05]">
                                  Layout (Output)
                                </th>
                              </>
                            )}
                          </tr>
                          {hasLayoutColumns && (
                            <tr className="bg-slate-800/60">
                              {LAYOUT_IN_COLUMNS.map((c) => {
                                return (
                                  <th key={c} className={`px-4 py-1.5 text-[9px] font-bold text-emerald-400/70 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 border-l border-emerald-500/15 bg-emerald-500/[0.02]`}>
                                    {COLUMN_LABELS[c] ?? c}
                                  </th>
                                );
                              })}
                              {LAYOUT_OUT_COLUMNS.map((c, i) => {
                                return (
                                  <th key={c} className={`px-4 py-1.5 text-[9px] font-bold text-amber-400/70 uppercase tracking-wider whitespace-nowrap text-center border-b border-slate-700/60 bg-amber-500/[0.02] ${i === 0 ? 'border-l-2 border-amber-500/20' : 'border-l border-amber-500/15'}`}>
                                    {COLUMN_LABELS[c] ?? c}
                                  </th>
                                );
                              })}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                        {(() => {
                          // Pre-compute rowSpans for PART (main module) column
                          const partRowSpans: number[] = new Array(visibleItems.length).fill(0);
                          for (let i = 0; i < visibleItems.length; i++) {
                            const mainModule = String(visibleItems[i]?.PART ?? '');
                            if (i === 0 || String(visibleItems[i - 1]?.PART ?? '') !== mainModule) {
                              let span = 1;
                              for (let j = i + 1; j < visibleItems.length; j++) {
                                if (String(visibleItems[j]?.PART ?? '') === mainModule) span++;
                                else break;
                              }
                              partRowSpans[i] = span;
                            }
                          }

                          return visibleItems.map((row, idx) => (
                            <tr
                              key={`${g.style}-${idx}`}
                              className={`compact-row table-row-accent ${idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/[0.15]'}`}
                            >
                              {baseColumns.map((c) => {
                                let val = row?.[c];

                                if (c === 'TOTALIN') {
                                  val = row?.TODAY_IN_CB_QTY ?? row?.TOTALIN;
                                }

                                if (c === 'TOTALOUT') {
                                  val = row?.TODAY_OUT_CB_QTY ?? row?.TOTALOUT;
                                }

                                if (c === 'STOCK_DAYS' && val != null && !isNaN(Number(val))) {
                                  val = Number(val).toFixed(1);
                                }

                                const sticky = getStickyLeft(c);
                                const stickyBg = idx % 2 === 0 ? 'bg-[#0f172a]' : 'bg-[#131c2e]';
                                const alignClass = getAlignmentClass(c);
                                const className = `px-4 py-2 text-[13px] text-slate-300 whitespace-nowrap text-${alignClass} border-b border-slate-800/40 ${sticky ? `sticky ${stickyBg} z-10 border-r border-slate-800/60` : ''} ${sticky?.isLast ? 'frozen-shadow border-r-2 border-slate-700/50' : ''}`;
                                const stickyStyle = sticky ? ({ left: sticky.left, minWidth: sticky.width, width: sticky.width, maxWidth: sticky.width } as React.CSSProperties) : undefined;

                                if (c === 'PART') {
                                  const partRowSpan = partRowSpans[idx];
                                  // Skip if this cell is merged into the row above
                                  if (partRowSpan === 0) return null;

                                  const partKey = normalizeModulePart(val);
                                  const lineCode = String(row?.LINE_CODE ?? filters.line ?? '').trim();
                                  const styleNo = String(row?.STYLE ?? '').trim();
                                  const onContextMenu = (e: React.MouseEvent) => {
                                    if (!editMode) return;
                                    e.preventDefault();

                                    const splitFrom = normalizeModulePart((row as any)?.__splitFrom);
                                    const root = splitFrom || partKey;
                                    setContextMenu({
                                      open: true,
                                      x: e.clientX,
                                      y: e.clientY,
                                      moduleFrom: root,
                                      moduleSelected: partKey,
                                      originalModule: normalizeModulePart(row?.ORIGINAL_MODULE ?? ''),
                                      lineCode,
                                      style: styleNo,
                                      prepId: String((row as any)?.PREP_ID ?? ''),
                                      workDate: String(row?.WORK_DATE ?? filters.date ?? '').slice(0, 10),
                                      nikIn: String(row?.NIK_IN ?? ''),
                                      nikOut: String(row?.NIK_OUT ?? ''),
                                      flowNoIn: String((row as any)?.FLOW_NO_IN ?? ''),
                                      flowNoOut: String((row as any)?.FLOW_NO_OUT ?? ''),
                                    });
                                  };

                                  const splitFrom = normalizeModulePart((row as any)?.__splitFrom);
                                  const isSplitRow = !!splitFrom;
                                  const displayValue = String(val ?? '');

                                  const onRename = (newName: string) => {
                                    const key = splitFrom || partKey;
                                    if (!key) return;
                                    setSplitRules(prev => {
                                      const rule = prev[splitKey(lineCode, styleNo, key)];
                                      if (!rule) return prev;
                                      const nextParts = rule.parts.map(p => (p === displayValue ? newName : p));
                                      return { ...prev, [splitKey(lineCode, styleNo, key)]: { ...rule, parts: nextParts } };
                                    });
                                  };

                                  const justifyClass = getFlexJustifyClass(c);

                                  const verticalAlign = partRowSpan > 1 ? 'align-top' : 'align-middle';

                                  return (
                                    <td key={c} rowSpan={partRowSpan} className={`${className} ${verticalAlign} ${editMode ? 'cursor-context-menu' : ''}`} style={stickyStyle} onContextMenu={onContextMenu}>
                                      <div className={`flex items-center ${justifyClass} gap-2`}>
                                        {editMode && isSplitRow ? (
                                          <input
                                            value={displayValue}
                                            onChange={(e) => onRename(e.target.value)}
                                            className="w-full min-w-[130px] px-2 py-1 rounded-md border border-slate-600/50 bg-slate-900/80 text-slate-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                          />
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/8 text-blue-300 text-[13px] font-medium">
                                            <Layers className="w-3 h-3 text-blue-400/50" />
                                            {String(val ?? '') || '-'}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                }

                                if (c === 'SPLIT_MODULE') {
                                  const splitModuleVal = String(row?.SPLIT_MODULE ?? '').trim();
                                  return (
                                    <td key={c} className={`px-4 py-2 text-[13px] whitespace-nowrap text-left border-b border-slate-800/40 sticky ${stickyBg} z-10 border-r border-slate-800/40`} style={stickyStyle}>
                                      {splitModuleVal ? (
                                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-200">
                                          {splitModuleVal}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600">-</span>
                                      )}
                                    </td>
                                  );
                                }

                                // Numeric columns
                                if (NUMERIC_COLS.has(c)) {
                                  const numVal = Number(val);
                                  const isNeg = !isNaN(numVal) && numVal < 0;
                                  const isBalance = c === 'BALANCE';
                                  const isStockDays = c === 'STOCK_DAYS' || c === 'BALANCE_DAYS';
                                  const lowStock = isStockDays && !isNaN(numVal) && numVal < 1 && numVal >= 0;
                                  let textColor = 'text-slate-200';
                                  if (isBalance && isNeg) textColor = 'text-red-400 font-semibold';
                                  else if (lowStock) textColor = 'text-amber-400';
                                  else if (c === 'TargetDay' || c === 'Col_ProdQty') textColor = 'text-emerald-300/90';

                                  return (
                                    <td key={c} className={`${className} tabular-nums`} style={stickyStyle}>
                                      <span className={textColor}>{formatNumber(val)}</span>
                                    </td>
                                  );
                                }

                                // Date columns
                                if (DATE_COLS.has(c)) {
                                  return (
                                    <td key={c} className={className} style={stickyStyle}>
                                      <span className="text-slate-400 text-[12px]">{formatDateShort(val)}</span>
                                    </td>
                                  );
                                }

                                return (
                                  <td key={c} className={className} style={stickyStyle}>
                                    {formatCell(val)}
                                  </td>
                                );
                              })}

                              {hasLayoutColumns && (
                                <>
                                  {(LAYOUT_IN_COLUMNS as unknown as LayoutInColumn[]).map((c) => {
                                    const alignClass = getAlignmentClass(c);
                                    return (
                                      <td key={c} className={`px-4 py-2 text-[13px] text-emerald-300/70 text-${alignClass} border-b border-slate-800/40 border-l border-emerald-500/10 whitespace-nowrap`}>
                                        {formatCell(row?.[c])}
                                      </td>
                                    );
                                  })}
                                  {(LAYOUT_OUT_COLUMNS as unknown as LayoutOutColumn[]).map((c, i) => {
                                    const alignClass = getAlignmentClass(c);
                                    return (
                                      <td key={c} className={`px-4 py-2 text-[13px] text-amber-300/70 text-${alignClass} border-b border-slate-800/40 whitespace-nowrap ${i === 0 ? 'border-l-2 border-amber-500/15' : 'border-l border-amber-500/10'}`}>
                                        {formatCell(row?.[c])}
                                      </td>
                                    );
                                  })}
                                </>
                              )}
                            </tr>
                          ));
                        })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Empty State */}
          {!state.loading && !state.error && (!state.data || state.data.length === 0) && (
            <div className="style-card animate-fade-in-up">
              <div className="px-6 py-20 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center border border-slate-700/40">
                    <ClipboardList className="w-7 h-7 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">No data to display</p>
                    <p className="text-xs text-slate-500 mt-1">Select filters and click <strong className="text-blue-400">Lookup</strong> to load action plan data</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {contextMenu?.open && (
        <div
          className="fixed z-[9999] min-w-[200px] bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-in-up"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-slate-700/50">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Module Actions</p>
          </div>
          <button
            type="button"
            className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-blue-500/10 hover:text-blue-300 border-b border-slate-800/50 transition-all duration-150 flex items-center gap-2.5"
            onClick={() => {
              setSavingOpModal(false);
              setErrorOpModal(null);
              setOpModalLineCode(contextMenu.lineCode);
              setOpModalStyle(contextMenu.style);
              setOpModalPrepId(contextMenu.prepId || '');
              setOpModalPart(contextMenu.moduleSelected);
              setOpModalWorkDate(contextMenu.workDate || filters.date);
              setOpModalNikIn(contextMenu.nikIn);
              setOpModalNikOut(contextMenu.nikOut);
              setOpModalFlowNoIn(String(contextMenu.flowNoIn ?? ''));
              setOpModalFlowNoOut(String(contextMenu.flowNoOut ?? ''));
              setOpModalSearch('');
              setOpModalShowAll(false);
              setOpModalOpen(true);
              setContextMenu(null);
            }}
          >
            <Settings2 className="w-4 h-4 text-blue-400/70" />
            Edit Layout
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-blue-500/10 hover:text-blue-300 transition-all duration-150 flex items-center gap-2.5 border-b border-slate-800/50"
            onClick={() => {
              setModuleModalLineCode(contextMenu.lineCode);
              setModuleModalStyle(contextMenu.style);
              setModuleModalPrepId(contextMenu.prepId || '');
              setModuleModalPart(contextMenu.moduleSelected);
              setModuleModalMode('add');
              setModuleModalName('');
              setModuleModalSelectedExisting('');
              setModuleModalOpen(true);
              setContextMenu(null);
            }}
          >
            <Layers className="w-4 h-4 text-indigo-400/70" />
            Add/Edit Module
          </button>
          {(() => {
            const isOriginal = normalizeModulePart(contextMenu.moduleSelected) === normalizeModulePart(contextMenu.originalModule);
            return (
              <button
                type="button"
                disabled={isOriginal}
                className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center gap-2.5 ${isOriginal
                  ? 'text-slate-500 bg-slate-800/10 cursor-not-allowed opacity-50'
                  : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                  }`}
                onClick={() => {
                  if (isOriginal) return;
                  setDeleteModuleError(null);
                  setDeleteModuleConfirm({
                    lineCode: contextMenu.lineCode,
                    styleNo: contextMenu.style,
                    moduleName: contextMenu.moduleSelected,
                    prepId: contextMenu.prepId,
                  });
                  setContextMenu(null);
                }}
                title={isOriginal ? "Cannot delete original module" : "Delete Module"}
              >
                <Trash2 className={`w-4 h-4 ${isOriginal ? 'text-slate-600' : 'text-red-400/70'}`} />
                Delete Module
              </button>
            );
          })()}
        </div>
      )}

      {splitModalOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop-in">
          <div className="w-full max-w-xl bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-2xl shadow-2xl shadow-black/40 animate-modal-in">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <GitBranch className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-sm font-semibold text-slate-200">Split Module</div>
              <div className="text-xs text-slate-500 ml-1">from</div>
              <div className="text-xs font-mono text-blue-300 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">{splitModalFrom}</div>
              <button
                type="button"
                className="ml-auto w-7 h-7 rounded-lg hover:bg-slate-700/60 flex items-center justify-center transition-colors"
                onClick={() => setSplitModalOpen(false)}
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Split count</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={splitModalCount}
                  onChange={(e) => {
                    const next = Math.max(2, Math.min(10, Number(e.target.value || 2)));
                    setSplitModalCount(next);
                    setSplitModalParts((prev) => {
                      const base = prev.length ? prev : [splitModalFrom];
                      const out = Array.from({ length: next }, (_, i) => base[i] ?? (i === 0 ? splitModalFrom : `${splitModalFrom}_${i}`));
                      return out;
                    });
                  }}
                  className="w-24 px-3 py-2 rounded-lg border border-slate-600/50 bg-slate-950/80 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                />
                <div className="text-xs text-slate-500">Rename each part below</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {splitModalParts.map((p, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Part {i + 1}
                    </div>
                    <input
                      value={p}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSplitModalParts(prev => prev.map((x, idx) => (idx === i ? v : x)));
                      }}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-600/50 bg-slate-950/80 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-700/50 flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-white transition-all duration-200 text-sm font-medium border border-slate-600/30"
                onClick={() => setSplitModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 text-sm font-semibold shadow-lg shadow-blue-500/20"
                onClick={async () => {
                  const from = normalizeModulePart(splitModalFrom);
                  const parts = splitModalParts.map(p => String(p ?? '').trim()).filter(Boolean);
                  if (!from || parts.length < 2) {
                    setSplitModalOpen(false);
                    return;
                  }

                  const key = splitKey(splitModalLineCode, splitModalStyle, from);
                  setSplitRules(prev => ({
                    ...prev,
                    [key]: {
                      from,
                      parts,
                      style: splitModalStyle,
                      lineCode: splitModalLineCode,
                    },
                  }));

                  try {
                    const lineCode = String(splitModalLineCode || '').trim();
                    const styleNo = String(splitModalStyle || '').trim();
                    if (lineCode && styleNo) {
                      await upsertActionPlanModuleSplit({
                        factory: filters.Factory,
                        lineCode,
                        styleNo,
                        moduleFrom: from,
                        moduleList: parts,
                        updatedBy: '',
                      });
                    }
                  } catch (e) {
                    // keep local split even if persistence fails
                  } finally {
                    setSplitModalOpen(false);
                  }
                }}
              >
                Apply Split
              </button>
            </div>
          </div>
        </div>
      )}

      {opModalOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop-in">
          <div className="w-full max-w-[96vw] h-[92vh] bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-modal-in">
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Settings2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-sm font-semibold text-slate-200">Operator Override</div>
              <div className="text-xs text-slate-500 ml-1">Part:</div>
              <div className="text-xs font-mono text-blue-300 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">{opModalPart}</div>
              <button
                type="button"
                className="ml-auto w-7 h-7 rounded-lg hover:bg-slate-700/60 flex items-center justify-center transition-colors"
                onClick={() => setOpModalOpen(false)}
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {(() => {
              const groupedByNik: Record<string, any> = {};
              let emptyNikCounter = 0;

              opModalLayoutData.forEach((item: any) => {
                let key = String(item.NIK ?? '').trim();
                if (!key) {
                  emptyNikCounter++;
                  key = `__empty_nik_${emptyNikCounter}`;
                }

                const origModVal = item.ORIGINAL_MODULE || item.MODULE || item.PART || '';

                if (!groupedByNik[key]) {
                  groupedByNik[key] = {
                    NIK: item.NIK ?? '',
                    E_NAME: item.E_NAME ?? '',
                    EMPNO: item.EMPNO ?? '',
                    ITEMS: [{
                      PROCESS_NAME: item.PROCESS_NAME || '',
                      FLOW_NO: item.FLOW_NO || '',
                      SPLIT_MODULE: item.SPLIT_MODULE || '',
                      ORIGINAL_MODULE: origModVal,
                    }]
                  };
                } else {
                  groupedByNik[key].ITEMS.push({
                    PROCESS_NAME: item.PROCESS_NAME || '',
                    FLOW_NO: item.FLOW_NO || '',
                    SPLIT_MODULE: item.SPLIT_MODULE || '',
                    ORIGINAL_MODULE: origModVal,
                  });
                }
              });

              const groupedRaw = Object.values(groupedByNik);
              const partNorm = normalizeModulePart(opModalPart);

              const byPart = groupedRaw.filter(group => {
                return group.ITEMS.some((item: any) => normalizeModulePart(item.SPLIT_MODULE) === partNorm);
              });
              const list = opModalShowAll ? groupedRaw : (byPart.length ? byPart : groupedRaw);

              const q = opModalSearch.trim().toLowerCase();
              const filtered = q
                ? list.filter(group => {
                  const nik = String(group.NIK ?? '').toLowerCase();
                  const name = String(group.E_NAME ?? '').toLowerCase();
                  const matchProcess = group.ITEMS.some((item: any) => String(item.PROCESS_NAME ?? '').toLowerCase().includes(q));
                  const matchModule = group.ITEMS.some((item: any) => String(item.SPLIT_MODULE ?? '').toLowerCase().includes(q));
                  const matchFlow = group.ITEMS.some((item: any) => String(item.FLOW_NO ?? '').toLowerCase().includes(q));
                  return nik.includes(q) || name.includes(q) || matchProcess || matchModule || matchFlow;
                })
                : list;

              return (
                <>
                  <div className="px-5 pt-4">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2.5 flex items-center gap-1.5">
                      <Search className="w-3 h-3" />
                      Pick Operator From Layout
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={opModalSearch}
                        onChange={(e) => setOpModalSearch(e.target.value)}
                        placeholder="Search NIK / Name / Process / Flow"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-600/50 bg-slate-950/80 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                      />
                    </div>
                    <label className="mt-2.5 inline-flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer hover:text-slate-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={opModalShowAll}
                        onChange={(e) => setOpModalShowAll(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 cursor-pointer"
                      />
                      Show all operators (all modules)
                    </label>
                  </div>

                  <div className="px-5 pt-3 flex-1 min-h-0 overflow-auto">
                    <div className="h-full overflow-auto rounded-md border border-slate-700">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs text-slate-400">NIK</th>
                            <th className="px-3 py-2 text-left text-xs text-slate-400">Name</th>
                            <th className="px-3 py-2 text-left text-xs text-slate-400">EmpNo</th>
                            <th className="px-3 py-2 text-left text-xs text-slate-400">Process</th>
                            <th className="px-3 py-2 text-left text-xs text-slate-400">Module</th>
                            <th className="px-3 py-2 text-left text-xs text-slate-400">Flow</th>
                            <th className="px-3 py-2 text-center text-xs text-slate-400">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingOpModalLayout ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                  <span>Loading layout data...</span>
                                </div>
                              </td>
                            </tr>
                          ) : errorOpModalLayout ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-3 text-red-400 text-sm">
                                {errorOpModalLayout}
                              </td>
                            </tr>
                          ) : filtered.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-3 py-3 text-slate-500 text-sm">
                                No operator found.
                              </td>
                            </tr>
                          ) : (
                            filtered.flatMap((group, gIdx) => {
                              const items = group.ITEMS || [];
                              if (items.length === 0) {
                                return (
                                  <tr key={`${group.NIK}-${gIdx}`} className="border-b border-slate-800/80 hover:bg-slate-800/50">
                                    <td className="px-3 py-2 font-mono text-slate-200 whitespace-nowrap border-r border-slate-800/80">{group.NIK || '-'}</td>
                                    <td className="px-3 py-2 text-slate-200 whitespace-nowrap border-r border-slate-800/80">{group.E_NAME || '-'}</td>
                                    <td className="px-3 py-2 text-slate-200 whitespace-nowrap border-r border-slate-800/80">{group.EMPNO || '-'}</td>
                                    <td className="px-3 py-2 text-slate-300 border-r border-slate-800/80">-</td>
                                    <td className="px-3 py-2 text-slate-200 border-r border-slate-800/80">-</td>
                                    <td className="px-3 py-2 text-slate-300 border-r border-slate-800/80">-</td>
                                    <td className="px-3 py-2 text-right pr-6 align-middle">-</td>
                                  </tr>
                                );
                              }
                              return items.map((item: any, iIdx: number) => {
                                return (
                                  <tr key={`${group.NIK}-${gIdx}-${iIdx}`} className="border-b border-slate-800/80 hover:bg-slate-800/50">
                                    {iIdx === 0 && (
                                      <>
                                        <td rowSpan={items.length} className="px-3 py-2 font-mono text-slate-200 whitespace-nowrap align-middle border-r border-slate-800/80">{group.NIK || '-'}</td>
                                        <td rowSpan={items.length} className="px-3 py-2 text-slate-200 whitespace-nowrap align-middle border-r border-slate-800/80">{group.E_NAME || '-'}</td>
                                        <td rowSpan={items.length} className="px-3 py-2 text-slate-200 whitespace-nowrap align-middle border-r border-slate-800/80">{group.EMPNO || '-'}</td>
                                      </>
                                    )}
                                    <td className="px-3 py-2 text-slate-300 align-middle border-r border-slate-800/80 whitespace-normal">
                                      {item.PROCESS_NAME ? `${iIdx + 1}. ${item.PROCESS_NAME}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-slate-200 align-middle border-r border-slate-800/80 whitespace-normal">{item.SPLIT_MODULE || '-'}</td>
                                    <td className="px-3 py-2 align-middle border-r border-slate-800/80">
                                      {item.FLOW_NO ? (
                                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold border bg-slate-850 text-slate-400 border-slate-700">
                                          {item.FLOW_NO}
                                        </span>
                                      ) : '-'}
                                    </td>
                                    <td className="px-3 py-2 align-middle">
                                      <div className="flex justify-between items-center w-full min-w-[145px]">
                                        <div className="flex gap-1.5">
                                          <button
                                            type="button"
                                            className="px-1.5 py-0.5 rounded bg-blue-600/80 text-white text-[10px] font-medium hover:bg-blue-700 transition-colors"
                                            disabled={!group.NIK}
                                            onClick={() => {
                                              setOpModalNikIn(group.NIK);
                                              setOpModalFlowNoIn(item.FLOW_NO);
                                            }}
                                          >
                                            Set IN
                                          </button>
                                          <button
                                            type="button"
                                            className="px-1.5 py-0.5 rounded bg-indigo-600/80 text-white text-[10px] font-medium hover:bg-indigo-700 transition-colors"
                                            disabled={!group.NIK}
                                            onClick={() => {
                                              setOpModalNikOut(group.NIK);
                                              setOpModalFlowNoOut(item.FLOW_NO);
                                            }}
                                          >
                                            Set OUT
                                          </button>
                                        </div>
                                        {(() => {
                                          const splitVal = String(item.SPLIT_MODULE ?? '').trim().toUpperCase();
                                          const origVal = String(item.ORIGINAL_MODULE ?? '').trim().toUpperCase();
                                          const isFlowSplit = splitVal && origVal && splitVal !== origVal;

                                          if (isFlowSplit) {
                                            return (
                                              <button
                                                type="button"
                                                className="p-1 rounded-md bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 hover:border-red-600 transition-all duration-150 flex items-center justify-center animate-fade-in-up"
                                                title="Remove flow from module (revert to original module)"
                                                disabled={!item.FLOW_NO}
                                                onClick={() => {
                                                  setDeleteFlowError(null);
                                                  setDeleteConfirm({
                                                    flowNo: item.FLOW_NO,
                                                    splitModule: splitVal,
                                                    originalModule: origVal,
                                                  });
                                                }}
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            );
                                          }
                                          return <div className="w-[26px]" />;
                                        })()}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-semibold flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" />
                          IN (Layout Codes)
                        </div>
                        <input
                          value={opModalFlowNoIn || '-'}
                          readOnly
                          className="w-full px-3 py-2.5 rounded-lg border border-emerald-500/20 bg-slate-950/60 text-emerald-300 text-sm font-mono font-bold"
                        />
                        <div className="text-xs text-slate-500">NIK: <span className="font-mono text-slate-300">{opModalNikIn || '-'}</span></div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-amber-400/80 font-semibold flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3" />
                          OUT (Layout Codes)
                        </div>
                        <input
                          value={opModalFlowNoOut || '-'}
                          readOnly
                          className="w-full px-3 py-2.5 rounded-lg border border-amber-500/20 bg-slate-950/60 text-amber-300 text-sm font-mono font-bold"
                        />
                        <div className="text-xs text-slate-500">NIK: <span className="font-mono text-slate-300">{opModalNikOut || '-'}</span></div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      Work Date: <span className="font-mono text-slate-300">{opModalWorkDate}</span>
                    </div>
                  </div>
                </>
              );
            })()}

            {errorOpModal && (
              <div className="px-5 pt-2">
                <div className="text-xs text-red-400 bg-red-950/30 p-3 rounded-lg border border-red-800/30 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errorOpModal}
                </div>
              </div>
            )}

            <div className="px-5 py-4 border-t border-slate-700/50 flex items-center justify-end gap-3 mt-auto">
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-white transition-all duration-200 text-sm font-medium border border-slate-600/30"
                onClick={() => setOpModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 text-sm font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={savingOpModal || !opModalFlowNoIn.trim() || !opModalFlowNoOut.trim()}
                onClick={async () => {
                  setSavingOpModal(true);
                  setErrorOpModal(null);
                  try {
                    const partNorm = normalizeModulePart(opModalPart);
                    const matchingRows = opModalLayoutData.filter(r => {
                      const modVal = normalizeModulePart(r?.SPLIT_MODULE ?? r?.ORIGINAL_MODULE ?? r?.MODULE ?? r?.PART);
                      return modVal === partNorm;
                    });
                    const flows = new Set<string>();
                    matchingRows.forEach((r: any) => {
                      if (r.FLOW_NO) {
                        String(r.FLOW_NO).split(',').forEach(f => {
                          const trimmed = f.trim();
                          if (trimmed) flows.add(trimmed);
                        });
                      }
                    });
                    if (opModalFlowNoIn) flows.add(opModalFlowNoIn);
                    if (opModalFlowNoOut) flows.add(opModalFlowNoOut);
                    const flowListStr = Array.from(flows).join(', ');

                    const res = await splitModuleAct({
                      lineCode: opModalLineCode,
                      styleNo: opModalStyle,
                      moduleName: opModalPart.trim(),
                      inputFlowNo: opModalFlowNoIn.trim(),
                      outputFlowNo: opModalFlowNoOut.trim(),
                      flowList: flowListStr,
                    });

                    const ok = String(res?.status ?? '').toLowerCase() === 'success';
                    if (ok) {
                      await handleLookup();
                      const key = `${opModalLineCode.trim()}|${opModalStyle.trim()}|${opModalPrepId.trim()}`;
                      setLayoutCache((prev) => {
                        const copy = { ...prev };
                        delete copy[key];
                        return copy;
                      });
                      setOpModalOpen(false);
                    } else {
                      setErrorOpModal(res?.message || 'Failed to save flow configuration');
                    }
                  } catch (err: any) {
                    setErrorOpModal(err?.message || 'Failed to save flow configuration');
                  } finally {
                    setSavingOpModal(false);
                  }
                }}
              >
                {savingOpModal ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {moduleModalOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-backdrop-in">
          <div className="w-full max-w-[96vw] h-[92vh] bg-slate-900/95 backdrop-blur-xl border border-slate-600/50 rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-modal-in">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Layers className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-sm font-semibold text-slate-200">Add/Edit Module Layout</div>
              <span className="text-xs font-mono text-indigo-300 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">{moduleModalPart}</span>
              <div className="text-xs text-slate-500 ml-1">Style:</div>
              <div className="text-xs font-mono text-blue-300 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">{moduleModalStyle}</div>
              <button
                type="button"
                className="ml-auto w-7 h-7 rounded-lg hover:bg-slate-700/60 flex items-center justify-center transition-colors"
                onClick={() => setModuleModalOpen(false)}
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-700/40">
              <button
                type="button"
                className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all duration-200 ${moduleModalMode === 'add'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300 bg-transparent'
                  }`}
                onClick={() => {
                  setModuleModalMode('add');
                  setModuleModalName('');
                  setModuleModalFlowList('');
                  setModuleModalSearch('');
                  setModuleModalModuleFilter('');
                  setErrorModuleModal(null);
                  setModuleModalSplitCount(3);
                  setModuleModalSplitNames(['', '', '']);
                }}
              >
                Add / Split Module
              </button>
              <button
                type="button"
                className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all duration-200 ${moduleModalMode === 'edit'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-300 bg-transparent'
                  }`}
                onClick={() => {
                  setModuleModalMode('edit');
                  setModuleModalSelectedExisting('');
                  setModuleModalFlowList('');
                  setModuleModalSearch('');
                  setModuleModalModuleFilter('');
                  setErrorModuleModal(null);
                }}
              >
                Edit Existing Module
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 flex flex-col flex-1 min-h-0 overflow-hidden">
              {moduleModalMode === 'add' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-slate-800/20 p-4 rounded-xl border border-slate-700/30">
                    <div className="space-y-1">
                      <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                        How many modules to split into?
                      </label>
                      <p className="text-[11px] text-slate-500">Choose split count (creates multiple empty modules)</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={moduleModalSplitCount}
                      onChange={(e) => {
                        const count = Math.max(1, Math.min(10, Number(e.target.value || 3)));
                        handleSplitCountChange(count);
                      }}
                      className="w-20 px-3 py-2 rounded-lg border border-slate-600/50 bg-slate-950/80 text-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-center"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                      Module Names <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[30vh] overflow-y-auto p-1">
                      {moduleModalSplitNames.map((name, idx) => (
                        <div key={idx} className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-medium">Module Name {idx + 1}</span>
                          <select
                            value={name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setModuleModalSplitNames(prev => prev.map((x, i) => i === idx ? val : x));
                              
                              // Check if duplicate with existing ones
                              const exists = moduleModalList.some(
                                (m) => m.trim().toUpperCase() === val.trim().toUpperCase()
                              );
                              if (exists && val.trim() !== '') {
                                setErrorModuleModal(`Module "${val}" already exists! Please use "Edit Existing Module" tab or choose another name.`);
                              } else {
                                setErrorModuleModal(null);
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-600/50 bg-slate-950/80 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                          >
                            <option value="">-- Select Module Name --</option>
                            {MODULE_OPTIONS.map((group) => (
                              <optgroup key={group.group} label={group.group}>
                                {group.options.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    Select Existing Module <span className="text-red-400">*</span>
                  </label>
                  {loadingModuleModalList ? (
                    <div className="text-xs text-slate-500 italic flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      Loading module list...
                    </div>
                  ) : (
                    <select
                      value={moduleModalSelectedExisting}
                      onChange={(e) => setModuleModalSelectedExisting(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-600/50 bg-slate-950/80 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                    >
                      <option value="">-- Choose Module --</option>
                      {moduleModalList.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              {/* Flow List Selection Grid */}
              {moduleModalMode === 'edit' && (
                <div className="space-y-2.5 flex flex-col flex-1 min-h-0">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      Flow List & Processes (Pilih flow yang masuk modul ini)
                    </label>
                  <button
                    type="button"
                    onClick={() => setModuleModalFlowList('')}
                    className="text-xs text-blue-400 hover:underline font-medium"
                  >
                    Clear All
                  </button>
                </div>

                {loadingModuleModalLayout ? (
                  <div className="text-xs text-slate-400 italic py-4 text-center">
                    <div className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2 align-middle"></div>
                    Loading layout flows...
                  </div>
                ) : uniqueModuleModalFlows.length > 0 ? (
                  <div className="flex-1 min-h-0 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1 flex gap-2">
                        <input
                          value={moduleModalSearch}
                          onChange={(e) => setModuleModalSearch(e.target.value)}
                          placeholder="Search Flow, Process, Module, NIK or Name..."
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-600/50 bg-slate-950/80 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                        />
                        {moduleModalSearch && (
                          <button
                            type="button"
                            onClick={() => setModuleModalSearch('')}
                            className="px-3 py-1.5 bg-slate-800/80 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-slate-200 text-xs font-medium transition-all duration-200 border border-slate-700/30"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <select
                        value={moduleModalModuleFilter}
                        onChange={(e) => setModuleModalModuleFilter(e.target.value)}
                        className="px-3.5 py-2.5 rounded-lg border border-slate-600/50 bg-slate-950/80 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 min-w-[150px]"
                      >
                        <option value="">Filter Module (All)</option>
                        {uniqueModulesInLayout.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 min-h-0 overflow-auto rounded-md border border-slate-700">
                      {groupedAndFilteredModuleFlows.length === 0 ? (
                        <div className="text-xs text-slate-500 italic p-8 text-center">
                          No flows match active filters.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse text-sm">
                          <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 z-10">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">NIK</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">Name</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">EmpNo</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">Process</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">Module</th>
                              <th className="px-3 py-2 text-left text-xs text-slate-400">Flow</th>
                              <th className="px-3 py-2 text-right text-xs text-slate-400 pr-6">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80">
                            {groupedAndFilteredModuleFlows.flatMap((group, gIdx) => {
                              const items = group.ITEMS || [];
                              return items.map((item: any, iIdx: number) => {
                                const listParts = moduleModalFlowList
                                  .split(',')
                                  .map((s) => s.trim().toUpperCase())
                                  .filter(Boolean);
                                const flow = String(item.FLOW_NO ?? '').trim();
                                const isSelected = flow ? listParts.includes(flow.toUpperCase()) : false;

                                return (
                                  <tr
                                    key={`${group.NIK}-${gIdx}-${iIdx}`}
                                    onClick={() => {
                                      if (!flow) return;
                                      let nextParts;
                                      if (isSelected) {
                                        nextParts = listParts.filter((p) => p !== flow.toUpperCase());
                                      } else {
                                        nextParts = [...listParts, flow.toUpperCase()];
                                      }
                                      setModuleModalFlowList(nextParts.join(', '));
                                    }}
                                    className={`cursor-pointer border-b border-slate-800/80 hover:bg-slate-800/50 transition-colors ${isSelected ? 'bg-blue-950/20 hover:bg-blue-950/30' : ''
                                      }`}
                                  >
                                    {iIdx === 0 && (
                                      <>
                                        <td rowSpan={items.length} className="px-3 py-2 font-mono text-slate-200 whitespace-nowrap align-middle border-r border-slate-800/80">{group.NIK || '-'}</td>
                                        <td rowSpan={items.length} className="px-3 py-2 text-slate-200 whitespace-nowrap align-middle border-r border-slate-800/80">{group.E_NAME || '-'}</td>
                                        <td rowSpan={items.length} className="px-3 py-2 text-slate-200 whitespace-nowrap align-middle border-r border-slate-800/80">{group.EMPNO || '-'}</td>
                                      </>
                                    )}
                                    <td className="px-3 py-2 text-slate-300 align-middle border-r border-slate-800/80 whitespace-normal font-normal">
                                      {item.PROCESS_NAME ? `${iIdx + 1}. ${item.PROCESS_NAME}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-slate-200 align-middle border-r border-slate-800/80 whitespace-normal font-medium">
                                      {item.SPLIT_MODULE || '-'}
                                    </td>
                                    <td className="px-3 py-2 align-middle border-r border-slate-800/80">
                                      {flow ? (
                                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${isSelected
                                          ? 'bg-blue-900/60 text-blue-300 border-blue-800'
                                          : 'bg-slate-850 text-slate-400 border-slate-700'
                                          }`}>
                                          {flow}
                                        </span>
                                      ) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right pr-6 align-middle" onClick={(e) => e.stopPropagation()}>
                                      {flow ? (
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {
                                            let nextParts;
                                            if (isSelected) {
                                              nextParts = listParts.filter((p) => p !== flow.toUpperCase());
                                            } else {
                                              nextParts = [...listParts, flow.toUpperCase()];
                                            }
                                            setModuleModalFlowList(nextParts.join(', '));
                                          }}
                                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer"
                                        />
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              });
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg border border-slate-800">
                    No flow numbers found on this layout to select.
                  </div>
                )}
              </div>
              )}

              {/* Automatic Input, Output & Selected Flows Summary */}
              {moduleModalMode === 'edit' && moduleModalFlowList.trim() && (
                <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 uppercase font-semibold block">Input Flow</span>
                      <span className="font-mono text-emerald-400 font-bold text-sm mt-0.5 block">{computedModuleModalInOut.input || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-semibold block">Output Flow</span>
                      <span className="font-mono text-amber-400 font-bold text-sm mt-0.5 block">{computedModuleModalInOut.output || '-'}</span>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-500 uppercase font-semibold">Selected Flows</span>
                      <span className="text-[10px] text-slate-400 font-normal italic">Drag to reorder flow sequence</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 select-none">
                      {computedModuleModalInOut.list.map((f, idx) => (
                        <div
                          key={f}
                          draggable
                          onDragStart={() => handleFlowDragStart(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleFlowDrop(idx)}
                          onDragEnd={handleFlowDragEnd}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-bold border shadow-sm transition-all duration-150 ${draggedFlowIndex === idx
                            ? 'bg-blue-950/80 border-dashed border-blue-400 text-blue-300 opacity-50'
                            : 'bg-blue-900/40 text-blue-200 border-blue-800/60 cursor-grab active:cursor-grabbing hover:bg-blue-800/60 hover:border-blue-600/80'
                            }`}
                        >
                          <span className="text-slate-400 text-[10px]">☰</span>
                          <span>{f}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFlow(f);
                            }}
                            className="ml-1 text-slate-400 hover:text-red-400 font-bold transition-colors text-[10px]"
                            title="Remove Flow"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {errorModuleModal && (
                <div className="text-xs text-red-400 bg-red-950/30 p-3 rounded-lg border border-red-800/30 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errorModuleModal}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-slate-700/50 flex items-center justify-end gap-3 mt-auto">
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-white transition-all duration-200 text-sm font-medium border border-slate-600/30"
                onClick={() => setModuleModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all duration-200 text-sm font-semibold shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={
                  savingModuleModal ||
                  (moduleModalMode === 'add'
                    ? (moduleModalSplitNames.some(name => !name.trim()) || moduleModalSplitCount < 1)
                    : (!moduleModalSelectedExisting || !computedModuleModalInOut.input || !computedModuleModalInOut.output)) ||
                  !!errorModuleModal
                }
                onClick={async () => {
                  setSavingModuleModal(true);
                  setErrorModuleModal(null);
                  try {
                    if (moduleModalMode === 'add') {
                      // Check for duplicate name among the split names themselves
                      const lowerNames = moduleModalSplitNames.map(n => n.trim().toLowerCase());
                      const hasSelfDuplicates = lowerNames.some((n, idx) => lowerNames.indexOf(n) !== idx);
                      if (hasSelfDuplicates) {
                        setErrorModuleModal('Each split module name must be unique.');
                        setSavingModuleModal(false);
                        return;
                      }

                      // Check for duplicates with existing modules
                      for (const name of moduleModalSplitNames) {
                        const exists = moduleModalList.some(
                          (m) => m.trim().toUpperCase() === name.trim().toUpperCase()
                        );
                        if (exists) {
                          setErrorModuleModal(`Module "${name}" already exists! Please choose another name.`);
                          setSavingModuleModal(false);
                          return;
                        }
                      }

                      // Fetch API N times
                      const apiCalls = moduleModalSplitNames.map((name) =>
                        splitModuleAct({
                          lineCode: moduleModalLineCode,
                          styleNo: moduleModalStyle,
                          moduleName: name.trim(),
                          inputFlowNo: '-',
                          outputFlowNo: '-',
                          flowList: '',
                        })
                      );

                      const results = await Promise.all(apiCalls);
                      const failed = results.filter(r => String(r?.status ?? '').toLowerCase() !== 'success');
                      if (failed.length > 0) {
                        const errMsg = failed.map((f, i) => f?.message || `Failed for module ${i + 1}`).join('; ');
                        setErrorModuleModal(errMsg || 'Failed to split modules');
                        setSavingModuleModal(false);
                        return;
                      }
                    } else {
                      // Edit Mode
                      const moduleName = moduleModalSelectedExisting.trim();
                      const res = await splitModuleAct({
                        lineCode: moduleModalLineCode,
                        styleNo: moduleModalStyle,
                        moduleName,
                        inputFlowNo: computedModuleModalInOut.input,
                        outputFlowNo: computedModuleModalInOut.output,
                        flowList: moduleModalFlowList.trim(),
                      });

                      const ok = String(res?.status ?? '').toLowerCase() === 'success';
                      if (!ok) {
                        setErrorModuleModal(res?.message || 'Failed to save flow configuration');
                        setSavingModuleModal(false);
                        return;
                      }
                    }

                    // Success actions (for both add and edit)
                    await handleLookup();
                    const key = `${moduleModalLineCode.trim()}|${moduleModalStyle.trim()}|${moduleModalPrepId.trim()}`;
                    setLayoutCache((prev) => {
                      const copy = { ...prev };
                      delete copy[key];
                      return copy;
                    });
                    setModuleModalOpen(false);
                  } catch (err: any) {
                    setErrorModuleModal(err?.message || 'Failed to save flow configuration');
                  } finally {
                    setSavingModuleModal(false);
                  }
                }}
              >
                {savingModuleModal ? 'Saving...' : 'Save Flow Config'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-modal-in">
            {/* Header Icon */}
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mb-4 shrink-0 shadow-lg shadow-red-500/5">
              <div className="absolute inset-0 rounded-full bg-red-500/15 blur-sm animate-pulse"></div>
              <Trash2 className="w-6 h-6 relative z-10" />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-slate-200 mb-2">
              Hapus Flow dari Module
            </h3>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Apakah Anda yakin ingin menghapus flow berikut ini?
            </p>

            {/* Visual Comparison Box */}
            <div className="w-full bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3.5 text-left mb-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium font-sans">Flow Code</span>
                <span className="font-mono font-bold bg-slate-800/80 text-slate-200 px-2.5 py-0.5 rounded border border-slate-700">
                  {deleteConfirm.flowNo}
                </span>
              </div>

              <div className="grid grid-cols-5 items-center gap-1.5 py-1 border-t border-b border-slate-800/50">
                <div className="col-span-2 text-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1 font-semibold">Split Module</span>
                  <span
                    className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-[11px] font-mono block truncate"
                    title={deleteConfirm.splitModule}
                  >
                    {deleteConfirm.splitModule || '-'}
                  </span>
                </div>

                <div className="col-span-1 flex flex-col items-center justify-center text-slate-500">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600 animate-pulse" />
                </div>

                <div className="col-span-2 text-center">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block mb-1 font-semibold">Original Module</span>
                  <span
                    className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px] font-mono block truncate"
                    title={deleteConfirm.originalModule}
                  >
                    {deleteConfirm.originalModule || '-'}
                  </span>
                </div>
              </div>

            </div>

            {/* Error Message */}
            {deleteFlowError && (
              <div className="w-full mb-4 text-left text-xs text-red-400 bg-red-950/20 p-3 rounded-lg border border-red-800/30 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{deleteFlowError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-150 text-xs font-semibold border border-slate-700/50"
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteFlowError(null);
                }}
                disabled={deletingFlow}
              >
                Batal
              </button>
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 transition-all duration-150 text-xs font-semibold shadow-lg shadow-red-600/10 flex items-center justify-center gap-1.5"
                disabled={deletingFlow}
                onClick={async () => {
                  setDeletingFlow(true);
                  setDeleteFlowError(null);
                  try {
                    const res = await removeFlowFromModuleAct({
                      lineCode: opModalLineCode,
                      styleNo: opModalStyle,
                      flowNo: deleteConfirm.flowNo,
                    });
                    if (res && String(res.status).toLowerCase() === 'success') {
                      // Reload layout data
                      const data = await fetchNewLayoutAct({
                        lineno: opModalLineCode,
                        style: opModalStyle,
                        prepId: opModalPrepId,
                      });
                      setOpModalLayoutData(data);

                      // Clear cache and refresh main table
                      const cacheKey = `${opModalLineCode.trim()}|${opModalStyle.trim()}|${opModalPrepId.trim()}`;
                      setLayoutCache((prev) => {
                        const copy = { ...prev };
                        delete copy[cacheKey];
                        return copy;
                      });
                      await handleLookup();

                      // Success: close confirmation modal
                      setDeleteConfirm(null);
                    } else {
                      setDeleteFlowError(res?.message || 'Gagal menghapus flow');
                    }
                  } catch (err: any) {
                    setDeleteFlowError(err?.message || 'Gagal menghapus flow');
                  } finally {
                    setDeletingFlow(false);
                  }
                }}
              >
                {deletingFlow ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus Flow</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Module Confirmation Modal */}
      {deleteModuleConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-modal-in">
            {/* Header Icon */}
            <div className="relative flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 mb-4 shrink-0 shadow-lg shadow-red-500/5">
              <div className="absolute inset-0 rounded-full bg-red-500/15 blur-sm animate-pulse"></div>
              <Trash2 className="w-6 h-6 relative z-10 animate-bounce" />
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-slate-200 mb-2">
              Hapus Module & Revert Flow
            </h3>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Apakah Anda yakin ingin menghapus SPLIT MODULE ini?
            </p>

            {/* Detail Box */}
            <div className="w-full bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3.5 text-left mb-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium font-sans">Module Name</span>
                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-xs font-mono max-w-[200px] truncate" title={deleteModuleConfirm.moduleName}>
                  {deleteModuleConfirm.moduleName}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {deleteModuleError && (
              <div className="w-full mb-4 text-left text-xs text-red-400 bg-red-950/20 p-3 rounded-lg border border-red-800/30 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{deleteModuleError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-150 text-xs font-semibold border border-slate-700/50"
                onClick={() => {
                  setDeleteModuleConfirm(null);
                  setDeleteModuleError(null);
                }}
                disabled={deletingModule}
              >
                Batal
              </button>
              <button
                type="button"
                className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 transition-all duration-150 text-xs font-semibold shadow-lg shadow-red-600/10 flex items-center justify-center gap-1.5"
                disabled={deletingModule}
                onClick={async () => {
                  setDeletingModule(true);
                  setDeleteModuleError(null);
                  try {
                    const res = await deleteSplitModuleAct({
                      lineCode: deleteModuleConfirm.lineCode,
                      styleNo: deleteModuleConfirm.styleNo,
                      moduleName: deleteModuleConfirm.moduleName,
                    });
                    if (res && String(res.status).toLowerCase() === 'success') {
                      // Reload layout data (if currently open in layout override modal)
                      if (opModalOpen && opModalLineCode === deleteModuleConfirm.lineCode && opModalStyle === deleteModuleConfirm.styleNo) {
                        const data = await fetchNewLayoutAct({
                          lineno: opModalLineCode,
                          style: opModalStyle,
                          prepId: opModalPrepId,
                        });
                        setOpModalLayoutData(data);
                      }

                      // Clear cache and refresh main table
                      const cacheKey = `${deleteModuleConfirm.lineCode.trim()}|${deleteModuleConfirm.styleNo.trim()}|${String(deleteModuleConfirm.prepId ?? '').trim()}`;
                      setLayoutCache((prev) => {
                        const copy = { ...prev };
                        delete copy[cacheKey];
                        return copy;
                      });
                      await handleLookup();

                      // Success: close confirmation modal
                      setDeleteModuleConfirm(null);
                    } else {
                      setDeleteModuleError(res?.message || 'Gagal menghapus module');
                    }
                  } catch (err: any) {
                    setDeleteModuleError(err?.message || 'Gagal menghapus module');
                  } finally {
                    setDeletingModule(false);
                  }
                }}
              >
                {deletingModule ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus Module</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Missing Flow Modal */}
      {checkMissingFlowModal.open && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col animate-modal-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200">Check Missing Flow</h3>
                  <p className="text-xs text-slate-400">
                    Style: <span className="font-mono text-emerald-300">{checkMissingFlowModal.style}</span> | 
                    Line: <span className="font-mono text-emerald-300">{checkMissingFlowModal.lineCode}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckMissingFlowModal(prev => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {checkMissingFlowModal.loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-slate-400">Checking flows...</p>
                </div>
              )}

              {checkMissingFlowModal.error && (
                <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkMissingFlowModal.error}</span>
                </div>
              )}

              {!checkMissingFlowModal.loading && !checkMissingFlowModal.error && (
                <div className="space-y-4">
                  {checkMissingFlowModal.flowGroups.length === 0 ? (
                    <div className="bg-slate-950/20 border border-slate-800/30 rounded-lg p-6 text-center">
                      <p className="text-sm text-slate-400">No flow data found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 min-w-[600px]">
                        <thead>
                          <tr className="bg-slate-800/60">
                            <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700 whitespace-nowrap w-24">Flow Group</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700 whitespace-nowrap w-32">Range</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700 whitespace-nowrap">All Flows</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700 whitespace-nowrap">Missing Flows</th>
                          </tr>
                        </thead>
                        <tbody>
                          {checkMissingFlowModal.flowGroups.map((group: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50 font-semibold whitespace-nowrap">{group.prefix}</td>
                              <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50 font-mono whitespace-nowrap">{group.min} - {group.max}</td>
                              <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50">
                                <div className="flex flex-wrap gap-1">
                                  {group.originalFlows.map((flow: string, fIdx: number) => {
                                    // Extract the base flow name (without suffix) to check if it's missing
                                    const cleanFlow = flow.replace(/\.D/gi, '');
                                    const match = cleanFlow.match(/^([A-Za-z]+)(\d+)(?:_[A-Za-z0-9]+)?$/);
                                    const baseFlowName = match ? `${match[1]}${match[2]}` : cleanFlow;
                                    const isMissing = group.missingFlows.includes(baseFlowName);
                                    return (
                                      <span
                                        key={fIdx}
                                        className={`px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap ${
                                          isMissing
                                            ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                        }`}
                                      >
                                        {flow}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50">
                                {group.missingFlows.length === 0 ? (
                                  <span className="text-emerald-400">None</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {group.missingFlows.map((missing: string, mIdx: number) => (
                                      <span
                                        key={mIdx}
                                        className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono whitespace-nowrap"
                                      >
                                        {missing}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setCheckMissingFlowModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-150 text-xs font-semibold border border-slate-700/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Layout Modal */}
      {viewLayoutModal.open && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-6xl max-h-[90vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col animate-modal-in">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200">View Layout - All Operators</h3>
                  <p className="text-xs text-slate-400">
                    Style: <span className="font-mono text-blue-300">{viewLayoutModal.style}</span> | 
                    Line: <span className="font-mono text-blue-300">{viewLayoutModal.lineCode}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewLayoutModal(prev => ({ ...prev, open: false }))}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {viewLayoutModal.loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-sm text-slate-400">Loading layout...</p>
                </div>
              )}

              {viewLayoutModal.error && (
                <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{viewLayoutModal.error}</span>
                </div>
              )}

              {!viewLayoutModal.loading && !viewLayoutModal.error && viewLayoutModal.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-slate-800/60">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700">NIK</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700">Employee Name</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700">EMPNO</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700">Process Name</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700">Flow No</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-300 text-left border-b border-slate-700">Module</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewLayoutModal.data.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50 font-mono">{item.NIK || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50">{item.E_NAME || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50">{item.EMPNO || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50">{item.PROCESS_NAME || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50 font-mono">{item.FLOW_NO || '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-300 border-b border-slate-700/50">{item.SPLIT_MODULE || item.MODULE || item.PART || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!viewLayoutModal.loading && !viewLayoutModal.error && viewLayoutModal.data.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-400">No layout data found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-700/50 flex justify-end">
              <button
                type="button"
                onClick={() => setViewLayoutModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-150 text-xs font-semibold border border-slate-700/50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionPlan;