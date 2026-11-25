import React from 'react';
import { DefectData } from '../../types/defect';

interface ProductionInfoProps {
  data: DefectData;
}

const ProductionInfo: React.FC<ProductionInfoProps> = ({ data }) => {
  // Memisahkan dan menukar nilai orderQty
  const [ord, pqty] = data.orderQty.split('/');
  const swappedOrderQty = pqty ? `${pqty}/${ord}` : data.orderQty;

  // Fungsi untuk menghitung average output berdasarkan jam kerja produktif
  const calculateOutputPerHour = () => {
    // Filter data yang memiliki output > 0 dan hanya jam kerja valid (8-21)
    const productiveHours = data.hourlyOutputs.filter(item => {
      const hour = parseInt(item.time);
      return hour >= 8 && hour <= 21 && item.output > 0;
    });

    if (productiveHours.length === 0) return 0;

    // Hitung total output dari jam-jam yang produktif
    const totalOutput = productiveHours.reduce((sum, item) => sum + item.output, 0);
    
    // Jumlah jam produktif adalah jumlah data yang memiliki output
    const totalProductiveHours = productiveHours.length;
    
    return totalProductiveHours > 0 ? Math.round(totalOutput / totalProductiveHours) : 0;
  };

  const outputPerHour = calculateOutputPerHour();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 bg-gray-800 p-4 lg:p-8 rounded-lg">
      {/* Left Column - Production Info */}
      <div className="space-y-3 lg:space-y-6">
        <InfoRow label="STYLE #" value={data.style} />
        <InfoRow label="COLOR #" value={data.color} />
        <InfoRow label="BUYER" value={data.buyer} />
        <InfoRow label="P.QTY/ORDER" value={swappedOrderQty} />
        <InfoRow label="PO NUMBER" value={data.poNumber.toString()} />
        <InfoRow label="INSPECTION" value={`${data.inspection} pcs`} />
        <InfoRow label="TOTAL DEFECT" value={`${data.defectCount} pcs`} />
        <InfoRow label="TOTAL REPAIR" value={`${data.totalRepair} pcs`} />
        <div>
          <div className="text-gray-400 text-xl lg:text-3xl mb-2 lg:mb-4">TOP 3 DEFECT</div>
          <div className="pl-4 lg:pl-6 space-y-2 lg:space-y-3">
            {data.topDefects.map((defect, index) => (
              <div key={index} className="text-red-500 text-xl lg:text-3xl font-medium">
                {index + 1} {defect}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - Output & Target */}
      <div className="space-y-4 lg:space-y-8">
        {/* Output and Defect Percentage */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-red-500 text-2xl lg:text-4xl font-semibold mb-2 lg:mb-4">OUTPUT</div>
            <div className="text-6xl lg:text-9xl font-bold text-white mb-1 lg:mb-2">{data.output}</div>
            <div className="text-yellow-500 text-xl lg:text-3xl">{outputPerHour} pcs/hour</div>
          </div>

          {/* Defect Progress Circle */}
          <div className="text-center">
            <div className="relative inline-block">
              <svg className="w-32 h-32 lg:w-56 lg:h-56">
                {/* Mobile Circle - Defect */}
                <circle
                  className="text-gray-700 lg:hidden"
                  strokeWidth="20"
                  stroke="currentColor"
                  fill="transparent"
                  r="50"
                  cx="64"
                  cy="64"
                />
                {/* Desktop Circle - Defect */}
                <circle
                  className="text-gray-700 hidden lg:block"
                  strokeWidth="20"
                  stroke="currentColor"
                  fill="transparent"
                  r="90"
                  cx="112"
                  cy="112"
                />
                {/* Mobile Progress - Defect */}
                <circle
                  className="text-red-500 lg:hidden"
                  strokeWidth="20"
                  strokeDasharray={314.16}
                  strokeDashoffset={314.16 * (1 - data.defectPercentage / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="50"
                  cx="64"
                  cy="64"
                />
                {/* Desktop Progress - Defect */}
                <circle
                  className="text-red-500 hidden lg:block"
                  strokeWidth="20"
                  strokeDasharray={565.2}
                  strokeDashoffset={565.2 * (1 - data.defectPercentage / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="90"
                  cx="112"
                  cy="112"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl lg:text-5xl font-semibold text-white">{data.defectPercentage}%</span>
              </div>
            </div>
            <div className="text-red-500 text-xl lg:text-3xl mt-2">Defect</div>
          </div>
        </div>

        {/* Target and Target Percentage */}
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-green-500 text-2xl lg:text-4xl font-semibold mb-2 lg:mb-4">TARGET</div>
            <div className="text-6xl lg:text-9xl font-bold text-white mb-1 lg:mb-2">{data.target}</div>
            <div className="text-yellow-500 text-xl lg:text-3xl">{data.targetPerHour} pcs/hour</div>
          </div>

          {/* Target Progress Circle */}
          <div className="text-center">
            <div className="relative inline-block">
              <svg className="w-32 h-32 lg:w-56 lg:h-56">
                {/* Mobile Circle - Target */}
                <circle
                  className="text-gray-700 lg:hidden"
                  strokeWidth="20"
                  stroke="currentColor"
                  fill="transparent"
                  r="50"
                  cx="64"
                  cy="64"
                />
                {/* Desktop Circle - Target */}
                <circle
                  className="text-gray-700 hidden lg:block"
                  strokeWidth="20"
                  stroke="currentColor"
                  fill="transparent"
                  r="90"
                  cx="112"
                  cy="112"
                />
                {/* Mobile Progress - Target */}
                <circle
                  className="text-blue-500 lg:hidden"
                  strokeWidth="20"
                  strokeDasharray={314.16}
                  strokeDashoffset={314.16 * (1 - data.targetPercentage / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="50"
                  cx="64"
                  cy="64"
                />
                {/* Desktop Progress - Target */}
                <circle
                  className="text-blue-500 hidden lg:block"
                  strokeWidth="20"
                  strokeDasharray={565.2}
                  strokeDashoffset={565.2 * (1 - data.targetPercentage / 100)}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="90"
                  cx="112"
                  cy="112"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl lg:text-5xl font-semibold text-white">{data.targetPercentage}%</span>
              </div>
            </div>
            <div className="text-blue-500 text-xl lg:text-3xl mt-2">Target</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid grid-cols-2 gap-2 lg:gap-4">
    <div className="text-gray-400 text-lg lg:text-3xl">{label}</div>
    <div className="text-white text-lg lg:text-3xl font-medium">{value}</div>
  </div>
);

export default ProductionInfo; 