import { FactoryCode } from './api';

export interface HourlyProduction {
  time: string;
  output: number;
  total?: number;
}

export interface ModuleData {
  name: string;
  input: number;
  output: number;
  color: string;
}

export interface EmployeeData {
  nik: string;
  name: string;
  actual: number;
  asmOutput: number;
  target: number;
  isBottleneck: boolean;
}

export interface EmployeeChartData {
  name: string;
  output: number;
  actual?: number;
  cbOutput?: number;
  stockDays?: number;
}

export interface DashboardMetrics {
  todaysGoal: number;
  currentPerformance: number;
  achievementRate: number;
  hourlyProduction: HourlyProduction[];
  avgOutput?: number;
  avgYtdOutput?: number;
  ytdHourlyProduction?: HourlyProduction[]; // Data produksi kemarin
}

export interface DashboardFilters {
  date: Date;
  factory: string;
  line: string;
  style: string;
  period?: string;
  startTime: string;
  endTime: string;
}

export interface ModuleEmployees {
  [key: string]: {
    chartData: EmployeeChartData[];
    tableData: EmployeeData[];
  };
}