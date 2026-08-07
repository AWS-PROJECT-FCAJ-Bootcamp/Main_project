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
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700 cursor-pointer"
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
                {companies.map((c, idx) => (
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
                        ● {c.status || 'LISTED'}
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
