import React, { useEffect, useMemo, useState } from 'react';
// import { useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
// import { fetchDailyReportSewing } from '../services/api';
import Header from '../components/DailyReportSewing/header';

export interface DailyReportSewingRow {
    LINE: number | null;
    BUYER: string | null;
    STYLE_NO: string | null;
    FILE_NO: string | null;
    PO_NO: string | null;
    ITEM: string | null;
    COLOR: string | null;
    ORDER_QTY: number | null;
    PROD_QTY: number | null;
    DELI: string | null;
    OP_OTHERS: number | null;
    OP_SW: number | null;
    OP_HP: number | null;
    OP_SS: number | null;
    OP_CB: number | null;
    OP_TOTAL: number | null;
    INPUT_START: string | null;
    OUTPUT_START: string | null;
    OUTPUT_FINISH: string | null;
    WORK_HOUR: number | null;
    TARGET: number | null;
    CUT_TODAY: number | null;
    CUT_TOTAL: number | null;
    CUT_BALANCE: number | null;
    INPUT_TODAY: number | null;
    INPUT_TOTAL: number | null;
    INPUT_BALANCE: number | null;
    QC_UNTIL_8H: number | null;
    QC_AFTER_2H: number | null;
    QC_TODAY: number | null;
    QC_TOTAL: number | null;
    QC_BALANCE: number | null;
    HANGTAG_TODAY: number | null;
    HANGTAG_TOTAL: number | null;
    HANGTAG_BALANCE: number | null;
    FIN_TODAY: number | null;
    FIN_TOTAL: number | null;
    FIN_BALANCE: number | null;
    EXPORT_TODAY?: number | null;
    EXPORT_TOTAL?: number | null;
    EXPORT_BALANCE?: number | null;
    REMARK?: string | null;
    SIGN?: string | null;
  }
  
  const dummyData: DailyReportSewingRow[] = [
    {
      LINE: 25, BUYER: 'TNF-SNOWSPORT', STYLE_NO: 'NF0A4R5U(OTR1)', FILE_NO: 'TNF5083EF5', PO_NO: '', ITEM: '', COLOR: '',
      ORDER_QTY: 5422, PROD_QTY: 2244, DELI: '2025-07-02',
      OP_OTHERS: null, OP_SW: null, OP_HP: null, OP_SS: null, OP_CB: null, OP_TOTAL: null,
      INPUT_START: '2025-04-09', OUTPUT_START: '2025-04-10', OUTPUT_FINISH: '2025-04-25',
      WORK_HOUR: null, TARGET: null,
      CUT_TODAY: 2262, CUT_TOTAL: 18, CUT_BALANCE: 2281,
      INPUT_TODAY: 17, INPUT_TOTAL: null, INPUT_BALANCE: null,
      QC_UNTIL_8H: 0, QC_AFTER_2H: null, QC_TODAY: 0, QC_TOTAL: 2244, QC_BALANCE: 0,
      HANGTAG_TODAY: null, HANGTAG_TOTAL: null, HANGTAG_BALANCE: null,
      FIN_TODAY: null, FIN_TOTAL: null, FIN_BALANCE: null,
    },
    {
      LINE: 25, BUYER: 'TNF-SNOWSPORT', STYLE_NO: 'NF0A4R5U(OTR1)', FILE_NO: 'TNF5083EF5', PO_NO: '', ITEM: '', COLOR: '',
      ORDER_QTY: 5422, PROD_QTY: 990, DELI: '2025-07-02',
      OP_OTHERS: null, OP_SW: null, OP_HP: null, OP_SS: null, OP_CB: null, OP_TOTAL: null,
      INPUT_START: '2025-05-05', OUTPUT_START: '2025-05-05', OUTPUT_FINISH: '2025-05-05',
      WORK_HOUR: null, TARGET: null,
      CUT_TODAY: 895, CUT_TOTAL: 5, CUT_BALANCE: 995,
      INPUT_TODAY: 5, INPUT_TOTAL: null, INPUT_BALANCE: null,
      QC_UNTIL_8H: 0, QC_AFTER_2H: null, QC_TODAY: 0, QC_TOTAL: 990, QC_BALANCE: -10,
      HANGTAG_TODAY: null, HANGTAG_TOTAL: null, HANGTAG_BALANCE: null,
      FIN_TODAY: null, FIN_TOTAL: null, FIN_BALANCE: null,
    },
    {
      LINE: 25, BUYER: 'TNF-SNOWSPORT', STYLE_NO: 'NF0A4R5U(OTR1)', FILE_NO: 'TNF5085AP5', PO_NO: '', ITEM: '', COLOR: '',
      ORDER_QTY: 7825, PROD_QTY: 3776, DELI: '2025-05-29',
      OP_OTHERS: null, OP_SW: null, OP_HP: null, OP_SS: null, OP_CB: null, OP_TOTAL: null,
      INPUT_START: '2025-05-09', OUTPUT_START: '2025-05-13', OUTPUT_FINISH: '2025-06-09',
      WORK_HOUR: null, TARGET: null,
      CUT_TODAY: 3788, CUT_TOTAL: 12, CUT_BALANCE: 3788,
      INPUT_TODAY: 12, INPUT_TOTAL: 15, INPUT_BALANCE: 15,
      QC_UNTIL_8H: 15, QC_AFTER_2H: null, QC_TODAY: 15, QC_TOTAL: 3776, QC_BALANCE: 0,
      HANGTAG_TODAY: null, HANGTAG_TOTAL: null, HANGTAG_BALANCE: null,
      FIN_TODAY: null, FIN_TOTAL: null, FIN_BALANCE: null,
    },
    {
      LINE: 25, BUYER: 'TNF-SNOWSPORT', STYLE_NO: 'NF0A4R5U(OTR1)', FILE_NO: 'TNF5089EEF5', PO_NO: '', ITEM: '', COLOR: '',
      ORDER_QTY: 6795, PROD_QTY: 8471, DELI: '2025-06-17',
      OP_OTHERS: null, OP_SW: null, OP_HP: null, OP_SS: null, OP_CB: null, OP_TOTAL: null,
      INPUT_START: '2025-06-09', OUTPUT_START: '2025-06-09', OUTPUT_FINISH: '2025-07-14',
      WORK_HOUR: null, TARGET: null,
      CUT_TODAY: 8483, CUT_TOTAL: 12, CUT_BALANCE: 8482,
      INPUT_TODAY: 11, INPUT_TOTAL: null, INPUT_BALANCE: null,
      QC_UNTIL_8H: 0, QC_AFTER_2H: null, QC_TODAY: 0, QC_TOTAL: 8471, QC_BALANCE: 0,
      HANGTAG_TODAY: null, HANGTAG_TOTAL: null, HANGTAG_BALANCE: null,
      FIN_TODAY: null, FIN_TOTAL: null, FIN_BALANCE: null,
    },
    {
      LINE: 25, BUYER: 'TNF-SNOWSPORT', STYLE_NO: 'NF0A4R5U(OTR1)', FILE_NO: 'TNF5089AAF5', PO_NO: '', ITEM: '', COLOR: '',
      ORDER_QTY: 5354, PROD_QTY: 5354, DELI: '2025-08-06',
      OP_OTHERS: 7, OP_SW: 70, OP_HP: 12, OP_SS: 8, OP_CB: 12, OP_TOTAL: 133,
      INPUT_START: '2025-07-19', OUTPUT_START: '2025-07-17', OUTPUT_FINISH: '2025-08-14',
      WORK_HOUR: 10.49, TARGET: 283,
      CUT_TODAY: 5352, CUT_TOTAL: -2, CUT_BALANCE: 145,
      INPUT_TODAY: 4561, INPUT_TOTAL: -153, INPUT_BALANCE: 146,
      QC_UNTIL_8H: 89, QC_AFTER_2H: 205, QC_TODAY: 3088, QC_TOTAL: null, QC_BALANCE: -2266,
      HANGTAG_TODAY: null, HANGTAG_TOTAL: null, HANGTAG_BALANCE: null,
      FIN_TODAY: null, FIN_TOTAL: null, FIN_BALANCE: null,
    },
    {
      LINE: 25, BUYER: 'LULU LEMON', STYLE_NO: 'LIW4CMSS', FILE_NO: 'LIW4CNSSWSS', PO_NO: '', ITEM: '', COLOR: '',
      ORDER_QTY: 19, PROD_QTY: 19, DELI: '2025-09-15',
      OP_OTHERS: null, OP_SW: null, OP_HP: null, OP_SS: null, OP_CB: null, OP_TOTAL: null,
      INPUT_START: '2025-08-04', OUTPUT_START: '2025-09-09', OUTPUT_FINISH: '2025-09-09',
      WORK_HOUR: null, TARGET: null,
      CUT_TODAY: 6, CUT_TOTAL: -13, CUT_BALANCE: null,
      INPUT_TODAY: 6, INPUT_TOTAL: -13, INPUT_BALANCE: null,
      QC_UNTIL_8H: 0, QC_AFTER_2H: null, QC_TODAY: 0, QC_TOTAL: 6, QC_BALANCE: -13,
      HANGTAG_TODAY: null, HANGTAG_TOTAL: null, HANGTAG_BALANCE: null,
      FIN_TODAY: null, FIN_TOTAL: null, FIN_BALANCE: null,
    },
  ];

const Cell = ({ children, className = '', ...props }: { children?: React.ReactNode; className?: string } & React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`px-2 py-1 text-xs text-center text-gray-200 border border-slate-700 whitespace-nowrap ${className}`} {...props}>{children ?? ''}</td>
);

const HeadCell = ({ children, className = '', ...props }: { children: React.ReactNode; className?: string, [key: string]: any }) => (
  <th className={`px-2 py-2 text-[10px] text-center uppercase tracking-wider text-gray-300 border border-slate-700 whitespace-nowrap ${className}`} {...props}>{children}</th>
);

const DailyReportSewing: React.FC = () => {
    const [data, setData] = useState<DailyReportSewingRow[]>(dummyData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Tambahkan state filters agar sinkron dengan Header
    const [filters, setFilters] = useState<{ date: Date; factory: string; line: string }>(() => ({
      date: new Date(),
      factory: 'YONGJIN 2',
      line: ''
    }));
  
    const handleLookup = async () => {
      console.log("Tombol Lookup diklik. Menampilkan data dummy.");
      setLoading(false);
      setError(null);
      setData(dummyData);
    };
  
    const totals = useMemo(() => {
      return data.reduce(
        (acc, r) => {
          acc.ORDER_QTY += Number(r.ORDER_QTY || 0);
          acc.PROD_QTY += Number(r.PROD_QTY || 0);
          acc.OP_OTHERS += Number(r.OP_OTHERS || 0);
          acc.OP_SW += Number(r.OP_SW || 0);
          acc.OP_HP += Number(r.OP_HP || 0);
          acc.OP_SS += Number(r.OP_SS || 0);
          acc.OP_CB += Number(r.OP_CB || 0);
          acc.OP_TOTAL += Number(r.OP_TOTAL || 0);
          acc.CUT_TODAY += Number(r.CUT_TODAY || 0);
          acc.CUT_TOTAL += Number(r.CUT_TOTAL || 0);
          acc.INPUT_TODAY += Number(r.INPUT_TODAY || 0);
          acc.INPUT_TOTAL += Number(r.INPUT_TOTAL || 0);
          acc.QC_TODAY += Number(r.QC_TODAY || 0);
          acc.QC_TOTAL += Number(r.QC_TOTAL || 0);
          acc.HANGTAG_TODAY += Number(r.HANGTAG_TODAY || 0);
          acc.HANGTAG_TOTAL += Number(r.HANGTAG_TOTAL || 0);
          acc.FIN_TODAY += Number(r.FIN_TODAY || 0);
          acc.FIN_TOTAL += Number(r.FIN_TOTAL || 0);
          return acc;
        },
        { ORDER_QTY: 0, PROD_QTY: 0, OP_OTHERS: 0, OP_SW: 0, OP_HP: 0, OP_SS: 0, OP_CB: 0, OP_TOTAL: 0, CUT_TODAY: 0, CUT_TOTAL: 0, INPUT_TODAY: 0, INPUT_TOTAL: 0, QC_TODAY: 0, QC_TOTAL: 0, HANGTAG_TODAY: 0, HANGTAG_TOTAL: 0, FIN_TODAY: 0, FIN_TOTAL: 0 }
      );
    }, [data]);
  
    return (
      <div className="min-h-screen bg-gray-900 relative">
        <Header filters={filters} onFiltersChange={setFilters} onLookup={handleLookup} />
  
        {error && <div className="mb-3 p-3 bg-red-900/30 border border-red-700 rounded text-red-200 text-sm">{error}</div>}
        {loading && <div className="text-gray-300">Loading...</div>}
  
        {!loading && (
        <div className="p-4">
          <div className="w-full overflow-x-auto overflow-y-hidden">
            <div className="min-w-max inline-block rounded-lg border border-slate-800 shadow-sm overflow-hidden">
              <table className="min-w-full w-full text-left border-collapse">
                <thead className="bg-slate-800 sticky top-0 z-10">
                  {/* ================= HEADER ASLI ANDA DIKEMBALIKAN ================= */}
                  <tr>
                    <HeadCell rowSpan={2} className="bg-green-900/40">LINE</HeadCell>
                    <HeadCell rowSpan={2} className="bg-green-900/40">BUYER</HeadCell>
                    <HeadCell rowSpan={2} className="bg-green-900/40">STYLE NO</HeadCell>
                    <HeadCell rowSpan={2} className="bg-green-900/40">FILE NO</HeadCell>
                    <HeadCell rowSpan={2} className="bg-green-900/40">PO#</HeadCell>
                    <HeadCell rowSpan={2} className="bg-green-900/40">Item</HeadCell>
                    <HeadCell rowSpan={2} className="bg-green-900/40">COLOR</HeadCell>
                    <HeadCell colSpan={2} className="bg-green-900/40">Qty</HeadCell>
                    <HeadCell rowSpan={2} className="bg-green-900/40">DELI</HeadCell>
                    <HeadCell colSpan={6} className="bg-orange-600/80">Operator</HeadCell>
                    <HeadCell colSpan={1} className="bg-orange-600/80">Input</HeadCell>
                    <HeadCell colSpan={2} className="bg-orange-600/80">Output</HeadCell>
                    <HeadCell rowSpan={2} className="bg-orange-600/80">Work Hour</HeadCell>
                    <HeadCell rowSpan={2} className="bg-orange-600/80">Target</HeadCell>
                    <HeadCell colSpan={3} className="bg-yellow-400/60">CUTTING</HeadCell>
                    <HeadCell colSpan={3} className="bg-yellow-400/60">INPUT</HeadCell>
                    <HeadCell colSpan={5} className="bg-yellow-400/60">End Line QC Output</HeadCell>
                    <HeadCell colSpan={3} className="bg-yellow-400/60">Hangtag</HeadCell>
                    <HeadCell colSpan={3} className="bg-yellow-400/60">Finishing</HeadCell>
                    <HeadCell colSpan={3} className="bg-yellow-400/60">Export</HeadCell>
                    {/* Perbaikan: rowSpan diubah dari 3 menjadi 2 karena header hanya 2 baris */}
                    <HeadCell rowSpan={2} className="bg-yellow-400/60">Remark</HeadCell>
                    <HeadCell rowSpan={2} className="bg-yellow-400/60">Sign</HeadCell>
                  </tr>
                  <tr>
                    <HeadCell className="bg-green-900/40">ORDER</HeadCell>
                    <HeadCell className="bg-green-900/40">PROD</HeadCell>
                    <HeadCell className="bg-orange-600/80">Others</HeadCell>
                    <HeadCell className="bg-orange-600/80">SW</HeadCell>
                    <HeadCell className="bg-orange-600/80">HP</HeadCell>
                    <HeadCell className="bg-orange-600/80">SS</HeadCell>
                    <HeadCell className="bg-orange-600/80">CB</HeadCell>
                    <HeadCell className="bg-orange-600/80">TOTAL</HeadCell>
                    <HeadCell className="bg-orange-600/80">START</HeadCell>
                    <HeadCell className="bg-orange-600/80">START</HeadCell>
                    <HeadCell className="bg-orange-600/80">FINISH</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Today</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Total</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Balance</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Today</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Total</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Balance</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Until 8H</HeadCell>
                    <HeadCell className="bg-yellow-400/60">After 2H</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Today</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Total</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Balance</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Today</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Total</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Balance</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Today</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Total</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Balance</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Today</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Total</HeadCell>
                    <HeadCell className="bg-yellow-400/60">Balance</HeadCell>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr>
                      {/* colSpan disesuaikan dengan jumlah total kolom header */}
                      <td colSpan={46} className="text-center text-gray-400 py-6">No data</td>
                    </tr>
                  )}
                  {data.map((r, idx) => (
                    <tr key={idx} className={`${idx === 4 ? 'bg-orange-900/40' : (idx % 2 === 0 ? 'bg-slate-900/40' : '')}`}>
                      <Cell>{r.LINE}</Cell>
                      <Cell className="text-left">{r.BUYER?.trim?.() || r.BUYER}</Cell>
                      <Cell className="text-left">{r.STYLE_NO}</Cell>
                      <Cell className="text-left">{r.FILE_NO}</Cell>
                      <Cell>{r.PO_NO || '-'}</Cell>
                      <Cell>{r.ITEM || '-'}</Cell>
                      <Cell>{r.COLOR || '-'}</Cell>
                      <Cell>{r.ORDER_QTY?.toLocaleString()}</Cell>
                      <Cell>{r.PROD_QTY?.toLocaleString()}</Cell>
                      <Cell>{r.DELI ? format(new Date(r.DELI), 'd-MMM') : '-'}</Cell>
                      <Cell>{r.OP_OTHERS || '-'}</Cell>
                      <Cell>{r.OP_SW || '-'}</Cell>
                      <Cell>{r.OP_HP || '-'}</Cell>
                      <Cell>{r.OP_SS || '-'}</Cell>
                      <Cell>{r.OP_CB || '-'}</Cell>
                      <Cell>{r.OP_TOTAL || '-'}</Cell>
                      <Cell>{r.INPUT_START ? format(new Date(r.INPUT_START), 'd-MMM') : '-'}</Cell>
                      <Cell>{r.OUTPUT_START ? format(new Date(r.OUTPUT_START), 'd-MMM') : '-'}</Cell>
                      <Cell>{r.OUTPUT_FINISH ? format(new Date(r.OUTPUT_FINISH), 'd-MMM') : '-'}</Cell>
                      <Cell>{r.WORK_HOUR || '-'}</Cell>
                      <Cell>{r.TARGET || '-'}</Cell>
                      <Cell>{r.CUT_TODAY?.toLocaleString()}</Cell>
                      <Cell>{r.CUT_TOTAL?.toLocaleString()}</Cell>
                      <Cell>{r.CUT_BALANCE?.toLocaleString()}</Cell>
                      <Cell>{r.INPUT_TODAY?.toLocaleString()}</Cell>
                      <Cell>{r.INPUT_TOTAL?.toLocaleString()}</Cell>
                      <Cell>{r.INPUT_BALANCE?.toLocaleString()}</Cell>
                      <Cell>{r.QC_UNTIL_8H?.toLocaleString()}</Cell>
                      <Cell>{r.QC_AFTER_2H?.toLocaleString()}</Cell>
                      <Cell>{r.QC_TODAY?.toLocaleString()}</Cell>
                      <Cell>{r.QC_TOTAL?.toLocaleString()}</Cell>
                      <Cell>{r.QC_BALANCE?.toLocaleString()}</Cell>
                      <Cell>{r.HANGTAG_TODAY?.toLocaleString() ?? '0'}</Cell>
                      <Cell>{r.HANGTAG_TOTAL?.toLocaleString() ?? '0'}</Cell>
                      <Cell>{r.HANGTAG_BALANCE?.toLocaleString() ?? '0'}</Cell>
                      <Cell>{r.FIN_TODAY?.toLocaleString() ?? '0'}</Cell>
                      <Cell>{r.FIN_TOTAL?.toLocaleString() ?? '0'}</Cell>
                      <Cell>{r.FIN_BALANCE?.toLocaleString() ?? '0'}</Cell>
                      {/* Kolom tambahan disesuaikan dengan header */}
                      <Cell>{r.EXPORT_TODAY?.toLocaleString() ?? '0'}</Cell>
                      <Cell>{r.EXPORT_TOTAL?.toLocaleString() ?? '0'}</Cell>
                      <Cell>{r.EXPORT_BALANCE?.toLocaleString() ?? '0'}</Cell>
                      <Cell>{r.REMARK || '-'}</Cell>
                      <Cell>{r.SIGN || '-'}</Cell>
                    </tr>
                  ))}
                  {data.length > 0 && (
                    <tr className="bg-blue-900/60 font-semibold">
                      <Cell className="text-right">S.Total</Cell>
                      <Cell />
                      <Cell />
                      <Cell />
                      <Cell />
                      <Cell />
                      <Cell />
                      <Cell>{totals.ORDER_QTY.toLocaleString()}</Cell>
                      <Cell>{totals.PROD_QTY.toLocaleString()}</Cell>
                      <Cell /> {/* DELI */}
                      <Cell>{totals.OP_OTHERS}</Cell>
                      <Cell>{totals.OP_SW}</Cell>
                      <Cell>{totals.OP_HP}</Cell>
                      <Cell>{totals.OP_SS}</Cell>
                      <Cell>{totals.OP_CB}</Cell>
                      <Cell>{totals.OP_TOTAL}</Cell>
                      <Cell colSpan={5} /> {/* Input, Output, Work Hour, Target */}
                      <Cell>{totals.CUT_TODAY.toLocaleString()}</Cell>
                      <Cell>{totals.CUT_TOTAL.toLocaleString()}</Cell>
                      <Cell /> {/* Cut Bal */}
                      <Cell>{totals.INPUT_TODAY.toLocaleString()}</Cell>
                      <Cell>{totals.INPUT_TOTAL.toLocaleString()}</Cell>
                      <Cell /> {/* Input Bal */}
                      <Cell colSpan={2} /> {/* QC Until, After */}
                      <Cell>{totals.QC_TODAY.toLocaleString()}</Cell>
                      <Cell>{totals.QC_TOTAL.toLocaleString()}</Cell>
                      <Cell /> {/* QC Bal */}
                      <Cell>{totals.HANGTAG_TODAY.toLocaleString()}</Cell>
                      <Cell>{totals.HANGTAG_TOTAL.toLocaleString()}</Cell>
                      <Cell /> {/* Hangtag Bal */}
                      <Cell>{totals.FIN_TODAY.toLocaleString()}</Cell>
                      <Cell>{totals.FIN_TOTAL.toLocaleString()}</Cell>
                      <Cell /> {/* Fin Bal */}
                      {/* Kolom tambahan untuk total */}
                      <Cell colSpan={3} /> {/* Export */}
                      <Cell colSpan={2} /> {/* Remark, Sign */}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>
    );
  };
  
  export default DailyReportSewing;