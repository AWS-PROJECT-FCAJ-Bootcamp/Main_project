import React from 'react';
import { SlidersHorizontal, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { IndustryOption } from '../api/useCompaniesFilterQuery';

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

export const CompanyFilterControl: React.FC<CompanyFilterControlProps> = ({
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
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <SlidersHorizontal size={15} className="text-indigo-600" />
          Bộ lọc doanh nghiệp
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Hiển thị {filteredCount} / {totalRaw} mã
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tìm mã / tên công ty</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="VD: FPT, VNM, Hòa Phát..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input-field pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sàn niêm yết</label>
          <select
            value={selectedExchange}
            onChange={(e) => onExchangeChange(e.target.value)}
            className="input-field cursor-pointer"
          >
            <option value="ALL">Tất cả sàn (HOSE, HNX, UPCOM)</option>
            <option value="HOSE">HOSE — Sở Giao dịch TP.HCM</option>
            <option value="HNX">HNX — Sở Giao dịch Hà Nội</option>
            <option value="UPCOM">UPCOM — Sàn Thị trường Công ty đại chúng</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ngành nghề (ICB Taxonomy)</label>
          <select
            value={selectedIndustry}
            onChange={(e) => onIndustryChange(e.target.value)}
            className="input-field cursor-pointer font-sans"
          >
            <option value="ALL">Tất cả ngành nghề ({industries.length} ngành chuẩn ICB)</option>
            {industries.map((ind) => (
              <option key={ind.value} value={ind.value}>{ind.label}</option>
            ))}
          </select>
        </div>
      </div>

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
            <span className="text-sm font-semibold text-slate-800">
              Loại bỏ nhóm ngành Tài chính (Banks, Financial Services, Insurance)
            </span>
            <p className="text-xs text-slate-400">
              {excludeFinancial
                ? `Đang loại bỏ ${financialCount} doanh nghiệp tài chính khỏi bộ dữ liệu.`
                : 'Bao gồm cả doanh nghiệp tài chính (có thể gây méo chỉ số ROA, Debt Ratio).'}
            </p>
          </div>
        </div>

        {excludeFinancial ? (
          <span className="badge-green inline-flex items-center gap-1 self-start sm:self-auto">
            <CheckCircle2 size={11} /> Đã bật lọc chuẩn AI
          </span>
        ) : (
          <span className="badge-amber inline-flex items-center gap-1 self-start sm:self-auto">
            <AlertTriangle size={11} /> Đang chứa ngành Tài chính
          </span>
        )}
      </div>
    </div>
  );
};

