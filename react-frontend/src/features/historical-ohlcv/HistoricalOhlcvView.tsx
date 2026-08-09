import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, subMonths, subYears } from 'date-fns';
import {
  Calendar,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Database,
  Sliders,
  FileSpreadsheet,
} from 'lucide-react';
import { getPrices } from '@/services/api';
import type { PriceData } from '@/types';

type DateRangePreset = '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

export const HistoricalOhlcvView: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [searchTicker, setSearchTicker] = useState('');
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
  const { data: apiPrices, isLoading, isError } = useQuery({
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-base">
          <Info size={20} className="text-indigo-600" />
          <span>TRA CỨU BẢNG LỊCH SỬ NẾN GIÁ OHLCV (HISTORICAL OHLCV VIEWER)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-600" /> 1. Mục Đích Trang
            </span>
            <p>Tra cứu chi tiết toàn bộ bảng lịch sử nến giá cổ phiếu theo ngày: Mở cửa, Cao nhất, Thấp nhất, Đóng cửa và Khối lượng giao dịch.</p>
          </div>
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-1">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Sliders size={14} className="text-emerald-600" /> 2. Bộ Lọc Thời Gian Nhanh
            </span>
            <p>Hỗ trợ các nút chọn mốc thời gian nhanh (`1W`, `1M`, `3M`, `6M`, `1Y`, `YTD`, `ALL`) giúp bạn dễ dàng truy vấn chuỗi lịch sử ngắn/dài hạn.</p>
          </div>
          <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 space-y-1">
            <span className="font-bold text-purple-900 flex items-center gap-1.5">
              <Database size={14} className="text-purple-600" /> 3. Nguồn Dữ Liệu Thực Tế
            </span>
            <p>Truy vấn trực tiếp từ kho dữ liệu chuẩn hóa của Data Lake với tốc độ xử lý tối ưu.</p>
          </div>
        </div>
      </div>

      {/* ── Toolbar Panel ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Nhập mã CK (FPT)..."
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value)}
                className="input-field uppercase text-xs py-2 font-mono bg-white border-slate-200"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <button type="submit" className="btn-primary text-xs py-2 px-4 cursor-pointer font-bold">
              Tra Cứu
            </button>
          </form>

          {/* Quick Date Range Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-2 font-mono">Mốc Thời Gian:</span>
            {(['1W', '1M', '3M', '6M', '1Y', 'YTD', 'ALL'] as DateRangePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setActivePreset(preset);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  activePreset === preset
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Data Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 font-mono flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-indigo-600" /> BẢNG GIÁ NẾN OHLCV — MÃ: {ticker} ({startDateStr} đến {endDateStr})
          </h3>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="input-field py-1 px-2 text-xs font-bold w-20 bg-white"
            >
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500 font-mono">Đang tải lịch sử giá nến OHLCV từ hệ thống...</div>
        ) : sortedList.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 italic">Không tìm thấy bản ghi OHLCV nào cho mã {ticker}.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200">
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-900" onClick={() => handleSort('ticker')}>
                    <div className="flex items-center gap-1">Mã CK <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-slate-900" onClick={() => handleSort('trading_date')}>
                    <div className="flex items-center gap-1">Ngày Giao Dịch <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('open_price')}>
                    <div className="flex items-center justify-end gap-1">Mở Cửa <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('high_price')}>
                    <div className="flex items-center justify-end gap-1">Cao Nhất <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('low_price')}>
                    <div className="flex items-center justify-end gap-1">Thấp Nhất <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('close_price')}>
                    <div className="flex items-center justify-end gap-1">Đóng Cửa <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-slate-900" onClick={() => handleSort('volume')}>
                    <div className="flex items-center justify-end gap-1">Khối Lượng <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="px-4 py-3 text-center">Tăng/Giảm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {sortedList.map((row, idx) => {
                  const change = row.close_price - row.open_price;
                  const changePct = row.open_price ? ((change / row.open_price) * 100).toFixed(2) : '0.00';
                  const isUp = change >= 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-extrabold text-indigo-600">{row.ticker}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{row.trading_date.split('T')[0]}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{row.open_price.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{row.high_price.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-right text-red-600 font-semibold">{row.low_price.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">{row.close_price.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.volume.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isUp ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
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
        )}

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-mono">
          <span className="text-slate-500">
            Trang <strong>{page}</strong> / {totalPages} (Tổng {sortedList.length} bản ghi)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary py-1 px-3 text-xs flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
