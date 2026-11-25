import React from 'react';
import { VibrationDataResponse } from '../../types/api';

interface VibrationTableProps {
  data: VibrationDataResponse[];
  isLoading?: boolean;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Machine & Operator Active':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Only Machine Active':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'Only Operator Active':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'Button Up, No Vibration':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Vibration Up, No Button':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Vibration Up, Button Late':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'No Activity':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'MORE_INFO':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
      {status === 'MORE_INFO' ? 'Summary' : status}
    </span>
  );
};

export const VibrationTable: React.FC<VibrationTableProps> = ({ data, isLoading }) => {
  const renderProcessName = (processName?: string) => {
    const parts = String(processName ?? '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length === 0) return '-';

    return (
      <div className="space-y-0.5">
        {parts.map((p, idx) => (
          <div key={idx} className="text-slate-300">
            {idx + 1}. {p}
          </div>
        ))}
      </div>
    );
  };

  const getRowBackgroundColor = (row: VibrationDataResponse) => {
    const c = String(row.STATUS_COLOR ?? '').trim();
    if (!c) return undefined;
    // Only allow hex colors to avoid CSS injection
    if (!/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(c)) return undefined;

    // Convert hex to rgba with low alpha so it becomes a soft highlight
    const hex = c.replace('#', '');
    const fullHex = hex.length === 3
      ? hex.split('').map((ch) => ch + ch).join('')
      : hex.padStart(6, '0');

    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  };

  // Group data by SERIAL_NO and NIK, and sort by JAM with TOTAL always at the end
  const groupedData = data.reduce((acc, curr) => {
    const key = `${curr.SERIAL_NO}-${curr.NIK}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, VibrationDataResponse[]>);

  // Sort each group to ensure correct time order and TOTAL at the end
  Object.keys(groupedData).forEach(key => {
    groupedData[key].sort((a, b) => {
      // TOTAL selalu di akhir
      if (a.JAM === 'TOTAL') return 1;
      if (b.JAM === 'TOTAL') return -1;

      // Konversi jam ke angka untuk perbandingan yang lebih akurat
      const timeA = parseInt(a.JAM.split(':')[0]);
      const timeB = parseInt(b.JAM.split(':')[0]);
      
      return timeA - timeB;
    });
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-slate-700/50 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-700/50 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto rounded-lg border border-slate-700">
        <table className="min-w-full bg-slate-800">
          <thead className="bg-slate-700 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Employee</th>
              <th className="px-3 py-3.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Part</th>
              <th className="px-3 py-3.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Process</th>
              <th className="px-3 py-3.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Censor Type</th>
              <th className="px-3 py-3.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Time</th>
              <th className="px-3 py-3.5 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Vibration</th>
              <th className="px-3 py-3.5 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Button</th>
              <th className="px-3 py-3.5 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">Difference</th>
              <th className="px-3 py-3.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
              <th className="px-3 py-3.5 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 overflow-y-auto bg-slate-800/50">
            {Object.values(groupedData).map((group) => (
              <React.Fragment key={`${group[0].SERIAL_NO}-${group[0].NIK}`}>
                {group.map((row, index) => {
                  const cellBg = getRowBackgroundColor(row);
                  return (
                  <tr 
                    key={`${row.SERIAL_NO}-${row.NIK}-${row.JAM}`}
                    className={index === group.length - 1 ? 'bg-slate-800/30 border-b-2 border-blue-900' : ''}
                  >
                    {index === 0 && (
                      <>
                        <td 
                          className="px-3 py-4 text-sm text-white align-top"
                          rowSpan={group.length}
                          style={{ backgroundColor: 'transparent' }}
                        >
                          <div className="font-medium">{row.E_NAME}</div>
                          <div className="text-slate-400 text-xs mt-0.5">NIK: {row.NIK}</div>
                          <div className="text-slate-400 text-xs mt-0.5">CBID: {row.SERIAL_NO}</div>
                        </td>
                        <td 
                          className="px-3 py-4 text-sm text-white align-top"
                          rowSpan={group.length}
                          style={{ backgroundColor: 'transparent' }}
                        >
                          {row.PART}
                        </td>
                        <td
                          className="px-3 py-4 text-sm align-top"
                          rowSpan={group.length}
                        >
                          {renderProcessName(row.PROCESS_NAME)}
                        </td>
                        <td
                          className="px-3 py-4 text-sm text-slate-300 align-top"
                          rowSpan={group.length}
                        >
                          {row.IPADDR || '-'}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-4 text-sm text-slate-300" style={{ backgroundColor: cellBg }}>
                      {row.JAM === 'TOTAL' ? (
                        <strong className="text-blue-400">TOTAL</strong>
                      ) : (
                        row.JAM
                      )}
                    </td>
                    <td className="px-3 py-4 text-sm text-right text-slate-300" style={{ backgroundColor: cellBg }}>{row.QTY_VIBRASI}</td>
                    <td className="px-3 py-4 text-sm text-right text-slate-300" style={{ backgroundColor: cellBg }}>{row.QTY_BUTTON}</td>
                    <td className="px-3 py-4 text-sm text-right text-slate-300" style={{ backgroundColor: cellBg }}>{row.DATA_DIFFERENCES}</td>
                    <td className="px-3 py-4 text-sm" style={{ backgroundColor: cellBg }}>
                      <StatusBadge status={row.WORK_STATUS} />
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-300" style={{ backgroundColor: cellBg }}>
                      {row.REMARK_ACTION || '-'}
                    </td>
                  </tr>
                )})}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};