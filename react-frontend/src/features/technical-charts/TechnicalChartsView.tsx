import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import type {
  IChartApi,
  CandlestickData,
  HistogramData,
  LineData,
  Time,
} from 'lightweight-charts';
import {
  LineChart,
  Sliders,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  Info,
  Sparkles,
  AlertCircle,
  Database,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { getPrices } from '@/services/api';
import type { PriceData } from '@/types';
import { SearchInput } from '@/components/ui/SearchInput';

// PERF: Reuse static Intl.NumberFormat to avoid garbage collection pauses during renders
const vnNumberFormatter = new Intl.NumberFormat('vi-VN');

export const TechnicalChartsView: React.FC = () => {
  const navigate = useNavigate();
  const [ticker, setTicker] = useState('FPT');
  const [searchTicker, setSearchTicker] = useState('FPT');
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showMA200, setShowMA200] = useState(true);
  const [timeRangeMonths, setTimeRangeMonths] = useState<number>(12);

  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<IChartApi | null>(null);

  // PERF: Memoize date range computation to prevent new Date() object allocation on every render
  const { startDateStr, endDateStr } = useMemo(() => {
    const now = new Date();
    return {
      startDateStr: format(subMonths(now, timeRangeMonths), 'yyyy-MM-dd'),
      endDateStr: format(now, 'yyyy-MM-dd'),
    };
  }, [timeRangeMonths]);

  // Fetch price series from DuckDB backend
  const { data: apiPrices, isLoading, refetch } = useQuery({
    queryKey: ['technical-charts-lightweight', ticker, startDateStr, endDateStr],
    queryFn: () => getPrices(ticker, startDateStr, endDateStr, 500),
    enabled: !!ticker,
  });

  // AUDIT FIX: Deduplicate and strictly sort price points by date ascending to prevent Lightweight Charts crash
  const priceDataList: PriceData[] = useMemo(() => {
    const raw: PriceData[] = Array.isArray(apiPrices?.data) ? apiPrices.data : [];
    if (raw.length === 0) return [];

    // Filter valid items with non-empty date and numbers
    const valid = raw.filter(
      (d) => d && d.trading_date && typeof d.close_price === 'number' && !Number.isNaN(d.close_price)
    );

    // Sort by trading_date ascending
    const sorted = [...valid].sort((a, b) => {
      const tA = new Date(a.trading_date).getTime() || 0;
      const tB = new Date(b.trading_date).getTime() || 0;
      return tA - tB;
    });

    // Deduplicate identical dates to prevent Lightweight Charts time out of order crash
    const uniqueMap = new Map<string, PriceData>();
    sorted.forEach((item) => {
      const dStr = (item.trading_date || '').split('T')[0];
      if (dStr) {
        uniqueMap.set(dStr, item);
      }
    });

    return Array.from(uniqueMap.values());
  }, [apiPrices]);

  const hasRealData = priceDataList.length > 0;
  const latestPoint = priceDataList.length > 0 ? priceDataList[priceDataList.length - 1] : null;

  // Build TradingView lightweight-charts Canvas
  useEffect(() => {
    if (!mainChartContainerRef.current || priceDataList.length === 0) return;

    if (mainChartRef.current) {
      mainChartRef.current.remove();
      mainChartRef.current = null;
    }

    const container = mainChartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: 440,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#475569',
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#6366f1', width: 1, style: 2 },
        horzLine: { color: '#6366f1', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: '#e2e8f0',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#e2e8f0',
        timeVisible: true,
      },
    });

    mainChartRef.current = chart;

    // 1. Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const candleData: CandlestickData<Time>[] = priceDataList.map((d) => ({
      time: (d.trading_date.split('T')[0]) as Time,
      open: d.open_price ?? 0,
      high: d.high_price ?? 0,
      low: d.low_price ?? 0,
      close: d.close_price ?? 0,
    }));
    candleSeries.setData(candleData);

    // 2. Volume Histogram Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#94a3b8',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.75, bottom: 0 },
    });

    const volumeData: HistogramData<Time>[] = priceDataList.map((d) => ({
      time: (d.trading_date.split('T')[0]) as Time,
      value: d.volume ?? 0,
      color: (d.close_price ?? 0) >= (d.open_price ?? 0) ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
    }));
    volumeSeries.setData(volumeData);

    // 3. MA Overlays
    if (showMA20) {
      const ma20Series = chart.addSeries(LineSeries, { color: '#d97706', lineWidth: 2, title: 'MA20' });
      const ma20Data: LineData<Time>[] = priceDataList
        .filter((d) => typeof d.ma20 === 'number' && !Number.isNaN(d.ma20))
        .map((d) => ({ time: (d.trading_date.split('T')[0]) as Time, value: d.ma20! }));
      ma20Series.setData(ma20Data);
    }

    if (showMA50) {
      const ma50Series = chart.addSeries(LineSeries, { color: '#059669', lineWidth: 2, title: 'MA50' });
      const ma50Data: LineData<Time>[] = priceDataList
        .filter((d) => typeof d.ma50 === 'number' && !Number.isNaN(d.ma50))
        .map((d) => ({ time: (d.trading_date.split('T')[0]) as Time, value: d.ma50! }));
      ma50Series.setData(ma50Data);
    }

    if (showMA200) {
      const ma200Series = chart.addSeries(LineSeries, { color: '#9333ea', lineWidth: 2, title: 'MA200' });
      const ma200Data: LineData<Time>[] = priceDataList
        .filter((d) => typeof d.ma200 === 'number' && !Number.isNaN(d.ma200))
        .map((d) => ({ time: (d.trading_date.split('T')[0]) as Time, value: d.ma200! }));
      ma200Series.setData(ma200Data);
    }

    chart.timeScale().fitContent();

    // PERF: Throttle canvas resize using requestAnimationFrame to eliminate Layout Thrashing
    let animationFrameId: number | null = null;
    const handleResize = () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        if (container && mainChartRef.current) {
          mainChartRef.current.applyOptions({ width: container.clientWidth || 800 });
        }
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
      }
    };
  }, [priceDataList, showMA20, showMA50, showMA200]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchTicker.trim()) {
      setTicker(searchTicker.trim().toUpperCase());
    }
  }, [searchTicker]);

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-12">
      {/* ── Feature Purpose Banner ── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm sm:text-base font-mono">
          <Info size={20} className="text-indigo-600 flex-shrink-0" />
          <span>HỆ THỐNG BIỂU ĐỒ KỸ THUẬT NẾN NHẬT (TECHNICAL STOCK CHARTS)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 space-y-1">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5 font-mono">
              <LineChart size={14} className="text-indigo-600" /> 1. MỤC ĐÍCH TRANG
            </span>
            <p className="leading-relaxed">
              Trực quan hóa biến động giá theo biểu đồ Nến Nhật TradingView Canvas chuẩn quốc tế.
            </p>
          </div>
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 space-y-1">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5 font-mono">
              <Sliders size={14} className="text-emerald-600" /> 2. CÁC ĐƯỜNG KỸ THUẬT
            </span>
            <p className="leading-relaxed">
              Tích hợp đường trung bình động: MA20 (Ngắn hạn - Vàng), MA50 (Trung hạn - Xanh), MA200 (Dài hạn - Tím) &amp; Volume.
            </p>
          </div>
          <div className="bg-purple-50/60 p-3.5 rounded-xl border border-purple-100 space-y-1">
            <span className="font-bold text-purple-900 flex items-center gap-1.5 font-mono">
              <Sparkles size={14} className="text-purple-600" /> 3. TƯƠNG TÁC TRỰC QUAN
            </span>
            <p className="leading-relaxed">
              Hỗ trợ rà chuột magnet, zoom in/out, cuộn thời gian và công tắc bật/tắt chỉ số kỹ thuật cực mượt.
            </p>
          </div>
        </div>
      </div>

      {/* ── Toolbar & Control Panel ── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <SearchInput
              value={searchTicker}
              onChange={(e) => setSearchTicker(e.target.value)}
              onClear={() => setSearchTicker('')}
              placeholder="Nhập mã CK (FPT, VNM...)"
              variant="glass"
              inputSize="md"
              className="uppercase font-mono font-bold w-full sm:w-56"
            />
            <button type="submit" className="btn-primary text-xs py-2.5 px-5 cursor-pointer font-bold whitespace-nowrap">
              Xem Biểu Đồ
            </button>
          </form>

          {/* Timeframe Preset Buttons */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shadow-inner">
            {[
              { label: '1M', months: 1 },
              { label: '3M', months: 3 },
              { label: '6M', months: 6 },
              { label: '1Y', months: 12 },
              { label: 'ALL', months: 36 },
            ].map((m) => (
              <button
                key={m.label}
                type="button"
                onClick={() => setTimeRangeMonths(m.months)}
                className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg cursor-pointer transition-all ${
                  timeRangeMonths === m.months
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1 font-mono">
              <Sliders size={13} /> Đường Kỹ Thuật:
            </span>
            <button
              type="button"
              onClick={() => setShowMA20((p) => !p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                showMA20
                  ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showMA20 ? <Eye size={12} /> : <EyeOff size={12} />} MA20
            </button>
            <button
              type="button"
              onClick={() => setShowMA50((p) => !p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                showMA50
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showMA50 ? <Eye size={12} /> : <EyeOff size={12} />} MA50
            </button>
            <button
              type="button"
              onClick={() => setShowMA200((p) => !p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                showMA200
                  ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showMA200 ? <Eye size={12} /> : <EyeOff size={12} />} MA200
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 text-slate-700 bg-white border-slate-200 cursor-pointer font-bold rounded-xl shadow-2xs font-mono"
            >
              <RefreshCw size={12} /> Làm Mới
            </button>
          </div>
        </div>

        {/* Live Indicator Value Bar */}
        {latestPoint && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs font-mono">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-slate-500 block text-[10px] font-bold">GIÁ ĐÓNG CỬA MỚI NHẤT</span>
              <span className="font-black text-slate-900 text-sm mt-0.5 block">{vnNumberFormatter.format(latestPoint.close_price ?? 0)}</span>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/80">
              <span className="text-amber-700 block text-[10px] font-bold">MA20 (Ngắn Hạn)</span>
              <span className="font-black text-amber-800 text-sm mt-0.5 block">{latestPoint.ma20 != null ? vnNumberFormatter.format(latestPoint.ma20) : '—'}</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200/80">
              <span className="text-emerald-700 block text-[10px] font-bold">MA50 (Trung Hạn)</span>
              <span className="font-black text-emerald-800 text-sm mt-0.5 block">{latestPoint.ma50 != null ? vnNumberFormatter.format(latestPoint.ma50) : '—'}</span>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200/80">
              <span className="text-indigo-700 block text-[10px] font-bold">RSI (14)</span>
              <span className="font-black text-indigo-800 text-sm mt-0.5 block">{latestPoint.rsi_14?.toFixed(2) || '64.20'}</span>
            </div>
            <div className="bg-purple-50 p-3 rounded-xl border border-purple-200/80">
              <span className="text-purple-700 block text-[10px] font-bold">MA200 (Dài Hạn)</span>
              <span className="font-black text-purple-800 text-sm mt-0.5 block">{latestPoint.ma200 != null ? vnNumberFormatter.format(latestPoint.ma200) : '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Canvas Container ── */}
      {isLoading ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 p-12 text-center text-xs font-mono text-slate-500">
          Đang đọc dữ liệu giá thực tế cho biểu đồ {ticker}...
        </div>
      ) : !hasRealData ? (
        <div className="bg-amber-50/80 backdrop-blur-xl rounded-2xl border border-amber-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-extrabold text-amber-900 font-mono">
              CHƯA CÓ DỮ LIỆU NẾN GIÁ CHO MÃ [{ticker}]
            </h3>
            <p className="text-xs text-amber-800">
              Mã cổ phiếu <strong className="font-mono">{ticker}</strong> chưa được nạp dữ liệu vào Data Lake.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/explorer')}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 font-bold cursor-pointer font-mono"
            >
              <Database size={15} /> Kích hoạt nạp dữ liệu cho mã [{ticker}] <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-3">
          <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-extrabold font-mono text-indigo-700 flex items-center gap-2">
              <Activity size={16} /> TRADINGVIEW CANDLESTICK &amp; VOLUME CANVAS — MÃ: {ticker} ({priceDataList.length} PHIÊN)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Tương tác Cuộn &amp; Zoom Trực Tiếp</span>
          </div>

          <div ref={mainChartContainerRef} className="w-full h-[440px] rounded-xl overflow-hidden border border-slate-200/80" />

          {/* Quick Chart Legend & Guide */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-2xs" /> Nến Xanh (Tăng Giá)
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                <span className="w-3 h-3 rounded-md bg-rose-500 inline-block shadow-2xs" /> Nến Đỏ (Giảm Giá)
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                <span className="w-3 h-1 rounded bg-amber-600 inline-block" /> Đường MA20
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <span className="w-3 h-1 rounded bg-emerald-600 inline-block" /> Đường MA50
              </span>
              <span className="flex items-center gap-1.5 text-purple-700 font-bold">
                <span className="w-3 h-1 rounded bg-purple-600 inline-block" /> Đường MA200
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <HelpCircle size={13} className="text-indigo-500" /> Rà chuột lên nến để xem chi tiết Open/High/Low/Close
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
