export interface LineResponse {
  NOLINE: string;
  LINE: string;
  OFFICECODE: string;
  LINE2: string;
}

export interface StyleResponse {
  STYLE: string;
}

export interface InOutChartResponse {
  WORK_DATE: string;
  PART: string;
  TOTALOUT: number;
  TOTALIN: number;
}

export type FactoryCode = "YONGJIN 1" | "YONGJIN 2-1" | "YONGJIN 2-2" | "YONGJIN 3";

export const FACTORY_CODES: FactoryCode[] = [
  "YONGJIN 1",
  "YONGJIN 2-1",
  "YONGJIN 2-2",
  "YONGJIN 3"
];

// Display factory codes for UI (YONGJIN 2 split into 2-1 and 2-2)
export type DisplayFactoryCode = "YONGJIN 1" | "YONGJIN 2-1" | "YONGJIN 2-2" | "YONGJIN 3";

export const DISPLAY_FACTORY_CODES: DisplayFactoryCode[] = [
  "YONGJIN 1",
  "YONGJIN 2-1",
  "YONGJIN 2-2",
  "YONGJIN 3"
];

// Helper to map display factory to API factory (may return legacy aggregated factory code)
export const mapDisplayToApiFactory = (display: DisplayFactoryCode): string => {
  if (display === "YONGJIN 2-1" || display === "YONGJIN 2-2") {
    return "YONGJIN 2";
  }
  return display;
};

export interface PerformanceMetricsResponse {
  TARGET: number;
  ACTUAL: number;
  ACHIEVEMENT: number;
  TargetDay: number;
  TargetDay_Percentage: string;
  LINENAME: string;
  WORK_DATE: string;
}

export interface HourlyProductionResponse {
  NIK: string;
  NAME: string;
  MACHINE_NAME: string;
  STYLE_NO: string;
  COUNTING_PROGRAM: number;
  LINE: string;
  H06: number;
  H07: number;
  H08: number;
  H09: number;
  H10: number;
  H11: number;
  H12: number;
  H13: number;
  H14: number;
  H15: number;
  H16: number;
  H17: number;
  H18: number;
  H19: number;
  H20: number;
  H21: number;
}

export interface EmployeePerformanceResponse {
  WORK_DATE: string;
  PART: string;
  SUBPART_NM?: string;
  PROCESS_NAME?: string;
  NIK: string;
  E_NAME: string;
  ACTUAL: number;
  EMPNO: number;
  AVERAGE: number;
  AVERAGE_PER_PART: number;
  TOTAL_QTY_ALL: number;
  ASM_OUT: number;
  STATUS_OUTPUT: string;
  STATUS_COLOR?: string;
  CBID?: string;
  OPERATOR_TYPE?: string;
  STOCK_DAYS?: number;
  TOTAL_OUTPUT_ALLTIME?: number;
}

export interface EmployeePerformance2Response {
  WORK_DATE: string;
  PART: string;
  NIK: string;
  E_NAME: string;
  MDL_INDEX: string;
  ACTUAL: number;
  EMPNO: number;
  AVERAGE: number;
  AVERAGE_PER_PART: number;
  TOTAL_QTY_ALL: number;
  ASM_OUT: number;
  STATUS_OUTPUT: string;
  OPERATOR_TYPE?: string;
}

export interface ProcessOutputHistoryResponse {
  WORK_DATE: string;
  STYLE_NO?: string;
  PART: string;
  NIK: string;
  E_NAME: string;
  MDL_INDEX: string;
  ACTUAL: number;
  EMPNO: number;
  AVERAGE: number;
  AVERAGE_PER_PART: number;
  TOTAL_QTY_ALL: number;
  ASM_OUT: number;
  STATUS_OUTPUT: string;
}

export interface EmployeePerformanceByPart {
  [key: string]: {
    chartData: {
      name: string;
      output: number;
      average: number;
      nik: string;
      employeeName: string;
      statusColor?: string;
      cbid?: string;
    }[];
    tableData: {
      nik: string;
      name: string;
      actual: number;
      asmOutput: number;
      target: number;
      isBottleneck: boolean;
      status: string;
      statusColor: string;
    }[];
  }
}

// Interface untuk VIEW_OUTPUT_DTL response
export interface OutputDetailResponse {
  PART: string;
  NIK: string;
  E_NAME: string;
  RESP_NAME: string;
  STYLE_NO: string;
  MACHINE_ID: number;
  MACHINE_NAME: string;
  PROCESS_NAME: string;
  CBC_NAME: string;
  LINE_CODE: number;
  LINE_NAME: string;
  MDL_INDEX?: string;
  FLOW_NO?: string;
  H07?: number;
  H08?: number;
  H09?: number;
  H10?: number;
  H11?: number;
  H12?: number;
  H13?: number;
  H14?: number;
  H15?: number;
  H16?: number;
  H17?: number;
  H18?: number;
  H19?: number;
  H20?: number;
  H21?: number;
  "07:00"?: number;
  "08:00"?: number;
  "09:00"?: number;
  "10:00"?: number;
  "11:00"?: number;
  "12:00"?: number;
  "13:00"?: number;
  "14:00"?: number;
  "15:00"?: number;
  "16:00"?: number;
  "17:00"?: number;
  "18:00"?: number;
  "19:00"?: number;
  "20:00"?: number;
  "21:00"?: number;
  EMPNO: number;
  TOTAL_ALL: number;
  TOTAL_QTY: number;
  COUNT_DAYS: number;
  AVG_QTY: number;
  MAXOP: number;
  STOCK: number;
  STOCK_DAYS: number;
  REMARK: string;
  AvgTimePerQty_Seconds: string;
  AvgTimePerQty_Seconds_: string;
  AvgTimePerQty_Seconds2: number;
  LAST_SENDING: string;
  [key: string]: any;
}

export interface OutputEmployeeHourlyResponse {
  ID: string;
  STYLE: string;
  JAM: string;
  QTY: number;
  NIK: string;
  TIME_DIFF?: number | null;
  Q1?: number | null;
  Q3?: number | null;
  IQR?: number | null;
  UPPER_LIMIT?: number | null;
  LOWER_LIMIT?: number | null;
  AVERAGE?: number | null;
  REMARK?: string | null;
  STATUS?: string | null;
  // All transactions (including suspected input errors)
  Q1_ALL?: number | null;
  Q3_ALL?: number | null;
  IQR_ALL?: number | null;
  UPPER_LIMIT_ALL?: number | null;
  LOWER_LIMIT_ALL?: number | null;
  AVERAGE_ALL?: number | null;
  REMARK_ALL?: string | null;
  STATUS_ALL?: string | null;
  // Excluded suspected input errors (clean cycle)
  Q1_EXCL?: number | null;
  Q3_EXCL?: number | null;
  IQR_EXCL?: number | null;
  UPPER_LIMIT_EXCL?: number | null;
  LOWER_LIMIT_EXCL?: number | null;
  AVERAGE_EXCL?: number | null;
  REMARK_EXCL?: string | null;
  STATUS_EXCL?: string | null;
  IS_SUSPECTED?: number | null;
  ETC_PERSON?: number | null;
  EMP_GROUP?: string | null;
  // Yesterday quartile stats (today - 1 day)
  Q1_YESTERDAY?: number | null;
  Q3_YESTERDAY?: number | null;
  IQR_YESTERDAY?: number | null;
  Q1_ALL_YESTERDAY?: number | null;
  Q3_ALL_YESTERDAY?: number | null;
  IQR_ALL_YESTERDAY?: number | null;
  Q1_EXCL_YESTERDAY?: number | null;
  Q3_EXCL_YESTERDAY?: number | null;
  IQR_EXCL_YESTERDAY?: number | null;
}

export interface EmployeeSkillResponse {
  EMPL_NMBR: string;
  PROCESS_ID: number;
  SKILL_GRADE: string;
  INPUTDATE: string;
  DESCR: string;
}

export interface DefectInfoResponse {
  LINE_CODE: number;
  STYLE_NO: string;
  TARGET_DAY: number;
  COLOR: string;
  BUYER: string;
  ORDER_QTY: string;
  PROD_QTY: string;
  SEASON: string;
  ASM_OUT: number;
  TOTAL_DEFECT: number;
  TOTAL_INSPECTION: number;
  PO_NUMBER: number;
  TOTAL_REPAIR: number; // Tambahkan field TOTAL_REPAIR
  H06: number;
  H07: number;
  H08: number;
  H09: number;
  H10: number;
  H11: number;
  H12: number;
  H13: number;
  H14: number;
  H15: number;
  H16: number;
  H17: number;
  H18: number;
  H19: number;
  H20: number;
  H21: number;
}

export interface TopDefectResponse {
  DEFECT_NAME: string;
  DEFECT_COUNT: number;
  RANK_NO: number;
}

export interface POHistoryResponse {
  Col_Line: number;
  Col_Style: string;
  TargetDay: number;
  Col_StartSew: string;
  Col_EndSew: string;
  Col_Color: string;
  Col_Buyer: string;
  PO_NO: string;
  Col_OrderQty: number;
  Col_ProdQty: number;
  Col_Season: string;
  Col_Size: string;
  Col_RowNo: number;
  Col_CRD: string;
  CB_Output: string | number;
  Col_FileNo: string;

  // Detil unik PO history (dari backend). Contoh: "DetID": "9754"
  DetID?: string | number;

  // New aggregated process strings from API (e.g., "L=204, M=364, ...")
  INPUT_MODULE: string;
  QC_END_LINE: string;
  HANGTAG: string;
  POLYBAG: string;
  PACKING: string;

  LABOR_CREATED_AT: string | null;
  LABOR_UPDATED_AT: string | null;
  LABOR_CREATED_BY: string;
  LABOR_UPDATED_BY: string;
  isActive?: number;
}

export interface LoginResponse {
  NIK: string;
  username: string;
  role: string;
  last_login: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateLaborRequest {
  PO_NO: string;
  START_SEW: string;
  END_SEW: string;
  SIZE_CODE: string;
  PROCESS: 'INPUT_MODULE' | 'QC_END_LINE' | 'HANGTAG' | 'POLYBAG' | 'PACKING';
  VALUE: number;
  USER: string;
  DET_ID: string;
}

export interface UpdateLaborResponse {
  status: "success" | "error";
  message: string;
}

export interface VibrationDataResponse {
  SERIAL_NO: string;
  NIK: string;
  E_NAME: string;
  JAM: string;
  QTY_VIBRASI: number;
  QTY_BUTTON: number;
  DATA_DIFFERENCES: number;
  WORK_STATUS: string;
  OrderJam: number;
  PART: string;
  STYLENO: string;
  PROCESS_NAME?: string;
  IPADDR?: string;
  STATUS_COLOR?: string;
  REMARK_ACTION?: string;
  PCT_ABOVE_100?: string;
  PCT_BELOW_100?: string;
  TOTAL_OPERATOR_ACTIVE?: number;
  TOTAL_OP_ABOVE_100?: number;
  TOTAL_OP_BELOW_100?: number;
}

export interface SummaryDetailItem {
  PO_NO: string; // Tambahkan PO NO
  Col_Size: string;
  CB_Output: number;
  INPUT_MODULE: string;
  QC_END_LINE: string;
  HANGTAG: string;
  POLYBAG: string;
  PACKING: string;
  Col_StartSew?: string;
  Col_EndSew?: string;
  LABOR_CREATED_AT?: string;
  LABOR_UPDATED_AT?: string;
  LABOR_CREATED_BY?: string;
  LABOR_UPDATED_BY?: string;
}

export interface SummaryPOHistoryResponse {
  Col_FileNo: string;
  Col_Style: string;
  Col_Color: string;
  Col_Buyer: string;
  Col_Season: string;
  Col_CRD: string;
  OrderQty: number;
  TotalPQty: number | null;
  BalanceQty: number | null;
  Detail: string; // JSON string yang berisi array SummaryDetailItem
}

export interface DailyReportSewingRow {
  LINE: number | string;
  BUYER: string;
  STYLE_NO: string;
  FILE_NO: string;
  PO_NO: string;
  ITEM?: string;
  COLOR: string;
  ORDER_QTY: number;
  PROD_QTY: number;
  DELI?: string;

  OP_OTHERS?: number;
  OP_SW?: number;
  OP_HP?: number;
  OP_SS?: number;
  OP_CB?: number;
  OP_TOTAL?: number;

  INPUT_START?: string;
  OUTPUT_START?: string;
  OUTPUT_FINISH?: string;
  WORK_HOUR?: number | string;
  TARGET?: number;

  CUT_TODAY?: number;
  CUT_TOTAL?: number;
  CUT_BALANCE?: number;

  INPUT_TODAY?: number;
  INPUT_TOTAL?: number;
  INPUT_BALANCE?: number;

  QC_UNTIL_8H?: number;
  QC_AFTER_2H?: number;
  QC_TODAY?: number;
  QC_TOTAL?: number;
  QC_BALANCE?: number;

  HANGTAG_TODAY?: number;
  HANGTAG_TOTAL?: number;
  HANGTAG_BALANCE?: number;

  FIN_TODAY?: number;
  FIN_TOTAL?: number;
  FIN_BALANCE?: number;
}

export interface FactoryManagementResponse {
  STYLE: string;
  work_date: string;
  part: string;
  TOTALOUT: number;
  TOTALIN: number;
  PO_NO: string;
  LINE_CODE: string;
  LINENAME?: string; // Will be populated after conversion
  Col_CRD?: string;
  Col_StartSew?: string;
  FILE_NO?: string;
  ORD_QTY?: number;
  TOTALIN_ALL?: number;
  TOTALOUT_ALL?: number;
  Col_ProdQty?: number;
  BALANCE?: number;
  TargetDay?: number;
  STOCK_DAYS?: number;
}

export interface LineBalanceOperator {
  nik: string;
  name: string;
  part: string;
  actual_output: number;
  average_output: number;
  average_qc_output: number;
  balance: number;
  status: {
    label: string;
    color: string;
  };
  process: string;
}

export interface LineBalanceLine {
  line_code: string;
  line_name?: number | string;
  ttl_qc_output: number;
  avg_qc_output_line: number;
  style: string;
  operators: LineBalanceOperator[];
}

export interface LineBalanceResponse {
  factory: string;
  work_date: string;
  total_lines: number;
  lines: LineBalanceLine[];
}

export interface IntegratedLineMonitoringResponse {
  LINE_CODE: string;
  LINE_NAME: string;
  STYLE_NO: string;
  TOTAL_EMPLOYEE: number;
  LAYOUT_EMPLOYEE?: number;
  ACTUAL_EMPLOYEE?: number;
  TOTAL_ORD_QTY: number;
  TOTAL_PROD_QTY: number;
  TODAY_QC_COUNTING: number;
  TOTAL_QC_AVG_PER_HOUR: number;
  TOTAL_QC_COUNTING: number;
  TODAY_QC_DIFF?: number;
  TODAY_QC_PCT?: number | null;
  AVG_HOUR_DIFF?: number;
  AVG_HOUR_PCT?: number | null;
  TARGET_PROD?: number | null;
  ATTENDING?: number;
  ABSENT?: number;
}