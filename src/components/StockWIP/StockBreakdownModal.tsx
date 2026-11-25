import React, { useState, useEffect } from 'react';
import { WIPRow } from '../../types/stockWIP';
import { saveWIPStockOverride } from '../../services/stockWIP';
import { getAuthToken } from '../../services/api';

interface Props {
  row: WIPRow;
  joinRow?: WIPRow;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const StockBreakdownModal: React.FC<Props> = ({
  row,
  joinRow,
  onClose,
  onSaved
}) => {
  const isJoin = row.PART.trim().toUpperCase() === 'JOIN';
  

const part = row.PART.trim().toUpperCase();

const systemOut = row.TOTALOUT;

let systemJoin = 0;

if (part === 'JOIN') {
  // JOIN dikurangi TOTALIN ASSEMBLY
  systemJoin =
    row.JOIN_IN_OVERRIDE ??
    joinRow?.TOTALIN ??
    0;

} else if (part === 'ASSEMBLY') {
  // ASSEMBLY dikurangi TOTALOUT HELPER
  systemJoin =
    row.JOIN_IN_OVERRIDE ??
    joinRow?.TOTALOUT ??
    0;

} else {
  // PART lain dikurangi TOTALIN JOIN
  systemJoin =
    row.JOIN_IN_OVERRIDE ??
    joinRow?.TOTALIN ??
    0;
}

const [outValue, setOutValue] = useState<number>(
  row.OUT_OVERRIDE ?? systemOut
);

const [joinValue, setJoinValue] = useState<number>(
  row.JOIN_IN_OVERRIDE ?? systemJoin
);

useEffect(() => {
  setOutValue(row.OUT_OVERRIDE ?? row.TOTALOUT);

  if (part === 'JOIN') {
    setJoinValue(row.JOIN_IN_OVERRIDE ?? joinRow?.TOTALIN ?? 0);

  } else if (part === 'ASSEMBLY') {
    setJoinValue(row.JOIN_IN_OVERRIDE ?? joinRow?.TOTALOUT ?? 0);

  } else {
    setJoinValue(row.JOIN_IN_OVERRIDE ?? joinRow?.TOTALIN ?? 0);
  }

}, [row, joinRow]);




let finalStock = 0;

if (part === 'JOIN') {
  // JOIN = OUT - ASSEMBLY_IN
  finalStock = outValue - joinValue;

} else if (part === 'ASSEMBLY') {
  // ASSEMBLY = OUT - HELPER_OUT
  finalStock = outValue - joinValue;

} else {
  // PART lain = OUT - JOIN_IN
  finalStock = outValue - joinValue;
}

finalStock = Math.max(0, finalStock);



  const handleSave = async () => {
    try {
      await saveWIPStockOverride({
        WORK_DATE: row.WORK_DATE,
        LINE_CODE: row.LINE_CODE,
        STYLE: row.STYLE,
        PART: row.PART,
        OUT_OVERRIDE:
          outValue === systemOut ? '' : outValue.toString(),
        JOIN_IN_OVERRIDE:
          joinValue === systemJoin ? '' : joinValue.toString(),
        USERNAME: getCurrentUsername()
      });

      await onSaved();
    } catch (err) {
      console.error(err);
      alert('Failed to save override');
    }
  };

  
const getCurrentUsername = () => {
  const tokenObj = getAuthToken();
  return tokenObj?.userData?.username || 'SYSTEM';
};
  return (
    
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-lg w-[400px] p-6 space-y-4">

        <h2 className="text-lg font-bold text-center">
          Stock Breakdown - {row.PART}
        </h2>

        <div className="space-y-2 text-sm">

                {isJoin ? (
                    <>
                        <div className="flex justify-between">
                        <span>System OUT:</span>
                        <span className="font-semibold">{systemOut}</span>
                        </div>

                        <div className="flex justify-between">
                        <span>System IN:</span>
                        <span className="font-semibold">{systemJoin}</span>
                        </div>

                      
                    </>
                ) : (
        <>
            <div className="flex justify-between">
            <span>System OUT:</span>
            <span className="font-semibold">{systemOut}</span>
            </div>

            <div className="flex justify-between">
            <span>System JOIN IN:</span>
            <span className="font-semibold">{systemJoin}</span>
            </div>
        </>
        )}


          <hr className="border-gray-700" />

       {isJoin ? (
  <>
    <div className="flex justify-between items-center">
      <span>OUT (editable):</span>
      <input
        type="number"
        value={outValue}
        onChange={(e) => setOutValue(Number(e.target.value))}
        className="w-24 bg-gray-800 border border-gray-600 px-2 py-1 text-center rounded"
      />
    </div>

    <div className="flex justify-between items-center">
      <span>IN (editable):</span>
      <input
        type="number"
        value={joinValue}
        onChange={(e) => setJoinValue(Number(e.target.value))}
        className="w-24 bg-gray-800 border border-gray-600 px-2 py-1 text-center rounded"
      />
    </div>
  </>
) : (

  <>
    <div className="flex justify-between items-center">
      <span>OUT (editable):</span>
      <input
        type="number"
        value={outValue}
        onChange={(e) => setOutValue(Number(e.target.value))}
        className="w-24 bg-gray-800 border border-gray-600 px-2 py-1 text-center rounded"
      />
    </div>

    <div className="flex justify-between items-center">
      <span>JOIN IN (editable):</span>
      <input
        type="number"
        value={joinValue}
        onChange={(e) => setJoinValue(Number(e.target.value))}
        className="w-24 bg-gray-800 border border-gray-600 px-2 py-1 text-center rounded"
      />
    </div>
  </>
)}

          <hr className="border-gray-700" />

          <div className="flex justify-between text-base font-bold">
            <span>Final Stock:</span>
            <span>{finalStock} pcs</span>
          </div>

        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
};


export default StockBreakdownModal;
