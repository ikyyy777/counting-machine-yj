const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />
);

export const ChartSkeleton = () => (
  <div className="bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-700 h-[400px] relative overflow-hidden">
    <div className="h-6 w-48 bg-gray-800 rounded mb-6 relative overflow-hidden">
      <Shimmer />
    </div>
    <div className="space-y-4">
      <div className="h-[320px] bg-gray-800 rounded relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="flex justify-between">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-4 w-16 bg-gray-800 rounded relative overflow-hidden">
            <Shimmer />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const MetricsPanelSkeleton = () => (
  <div className="bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-700 relative overflow-hidden">
    <div className="h-6 w-48 bg-gray-800 rounded mb-6 relative overflow-hidden">
      <Shimmer />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-[80px] bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-[100px] bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="h-[60px] bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      ))}
    </div>
  </div>
);

export const EmployeeChartSkeleton = () => (
  <div className="bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-700 relative overflow-hidden">
    <div className="h-6 w-48 bg-gray-800 rounded mb-6 relative overflow-hidden">
      <Shimmer />
    </div>
    <div className="flex gap-4">
      <div className="flex-1">
        <div className="h-[400px] bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      </div>
      <div className="w-1/3">
        <div className="h-[400px] bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      </div>
    </div>
  </div>
);

export const BottleneckTableSkeleton = () => (
  <div className="bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-700 relative overflow-hidden">
    <div className="h-6 w-48 bg-gray-800 rounded mb-6 relative overflow-hidden">
      <Shimmer />
    </div>
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-800 rounded relative overflow-hidden">
            <Shimmer />
          </div>
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      ))}
    </div>
  </div>
); 