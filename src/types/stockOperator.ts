export interface StockOperatorFlow {
  FLOW_NO: string;
  MAIN_PROC?: number;
  PROCESS_NO: string;
  PROCESS_NAME: string;
  AUTO_SEQ: number;
  OUTPUT?: number;
}

export interface StockOperatorRow {
  WORK_DATE: string;
  STYLE: string;
  PREP_ID?: string | number;
  MODULE: string;
  SPLIT_MODULE: string;
  NIK: string;
  E_NAME: string;
  ACTUAL: number;
  EMPNO: number;
  FLOW_NO: string;
  PROCESS_NAME: string;
  STOCK_OP: number;
  AVERAGE: number;
  AVERAGE_PER_PART: number;
  QC_OUTPUT: number;
  SOURCE_TABLE: string;
  OP_STATUS: string | null;
  STATUS_OUTPUT: string;
  STATUS_COLOR: string;
  FLOWS: StockOperatorFlow[];
  STOCK_DAYS?: number;
  TODAY_OUTPUT?: number;
  MISSING_OUTPUT?: number;
  MERGED_EMP_NIK?: string;
  MERGED_EMP_NAME?: string;
  ORIGINAL_TOTAL_OUTPUT?: number;
  ORIGINAL_TODAY_OUTPUT?: number;
  ORIGINAL_DAILY_OUTPUTS?: Record<string, number>;
  TOTAL_OUTPUT_ALLTIME?: number;
  TOTAL_STOCK_ALLTIME?: number;
  TARGET_PER_HOUR?: number;
  TARGET_PROD?: number;
  AVERAGE_PER_HOUR?: number;
  STOCK_TIME?: number;
  AVG_1ST_OUTPUT?: number;
  AVG_2ND_OUTPUT?: number;
  AVG_3RD_OUTPUT?: number;
  OPERATOR_TYPE?: string;
  WORKING_HOURS?: number;
  CURRENT_WORK_HOURS?: number;
  IS_MANUAL_WH?: boolean;
  MAIN_PROC?: number;
  MAIN_PROCESS_NAME?: string;
  FLOW_PRED_NIK?: string;
  FLOW_PRED_NAME?: string;
  FLOW_PRED_FLOW?: string;
  FLOW_TARGET_NIK?: string;
  FLOW_TARGET_NAME?: string;
  FLOW_TARGET_FLOW?: string;
  TASKS?: any[];
}

export interface StockOperatorSummary {
  total_operators: number;
  total_modules: number;
  total_actual: number;
  total_stock_op: number;
  qc_output: number;
  status_distribution: {
    sufficient: number;
    warning: number;
    deficient: number;
  };
}