import { makeApiRequest } from "./api";
import { StockOperatorRow, StockOperatorSummary } from "../types/stockOperator";

    const normalizeFactory = (factory: string) => {
    if (!factory) return "";

    const upper = factory.toUpperCase().trim();

    if (upper.startsWith("YONGJIN 2")) {
        return "YONGJIN 2";
    }

    return upper;
    };
export const fetchStylePeriod = async (params: {
  style: string;
  lineNo: string;
}): Promise<any[]> => {
  const raw = await makeApiRequest<any>(
    "post",
    "GetStylePeriod",
    {
      data: {
        STYLE: params.style,
        LineNo: params.lineNo,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
    }
  );
  
  if (raw && raw.data) {
    return raw.data;
  }
  return [];
};

export const fetchStockOperator = async (params: {
  factory: string;
  lineNo: string;
  styleNo: string;
  dateFrom: string;
  dateTo: string;
}): Promise<{ summary: StockOperatorSummary; data: StockOperatorRow[] }> => {
  const raw = await makeApiRequest<any>(
    "post",
    "GetStockOperatorTotal",
    {
      data: {
        FACTORY: normalizeFactory(params.factory),
        LINENO: params.lineNo,
        STYLENO: params.styleNo,
        DATEFROM: params.dateFrom,
        DATETO: params.dateTo,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
    }
  );

  const data = (raw?.data || []).map((item: any): StockOperatorRow => ({
    WORK_DATE: String(item.WORK_DATE ?? ""),
    STYLE: String(item.STYLE ?? ""),
    PREP_ID: item.PREP_ID != null ? String(item.PREP_ID) : "",
    MODULE: String(item.MODULE ?? ""),
    SPLIT_MODULE: String(item.SPLIT_MODULE ?? ""),
    NIK: String(item.NIK ?? ""),
    E_NAME: String(item.E_NAME ?? ""),
    ACTUAL: Number(item.ACTUAL ?? 0),
    EMPNO: Number(item.EMPNO ?? 0),
    FLOW_NO: String(item.FLOW_NO ?? ""),
    PROCESS_NAME: String(item.PROCESS_NAME ?? ""),
    STOCK_OP: Number(item.STOCK_OP ?? 0),
    AVERAGE: Number(item.AVERAGE ?? 0),
    AVERAGE_PER_PART: Number(item.AVERAGE_PER_PART ?? 0),
    QC_OUTPUT: Number(item.QC_OUTPUT ?? 0),
    SOURCE_TABLE: String(item.SOURCE_TABLE ?? ""),
    OP_STATUS: item.OP_STATUS ?? null,
    STATUS_OUTPUT: String(item.STATUS_OUTPUT ?? ""),
    STATUS_COLOR: String(item.STATUS_COLOR ?? ""),
    FLOWS: Array.isArray(item.FLOWS) ? item.FLOWS : [],
    STOCK_DAYS: item.STOCK_DAYS != null ? Number(item.STOCK_DAYS) : (item["STOCK_DAYS "] != null ? Number(item["STOCK_DAYS "]) : undefined),
    TODAY_OUTPUT: item.TODAY_OUTPUT != null ? Number(item.TODAY_OUTPUT) : undefined,
    MISSING_OUTPUT: item.MISSING_OUTPUT != null ? Number(item.MISSING_OUTPUT) : (item.missing_output != null ? Number(item.missing_output) : undefined),
    TOTAL_OUTPUT_ALLTIME: item.TOTAL_OUTPUT_ALLTIME != null ? Number(item.TOTAL_OUTPUT_ALLTIME) : (item.total_output_alltime != null ? Number(item.total_output_alltime) : undefined),
    TOTAL_STOCK_ALLTIME: item.TOTAL_STOCK_ALLTIME != null ? Number(item.TOTAL_STOCK_ALLTIME) : (item.total_stock_alltime != null ? Number(item.total_stock_alltime) : undefined),
  }));

  const summary = raw?.summary || {
    total_operators: 0,
    total_modules: 0,
    total_actual: 0,
    total_stock_op: 0,
    qc_output: 0,
    status_distribution: { sufficient: 0, warning: 0, deficient: 0 }
  };

  return { summary, data };
};

export const fetchAllOpMasterDataLine = async (params: {
  factory: string;
  lineNo: string;
  styleNo: string;
  workDate: string;
  filterModule?: boolean;
}): Promise<{ summary: StockOperatorSummary; data: StockOperatorRow[] }> => {
  const raw = await makeApiRequest<any>(
    "post",
    "GetAllOpMasterDataLine",
    {
      data: {
        FACTORY: normalizeFactory(params.factory),
        LINENO: params.lineNo,
        STYLENO: params.styleNo,
        WORKDATE: params.workDate,
        FILTER_MODULE: params.filterModule ? true : false,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
    }
  );

  const data = (raw?.data || []).map((item: any): StockOperatorRow => ({
    WORK_DATE: String(item.WORK_DATE ?? ""),
    STYLE: String(item.STYLE ?? ""),
    PREP_ID: item.PREP_ID != null ? String(item.PREP_ID) : "",
    MODULE: String(item.MODULE ?? ""),
    SPLIT_MODULE: String(item.SPLIT_MODULE ?? ""),
    NIK: String(item.NIK ?? ""),
    E_NAME: String(item.E_NAME ?? ""),
    ACTUAL: Number(item.ACTUAL ?? 0),
    EMPNO: Number(item.EMPNO ?? 0),
    FLOW_NO: String(item.FLOW_NO ?? ""),
    PROCESS_NAME: String(item.PROCESS_NAME ?? ""),
    STOCK_OP: Number(item.STOCK_OP ?? 0),
    AVERAGE: Number(item.AVERAGE ?? 0),
    AVERAGE_PER_PART: Number(item.AVERAGE_PER_PART ?? 0),
    QC_OUTPUT: Number(item.QC_OUTPUT ?? 0),
    SOURCE_TABLE: String(item.SOURCE_TABLE ?? ""),
    OP_STATUS: item.OP_STATUS ?? null,
    STATUS_OUTPUT: String(item.STATUS_OUTPUT ?? ""),
    STATUS_COLOR: String(item.STATUS_COLOR ?? ""),
    FLOWS: Array.isArray(item.FLOWS) ? item.FLOWS : [],
    STOCK_DAYS: item.STOCK_DAYS != null ? Number(item.STOCK_DAYS) : undefined,
    TODAY_OUTPUT: item.TODAY_OUTPUT != null ? Number(item.TODAY_OUTPUT) : undefined,
    MISSING_OUTPUT: item.MISSING_OUTPUT != null ? Number(item.MISSING_OUTPUT) : undefined,
    TARGET_PER_HOUR: item.TARGET_PER_HOUR != null ? Number(item.TARGET_PER_HOUR) : undefined,
    TARGET_PROD: item.TARGET_PROD != null ? Number(item.TARGET_PROD) : undefined,
    AVERAGE_PER_HOUR: item.AVERAGE_PER_HOUR != null ? Number(item.AVERAGE_PER_HOUR) : undefined,
    AVG_1ST_OUTPUT: item["1ST_AVG_OUTPUT"] != null ? Number(item["1ST_AVG_OUTPUT"]) : undefined,
    AVG_2ND_OUTPUT: item["2ND_AVG_OUTPUT"] != null ? Number(item["2ND_AVG_OUTPUT"]) : undefined,
    AVG_3RD_OUTPUT: item["3RD_AVG_OUTPUT"] != null ? Number(item["3RD_AVG_OUTPUT"]) : undefined,
    STOCK_TIME: item.STOCK_TIME != null ? Number(item.STOCK_TIME) : undefined,
    OPERATOR_TYPE: item.OPERATOR_TYPE != null ? String(item.OPERATOR_TYPE) : undefined,
    WORKING_HOURS: item.WORKING_HOURS != null ? Number(item.WORKING_HOURS) : undefined,
    CURRENT_WORK_HOURS: item.CURRENT_WORK_HOURS != null ? Number(item.CURRENT_WORK_HOURS) : undefined,
    IS_MANUAL_WH: item.IS_MANUAL_WH === true || item.IS_MANUAL_WH === 1 || item.IS_MANUAL_WH === "true" || item.IS_MANUAL_WH === "1",
  }));

  const summary = raw?.summary || {
    total_operators: 0,
    total_modules: 0,
    total_actual: 0,
    total_stock_op: 0,
    qc_output: 0,
    status_distribution: { sufficient: 0, warning: 0, deficient: 0 }
  };

  return { summary, data };
};

export const setOpStatus = async (payload: {
  factory: string;
  lineNo: string;
  styleNo: string;
  module: string;
  nik: string;
  status: string;
  dateFrom: string;
}) => {
  return makeApiRequest<any[]>("post", "SetOpStatus", {
    data: {
      FACTORY: normalizeFactory(payload.factory),
      LINENO: payload.lineNo,
      STYLENO: payload.styleNo,
      MODULE: payload.module,
      NIK: payload.nik,
      STATUS: payload.status,
      DATEFROM: payload.dateFrom,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 60000,
  });
};

export const saveStockOpRule = async (payload: {
  factory: string;
  lineCode: string;
  styleNo: string;
  moduleFrom: string;
  moduleTo: string;
  isActive: string;
  username: string;
}) => {
  return makeApiRequest<{ success: boolean; message: string }>(
    "post",
    "SaveStockOpRule",
    {
      data: {
        FACTORY: normalizeFactory(payload.factory),
        LINE_CODE: payload.lineCode,
        STYLE_NO: payload.styleNo,
        MODULE_FROM: payload.moduleFrom,
        MODULE_TO: payload.moduleTo,
        IS_ACTIVE: payload.isActive,
        USERNAME: payload.username,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
    }
  );
};

export const saveWorkingHoursOverride = async (payload: {
  workDate: string;
  lineCode: string;
  styleNo: string;
  nik: string;
  workingHours: number;
  updatedBy: string;
}): Promise<boolean> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_SET_WORKING_HOURS_OVERRIDE", {
      data: {
        WORK_DATE: payload.workDate,
        LINE_CODE: payload.lineCode,
        STYLE_NO: payload.styleNo,
        NIK: payload.nik,
        WORKING_HOURS: payload.workingHours,
        UPDATED_BY: payload.updatedBy,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 15000,
    });
    return raw && raw.status === "success";
  } catch (error) {
    console.error("Error saving working hours override:", error);
    return false;
  }
};

export const saveLineWorkingHoursOverride = async (payload: {
  workDate: string;
  lineCode: string;
  styleNo: string;
  workingHours: number;
  updatedBy: string;
  niks?: string[];
}): Promise<{ success: boolean; affectedCount?: number }> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_SET_LINE_WORKING_HOURS_OVERRIDE", {
      data: {
        WORK_DATE: payload.workDate,
        LINE_CODE: payload.lineCode,
        STYLE_NO: payload.styleNo,
        WORKING_HOURS: payload.workingHours,
        UPDATED_BY: payload.updatedBy,
        NIKS: payload.niks ? JSON.stringify(payload.niks) : "",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000,
    });
    return {
      success: !!(raw && raw.status === "success"),
      affectedCount: raw?.affectedCount ?? 0,
    };
  } catch (error) {
    console.error("Error saving line working hours override:", error);
    return { success: false };
  }
};