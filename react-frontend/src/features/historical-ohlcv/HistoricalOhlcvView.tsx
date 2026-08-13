import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, subMonths, subYears } from 'date-fns';
import {
  Calendar,
  ArrowUpDown,
  Info,
  Database,
  Sliders,
  FileSpreadsheet,
} from 'lucide-react';
import { getPrices } from '@/services/api';
import type { PriceData } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';
import { Pagination } from '@/components/ui/Pagination';

type DateRangePreset = '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

export const HistoricalOhlcvView: React.FC = () => {
  const [ticker, setTicker] = useState('FPT');
  const [searchTicker, setSearchTicker] = useState('FPT');
  const [activePreset, setActivePreset] = useState<DateRangePreset>('6M');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState<keyof PriceData>('trading_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Compute start date based on quick range preset
  const { startDateStr, endDateStr } = useMemo(() => {
    const end = new Date();
    let start = subMonths(end, 6);

    if (activePreset === '1W') start = subDays(end, 7);
    if (activePreset === '1M') start = subMonths(end, 1);
    if (activePreset === '3M') start = subMonths(end, 3);
    if (activePreset === '6M') start = subMonths(end, 6);
    if (activePreset === '1Y') start = subYears(end, 1);
    if (activePreset === 'YTD') start = new Date(end.getFullYear(), 0, 1);
    if (activePreset === 'ALL') start = subYears(end, 5);

    return {
      startDateStr: format(start, 'yyyy-MM-dd'),
      endDateStr: format(end, 'yyyy-MM-dd'),
    };
  }, [activePreset]);

  // Fetch prices query from backend API
  const { data: apiPrices, isLoading } = useQuery({
    queryKey: ['historical-ohlcv', ticker, startDateStr, endDateStr, page, pageSize],
    queryFn: () => getPrices(ticker, startDateStr, endDateStr, pageSize, page),
    enabled: !!ticker,
  });

  const rawList: PriceData[] = useMemo(() => apiPrices?.data ?? [], [apiPrices]);

  // Sorting
  const sortedList = useMemo(() => {
    const list = [...rawList];
    list.sort((a, b) => {
      let valA = a[sortField] ?? 0;
      let valB = b[sortField] ?? 0;
      if (typeof valA === 'string') valA = new Date(valA).getTime();
      if (typeof valB === 'string') valB = new Date(valB).getTime();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [rawList, sortField, sortOrder]);

  const totalRecords = (apiPrices?.data as any)?.total_records ?? sortedList.length ?? 0;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;

  const handleSort = (field: keyof PriceData) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTicker.trim()) {
      setTicker(searchTicker.trim().toUpperCase());
      setPage(1);
    }
  };

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-12">
      {/* ── Feature Purpose Banner ── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm sm:text-base font-mono">
          <Info size={20} className="text-indigo-600 flex-shrink-0" />
          <span>TRA CỨU BẢNG LỊCH SỬ NẾN GIÁ OHLCV (HISTORICAL OHLCV VIEWER)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-1">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5 font-mono">
              <Calendar size={14} className="text-indigo-600" /> 1. MỤC ĐÍCH TRANG
            </span>
            <p className="leading-relaxed">
              Tra cứu chi tiết toàn bộ bảng lịch sử nến giá cổ phiếu theo ngày: Mở cửa, Cao nhất, Thấp nhất, Đóng cửa và Khối lượng.
            </p>
          </div>
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 space-y-1">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5 font-mono">
              <Sliders size={14} className="text-emerald-600" /> 2. BỘ LỌC THỜI GIAN NHANH
            </span>
            <p className="leading-relaxed">
              Hỗ trợ mốc chọn thời gian nhanh (1W, 1M, 3M, 6M, 1Y, YTD, ALL) giúp bạn dễ dàng lọc chuỗi nến giá ngắn/dài hạn.
            </p>
          </div>
          <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100 space-y-1">
            <span className="font-bold text-purple-900 flex items-center gap-1.5 font-mono">
              <Database size={14} className="text-purple-600" /> 3. NGUỒN DỮ LIỆU THỰC TẾ
            </span>
            <p className="leading-relaxed">
              Truy vấn trực tiếp từ kho dữ liệu chuẩn hóa của Data Lake với tốc độ truy xuất tối ưu.
            </p>
          </div>
        </div>
      </div>

      {/* ── Toolbar Panel ── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <SearchInput
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              onClear={() => setSearchTicker('')}
              placeholder="Nhập mã CK (FPT, VNM...)"
              variant="glass"
              inputSize="md"
              className="uppercase font-mono font-bold w-full sm:w-60"
            />
            <button type="submit" className="btn-primary text-xs py-2.5 px-5 cursor-pointer font-bold whitespace-nowrap">
              Tra Cứu
            </button>
          </form>

          {/* Quick Date Range Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 font-mono uppercase tracking-wider">Mốc Thời Gian:</span>
            {(['1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'] as DateRangePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setActivePreset(preset);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  activePreset === preset
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-200 scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Data Table ── */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden space-y-0">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/40 via-white to-white">
          <h3 className="text-sm font-extrabold text-slate-900 font-mono flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-indigo-600" /> BẢNG GIÁ NẾN OHLCV — MÃ: {ticker} ({startDateStr} đến {endDateStr})
          </h3>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-mono">Đang tải lịch sử giá nến OHLCV từ hệ thống...</div>
        ) : sortedList.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 italic">Không tìm thấy bản ghi OHLCV nào cho mã {ticker}.</div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-white text-slate-600 font-mono border-b border-slate-200">
                    <th className="px-4 py-3.5 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('ticker')}>
                      <div className="flex items-center gap-1 font-bold">Mã CK <ArrowUpDown size={12} /></div>
                    </th>
                    <th className="px-4 py-3.5 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('trading_date')}>
                      <div className="flex items-center gap-1 font-bold">Ngày Giao Dịch <ArrowUpDown size={12} /></div>
                    </th>
                    <th className="px-4 py-3.5 text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('open_price')}>
                      <div className="flex items-center justify-end gap-1 font-bold">Mở Cửa <ArrowUpDown size={12} /></div>
                    </th>
                    <th className="px-4 py-3.5 text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('high_price')}>
                      <div className="flex items-center justify-end gap-1 font-bold">Cao Nhất <ArrowUpDown size={12} /></div>
                    </th>
                    <th className="px-4 py-3.5 text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('low_price')}>
                      <div className="flex items-center justify-end gap-1 font-bold">Thấp Nhất <ArrowUpDown size={12} /></div>
                    </th>
                    <th className="px-4 py-3.5 text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('close_price')}>
                      <div className="flex items-center justify-end gap-1 font-bold">Đóng Cửa <ArrowUpDown size={12} /></div>
                    </th>
                    <th className="px-4 py-3.5 text-right cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('volume')}>
                      <div className="flex items-center justify-end gap-1 font-bold">Khối Lượng <ArrowUpDown size={12} /></div>
                    </th>
                    <th className="px-4 py-3.5 text-center font-bold">Tăng/Giảm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {sortedList.map((row, idx) => {
                    const change = row.close_price - row.open_price;
                    const changePct = row.open_price ? ((change / row.open_price) * 100).toFixed(2) : '0.00';
                    const isUp = change >= 0;

                    return (
                      <tr key={idx} className="hover:bg-indigo-50/40 transition-colors duration-150">
                        <td className="px-4 py-3 font-extrabold text-indigo-700">{row.ticker}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{row.trading_date.split('T')[0]}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{row.open_price.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-bold">{row.high_price.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right text-rose-600 font-bold">{row.low_price.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-900">{row.close_price.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.volume.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isUp
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isUp ? '+' : ''}{changePct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 sm:px-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={totalRecords}
                pageSize={pageSize}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                showInfo={true}
                showPageSize={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
