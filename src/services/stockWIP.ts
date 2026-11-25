import { makeApiRequest } from './api';
import { WIPRow } from '../types/stockWIP';

export const fetchStockWIP = async (params: {
  factory: string;
  dateFrom: string;
  dateTo: string;
}): Promise<WIPRow[]> => {
  const raw = await makeApiRequest<any[]>(
    'get',
    'GetWIPModule',
    {
      params: {
        FACTORY: params.factory,
        DATEFROM: params.dateFrom,
        DATETO: params.dateTo
      },
      timeout: 60000
    }
  );

  return (raw || []).map((item: any): WIPRow => ({
    STYLE: String(item.STYLE ?? ''),
    STYLE_DISPLAY: item.STYLE_DISPLAY ?? null,
    WORK_DATE: String(item.WORK_DATE ?? ''),
    PART: String(item.PART ?? ''),
    LINE_CODE: String(item.LINE_CODE ?? ''),
    LINE_NAME: String(item.LINE_NAME ?? ''),
    ITEM: item.ITEM ?? '',
    SIZE: item.SIZE ?? '',
    COLOR: item.COLOR ?? '',
    PO: item.PO ?? '',
    TOTALOUT: Number(item.TOTALOUT ?? 0),
    TOTALIN: Number(item.TOTALIN ?? 0),
    OUT_OVERRIDE: item.OUT_OVERRIDE ?? null,
    JOIN_IN_OVERRIDE: item.JOIN_IN_OVERRIDE ?? null,
    PERJAM_OUTPUT: Number(item.PERJAM_OUTPUT ?? 0),
    PERJAM_OUTPUT_MANUAL: item.PERJAM_OUTPUT_MANUAL ?? null,
    STOCK_QTY: Number(item.STOCK_QTY ?? 0),
    WIP_ROOM_STOCK:
      item.WIP_ROOM_STOCK !== null
        ? Number(item.WIP_ROOM_STOCK)
        : undefined,
    WIP_ROOM_STOCK_JAM:
      item.WIP_ROOM_STOCK_JAM !== null
        ? Number(item.WIP_ROOM_STOCK_JAM)
        : undefined,
    REMARK_LINE_QTY: item.REMARK_LINE_QTY ?? null,
    REMARK_LINE_JAM: item.REMARK_LINE_JAM ?? null,
    REMARK_ROOM_QTY: item.REMARK_ROOM_QTY ?? null,
    REMARK_ROOM_JAM: item.REMARK_ROOM_JAM ?? null,
    FORMULA: item.FORMULA ?? null,
    FORMULA_CODE: item.FORMULA_CODE ?? null,
    
  }));
};

export const saveWIPManual = async (payload: any) => {
  const safePayload = {
    REMARK_TYPE: '',     // ✅ default supaya tidak pernah missing
    STYLE_DISPLAY: '',
    ...payload
  };

  return makeApiRequest(
    'post',
    'SaveWIPManual',
    {
      data: safePayload,   // ✅ masukkan ke data
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
};


export const saveWIPStockOverride = async (payload: any) => {
  return makeApiRequest(
    'post',
    'SaveWIPStockOverride',
    {
      data: payload,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
};


