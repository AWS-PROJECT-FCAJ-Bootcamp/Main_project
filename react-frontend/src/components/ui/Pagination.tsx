import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  siblingCount?: number;
  className?: string;
  showInfo?: boolean;
  showPageSize?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  siblingCount = 1,
  className = '',
  showInfo = true,
  showPageSize = true,
}) => {
  if (totalPages <= 0) return null;

  // Generate pagination range array with ellipsis logic
  const generatePageNumbers = (): (number | 'DOTS')[] => {
    const totalPageNumbers = siblingCount + 5; // siblingCount + firstPage + lastPage + currentPage + 2*DOTS

    // Case 1: If total pages is less than page numbers we want to show
    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    // Case 2: No left dots to show, but right dots to show
    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, 'DOTS', totalPages];
    }

    // Case 3: No right dots to show, but left dots to show
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [firstPageIndex, 'DOTS', ...rightRange];
    }

    // Case 4: Both left and right dots to show
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, 'DOTS', ...middleRange, 'DOTS', lastPageIndex];
    }

    return [];
  };

  const pages = generatePageNumbers();

  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : undefined;
  const endItem = totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : undefined;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 font-mono text-xs text-slate-600 ${className}`}
    >
      {/* Left Info & Page Size Selector */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 w-full sm:w-auto text-center sm:text-left">
        {showInfo && totalItems !== undefined && startItem !== undefined && endItem !== undefined ? (
          <span className="text-slate-600 font-medium">
            Hiển thị <strong className="text-indigo-700 font-bold">{startItem}</strong> -{' '}
            <strong className="text-indigo-700 font-bold">{endItem}</strong> trong tổng số{' '}
            <strong className="text-slate-900 font-extrabold">{totalItems.toLocaleString('vi-VN')}</strong> kết quả
          </span>
        ) : (
          <span className="text-slate-600 font-medium">
            Trang <strong className="text-indigo-700 font-bold">{currentPage}</strong> /{' '}
            <strong className="text-slate-900 font-extrabold">{totalPages}</strong>
          </span>
        )}

        {showPageSize && pageSize && onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <span className="text-slate-400">|</span>
            <span className="text-slate-500">Xem:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Navigation Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Trang đầu"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Trang trước"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs flex items-center gap-1 px-2"
        >
          <ChevronLeft size={16} />
          <span className="hidden md:inline font-sans text-xs font-semibold">Trước</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pages.map((page, idx) => {
            if (page === 'DOTS') {
              return (
                <span
                  key={`dots-${idx}`}
                  className="w-8 h-8 flex items-center justify-center text-slate-400"
                >
                  <MoreHorizontal size={14} />
                </span>
              );
            }

            const isCurrent = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                type="button"
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer shadow-xs flex items-center justify-center ${
                  isCurrent
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-extrabold shadow-indigo-200 shadow-sm border border-indigo-600 scale-105'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 hover:border-slate-300'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Trang sau"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs flex items-center gap-1 px-2"
        >
          <span className="hidden md:inline font-sans text-xs font-semibold">Sau</span>
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Trang cuối"
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-xs"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
