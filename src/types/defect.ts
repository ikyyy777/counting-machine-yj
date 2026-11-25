export interface DefectFilters {
  date: Date;
  factory: string;
  line: string;
  style: string;
}

export interface DefectData {
  style: string;
  color: string;
  buyer: string;
  orderQty: string;
  inspection: number;
  defectCount: number;
  topDefects: string[];
  output: number;
  target: number;
  outputPerHour: number;
  targetPerHour: number;
  targetPercentage: number;
  defectPercentage: number;
  hourlyOutputs: { time: string; output: number }[];
  poNumber: number; // Tambahkan field poNumber
  totalRepair: number; // Tambahkan field totalRepair
}

export interface DefectResponse {
  style: string;
  color: string;
  buyer: string;
  order_qty: string;
  inspection: number;
  defect_count: number;
  top_defects: string[];
  output: number;
  target: number;
  output_per_hour: number;
  target_per_hour: number;
  target_percentage: number;
  defect_percentage: number;
  hourly_outputs: { time: string; output: number }[];
  po_number: number; // Tambahkan field po_number
} 