import { makeApiRequest } from "./api";
import {
  CBSewingOutputRow,
  CBSewingOutputMeta,
  CBSewingOutputResponse,
  CBOpDataPerProcessRow,
  CBOpDataPerProcessMeta,
  CBOpDataPerProcessResponse,
} from "../types/cbSewingOutput";

const normalizeFactory = (factory: string) => {
  if (!factory) return "";
  const upper = factory.toUpperCase().trim();
  if (upper.startsWith("YONGJIN 2")) {
    return "YONGJIN 2";
  }
  return upper;
};

export const fetchCBSewingOutput = async (params: {
  factory: string;
  lineNo: string;
  styleNo: string;
  workDate: string;
  filterModule?: boolean;
  noCache?: boolean;
}): Promise<{ meta: CBSewingOutputMeta | null; data: CBSewingOutputRow[] }> => {
  const queryParams = {
    FACTORY: normalizeFactory(params.factory),
    LINENO: params.lineNo,
    STYLENO: params.styleNo,
    WORKDATE: params.workDate,
    FILTER_MODULE: params.filterModule ? "true" : "false",
    ...(params.noCache ? { nocache: "true" } : {}),
  };

  const raw = await makeApiRequest<CBSewingOutputResponse>(
    "get",
    "GetCBSewingOutputData",
    {
      params: queryParams,
      timeout: 90000,
      noCache: params.noCache,
    }
  );

  const meta = raw?.meta || null;
  const data = (raw?.data || []).map((item: any): CBSewingOutputRow => ({
    ...item,
    STYLE: String(item.STYLE ?? ""),
    PREP_ID: item.PREP_ID != null ? String(item.PREP_ID) : "",
    MODULE: String(item.MODULE ?? ""),
    SPLIT_MODULE: String(item.SPLIT_MODULE ?? ""),
    NIK: String(item.NIK ?? "").trim(),
    E_NAME: String(item.E_NAME ?? ""),
    FLOW_NO: String(item.FLOW_NO ?? ""),
    PROCESS_NO: String(item.PROCESS_NO ?? ""),
    PROCESS_NAME: String(item.PROCESS_NAME ?? ""),
    AUTO_SEQ: Number(item.AUTO_SEQ ?? 0),
    TOTAL_OUTPUT: Number(item.TOTAL_OUTPUT ?? 0),
    STOCK_OP: Number(item.STOCK_OP ?? 0),
    BALANCE: Number(item.BALANCE ?? item.STOCK_OP ?? 0),
    MISSING_OUTPUT: Number(item.MISSING_OUTPUT ?? item.missing_output ?? 0),
    MISSING_OUTPUT_UPDATED_BY: item.MISSING_OUTPUT_UPDATED_BY ?? item.missing_output_updated_by ?? null,
    MISSING_OUTPUT_UPDATED_AT: item.MISSING_OUTPUT_UPDATED_AT ?? item.missing_output_updated_at ?? null,
    MISSING_SOURCE_NIK: item.MISSING_SOURCE_NIK ?? item.missing_source_nik ?? null,
    DAILY_OUTPUTS: item.DAILY_OUTPUTS || {},
    TASKS: Array.isArray(item.TASKS) ? item.TASKS : [],
  }));

  return { meta, data };
};

export const fetchCBSewingOutput2 = async (params: {
  factory: string;
  lineNo: string;
  styleNo: string;
  workDate: string;
  filterModule?: boolean;
  noCache?: boolean;
}): Promise<{ meta: CBSewingOutputMeta | null; data: CBSewingOutputRow[] }> => {
  const queryParams = {
    FACTORY: normalizeFactory(params.factory),
    LINENO: params.lineNo,
    STYLENO: params.styleNo,
    WORKDATE: params.workDate,
    FILTER_MODULE: params.filterModule ? "true" : "false",
    ...(params.noCache ? { nocache: "true" } : {}),
  };

  const raw = await makeApiRequest<CBSewingOutputResponse>(
    "get",
    "GetCBSewingOutputData2",
    {
      params: queryParams,
      timeout: 90000,
      noCache: params.noCache,
    }
  );

  const meta = raw?.meta || null;
  const data = (raw?.data || []).map((item: any): CBSewingOutputRow => ({
    ...item,
    STYLE: String(item.STYLE ?? ""),
    PREP_ID: item.PREP_ID != null ? String(item.PREP_ID) : "",
    MODULE: String(item.MODULE ?? ""),
    SPLIT_MODULE: String(item.SPLIT_MODULE ?? ""),
    NIK: String(item.NIK ?? "").trim(),
    E_NAME: String(item.E_NAME ?? ""),
    FLOW_NO: String(item.FLOW_NO ?? ""),
    PROCESS_NO: String(item.PROCESS_NO ?? ""),
    PROCESS_NAME: String(item.PROCESS_NAME ?? ""),
    AUTO_SEQ: Number(item.AUTO_SEQ ?? 0),
    TOTAL_OUTPUT: Number(item.TOTAL_OUTPUT ?? 0),
    STOCK_OP: Number(item.STOCK_OP ?? 0),
    BALANCE: Number(item.BALANCE ?? item.STOCK_OP ?? 0),
    MISSING_OUTPUT: Number(item.MISSING_OUTPUT ?? item.missing_output ?? 0),
    MISSING_OUTPUT_UPDATED_BY: item.MISSING_OUTPUT_UPDATED_BY ?? item.missing_output_updated_by ?? null,
    MISSING_OUTPUT_UPDATED_AT: item.MISSING_OUTPUT_UPDATED_AT ?? item.missing_output_updated_at ?? null,
    MISSING_SOURCE_NIK: item.MISSING_SOURCE_NIK ?? item.missing_source_nik ?? null,
    DAILY_OUTPUTS: item.DAILY_OUTPUTS || {},
    TASKS: Array.isArray(item.TASKS) ? item.TASKS : [],
  }));

  return { meta, data };
};

// ----------------------------------------------------------------
// FETCH DATA PER PROCESS DARI CBC_GET_ALL_OP_DATA_PER_PROCESS
// ----------------------------------------------------------------
export const fetchCBOpDataPerProcess = async (params: {
  factory: string;
  lineNo: string;
  styleNo: string;
  workDate: string;
  filterModule?: boolean;
  noCache?: boolean;
}): Promise<{ meta: CBOpDataPerProcessMeta | null; data: CBOpDataPerProcessRow[] }> => {
  const queryParams = {
    FACTORY: normalizeFactory(params.factory),
    LINENO: params.lineNo,
    STYLENO: params.styleNo,
    WORKDATE: params.workDate,
    FILTER_MODULE: params.filterModule ? "true" : "false",
    ...(params.noCache ? { nocache: "true" } : {}),
  };

  const raw = await makeApiRequest<CBOpDataPerProcessResponse>(
    "get",
    "GetAllOpDataPerProcess",
    {
      params: queryParams,
      timeout: 90000,
      noCache: params.noCache,
    }
  );

  const meta = raw?.meta || null;
  const data = (raw?.data || []).map((item: any): CBOpDataPerProcessRow => ({
    WORK_DATE: String(item.WORK_DATE ?? ""),
    STYLE: String(item.STYLE ?? ""),
    PREP_ID: item.PREP_ID != null ? String(item.PREP_ID) : "",
    MODULE: String(item.MODULE ?? ""),
    SPLIT_MODULE: String(item.SPLIT_MODULE ?? ""),
    NIK: String(item.NIK ?? ""),
    NAMA_OP: String(item.NAMA_OP ?? item.E_NAME ?? ""),
    FLOW: String(item.FLOW ?? item.FLOW_NO ?? ""),
    PROCESS_NO: String(item.PROCESS_NO ?? ""),
    PROSES_NAME: String(item.PROSES_NAME ?? item.PROCESS_NAME ?? ""),
    AUTO_SEQ: Number(item.AUTO_SEQ ?? 0),
    EMPNO: Number(item.EMPNO ?? 0),
    OUTPUT_PER_OP: Number(item.OUTPUT_PER_OP ?? 0),
    OUTPUT_PER_OP_ALL_TIME: Number(item.OUTPUT_PER_OP_ALL_TIME ?? 0),
    OUTPUT_PER_PROCESS: Number(item.OUTPUT_PER_PROCESS ?? 0),
    OUTPUT_PER_PROCESS_ALL_TIME: Number(item.OUTPUT_PER_PROCESS_ALL_TIME ?? 0),
  }));

  return { meta, data };
};
