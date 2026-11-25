import React, { useState, useEffect } from 'react';
import { WIPRow } from '../../types/stockWIP';
import ManualModal from './ManualModal';
import { saveWIPManual } from '../../services/stockWIP';
import StockBreakdownModal from './StockBreakdownModal';
import { getAuthToken } from '../../services/api';


interface Props {
  grouped: Record<string, WIPRow[]>;
  onReload: (resetPage?: boolean) => Promise<void>;
  readOnly?: boolean;   
}

// ==================== COMPONENT EditableCell ====================
interface EditableCellProps {
  value?: string;
  displayValue?: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
  readOnly?: boolean; 
  multiline?: boolean;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  displayValue,
  onSave,
  className = '',
  readOnly = false,
  multiline = false 
}) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  useEffect(() => {
    setVal(value ?? '');
  }, [value]);

  if (readOnly) {
    return (
      <div className={`px-2 py-1 ${className}`}>
        {displayValue ?? value ?? '-'}
      </div>
    );
  }

  const handleSave = async () => {
    setEditing(false);
    if (val.trim() !== (value ?? '').trim()) {
      await onSave(val.trim());
    }
  };

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        rows={4}   // ✅ 4 baris
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleSave}
        className={`w-full bg-gray-900 border border-blue-500 px-2 py-1 text-white rounded resize-none ${className}`}
      />
    ) : (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleSave}
        className={`w-full bg-gray-900 border border-blue-500 px-2 py-1 text-center text-white rounded ${className}`}
      />
    );
  }

  return (
    <div
      className={`cursor-pointer hover:bg-gray-700 px-2 py-1 min-h-[40px] flex items-center justify-center rounded ${className}`}
      onClick={() => setEditing(true)}
    >
      {displayValue ?? value ?? '-'}
    </div>
  );
};
const isOverlineStyle = (style?: string | null) => {
  if (!style) return false;
  return style.toLowerCase().includes('overline');
};

 const getJamColor = (jam: number, item?: string) => {
    if (!item) return 'text-white';

    const itemUpper = item.toUpperCase();

    // RULE 1: SEAM PADD / PADDING
    if (
      (itemUpper.includes('SEAM PADD') ||
      itemUpper.includes('SEAM PADDING')) &&
      jam > 3
    ) {
      return 'text-yellow-300 font-bold';
    }

    // RULE 2: SEAM DOWN
    if (itemUpper.includes('SEAM DOWN') && jam > 2) {
      return 'text-red-600 font-bold';
    }

    // RULE 3: selain itu
    if (jam > 4) {
      return 'text-orange-500 font-bold';
    }

    return 'text-white';
  };


const getJoinRow = (rows: WIPRow[]) =>
  rows.find(r => r.PART.trim().toUpperCase() === 'JOIN');

const calcWipLineStockQty = (row: WIPRow, join?: WIPRow) => {
  if (!join) return 0;
  if (row.PART.trim().toUpperCase() === 'JOIN') {
    return row.TOTALOUT - row.TOTALIN;
  }
  return row.TOTALOUT - join.TOTALIN;
};

const calcRoomStockJam = (stock?: number, perJam?: number) => {
  if (!stock || !perJam) return '';
  return (stock / perJam).toFixed(2);
};

const formatPcs = (val?: number) =>
  val !== undefined ? `${val} pcs` : '-';

const formatJam = (val?: number) =>
  val !== undefined ? `${val.toFixed( 2)} Jam` : '-';

const calcStockQtyJam = (stockQty: number, perJam: number) => {
  if (!perJam) return 0;
  return Number((stockQty / perJam).toFixed(2));
};

const getCurrentUsername = () => {
  const tokenObj = getAuthToken();
  return tokenObj?.userData?.username || 'SYSTEM';
};

const buildPayload = (
  row: WIPRow,
  patch: Partial<WIPRow>
) => {
  // Helper untuk convert ke string atau empty string
  const toStringOrEmpty = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
  };


  return {
    WORK_DATE: row.WORK_DATE,
    LINE_CODE: row.LINE_CODE,
    STYLE: row.STYLE,
    
    // ✅ Kirim empty string jika mau hapus STYLE_DISPLAY
    STYLE_DISPLAY: toStringOrEmpty(patch.STYLE_DISPLAY ?? row.STYLE_DISPLAY),

    PART: row.PART,
    ITEM: toStringOrEmpty(patch.ITEM ?? row.ITEM),
    SIZE: toStringOrEmpty(patch.SIZE ?? row.SIZE),
    COLOR: toStringOrEmpty(patch.COLOR ?? row.COLOR),
    PO: toStringOrEmpty(patch.PO ?? row.PO),

     PERJAM_OUTPUT_MANUAL:
  patch.PERJAM_OUTPUT_MANUAL === null
    ? ''                       // explicit clear → balik ke sistem
    : toStringOrEmpty(
        patch.PERJAM_OUTPUT_MANUAL ?? row.PERJAM_OUTPUT_MANUAL
      ),

    WIP_ROOM_STOCK: toStringOrEmpty(patch.WIP_ROOM_STOCK ?? row.WIP_ROOM_STOCK),
    WIP_ROOM_STOCK_JAM: toStringOrEmpty(patch.WIP_ROOM_STOCK_JAM ?? row.WIP_ROOM_STOCK_JAM),
    REMARKS: toStringOrEmpty((patch as any).REMARKS),
    USERNAME: getCurrentUsername(),
  };
};

  const StockWIPTable: React.FC<Props> = ({ grouped, onReload, readOnly = false }) => {
  const [openBreakdown, setOpenBreakdown] = useState(false); 
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<WIPRow | null>(null);
  const [selectedRow, setSelectedRow] = useState<WIPRow | null>(null);
  const [selectedJoin, setSelectedJoin] = useState<WIPRow | undefined>();

      console.log('=== DEBUG StockWIPTable ===');

  console.log('Total groups:', Object.keys(grouped).length);
  
  Object.values(grouped).forEach((rows, index) => {
    if (rows && rows.length > 0 && rows[0]) {
      const row = rows[0];
      if (row.LINE_NAME === "2") {  // Filter untuk LINE 2 saja
        console.log(`Group ${index} - LINE ${row.LINE_CODE}:`, {
          STYLE: row.STYLE,
          STYLE_DISPLAY: row.STYLE_DISPLAY,
          displayValue: row.STYLE_DISPLAY || row.STYLE,
          rowsCount: rows.length
        });
      }
    }
  });
  console.log('=== END DEBUG ===');
   const DEFAULT_PARTS = [
    "LINING",
    "PART",
    "HOOD",
    "FRONT",
    "BACKSLEEVE",
    "JOIN",
    "ASSEMBLY"
  ];

  return (
    <>
      <div className="space-y-10">
        {Object.values(grouped).map((rows, index) => {
          const join = getJoinRow(rows);
          const line = rows[0]?.LINE_NAME || '';
          const style = rows[0]?.STYLE || '';
          const avgHour = rows[0]?.PERJAM_OUTPUT ?? 0;

          if (!rows[0]) return null;

            console.log(`Rendering group ${index}: LINE ${line}, STYLE: "${style}", STYLE_DISPLAY: "${rows[0]?.STYLE_DISPLAY}"`);
          return (
            <table
              key={`${line}_${style}_${index}`}
              className="min-w-full table-fixed border border-gray-600 text-base text-center"
            >
              {/* ===== HEADER ===== */}
              <thead className="bg-gray-700 font-bold text-white text-lg">
                <tr>
                  <th rowSpan={2} className="border p-2 w-[100px]">LINE</th>
                  <th rowSpan={2} className="border p-2 w-[200px]">STYLE</th>
                  <th rowSpan={2} className="border p-2 w-[120px]">ITEM</th>
                  {/* <th rowSpan={2} className="border p-2">SIZE</th>
                  <th rowSpan={2} className="border p-2">COLOR</th>
                  <th rowSpan={2} className="border p-2">PO</th> */}
                  <th rowSpan={2} className="border p-2 w-[120px]">PERJAM OUTPUT</th>
                  <th colSpan={2} className="border p-2 w-[120px]">POSITION</th>

                  {DEFAULT_PARTS.map(part => (
                    <th
                      key={part}
                      rowSpan={2}
                      className="border p-2 w-[120px]"   // ukuran sama
                    >
                      {part}
                    </th>
                  ))}

                  <th rowSpan={2} className="border p-2 w-[160px]">
                    REMARKS
                  </th>


                </tr>
              </thead>

              {/* ===== BODY ===== */}
              <tbody className="bg-gray-800 text-gray-100">
                {/* Baris 1: WIP LINE - Stock QTY */}
                <tr>
                  {/* LINE (rowSpan=4) */}
                  <td rowSpan={4} className="border p-2 w-[100px] align-middle">
                    <div className="min-h-[160px] flex items-center justify-center h-full">
                      {line}
                    </div>
                  </td>
                  
                {/* STYLE (rowSpan=4) */}
                  <td rowSpan={4} className="border p-2 w-[200px] align-middle">
                <div className="min-h-[160px] flex items-center justify-center h-full">
                  <EditableCell
                    // ✅ PERBAIKI: Gunakan nullish coalescing dengan benar
                    value={(rows[0].STYLE_DISPLAY ?? rows[0].STYLE) || ''}
                    onSave={async (newValue: string) => {
                      const currentDisplay = rows[0].STYLE_DISPLAY ?? '';
                      const isSameAsOriginal = newValue.trim() === rows[0].STYLE.trim() || 
                                            (currentDisplay === '' && newValue.trim() === rows[0].STYLE.trim());
                      const displayValue = isSameAsOriginal ? '' : newValue.trim();
                      
                      const confirmed = window.confirm(
                        `Change display style "${rows[0].STYLE}" to "${displayValue || rows[0].STYLE}" for all Part of this Style?`
                      );
                      
                      if (confirmed) {
                        for (const row of rows) {
                          await saveWIPManual(
                            buildPayload(row, { 
                              STYLE_DISPLAY: displayValue || ''
                            })
                          );
                        }
                        await onReload(false);
                      }
                    }}
                    className={
                      isOverlineStyle(rows[0].STYLE_DISPLAY ?? rows[0].STYLE ?? '')
                        ? 'text-yellow-400 font-bold'
                        : ''
                    }
                    readOnly={readOnly}
                  />
                </div>
              </td>
                  
                  {/* ITEM (rowSpan=4) */}
                  <td rowSpan={4} className="border p-2 w-[120px] align-middle">
                    <div className="min-h-[160px] flex items-center justify-center h-full">
                      <EditableCell
                        value={rows[0].ITEM || ''}
                        onSave={async (newValue: string) => {
                          await saveWIPManual(
                            buildPayload(rows[0], { ITEM: newValue })
                          );
                          await onReload(false);
                        }}
                        className="h-full"
                        readOnly={readOnly}
                      />
                    </div>
                  </td>
                  
                  {/* SIZE (rowSpan=4) */}
          {/*  <td 
                    rowSpan={4} 
                    className="border p-2 align-top"
                  >
                    <div className="min-h-[160px] flex items-center justify-center h-full">
                      <EditableCell
                        value={rows[0].SIZE || ''}
                        onSave={async (newValue: string) => {
                          await saveWIPManual(
                            buildPayload(rows[0], { SIZE: newValue })
                          );
                          await onReload();
                        }}
                        className="h-full"
                      />
                    </div>
                  </td>  */}
                  
                  {/* COLOR (rowSpan=4) */}
                 {/*  <td 
                    rowSpan={4} 
                    className="border p-2 align-top"
                  >
                    <div className="min-h-[160px] flex items-center justify-center h-full">
                      <EditableCell
                        value={rows[0].COLOR || ''}
                        onSave={async (newValue: string) => {
                          await saveWIPManual(
                            buildPayload(rows[0], { COLOR: newValue })
                          );
                          await onReload();
                        }}
                        className="h-full"
                      />
                    </div>
                  </td> */}
                  
                  {/* PO (rowSpan=4) */}
                {/*   <td 
                    rowSpan={4} 
                    className="border p-2 align-top"
                  >
                    <div className="min-h-[160px] flex items-center justify-center h-full">
                      <EditableCell
                        value={rows[0].PO || ''}
                        onSave={async (newValue: string) => {
                          await saveWIPManual(
                            buildPayload(rows[0], { PO: newValue })
                          );
                          await onReload();
                        }}
                        className="h-full"
                      />
                    </div>
                  </td> */}
                  
                  {/* PERJAM OUTPUT (rowSpan=4) */}
               <td rowSpan={4} className="border p-2 w-[120px] align-middle font-bold">

                  <div className="min-h-[160px] flex items-center justify-center h-full">
                    <EditableCell
                      value={String(
                        rows[0].PERJAM_OUTPUT_MANUAL ?? rows[0].PERJAM_OUTPUT
                      )}
                    onSave={async (newValue: string) => {
                  const manual =
                    newValue.trim() === ''
                      ? ''
                      : newValue.trim();

                  await saveWIPManual({
                    WORK_DATE: rows[0].WORK_DATE,
                    LINE_CODE: rows[0].LINE_CODE,
                    STYLE: rows[0].STYLE,
                    STYLE_DISPLAY: rows[0].STYLE_DISPLAY ?? '',   // ✅ WAJIB
                    PART: '*',                                    

                    ITEM: '',
                    SIZE: '',
                    COLOR: '',
                    PO: '',

                    WIP_ROOM_STOCK: '',
                    WIP_ROOM_STOCK_JAM: '',
                    PERJAM_OUTPUT_MANUAL: manual,
                    REMARKS: '',

                    USERNAME: getCurrentUsername(),

                  });

                  await onReload(false);
                }}

                      className= ""
                      //{
                        //rows[0].PERJAM_OUTPUT_MANUAL != null
                          //? 'text-yellow-400 font-bold'
                          //: ''
                      //}
                      readOnly={readOnly}
                    />
                  </div>
                </td>

                  
                  {/* WIP LINE (rowSpan=2) */}
                  <td 
                    rowSpan={2} 
                    className="border p-2 w-[60px] align-middle font-bold"
                    style={{ verticalAlign: 'top' }}
                  >
                    <div className="min-h-[80px] flex items-center justify-center h-full">
                      WIP LINE
                    </div>
                  </td>
                  
                  {/* Stock QTY */}
                  <td className="border p-2 w-[60px]">Stock QTY</td>
                  
                  {/* Stock QTY untuk setiap PART */}
                {DEFAULT_PARTS.map(part => {
                  const normalize = (v?: string) =>
                    v?.replace(/\s+/g, '').toUpperCase();

                const r = rows.find(
                  x => normalize(x.PART) === normalize(part)
                );

                return (
                  <td
                    key={part}
                    className="border p-2 w-[120px] cursor-pointer hover:bg-gray-700"
                   onClick={() => {
                      const baseRow = r ?? {
                        ...rows[0],
                        PART: part,
                        STOCK_QTY: 0,
                        TOTALOUT: 0,
                        TOTALIN: 0
                      };

                      let relatedRow: WIPRow | undefined;

                      const partUpper = part.toUpperCase();

                      if (partUpper === 'JOIN') {
                        relatedRow = rows.find(x => x.PART.trim().toUpperCase() === 'ASSEMBLY');
                      } else if (partUpper === 'ASSEMBLY') {
                        relatedRow = rows.find(x => x.PART.trim().toUpperCase() === 'HELPER');
                      } else {
                        relatedRow = rows.find(x => x.PART.trim().toUpperCase() === 'JOIN');
                      }
                      if (readOnly) return;
                      setSelectedRow(baseRow);
                      setSelectedJoin(relatedRow);
                      setOpenBreakdown(true);
                    }}

                  >
                    <span className="whitespace-nowrap">
                      {r ? formatPcs(r.STOCK_QTY) : "0 pcs"}
                    </span>
                  </td>
                );
              })}

              <td className="border p-2 w-[160px] align-top">
                <EditableCell
                  value={rows[0].REMARK_LINE_QTY || ''}
                  multiline
                  onSave={async (newValue: string) => {
                    await saveWIPManual({
                      ...buildPayload(rows[0], {}),
                      PART: '*',
                      REMARK_TYPE: 'LINE_QTY',
                      REMARKS: newValue
                    });
                    await onReload(false);
                  }}
                  className="text-left"
                  readOnly={readOnly}
                />
              </td>
                </tr>

                {/* Baris 2: WIP LINE - Stock QTY JAM */}
                <tr>
                  <td className="border p-2 w-[60px]">Stock QTY JAM</td>
                                {DEFAULT_PARTS.map(part => {
                  const normalize = (v?: string) =>
                    v?.replace(/\s+/g, '').toUpperCase();

                  const r = rows.find(
                    x => normalize(x.PART) === normalize(part)
                  );

                  const jam = r
                    ? calcStockQtyJam(r.STOCK_QTY, r.PERJAM_OUTPUT)
                    : 0;

                  return (
                    <td
                      key={part}
                      className={`border p-2 w-[120px] font-bold ${getJamColor(jam, rows[0].ITEM ?? undefined)}`}
                    >
                      {formatJam(jam)}
                    </td>
                  );
                })}
                  <td className="border p-2 w-[160px] align-top">
                    <EditableCell
                      value={rows[0].REMARK_LINE_JAM || ''}
                      multiline
                      onSave={async (newValue: string) => {
                        await saveWIPManual({
                          ...buildPayload(rows[0], {}),
                          PART: '*',
                          REMARK_TYPE: 'LINE_JAM',
                          REMARKS: newValue
                        });
                        await onReload(false);
                      }}
                      className="text-left"
                      readOnly={readOnly}
                    />
                  </td>
                </tr>

                {/* Baris 3: WIP ROOM - Stock QTY */}
                <tr>
                  {/* WIP ROOM (rowSpan=2) */}
                  <td 
                    rowSpan={2} 
                    className="border p-2 w-[60px] align-middle font-bold"
                    style={{ verticalAlign: 'top' }}
                  >
                    <div className="min-h-[80px] flex items-center justify-center h-full">
                      WIP ROOM
                    </div>
                  </td>
                  
                  <td className="border p-2">Stock QTY</td>
                  {DEFAULT_PARTS.map(part => {
                    const normalize = (v?: string) =>
                      v?.replace(/\s+/g, '').toUpperCase();

                    const r = rows.find(
                      x => normalize(x.PART) === normalize(part)
                    );

                    return (
                      <td key={part} className="border p-2 w-[120px]">
                      <EditableCell
                        value={String(r?.WIP_ROOM_STOCK ?? '')}
                        displayValue={`${r?.WIP_ROOM_STOCK ?? 0} pcs`}
                        onSave={async (newValue: string) => {
                          const existingRow = rows.find(
                            x => normalize(x.PART) === normalize(part)
                          );

                          const baseRow: WIPRow = existingRow ?? {
                            LINE_NAME: rows[0].LINE_NAME,
                            WORK_DATE: rows[0].WORK_DATE,
                            LINE_CODE: rows[0].LINE_CODE,
                            STYLE: rows[0].STYLE,
                            STYLE_DISPLAY: rows[0].STYLE_DISPLAY ?? '',
                            PART: part,
                            ITEM: rows[0].ITEM ?? '',
                            SIZE: '',
                            COLOR: '',
                            PO: '',
                            PERJAM_OUTPUT_MANUAL: rows[0].PERJAM_OUTPUT_MANUAL ?? undefined,
                            PERJAM_OUTPUT: rows[0].PERJAM_OUTPUT ?? 0,
                            WIP_ROOM_STOCK: 0,
                            WIP_ROOM_STOCK_JAM: 0,
                            
                            TOTALIN: 0,
                            TOTALOUT: 0,
                            STOCK_QTY: 0
                          };

                          await saveWIPManual(
                            buildPayload(baseRow, {
                              WIP_ROOM_STOCK:
                                newValue === '' ? 0 : Number(newValue)
                            })
                          );

                          await onReload(false);
                        }}
                        readOnly={readOnly}
                      />
                      </td>
                    );
                  })}
                  <td className="border p-2 w-[160px] align-top">
                    <EditableCell
                      value={rows[0].REMARK_ROOM_QTY || ''}
                      multiline
                      onSave={async (newValue: string) => {
                        await saveWIPManual({
                          ...buildPayload(rows[0], {}),
                          PART: '*',
                          REMARK_TYPE: 'ROOM_QTY',
                          REMARKS: newValue
                        });
                        await onReload(false);
                      }}
                      className="text-left"
                      readOnly={readOnly}
                    />
                  </td>
                </tr>

               {/* Baris 4: WIP ROOM - Stock QTY JAM */}
                <tr>
                  <td className="border p-2">Stock QTY JAM</td>
                                    {DEFAULT_PARTS.map(part => {
                    const normalize = (v?: string) =>
                      v?.replace(/\s+/g, '').toUpperCase();

                    const r = rows.find(
                      x => normalize(x.PART) === normalize(part)
                    );

                    const jam =
                      r && r.WIP_ROOM_STOCK && r.PERJAM_OUTPUT
                        ? r.WIP_ROOM_STOCK / r.PERJAM_OUTPUT
                        : 0;

                    return (
                      <td
                        key={part}
                        className={`border p-2 w-[120px] font-bold ${getJamColor(Math.abs(jam))}`}
                      >
                        {formatJam(jam)}
                      </td>
                    );
                  })}
                <td className="border p-2 w-[160px] align-top">
                  <EditableCell
                    value={rows[0].REMARK_ROOM_JAM || ''}
                    multiline
                    onSave={async (newValue: string) => {
                      await saveWIPManual({
                        ...buildPayload(rows[0], {}),
                        PART: '*',
                        REMARK_TYPE: 'ROOM_JAM',
                        REMARKS: newValue
                      });
                      await onReload(false);
                    }}
                    className="text-left"
                    readOnly={readOnly}
                  />
                </td>
                </tr>
              </tbody>
            </table>
          );
        })}
      </div>

      {!readOnly && selected && (
        <ManualModal
          open={open}
          initial={selected}
          onClose={() => setOpen(false)}
          onSave={async form => {
            await saveWIPManual({
              WORK_DATE: selected.WORK_DATE,
              LINE_CODE: selected.LINE_CODE,
              STYLE: selected.STYLE,
              ITEM: form.ITEM,
              SIZE: form.SIZE,
              COLOR: form.COLOR,
              PO: form.PO,
              USERNAME: getCurrentUsername(),
            });
            setOpen(false);
          }}
        />
      )}
      {openBreakdown && selectedRow && (
        <StockBreakdownModal
          row={selectedRow}
          joinRow={selectedJoin}
          onClose={() => setOpenBreakdown(false)}
          onSaved={async () => {
            setOpenBreakdown(false);
            await onReload(false);
          }}
        />
      )}

    </>
  );
};

export default StockWIPTable;