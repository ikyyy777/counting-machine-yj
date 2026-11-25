export interface WIPRow {
  WORK_DATE: string;
  LINE_CODE: string;
  LINE_NAME: string;
  STYLE: string;
  STYLE_DISPLAY: string | null; 
  ITEM: string | null;
  SIZE: string | null;
  COLOR: string | null;
  PO: string | null;
  PART: string;
  TOTALOUT: number;
  TOTALIN: number;
  OUT_OVERRIDE?: number | null;
  JOIN_IN_OVERRIDE?: number | null;

  PERJAM_OUTPUT: number;
  PERJAM_OUTPUT_MANUAL?: number;
  STOCK_QTY: number;
  
  WIP_ROOM_STOCK?: number;
  WIP_ROOM_STOCK_JAM?: number;

  // 🔥 GANTI INI
  REMARK_LINE_QTY?: string | null;
  REMARK_LINE_JAM?: string | null;
  REMARK_ROOM_QTY?: string | null;
  REMARK_ROOM_JAM?: string | null;

  FORMULA?: string | null;
  FORMULA_CODE?: string | null;
}
