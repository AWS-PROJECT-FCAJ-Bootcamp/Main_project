import React from 'react';
import { Building2, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Company } from '@/types';
import { Pagination } from '@/components/ui/Pagination';

interface CompanyTableProps {
  companies: Company[];
  filteredCount: number;
  startIndex: number;
  endIndex: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  totalPages: number;
  pageNumbers?: number[];
  onPageChange: (page: number) => void;
}

// PERF: Wrap in React.memo to prevent cascading re-renders when parent state changes unrelated to table data
export const CompanyTable: React.FC<CompanyTableProps> = React.memo(({
  companies,
  filteredCount,
  startIndex,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const safeCompanies = Array.isArray(companies) ? companies : [];

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_8px_40px_rgb(0,0,0,0.06)] space-y-0">
      <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/40 via-white to-white relative">
        <h2 className="text-sm sm:text-base font-extrabold text-slate-800 flex items-center gap-2.5 relative z-10">
          <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600 shadow-2xs">
            <Building2 size={18} />
          </div>
          <span>BẢNG DANH SÁCH DOANH NGHIỆP NIÊM YẾT</span>
          <span className="ml-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-mono font-extrabold border border-indigo-200">
            {(filteredCount || 0).toLocaleString('vi-VN')}
          </span>
        </h2>
      </div>

      {filteredCount === 0 || safeCompanies.length === 0 ? (
        <div className="py-16 text-center space-y-3 px-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Info size={24} />
          </div>
          <p className="text-sm font-bold text-slate-700">Không tìm thấy doanh nghiệp nào</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc sàn/ngành nghề.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center w-14">
                    STT
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Mã CK
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Tên Doanh Nghiệp
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Sàn Niêm Yết
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Ngành Nghề (ICB)
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Phân Loại Sectors
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">
                    Trạng Thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {safeCompanies.map((c, idx) => (
                  // AUDIT FIX: Guaranteed 100% unique key combination
                  <tr
                    key={c.ticker ? `${c.ticker}-${startIndex + idx}` : `comp-${startIndex + idx}`}
                    className="group hover:bg-indigo-50/40 transition-colors duration-150 relative"
                  >
                    <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-400 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {startIndex + idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-extrabold text-indigo-700 text-sm">
                      {c.ticker || '—'}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 text-xs sm:text-sm max-w-xs truncate">
                      {c.name || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider font-mono ${
                          c.exchange === 'HOSE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                            : c.exchange === 'HNX'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                        }`}
                      >
                        {c.exchange || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">
                      {c.industry || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {c.is_financial ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs uppercase tracking-wider">
                          <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" /> Tài
                          chính
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs uppercase tracking-wider">
                          <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" /> Phi tài
                          chính
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium">
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-extrabold shadow-2xs font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{' '}
                        {c.status || 'LISTED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Integrated Reusable Pagination */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 sm:px-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
              totalItems={filteredCount}
              pageSize={pageSize}
              onPageSizeChange={onPageSizeChange}
              showInfo={true}
              showPageSize={true}
            />
          </div>
        </>
      )}
    </div>
  );
});

CompanyTable.displayName = 'CompanyTable';
