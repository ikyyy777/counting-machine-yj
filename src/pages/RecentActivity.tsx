import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  History,
  ExternalLink,
  LayoutGrid,
} from "lucide-react";
import {
  getRecentActivities,
  clearRecentActivities,
  saveRecentActivity,
  RecentActivityItem,
} from "../services/recentActivity";

const RecentActivity: React.FC = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);

  // Ambil data dari localStorage saat component pertama kali render
  useEffect(() => {
    setActivities(getRecentActivities());
  }, []);

  const handleOpenActivity = (item: RecentActivityItem) => {
    saveRecentActivity(item.selectedPages);

    if (item.type === "single") {
      navigate(item.selectedPages[0].href);
      return;
    }

    navigate("/selected-pages", {
      state: {
        selectedPages: item.selectedPages,
      },
    });
  };

  // reset semua activity
  const handleClearAll = () => {
    clearRecentActivities();
    setActivities([]);
  };

  const formatVisitedTime = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-3xl font-bold text-white">Recent Activity</h1>
              <p className="text-slate-400 text-sm">
                Recently opened multi-page monitor sets
              </p>
            </div>
          </div>

          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Reset Activity
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-10 text-center">
            <div className="flex justify-center mb-4">
              <History className="w-12 h-12 text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No recent activity yet
            </h2>
            <p className="text-slate-400 mb-6">
              Open selected pages first, then they will appear here.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
            {activities.map((item) => (
              <div
                key={`${item.id}-${item.visitedAt}`}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-colors flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-600">
                      <LayoutGrid className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs text-slate-400 text-right">
                      {formatVisitedTime(item.visitedAt)}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-slate-400 text-sm mb-4">
                    {item.type === "single"
                      ? "Single page"
                      : `${item.selectedPages.length} selected pages`}
                  </p>

                  <div className="space-y-2">
                    {item.type === "multi" && (
                      <div className="space-y-2">
                        {item.selectedPages.map((page) => (
                          <div
                            key={page.id}
                            className="text-sm text-slate-300 bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2"
                          >
                            {page.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => handleOpenActivity(item)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Open
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
