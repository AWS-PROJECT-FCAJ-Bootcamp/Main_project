import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, FileText, CheckSquare, Calculator, FileSpreadsheet,
  LogOut, Database, Activity, Calendar, LineChart,
  Search, BookOpen, Menu, X
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
    <div className="flex h-screen bg-slate-50/50 text-slate-900 overflow-hidden font-sans relative">
      {/* ── Mobile Menu Overlay ── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Left Sidebar (Responsive) ── */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white/70 backdrop-blur-3xl border-r border-slate-200/60 flex flex-col shadow-[4px_0_24px_rgb(0,0,0,0.02)] transform transition-all duration-300 ease-out lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Logo */}
        <div className="p-5 border-b border-slate-200/60 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-black text-white shadow-[0_4px_12px_rgb(79,70,229,0.3)]">
              FSD
            </div>
            <div>
              <span className="font-extrabold text-[15px] tracking-tight text-slate-900 font-mono">FSD TERMINAL</span>
              <span className="text-[10px] text-indigo-600/80 block font-bold uppercase tracking-widest mt-0.5">AWS Data Lake</span>
            </div>
          </div>
          {/* Close Menu Button (Mobile Only) */}
          <button 
            className="lg:hidden p-1 text-slate-500 hover:bg-slate-100 rounded-md"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Global Quick Search Input */}
        <div className="p-3 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleGlobalSearch} className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã cổ phiếu (FPT, VNM)..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full h-10 bg-white/80 border border-slate-200/80 rounded-xl text-xs py-2 pl-9 pr-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono font-bold uppercase shadow-inner transition-all"
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
                      onClick={() => setIsMobileMenuOpen(false)}
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
                Online
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 w-full bg-gradient-to-br from-indigo-50/60 via-slate-50/80 to-blue-50/40">
        {/* Responsive Header */}
        <header className="h-14 bg-white/60 backdrop-blur-md border-b border-indigo-100/60 px-4 sm:px-6 flex items-center justify-between shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-md"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2.5 text-xs text-indigo-700 font-mono">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgb(99,102,241,0.6)]" />
              <span className="font-bold tracking-widest uppercase">AWS Data Lake</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

