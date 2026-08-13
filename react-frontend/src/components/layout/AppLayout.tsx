import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CheckSquare,
  Calculator,
  FileSpreadsheet,
  LogOut,
  Database,
  Activity,
  Calendar,
  LineChart,
  BookOpen,
  Menu,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { SearchInput } from '@/components/ui/SearchInput';

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
    title: '📊 BẢNG ĐIỀU KHIỂN & CHỨC NĂNG',
    items: [
      { to: '/explorer', label: 'Cào & Nạp Dữ Liệu', icon: Database, badge: 'S3' },
      { to: '/tick-monitor', label: 'Bảng Giá & Dòng Tiền', icon: Activity, badge: 'Live' },
      { to: '/ohlcv', label: 'Lịch Sử Nến Giá', icon: Calendar },
      { to: '/charts', label: 'Biểu Đồ Kỹ Thuật', icon: LineChart, badge: 'Canvas' },
      { to: '/dataset', label: 'Xuất Tập Dữ Liệu', icon: FileSpreadsheet, badge: 'Parquet' },
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
    title: 'ℹ️ HỆ THỐNG & GIỚI THIỆU',
    items: [
      { to: '/about', label: 'Giới Thiệu Dự Án', icon: Info, badge: 'Info' },
    ],
  },
];

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { username, logout } = useAppStore();
  const [globalSearch, setGlobalSearch] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/companies?search=${encodeURIComponent(globalSearch.trim().toUpperCase())}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans relative">
      {/* ── Mobile Backdrop Overlay ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Left Sidebar (Responsive Drawer) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/90 backdrop-blur-2xl border-r border-slate-200 flex flex-col shadow-[4px_0_30px_rgba(0,0,0,0.03)] transform transition-transform duration-300 ease-out lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Logo Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between relative overflow-hidden bg-gradient-to-r from-blue-50/50 via-white to-white">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-slate-800 flex items-center justify-center font-black text-white shadow-md shadow-blue-300/40">
              FSD
            </div>
            <div>
              <span className="font-extrabold text-[15px] tracking-tight text-slate-900 font-mono">
                FSD TERMINAL
              </span>
              <span className="text-[10px] text-blue-600 block font-extrabold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                <Sparkles size={10} /> AWS Data Lake
              </span>
            </div>
          </div>

          {/* Close Menu Button (Mobile Only) */}
          <button
            type="button"
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Search */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/60">
          <form onSubmit={handleGlobalSearch}>
            <SearchInput
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onClear={() => setGlobalSearch('')}
              placeholder="Tìm mã cổ phiếu (FPT, VNM)..."
              inputSize="sm"
              variant="glass"
              className="uppercase font-mono font-bold text-xs"
            />
          </form>
        </div>

        {/* Categorized Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5 custom-scrollbar">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <h3 className="px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
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
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-50/90 text-blue-700 font-bold border-l-4 border-blue-600 shadow-2xs scale-[1.01]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-l-4 border-transparent'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={16} className="text-slate-500 group-hover:text-blue-600" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold border border-blue-200">
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

        {/* User Profile Footer */}
        <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-black text-blue-700 shadow-2xs">
              {username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{username || 'Nhà Phân Tích'}</p>
              <p className="text-[10px] text-emerald-600 font-bold truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Data Lake Connected
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Đăng xuất"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Main Canvas Content Area ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 w-full bg-slate-50">
        {/* Top Header */}
        <header className="h-14 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-2xs z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
