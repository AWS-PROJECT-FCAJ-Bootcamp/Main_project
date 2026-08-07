import React, { useState, useMemo } from 'react';
import { Building2, ChevronDown, PieChart, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { useFinancialReportQuery, MOCK_FINANCIAL_DATA } from '../api/useFinancialReportQuery';
import type { Company, FinancialStatementItem } from '@/types';

interface FinancialViewerProps {
  companies: Company[];
}

export const FinancialViewer: React.FC<FinancialViewerProps> = ({ companies }) => {
  const [selectedTicker, setSelectedTicker] = useState('FPT');
  const [reportSubTab, setReportSubTab] = useState<'BS' | 'IS' | 'CF'>('BS');
  const [periodType, setPeriodType] = useState<'YEARLY' | 'QUARTERLY'>('YEARLY');

  const { data: apiReport, isLoading: isLoadingReport } = useFinancialReportQuery(selectedTicker, periodType);

  const currentReport = useMemo(() => {
    if (apiReport) return apiReport;
    const mock = MOCK_FINANCIAL_DATA[selectedTicker] || MOCK_FINANCIAL_DATA.FPT;
    return {
      ticker: selectedTicker,
      period_type: periodType,
      periods: mock.years,
      balance_sheet: mock.balanceSheet,
      income_statement: mock.incomeStatement,
      cash_flow: mock.cashFlow,
    };
  }, [apiReport, selectedTicker, periodType]);

  const activeItems: FinancialStatementItem[] = useMemo(() => {
    if (reportSubTab === 'BS') return currentReport.balance_sheet;
    if (reportSubTab === 'IS') return currentReport.income_statement;
    return currentReport.cash_flow;
  }, [currentReport, reportSubTab]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 size={18} className="text-indigo-600 flex-shrink-0" />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chọn mã cổ phiếu</label>
            <div className="relative w-64">
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="input-field appearance-none pr-9 cursor-pointer font-bold text-slate-800"
              >
                {companies.map((c) => (
                  <option key={c.ticker} value={c.ticker}>
                    {c.ticker} — {c.name || 'N/A'}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Chu kỳ:</span>
          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setPeriodType('YEARLY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                periodType === 'YEARLY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Theo Năm
            </button>
            <button
              onClick={() => setPeriodType('QUARTERLY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                periodType === 'QUARTERLY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Theo Quý
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center border-b border-slate-200 bg-slate-50/50 px-5 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setReportSubTab('BS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              reportSubTab === 'BS'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieChart size={14} /> 1. Bảng Cân đối Kế toán (Balance Sheet)
          </button>
          <button
            onClick={() => setReportSubTab('IS')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              reportSubTab === 'IS'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp size={14} /> 2. Báo cáo Kết quả Kinh doanh (Income Statement)
          </button>
          <button
            onClick={() => setReportSubTab('CF')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              reportSubTab === 'CF'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign size={14} /> 3. Báo cáo Lưu chuyển Tiền tệ (Cash Flow)
          </button>
        </div>

        {isLoadingReport ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 size={24} className="animate-spin mx-auto text-indigo-600" />
            <p className="text-sm text-slate-500">Đang tải Báo cáo tài chính cho {selectedTicker}...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200">
                  <th className="table-header min-w-[280px]">Chỉ tiêu tài chính</th>
                  <th className="table-header">Đơn vị</th>
                  {currentReport.periods.map((p: string) => (
                    <th key={p} className="table-header text-right font-bold font-mono text-slate-800">
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
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isHeaderRow ? 'bg-slate-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className={`px-5 py-3 text-sm ${isHeaderRow ? 'text-slate-900 font-bold' : 'text-slate-700 pl-8'}`}>
                        {item.metric_name}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 font-mono">{item.unit}</td>
                      {currentReport.periods.map((p: string) => {
                        const val = item.values[p];
                        const formattedVal = val !== undefined ? val.toLocaleString('vi-VN') : '—';
                        const isNegative = val !== undefined && val < 0;
                        return (
                          <td
                            key={p}
                            className={`px-5 py-3 text-sm text-right font-mono font-medium ${
                              isHeaderRow ? 'font-bold text-slate-900' : ''
                            } ${isNegative ? 'text-red-500' : 'text-slate-800'}`}
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
          <span>Dữ liệu đã chuẩn hóa phục vụ gán nhãn Financial Distress & Altman Z-Score</span>
        </div>
      </div>
    </div>
  );
};
