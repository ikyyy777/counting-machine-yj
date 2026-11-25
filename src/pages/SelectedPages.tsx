import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Settings, X, Check } from "lucide-react";
import { saveRecentActivity } from "../services/recentActivity";

import ActionPlan from "./ActionPlan";
import DefectMonitoring from "./DefectMonitoring";
import EmployeeMonitoring from "./EmployeeMonitoring";
import EmployeeMonitoringVibration from "./EmployeeMonitoringVibration";
import FactoryManagement from "./FactoryManagement";
import History from "./History";
import LineBalance from "./LineBalance";
import ProcessOutputHistory from "./ProcessOutputHistory";
import StockWIP from "./StockWIP";
// import Summary from "./Summary";
import StockDataOperator from "./StockDataOperator";
import LayoutAdjustment from "./LayoutAdjustment";
import GraphPage from "../components/GraphPage/GraphPage";

type PageType = {
  id: number;
  title: string;
  description: string;
  href: string;
  icon?: string;
};

const ALL_MENU_PAGES: PageType[] = [
  {
    id: 1,
    title: "Employee Monitoring CB",
    description:
      "Monitor employee performance, production metrics, and real-time output tracking across all production lines.",
    href: "/employee-monitoring",
  },
  {
    id: 2,
    title: "Defect Monitoring",
    description:
      "Track and analyze product defects, quality metrics, and identify areas for improvement in the production process.",
    href: "/defect-monitoring",
  },
  {
    id: 3,
    title: "Production History",
    description:
      "View historical production data, including PO details, size breakdowns, and production timelines.",
    href: "/history",
  },
  {
    id: 4,
    title: "Employee Monitoring VB",
    description: "Monitor employee performance using CB Vibrations.",
    href: "/employee-monitoring-vibration",
  },
  {
    id: 5,
    title: "Graph Page",
    description:
      "Display total output per modules, grouped by Date, Line, DetID, Style & PO.",
    href: "/graph-page",
  },
  {
    id: 6,
    title: "Factory Management",
    description:
      "Needs & Risk management: Compare module vs Assembly. Shows Today & previous workday tables, aggregates parts & POs per module, with Factory/Line/Date filters.",
    href: "/factory-management",
  },
  {
    id: 7,
    title: "CB Process Output History",
    description:
      "View CB process output history per employee/module index (ACTUAL) for a selected factory, line, and date range.",
    href: "/process-output-history",
  },
  {
    id: 8,
    title: "Line Balance",
    description:
      "Monitor line balance, bottleneck, corrective action, and before/after performance summary per process.",
    href: "/line-balance",
  },
  {
    id: 9,
    title: "Stock WIP Report",
    description: "Stock WIP monitoring report.",
    href: "/stock-wip",
  },
  {
    id: 10,
    title: "Action Plan",
    description: "Action plan monitoring page.",
    href: "/action-plan",
  },
  {
    id: 12,
    title: "Stock Data Operator",
    description: "Manage and monitor stock data by operator.",
    href: "/stock-data-operator",
  },
  {
    id: 13,
    title: "Layout Adjustment",
    description:
      "Manage real-time operator, process, and module layout changes.",
    href: "/layout-adjustment",
  },
];

// Wrapper untuk scaling tampilan halaman
type ScaledPageFrameProps = {
  children: React.ReactNode;
};

const ScaledPageFrame: React.FC<ScaledPageFrameProps> = ({ children }) => {
  const BASE_WIDTH = 1920;
  const BASE_HEIGHT = 900;
  const SCALE = 0.48;

  const scaledWidth = BASE_WIDTH * SCALE;
  const scaledHeight = BASE_HEIGHT * SCALE;

  return (
    <div className="w-full h-full overflow-auto bg-[#081224]">
      <div
        style={{
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          minWidth: `${scaledWidth}px`,
          minHeight: `${scaledHeight}px`,
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${BASE_WIDTH}px`,
            height: `${BASE_HEIGHT}px`,
            transform: `scale(${SCALE})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const SelectedPages: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Ambil halaman yang dipilih dari navigation state (max 4)
  const initialSelectedPages: PageType[] = (
    location.state?.selectedPages || []
  ).slice(0, 4);

  const [selectedPages, setSelectedPages] =
    useState<PageType[]>(initialSelectedPages);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [showManageModal, setShowManageModal] = useState(false);

  // Simpan ke recent activity setiap ada perubahan
  useEffect(() => {
    if (selectedPages.length > 0) {
      saveRecentActivity(selectedPages);
    }
  }, [selectedPages]);

  const pageComponentMap = useMemo(
    () => ({
      "/employee-monitoring": (
        <ScaledPageFrame>
          <EmployeeMonitoring />
        </ScaledPageFrame>
      ),
      "/defect-monitoring": (
        <ScaledPageFrame>
          <DefectMonitoring />
        </ScaledPageFrame>
      ),
      "/history": (
        <ScaledPageFrame>
          <History />
        </ScaledPageFrame>
      ),
      "/employee-monitoring-vibration": (
        <ScaledPageFrame>
          <EmployeeMonitoringVibration />
        </ScaledPageFrame>
      ),
      "/graph-page": (
        <ScaledPageFrame>
          <GraphPage />
        </ScaledPageFrame>
      ),
      "/factory-management": (
        <ScaledPageFrame>
          <FactoryManagement />
        </ScaledPageFrame>
      ),
      "/process-output-history": (
        <ScaledPageFrame>
          <ProcessOutputHistory />
        </ScaledPageFrame>
      ),
      "/line-balance": (
        <ScaledPageFrame>
          <LineBalance />
        </ScaledPageFrame>
      ),
      "/stock-wip": (
        <ScaledPageFrame>
          <StockWIP />
        </ScaledPageFrame>
      ),
      "/action-plan": (
        <ScaledPageFrame>
          <ActionPlan />
        </ScaledPageFrame>
      ),
      "/stock-data-operator": (
        <ScaledPageFrame>
          <StockDataOperator />
        </ScaledPageFrame>
      ),
      "/layout-adjustment": (
        <ScaledPageFrame>
          <LayoutAdjustment />
        </ScaledPageFrame>
      ),
    }),
    [],
  );

  // Tambah / hapus halaman dari selection
  const handleTogglePage = (page: PageType) => {
    const exists = selectedPages.some((item) => item.id === page.id);

    if (exists) {
      const updated = selectedPages.filter((item) => item.id !== page.id);
      setSelectedPages(updated);

      if (activeIndex >= updated.length) {
        setActiveIndex(Math.max(0, updated.length - 1));
      }
      return;
    }

    if (selectedPages.length >= 4) return;

    setSelectedPages((prev) => [...prev, page]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#07152d] via-[#0f1f45] to-[#1a2742] text-white p-4 md:p-6">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Multi Monitor</h1>
            <p className="text-slate-400 text-sm">
              Up to 4 pages can be opened at the same time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowManageModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Manage Pages
            </button>

            <button
              onClick={() => navigate("/")}
              className="px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Back
            </button>
          </div>
        </div>

        {selectedPages.length === 0 ? (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-10 text-center">
            <h2 className="text-xl font-semibold mb-2">No selected pages</h2>
            <p className="text-slate-400 mb-6">
              Click &quot;Manage Pages&quot; to add pages.
            </p>
            <button
              onClick={() => setShowManageModal(true)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Manage Pages
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {selectedPages.map((page, index) => {
              const pageContent =
                pageComponentMap[page.href as keyof typeof pageComponentMap];

              return (
                <div
                  key={`${page.id}-${page.href}`}
                  onClick={() => setActiveIndex(index)}
                  className={`relative h-[460px] rounded-2xl border bg-slate-900/40 overflow-hidden transition-all cursor-pointer ${
                    activeIndex === index
                      ? "border-blue-400 shadow-lg shadow-blue-500/10"
                      : "border-slate-700 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          activeIndex === index
                            ? "bg-green-400"
                            : "bg-slate-500"
                        }`}
                      />
                      <h2 className="font-semibold truncate">{page.title}</h2>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePage(page);
                      }}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-[calc(100%-53px)] overflow-auto bg-slate-950/20">
                    {pageContent ?? (
                      <div className="p-6">
                        <h3 className="text-xl font-bold mb-2">{page.title}</h3>
                        <p className="text-slate-300">{page.description}</p>
                        <p className="text-slate-400 mt-4">
                          Component for{" "}
                          <span className="text-blue-400">{page.href}</span> is
                          not mapped yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showManageModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                <div>
                  <h2 className="text-xl font-bold">Manage Pages</h2>
                  <p className="text-slate-400 text-sm">Select up to 4 pages</p>
                </div>
                <button
                  onClick={() => setShowManageModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ALL_MENU_PAGES.map((page) => {
                    const checked = selectedPages.some(
                      (item) => item.id === page.id,
                    );
                    const disabled = !checked && selectedPages.length >= 4;

                    return (
                      <button
                        key={page.id}
                        onClick={() => !disabled && handleTogglePage(page)}
                        className={`text-left rounded-xl border p-4 transition-all ${
                          checked
                            ? "border-blue-400 bg-blue-500/10"
                            : disabled
                              ? "border-slate-700 bg-slate-800/40 opacity-50 cursor-not-allowed"
                              : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-white">
                            {page.title}
                          </h3>
                          <div
                            className={`flex items-center justify-center w-5 h-5 rounded border ${
                              checked
                                ? "bg-blue-600 border-blue-600"
                                : "border-slate-500"
                            }`}
                          >
                            {checked && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">
                          {page.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-900/80">
                <span className="text-sm text-slate-400">
                  {selectedPages.length} / 4 selected
                </span>

                <button
                  onClick={() => setShowManageModal(false)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectedPages;
