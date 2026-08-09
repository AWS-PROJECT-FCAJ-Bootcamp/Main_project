import React from 'react';
import { Building2, Info, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Company } from '@/types';

interface CompanyTableProps {
  companies: Company[];
  filteredCount: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  pageNumbers: number[];
  onPageChange: (page: number) => void;
}

export const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  filteredCount,
  startIndex,
  endIndex,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  pageNumbers,
  onPageChange,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)]">
      <div className="px-6 py-5 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/50 to-white relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/30 to-transparent pointer-events-none" />
        <h2 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2.5 relative z-10">
          <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">
            <Building2 size={18} />
          </div>
          Bảng danh sách doanh nghiệp
          <span className="ml-2 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">{filteredCount}</span>
        </h2>
        <div className="flex items-center gap-4 text-xs text-slate-500 relative z-10">
          <span className="font-medium">
            Hiển thị <strong className="text-slate-800">{filteredCount > 0 ? startIndex + 1 : 0} - {endIndex}</strong> trên <strong className="text-slate-800">{filteredCount}</strong> dòng
          </span>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-lg p-1 border border-slate-200/80 shadow-inner">
            <span className="pl-2 font-semibold">Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-transparent border-none rounded focus:ring-0 px-2 py-1 text-xs font-bold text-indigo-700 cursor-pointer outline-none"
            >
              <option value={10}>10 dòng</option>
              <option value={15}>15 dòng</option>
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
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
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-white border-b-2 border-slate-200/80">
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center w-14">STT</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Mã CK</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Tên doanh nghiệp</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Sàn</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Ngành nghề</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Phân loại</th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {companies.map((c, idx) => (
                  <tr key={c.ticker} className="group hover:bg-indigo-50/40 transition-colors duration-200 relative">
                    <td className="px-4 py-3.5 text-center font-mono text-[11px] font-bold text-slate-400 relative">
                      {/* Left border highlight on hover */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {startIndex + idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-black text-indigo-700 text-sm">{c.ticker}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 text-[13px]">{c.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider ${
                        c.exchange === 'HOSE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-[0_2px_4px_rgb(16,185,129,0.1)]' :
                        c.exchange === 'HNX' ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-[0_2px_4px_rgb(59,130,246,0.1)]' :
                        'bg-slate-100 text-slate-700 border border-slate-200/60 shadow-sm'
                      }`}>
                        {c.exchange || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[13px] font-medium text-slate-600">{c.industry || '—'}</td>
                    <td className="px-4 py-3.5">
                      {c.is_financial ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 shadow-sm w-max uppercase tracking-wider">
                          <AlertTriangle size={12} className="text-amber-500" /> Tài chính
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm w-max uppercase tracking-wider">
                          <CheckCircle2 size={12} className="text-emerald-500" /> Phi tài chính
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium">
                      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-600 bg-emerald-50/80 border border-emerald-100 px-2.5 py-1 rounded-md font-bold shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {c.status || 'LISTED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Trang <span className="font-semibold text-slate-800">{currentPage}</span> / <span className="font-semibold text-slate-800">{totalPages}</span>
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition"
                  title="Trang đầu"
                >
                  <ChevronsLeft size={16} />
                </button>
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition"
                  title="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    className={`min-w-[32px] h-8 px-2.5 rounded-md text-xs font-semibold transition ${
                      currentPage === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition"
                  title="Trang sau"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition"
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
  );
};
