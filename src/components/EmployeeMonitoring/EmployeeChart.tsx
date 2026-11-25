import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { OutputDetailResponse, EmployeeSkillResponse, OutputEmployeeHourlyResponse } from '../../types/api';
import { editEmployeeLastOutput, fetchEmployeeOutputDetail, fetchEmployeeSkill, fetchEmployeeHourlyOutput, getAuthToken, registerEmployeeRfid } from '../../services/api';
import { X, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import ExcelJS from 'exceljs';

interface EmployeeChartProps {
  data: Array<{
    name: string;
    output: number;
    average?: number;
    nik: string;
    statusColor?: string;
  }>;
  bottleneckData?: Array<{
    name: string;
    nik: string;
    actual: number;
    asmOutput: number;
    isBottleneck: boolean;
    status?: string;
    statusColor?: string;
  }>;
  title: string;
  color: string;
  className?: string;
  filters: {
    factory: string;
    date: Date;
    line: string;
    style: string;
  };
  targetDay: number;
  onEmployeeClick: (employeeData: any) => void;
  isRedPart?: boolean;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  factory: string;
  data: OutputDetailResponse[];
  date: Date;
  lineNo?: string;
}

export const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, factory, data, date, lineNo }) => {
  const [detailData, setDetailData] = useState<OutputDetailResponse[]>([]);
  const [skillData, setSkillData] = useState<EmployeeSkillResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hourlyOutputData, setHourlyOutputData] = useState<OutputEmployeeHourlyResponse[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyError, setHourlyError] = useState<string | null>(null);
  const [showSuspectedErrors, setShowSuspectedErrors] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newQty, setNewQty] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [isRegisterCbidOpen, setIsRegisterCbidOpen] = useState(false);
  const [newCbid, setNewCbid] = useState('');
  const [registeringCbid, setRegisteringCbid] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const formatJam = (jam: string) => {
    if (!jam) return '';
    const parts = jam.split(' ');
    const timePart = parts.length > 1 ? parts[1] : parts[0];
    // Replace dots with colons to handle format like "08.39.26.000"
    const normalizedTime = timePart.replace(/\./g, ':');
    // Split and take only HH:MM:SS (remove milliseconds)
    return normalizedTime.split(':').slice(0, 3).join(':');
  };

  const toMs = (jam: string) => {
    if (!jam) return NaN;
    const timeOnly = formatJam(jam);
    if (!timeOnly) return NaN;
    const ms = Date.parse(`1970-01-01T${timeOnly}Z`);
    return Number.isNaN(ms) ? NaN : ms;
  };

  // Fungsi untuk memformat waktu
  const formatTime = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getHourlyValue = (row: OutputDetailResponse | undefined, hour: number) => {
    if (!row) return 0;
    const hourKey = `${String(hour).padStart(2, '0')}:00`;
    const legacyKey = `H${String(hour).padStart(2, '0')}`;
    const v = (row as any)[hourKey] ?? (row as any)[legacyKey] ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const lastFetchedKeyRef = React.useRef<string>('');

  // Reset modal state when closed
  React.useEffect(() => {
    if (!isOpen) {
      lastFetchedKeyRef.current = '';
      setDetailData([]);
      setHourlyOutputData([]);
      setSkillData([]);
      setIsEditOpen(false);
      setNewQty('');
      setEditError(null);
      setIsRegisterCbidOpen(false);
      setNewCbid('');
      setRegisterError(null);
      setShowSuspectedErrors(false);
      setHourlyError(null);
      setError(null);
    }
  }, [isOpen]);

  // Synchronize detailData with incoming data prop
  React.useEffect(() => {
    if (isOpen && Array.isArray(data) && data.length > 0) {
      setDetailData(data);
    }
  }, [isOpen, data]);

  const currentDetail = detailData.length > 0 ? detailData : (Array.isArray(data) ? data : []);
  const activeNik = currentDetail[0]?.NIK;
  const activeStyle = currentDetail[0]?.STYLE_NO;
  const activeLine = lineNo || (currentDetail[0]?.LINE_CODE != null ? String(currentDetail[0].LINE_CODE) : '');
  const formattedDate = date ? date.toISOString().split('T')[0] : '';

  // Fetch skill & hourly output exactly once per employee selection
  React.useEffect(() => {
    if (!isOpen) {
      lastFetchedKeyRef.current = '';
      return;
    }

    if (!activeNik || !activeStyle || !formattedDate) return;

    const requestKey = `${activeNik}_${activeStyle}_${formattedDate}_${activeLine}`;
    if (lastFetchedKeyRef.current === requestKey) {
      return;
    }
    lastFetchedKeyRef.current = requestKey;

    const fetchModalDetails = async () => {
      // 1. Fetch Skill
      try {
        setLoading(true);
        setError(null);
        const skills = await fetchEmployeeSkill({ nik: activeNik });
        setSkillData(skills);
      } catch (err) {
        console.error('Error fetching skills:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch skills');
      } finally {
        setLoading(false);
      }

      // 2. Fetch Hourly Output
      try {
        setHourlyLoading(true);
        setHourlyError(null);
        const result = await fetchEmployeeHourlyOutput({
          nik: activeNik,
          style: activeStyle,
          date: formattedDate,
          lineNo: activeLine,
          excludeSuspected: 0,
        });
        setHourlyOutputData(result);
      } catch (err) {
        console.error('Error fetching hourly employee output:', err);
        setHourlyError(err instanceof Error ? err.message : 'Failed to fetch hourly output');
        setHourlyOutputData([]);
      } finally {
        setHourlyLoading(false);
      }
    };

    fetchModalDetails();
  }, [isOpen, activeNik, activeStyle, formattedDate, activeLine]);

  const refreshDetail = async () => {
    if (!activeNik || !activeStyle || !activeLine || !formattedDate) return;

    try {
      const refreshed = await fetchEmployeeOutputDetail({
        factory,
        datefrom: formattedDate,
        dateto: formattedDate,
        lineno: String(activeLine),
        styleno: String(activeStyle),
        nik: String(activeNik),
        overline: '',
      });
      setDetailData(Array.isArray(refreshed) ? refreshed : []);

      setHourlyLoading(true);
      const result = await fetchEmployeeHourlyOutput({
        nik: activeNik,
        style: activeStyle,
        date: formattedDate,
        lineNo: activeLine,
        excludeSuspected: 0,
      });
      setHourlyOutputData(result);
    } catch (err) {
      console.error('Error refreshing hourly employee output:', err);
    } finally {
      setHourlyLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setEditError(null);

    const nik = detailData[0]?.NIK;
    if (!nik || !date) {
      setEditError('Employee data not found');
      return;
    }

    const n = Number(newQty);
    if (!Number.isFinite(n) || n < 0) {
      setEditError('NEW_QTY must be a valid number');
      return;
    }

    const tokenObj: any = getAuthToken();
    const updatedBy = String(tokenObj?.userData?.username ?? '').trim();
    if (!updatedBy) {
      setEditError('User login not found');
      return;
    }

    try {
      setSavingEdit(true);
      const workdate = date.toISOString().split('T')[0];
      const resp = await editEmployeeLastOutput({
        workdate,
        nik: String(nik),
        newQty: n,
        updatedBy,
      });

      if (!resp || String((resp as any).status).toLowerCase() !== 'success') {
        setEditError(String((resp as any)?.message ?? 'Failed to update output'));
        return;
      }

      await refreshDetail();
      setIsEditOpen(false);
      setNewQty('');
    } catch (e: any) {
      setEditError(e?.message || 'Failed to update output');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRegisterCbid = async () => {
    setRegisterError(null);
    const nik = detailData[0]?.NIK;
    if (!nik) {
      setRegisterError('Employee data not found');
      return;
    }
    if (!newCbid.trim()) {
      setRegisterError('Please enter a valid CBID');
      return;
    }

    try {
      setRegisteringCbid(true);
      const resp = await registerEmployeeRfid({
        fr_id: newCbid.trim(),
        empl_nmbr: nik
      });
      // the api may return error, but if it doesn't throw, we consider it success.
      setIsRegisterCbidOpen(false);
      setNewCbid('');
      await refreshDetail();
    } catch (e: any) {
      setRegisterError(e?.message || 'Failed to register CBID');
    } finally {
      setRegisteringCbid(false);
    }
  };

  // Helper for quantile calculation fallback
  const calculateQuartile = (values: number[], q: number) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  };

  const formatNum = (val: number | null | undefined) => {
    if (val == null || Number.isNaN(val)) return '-';
    return Number(val).toFixed(1);
  };

  const spamThresholdSeconds = 1;
  const hourlyOutputWithSpamFlag = useMemo(() => {
    const sorted = [...(hourlyOutputData || [])].sort((a, b) => {
      const ams = toMs(a.JAM);
      const bms = toMs(b.JAM);
      if (Number.isNaN(ams) || Number.isNaN(bms)) return 0;
      return ams - bms;
    });

    return sorted.map((item, index) => {
      const prev = index > 0 ? sorted[index - 1] : null;
      let diffSeconds: number | null = null;
      if (prev) {
        const prevMs = toMs(prev.JAM);
        const curMs = toMs(item.JAM);
        if (!Number.isNaN(prevMs) && !Number.isNaN(curMs)) {
          diffSeconds = Math.abs(curMs - prevMs) / 1000;
        }
      }

      // Prioritize TIME_DIFF from SQL
      const timeDiff = item.TIME_DIFF != null ? item.TIME_DIFF : (index === 0 ? null : diffSeconds);
      const isSuspected = item.IS_SUSPECTED === 1 || item.REMARK === 'Suspected input error' || (timeDiff !== null && timeDiff <= 25.7);
      const isSpam = isSuspected || (timeDiff !== null && timeDiff <= spamThresholdSeconds);
      return { item, isSpam, isSuspected, diffSeconds, timeDiff };
    });
  }, [hourlyOutputData]);

  // Jumlah data suspected error (<= 25.7 detik)
  const suspectedErrorsCount = useMemo(() => {
    return hourlyOutputWithSpamFlag.filter(({ isSuspected }) => isSuspected).length;
  }, [hourlyOutputWithSpamFlag]);

  // Filter data berdasarkan opsi show/hide suspected input error (< 25s)
  const displayedHourlyOutput = useMemo(() => {
    if (showSuspectedErrors) {
      return hourlyOutputWithSpamFlag.map(row => ({
        ...row,
        displayRemark: row.item.REMARK_ALL || row.item.REMARK || (row.timeDiff === null ? null : (row.isSuspected ? 'Suspected input error' : 'Normal cycle')),
        displayStatus: row.item.STATUS_ALL || row.item.STATUS,
      }));
    }
    return hourlyOutputWithSpamFlag
      .filter(({ isSuspected }) => !isSuspected)
      .map(row => ({
        ...row,
        displayRemark: row.item.REMARK_EXCL || row.item.REMARK || 'Normal cycle',
        displayStatus: row.item.STATUS_EXCL || row.item.STATUS,
      }));
  }, [hourlyOutputWithSpamFlag, showSuspectedErrors]);

  // Statistik untuk header modal: Q1, Q3, IQR, UPPER_LIMIT, LOWER_LIMIT, AVERAGE, REMARK, STATUS, ETC_PERSON
  // Formula TERPISAH secara dinamis saat showSuspectedErrors (All) vs hideSuspectedErrors (Clean)
  const stats = useMemo(() => {
    const itemWithStats = hourlyOutputData.find(
      (item) => item.Q1 != null || item.Q3 != null || item.AVERAGE != null || item.UPPER_LIMIT != null || item.ETC_PERSON != null
    );

    const etcPersonVal = itemWithStats?.ETC_PERSON != null ? Number(itemWithStats.ETC_PERSON) : null;
    const empGroupVal = itemWithStats?.EMP_GROUP || null;

    let q1: number | null = null;
    let q3: number | null = null;
    let iqr: number | null = null;
    let upperLimit: number | null = null;
    let lowerLimit: number | null = null;
    let average: number | null = null;
    let q1Yesterday: number | null = null;
    let q3Yesterday: number | null = null;
    let iqrYesterday: number | null = null;

    if (showSuspectedErrors) {
      // MODE 1: Show suspected input errors (hitung semua transaksi)
      if (itemWithStats?.Q1_ALL != null || itemWithStats?.Q1 != null) {
        q1 = itemWithStats.Q1_ALL ?? itemWithStats.Q1 ?? null;
        q3 = itemWithStats.Q3_ALL ?? itemWithStats.Q3 ?? null;
        iqr = itemWithStats.IQR_ALL ?? itemWithStats.IQR ?? (q1 != null && q3 != null ? q3 - q1 : null);
        upperLimit = itemWithStats.UPPER_LIMIT_ALL ?? itemWithStats.UPPER_LIMIT ?? (q3 != null && iqr != null ? q3 + 1.5 * iqr : null);
        lowerLimit = itemWithStats.LOWER_LIMIT_ALL ?? itemWithStats.LOWER_LIMIT ?? (q1 != null && iqr != null ? q1 - 1.5 * iqr : null);
        average = itemWithStats.AVERAGE_ALL ?? itemWithStats.AVERAGE ?? null;
      } else {
        // Fallback hitung client-side dari semua data
        const allDiffs = hourlyOutputWithSpamFlag
          .map(r => r.timeDiff)
          .filter((v): v is number => v !== null && !Number.isNaN(v));
        if (allDiffs.length > 0) {
          q1 = calculateQuartile(allDiffs, 0.25);
          q3 = calculateQuartile(allDiffs, 0.75);
          iqr = q3 - q1;
          upperLimit = q3 + 1.5 * iqr;
          lowerLimit = q1 - 1.5 * iqr;
          average = allDiffs.reduce((a, b) => a + b, 0) / allDiffs.length;
        }
      }

      // Yesterday stats (ALL mode)
      q1Yesterday = itemWithStats?.Q1_ALL_YESTERDAY ?? itemWithStats?.Q1_YESTERDAY ?? null;
      q3Yesterday = itemWithStats?.Q3_ALL_YESTERDAY ?? itemWithStats?.Q3_YESTERDAY ?? null;
      iqrYesterday = itemWithStats?.IQR_ALL_YESTERDAY ?? itemWithStats?.IQR_YESTERDAY ?? (q1Yesterday != null && q3Yesterday != null ? q3Yesterday - q1Yesterday : null);
    } else {
      // MODE 2: Hide suspected input errors (hitung hanya siklus bersih > 25.7s)
      if (itemWithStats?.Q1_EXCL != null) {
        q1 = itemWithStats.Q1_EXCL;
        q3 = itemWithStats.Q3_EXCL ?? null;
        iqr = itemWithStats.IQR_EXCL ?? (q1 != null && q3 != null ? q3 - q1 : null);
        upperLimit = itemWithStats.UPPER_LIMIT_EXCL ?? (q3 != null && iqr != null ? q3 + 1.5 * iqr : null);
        lowerLimit = itemWithStats.LOWER_LIMIT_EXCL ?? (q1 != null && iqr != null ? q1 - 1.5 * iqr : null);
        average = itemWithStats.AVERAGE_EXCL ?? null;
      } else {
        // Fallback hitung client-side dari clean data (> 25.7s)
        const cleanDiffs = hourlyOutputWithSpamFlag
          .filter(r => !r.isSuspected)
          .map(r => r.timeDiff)
          .filter((v): v is number => v !== null && !Number.isNaN(v));
        if (cleanDiffs.length > 0) {
          q1 = calculateQuartile(cleanDiffs, 0.25);
          q3 = calculateQuartile(cleanDiffs, 0.75);
          iqr = q3 - q1;
          upperLimit = q3 + 1.5 * iqr;
          lowerLimit = q1 - 1.5 * iqr;
          average = cleanDiffs.reduce((a, b) => a + b, 0) / cleanDiffs.length;
        }
      }

      // Yesterday stats (EXCL mode)
      q1Yesterday = itemWithStats?.Q1_EXCL_YESTERDAY ?? itemWithStats?.Q1_YESTERDAY ?? null;
      q3Yesterday = itemWithStats?.Q3_EXCL_YESTERDAY ?? itemWithStats?.Q3_YESTERDAY ?? null;
      iqrYesterday = itemWithStats?.IQR_EXCL_YESTERDAY ?? itemWithStats?.IQR_YESTERDAY ?? (q1Yesterday != null && q3Yesterday != null ? q3Yesterday - q1Yesterday : null);
    }

    // Hitung distribusi status & remark sesuai mode saat ini
    const remarkCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};

    displayedHourlyOutput.forEach((row) => {
      const r = row.displayRemark;
      const s = row.displayStatus;
      if (r) remarkCounts[r] = (remarkCounts[r] || 0) + 1;
      if (s) statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    return {
      q1: formatNum(q1),
      q3: formatNum(q3),
      iqr: formatNum(iqr),
      q1Yesterday: formatNum(q1Yesterday),
      q3Yesterday: formatNum(q3Yesterday),
      iqrYesterday: formatNum(iqrYesterday),
      upperLimit: formatNum(upperLimit),
      lowerLimit: formatNum(lowerLimit),
      average: formatNum(average),
      etcPerson: etcPersonVal != null ? formatNum(etcPersonVal) : '-',
      empGroup: empGroupVal || '-',
      remarkCounts,
      statusCounts,
      hasData: Boolean(itemWithStats) || hourlyOutputData.length > 0,
      mode: showSuspectedErrors ? 'All Data (Incl. Suspected)' : 'Clean Cycles (Suspected Excluded)',
    };
  }, [hourlyOutputData, hourlyOutputWithSpamFlag, displayedHourlyOutput, showSuspectedErrors]);

  const getStatusBadgeStyle = (status: string | null | undefined) => {
    const s = String(status || '').trim().toLowerCase();
    if (s === 'good' || s === 'aman') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (s === 'upper limit') {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    if (s === 'lower limit') {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    return 'bg-gray-700/50 text-gray-300 border-gray-600/40';
  };

  const getRemarkBadgeStyle = (remark: string | null | undefined) => {
    const r = String(remark || '').trim().toLowerCase();
    if (r === 'normal cycle') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (r === 'short cycle') {
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
    }
    if (r === 'suspected input error') {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
    if (r === 'problem occured') {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
    return 'bg-gray-700/50 text-gray-300 border-gray-600/40';
  };

  const downloadExcelBuffer = (buffer: ArrayBuffer, filename: string) => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async () => {
    const nik = String(data?.[0]?.NIK ?? '').trim();
    const style = String(data?.[0]?.STYLE_NO ?? '').trim();
    const employeeName = String(data?.[0]?.E_NAME ?? '').trim();
    const formattedDate = date?.toISOString?.().split('T')[0] ?? '';

    const safe = (v: string) => v.replace(/[\\/:*?"<>|]/g, '-');
    const fileName = safe(`Detail_Output_Employee_${nik || 'UNKNOWN'}_${style || 'UNKNOWN'}_${formattedDate || 'UNKNOWN'}.xlsx`);

    const hours = Array.from({ length: 15 }, (_, i) => i + 7);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Employee Monitoring';
    wb.created = new Date();

    const applyHeaderStyle = (row: ExcelJS.Row) => {
      row.height = 18;
      row.font = { bold: true, color: { argb: 'FFE5E7EB' } };
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
      row.eachCell((cell: ExcelJS.Cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF4B5563' } },
          left: { style: 'thin', color: { argb: 'FF4B5563' } },
          bottom: { style: 'thin', color: { argb: 'FF4B5563' } },
          right: { style: 'thin', color: { argb: 'FF4B5563' } },
        };
      });
    };

    const applyTitleStyle = (row: ExcelJS.Row) => {
      row.height = 22;
      row.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      row.alignment = { vertical: 'middle', horizontal: 'left' };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    };

    // === Main Table Sheet ===
    const wsMain = wb.addWorksheet('Main Table', { views: [{ state: 'frozen', ySplit: 0 }] });

    const processHeader = ['NO', 'PROCESS NAME', 'MACHINE NAME', 'FLOW NO'];
    const hourlyHeader = [...hours.map(h => `${String(h).padStart(2, '0')}:00`), 'TOTAL QTY'];
    const maxColCount = Math.max(processHeader.length, hourlyHeader.length);

    wsMain.addRow(['Detail Output Employee']);
    wsMain.mergeCells(1, 1, 1, maxColCount);
    applyTitleStyle(wsMain.getRow(1));

    wsMain.addRow(['NIK', nik]);
    wsMain.addRow(['NAME', employeeName]);
    wsMain.addRow(['STYLE', style]);
    wsMain.addRow(['DATE', formattedDate]);
    wsMain.addRow([]);

    // === Process & Machine List (Top Section) ===
    wsMain.addRow(['Process & Machine List']);
    wsMain.mergeCells(7, 1, 7, maxColCount);
    applyTitleStyle(wsMain.getRow(7));

    wsMain.addRow(processHeader);
    applyHeaderStyle(wsMain.getRow(8));

    (data || []).forEach((item, idx) => {
      wsMain.addRow([
        idx + 1,
        String(item.PROCESS_NAME ?? ''),
        String(item.MACHINE_NAME ?? ''),
        String(item.FLOW_NO ?? ''),
      ]);
    });

    if ((data || []).length === 0) {
      wsMain.addRow(['', 'No process/machine data', '', '']);
    }

    const processStartRow = 8;

    wsMain.autoFilter = {
      from: { row: processStartRow, column: 1 },
      to: { row: processStartRow, column: processHeader.length },
    };

    // Add spacing row
    wsMain.addRow([]);

    // === Hourly Output (Bottom Section) ===
    const hourlyTitleRowIndex = wsMain.rowCount + 1;
    wsMain.addRow(['Hourly Output']);
    wsMain.mergeCells(hourlyTitleRowIndex, 1, hourlyTitleRowIndex, maxColCount);
    applyTitleStyle(wsMain.getRow(hourlyTitleRowIndex));

    const hourlyHeaderRowIndex = wsMain.rowCount + 1;
    wsMain.addRow(hourlyHeader);
    applyHeaderStyle(wsMain.getRow(hourlyHeaderRowIndex));

    // Only add 1 row of hourly data (from first item since all processes have same hourly output)
    if (data && data.length > 0) {
      const row: any[] = [];
      for (const h of hours) {
        row.push(getHourlyValue(data[0], h));
      }
      row.push(Number(data[0].TOTAL_QTY ?? 0));
      wsMain.addRow(row);
    } else {
      wsMain.addRow(['No hourly output data']);
    }

    // Remove autoFilter for hourly section (only keep filter for process section)
    // wsMain.autoFilter = {
    //   from: { row: hourlyHeaderRowIndex, column: 1 },
    //   to: { row: hourlyHeaderRowIndex, column: hourlyHeader.length },
    // };

    // Set widths for both sections with consistent sizing
    wsMain.columns = [
      { width: 6 },   // NO column for process section
      { width: 35 },  // PROCESS NAME
      { width: 20 },  // MACHINE NAME
      ...new Array(Math.max(0, maxColCount - 3)).fill(null).map(() => ({ width: 10 })), // Hourly columns - consistent width
    ];

    // Borders + formats for all data rows (starting from process list header)
    wsMain.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      // Skip initial employee meta rows (1..6)
      if (rowNumber <= 6) return;

      row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF374151' } },
          left: { style: 'thin', color: { argb: 'FF374151' } },
          bottom: { style: 'thin', color: { argb: 'FF374151' } },
          right: { style: 'thin', color: { argb: 'FF374151' } },
        };

        // Right align numeric columns in hourly section
        if (rowNumber >= hourlyHeaderRowIndex) {
          const isNumericColumn = colNumber >= 1 && colNumber <= hours.length + 1;
          cell.alignment = {
            vertical: 'middle',
            horizontal: isNumericColumn ? 'right' : 'left',
            wrapText: false,
          };
          if (isNumericColumn && typeof cell.value === 'number') {
            cell.numFmt = '#,##0';
          }
        } else {
          // Process section alignment
          cell.alignment = {
            vertical: 'middle',
            horizontal: colNumber === 1 ? 'center' : 'left',
            wrapText: true,
          };
        }
      });
    });

    // Freeze panes at hourly header row for convenience
    wsMain.views = [{ state: 'frozen', ySplit: hourlyHeaderRowIndex }];

    // === Event Log Sheet ===
    const wsLog = wb.addWorksheet('Event Log');
    const logHeader = ['JAM', 'QTY', 'TIME DIFF (s)', 'REMARK', 'STATUS', 'SPAM'];

    wsLog.addRow(['Output Event Log']);
    wsLog.mergeCells(1, 1, 1, logHeader.length);
    applyTitleStyle(wsLog.getRow(1));
    wsLog.addRow(['NIK', nik]);
    wsLog.addRow(['STYLE', style]);
    wsLog.addRow(['DATE', formattedDate]);
    wsLog.addRow(['FILTER', showSuspectedErrors ? 'All Records (Included Suspected Errors)' : 'Suspected Input Errors (< 25s) Excluded']);
    wsLog.addRow(['AVERAGE TIME DIFF', stats.average !== '-' ? `${stats.average} s` : '-']);
    wsLog.addRow(['Q1 TODAY (25%)', stats.q1 !== '-' ? `${stats.q1} s` : '-']);
    wsLog.addRow(['Q1 YESTERDAY (25%)', stats.q1Yesterday !== '-' ? `${stats.q1Yesterday} s` : '-']);
    wsLog.addRow(['Q3 TODAY (75%)', stats.q3 !== '-' ? `${stats.q3} s` : '-']);
    wsLog.addRow(['Q3 YESTERDAY (75%)', stats.q3Yesterday !== '-' ? `${stats.q3Yesterday} s` : '-']);
    wsLog.addRow(['IQR TODAY', stats.iqr !== '-' ? `${stats.iqr} s` : '-']);
    wsLog.addRow(['IQR YESTERDAY', stats.iqrYesterday !== '-' ? `${stats.iqrYesterday} s` : '-']);
    wsLog.addRow(['LOWER LIMIT', stats.lowerLimit !== '-' ? `${stats.lowerLimit} s` : '-']);
    wsLog.addRow(['UPPER LIMIT', stats.upperLimit !== '-' ? `${stats.upperLimit} s` : '-']);
    wsLog.addRow([]);

    const eventLogHeaderRowIndex = wsLog.rowCount + 1;
    wsLog.addRow(logHeader);
    applyHeaderStyle(wsLog.getRow(eventLogHeaderRowIndex));
    wsLog.views = [{ state: 'frozen', ySplit: eventLogHeaderRowIndex }];

    wsLog.columns = [
      { width: 16 },
      { width: 10 },
      { width: 18 },
      { width: 26 },
      { width: 16 },
      { width: 10 },
    ];

    (displayedHourlyOutput || []).forEach(({ item, isSpam, timeDiff }) => {
      wsLog.addRow([
        formatJam(item.JAM),
        Number(item.QTY ?? 0),
        timeDiff === null ? '' : Number(timeDiff),
        item.REMARK ?? '',
        item.STATUS ?? '',
        isSpam ? 'YES' : 'NO',
      ]);
    });

    if ((displayedHourlyOutput || []).length === 0) {
      wsLog.addRow(['No event log data']);
    }

    const eventLogStartRow = eventLogHeaderRowIndex;
    wsLog.autoFilter = {
      from: { row: eventLogStartRow, column: 1 },
      to: { row: eventLogStartRow, column: logHeader.length },
    };

    wsLog.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (rowNumber <= eventLogStartRow) return;
      row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF374151' } },
          left: { style: 'thin', color: { argb: 'FF374151' } },
          bottom: { style: 'thin', color: { argb: 'FF374151' } },
          right: { style: 'thin', color: { argb: 'FF374151' } },
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 ? 'left' : 'center',
          wrapText: false,
        };
        if ((colNumber === 2 || colNumber === 3) && typeof cell.value === 'number') {
          cell.numFmt = '#,##0';
        }
      });
    });

    // Highlight spam rows
    (hourlyOutputWithSpamFlag || []).forEach(({ isSpam }, idx) => {
      if (!isSpam) return;
      const rowIndex = eventLogStartRow + 1 + idx;
      const r = wsLog.getRow(rowIndex);
      r.eachCell((cell: ExcelJS.Cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F1D1D' } };
        cell.font = { bold: true, color: { argb: 'FFFECACA' } };
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    downloadExcelBuffer(buffer as ArrayBuffer, fileName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-[95vw] h-[90vh] flex flex-col transform scale-100 transition-all duration-300">
        {/* Header - Fixed */}
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-4 sm:p-6 text-white flex-shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold">Detail Output Employee</h3>
              </div>
              {detailData[0] && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
                  <div className="space-y-0.5">
                    <p className="text-blue-200 text-xs">Name</p>
                    <p className="font-semibold text-sm truncate">{detailData[0].E_NAME}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-blue-200 text-xs">NIK</p>
                    <p className="font-semibold text-sm">{detailData[0].NIK}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-blue-200 text-xs">Part</p>
                    <p className="font-semibold text-sm truncate">{detailData[0].PART}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-blue-200 text-xs">Style</p>
                    <p className="font-semibold text-sm truncate">{detailData[0].STYLE_NO}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-blue-200 text-xs">Line</p>
                    <p className="font-semibold text-sm truncate">{detailData[0].LINE_NAME}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-blue-200 text-xs">ETC Standard</p>
                    <p className="font-semibold text-sm truncate text-emerald-300">
                      {stats.etcPerson !== '-' ? `${stats.etcPerson} s` : '-'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setIsEditOpen((v) => !v);
                  setEditError(null);
                }}
                className={`px-3 py-2 rounded-lg transition-colors text-sm font-semibold border ${isEditOpen
                    ? 'bg-orange-600 text-white border-orange-500/60 hover:bg-orange-700'
                    : 'bg-orange-700/30 text-orange-50 border-orange-500/30 hover:bg-orange-700/50'
                  }`}
              >
                Edit Last Output
              </button>
              <button
                onClick={() => {
                  setIsRegisterCbidOpen((v) => !v);
                  setRegisterError(null);
                }}
                className={`px-3 py-2 rounded-lg transition-colors text-sm font-semibold border ${isRegisterCbidOpen
                    ? 'bg-blue-600 text-white border-blue-500/60 hover:bg-blue-700'
                    : 'bg-blue-700/30 text-blue-50 border-blue-500/30 hover:bg-blue-700/50'
                  }`}
              >
                Register CBID
              </button>
              <button
                onClick={exportToExcel}
                className="px-3 py-2 bg-blue-700/40 hover:bg-blue-700/60 rounded-lg transition-colors text-sm font-semibold"
              >
                Export Excel
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-blue-700/50 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Statistical Metrics in Header */}
          <div className="mt-4 pt-3 border-t border-blue-700/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              <div className="bg-emerald-950/60 border border-emerald-600/40 rounded-xl px-2.5 py-2 shadow-inner flex flex-col justify-between">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-300">ETC (STANDARD)</span>
                <p className="text-base font-bold text-emerald-300 mt-1">
                  {stats.etcPerson !== '-' ? `${stats.etcPerson} s` : '-'}
                </p>
              </div>
              <div className="bg-blue-950/60 border border-blue-700/40 rounded-xl px-2.5 py-2 shadow-inner flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-300">AVERAGE</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-800/80 text-blue-200">
                    {showSuspectedErrors ? 'All' : 'Clean'}
                  </span>
                </div>
                <p className="text-base font-bold text-white mt-1">
                  {stats.average !== '-' ? `${stats.average} s` : '-'}
                </p>
              </div>
              <div className="bg-blue-950/60 border border-blue-700/40 rounded-xl px-2.5 py-2 shadow-inner flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-300">Q1 (25%)</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-800/80 text-blue-200">
                    {showSuspectedErrors ? 'All' : 'Clean'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1 pt-1 border-t border-blue-800/40">
                  <div>
                    <span className="block text-[8px] font-bold text-blue-300 uppercase leading-tight">TODAY</span>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {stats.q1 !== '-' ? `${stats.q1} s` : '-'}
                    </span>
                  </div>
                  <div className="border-l border-blue-800/50 pl-1">
                    <span className="block text-[8px] font-bold text-amber-300 uppercase leading-tight">YESTERDAY</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-200">
                      {stats.q1Yesterday !== '-' ? `${stats.q1Yesterday} s` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-950/60 border border-blue-700/40 rounded-xl px-2.5 py-2 shadow-inner flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-300">Q3 (75%)</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-800/80 text-blue-200">
                    {showSuspectedErrors ? 'All' : 'Clean'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1 pt-1 border-t border-blue-800/40">
                  <div>
                    <span className="block text-[8px] font-bold text-blue-300 uppercase leading-tight">TODAY</span>
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {stats.q3 !== '-' ? `${stats.q3} s` : '-'}
                    </span>
                  </div>
                  <div className="border-l border-blue-800/50 pl-1">
                    <span className="block text-[8px] font-bold text-amber-300 uppercase leading-tight">YESTERDAY</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-200">
                      {stats.q3Yesterday !== '-' ? `${stats.q3Yesterday} s` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-950/60 border border-blue-700/40 rounded-xl px-2.5 py-2 shadow-inner flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-300">IQR</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-800/80 text-blue-200">
                    {showSuspectedErrors ? 'All' : 'Clean'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1 pt-1 border-t border-blue-800/40">
                  <div>
                    <span className="block text-[8px] font-bold text-blue-300 uppercase leading-tight">TODAY</span>
                    <span className="text-xs sm:text-sm font-bold text-cyan-300">
                      {stats.iqr !== '-' ? `${stats.iqr} s` : '-'}
                    </span>
                  </div>
                  <div className="border-l border-blue-800/50 pl-1">
                    <span className="block text-[8px] font-bold text-amber-300 uppercase leading-tight">YESTERDAY</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-200">
                      {stats.iqrYesterday !== '-' ? `${stats.iqrYesterday} s` : '-'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-blue-950/60 border border-blue-700/40 rounded-xl px-2.5 py-2 shadow-inner flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-300">LOWER LIMIT</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-800/80 text-blue-200">
                    {showSuspectedErrors ? 'All' : 'Clean'}
                  </span>
                </div>
                <p className="text-base font-bold text-amber-300 mt-1">
                  {stats.lowerLimit !== '-' ? `${stats.lowerLimit} s` : '-'}
                </p>
              </div>
              <div className="bg-blue-950/60 border border-blue-700/40 rounded-xl px-2.5 py-2 shadow-inner flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-300">UPPER LIMIT</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-800/80 text-blue-200">
                    {showSuspectedErrors ? 'All' : 'Clean'}
                  </span>
                </div>
                <p className="text-base font-bold text-rose-300 mt-1">
                  {stats.upperLimit !== '-' ? `${stats.upperLimit} s` : '-'}
                </p>
              </div>
            </div>

            {/* REMARK & STATUS Summary in Header */}
            {/* REMARK & STATUS Summary in Header */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              {(Object.keys(stats.statusCounts).length > 0 || Object.keys(stats.remarkCounts).length > 0) ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-blue-200 font-medium mr-1">Distribution:</span>
                  {Object.entries(stats.statusCounts).map(([status, count]) => (
                    <span key={status} className={`px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadgeStyle(status)}`}>
                      Status: {status} ({count})
                    </span>
                  ))}
                  {Object.entries(stats.remarkCounts).map(([remark, count]) => (
                    <span key={remark} className={`px-2.5 py-0.5 rounded-full font-medium border ${getRemarkBadgeStyle(remark)}`}>
                      {remark} ({count})
                    </span>
                  ))}
                </div>
              ) : <div />}

              <button
                type="button"
                onClick={() => setShowSuspectedErrors(!showSuspectedErrors)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  showSuspectedErrors
                    ? 'bg-purple-900/50 text-purple-200 border-purple-500/70 hover:bg-purple-900/80'
                    : 'bg-blue-950/70 text-blue-200 border-blue-600/50 hover:bg-blue-900/80'
                }`}
                title="Klik untuk tampilkan / sembunyikan suspected input error (< 25s)"
              >
                {showSuspectedErrors ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    <span>Hide Suspected Error (&lt; 25s)</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                    <span>Show Suspected Error (&lt; 25s)</span>
                  </>
                )}
                {suspectedErrorsCount > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      showSuspectedErrors
                        ? 'bg-purple-700 text-purple-100'
                        : 'bg-amber-900/70 text-amber-300 border border-amber-600/60'
                    }`}
                  >
                    {suspectedErrorsCount} {showSuspectedErrors ? 'shown' : 'hidden'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-gray-900 custom-scrollbar">
          {isEditOpen && (
            <div className="p-4 sm:p-6 border-b border-gray-700">
              <div className="bg-gradient-to-b from-gray-800/70 to-gray-800/40 border border-gray-700 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-gray-100">Edit Last Output</h4>
                    <p className="text-sm text-gray-300 mt-1">
                      Update last CB output if there is missing output
                    </p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">NIK</p>
                        <p className="text-sm text-gray-100 font-semibold truncate">{String(detailData?.[0]?.NIK ?? '-')}</p>
                      </div>
                      <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Workdate</p>
                        <p className="text-sm text-gray-100 font-semibold truncate">{date ? date.toISOString().split('T')[0] : '-'}</p>
                      </div>
                      <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Total Output Qty (current)</p>
                        <p className="text-sm text-gray-100 font-semibold truncate">{String(detailData?.[0]?.TOTAL_QTY ?? '-')}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Close edit"
                    onClick={() => {
                      if (savingEdit) return;
                      setIsEditOpen(false);
                      setNewQty('');
                      setEditError(null);
                    }}
                    className="shrink-0 p-2 rounded-lg border border-gray-700 bg-gray-900/30 hover:bg-gray-900/60 text-gray-200 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-8">
                    <label className="block text-sm text-gray-200 font-medium mb-1">New Output</label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        placeholder="Enter new output (ex: 200)"
                        value={newQty}
                        onChange={(e) => setNewQty(e.target.value)}
                        disabled={savingEdit}
                        className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-60"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Use even number (&gt;= 0).</p>
                  </div>

                  <div className="sm:col-span-4 flex gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (savingEdit) return;
                        setIsEditOpen(false);
                        setNewQty('');
                        setEditError(null);
                      }}
                      disabled={savingEdit}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-900/40 hover:bg-gray-900/70 disabled:opacity-60 text-gray-100 font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-semibold transition-colors"
                    >
                      {savingEdit ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </div>

                {editError && (
                  <div className="mt-3 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                    <p className="text-sm text-red-200 font-semibold">Update failed</p>
                    <p className="text-sm text-red-300 mt-0.5">{editError}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isRegisterCbidOpen && (
            <div className="p-4 sm:p-6 border-b border-gray-700">
              <div className="bg-gradient-to-b from-gray-800/70 to-gray-800/40 border border-gray-700 rounded-2xl p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-gray-100">Register CBID</h4>
                    <p className="text-sm text-gray-300 mt-1">
                      Register a new CBID (RFID) to this operator
                    </p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">NIK</p>
                        <p className="text-sm text-gray-100 font-semibold truncate">{String(detailData?.[0]?.NIK ?? '-')}</p>
                      </div>
                      <div className="bg-gray-900/40 border border-gray-700 rounded-lg px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Name</p>
                        <p className="text-sm text-gray-100 font-semibold truncate">{String(detailData?.[0]?.E_NAME ?? '-')}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Close register"
                    onClick={() => {
                      if (registeringCbid) return;
                      setIsRegisterCbidOpen(false);
                      setNewCbid('');
                      setRegisterError(null);
                    }}
                    className="shrink-0 p-2 rounded-lg border border-gray-700 bg-gray-900/30 hover:bg-gray-900/60 text-gray-200 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-8">
                    <label className="block text-sm text-gray-200 font-medium mb-1">New CBID (RFID)</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Enter CBID (e.g. 3458)"
                        value={newCbid}
                        onChange={(e) => setNewCbid(e.target.value)}
                        disabled={registeringCbid}
                        className="w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4 flex gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (registeringCbid) return;
                        setIsRegisterCbidOpen(false);
                        setNewCbid('');
                        setRegisterError(null);
                      }}
                      disabled={registeringCbid}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-gray-700 bg-gray-900/40 hover:bg-gray-900/70 disabled:opacity-60 text-gray-100 font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRegisterCbid}
                      disabled={registeringCbid}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition-colors"
                    >
                      {registeringCbid ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Registering...
                        </span>
                      ) : (
                        'Register CBID'
                      )}
                    </button>
                  </div>
                </div>

                {registerError && (
                  <div className="mt-3 bg-red-900/20 border border-red-800/40 rounded-lg p-3">
                    <p className="text-sm text-red-200 font-semibold">Registration failed</p>
                    <p className="text-sm text-red-300 mt-0.5">{registerError}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Process & Machine List Section */}
          <div className="p-4 sm:p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-100">Process & Machine List</h4>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-700 whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Flow No</th>
                    <th className="sticky left-0 bg-gray-800 px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Process Name</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Machine Name</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-700">
                  {detailData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm text-gray-400">{item.FLOW_NO}</td>
                      <td className="sticky left-0 bg-gray-900 px-2 sm:px-4 py-2 sm:py-3 text-sm font-medium text-gray-300">{item.PROCESS_NAME}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm text-gray-400">{item.MACHINE_NAME}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Hourly Output Table Section */}
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-100">Hourly Output Table</h4>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-700 whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-800">
                    {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                      <th key={hour} className="px-2 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        {formatTime(hour)}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Qty</th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-700">
                  {detailData.length > 0 && (
                    <tr className="hover:bg-gray-800/50 transition-colors">
                      {Array.from({ length: 15 }, (_, i) => i + 7).map((hour) => (
                        <td key={hour} className="px-2 py-2 text-sm text-gray-300">{getHourlyValue(detailData[0], hour)}</td>
                      ))}
                      <td className="px-2 py-2 text-sm font-medium text-blue-400">{detailData[0].TOTAL_QTY}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Output Event Log */}
          <div className="p-6 border-t border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-100">Output Event Log</h4>
                <p className="text-xs text-gray-400 mt-0.5">Time Diff, Remark, dan Status dihitung berdasarkan data transaksi output operator</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSuspectedErrors(!showSuspectedErrors)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    showSuspectedErrors
                      ? 'bg-purple-900/40 text-purple-200 border-purple-600/70 hover:bg-purple-900/60'
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-750 hover:text-white'
                  }`}
                  title="Klik untuk tampilkan / sembunyikan transaksi dengan time diff < 25 detik (suspected input error)"
                >
                  {showSuspectedErrors ? (
                    <>
                      <Eye className="w-4 h-4 text-purple-400" />
                      <span>Hide Suspected input error (&lt; 25s)</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4 text-amber-400" />
                      <span>Show Suspected input error (&lt; 25s)</span>
                    </>
                  )}
                  {suspectedErrorsCount > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        showSuspectedErrors
                          ? 'bg-purple-700 text-purple-100'
                          : 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                      }`}
                    >
                      {suspectedErrorsCount} {showSuspectedErrors ? 'shown' : 'hidden'}
                    </span>
                  )}
                </button>

                <span className="text-xs text-gray-400 font-medium bg-gray-800 px-2.5 py-1.5 rounded-md border border-gray-700">
                  Total records: {displayedHourlyOutput.length}
                  {suspectedErrorsCount > 0 && !showSuspectedErrors && (
                    <span className="text-gray-500 ml-1">({suspectedErrorsCount} excluded)</span>
                  )}
                </span>
              </div>
            </div>

            {hourlyLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  <p className="text-gray-300">Loading output log...</p>
                </div>
              </div>
            ) : hourlyError ? (
              <div className="bg-red-900/30 p-3 rounded-lg text-red-400 text-sm">
                {hourlyError}
              </div>
            ) : displayedHourlyOutput.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-700 whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-800">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Jam</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Time Diff (s)</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Remark</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900 divide-y divide-gray-700/60">
                    {displayedHourlyOutput.map(({ item, isSuspected, isSpam, timeDiff, displayRemark, displayStatus }, index) => {
                      const statusLower = displayStatus?.toLowerCase();
                      const isUpperLimit = statusLower === 'upper limit';
                      const isLowerLimit = statusLower === 'lower limit';

                      return (
                        <tr
                          key={index}
                          className={`${isSuspected
                              ? 'bg-purple-950/30'
                              : isSpam
                                ? 'bg-red-950/30'
                                : isUpperLimit
                                  ? 'bg-rose-950/20'
                                  : isLowerLimit
                                    ? 'bg-amber-950/20'
                                    : ''
                            } hover:bg-gray-800/60 transition-colors`}
                        >
                          <td className="px-3 py-2.5 text-sm text-gray-200 font-mono">{formatJam(item.JAM)}</td>
                          <td className="px-3 py-2.5 text-sm font-semibold text-blue-400">{item.QTY}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-200 font-mono">
                            {timeDiff != null ? (
                              <span>
                                {timeDiff} <span className="text-gray-400 text-xs">s</span>
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            {displayRemark ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium border ${getRemarkBadgeStyle(displayRemark)}`}>
                                {displayRemark}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-sm">
                            {displayStatus ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusBadgeStyle(displayStatus)}`}>
                                {displayStatus}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 text-gray-400 text-center text-sm space-y-2">
                <p>No output log data available</p>
                {suspectedErrorsCount > 0 && !showSuspectedErrors && (
                  <p className="text-xs text-amber-300/80">
                    {suspectedErrorsCount} data disembunyikan karena durasi &lt; 25 detik (Suspected Input Error).
                    <button
                      type="button"
                      onClick={() => setShowSuspectedErrors(true)}
                      className="ml-2 text-blue-400 underline hover:text-blue-300 font-medium"
                    >
                      Klik di sini untuk menampilkan
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Skill Grade Section */}
          <div className="p-4 bg-gray-800 border-t border-gray-700">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-100">Employee Skills</h4>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <p className="text-gray-300">Loading skills...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-900/30 p-3 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              ) : skillData.length > 0 ? (
                <div className="mt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-2 bg-gray-700 rounded-lg">
                    {skillData.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-center bg-gray-900 p-3 rounded-lg gap-3 hover:bg-gray-800 transition-colors"
                      >
                        {/* Grade Badge */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${skill.SKILL_GRADE === 'A' ? 'bg-green-900 text-green-300' :
                          skill.SKILL_GRADE === 'B' ? 'bg-blue-900 text-blue-300' :
                            skill.SKILL_GRADE === 'C' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-red-900 text-red-300'
                          }`}>
                          {skill.SKILL_GRADE}
                        </div>

                        {/* Process Description */}
                        <div className="text-gray-400 text-sm">
                          {skill.DESCR}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-900 p-3 rounded-lg border border-gray-700 text-gray-400 text-center text-sm">
                  No skill data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmployeeChart: React.FC<EmployeeChartProps> = ({
  data,
  bottleneckData = [],
  title,
  color,
  className,
  filters,
  targetDay,
  onEmployeeClick,
  isRedPart
}) => {
  const [loading, setLoading] = useState(false);

  // Debug log untuk melihat data yang diterima
  console.log('Chart data received:', data);

  // Fungsi untuk mengatur posisi teks secara zigzag
  const customTickFormatter = (value: string, index: number) => {
    // Jika jumlah data lebih dari 5, potong nama
    const shouldTruncate = data.length > 5;
    const shortenedName = shouldTruncate && value.length > 8 ? value.slice(0, 8) + '...' : value;
    // Geser ke bawah untuk indeks ganjil (zigzag)
    const dy = index % 2 === 0 ? '0.5em' : '2em';
    return { value: shortenedName, dy };
  };

  const isHandlingClickRef = React.useRef(false);

  // Handler untuk klik pada bar
  const handleBarClick = async (clickedData: any) => {
    if (isHandlingClickRef.current) return;
    try {
      isHandlingClickRef.current = true;
      setLoading(true);
      console.log('Data received in handleBarClick:', clickedData);

      if (!clickedData?.nik) {
        console.error('NIK tidak ditemukan untuk karyawan:', clickedData?.name);
        return;
      }

      console.log('Fetching detail for NIK:', clickedData.nik);
      const detailData = await fetchEmployeeOutputDetail({
        factory: filters.factory,
        datefrom: filters.date.toISOString().split('T')[0],
        dateto: filters.date.toISOString().split('T')[0],
        lineno: filters.line,
        styleno: filters.style,
        nik: clickedData.nik,
        overline: ''
      });

      console.log('Detail data received:', detailData);
      onEmployeeClick(detailData);
    } catch (error) {
      console.error('Error fetching employee detail:', error);
    } finally {
      setLoading(false);
      isHandlingClickRef.current = false;
    }
  };

  // Memoize chart configuration
  const chartConfig = useMemo(() => ({
    dataKey: 'output',
    barProps: {
      radius: [4, 4, 0, 0] as [number, number, number, number]
    },
    labelProps: {
      position: "top" as const,
      style: {
        fill: '#D1D5DB',
        fontSize: '12px',
        fontWeight: 'bold'
      }
    }
  }), []);

  const renderActualAverageLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const actual = Number(value ?? 0);
    const avg = Number((data as any)?.[index]?.average ?? NaN);

    const text = Number.isFinite(avg) ? `${actual}/${avg}` : `${actual}`;

    // Dynamic font size based on bar width, clamped between 10px and 14px
    const fontSize = Math.min(Math.max(width / 3, 10), 14);

    return (
      <text
        x={x + width / 2}
        y={y - 5}
        textAnchor="middle"
        fill="#D1D5DB"
        fontSize={fontSize}
        fontWeight="bold"
      >
        {text}
      </text>
    );
  };

  // Buat set NIK employee yang bottleneck
  const bottleneckNIKSet = useMemo(() => new Set((bottleneckData || []).filter(emp => emp.isBottleneck).map(emp => emp.nik)), [bottleneckData]);

  // Cari nilai terkecil dari data output
  const minValue = useMemo(() => {
    if (!data.length) return 0;
    return Math.min(...data.map(item => item.output));
  }, [data]);

  const hasBottleneck = bottleneckData && bottleneckData.some(emp => emp.isBottleneck);

  return (
    <div
      className={`bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-700 transform transition-all duration-500 ease-in-out opacity-100 w-full ${className || ''} ${loading ? 'opacity-50' : ''}`}
      style={{ transform: 'none' }}
    >
      <h3 className="text-2xl font-semibold text-gray-100 mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 30,
              right: 5,
              left: 5,
              bottom: 20,
            }}
            maxBarSize={80}
            layout="horizontal"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis
              dataKey="name"
              tick={(props) => {
                const { x, y, payload } = props;
                const { value, dy } = customTickFormatter(payload.value, payload.index);
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={dy}
                      textAnchor="middle"
                      fill="#D1D5DB"
                      fontSize={16}
                      fontWeight="bold"
                    >
                      {value}
                    </text>
                  </g>
                );
              }}
              height={50}
              interval={0}
              stroke="#D1D5DB"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis
              tick={{ fontSize: 18, fill: "#D1D5DB" }}
              stroke="#D1D5DB"
              width={45}
            />
            <Tooltip
              content={(props) => {
                if (props.active && props.payload && props.payload.length) {
                  const chartData = props.payload[0].payload;
                  return (
                    <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
                      <p className="text-gray-200 font-bold mb-1">{chartData.employeeName || chartData.name}</p>
                      <p className="text-gray-400 text-sm">NIK: <span className="text-gray-300 font-medium">{chartData.nik}</span></p>
                      <p className="text-gray-400 text-sm">CBID: <span className="text-yellow-400 font-medium">{chartData.cbid || '0'}</span></p>
                      <div className="my-2 border-t border-gray-600"></div>
                      <p className="text-gray-400 text-sm">Output Daily: <span className="text-blue-400 font-semibold">{chartData.output}</span></p>
                      <p className="text-gray-400 text-sm">Output All: <span className="text-purple-400 font-semibold">{chartData.totalQtyAll ?? '-'}</span></p>
                      <p className="text-gray-400 text-sm">Stock Days: <span className="text-orange-400 font-semibold">{chartData.stockDays ?? '-'}</span></p>
                      {chartData.average !== undefined && (
                        <p className="text-gray-400 text-sm">Average: <span className="text-green-400 font-semibold">{chartData.average}</span></p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Bar
              dataKey={chartConfig.dataKey}
              fill={color}
              radius={chartConfig.barProps.radius}
              minPointSize={5}
              isAnimationActive={false}
              onClick={(data) => {
                // Handle click event
                if (data && data.payload) {
                  handleBarClick(data.payload);
                }
              }}
              style={{ cursor: 'pointer' }}
              name="output"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.statusColor || (bottleneckNIKSet.has(entry.nik) ? '#ef4444' : color)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
              <LabelList
                dataKey={chartConfig.dataKey}
                position={chartConfig.labelProps.position}
                content={renderActualAverageLabel}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottleneck Table Section */}
      {hasBottleneck && (
        <div className="mt-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h4 className="text-lg font-semibold text-red-400">Bottleneck Employees</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className="text-left py-1.5 px-2 font-medium text-gray-300 w-[20%] text-base">NIK</th>
                  <th className="text-left py-1.5 px-2 font-medium text-gray-300 w-[50%] text-base">Name</th>
                  <th className="text-right py-1.5 px-2 font-medium text-gray-300 w-[10%] text-base">Actual</th>
                  <th className="text-right py-1.5 px-2 font-medium text-gray-300 w-[10%] text-base">ASM_OUT</th>
                  <th className="text-right py-1.5 px-2 font-medium text-gray-300 w-[10%] text-base">Target</th>
                </tr>
              </thead>
              <tbody>
                {bottleneckData.filter(emp => emp.isBottleneck).map((employee, index) => {
                  const rowStyle = employee.statusColor
                    ? { backgroundColor: `${employee.statusColor}33` }
                    : {};

                  return (
                    <tr
                      key={index}
                      className={`${!employee.statusColor && employee.isBottleneck ? 'bg-red-900/30' : !employee.statusColor ? 'bg-gray-900/50' : ''} hover:bg-gray-800`}
                      style={rowStyle}
                    >
                      <td className="py-1 px-2 font-mono text-gray-400 text-base truncate">{employee.nik}</td>
                      <td className="py-1 px-2 text-gray-300 text-base truncate">{employee.name}</td>
                      <td className={`py-1 px-2 text-right font-medium text-base ${employee.isBottleneck ? (employee.statusColor ? '' : 'text-red-400') : 'text-gray-300'
                        }`} style={{ color: employee.statusColor }}>
                        {employee.actual}
                      </td>
                      <td className="py-1 px-2 text-right text-gray-400 text-base">{employee.asmOutput}</td>
                      <td className="py-1 px-2 text-right font-medium text-green-400 text-base">{targetDay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Menambahkan style untuk memastikan layout horizontal
const style = document.createElement('style');
style.textContent = `
  /* Custom Scrollbar Styling */
  .custom-scrollbar::-webkit-scrollbar {
    width: 14px;
    height: 14px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: #1F2937;
    border-radius: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #4B5563;
    border-radius: 8px;
    border: 3px solid #1F2937;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #6B7280;
  }

  /* For Firefox */
  .custom-scrollbar {
    scrollbar-width: thick;
    scrollbar-color: #4B5563 #1F2937;
  }

  /* Ensure charts are always in a row */
  .employee-charts-container {
    display: grid !important;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)) !important;
    gap: 1rem !important;
  }
`;
document.head.appendChild(style);

export default React.memo(EmployeeChart, (prevProps, nextProps) => {
  if (prevProps.data !== nextProps.data) return false;
  if (prevProps.bottleneckData !== nextProps.bottleneckData) return false;
  if (prevProps.title !== nextProps.title) return false;
  if (prevProps.color !== nextProps.color) return false;
  if (prevProps.filters !== nextProps.filters) return false;
  if (prevProps.targetDay !== nextProps.targetDay) return false;
  if (prevProps.isRedPart !== nextProps.isRedPart) return false;
  return true;
});