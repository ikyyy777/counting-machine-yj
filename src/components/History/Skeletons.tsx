import React from 'react';

const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />
);

export const HistoryTableSkeleton = () => (
  <div className="space-y-4">
    {/* Search and Filter Bar */}
    <div className="flex gap-4 items-center">
      <div className="flex-1">
        <div className="w-full h-10 bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      </div>
      <div className="w-48">
        <div className="w-full h-10 bg-gray-800 rounded-lg relative overflow-hidden">
          <Shimmer />
        </div>
      </div>
    </div>

    {/* Table */}
    <div className="overflow-x-auto">
      <div className="min-w-full bg-gray-800 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-700 px-4 py-3">
          <div className="grid grid-cols-[repeat(18,_minmax(100px,_1fr))] gap-4">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-800 rounded relative overflow-hidden">
                <Shimmer />
              </div>
            ))}
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-700">
          {[...Array(10)].map((_, rowIndex) => (
            <div key={rowIndex} className="px-4 py-3">
              <div className="grid grid-cols-[repeat(18,_minmax(100px,_1fr))] gap-4">
                {[...Array(18)].map((_, colIndex) => (
                  <div
                    key={colIndex}
                    className={`h-4 bg-gray-800 rounded relative overflow-hidden ${
                      colIndex >= 8 ? 'text-right' : ''
                    }`}
                  >
                    <Shimmer />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
); 