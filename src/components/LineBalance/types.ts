export interface CustomModuleOperator {
  nik: string;
  timeCheck?: string;
  afterOutputH?: string;
  afterBalance?: string;
  pic?: string;
  issue?: string;
  correctiveAction?: string;
}

export type LineBalanceRow = {
  isCustom?: boolean;
  lineId?: string;
  line: string;
  style: string;
  module: string;
  customModules?: Array<{
    module: string;
    niks: CustomModuleOperator[];
  }>;
  nik: string;
  name: string;
  process: string;
  outputAvg: number | string;
  beforeOutputH: number | string;
  beforeBalance: number | string;
  timeCheck: number | string;
  afterOutputH: number | string;
  afterBalance: number | string;
  pic: string;
  issue: string;
  correctiveAction: string;
  alasanLainnya: string;
};
