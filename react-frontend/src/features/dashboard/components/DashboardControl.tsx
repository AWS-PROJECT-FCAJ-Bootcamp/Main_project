import React from 'react';
import { Calendar, ChevronDown, Info } from 'lucide-react';
import type { Company } from '@/types';

interface DashboardControlProps {
  companies: Company[];
  selectedTicker: string;
  onSelectTicker: (ticker: string) => void;
  useFilter: boolean;
  onToggleFilter: () => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  isLoading: boolean;
}

export const DashboardControl: React.FC<DashboardControlProps> = ({
  companies,
  selectedTicker,
  onSelectTicker,
  useFilter,
  onToggleFilter,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isLoading,
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 space-y-5 relative overflow-hidden transition-all hover:shadow-[0_4px_24px_rgb(0,0,0,0.06)] hover:border-slate-300/60">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-transparent pointer-events-none" />
      <div className="flex flex-col sm:flex-row sm:items-end gap-5 relative z-10">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Mã chứng khoán</label>
          {isLoading ? (
            <div className="skeleton h-11 w-full rounded-xl" />
          ) : (
            <div className="relative group">
              <select
                className="w-full h-11 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm px-4 py-2 pr-10 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner appearance-none cursor-pointer"
                value={selectedTicker}
                onChange={(e) => onSelectTicker(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c.ticker} value={c.ticker}>
                    {c.ticker} — {c.name || 'N/A'}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pb-1">
          <button
            onClick={onToggleFilter}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all duration-300 shadow-sm ${
              useFilter
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-transparent shadow-[0_4px_12px_rgb(79,70,229,0.3)] hover:shadow-[0_4px_16px_rgb(79,70,229,0.4)] hover:-translate-y-0.5'
                : 'bg-white/80 text-slate-600 border-slate-200/80 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300/80'
            }`}
          >
            <Calendar size={16} className={useFilter ? 'text-indigo-100' : 'text-slate-400'} />
            {useFilter ? 'Đang bật lọc ngày' : 'Bộ lọc thời gian'}
          </button>
        </div>
      </div>

      {useFilter && (
        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">Từ ngày</label>
            <input type="date" className="input-field" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500">Đến ngày</label>
            <input type="date" className="input-field" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
          </div>
          {new Date(startDate) > new Date(endDate) && (
            <p className="col-span-2 text-xs text-red-500 font-medium flex items-center gap-1">
              <Info size={12} /> Từ ngày phải nhỏ hơn hoặc bằng đến ngày.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
