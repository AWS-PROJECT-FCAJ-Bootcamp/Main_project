import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { getCompanies } from '../../services/api';
import type { Company } from '../../types';

// Mock list of representative Vietnamese listed companies if backend dataset is not yet ingested
const DEFAULT_COMPANIES: Company[] = [
  { ticker: 'FPT', name: 'CTCP FPT', exchange: 'HOSE', industry: 'Công nghệ thông tin', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VNM', name: 'CTCP Sữa Việt Nam', exchange: 'HOSE', industry: 'Thực phẩm & Đồ uống', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'HPG', name: 'CTCP Tập đoàn Hòa Phát', exchange: 'HOSE', industry: 'Thép & Vật liệu xây dựng', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VCB', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', exchange: 'HOSE', industry: 'Ngân hàng', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'BID', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', exchange: 'HOSE', industry: 'Ngân hàng', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'SSI', name: 'CTCP Chứng khoán SSI', exchange: 'HOSE', industry: 'Dịch vụ Tài chính & Chứng khoán', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'BVH', name: 'Tập đoàn Bảo Việt', exchange: 'HOSE', industry: 'Bảo hiểm', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'MWG', name: 'CTCP Đầu tư Thế Giới Di Động', exchange: 'HOSE', industry: 'Bán lẻ', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VIC', name: 'Tập đoàn Vingroup - CTCP', exchange: 'HOSE', industry: 'Bất động sản', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VHM', name: 'CTCP Vinhomes', exchange: 'HOSE', industry: 'Bất động sản', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'MSN', name: 'CTCP Tập đoàn MaSan', exchange: 'HOSE', industry: 'Hàng tiêu dùng', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'REE', name: 'CTCP Cơ Điện Lạnh', exchange: 'HOSE', industry: 'Năng lượng & Cơ điện', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'BSR', name: 'CTCP Lọc hóa dầu Bình Sơn', exchange: 'UPCOM', industry: 'Dầu khí', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'ACV', name: 'Tổng công ty Cảng hàng không Việt Nam', exchange: 'UPCOM', industry: 'Vận tải & Cảng hàng không', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VND', name: 'CTCP Chứng khoán VNDIRECT', exchange: 'HNX', industry: 'Dịch vụ Tài chính & Chứng khoán', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', exchange: 'HNX', industry: 'Ngân hàng', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'PVS', name: 'Tổng CTCP Dịch vụ Kỹ thuật Dầu khí Việt Nam', exchange: 'HNX', industry: 'Dầu khí', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
];

export const CompanyList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [excludeFinancial, setExcludeFinancial] = useState<boolean>(true); // Default TRUE per spec

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Debounce search input by 300ms to optimize API requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ['companies', currentPage, pageSize, debouncedSearchTerm, selectedExchange, selectedIndustry, excludeFinancial],
    queryFn: () => getCompanies(currentPage, pageSize, debouncedSearchTerm, selectedExchange, selectedIndustry, excludeFinancial),
  });

  const rawCompanies: Company[] = useMemo(() => {
    const list = apiData?.data ?? [];
    if (list.length === 0 && !apiData) return DEFAULT_COMPANIES;
    return list.map((c: Company) => {
      const exchange = c.exchange || c.market || 'HOSE';
      const industry = c.industry || c.sector || 'Chưa phân loại';
      const ind = industry.toLowerCase();
      const isFin = c.is_financial ?? (
        ind.includes('ngân hàng') ||
        ind.includes('chứng khoán') ||
        ind.includes('bảo hiểm') ||
        ind.includes('tài chính') ||
        ind.includes('quỹ') ||
        ind.includes('bank') ||
        ind.includes('financial')
      );
      return {
        ...c,
        name: c.name || `CTCP ${c.ticker}`,
        exchange,
        industry,
        is_financial: isFin,
        sector: isFin ? 'Tài chính' : 'Phi tài chính',
        status: c.status || 'LISTED',
      };
    });
  }, [apiData]);

  // Unique industries list from current or default
  const industries = useMemo(() => {
    const set = new Set<string>([
      'Công nghệ thông tin', 'Thực phẩm & Đồ uống', 'Thép & Vật liệu xây dựng',
      'Ngân hàng', 'Dịch vụ Tài chính & Chứng khoán', 'Bảo hiểm', 'Bán lẻ',
      'Bất động sản', 'Hàng tiêu dùng', 'Năng lượng & Cơ điện', 'Dầu khí',
      'Vận tải & Cảng hàng không', 'Chemicals', 'Health Care', 'Utilities', 'Industrial Goods & Services'
    ]);
    rawCompanies.forEach((c) => {
      if (c.industry) set.add(c.industry);
    });
    return Array.from(set).sort();
  }, [rawCompanies]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedExchange, selectedIndustry, excludeFinancial, pageSize]);

  const totalRecords = apiData?.total_records ?? rawCompanies.length;
  const totalRaw = totalRecords;
  const financialCount = rawCompanies.filter((c) => c.is_financial).length;
  const filteredCount = totalRecords;
  const filteredCompanies = rawCompanies;

  // Server-side pagination calculation
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + filteredCompanies.length, totalRecords);
  const paginatedCompanies = filteredCompanies;

  // Generate page numbers for pagination bar
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Danh sách Doanh nghiệp Niêm yết</h1>
            <span className="badge-slate font-mono">Mục 4 — Bước 1</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý và lọc danh sách doanh nghiệp trên HOSE, HNX, UPCOM phục vụ thu thập dữ liệu & huấn luyện AI.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* ── Control Panel (Filters) ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <SlidersHorizontal size={15} className="text-indigo-600" />
            Bộ lọc doanh nghiệp
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Hiển thị {filteredCount} / {totalRaw} mã
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search bar */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tìm mã / tên công ty</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="VD: FPT, VNM, Hòa Phát..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-9"
              />
            </div>
          </div>

          {/* Exchange Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sàn niêm yết</label>
            <select
              value={selectedExchange}
              onChange={(e) => setSelectedExchange(e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="ALL">Tất cả sàn (HOSE, HNX, UPCOM)</option>
              <option value="HOSE">HOSE — Sở Giao dịch TP.HCM</option>
              <option value="HNX">HNX — Sở Giao dịch Hà Nội</option>
              <option value="UPCOM">UPCOM — Sàn Thị trường Công ty đại chúng</option>
            </select>
          </div>

          {/* Industry Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ngành nghề</label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="ALL">Tất cả ngành nghề ({industries.length} ngành)</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Financial Sector Exclusion Toggle Switch ── */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={excludeFinancial}
              onClick={() => setExcludeFinancial((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                excludeFinancial ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  excludeFinancial ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <span className="text-sm font-semibold text-slate-800">
                Loại bỏ nhóm ngành Tài chính (Ngân hàng, Chứng khoán, Bảo hiểm)
              </span>
              <p className="text-xs text-slate-400">
                {excludeFinancial
                  ? `Đang loại bỏ ${financialCount} doanh nghiệp tài chính khỏi bộ dữ liệu.`
                  : 'Bao gồm cả doanh nghiệp tài chính (có thể gây méo chỉ số ROA, Debt Ratio).'}
              </p>
            </div>
          </div>

          {excludeFinancial ? (
            <span className="badge-green inline-flex items-center gap-1 self-start sm:self-auto">
              <CheckCircle2 size={11} /> Đã bật lọc chuẩn AI
            </span>
          ) : (
            <span className="badge-amber inline-flex items-center gap-1 self-start sm:self-auto">
              <AlertTriangle size={11} /> Đang chứa ngành Tài chính
            </span>
          )}
        </div>
      </div>

      {/* ── Stats Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng mã khả dụng</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalRaw}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Kết quả sau lọc</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{filteredCount}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Ngành Tài chính bị lọc</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{excludeFinancial ? financialCount : 0}</p>
        </div>
        <div className="metric-card">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Đủ điều kiện Pipeline</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{filteredCount}</p>
        </div>
      </div>

      {/* ── Company Table ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Building2 size={16} className="text-indigo-500" />
            Bảng danh sách doanh nghiệp ({filteredCount})
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Hiển thị {filteredCount > 0 ? startIndex + 1 : 0} - {endIndex} trên {filteredCount} dòng
            </span>
            <div className="flex items-center gap-1.5">
              <span>Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={10}>10 dòng/trang</option>
                <option value={15}>15 dòng/trang</option>
                <option value={25}>25 dòng/trang</option>
                <option value={50}>50 dòng/trang</option>
                <option value={100}>100 dòng/trang</option>
              </select>
            </div>
          </div>
        </div>

        {filteredCount === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Info size={32} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Không tìm thấy doanh nghiệp nào</p>
            <p className="text-xs text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc sàn/ngành.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header text-center w-14">STT</th>
                    <th className="table-header">Mã CK</th>
                    <th className="table-header">Tên doanh nghiệp</th>
                    <th className="table-header">Sàn</th>
                    <th className="table-header">Ngành nghề</th>
                    <th className="table-header">Phân loại</th>
                    <th className="table-header text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCompanies.map((c, idx) => (
                    <tr key={c.ticker} className="table-row">
                      <td className="table-cell text-center font-mono text-xs font-semibold text-slate-400">
                        {startIndex + idx + 1}
                      </td>
                      <td className="table-cell font-mono font-bold text-indigo-700">{c.ticker}</td>
                      <td className="table-cell font-medium text-slate-800">{c.name}</td>
                      <td className="table-cell">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          c.exchange === 'HOSE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.exchange === 'HNX' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {c.exchange || 'N/A'}
                        </span>
                      </td>
                      <td className="table-cell text-slate-600">{c.industry || '—'}</td>
                      <td className="table-cell">
                        {c.is_financial ? (
                          <span className="badge-amber flex items-center gap-1 w-max">
                            <AlertTriangle size={10} /> Tài chính
                          </span>
                        ) : (
                          <span className="badge-green flex items-center gap-1 w-max">
                            <CheckCircle2 size={10} /> Phi tài chính
                          </span>
                        )}
                      </td>
                      <td className="table-cell text-right font-medium">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                          ● {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination Bar Footer ── */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Trang <span className="font-semibold text-slate-800">{currentPage}</span> / <span className="font-semibold text-slate-800">{totalPages}</span>
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Trang đầu"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-[32px] h-8 px-2.5 rounded-md text-xs font-semibold transition ${
                        currentPage === p
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Trang cuối"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
