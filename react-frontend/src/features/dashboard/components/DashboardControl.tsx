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
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mã chứng khoán</label>
          {isLoading ? (
            <div className="skeleton h-10 w-full" />
          ) : (
            <div className="relative">
              <select
                className="input-field appearance-none pr-9 cursor-pointer"
                value={selectedTicker}
                onChange={(e) => onSelectTicker(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c.ticker} value={c.ticker}>
                    {c.ticker} — {c.name || 'N/A'}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pb-1">
          <button
            onClick={onToggleFilter}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
              useFilter
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
