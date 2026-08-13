import React, { useState, useEffect } from 'react';
import { Calendar, Info, Search, Building2 } from 'lucide-react';
import type { Company } from '@/types';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/input';

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
  const [inputTicker, setInputTicker] = useState(selectedTicker);
  // Default mode to 'input' as requested by user
  const [mode, setMode] = useState<'input' | 'select'>('input');

  // Popular quick tickers for fast 1-click switching
  const quickTickers = ['FPT', 'VNM', 'VCB', 'HPG', 'VPB'];

  useEffect(() => {
    setInputTicker(selectedTicker);
  }, [selectedTicker]);

  const handleCustomTickerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputTicker.trim()) {
      onSelectTicker(inputTicker.trim().toUpperCase());
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5 relative overflow-hidden transition-all">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 relative z-10">
        
        {/* ── Ticker Selection Control (Primary: Manual Input First) ── */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-sans flex items-center gap-1.5">
              <Building2 size={15} className="text-blue-600" />
              TRA CỨU MÃ CHỨNG KHOÁN
            </label>

            {/* Toggle Mode: Input First vs Select from DB */}
            <div className="flex items-center gap-1 text-[11px] font-sans">
              <button
                type="button"
                onClick={() => setMode('input')}
                className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  mode === 'input'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ✏️ Nhập tay
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setMode('select')}
                className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                  mode === 'select'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📋 Chọn từ DB ({companies.length})
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="skeleton h-10 w-full rounded-xl" />
          ) : mode === 'input' ? (
            <form onSubmit={handleCustomTickerSubmit} className="flex gap-2">
              <Input
                value={inputTicker}
                onChange={(e) => setInputTicker(e.target.value)}
                placeholder="Nhập mã chứng khoán (VD: FPT, VNM, HPG, SSI)..."
                inputSize="md"
                className="uppercase font-mono font-bold text-blue-700 placeholder:normal-case placeholder:font-sans placeholder:font-normal"
              />
              <button
                type="submit"
                className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 font-sans shadow-md shadow-blue-200"
              >
                <Search size={14} /> Tra cứu
              </button>
            </form>
          ) : (
            <Select
              value={selectedTicker}
              onChange={(e) => onSelectTicker(e.target.value)}
              inputSize="md"
              options={
                companies.length > 0
                  ? companies.map((c) => ({
                      value: c.ticker,
                      label: `${c.ticker} — ${c.name || 'N/A'}`,
                    }))
                  : [{ value: selectedTicker || 'FPT', label: selectedTicker || 'FPT' }]
              }
            />
          )}

          {/* Quick Ticker Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] text-slate-400 font-sans font-medium">Truy cập nhanh:</span>
            {quickTickers.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSelectTicker(t)}
                className={`text-[11px] px-2.5 py-0.5 rounded-md font-mono font-bold transition-all cursor-pointer ${
                  selectedTicker === t
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Date Filter Toggle (Positioned After/Right) ── */}
        <div className="flex items-center gap-2 lg:pb-7">
          <button
            type="button"
            onClick={onToggleFilter}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 shadow-2xs font-sans whitespace-nowrap cursor-pointer ${
              useFilter
                ? 'bg-blue-600 text-white border-transparent shadow-blue-200 hover:bg-blue-700'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Calendar size={15} className={useFilter ? 'text-white' : 'text-slate-400'} />
            {useFilter ? 'ĐANG BẬT LỌC NGÀY' : 'BỘ LỌC THỜI GIAN'}
          </button>
        </div>
      </div>

      {/* ── Date Filter Controls (Expanded Panel) ── */}
      {useFilter && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 font-sans">
          <Input
            label="TỪ NGÀY"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            inputSize="md"
            className="font-mono"
          />
          <Input
            label="ĐẾN NGÀY"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            inputSize="md"
            className="font-mono"
          />
          {new Date(startDate) > new Date(endDate) && (
            <p className="col-span-1 sm:col-span-2 text-xs text-rose-500 font-bold flex items-center gap-1">
              <Info size={14} /> Từ ngày phải nhỏ hơn hoặc bằng đến ngày.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
