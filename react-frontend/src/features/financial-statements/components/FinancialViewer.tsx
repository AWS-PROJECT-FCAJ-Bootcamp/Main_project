import React, { useState, useMemo, useEffect } from 'react';
import { Building2, PieChart, TrendingUp, DollarSign, Loader2, Search } from 'lucide-react';
import { useFinancialReportQuery } from '../api/useFinancialReportQuery';
import type { Company, FinancialStatementItem } from '@/types';

interface FinancialViewerProps {
  companies: Company[];
}

export const FinancialViewer: React.FC<FinancialViewerProps> = ({ companies }) => {
  const [inputTicker, setInputTicker] = useState('');
  const [committedTicker, setCommittedTicker] = useState('');
  const [reportSubTab, setReportSubTab] = useState<'BS' | 'IS' | 'CF'>('BS');
  const [periodType, setPeriodType] = useState<'YEARLY' | 'QUARTERLY'>('YEARLY');


  useEffect(() => {
    const t = setTimeout(() => {
      const clean = inputTicker.trim().toUpperCase();
      if (clean.length >= 2) setCommittedTicker(clean);
    }, 600);
    return () => clearTimeout(t);
  }, [inputTicker]);


  const { data: currentReport, isLoading: isLoadingReport } = useFinancialReportQuery(committedTicker, periodType);

  const activeItems: FinancialStatementItem[] = useMemo(() => {
    if (!currentReport) return [];
    if (reportSubTab === 'BS') return currentReport.balance_sheet;
    if (reportSubTab === 'IS') return currentReport.income_statement;
    return currentReport.cash_flow;
  }, [currentReport, reportSubTab]);

  return (
    <div className="space-y-6">

      {/* ── Ticker + Period Selector ── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-[0_4px_24px_rgb(0,0,0,0.06)] hover:border-slate-300/60 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <Building2 size={18} className="text-indigo-600 flex-shrink-0" />
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Nhập mã cổ phiếu
            </label>
            <div className="relative w-72 group">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
              <input
                type="text"
                value={inputTicker}
                onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const clean = inputTicker.trim().toUpperCase();
                    if (clean.length >= 2) setCommittedTicker(clean);
                  }
                }}
                placeholder="Ví dụ: FPT, SSI, VNM..."
                className="w-full h-11 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm px-4 py-2 pl-10 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>
            {committedTicker !== inputTicker.trim().toUpperCase() && inputTicker.trim().length >= 2 && (
              <p className="text-xs text-amber-500 mt-1">
                Đang hiển thị: <strong>{committedTicker}</strong> — nhấn Enter hoặc chờ tự động tìm...
              </p>
            )}
            {currentReport && (
              <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                ✓ Đang hiển thị dữ liệu: <strong>{currentReport.ticker}</strong>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chu kỳ:</span>
          <div className="flex items-center p-1 bg-slate-100/80 backdrop-blur-md rounded-xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setPeriodType('YEARLY')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                periodType === 'YEARLY' ? 'bg-white text-indigo-700 shadow-[0_2px_8px_rgb(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              Theo Năm
            </button>
            <button
              onClick={() => setPeriodType('QUARTERLY')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 ${
                periodType === 'QUARTERLY' ? 'bg-white text-indigo-700 shadow-[0_2px_8px_rgb(0,0,0,0.06)]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              Theo Quý
            </button>
          </div>
        </div>
      </div>

      {/* ── Report Tabs + Table ── */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="flex items-center border-b border-slate-200/60 bg-slate-50/50 px-2 pt-2 gap-1 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setReportSubTab('BS')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap rounded-t-xl ${
              reportSubTab === 'BS'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-[0_-4px_15px_rgb(0,0,0,0.02)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <PieChart size={16} className={reportSubTab === 'BS' ? 'text-indigo-600' : ''} /> 1. Bảng Cân đối Kế toán
          </button>
          <button
            onClick={() => setReportSubTab('IS')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap rounded-t-xl ${
              reportSubTab === 'IS'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-[0_-4px_15px_rgb(0,0,0,0.02)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <TrendingUp size={16} className={reportSubTab === 'IS' ? 'text-indigo-600' : ''} /> 2. Kết quả Kinh doanh
          </button>
          <button
            onClick={() => setReportSubTab('CF')}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap rounded-t-xl ${
              reportSubTab === 'CF'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-[0_-4px_15px_rgb(0,0,0,0.02)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
            }`}
          >
            <DollarSign size={16} className={reportSubTab === 'CF' ? 'text-indigo-600' : ''} /> 3. Lưu chuyển Tiền tệ
          </button>
        </div>

        {isLoadingReport ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 size={24} className="animate-spin mx-auto text-indigo-600" />
            <p className="text-sm text-slate-500">Đang tải Báo cáo tài chính cho {committedTicker}...</p>
          </div>
        ) : !currentReport ? (
          <div className="p-16 text-center bg-slate-50/40">
            <div className="w-14 h-14 rounded-full bg-slate-100/80 flex items-center justify-center mx-auto text-slate-400 mb-3.5 border border-slate-200/50">
              <Building2 size={24} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-800">
                {committedTicker ? `Không tìm thấy dữ liệu cho mã ${committedTicker}` : 'Hãy nhập mã chứng khoán để tra cứu'}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                {committedTicker ? 'Mã này chưa có trong Data Lake. Hãy chuyển sang tab Trình Thu thập BCTC để nạp dữ liệu, hoặc thử mã đã có sẵn:' : 'Nhập mã chứng khoán (VD: FPT, HPG) hoặc chọn các mã gợi ý dưới đây:'}
              </p>
              <div className="flex gap-2 justify-center mt-3">
                {companies.slice(0, 4).map(c => (
                  <button
                    key={c.ticker}
                    onClick={() => { setInputTicker(c.ticker); setCommittedTicker(c.ticker); }}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    {c.ticker}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-white border-b-2 border-slate-200/80">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest sticky left-0 bg-gradient-to-r from-slate-50 to-white/95 backdrop-blur z-10 shadow-[1px_0_0_rgb(0,0,0,0.05)]">Chỉ tiêu tài chính</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Đơn vị</th>
                  {currentReport.periods.map((p: string) => (
                    <th key={p} className="px-6 py-4 text-xs font-black text-slate-800 text-right tracking-widest">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeItems.map((item, idx) => {
                  const isHeaderRow = item.metric_name.toUpperCase() === item.metric_name;
                  return (
                    <tr
                      key={idx}
                      className={`group hover:bg-indigo-50/40 transition-colors duration-200 relative ${
                        isHeaderRow ? 'bg-slate-50/50' : ''
                      }`}
                    >
                      <td className={`px-6 py-4 text-[13px] sticky left-0 z-10 transition-colors group-hover:bg-indigo-50/40 shadow-[1px_0_0_rgb(0,0,0,0.02)] relative ${
                        isHeaderRow 
                          ? 'bg-slate-50/50 text-slate-900 font-extrabold uppercase tracking-wide' 
                          : 'bg-white text-slate-700 font-medium pl-10'
                      }`}>
                        {/* Left border highlight on hover */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {item.metric_name}
                      </td>
                      <td className="px-4 py-4 text-[11px] text-slate-400 font-bold uppercase tracking-wider">{item.unit}</td>
                      {currentReport.periods.map((p: string) => {
                        const val = item.values[p];
                        const formattedVal = val !== undefined ? val.toLocaleString('vi-VN') : '—';
                        const isNegative = val !== undefined && val < 0;
                        return (
                          <td
                            key={p}
                            className={`px-6 py-4 text-[13px] text-right font-mono tracking-tight group-hover:text-indigo-900 transition-colors ${
                              isHeaderRow ? 'font-bold text-slate-900' : 'font-medium'
                            } ${isNegative ? 'text-rose-500' : 'text-slate-700'}`}
                          >
                            {isNegative ? `(${Math.abs(val).toLocaleString('vi-VN')})` : formattedVal}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Đơn vị tính mặc định: Tỷ VNĐ</span>
          <span>Dữ liệu đã chuẩn hóa phục vụ gán nhãn Financial Distress &amp; Altman Z-Score</span>
        </div>
      </div>
    </div>
  );
};
