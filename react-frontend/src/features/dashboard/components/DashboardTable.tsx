import React, { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ChevronDown, Table as TableIcon } from 'lucide-react';
import type { PriceData } from '@/types';
import { Pagination } from '@/components/ui/Pagination';

interface DashboardTableProps {
  prices: PriceData[];
}

// PERF: Reuse static Intl.NumberFormat instance across renders to prevent garbage collection thrashing
const vnNumberFormatter = new Intl.NumberFormat('vi-VN');

// PERF: Helper date formatter with fallback safety
const formatDateSafe = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr.split('T')[0] || dateStr;
    return format(d, 'dd/MM/yyyy');
  } catch {
    return dateStr.split('T')[0] || dateStr;
  }
};

const formatNumSafe = (val?: number | null): string => {
  if (val == null || Number.isNaN(val)) return '—';
  return vnNumberFormatter.format(val);
};

const TABLE_HEADERS = ['Ngày', 'Mở cửa', 'Cao nhất', 'Thấp nhất', 'Đóng cửa', 'Khối lượng', 'MA20', 'RSI 14'];

export const DashboardTable: React.FC<DashboardTableProps> = React.memo(({ prices }) => {
  const [showTable, setShowTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const safePrices = useMemo(() => (Array.isArray(prices) ? prices : []), [prices]);

  const toggleShowTable = useCallback(() => {
    setShowTable((prev) => !prev);
  }, []);

  // PERF: Lazy compute reversedPrices ONLY when the table is expanded/visible
  const reversedPrices = useMemo(() => {
    if (!showTable || safePrices.length === 0) return [];
    return [...safePrices].reverse();
  }, [safePrices, showTable]);

  const totalRecords = safePrices.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  // PERF: Memoize active page slice calculation
  const currentSlice = useMemo(() => {
    if (!showTable || reversedPrices.length === 0) return [];
    const start = (currentPage - 1) * pageSize;
    return reversedPrices.slice(start, start + pageSize);
  }, [reversedPrices, currentPage, pageSize, showTable]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all">
      <button
        type="button"
        onClick={toggleShowTable}
        className="w-full flex items-center justify-between px-5 sm:px-6 py-4 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer font-mono"
      >
        <span className="flex items-center gap-2">
          <TableIcon size={16} className="text-indigo-600" />
          BẢNG DỮ LIỆU CURATED OHLCV ({totalRecords} DÒNG NẾN GIÁ)
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${
            showTable ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {showTable && (
        <div className="border-t border-slate-100">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-max border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/80">
                  {TABLE_HEADERS.map((h) => (
                    <th key={h} className="table-header whitespace-nowrap font-mono text-[11px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {currentSlice.map((p, i) => (
                  // AUDIT FIX: Combine trading_date and index for 100% guaranteed unique key
                  <tr key={p.trading_date ? `${p.trading_date}-${i}` : `row-${i}`} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {formatDateSafe(p.trading_date)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatNumSafe(p.open_price)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                      {formatNumSafe(p.high_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 font-bold">
                      {formatNumSafe(p.low_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      {formatNumSafe(p.close_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">
                      {formatNumSafe(p.volume)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600 font-bold">
                      {p.ma20 != null ? p.ma20.toFixed(0) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700">
                      {p.rsi_14 != null ? p.rsi_14.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reusable Pagination */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 sm:px-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalRecords}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              showInfo={true}
              showPageSize={true}
            />
          </div>
        </div>
      )}
    </div>
  );
});

DashboardTable.displayName = 'DashboardTable';
