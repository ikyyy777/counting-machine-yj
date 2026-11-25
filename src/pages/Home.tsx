import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  History,
  LogOut,
  User,
  ChevronDown,
  Settings,
  Settings2,
  Waves,
  BarChartBig,
  AlertCircle,
  Clipboard,
  Bell,
  Clock,
  CheckCircle,
  Scale,
  Square,
  CheckSquare,
  Eye,
  MousePointerClick,
  BarChart3,
  Menu,
  X,
  LayoutDashboard,
  Box,
  Zap,
  Refrigerator,
  TrendingUp,
  Search,
  ChevronRight,
  TrendingDown,
  Users,
  PieChart,
  Info
} from "lucide-react";
import { clearAllAuth } from "../services/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  saveRecentActivity,
  SelectedPageItem,
} from "../services/recentActivity";
import { subscribeToPresenceCount, subscribeToPresenceUsers } from "../components/GlobalPresence";
import { OnlineUser } from "../services/onlinePresence";
import { fetchDashboardSummary, STORAGE_KEYS } from "../services/api";

// Maintenance Banner Component
const MaintenanceBanner: React.FC = () => {
  return (
    <div className="bg-orange-900/20 border border-orange-500/30 rounded-2xl p-4 mb-6 shadow-lg shadow-orange-900/10">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-orange-400 font-semibold text-sm mb-1">
            ⚠️ Maintenance Mode Active
          </h3>
          <p className="text-orange-300/80 text-sm leading-relaxed">
            This page is currently under maintenance. Some features may not work
            properly, display errors, or show incomplete data. Please proceed
            with caution and report any issues to the IT team.
          </p>
        </div>
      </div>
    </div>
  );
};

// Maintenance Popup (modal) for site-wide notice
const MaintenancePopup: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0a0f1c]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#111827] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800">
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl backdrop-blur-md shadow-inner">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Maintenance Notice
              </h3>
              <p className="text-orange-100/90 text-sm font-medium">
                Live updates in progress
              </p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <p className="text-slate-300 text-base leading-relaxed mb-8">
            We’re currently performing live updates on several pages. You may
            encounter issues during this time. Don’t worry — we’ll finish as
            soon as possible.
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl transition-all duration-300 text-sm font-bold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5"
            >
              Acknowledge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const isPageUnderMaintenance = (pathname: string): boolean => {
  const maintenancePaths = ["/history"];
  return maintenancePaths.includes(pathname);
};

export { MaintenanceBanner };

// Maintenance Dialog Component
const MaintenanceDialog: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0a0f1c]/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#111827] rounded-3xl p-8 max-w-md mx-4 shadow-2xl border border-slate-800">
        <div className="flex items-start space-x-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-orange-400 font-bold text-lg mb-2 tracking-wide">
              Maintenance Mode
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              This feature is currently under maintenance. Some functions may
              not work properly, display errors, or show incomplete data.
            </p>
            <div className="bg-orange-900/10 border border-orange-500/20 rounded-xl p-4 mb-4">
              <h4 className="text-orange-400/90 font-semibold text-xs uppercase tracking-wider mb-2">
                Expected Issues
              </h4>
              <ul className="text-orange-300/80 text-xs space-y-1.5 font-medium">
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></span>Slow loading times</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></span>Missing or incomplete data</li>
                <li className="flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2"></span>Error messages</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-2">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all duration-200 text-sm font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white rounded-xl transition-all duration-300 text-sm font-bold shadow-lg shadow-orange-500/25"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

const getUserProfile = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.userData || null;
  } catch {
    return null;
  }
};

const LoadingSpinner: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 border-[3px] border-slate-800 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="absolute w-12 h-12 border-[3px] border-slate-800 border-b-indigo-500 rounded-full animate-spin animation-delay-150"></div>
        <div className="absolute text-blue-500/80"><Zap className="w-5 h-5 animate-pulse" /></div>
      </div>
    </div>
  );
};

// --- NEW SAAS ENTERPRISE COMPONENTS ---

export const Sidebar = ({ isCollapsed, setIsCollapsed, activeMenu }: { isCollapsed: boolean, setIsCollapsed: any, activeMenu: string }) => {
  const navigate = useNavigate();
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <aside className={`transition-all duration-300 ease-in-out bg-[#111827]/80 backdrop-blur-2xl border-r border-slate-800/60 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} hidden md:flex z-50`}>
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/60">
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/assets/images/small_logo.png"
              alt="Logo"
              className="w-14 h-14 object-contain flex-shrink-0"
            />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 whitespace-nowrap tracking-wide">CB Monitoring</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-full flex justify-center">
            <img
              src="/assets/images/small_logo.png"
              alt="Logo"
              className="w-14 h-14 object-contain"
            />
          </div>
        )}
      </div>

      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/${item.id === 'dashboard' ? '' : item.id}`)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-xl transition-all duration-200 group relative
                ${isActive
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              {isActive && !isCollapsed && (
                <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {!isCollapsed && (
                <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800/60">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-colors`}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : (
            <>
              <Menu className="w-5 h-5 mr-3" />
              <span className="font-medium text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export const Header = ({ user, onNavigate, isMobileMenuOpen, setIsMobileMenuOpen, searchQuery, onSearchChange }: any) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navigationItems = [
    { label: "Profile Settings", href: "/profile", icon: Settings },
    { label: "Change Password", href: "/change-password", icon: Settings2 },
    { label: "Logout", href: "/logout", icon: LogOut, isDanger: true },
  ];

  return (
    <header className="h-20 bg-[#0a0f1c]/90 backdrop-blur-2xl border-b border-slate-800/60 sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center">
        <button
          className="md:hidden mr-4 text-slate-400 hover:text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="hidden sm:flex items-center bg-[#111827] border border-slate-800 rounded-full px-4 py-2 w-64 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
          <Search className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search modules..."
            className="bg-transparent border-none outline-none text-sm text-slate-300 w-full placeholder:text-slate-600"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              className="ml-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-5">
        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-[#0a0f1c] shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
        </button>

        <div className="h-6 w-px bg-slate-800"></div>

        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 p-1.5 pr-3 hover:bg-slate-800 rounded-full transition-colors border border-transparent hover:border-slate-700/50"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-[2px]">
              <div className="w-full h-full rounded-full bg-[#111827] flex items-center justify-center">
                <User className="w-4 h-4 text-blue-400" />
              </div>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-semibold text-slate-200 leading-tight">
                {user.username}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {user.role}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-500 ml-1" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-[#111827] rounded-2xl shadow-2xl shadow-black/50 border border-slate-700/50 py-2 z-50 backdrop-blur-xl">
              <div className="px-4 py-3 border-b border-slate-800/60 mb-2">
                <p className="text-sm text-slate-300 font-medium">Signed in as</p>
                <p className="text-sm text-white font-bold truncate mt-0.5">{user.username}</p>
                <p className="text-xs text-slate-500 mt-1">NIK: {user.NIK}</p>
              </div>
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      onNavigate(item);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-medium transition-colors
                      ${item.isDanger
                        ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const OnlineUsersModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  users: OnlineUser[];
  currentNik?: string;
}> = ({ isOpen, onClose, users, currentNik }) => {
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = search.trim()
    ? users.filter(u =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.nik ?? '').toLowerCase().includes(search.toLowerCase())
    )
    : users;

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0a0f1c]/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-[#111827] border border-slate-700/60 rounded-3xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/60 bg-gradient-to-r from-purple-900/20 to-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base tracking-tight">Online Users</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  {users.length} {users.length === 1 ? 'user' : 'users'} online now
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 gap-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all">
            <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search by name or NIK..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-300 w-full placeholder:text-slate-600"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm font-medium">No users found</p>
            </div>
          ) : (
            filtered.map((u) => {
              const isMe = u.nik === currentNik || u.key === currentNik;
              return (
                <div
                  key={u.key}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 ${isMe
                    ? 'bg-purple-500/8 border-purple-500/25'
                    : 'bg-slate-800/40 border-slate-700/30 hover:bg-slate-800/70 hover:border-slate-600/40'
                    }`}
                >
                  {/* Avatar */}
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMe
                    ? 'bg-gradient-to-br from-purple-600 to-indigo-600'
                    : 'bg-gradient-to-br from-slate-700 to-slate-600'
                    }`}>
                    <User className="w-5 h-5 text-white" />
                    {/* Online dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#111827] shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-200 truncate">{u.username}</p>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 flex-shrink-0">You</span>
                      )}
                    </div>
                    {u.nik && (
                      <p className="text-xs text-slate-500 mt-0.5">NIK: {u.nik}</p>
                    )}
                  </div>

                  {/* Last seen */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] text-slate-500">{formatTime(u.lastSeen)}</p>
                    <p className="text-[10px] text-emerald-400/70 mt-0.5">Online</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-600">Presence updates every ~25 seconds via Supabase Realtime</p>
        </div>
      </div>
    </div>
  );
};

const HeroMetrics = ({ summary, onlineUsersCount, modulesCount, onClickOnlineUsers }: { summary: any, onlineUsersCount: number, modulesCount: number, onClickOnlineUsers?: () => void }) => {
  const metrics = [
    {
      title: "Total Active Lines",
      value: summary?.GRAND_TOTAL_LINES || "0",
      unit: "Lines",
      trend: "Active",
      isUp: true,
      icon: Activity,
      color: "green",
      breakdown: [
        { label: "YJ 1", value: summary?.TOTAL_ACTIVE_LINES_YJ1 || "0" },
        { label: "YJ 2-1", value: summary?.TOTAL_ACTIVE_LINES_YJ2_1 || "0" },
        { label: "YJ 2-2", value: summary?.TOTAL_ACTIVE_LINES_YJ2_2 || "0" },
        { label: "YJ 3", value: summary?.TOTAL_ACTIVE_LINES_YJ3 || "0" }
      ]
    },
    {
      title: "Total Control Box",
      value: summary?.GRAND_TOTAL_CB || "0",
      unit: "Pcs",
      trend: "Active",
      isUp: true,
      icon: Refrigerator,
      color: "blue",
      breakdown: [
        { label: "YJ 1", value: summary?.TOTAL_YJ1_CB || "0" },
        { label: "YJ 2-1", value: summary?.TOTAL_YJ2_1_CB || "0" },
        { label: "YJ 2-2", value: summary?.TOTAL_YJ2_2_CB || "0" },
        { label: "YJ 3", value: summary?.TOTAL_YJ3_CB || "0" }
      ]
    },
    {
      title: "Total User Online",
      value: onlineUsersCount.toString(),
      unit: "Users",
      trend: "Live",
      isUp: true,
      icon: Users,
      color: "purple",
      info: "Displays the number of users currently active on this site.",
      clickable: true,
    },
    { title: "Total Modules", value: modulesCount.toString(), unit: "Menus", trend: "System", isUp: true, icon: Box, color: "orange" }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue": return "from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/20";
      case "green": return "from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/20";
      case "orange": return "from-orange-500/20 to-orange-600/5 text-orange-400 border-orange-500/20";
      case "purple": return "from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/20";
      default: return "from-slate-500/20 to-slate-600/5 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        const colorClass = getColorClasses(metric.color);
        return (
          <div
            key={idx}
            onClick={metric.clickable ? onClickOnlineUsers : undefined}
            className={`bg-[#111827]/60 backdrop-blur-md rounded-3xl p-6 border border-slate-800/60 shadow-lg hover:shadow-xl hover:bg-[#111827]/80 transition-all duration-300 relative group ${metric.clickable ? 'cursor-pointer hover:border-purple-500/40 hover:shadow-purple-900/10' : ''
              }`}
          >
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${colorClass.split(' ')[0]} rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-500`}></div>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorClass} border`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${metric.isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {metric.trend}
              </span>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1 relative">
                <h4 className="text-slate-400 font-medium text-sm">{metric.title}</h4>
                {(metric.breakdown || metric.info) && (
                  <div className="relative group/tooltip flex items-center">
                    <Info className="w-4 h-4 text-slate-500 hover:text-slate-300 cursor-help" />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-0 md:left-1/2 md:-translate-x-1/2 mb-2 w-max max-w-[250px] px-4 py-3 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[100]">
                      {metric.breakdown ? (
                        <div className="flex justify-between gap-6">
                          {metric.breakdown.map((item, i) => (
                            <div key={i} className="flex flex-col items-center">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-0.5">{item.label}</span>
                              <span className="text-sm font-bold text-slate-200">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : metric.info ? (
                        <p className="text-xs text-slate-300 leading-relaxed text-center whitespace-normal">
                          {metric.info}
                        </p>
                      ) : null}
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1e293b]"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-white tracking-tight">{metric.value}</span>
                <span className="text-sm text-slate-500 font-semibold">{metric.unit}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MenuCard: React.FC<{
  card: any;
  onClick: (card: any) => void;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (card: any) => void;
}> = ({ card, onClick, isSelectMode, isSelected, onToggleSelect }) => {
  const iconMap: Record<string, any> = {
    users: Users,
    alert: AlertTriangle,
    chart: PieChart,
    Waves: Waves,
    report: Clipboard,
    balance: Scale,
    actionPlan: CheckSquare,
    settings2: Settings2,
    barChart3: BarChart3,
    barChartBig: BarChartBig,
  };

  const IconComponent = iconMap[card.icon] || LayoutDashboard;

  const handleCardAction = () => {
    if (isSelectMode) {
      onToggleSelect(card);
      return;
    }
    onClick(card);
  };

  return (
    <div
      onClick={handleCardAction}
      className={`group relative bg-[#111827]/60 backdrop-blur-xl border rounded-[24px] p-7 cursor-pointer transition-all duration-500 ease-out hover:-translate-y-1.5 overflow-hidden
        ${isSelected
          ? "border-blue-500 bg-[#111827]/90 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/50"
          : card.isPopular
            ? "border-red-500/30 hover:border-red-400/80 shadow-[0_0_15px_rgba(239,68,68,0.05)] hover:shadow-[0_0_40px_rgba(239,68,68,0.15)]"
            : "border-slate-800/60 hover:border-slate-600/80 hover:bg-[#111827]/80 hover:shadow-2xl hover:shadow-blue-900/10"
        }`}
    >
      <div className={`absolute inset-0 transition-opacity duration-500 ${card.isPopular ? 'bg-gradient-to-br from-red-600/5 to-orange-600/5 opacity-100 group-hover:opacity-100' : 'bg-gradient-to-br from-blue-600/5 to-purple-600/5 opacity-0 group-hover:opacity-100'}`} />

      {isSelectMode && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(card);
          }}
          className="absolute top-5 right-5 z-20 bg-[#0a0f1c]/90 border border-slate-700 rounded-xl p-2 hover:border-blue-400 transition-colors shadow-lg"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-500" />
          ) : (
            <Square className="w-5 h-5 text-slate-400" />
          )}
        </button>
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className={`flex items-center justify-center w-14 h-14 rounded-2xl shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 
            ${card.isPopular ? 'bg-gradient-to-br from-red-500 to-orange-500 shadow-red-500/20' : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/20'}`}>
            <IconComponent className={`w-7 h-7 text-white ${card.isPopular ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`} />
          </div>

          <div className="flex flex-col items-end gap-2">
            {card.isPopular && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border border-red-500/30 uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-2 shadow-[0_0_5px_rgba(239,68,68,1)]"></span>
                Popular
              </span>
            )}

            {card.isRealtime && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                Real-time
              </span>
            )}

            {card.isUnderDevelopment && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase tracking-widest">
                Under Development
              </span>
            )}

            {(card.isUnderMaintenance || card.isPageUnderMaintenance) && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-widest">
                Maintenance
              </span>
            )}
          </div>
        </div>

        <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 tracking-tight
          ${card.isPopular ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-red-400 group-hover:from-red-100 group-hover:to-red-300' : 'text-slate-100 group-hover:text-white'}`}>
          {card.title}
        </h3>

        <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow font-medium">
          {card.description}
        </p>

        {!isSelectMode && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 mt-auto">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] text-slate-500 font-bold z-10 hover:z-20 transition-transform hover:scale-110">
                  <User className="w-3 h-3 text-slate-400" />
                </div>
              ))}
              <div className="w-6 h-6 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400 font-bold z-0">
                +
              </div>
            </div>

            <div className={`flex items-center text-sm font-semibold opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${card.isPopular ? 'text-red-400' : 'text-blue-400'}`}>
              Access Module
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const user = getUserProfile();
  const [loading, setLoading] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [showMaintenancePopup, setShowMaintenancePopup] = useState(false);
  const [showSyncNotice, setShowSyncNotice] = useState(true);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState<SelectedPageItem[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [onlineUsersList, setOnlineUsersList] = useState<OnlineUser[]>([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<{ GRAND_TOTAL_CB: number; GRAND_TOTAL_LINES: number } | null>(null);

  useEffect(() => {
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.background = "#0a0f1c";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    if (user) {
      const unsubCount = subscribeToPresenceCount((count) => {
        setOnlineUsersCount(count);
      });
      const unsubList = subscribeToPresenceUsers((users) => {
        setOnlineUsersList(users);
      });

      fetchDashboardSummary().then(res => setDashboardSummary(res));

      return () => {
        unsubCount();
        unsubList();
      };
    }
  }, [user?.username, user?.NIK]);

  const handleLogout = () => {
    clearAllAuth();
    navigate("/login");
  };

  const handleCardClick = (card: any) => {
    if (card.isUnderDevelopment) {
      toast.info("This feature is under development and will be available soon!", { theme: "dark" });
      return;
    }
    if (card.isPageUnderMaintenance) {
      toast.error("This page is currently under maintenance.", { theme: "dark" });
      return;
    }
    if (card.isUnderMaintenance) {
      setPendingNavigation(card.href);
      setShowMaintenanceDialog(true);
      return;
    }

    saveRecentActivity({
      id: card.id,
      title: card.title,
      description: card.description,
      href: card.href,
      icon: card.icon,
    });

    navigate(card.href);
  };

  const handleMaintenanceConfirm = () => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
    setShowMaintenanceDialog(false);
    setPendingNavigation(null);
  };

  const handleMaintenanceCancel = () => {
    setShowMaintenanceDialog(false);
    setPendingNavigation(null);
  };

  const handleNavigation = (item: any) => {
    if (item.label === "Logout") {
      handleLogout();
    } else if (item.label === "Change Password") {
      toast.info("This feature is still under development", { theme: "dark" });
    } else {
      toast.info(`${item.label} functionality would be implemented here`, { theme: "dark" });
    }
  };

  const handleToggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) setSelectedPages([]);
  };

  const handleToggleSelectCard = (card: SelectedPageItem) => {
    setSelectedPages((prev) => {
      if (prev.some((item) => item.id === card.id)) {
        return prev.filter((item) => item.id !== card.id);
      }
      if (prev.length >= 4) {
        toast.warning("You can select a maximum of 4 pages.", { theme: "dark" });
        return prev;
      }
      return [...prev, card];
    });
  };

  const handleRecentActivity = () => navigate("/recent-activity");

  const handleViewPage = () => {
    if (selectedPages.length === 0) {
      toast.warning("Please select at least one page first.", { theme: "dark" });
      return;
    }
    saveRecentActivity(selectedPages);
    navigate("/selected-pages", { state: { selectedPages } });
  };

  const menuCards = [
    {
      id: 1,
      title: "Employee Monitoring CB",
      description: "Monitor employee performance, production metrics, and real-time output tracking.",
      icon: "users",
      href: "/employee-monitoring",
      isRealtime: true,
      isPopular: true,
    },
    {
      id: 2,
      title: "CB Sewing Output",
      description: "Detailed daily sewing output report per operator & module from style start date.",
      icon: "clipboard",
      href: "/cb-sewing-output",
      isPopular: true,
    },
    {
      id: 3,
      title: "Integrated Line Monitoring",
      description: "Integrated real-time line monitoring and analytics dashboard.",
      icon: "barChartBig",
      href: "/integrated-line-monitoring",
      isPopular: true,
    },
    {
      id: 4,
      title: "Defect Monitoring",
      description: "Track and analyze product defects, quality metrics, and identify improvements.",
      icon: "alert",
      href: "/defect-monitoring",
      isRealtime: true,
    },
    // {
    //   id: 3,
    //   title: "Production History",
    //   description: "View historical production data, PO details, and production timelines.",
    //   icon: "chart",
    //   href: "/history",
    // },
    {
      id: 5,
      title: "Employee Monitoring VB",
      description: "Monitor employee performance using CB Vibrations.",
      icon: "Waves",
      href: "/employee-monitoring-vibration",
      isRealtime: true,
    },
    {
      id: 6,
      title: "Graph Analytics",
      description: "Display total output per modules, grouped by Date, Line, DetID, Style & PO.",
      icon: "chart",
      href: "/graph-page",
    },
    // {
    //   id: 6,
    //   title: "Factory Management",
    //   description: "Needs & Risk management. Module vs Assembly matching and tracking.",
    //   icon: "report",
    //   href: "/factory-management",
    //   isUnderMaintenance: true,
    // },
    {
      id: 7,
      title: "Process Output History",
      description: "View CB output per process.",
      icon: "chart",
      href: "/process-output-history",
    },
    // {
    //   id: 8,
    //   title: "Line Balance",
    //   description: "Monitor line balance, bottleneck, and before/after performance summary.",
    //   icon: "balance",
    //   href: "/line-balance",
    // },
    {
      id: 9,
      title: "Stock WIP Report",
      description: "Track work in progress and component stock levels.",
      icon: "report",
      href: "/stock-wip",
      isUnderMaintenance: false,
    },
    {
      id: 10,
      title: "Action Plan",
      description: "Strategic action plans and corrective measures tracking.",
      icon: "actionPlan",
      href: "/action-plan",
      isPageUnderMaintenance: false,
    },
    {
      id: 12,
      title: "Stock Data Operator",
      description: "Monitor stock data handled by specific operators.",
      icon: "barChart3",
      href: "/stock-data-operator",
    },

    {
      id: 13,
      title: "Stock Day Graph",
      description: "Monitor stock levels and daily production graphs with detailed analytics.",
      icon: "barChart3",
      href: "/stock-day-graph",
    },

  ];

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center p-4 font-inter">
        <div className="bg-[#111827] border border-red-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-3">Authentication Error</h2>
          <p className="text-slate-400 font-medium leading-relaxed mb-8">
            Your session has expired or user data is missing. Please sign in again to continue.
          </p>
          <button onClick={() => navigate('/login')} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0f1c] text-slate-200 overflow-hidden font-inter selection:bg-blue-500/30 selection:text-white">
      <ToastContainer position="bottom-right" theme="dark" toastClassName="bg-[#111827] border border-slate-800 text-slate-200 rounded-xl shadow-2xl" />

      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} activeMenu="dashboard" />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-[#0a0f1c]/80 backdrop-blur-sm z-40 flex" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-[#111827] border-r border-slate-800/60 p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <span className="font-bold text-white text-xl">CB Monitoring</span>
              <button onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            {/* Simple mobile links */}
            <nav className="space-y-2">
              <div onClick={() => navigate('/')} className="cursor-pointer py-3 px-4 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 rounded-xl font-semibold flex items-center"><LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard</div>
              <div onClick={() => navigate('/analytics')} className="cursor-pointer py-3 px-4 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 font-semibold flex items-center"><BarChart3 className="w-5 h-5 mr-3" /> Analytics</div>
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        <Header user={user} onNavigate={handleNavigation} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 scroll-smooth relative z-10">

          <div className="max-w-[1600px] mx-auto">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
                  Dashboard Overview
                </h1>
                <p className="text-slate-400 font-medium text-lg max-w-2xl">
                  Real-time production monitoring, performance metrics, and operational insights for the factory floor.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handleRecentActivity}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#111827] border border-slate-700/50 hover:border-slate-500 text-slate-300 rounded-xl font-semibold transition-all shadow-lg hover:bg-slate-800"
                >
                  <Clock className="w-4 h-4" />
                  Recent
                </button>

                <div className="flex items-center gap-2 bg-[#111827] p-1 border border-slate-800 rounded-xl shadow-lg">
                  <button
                    onClick={handleToggleSelectMode}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all
                      ${isSelectMode ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                  >
                    <MousePointerClick className="w-4 h-4" />
                    {isSelectMode ? "Cancel" : "Select"}
                  </button>

                  <button
                    onClick={handleViewPage}
                    disabled={!isSelectMode || selectedPages.length === 0}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all
                      ${(!isSelectMode || selectedPages.length === 0) ? "opacity-50 cursor-not-allowed text-slate-500" : "bg-white text-slate-900 hover:bg-slate-200 shadow-md"}`}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                </div>
              </div>
            </div>

            {showSyncNotice && (
              <div className="mb-8 bg-amber-950/35 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-lg shadow-amber-950/20 backdrop-blur-sm">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Server Sync Notice
                      </span>
                      <h3 className="text-amber-300 font-bold text-sm sm:text-base">
                        Sinkronisasi &amp; Penyesuaian Server Yongjin 3
                      </h3>
                    </div>
                    <p className="text-amber-100/90 text-sm leading-relaxed">
                      Saat ini kami sedang melakukan sinkronisasi dan penyesuaian pada server CB{" "}
                      <span className="font-semibold text-white">Yongjin 3</span> agar selaras dengan server{" "}
                      <span className="font-semibold text-white">Yongjin 2</span>. Selama proses berlangsung, hal ini mungkin dapat berdampak sementara pada tampilan maupun konsistensi{" "}
                      <span className="font-semibold text-amber-300">data CB / Layout Yongjin 3</span>. <span className="text-amber-100/90 text-sm leading-relaxed">Semua akan kembali normal setelah proses ini selesai</span>.
                    </p>
                    <span className="font-semibold text-amber-300">Estimasi selesai: </span> <span className="text-amber-100/90 text-sm leading-relaxed">24 Nov 2026 </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSyncNotice(false)}
                    aria-label="Tutup pemberitahuan"
                    className="p-1.5 rounded-lg text-amber-300/70 hover:text-amber-200 hover:bg-amber-500/15 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <HeroMetrics summary={dashboardSummary} onlineUsersCount={onlineUsersCount} modulesCount={menuCards.length} onClickOnlineUsers={() => setShowOnlineUsers(true)} />

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center">
                <Box className="w-5 h-5 mr-3 text-blue-400" />
                Monitoring Modules
              </h2>
            </div>

            {(() => {
              const q = searchQuery.trim().toLowerCase();
              const filteredCards = q
                ? menuCards.filter(
                  (card) =>
                    card.title.toLowerCase().includes(q) ||
                    card.description.toLowerCase().includes(q)
                )
                : menuCards;

              return filteredCards.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 pb-12">
                  {filteredCards.map((card) => (
                    <MenuCard
                      key={card.id}
                      card={card}
                      onClick={handleCardClick}
                      isSelectMode={isSelectMode}
                      isSelected={selectedPages.some((item) => item.id === card.id)}
                      onToggleSelect={handleToggleSelectCard}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-4 pb-12">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
                    <Search className="w-7 h-7 text-slate-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-300 font-semibold text-base">No modules found</p>
                    <p className="text-slate-500 text-sm mt-1">
                      No results for <span className="text-blue-400 font-medium">&ldquo;{searchQuery}&rdquo;</span>. Try a different keyword.
                    </p>
                  </div>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 px-4 py-2 text-sm font-semibold text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-colors"
                  >
                    Clear search
                  </button>
                </div>
              );
            })()}

            <footer className="pt-8 pb-4 border-t border-slate-800/60 mt-auto flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 font-medium">
              <div>
                © {new Date().getFullYear()} PT Yongjin Javasuka Garment.
              </div>
              <div className="mt-2 md:mt-0 flex items-center gap-1">
                Enterprise Edition <span className="w-1 h-1 rounded-full bg-slate-600 mx-2"></span> Version 2.0
              </div>
            </footer>
          </div>
        </main>
      </div>

      <MaintenanceDialog
        isOpen={showMaintenanceDialog}
        onConfirm={handleMaintenanceConfirm}
        onCancel={handleMaintenanceCancel}
      />
      <MaintenancePopup
        isOpen={showMaintenancePopup}
        onClose={() => setShowMaintenancePopup(false)}
      />
      <OnlineUsersModal
        isOpen={showOnlineUsers}
        onClose={() => setShowOnlineUsers(false)}
        users={onlineUsersList}
        currentNik={user?.NIK || user?.key}
      />
    </div>
  );
};

export default Home;
