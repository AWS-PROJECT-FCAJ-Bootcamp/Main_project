import React, { useMemo } from 'react';
import { SlidersHorizontal, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { IndustryOption } from '../api/useCompaniesFilterQuery';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';

interface CompanyFilterControlProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedExchange: string;
  onExchangeChange: (value: string) => void;
  selectedIndustry: string;
  onIndustryChange: (value: string) => void;
  industries: IndustryOption[];
  excludeFinancial: boolean;
  onToggleExcludeFinancial: () => void;
  filteredCount: number;
  totalRaw: number;
  financialCount: number;
}

const EXCHANGE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả sàn (HOSE, HNX, UPCOM)' },
  { value: 'HOSE', label: 'HOSE — Sở Giao dịch TP.HCM' },
  { value: 'HNX', label: 'HNX — Sở Giao dịch Hà Nội' },
  { value: 'UPCOM', label: 'UPCOM — Sàn ĐC Đại chúng' },
];

// PERF: Wrap in React.memo to isolate filter controls re-rendering
export const CompanyFilterControl: React.FC<CompanyFilterControlProps> = React.memo(({
  searchTerm,
  onSearchChange,
  selectedExchange,
  onExchangeChange,
  selectedIndustry,
  onIndustryChange,
  industries,
  excludeFinancial,
  onToggleExcludeFinancial,
  filteredCount,
  totalRaw,
  financialCount,
}) => {
  const industryOptions = useMemo(() => {
    return [
      { value: 'ALL', label: `Tất cả ngành nghề (${industries.length} ngành ICB)` },
      ...industries.map((ind) => ({ value: ind.value, label: ind.label })),
    ];
  }, [industries]);

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
          <SlidersHorizontal size={15} className="text-indigo-600" />
          BỘ LỌC DỮ LIỆU DOANH NGHIỆP NIÊM YẾT
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Hiển thị <strong className="text-indigo-700 font-extrabold">{filteredCount}</strong> / {totalRaw} mã
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search Input */}
        <SearchInput
          label="TÌM MÃ / TÊN CÔNG TY"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          placeholder="VD: FPT, VNM, Hòa Phát..."
          variant="glass"
          inputSize="md"
        />

        {/* Exchange Selector */}
        <Select
          label="SÀN NIÊM YẾT"
          value={selectedExchange}
          onChange={(e) => onExchangeChange(e.target.value)}
          variant="glass"
          inputSize="md"
          options={EXCHANGE_OPTIONS}
        />

        {/* Industry ICB Selector */}
        <Select
          label="NGÀNH NGHỀ (ICB TAXONOMY)"
          value={selectedIndustry}
          onChange={(e) => onIndustryChange(e.target.value)}
          variant="glass"
          inputSize="md"
          options={industryOptions}
        />
      </div>

      {/* Exclude Financial Toggle */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={excludeFinancial}
            onClick={onToggleExcludeFinancial}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              excludeFinancial ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                excludeFinancial ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Loại bỏ nhóm ngành Tài chính (Banks, Financial Services, Insurance)
            </span>
            <p className="text-[11px] text-slate-500">
              {excludeFinancial
                ? `Đang loại bỏ ${financialCount} doanh nghiệp tài chính khỏi bộ dữ liệu.`
                : 'Bao gồm cả doanh nghiệp tài chính (có thể gây méo chỉ số ROA, Debt Ratio).'}
            </p>
          </div>
        </div>

        {excludeFinancial ? (
          <span className="badge-green inline-flex items-center gap-1 self-start sm:self-auto font-mono text-[10px]">
            <CheckCircle2 size={11} /> ĐÃ BẬT LỌC CHUẨN AI
          </span>
        ) : (
          <span className="badge-red inline-flex items-center gap-1 self-start sm:self-auto font-mono text-[10px]">
            <AlertTriangle size={11} /> ĐANG CHỨA NGÀNH TÀI CHÍNH
          </span>
        )}
      </div>
    </div>
  );
});

CompanyFilterControl.displayName = 'CompanyFilterControl';
