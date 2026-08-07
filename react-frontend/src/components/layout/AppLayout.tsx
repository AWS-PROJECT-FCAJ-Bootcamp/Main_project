import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CheckSquare,
  Calculator,
  FileSpreadsheet,
  Settings as SettingsIcon,
  User,
  LogOut,
  Database,
  Activity,
  Calendar,
  LineChart,
  ShieldAlert,
  Cpu,
  Sparkles,
  Search,
  BookOpen,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AuthButton } from '@/features/auth/components/AuthButton';
import { isCognitoConfigured } from '@/config/cognito';

interface NavSection {
  title: string;
  items: {
    to: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: '📊 BẢNG ĐIỀU KHIỂN & 5 VIEW CHÍNH',
    items: [
      { to: '/explorer', label: 'View 1: Cào & Nạp Dữ Liệu', icon: Database, badge: 'S3' },
      { to: '/tick-monitor', label: 'View 2: Bảng Giá & Dòng Tiền', icon: Activity, badge: 'Live' },
      { to: '/ohlcv', label: 'View 3: Lịch Sử Nến Giá', icon: Calendar },
      { to: '/charts', label: 'View 4: Biểu Đồ Kỹ Thuật', icon: LineChart, badge: 'Canvas' },
      { to: '/dataset', label: 'View 5: Xuất Tập Dữ Liệu', icon: FileSpreadsheet, badge: 'Parquet' },
    ],
  },
  {
    title: '🏢 PHÂN TÍCH DOANH NGHIỆP',
    items: [
      { to: '/dashboard', label: 'Dashboard Thị Trường', icon: LayoutDashboard },
      { to: '/companies', label: 'Danh Sách Công Ty', icon: Building2 },
      { to: '/financials', label: 'Báo Cáo Tài Chính', icon: FileText },
      { to: '/ratios', label: 'Chỉ Số Tài Chính', icon: Calculator },
      { to: '/normalization', label: 'Chuẩn Hóa Dữ Liệu', icon: CheckSquare },
    ],
  },
  {
    title: '🤖 RỦI RO & MÔ HÌNH AI',
    items: [
      { to: '/distress', label: 'Gán Nhãn Distress', icon: ShieldAlert },
      { to: '/ai-studio', label: 'AI/ML Studio', icon: Cpu },
      { to: '/prediction', label: 'Dự Báo Rủi Ro AI', icon: Sparkles },
      { to: '/profile', label: 'Hồ Sơ & Watchlist', icon: User },
      { to: '/settings', label: 'Cài Đặt Hệ Thống', icon: SettingsIcon },
    ],
  },
];

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { username, logout } = useAppStore();
  const [globalSearch, setGlobalSearch] = useState('');

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/companies?search=${encodeURIComponent(globalSearch.trim().toUpperCase())}`);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* ── Left Sidebar (Bright Modern Light Theme) ── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 shadow-sm z-20">
        {/* App Logo */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shadow-md shadow-indigo-200">
              FSD
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 font-mono">FSD TERMINAL</span>
              <span className="text-[10px] text-emerald-600 block font-semibold">AWS DATA LAKE PLATFORM</span>
            </div>
          </div>
        </div>

        {/* Global Quick Search Input */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleGlobalSearch} className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm mã cổ phiếu (FPT, VNM)..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg text-xs py-2 pl-9 pr-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono uppercase shadow-xs"
            />
          </form>
        </div>

        {/* Categorized Nav Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <BookOpen size={11} className="text-slate-400" />
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${isActive
                          ? 'bg-indigo-50 text-indigo-700 font-bold border-l-4 border-indigo-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border-l-4 border-transparent'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
              {username?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{username || 'Nhà Phân Tích'}</p>
              <p className="text-[10px] text-emerald-600 font-semibold truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online / Administrator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Đăng xuất"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main Canvas Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="h-13 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-2xs z-10">
          <div className="flex items-center gap-2.5 text-xs text-slate-600 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">AWS S3 DATA LAKE CONNECTION: ACTIVE</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {isCognitoConfigured ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AWS COGNITO: ONLINE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-mono font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                AUTH: LOCAL DEV MODE
              </span>
            )}
            <AuthButton />
            <span className="text-slate-500 font-mono hidden md:inline">
              <strong className="text-indigo-600 font-bold">FastAPI + Parquet Data Lake</strong>
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
