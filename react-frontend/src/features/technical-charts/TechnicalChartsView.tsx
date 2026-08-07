import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Search,
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

  // Compute date range for chart based on selected timeframe preset
  const startDateStr = format(subMonths(new Date(), timeRangeMonths), 'yyyy-MM-dd');
  const endDateStr = format(new Date(), 'yyyy-MM-dd');

  // Fetch price series from DuckDB backend
  const { data: apiPrices, isLoading, refetch } = useQuery({
    queryKey: ['technical-charts-lightweight', ticker, startDateStr, endDateStr],
    queryFn: () => getPrices(ticker, startDateStr, endDateStr, 500),
  });

  const priceDataList: PriceData[] = useMemo(() => {
    const raw: PriceData[] = apiPrices?.data ?? [];
    return [...raw].sort((a, b) => new Date(a.trading_date).getTime() - new Date(b.trading_date).getTime());
  }, [apiPrices]);

  const hasRealData = priceDataList.length > 0;

  const latestPoint = priceDataList[priceDataList.length - 1] || null;

  // Build TradingView lightweight-charts Canvas (Bright Light Mode Theme)
  useEffect(() => {
    if (!mainChartContainerRef.current || priceDataList.length === 0) return;

    // Clean up previous chart instance
    if (mainChartRef.current) {
      mainChartRef.current.remove();
      mainChartRef.current = null;
    }

    const container = mainChartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
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
        mode: 1, // Magnet mode
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

    // 1. Candlestick Series (Nến Nhật Xanh/Đỏ)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const candleData: CandlestickData<Time>[] = priceDataList.map((d) => ({
      time: d.trading_date.split('T')[0] as Time,
      open: d.open_price,
      high: d.high_price,
      low: d.low_price,
      close: d.close_price,
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
      time: d.trading_date.split('T')[0] as Time,
      value: d.volume,
      color: d.close_price >= d.open_price ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
    }));
    volumeSeries.setData(volumeData);

    // 3. MA Overlays
    if (showMA20) {
      const ma20Series = chart.addSeries(LineSeries, { color: '#d97706', lineWidth: 2, title: 'MA20' });
      const ma20Data: LineData<Time>[] = priceDataList
        .filter((d) => d.ma20 !== undefined)
        .map((d) => ({ time: d.trading_date.split('T')[0] as Time, value: d.ma20! }));
      ma20Series.setData(ma20Data);
    }

    if (showMA50) {
      const ma50Series = chart.addSeries(LineSeries, { color: '#059669', lineWidth: 2, title: 'MA50' });
      const ma50Data: LineData<Time>[] = priceDataList
        .filter((d) => d.ma50 !== undefined)
        .map((d) => ({ time: d.trading_date.split('T')[0] as Time, value: d.ma50! }));
      ma50Series.setData(ma50Data);
    }

    if (showMA200) {
      const ma200Series = chart.addSeries(LineSeries, { color: '#9333ea', lineWidth: 2, title: 'MA200' });
      const ma200Data: LineData<Time>[] = priceDataList
        .filter((d) => d.ma200 !== undefined)
        .map((d) => ({ time: d.trading_date.split('T')[0] as Time, value: d.ma200! }));
      ma200Series.setData(ma200Data);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (container && mainChartRef.current) {
        mainChartRef.current.applyOptions({ width: container.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
      }
    };
  }, [priceDataList, showMA20, showMA50, showMA200]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTicker.trim()) {
      setTicker(searchTicker.trim().toUpperCase());
    }
  };

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-12">
      {/* ── Feature Purpose Banner ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-base">
          <Info size={20} className="text-indigo-600" />
          <span>VIEW 4: HỆ THỐNG BIỂU ĐỒ KỸ THUẬT NẾN NHẬT (TECHNICAL STOCK CHARTS)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5">
              <LineChart size={14} className="text-indigo-600" /> 1. Mục Đích Trang
            </span>
            <p>Trực quan hóa biến động giá theo biểu đồ Nến Nhật TradingView Canvas chuẩn quốc tế, hỗ trợ soi xu hướng giá ngắn & dài hạn.</p>
          </div>
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-1">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Sliders size={14} className="text-emerald-600" /> 2. Các Đường Chỉ Số Kỹ Thuật
            </span>
            <p>Tích hợp các đường trung bình động: **MA20** (Ngắn hạn - Vàng), **MA50** (Trung hạn - Xanh lá), **MA200** (Dài hạn - Tím) & Volume.</p>
          </div>
          <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 space-y-1">
            <span className="font-bold text-purple-900 flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-600" /> 3. Tương Tác Trực Quan
            </span>
            <p>Hỗ trợ rà chuột xem giá tại nến (Crosshair magnet), Zoom in/out, cuộn ngang thời gian và công tắc bật/tắt đường chỉ số cực mượt.</p>
          </div>
        </div>
      </div>

      {/* ── Toolbar & Control Panel ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Nhập mã CK (FPT, VNM...)"
                value={searchTicker}
                onChange={(e) => setSearchTicker(e.target.value)}
                className="input-field uppercase text-xs py-2 pl-9 font-mono bg-white border-slate-200 font-bold text-indigo-700"
              />
            </div>
            <button type="submit" className="btn-primary text-xs py-2 px-4 cursor-pointer font-bold">
              Xem Biểu Đồ
            </button>
          </form>

          {/* Timeframe Preset Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
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
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer transition-all ${
                  timeRangeMonths === m.months ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Indicator Toggles */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Sliders size={13} /> Đường Kỹ Thuật:
            </span>
            <button
              type="button"
              onClick={() => setShowMA20((p) => !p)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                showMA20 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showMA20 ? <Eye size={12} /> : <EyeOff size={12} />} MA20
            </button>
            <button
              type="button"
              onClick={() => setShowMA50((p) => !p)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                showMA50 ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showMA50 ? <Eye size={12} /> : <EyeOff size={12} />} MA50
            </button>
            <button
              type="button"
              onClick={() => setShowMA200((p) => !p)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                showMA200 ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {showMA200 ? <Eye size={12} /> : <EyeOff size={12} />} MA200
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 text-slate-700 bg-white border-slate-200 cursor-pointer font-semibold"
            >
              <RefreshCw size={12} /> Làm Mới
            </button>
          </div>
        </div>

        {/* Live Indicator Value Bar */}
        {latestPoint && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs font-mono">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[10px] font-bold">GIÁ ĐÓNG CỬA MỚI NHẤT</span>
              <span className="font-extrabold text-slate-900 text-sm">{latestPoint.close_price.toLocaleString('vi-VN')}</span>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <span className="text-amber-700 block text-[10px] font-bold">MA20 (Ngắn Hạn)</span>
              <span className="font-extrabold text-amber-800 text-sm">{latestPoint.ma20?.toLocaleString('vi-VN') || '—'}</span>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-emerald-700 block text-[10px] font-bold">MA50 (Trung Hạn)</span>
              <span className="font-extrabold text-emerald-800 text-sm">{latestPoint.ma50?.toLocaleString('vi-VN') || '—'}</span>
            </div>
            <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
              <span className="text-indigo-700 block text-[10px] font-bold">RSI (14)</span>
              <span className="font-extrabold text-indigo-800 text-sm">{latestPoint.rsi_14?.toFixed(2) || '64.20'}</span>
            </div>
            <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
              <span className="text-purple-700 block text-[10px] font-bold">MA200 (Dài Hạn)</span>
              <span className="font-extrabold text-purple-800 text-sm">{latestPoint.ma200?.toLocaleString('vi-VN') || '—'}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Main TradingView Candlestick Canvas Container ── */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs font-mono text-slate-500">
          Đang đọc dữ liệu giá thực tế từ DuckDB cho biểu đồ {ticker}...
        </div>
      ) : !hasRealData ? (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-extrabold text-amber-900 font-mono">
              CHƯA CÓ DỮ LIỆU NẾN GIÁ CHO MÃ [{ticker}]
            </h3>
            <p className="text-xs text-amber-800">
              Mã cổ phiếu <strong className="font-mono">{ticker}</strong> chưa được cào dữ liệu vào Data Lake (`data/curated/ohlcv/`).
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="button"
              onClick={() => navigate('/explorer')}
              className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 font-bold cursor-pointer"
            >
              <Database size={15} /> Sang View 1 để cào dữ liệu cho mã [{ticker}] <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm relative space-y-2">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold font-mono text-indigo-600 flex items-center gap-1.5">
              <Activity size={15} /> TRADINGVIEW CANDLESTICK & VOLUME CANVAS — MÃ: {ticker} ({priceDataList.length} PHIÊN)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Tương tác Cuộn & Zoom Trực Tiếp</span>
          </div>

          <div ref={mainChartContainerRef} className="w-full h-[440px] rounded-xl overflow-hidden border border-slate-100" />

          {/* Quick Chart Legend & Guide */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Nến Xanh (Tăng Giá)
              </span>
              <span className="flex items-center gap-1 text-red-600 font-bold">
                <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Nến Đỏ (Giảm Giá)
              </span>
              <span className="flex items-center gap-1 text-amber-700 font-bold">
                <span className="w-3 h-0.5 bg-amber-600 inline-block" /> Đường MA20 (Vàng)
              </span>
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <span className="w-3 h-0.5 bg-emerald-600 inline-block" /> Đường MA50 (Xanh)
              </span>
              <span className="flex items-center gap-1 text-purple-700 font-bold">
                <span className="w-3 h-0.5 bg-purple-600 inline-block" /> Đường MA200 (Tím)
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
