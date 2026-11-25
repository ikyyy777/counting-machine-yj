import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { EmployeeData } from '../../types/dashboard';

interface BottleneckTableProps {
  data: (EmployeeData & { statusColor?: string })[]; // Extend type locally if needed or update EmployeeData
  title: string;
  className?: string;
  targetDay: number;
}

const BottleneckTable: React.FC<BottleneckTableProps> = ({ data, title, className, targetDay }) => {
  return (
    <div className={`${className} p-4 overflow-x-auto`}>
      <div className="flex items-center space-x-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-100">{title} BOTTLENECK</h3>
        {data.some(emp => emp.isBottleneck) && (
          <AlertTriangle className="w-4 h-4 text-red-500" />
        )}
      </div>
      <table className="w-full min-w-[600px] text-base">
        <thead>
          <tr className="bg-gray-800">
            <th className="text-left py-1.5 px-2 font-medium text-gray-300 w-[20%]">NIK</th>
            <th className="text-left py-1.5 px-2 font-medium text-gray-300 w-[50%]">Name</th>
            <th className="text-right py-1.5 px-2 font-medium text-gray-300 w-[10%]">Actual</th>
            <th className="text-right py-1.5 px-2 font-medium text-gray-300 w-[10%]">ASM_OUT</th>
            <th className="text-right py-1.5 px-2 font-medium text-gray-300 w-[10%]">Target</th>
          </tr>
        </thead>
        <tbody>
          {data.filter(emp => emp.isBottleneck).map((employee, index) => {
            const rowStyle = employee.statusColor
              ? { backgroundColor: `${employee.statusColor}33` }
              : {};

            return (
              <tr
                key={index}
                className={`${!employee.statusColor && employee.isBottleneck ? 'bg-red-900/30' : !employee.statusColor ? 'bg-gray-900/50' : ''} hover:bg-gray-800`}
                style={rowStyle}
              >
                <td className="py-1 px-2 font-mono text-gray-400 truncate">{employee.nik}</td>
                <td className="py-1 px-2 text-gray-300 truncate">{employee.name}</td>
                <td className={`py-1 px-2 text-right font-medium ${employee.isBottleneck ? (employee.statusColor ? '' : 'text-red-400') : 'text-gray-300'
                  }`} style={{ color: employee.statusColor }}>
                  {employee.actual}
                </td>
                <td className="py-1 px-2 text-right text-gray-400">{employee.asmOutput}</td>
                <td className="py-1 px-2 text-right font-medium text-green-400">{targetDay}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BottleneckTable;