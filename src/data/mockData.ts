import { ModuleData, DashboardMetrics, EmployeeChartData, EmployeeData, ModuleEmployees } from '../types/dashboard';

export const moduleDistributionData: ModuleData[] = [
  { name: 'PART', input: 850, output: 820, color: '#3B82F6' },
  { name: 'LINING', input: 680, output: 665, color: '#8B4513' },
  { name: 'FRONT', input: 590, output: 575, color: '#10B981' },
  { name: 'HOOD', input: 720, output: 695, color: '#F97316' },
  { name: 'BLACKSLEEVE', input: 550, output: 535, color: '#6366F1' },
  { name: 'JOIN', input: 480, output: 465, color: '#EC4899' },
  { name: 'ASSEMBLY', input: 420, output: 405, color: '#8B5CF6' },
  { name: 'HELPER', input: 380, output: 370, color: '#14B8A6' },
  { name: 'SEAMSEALING', input: 320, output: 310, color: '#EF4444' },
];

export const dashboardMetrics: DashboardMetrics = {
  todaysGoal: 4500,
  currentPerformance: 3550,
  achievementRate: 78.9,
  hourlyProduction: [
    { time: '07:00', output: 120 },
    { time: '08:00', output: 185 },
    { time: '09:00', output: 220 },
    { time: '10:00', output: 195 },
    { time: '11:00', output: 240 },
    { time: '12:00', output: 180 },
    { time: '13:00', output: 210 },
    { time: '14:00', output: 225 },
    { time: '15:00', output: 190 },
    { time: '16:00', output: 165 },
  ],
};

export const moduleEmployees: ModuleEmployees = {
  PART: {
    chartData: [
      { name: 'John D.', output: 95 },
      { name: 'Maria S.', output: 88 },
      { name: 'Ahmed K.', output: 92 },
      { name: 'Lisa W.', output: 78 },
      { name: 'Carlos M.', output: 85 },
      { name: 'Anna L.', output: 90 },
      { name: 'David R.', output: 82 },
      { name: 'Sophie T.', output: 87 },
    ],
    tableData: [
      { nik: 'E001', name: 'John Davidson', actual: 95, asmOutput: 90, target: 85, isBottleneck: false },
      { nik: 'E002', name: 'Maria Santos', actual: 88, asmOutput: 85, target: 85, isBottleneck: false },
      { nik: 'E003', name: 'Ahmed Khan', actual: 92, asmOutput: 88, target: 85, isBottleneck: false },
      { nik: 'E004', name: 'Lisa Wong', actual: 78, asmOutput: 75, target: 85, isBottleneck: true },
      { nik: 'E005', name: 'Carlos Martinez', actual: 85, asmOutput: 82, target: 85, isBottleneck: false },
      { nik: 'E006', name: 'Anna Lopez', actual: 90, asmOutput: 87, target: 85, isBottleneck: false },
    ],
  },
  LINING: {
    chartData: [
      { name: 'Robert B.', output: 72 },
      { name: 'Elena V.', output: 68 },
      { name: 'Mike J.', output: 75 },
      { name: 'Sara H.', output: 65 },
      { name: 'Tom A.', output: 70 },
      { name: 'Nina P.', output: 73 },
    ],
    tableData: [
      { nik: 'E007', name: 'Robert Brown', actual: 72, asmOutput: 70, target: 75, isBottleneck: false },
      { nik: 'E008', name: 'Elena Volkov', actual: 68, asmOutput: 65, target: 75, isBottleneck: true },
      { nik: 'E009', name: 'Mike Johnson', actual: 75, asmOutput: 72, target: 75, isBottleneck: false },
      { nik: 'E010', name: 'Sara Hassan', actual: 65, asmOutput: 62, target: 75, isBottleneck: true },
      { nik: 'E011', name: 'Tom Anderson', actual: 70, asmOutput: 68, target: 75, isBottleneck: false },
    ],
  },
  FRONT: {
    chartData: [
      { name: 'James C.', output: 82 },
      { name: 'Diana F.', output: 79 },
      { name: 'Kevin L.', output: 85 },
      { name: 'Lucy M.', output: 77 },
      { name: 'Peter S.', output: 80 },
    ],
    tableData: [
      { nik: 'E012', name: 'James Cooper', actual: 82, asmOutput: 80, target: 80, isBottleneck: false },
      { nik: 'E013', name: 'Diana Foster', actual: 79, asmOutput: 76, target: 80, isBottleneck: false },
      { nik: 'E014', name: 'Kevin Lee', actual: 85, asmOutput: 82, target: 80, isBottleneck: false },
      { nik: 'E015', name: 'Lucy Miller', actual: 77, asmOutput: 74, target: 80, isBottleneck: true },
      { nik: 'E016', name: 'Peter Smith', actual: 80, asmOutput: 78, target: 80, isBottleneck: false },
    ],
  },
  HOOD: {
    chartData: [
      { name: 'Oscar G.', output: 65 },
      { name: 'Priya R.', output: 62 },
      { name: 'Ivan N.', output: 68 },
      { name: 'Zara K.', output: 60 },
      { name: 'Felix W.', output: 66 },
    ],
    tableData: [
      { nik: 'E017', name: 'Oscar Garcia', actual: 65, asmOutput: 63, target: 65, isBottleneck: false },
      { nik: 'E018', name: 'Priya Raj', actual: 62, asmOutput: 60, target: 65, isBottleneck: true },
      { nik: 'E019', name: 'Ivan Novak', actual: 68, asmOutput: 65, target: 65, isBottleneck: false },
      { nik: 'E020', name: 'Zara Kim', actual: 60, asmOutput: 58, target: 65, isBottleneck: true },
      { nik: 'E021', name: 'Felix Weber', actual: 66, asmOutput: 64, target: 65, isBottleneck: false },
    ],
  },
  BLACKSLEEVE: {
    chartData: [
      { name: 'Rachel H.', output: 88 },
      { name: 'Marcus P.', output: 85 },
      { name: 'Yuki T.', output: 92 },
      { name: 'Aisha M.', output: 83 },
      { name: 'Leo K.', output: 87 },
    ],
    tableData: [
      { nik: 'E022', name: 'Rachel Hughes', actual: 88, asmOutput: 85, target: 85, isBottleneck: false },
      { nik: 'E023', name: 'Marcus Patel', actual: 85, asmOutput: 82, target: 85, isBottleneck: false },
      { nik: 'E024', name: 'Yuki Tanaka', actual: 92, asmOutput: 89, target: 85, isBottleneck: false },
      { nik: 'E025', name: 'Aisha Mohammed', actual: 83, asmOutput: 80, target: 85, isBottleneck: true },
      { nik: 'E026', name: 'Leo Kim', actual: 87, asmOutput: 84, target: 85, isBottleneck: false },
    ],
  },
  JOIN: {
    chartData: [
      { name: 'Sofia R.', output: 75 },
      { name: 'Daniel C.', output: 78 },
      { name: 'Emma S.', output: 82 },
      { name: 'Lucas M.', output: 73 },
      { name: 'Ava P.', output: 77 },
    ],
    tableData: [
      { nik: 'E027', name: 'Sofia Rodriguez', actual: 75, asmOutput: 72, target: 80, isBottleneck: true },
      { nik: 'E028', name: 'Daniel Chen', actual: 78, asmOutput: 75, target: 80, isBottleneck: true },
      { nik: 'E029', name: 'Emma Schmidt', actual: 82, asmOutput: 79, target: 80, isBottleneck: false },
      { nik: 'E030', name: 'Lucas Moreau', actual: 73, asmOutput: 70, target: 80, isBottleneck: true },
      { nik: 'E031', name: 'Ava Patel', actual: 77, asmOutput: 74, target: 80, isBottleneck: true },
    ],
  },
  ASSEMBLY: {
    chartData: [
      { name: 'Noah W.', output: 70 },
      { name: 'Isabella L.', output: 73 },
      { name: 'Ethan J.', output: 68 },
      { name: 'Mia H.', output: 71 },
      { name: 'Oliver S.', output: 69 },
    ],
    tableData: [
      { nik: 'E032', name: 'Noah Wilson', actual: 70, asmOutput: 67, target: 75, isBottleneck: true },
      { nik: 'E033', name: 'Isabella Liu', actual: 73, asmOutput: 70, target: 75, isBottleneck: true },
      { nik: 'E034', name: 'Ethan Jackson', actual: 68, asmOutput: 65, target: 75, isBottleneck: true },
      { nik: 'E035', name: 'Mia Hansen', actual: 71, asmOutput: 68, target: 75, isBottleneck: true },
      { nik: 'E036', name: 'Oliver Singh', actual: 69, asmOutput: 66, target: 75, isBottleneck: true },
    ],
  },
  HELPER: {
    chartData: [
      { name: 'Liam B.', output: 85 },
      { name: 'Charlotte D.', output: 82 },
      { name: 'William T.', output: 88 },
      { name: 'Sophie K.', output: 80 },
      { name: 'Henry M.', output: 83 },
    ],
    tableData: [
      { nik: 'E037', name: 'Liam Brown', actual: 85, asmOutput: 82, target: 80, isBottleneck: false },
      { nik: 'E038', name: 'Charlotte Davis', actual: 82, asmOutput: 79, target: 80, isBottleneck: false },
      { nik: 'E039', name: 'William Turner', actual: 88, asmOutput: 85, target: 80, isBottleneck: false },
      { nik: 'E040', name: 'Sophie Klein', actual: 80, asmOutput: 77, target: 80, isBottleneck: false },
      { nik: 'E041', name: 'Henry Martinez', actual: 83, asmOutput: 80, target: 80, isBottleneck: false },
    ],
  },
  SEAMSEALING: {
    chartData: [
      { name: 'Benjamin F.', output: 65 },
      { name: 'Amelia R.', output: 68 },
      { name: 'Jack L.', output: 63 },
      { name: 'Victoria N.', output: 66 },
      { name: 'Alexander P.', output: 64 },
    ],
    tableData: [
      { nik: 'E042', name: 'Benjamin Foster', actual: 65, asmOutput: 62, target: 70, isBottleneck: true },
      { nik: 'E043', name: 'Amelia Ross', actual: 68, asmOutput: 65, target: 70, isBottleneck: true },
      { nik: 'E044', name: 'Jack Lee', actual: 63, asmOutput: 60, target: 70, isBottleneck: true },
      { nik: 'E045', name: 'Victoria Nguyen', actual: 66, asmOutput: 63, target: 70, isBottleneck: true },
      { nik: 'E046', name: 'Alexander Park', actual: 64, asmOutput: 61, target: 70, isBottleneck: true },
    ],
  },
};

export const factoryOptions = ['Factory A', 'Factory B', 'Factory C'];
export const lineOptions = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
export const styleOptions = ['Style A', 'Style B', 'Style C'];