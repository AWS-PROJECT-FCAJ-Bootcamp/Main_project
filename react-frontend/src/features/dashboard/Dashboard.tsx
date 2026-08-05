import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import {
  TrendingUp, TrendingDown, BarChart2, Activity,
  Calendar, ChevronDown, ServerCrash, Info,
  Eye, EyeOff, Database, AlertTriangle,
  Layers,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Line,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { getCompanies, getPrices, apiClient } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { Company, PriceData } from '../../types';

const FALLBACK_COMPANIES: Company[] = [
  { ticker: 'FPT', name: 'CTCP FPT', exchange: 'HOSE', industry: 'Công nghệ thông tin', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VNM', name: 'CTCP Sữa Việt Nam', exchange: 'HOSE', industry: 'Thực phẩm & Đồ uống', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'HPG', name: 'CTCP Tập đoàn Hòa Phát', exchange: 'HOSE', industry: 'Thép & Vật liệu xây dựng', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'MWG', name: 'CTCP Đầu tư Thế Giới Di Động', exchange: 'HOSE', industry: 'Bán lẻ', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
];

const FALLBACK_PRICE_SERIES: Record<string, PriceData[]> = {
  FPT: Array.from({ length: 14 }, (_, index) => {
    const base = 115 + index * 1.8;
    return {
      ticker: 'FPT',
      trading_date: format(subDays(new Date(), 13 - index), 'yyyy-MM-dd'),
      close_price: Number(base.toFixed(2)),
      open_price: Number((base - 1.2).toFixed(2)),
      high_price: Number((base + 2.2).toFixed(2)),
      low_price: Number((base - 2.5).toFixed(2)),
      volume: 1250000 + index * 65000,
      ma20: Number((base - 0.8).toFixed(2)),
      rsi_14: 54 + index * 0.5,
    };
  }),
  VNM: Array.from({ length: 14 }, (_, index) => {
    const base = 73 + index * 0.6;
    return {
      ticker: 'VNM',
      trading_date: format(subDays(new Date(), 13 - index), 'yyyy-MM-dd'),
      close_price: Number(base.toFixed(2)),
      open_price: Number((base - 0.5).toFixed(2)),
      high_price: Number((base + 1.1).toFixed(2)),
      low_price: Number((base - 1.3).toFixed(2)),
      volume: 980000 + index * 42000,
      ma20: Number((base - 0.3).toFixed(2)),
      rsi_14: 49 + index * 0.3,
    };
  }),
};

// ── Skeleton
const MetricSkeleton = () => (
  <div className="metric-card space-y-3">
    <div className="skeleton h-3 w-24" />
    <div className="skeleton h-7 w-32" />
    <div className="skeleton h-3 w-16" />
  </div>
);

// ── Metric Card
interface MetricCardProps {
  label: string; value: string; delta?: number;
  icon: React.ReactNode; prefix?: string; accent?: string;
}
const MetricCard: React.FC<MetricCardProps> = ({ label, value, delta, icon, prefix, accent = 'text-indigo-600' }) => {
  const isPositive = delta !== undefined && delta >= 0;
  return (
    <div className="metric-card group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center ${accent} group-hover:bg-indigo-100 transition-colors`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">
        {prefix && <span className="text-slate-400 text-lg font-medium">{prefix}</span>}
        {value}
      </div>
      {delta !== undefined && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta > 0 ? '+' : ''}{delta.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} so với phiên trước
        </div>
      )}
    </div>
  );
};

// ── Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-600 mb-2">{format(new Date(label as string), 'dd/MM/yyyy')}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-bold text-slate-800">{entry.value?.toLocaleString('vi-VN')}</span>
        </div>
      ))}
    </div>
  );
};

// ── Ingestion Log Widget
const IngestionLogWidget: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['ingestion-summary'],
    queryFn: () => apiClient.get('/ingestion/summary') as Promise<any>,
    refetchInterval: 60_000,
  });

  if (isLoading) return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <div className="skeleton h-3 w-32" />
      <div className="skeleton h-7 w-24" />
      <div className="skeleton h-3 w-20" />
    </div>
  );

  const total = data?.total_symbols ?? 0;
  const userRecords = data?.user_records_fetched ?? 0;
  const storageMb = data?.storage_size_mb ?? 0;
  const lastCrawl = data?.last_crawl_at
    ? format(new Date(data.last_crawl_at), 'dd/MM/yyyy HH:mm')
    : 'Chưa có';

  const joinDate = user?.created_at
    ? format(new Date(user.created_at), 'dd/MM/yyyy')
    : '—';

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Database size={16} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Dữ liệu đã thu thập</h3>
          <p className="text-xs text-slate-500">Từ {joinDate} đến nay</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Công ty có dữ liệu</p>
          <p className="text-xl font-bold text-slate-900">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Records của bạn</p>
          <p className="text-xl font-bold text-indigo-700">{userRecords.toLocaleString()}</p>
        </div>
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Dung lượng storage</p>
          <p className="text-lg font-bold text-slate-700">{storageMb} MB</p>
        </div>
        <div className="bg-white/70 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Lần crawl gần nhất</p>
          <p className="text-xs font-semibold text-slate-700">{lastCrawl}</p>
        </div>
      </div>
    </div>
  );
};

// ── Distress Watchlist Widget
const DistressWatchlistWidget: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['distress-watchlist'],
    queryFn: () => apiClient.get('/distress') as Promise<any>,
    refetchInterval: 300_000,
  });

  if (isLoading) return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="skeleton h-4 w-40 mb-4" />
      {[1,2,3].map(i => <div key={i} className="skeleton h-8 mb-2" />)}
    </div>
  );

  const watchlist = data?.watchlist ?? [];

  if (watchlist.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          Cảnh báo Distress
        </h3>
        <p className="text-xs text-slate-400">Chưa có dữ liệu distress. Chạy pipeline để tính toán.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" />
          Top Doanh nghiệp Rủi ro cao
          <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
            {watchlist.filter((w: any) => w.distress_status === 'DISTRESS').length}
          </span>
        </h3>
      </div>
      <div className="divide-y divide-slate-50">
        {watchlist.slice(0, 5).map((item: any) => (
          <div key={item.symbol} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-800 text-sm">{item.symbol}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                item.distress_status === 'DISTRESS' ? 'bg-red-100 text-red-700' :
                item.distress_status === 'GREY' ? 'bg-amber-100 text-amber-700' :
                'bg-green-100 text-green-700'
              }`}>
                {item.distress_status}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-900">{item.distress_score}</div>
              <div className="text-xs text-slate-400">Score</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Dashboard
export const Dashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [useFilter, setUseFilter] = useState(false);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showChart, setShowChart] = useState(true);
  const [showTable, setShowTable] = useState(false);

  const { data: companiesData, isLoading: isLoadingCompanies, isError: isErrorCompanies } =
    useQuery({ queryKey: ['companies'], queryFn: () => getCompanies(100) });

  const companies: Company[] = companiesData?.data ?? FALLBACK_COMPANIES;

  useEffect(() => {
    if (companies.length > 0 && !selectedTicker) setSelectedTicker(companies[0].ticker);
  }, [companies, selectedTicker]);

  const { data: pricesData, isLoading: isLoadingPrices, isError: isErrorPrices } = useQuery({
    queryKey: ['prices', selectedTicker, useFilter ? startDate : undefined, useFilter ? endDate : undefined],
    queryFn: () => getPrices(selectedTicker, useFilter ? startDate : undefined, useFilter ? endDate : undefined, 1000),
    enabled: !!selectedTicker,
    staleTime: 30_000,
  });

  const prices: PriceData[] = pricesData?.data ?? FALLBACK_PRICE_SERIES[selectedTicker] ?? FALLBACK_PRICE_SERIES.FPT;
  const latest = prices.at(-1);
  const prev = prices.at(-2);
  const priceDiff = latest && prev ? latest.close_price - prev.close_price : 0;

  const usingFallbackCompanies = isErrorCompanies || !companiesData?.data;
  const usingFallbackPrices = isErrorPrices || !pricesData?.data;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Xin chào{user?.full_name ? `, ${user.full_name}` : ''}! 👋
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Financial Distress Analysis Platform — {format(new Date(), 'dd/MM/yyyy')}
          </p>
          {(usingFallbackCompanies || usingFallbackPrices) && (
            <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              <ServerCrash size={12} /> Demo mode: đang dùng dữ liệu dự phòng cục bộ vì backend chưa sẵn sàng.
            </p>
          )}
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
          user?.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {user?.role === 'admin' ? '🔑 Admin' : '👤 Guest'}
        </span>
      </div>

      {/* Top row: Ingestion Log + Distress Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IngestionLogWidget />
        <DistressWatchlistWidget />
      </div>

      {/* Market Data Explorer */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Layers size={14} className="text-indigo-500" />
            Dữ liệu Giá Thị Trường
          </h2>
        </div>

        {/* Controls */}
        <div className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mã chứng khoán</label>
              {isLoadingCompanies ? (
                <div className="skeleton h-10 w-full" />
              ) : (
                <div className="relative">
                  <select
                    id="dashboard-ticker-select"
                    className="input-field appearance-none pr-9 cursor-pointer"
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                  >
                    {companies.map((c) => (
                      <option key={c.ticker} value={c.ticker}>{c.ticker} — {c.name || 'N/A'}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pb-1">
              <button
                id="dashboard-date-filter-toggle"
                onClick={() => setUseFilter((p) => !p)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${
                  useFilter ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Calendar size={14} />
                {useFilter ? 'Lọc ngày: Bật' : 'Lọc theo ngày'}
              </button>
            </div>
          </div>

          {useFilter && (
            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Từ ngày</label>
                <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500">Đến ngày</label>
                <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              {new Date(startDate) > new Date(endDate) && (
                <p className="col-span-2 text-xs text-red-500 font-medium flex items-center gap-1">
                  <Info size={12} /> Từ ngày phải nhỏ hơn hoặc bằng đến ngày.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Metrics */}
        {isLoadingPrices && !usingFallbackPrices ? (
          <div className="px-5 pb-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <MetricSkeleton key={i} />)}
          </div>
        ) : prices.length === 0 && !isLoadingCompanies && companies.length === 0 ? (
          <div className="px-5 pb-5">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-600 flex items-center gap-2">
              <Info size={16} /> Chưa có dữ liệu. Hãy chạy ingestion trong <strong className="mx-1">Data Explorer</strong> trước.
            </div>
          </div>
        ) : prices.length > 0 ? (
          <>
            <div className="px-5 pb-5 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Giá đóng cửa" value={latest?.close_price.toLocaleString('vi-VN') ?? '—'} delta={priceDiff} icon={<TrendingUp size={15} />} />
              <MetricCard label="Khối lượng" value={latest?.volume.toLocaleString('vi-VN') ?? '—'} icon={<BarChart2 size={15} />} />
              <MetricCard label="MA 20" value={latest?.ma20 != null ? latest.ma20.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : 'N/A'} icon={<Activity size={15} />} />
              <MetricCard label="RSI 14" value={latest?.rsi_14 != null ? latest.rsi_14.toFixed(2) : 'N/A'} icon={<Activity size={15} />} />
            </div>

            {/* Chart */}
            <div className="mx-5 mb-5 bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Biểu đồ giá — {selectedTicker}</h2>
                <button onClick={() => setShowChart((p) => !p)} className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  {showChart ? <><EyeOff size={13} /> Ẩn</> : <><Eye size={13} /> Hiện</>}
                </button>
              </div>
              {showChart && (
                <div className="p-5 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={prices} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="trading_date" tickFormatter={(v) => format(new Date(v), 'dd/MM')} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
                      <Area type="monotone" dataKey="close_price" name="Close Price" stroke="#6366f1" strokeWidth={2} fill="url(#colorClose)" dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="ma20" name="MA20" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Data Table */}
            <div className="mx-5 mb-5 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setShowTable((p) => !p)} className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                <span>Dữ liệu Curated ({prices.length} dòng)</span>
                <ChevronDown size={15} className={`text-slate-400 transition-transform ${showTable ? 'rotate-180' : ''}`} />
              </button>
              {showTable && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        {['Ngày', 'Mở cửa', 'Cao', 'Thấp', 'Đóng cửa', 'KL', 'MA20', 'RSI'].map((h) => (
                          <th key={h} className="table-header whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {prices.slice(-30).reverse().map((p, i) => (
                        <tr key={i} className="table-row">
                          <td className="table-cell font-medium">{format(new Date(p.trading_date), 'dd/MM/yyyy')}</td>
                          <td className="table-cell text-right">{p.open_price.toLocaleString('vi-VN')}</td>
                          <td className="table-cell text-right text-emerald-600">{p.high_price.toLocaleString('vi-VN')}</td>
                          <td className="table-cell text-right text-red-500">{p.low_price.toLocaleString('vi-VN')}</td>
                          <td className="table-cell text-right font-semibold">{p.close_price.toLocaleString('vi-VN')}</td>
                          <td className="table-cell text-right">{p.volume.toLocaleString('vi-VN')}</td>
                          <td className="table-cell text-right text-amber-600">{p.ma20?.toFixed(0) ?? '—'}</td>
                          <td className="table-cell text-right">{p.rsi_14?.toFixed(2) ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-5 py-3 bg-slate-50 border-t text-xs text-slate-400 text-center">Hiển thị 30 phiên gần nhất</div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
