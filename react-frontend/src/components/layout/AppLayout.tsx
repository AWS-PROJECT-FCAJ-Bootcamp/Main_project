import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, CheckSquare, Calculator,
  FileSpreadsheet, Search, Settings as SettingsIcon, User,
  LogOut, ChevronDown, Database, FileJson, Activity, Loader2,
  Scale, Cpu, Shield, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';

// ── Nav Items Grouped by Category
interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  adminOnly?: boolean;
}

interface NavCategory {
  category: string;
  items: NavItem[];
}

const NAV_CATEGORIES: NavCategory[] = [
  {
    category: 'TỔNG QUAN',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    category: 'PHÂN TÍCH TÀI CHÍNH',
    items: [
      { to: '/companies', label: 'Danh sách Công ty', icon: Building2 },
      { to: '/financials', label: 'Báo cáo Tài chính', icon: FileText },
      { to: '/ratios', label: 'Chỉ số Tài chính', icon: Calculator },
      { to: '/distress', label: 'Phân tích Distress', icon: Scale },
    ],
  },
  {
    category: 'XỬ LÝ & DỮ LIỆU',
    items: [
      { to: '/normalization', label: 'Chuẩn hóa & Làm sạch', icon: CheckSquare },
      { to: '/explorer', label: 'Data Explorer', icon: Search },
      { to: '/sessions', label: 'Query Sessions', icon: FileJson },
      { to: '/dataset', label: 'Xuất Dataset', icon: FileSpreadsheet },
    ],
  },
  {
    category: 'MÔ HÌNH AI & DỰ BÁO',
    items: [
      { to: '/ai-studio', label: 'AI/ML Studio', icon: Cpu },
      { to: '/prediction', label: 'Dự báo Rủi ro', icon: Sparkles },
    ],
  },
  {
    category: 'HỆ THỐNG & QUẢN TRỊ',
    items: [
      { to: '/admin', label: 'Quản lý Người dùng', icon: Shield, adminOnly: true },
      { to: '/settings', label: 'Cài đặt', icon: SettingsIcon },
    ],
  },
];

export const AppLayout: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const [ready, setReady] = React.useState(useAuthStore.persist.hasHydrated());
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Wait for persist hydration
  React.useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) { setReady(true); return undefined; }
    const unsub = useAuthStore.persist.onFinishHydration(() => setReady(true));
    return unsub;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!ready) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Đang khôi phục phiên...
      </div>
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  const isAdmin = user.role === 'admin';

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200/80 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-100">
          <span className="fsd-logo text-xl">FSD //</span>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5 tracking-widest uppercase">
            Distress Analysis Platform
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_CATEGORIES.map((cat) => {
            const filteredItems = cat.items.filter((item) => !item.adminOnly || isAdmin);
            if (filteredItems.length === 0) return null;

            return (
              <div key={cat.category} className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                  {cat.category}
                </p>
                {filteredItems.map(({ to, label, icon: Icon, adminOnly }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive ? 'nav-link-active' : 'nav-link-idle'
                      }`
                    }
                  >
                    <Icon size={16} strokeWidth={2} />
                    <span className="truncate">{label}</span>
                    {adminOnly && (
                      <span className="ml-auto text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer — user chip */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-white text-xs font-bold">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.full_name}</p>
              <p className={`text-[10px] font-medium ${isAdmin ? 'text-indigo-600' : 'text-emerald-600'}`}>
                ● {isAdmin ? 'Admin' : 'Guest'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-1.5">
              <Database size={13} className="text-indigo-500" strokeWidth={2.5} />
              <span className="text-xs font-medium text-slate-500">LOCAL MODE</span>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
              <Activity size={11} className="text-emerald-500" strokeWidth={2.5} />
              <span className="text-[11px] font-semibold text-emerald-600">Live</span>
            </div>
          </div>

          {/* Account dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="account-dropdown-btn"
              onClick={() => setDropdownOpen((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700
                hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                <User size={12} className="text-white" />
              </div>
              <span className="max-w-[120px] truncate">{user.full_name}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 z-50 overflow-hidden">
                {/* Profile header */}
                <div className="px-4 py-3.5 bg-gradient-to-br from-indigo-50 to-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.full_name}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isAdmin ? 'ADMIN' : 'GUEST'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-100 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Vai trò</span>
                    <span className={`font-semibold ${isAdmin ? 'text-indigo-600' : 'text-emerald-600'}`}>{isAdmin ? 'Quản trị viên' : 'Người dùng'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đăng ký</span>
                    <span className="font-medium">{new Date(user.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-2">
                  <button
                    id="logout-btn"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600
                      hover:bg-red-50 transition-all duration-150 group"
                  >
                    <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
