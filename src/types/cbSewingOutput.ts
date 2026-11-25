export interface CBSewingOutputTask {
  FLOW_NO: string | null;
  PROCESS_NO: string | null;
  PROCESS_NAME: string | null;
  AUTO_SEQ: number | null;
  SPLIT_MODULE?: string | null;
}

export interface CBSewingOutputRow {
  STYLE: string;
  PREP_ID: string;
  MODULE: string;
  SPLIT_MODULE: string;
  NIK: string;
  E_NAME: string;
  FLOW_NO: string;
  PROCESS_NO: string;
  PROCESS_NAME: string;
  AUTO_SEQ: number;
  TOTAL_OUTPUT: number;
  STOCK_OP: number;
  BALANCE: number;
  MISSING_OUTPUT?: number;
  MISSING_OUTPUT_UPDATED_BY?: string | null;
  MISSING_OUTPUT_UPDATED_AT?: string | null;
  MISSING_SOURCE_NIK?: string | null;
  // Flow target fields (returned by GetCBSewingOutputData)
  FLOW_TARGET_NIK?: string | null;
  FLOW_TARGET_NAME?: string | null;
  FLOW_TARGET_FLOW?: string | null;
  MERGED_EMP_NIK?: string | null;
  MERGED_EMP_NAME?: string | null;
  ETC_PERSON?: number;
  EMP_GROUP?: string;
  // Daily output/work hours data
  DAILY_OUTPUTS: Record<string, number>;
  ORIGINAL_TOTAL_OUTPUT?: number;
  ORIGINAL_TODAY_OUTPUT?: number;
  ORIGINAL_DAILY_OUTPUTS?: Record<string, number>;
  DAILY_WORK_HOURS?: Record<string, number>;
  TASKS: CBSewingOutputTask[];
  // Additional fields from GetCBSewingOutputData
  ACTUAL?: number;
  TODAY_OUTPUT?: number;
  OPERATOR_TYPE?: string;
  MAIN_PROC?: number;
  MAIN_PROCESS_NAME?: string | null;
  EMPNO?: number;
  TARGET_PROD?: number;
  TARGET_PER_HOUR?: number;
  AVERAGE?: number;
  AVERAGE_PER_HOUR?: number;
  AVERAGE_PER_PART?: number;
  WORKING_HOURS?: number;
  CURRENT_WORK_HOURS?: number;
  IS_MANUAL_WH?: boolean | number;
  STOCK_DAYS?: number | null;
  STOCK_GROUPED?: number | null;
  STATUS_OUTPUT?: string | null;
  STATUS_COLOR?: string | null;
  OP_STATUS?: string | null;
  SOURCE_TABLE?: string | null;
  AVG_1ST_OUTPUT?: number;
  AVG_2ND_OUTPUT?: number;
  AVG_3RD_OUTPUT?: number;
  [dateKey: string]: any;
}

export interface CBSewingOutputMeta {
  totalRecords: number;
  totalModules: number;
  grandTotalOutput: number;
  grandTotalStock: number;
  dateColumns: string[];
  generatedAt?: string;
}

export interface CBSewingOutputResponse {
  success: boolean;
  status: string;
  message?: string;
  timestamp?: string;
  meta: CBSewingOutputMeta | null;
  data: CBSewingOutputRow[];
}

// ----------------------------------------------------------------
// TYPES FOR CBC_GET_ALL_OP_DATA_PER_PROCESS (DATA PER PROSES DENGAN 4 KOLOM OUTPUT)
// ----------------------------------------------------------------
export interface CBOpDataPerProcessRow {
  WORK_DATE: string;
  STYLE: string;
  PREP_ID: string | number;
  MODULE: string;
  SPLIT_MODULE?: string;
  NIK: string;
  NAMA_OP: string;
  FLOW: string;
  MAIN_PROC?: number;
  PROCESS_NO: string;
  PROSES_NAME: string;
  AUTO_SEQ: number;
  EMPNO: number;
  OUTPUT_PER_OP: number;
  OUTPUT_PER_OP_ALL_TIME: number;
  OUTPUT_PER_PROCESS: number;
  OUTPUT_PER_PROCESS_ALL_TIME: number;
}

export interface CBOpDataPerProcessMeta {
  totalRecords: number;
  totalOperators: number;
  totalModules: number;
  totalFlows: number;
  grandTotalOpOutputToday: number;
  grandTotalProcessOutputToday: number;
  grandTotalProcessOutputAllTime: number;
  generatedAt?: string;
}

export interface CBOpDataPerProcessResponse {
  success: boolean;
  status: string;
  message?: string;
  timestamp?: string;
  meta: CBOpDataPerProcessMeta | null;
  data: CBOpDataPerProcessRow[];
}
