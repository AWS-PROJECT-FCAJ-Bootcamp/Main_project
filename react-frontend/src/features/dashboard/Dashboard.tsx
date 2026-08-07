import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { TrendingUp, BarChart2, Activity, ServerCrash, RefreshCw, Info } from 'lucide-react';
import { useCompaniesQuery } from './api/useCompaniesQuery';
import { usePricesQuery } from './api/usePricesQuery';
import { MetricCard } from './components/MetricCard';
import { DashboardChart } from './components/DashboardChart';
import { DashboardTable } from './components/DashboardTable';
import { DashboardControl } from './components/DashboardControl';

export const Dashboard: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState('');
  const [useFilter, setUseFilter] = useState(false);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 90), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: companies = [], isLoading: isLoadingCompanies, isError: isErrorCompanies, refetch } = useCompaniesQuery();

  useEffect(() => {
    if (companies.length > 0 && !selectedTicker) {
      setSelectedTicker(companies[0].ticker);
    }
  }, [companies, selectedTicker]);

  const { data: prices = [], isLoading: isLoadingPrices, isError: isErrorPrices } = usePricesQuery(
    selectedTicker,
    startDate,
    endDate,
    useFilter
  );

  const latest = prices.at(-1);
  const prev = prices.at(-2);
  const priceDiff = latest && prev ? latest.close_price - prev.close_price : 0;

  if (isErrorCompanies) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <ServerCrash size={28} className="text-red-400" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-slate-800">Không thể kết nối Backend</h3>
          <p className="text-sm text-slate-500 mt-1">Kiểm tra API Backend tại <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">http://localhost:8000</code></p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  if (!isLoadingCompanies && companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
          <Info size={28} className="text-amber-400" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-slate-800">Chưa có dữ liệu</h3>
          <p className="text-sm text-slate-500 mt-1">Hãy chạy ingestion trong <strong>Data Explorer</strong> trước.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Curated Market Data — FastAPI → DuckDB → Parquet</p>
      </div>

      <DashboardControl
        companies={companies}
        selectedTicker={selectedTicker}
        onSelectTicker={setSelectedTicker}
        useFilter={useFilter}
        onToggleFilter={() => setUseFilter((p) => !p)}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        isLoading={isLoadingCompanies}
      />

      {isLoadingPrices ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="metric-card space-y-3">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-7 w-32" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
      ) : isErrorPrices ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 flex items-center gap-2">
          <ServerCrash size={16} /> Không thể tải dữ liệu giá. Vui lòng thử lại.
        </div>
      ) : prices.length === 0 ? (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-600 flex items-center gap-2">
          <Info size={16} /> Không có dữ liệu trong khoảng thời gian này.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Giá đóng cửa" value={latest?.close_price?.toLocaleString('vi-VN') ?? '—'} delta={priceDiff} icon={<TrendingUp size={15} />} />
            <MetricCard label="Khối lượng" value={latest?.volume?.toLocaleString('vi-VN') ?? '—'} icon={<BarChart2 size={15} />} />
            <MetricCard label="MA 20" value={latest?.ma20 != null ? latest.ma20.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : 'N/A'} icon={<Activity size={15} />} />
            <MetricCard label="RSI 14" value={latest?.rsi_14 != null ? latest.rsi_14.toFixed(2) : 'N/A'} icon={<Activity size={15} />} />
          </div>

          <DashboardChart ticker={selectedTicker} prices={prices} isLoading={isLoadingPrices} />
          <DashboardTable prices={prices} />
        </>
      )}
    </div>
  );
};

export default Dashboard;
