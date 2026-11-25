import React, { useMemo, useState } from "react";
import {
  Settings2,
  Search,
  RefreshCcw,
  Shuffle,
  Save,
  GitBranch,
} from "lucide-react";

type LayoutStatus = "Normal" | "Changed" | "Pending" | "Overload";

interface LayoutRow {
  id: number;
  sequence: number;
  processCode: string;
  processName: string;
  operatorId: string;
  operatorName: string;
  module: string;
  machineType: string;
  currentPosition: string;
  targetPosition: string;
  status: LayoutStatus;
  remarks: string;
}

const factoryOptions = ["YONGJIN 1", "YONGJIN 2"];
const lineOptions = ["LINE A", "LINE B", "LINE C", "LINE D"];
const styleOptions = ["STYLE 001", "STYLE 002", "STYLE 003"];

const initialLayoutData: LayoutRow[] = [
  {
    id: 1,
    sequence: 1,
    processCode: "PR001",
    processName: "Sewing Side",
    operatorId: "OP1001",
    operatorName: "Rina",
    module: "M1",
    machineType: "Single Needle",
    currentPosition: "Pos 01",
    targetPosition: "Pos 01",
    status: "Normal",
    remarks: "-",
  },
  {
    id: 2,
    sequence: 2,
    processCode: "PR002",
    processName: "Attach Collar",
    operatorId: "OP1002",
    operatorName: "Budi",
    module: "M1",
    machineType: "Overlock",
    currentPosition: "Pos 02",
    targetPosition: "Pos 03",
    status: "Changed",
    remarks: "Moved to support bottleneck",
  },
  {
    id: 3,
    sequence: 3,
    processCode: "PR003",
    processName: "Top Stitch",
    operatorId: "OP1003",
    operatorName: "Sari",
    module: "M2",
    machineType: "Double Needle",
    currentPosition: "Pos 03",
    targetPosition: "Pos 03",
    status: "Overload",
    remarks: "High work content",
  },
  {
    id: 4,
    sequence: 4,
    processCode: "PR004",
    processName: "Assembly",
    operatorId: "OP1004",
    operatorName: "Andi",
    module: "M2",
    machineType: "Flatbed",
    currentPosition: "Pos 04",
    targetPosition: "Pos 05",
    status: "Pending",
    remarks: "Waiting approval",
  },
  {
    id: 5,
    sequence: 5,
    processCode: "PR005",
    processName: "Bottom Hem",
    operatorId: "OP1005",
    operatorName: "Dewi",
    module: "M3",
    machineType: "Coverstitch",
    currentPosition: "Pos 05",
    targetPosition: "Pos 05",
    status: "Normal",
    remarks: "-",
  },
  {
    id: 6,
    sequence: 6,
    processCode: "PR006",
    processName: "Final Checking",
    operatorId: "OP1006",
    operatorName: "Arif",
    module: "M3",
    machineType: "Inspection",
    currentPosition: "Pos 06",
    targetPosition: "Pos 06",
    status: "Normal",
    remarks: "-",
  },
];

const getStatusClass = (status: LayoutStatus) => {
  switch (status) {
    case "Normal":
      return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
    case "Changed":
      return "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30";
    case "Pending":
      return "bg-amber-500/15 text-amber-300 border border-amber-500/30";
    case "Overload":
      return "bg-red-500/15 text-red-300 border border-red-500/30";
    default:
      return "bg-slate-500/15 text-slate-300 border border-slate-500/30";
  }
};

const LayoutAdjustment: React.FC = () => {
  const [filters, setFilters] = useState({
    factory: "YONGJIN 1",
    line: "",
    style: "",
  });

  const [search, setSearch] = useState("");
  const [data, setData] = useState<LayoutRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<LayoutRow | null>(null);

  const handleLookup = () => {
    setLoading(true);

    setTimeout(() => {
      setData(initialLayoutData);
      setLoading(false);
    }, 500);
  };

  const handleRefresh = () => {
    handleLookup();
  };

  const handleReset = () => {
    setFilters({
      factory: "YONGJIN 1",
      line: "",
      style: "",
    });
    setSearch("");
    setData([]);
  };

  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.processName.toLowerCase().includes(search.toLowerCase()) ||
        item.operatorName.toLowerCase().includes(search.toLowerCase()) ||
        item.processCode.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);

  const summary = useMemo(() => {
    return filteredData.reduce(
      (acc, item) => {
        acc.totalOperators += 1;
        acc.totalProcesses += 1;
        acc.activeModules.add(item.module);
        if (item.status === "Pending" || item.status === "Changed") {
          acc.pendingChanges += 1;
        }
        return acc;
      },
      {
        totalOperators: 0,
        totalProcesses: 0,
        activeModules: new Set<string>(),
        pendingChanges: 0,
      },
    );
  }, [filteredData]);

  const openEditModal = (row: LayoutRow) => {
    setEditingRow({ ...row });
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setEditingRow(null);
    setIsModalOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editingRow) return;

    setData((prev) =>
      prev.map((item) => (item.id === editingRow.id ? editingRow : item)),
    );

    closeEditModal();
  };

  const handleSaveChanges = () => {
    alert("Changes saved successfully. (Dummy action)");
  };

  const handleReassignOperator = () => {
    alert("Reassign Operator clicked. (Dummy action)");
  };

  const handleMoveProcess = () => {
    alert("Move Process clicked. (Dummy action)");
  };

  const handleSyncBalancing = () => {
    alert("Sync Balancing clicked. (Dummy action)");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top Header */}
      <div className="border-b border-slate-700 bg-slate-950 px-6 py-4">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <Settings2 className="h-10 w-10 text-cyan-400" />
            <h1 className="text-3xl font-bold tracking-tight text-cyan-400">
              Layout Adjustment
            </h1>
          </div>

          {/* Right Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-lg font-semibold text-white">
                FACTORY
              </label>
              <select
                value={filters.factory}
                onChange={(e) =>
                  setFilters({ ...filters, factory: e.target.value })
                }
                className="h-11 min-w-[160px] rounded-xl border border-slate-600 bg-slate-800 px-4 text-white outline-none transition focus:border-cyan-500"
              >
                {factoryOptions.map((factory) => (
                  <option key={factory} value={factory}>
                    {factory}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-lg font-semibold text-white">LINE</label>
              <select
                value={filters.line}
                onChange={(e) =>
                  setFilters({ ...filters, line: e.target.value })
                }
                className="h-11 min-w-[190px] rounded-xl border border-slate-600 bg-slate-800 px-4 text-white outline-none transition focus:border-cyan-500"
              >
                <option value="">Select Line</option>
                {lineOptions.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-lg font-semibold text-white">STYLE</label>
              <select
                value={filters.style}
                onChange={(e) =>
                  setFilters({ ...filters, style: e.target.value })
                }
                className="h-11 min-w-[180px] rounded-xl border border-slate-600 bg-slate-800 px-4 text-white outline-none transition focus:border-cyan-500"
              >
                <option value="">Select Style</option>
                {styleOptions.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleLookup}
              className="h-11 rounded-xl bg-cyan-700 px-8 font-semibold text-white transition hover:bg-cyan-600"
            >
              Load Layout
            </button>

            <button
              onClick={handleReset}
              className="h-11 rounded-xl border border-slate-600 bg-slate-800 px-6 font-semibold text-white transition hover:bg-slate-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        {/* Top info bar */}
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              Layout Management Dashboard
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Factory {filters.factory} | Line {filters.line || "-"} | Style{" "}
              {filters.style || "-"}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search process or operator..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-800 pl-10 pr-4 text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-500 sm:w-[280px]"
              />
            </div>

            <button
              onClick={handleRefresh}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 text-white transition hover:bg-slate-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Total Operators</p>
            <h3 className="mt-2 text-3xl font-bold text-white">
              {summary.totalOperators}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Total Processes</p>
            <h3 className="mt-2 text-3xl font-bold text-cyan-300">
              {summary.totalProcesses}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Active Modules</p>
            <h3 className="mt-2 text-3xl font-bold text-indigo-300">
              {summary.activeModules.size}
            </h3>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-lg">
            <p className="text-sm text-slate-400">Pending Changes</p>
            <h3 className="mt-2 text-3xl font-bold text-amber-300">
              {summary.pendingChanges}
            </h3>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              onClick={handleReassignOperator}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600"
            >
              <Shuffle className="h-4 w-4" />
              Reassign Operator
            </button>

            <button
              onClick={handleMoveProcess}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              <GitBranch className="h-4 w-4" />
              Move Process
            </button>

            <button
              onClick={handleSaveChanges}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>

            <button
              onClick={handleSyncBalancing}
              className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Sync Balancing
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-lg">
          <div className="border-b border-slate-700 px-5 py-4">
            <h3 className="text-lg font-semibold text-white">
              Layout Adjustment Board
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Real-time operator, process, and module adjustment overview
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1400px]">
              <thead className="bg-slate-700/40">
                <tr className="text-left text-sm uppercase tracking-wide text-slate-300">
                  <th className="px-4 py-3">Seq</th>
                  <th className="px-4 py-3">Process Code</th>
                  <th className="px-4 py-3">Process Name</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Machine</th>
                  <th className="px-4 py-3">Current Position</th>
                  <th className="px-4 py-3">Target Position</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Remarks</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      Loading data...
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-700 transition hover:bg-slate-700/20"
                    >
                      <td className="px-4 py-3 text-slate-300">
                        {item.sequence}
                      </td>
                      <td className="px-4 py-3 text-cyan-300">
                        {item.processCode}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {item.processName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">
                            {item.operatorName}
                          </span>
                          <span className="text-xs text-slate-400">
                            {item.operatorId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-indigo-300">
                        {item.module}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.machineType}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {item.currentPosition}
                      </td>
                      <td className="px-4 py-3 font-medium text-amber-300">
                        {item.targetPosition}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {item.remarks}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openEditModal(item)}
                          className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-600"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      No layout data found. Please select filters and click Load
                      Layout.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-cyan-400">
                  Edit Layout Row
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Update operator, module, position, status, and remarks
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg px-3 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Process Name
                </label>
                <input
                  type="text"
                  value={editingRow.processName}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      processName: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Operator Name
                </label>
                <input
                  type="text"
                  value={editingRow.operatorName}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      operatorName: e.target.value,
                      status:
                        editingRow.status === "Normal"
                          ? "Changed"
                          : editingRow.status,
                    })
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Module
                </label>
                <input
                  type="text"
                  value={editingRow.module}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      module: e.target.value,
                      status:
                        editingRow.status === "Normal"
                          ? "Changed"
                          : editingRow.status,
                    })
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Target Position
                </label>
                <input
                  type="text"
                  value={editingRow.targetPosition}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      targetPosition: e.target.value,
                      status:
                        editingRow.status === "Normal"
                          ? "Changed"
                          : editingRow.status,
                    })
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Status
                </label>
                <select
                  value={editingRow.status}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      status: e.target.value as LayoutStatus,
                    })
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="Changed">Changed</option>
                  <option value="Pending">Pending</option>
                  <option value="Overload">Overload</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Machine Type
                </label>
                <input
                  type="text"
                  value={editingRow.machineType}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      machineType: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Remarks
                </label>
                <textarea
                  rows={3}
                  value={editingRow.remarks}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      remarks: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
              <button
                onClick={closeEditModal}
                className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutAdjustment;
