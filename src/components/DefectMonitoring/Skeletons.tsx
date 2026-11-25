import React from 'react';

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />
);

export const ProductionInfoSkeleton = () => (
  <div className="bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-700 h-full relative overflow-hidden">
    <div className="h-6 w-48 bg-gray-800 rounded mb-6 relative overflow-hidden">
      <Shimmer />
    </div>
    
    {/* Production Info Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-[80px] bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      ))}
    </div>

    {/* Top Defects Section */}
    <div className="mb-6">
      <div className="h-6 w-36 bg-gray-800 rounded mb-4 relative overflow-hidden">
        <Shimmer />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[60px] bg-gray-800 rounded-lg relative overflow-hidden">
            <Shimmer />
          </div>
        ))}
      </div>
    </div>

    {/* Progress Bars */}
    <div className="space-y-6">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-32 bg-gray-800 rounded relative overflow-hidden">
            <Shimmer />
          </div>
          <div className="h-8 bg-gray-800 rounded-lg relative overflow-hidden">
            <Shimmer />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const HourlyOutputSkeleton = () => (
  <div className="bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-700 h-full relative overflow-hidden">
    <div className="h-6 w-48 bg-gray-800 rounded mb-6 relative overflow-hidden">
      <Shimmer />
    </div>
    <div className="h-[calc(100%-40px)] bg-gray-800 rounded-lg relative overflow-hidden">
      <Shimmer />
    </div>
  </div>
); 