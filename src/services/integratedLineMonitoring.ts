import { makeApiRequest, clearServerCache, clearApiCache } from "./api";
import { IntegratedLineMonitoringResponse } from "../types/api";

const normalizeFactory = (factory: string) => {
  if (!factory) return "";
  const upper = factory.toUpperCase().trim();
  if (upper.startsWith("YONGJIN 2")) {
    return "YONGJIN 2";
  }
  return upper;
};

export const fetchIntegratedLineMonitoring = async (params: {
  factory: string;
  dateFrom: string;
  lineNo?: string;
  styleNo?: string;
}): Promise<IntegratedLineMonitoringResponse[]> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_GET_LINE_MONITORING", {
      data: {
        FACTORY: normalizeFactory(params.factory),
        DATEFROM: params.dateFrom,
        LINENO: params.lineNo || "",
        STYLENO: params.styleNo || "",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
    });

    if (raw && raw.status === "success" && Array.isArray(raw.data)) {
      return raw.data.map((item: any): IntegratedLineMonitoringResponse => ({
        LINE_CODE: String(item.LINE_CODE ?? ""),
        LINE_NAME: String(item.LINE_NAME ?? ""),
        STYLE_NO: String(item.STYLE_NO ?? ""),
        TOTAL_EMPLOYEE: Number(item.TOTAL_EMPLOYEE ?? 0),
        LAYOUT_EMPLOYEE: item.LAYOUT_EMPLOYEE !== undefined && item.LAYOUT_EMPLOYEE !== null ? Number(item.LAYOUT_EMPLOYEE) : Number(item.TOTAL_EMPLOYEE ?? 0),
        ACTUAL_EMPLOYEE: item.ACTUAL_EMPLOYEE !== undefined && item.ACTUAL_EMPLOYEE !== null ? Number(item.ACTUAL_EMPLOYEE) : Number(item.TOTAL_EMPLOYEE ?? 0),
        TOTAL_ORD_QTY: Number(item.TOTAL_ORD_QTY ?? 0),
        TOTAL_PROD_QTY: Number(item.TOTAL_PROD_QTY ?? 0),
        TODAY_QC_COUNTING: Number(item.TODAY_QC_COUNTING ?? 0),
        TOTAL_QC_AVG_PER_HOUR: Number(item.TOTAL_QC_AVG_PER_HOUR ?? 0),
        TOTAL_QC_COUNTING: Number(item.TOTAL_QC_COUNTING ?? item.total_qc_counting ?? 0),
        TODAY_QC_DIFF: item.TODAY_QC_DIFF !== undefined && item.TODAY_QC_DIFF !== null ? Number(item.TODAY_QC_DIFF) : undefined,
        TODAY_QC_PCT: item.TODAY_QC_PCT !== undefined && item.TODAY_QC_PCT !== null ? Number(item.TODAY_QC_PCT) : null,
        AVG_HOUR_DIFF: item.AVG_HOUR_DIFF !== undefined && item.AVG_HOUR_DIFF !== null ? Number(item.AVG_HOUR_DIFF) : undefined,
        AVG_HOUR_PCT: item.AVG_HOUR_PCT !== undefined && item.AVG_HOUR_PCT !== null ? Number(item.AVG_HOUR_PCT) : null,
        TARGET_PROD: item.TARGET_PROD !== undefined && item.TARGET_PROD !== null ? Number(item.TARGET_PROD) : null,
        ATTENDING: item.ATTENDING !== undefined && item.ATTENDING !== null ? Number(item.ATTENDING) : 0,
        ABSENT: item.ABSENT !== undefined && item.ABSENT !== null ? Number(item.ABSENT) : 0,
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching integrated line monitoring:", error);
    throw error;
  }
};

export const fetchModuleTotalinPivot = async (params: {
  factory: string;
  dateFrom: string;
}): Promise<any[]> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_GET_MODULE_TOTALIN_PIVOT", {
      data: {
        FACTORY: normalizeFactory(params.factory),
        WORKDATE: params.dateFrom,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
    });

    if (raw && raw.status === "success" && Array.isArray(raw.data)) {
      return raw.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching module totalin pivot:", error);
    throw error;
  }
};

export const fetchOutputModuleTotal = async (params: {
  factory: string;
  dateFrom: string;
  lineCode: string;
  styleNo: string;
  noCache?: boolean;
}): Promise<any[]> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_GET_OUTPUT_MODULE_TTL", {
      data: {
        FACTORY: normalizeFactory(params.factory),
        DATEFROM: params.dateFrom,
        WORKDATE: params.dateFrom,
        LINE_CODE: params.lineCode,
        LINENO: params.lineCode,
        STYLE_NO: params.styleNo,
        STYLENO: params.styleNo,
        ...(params.noCache ? { nocache: "true" } : {}),
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
      noCache: params.noCache,
    });

    if (raw && raw.status === "success" && Array.isArray(raw.data)) {
      return raw.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching output module total:", error);
    throw error;
  }
};

export const fetchOutputModuleLineMonitoring = async (params: {
  factory: string;
  dateFrom: string;
  lineCode: string;
  styleNo: string;
  noCache?: boolean;
}): Promise<any[]> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_GET_OUTPUT_MODULE_LINE_MONITORING", {
      data: {
        FACTORY: normalizeFactory(params.factory),
        DATEFROM: params.dateFrom,
        WORKDATE: params.dateFrom,
        LINE_CODE: params.lineCode,
        LINENO: params.lineCode,
        STYLE_NO: params.styleNo,
        STYLENO: params.styleNo,
        ...(params.noCache ? { nocache: "true" } : {}),
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 60000,
      noCache: params.noCache,
    });

    if (raw && raw.status === "success" && Array.isArray(raw.data)) {
      return raw.data;
    }
    return [];
  } catch (error) {
    console.error("Error fetching output module line monitoring:", error);
    throw error;
  }
};

export const saveEmployeeOverride = async (params: {
  workDate: string;
  lineCode: string;
  styleNo: string;
  actualEmployee: number;
  targetProd?: number | null;
  attending?: number | null;
  absent?: number | null;
  updatedBy: string;
}): Promise<boolean> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_SET_EMPLOYEE_OVERRIDE", {
      data: {
        WORK_DATE: params.workDate,
        LINE_CODE: params.lineCode,
        STYLE_NO: params.styleNo,
        ACTUAL_EMPLOYEE: params.actualEmployee,
        TARGET_PROD: params.targetProd !== undefined && params.targetProd !== null ? String(params.targetProd) : "",
        ATTENDING: params.attending !== undefined && params.attending !== null ? String(params.attending) : "",
        ABSENT: params.absent !== undefined && params.absent !== null ? String(params.absent) : "",
        UPDATED_BY: params.updatedBy,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });
    return raw && raw.status === "success";
  } catch (error) {
    console.error("Error saving employee override:", error);
    return false;
  }
};

export const saveTargetOverride = async (params: {
  workDate: string;
  lineCode: string;
  styleNo: string;
  part: string;
  targetProd: number;
  updatedBy: string;
}): Promise<boolean> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_SET_TARGET_OVERRIDE", {
      data: {
        WORK_DATE: params.workDate,
        LINE_CODE: params.lineCode,
        STYLE_NO: params.styleNo,
        PART: params.part,
        TARGET_PROD: params.targetProd,
        UPDATED_BY: params.updatedBy,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });
    return raw && raw.status === "success";
  } catch (error) {
    console.error("Error saving module target override:", error);
    return false;
  }
};

export const saveUphOverride = async (params: {
  lineCode: string;
  styleNo: string;
  nik: string;
  uphTarget: number;
  updatedBy: string;
}): Promise<boolean> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_SET_UPH_OVERRIDE", {
      data: {
        // WORK_DATE intentionally not sent — backend uses sentinel date 1900-01-01
        // so UPH target applies to ALL workdates (not per-day)
        WORK_DATE: "1900-01-01",
        LINE_CODE: params.lineCode,
        STYLE_NO: params.styleNo,
        NIK: params.nik,
        UPH_TARGET: String(params.uphTarget),
        UPDATED_BY: params.updatedBy,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    });
    return raw && raw.status === "success";
  } catch (error) {
    console.error("Error saving UPH override:", error);
    return false;
  }
};


export const saveMissingOutput = async (params: {
  factory?: string;
  nik: string;
  styleNo: string;
  missingQty: number;
  updatedBy: string;
  workDate: string;
  predecessorNik?: string;
  lineCode?: string;
}): Promise<boolean> => {
  try {
    const raw = await makeApiRequest<any>("post", "CBC_WEB_ADD_MISSING_OUTPUT", {
      params: params.factory ? { Factory: params.factory } : undefined,
      data: {
        NIK: params.nik,
        STYLE_NO: params.styleNo,
        MISSING_QTY: String(params.missingQty),
        UPDATED_BY: params.updatedBy,
        WORK_DATE: params.workDate,
        PREDECESSOR_NIK: params.predecessorNik || "",
        LINE_CODE: params.lineCode || "",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 30000,
      noCache: true,
      retries: 1,
    });
    const isOk = !!(raw && raw.status === "success");
    if (isOk) {
      // Clear local micro-cache immediately; WService.asmx CBC_WEB_ADD_MISSING_OUTPUT already invalidates IIS HttpRuntime.Cache
      clearApiCache("GetCBSewingOutputData");
      clearApiCache("CBC_WEB_GET_OUTPUT_MODULE_TTL");
      clearApiCache("GetStockOperator");
    }
    return isOk;
  } catch (error) {
    console.error("Error saving missing output:", error);
    return false;
  }
};
