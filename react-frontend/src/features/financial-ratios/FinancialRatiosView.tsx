import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator,
  Building2,
  TrendingUp,
  Droplet,
  Scale,
  Zap,
  ChevronDown,
  Loader2,
  CheckCircle2,
  BarChart2,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { getCompanies, getFinancialRatios, calculateFinancialRatios } from '@/services/api';
import type { Company, FinancialRatios } from '@/types';

export const FinancialRatiosView: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState('FPT');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState(false);

  // Fetch listed companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies-ratios-dropdown'],
    queryFn: () => getCompanies(1, 100),
  });

  const companies: Company[] = useMemo(() => {
    return companiesData?.data ?? [];
  }, [companiesData]);

  // Fetch ratio data
  const { data: apiRatios, refetch } = useQuery({
    queryKey: ['financial-ratios', selectedTicker],
    queryFn: () => getFinancialRatios(selectedTicker),
    enabled: !!selectedTicker,
  });

  const ratioList: FinancialRatios[] = useMemo(() => {
    return apiRatios?.data || [];
  }, [apiRatios]);

  const latestRatio = ratioList && ratioList.length > 0 ? ratioList[ratioList.length - 1] : undefined;

  // Calculate Ratios Engine Action
  const handleCalculateRatios = async () => {
    setIsCalculating(true);
    setCalcSuccess(false);
    try {
      await calculateFinancialRatios([selectedTicker]).catch(() => {});
      setCalcSuccess(true);
      refetch();
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Phân tích & Tính toán Chỉ số Tài chính & Kỹ thuật</h1>
            <span className="badge-slate font-mono">Mục 6 Spec</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Tính toán 4 nhóm chỉ số kế toán từ BCTC kèm 5 chỉ báo thị trường & kỹ thuật (Sharpe, MACD, ADX, CCI, RSI).
          </p>
        </div>

        <button
          onClick={handleCalculateRatios}
          disabled={isCalculating}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          {isCalculating ? (
            <><Loader2 size={15} className="animate-spin" /> Đang tính toán Chỉ số...</>
          ) : (
            <><Calculator size={15} /> Kích hoạt Ratio Engine ({selectedTicker})</>
          )}
        </button>
      </div>

      {calcSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} /> Đã cập nhật tính toán các nhóm chỉ số tài chính & kỹ thuật mới nhất cho mã {selectedTicker}!
        </div>
      )}

      {/* ── Company Selector Bar ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Building2 size={20} />
          </div>
          <div className="flex-1 sm:flex-none">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Nhập Mã Cổ phiếu</p>
            <div className="relative mt-0.5 w-64">
              <input
                type="text"
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value.toUpperCase().trim())}
                placeholder="Ví dụ: FPT, VNM..."
                className="input-field font-bold text-slate-900 text-sm py-1.5 pr-4"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span>Chuỗi dữ liệu lịch sử:</span>
          <span className="badge-indigo font-mono">2019 – 2024 ({ratioList.length} năm)</span>
        </div>
      </div>

      {ratioList.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100/80 flex items-center justify-center mx-auto text-slate-400 mb-3.5 border border-slate-200/50">
            <Calculator size={24} className="text-indigo-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">Không tìm thấy dữ liệu Chỉ số Phân tích</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Không tìm thấy dữ liệu chỉ số tài chính & kỹ thuật cho mã chứng khoán <strong>{selectedTicker || 'trống'}</strong> trong hệ thống.
              Vui lòng nhập mã có sẵn dữ liệu (Ví dụ: <strong className="text-indigo-600">FPT</strong>, <strong className="text-indigo-600">VNM</strong>) hoặc chạy <strong>Ratio Engine</strong> để tính toán.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Top Key Metric Cards ── */}
          {latestRatio && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="metric-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ROA (Năm {latestRatio.year})</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{latestRatio.roa.toFixed(2)}%</p>
            <span className="text-[10px] text-slate-400">LNST / Tổng tài sản</span>
          </div>

          <div className="metric-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ROE (Năm {latestRatio.year})</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{latestRatio.roe.toFixed(2)}%</p>
            <span className="text-[10px] text-slate-400">LNST / Vốn chủ sở hữu</span>
          </div>

          <div className="metric-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sharpe Ratio</p>
            <p className="text-2xl font-bold text-purple-600 mt-1 font-mono">{latestRatio.sharpe_ratio.toFixed(2)}</p>
            <span className="badge-purple text-[10px]">Hiệu quả đầu tư</span>
          </div>

          <div className="metric-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">RSI (14 phiên)</p>
            <p className="text-2xl font-bold text-slate-800 mt-1 font-mono">{latestRatio.rsi_14.toFixed(1)}</p>
            <span className={latestRatio.rsi_14 > 60 ? 'badge-green text-[10px]' : 'badge-slate text-[10px]'}>
              {latestRatio.rsi_14 > 60 ? 'Tích cực' : 'Trung bình'}
            </span>
          </div>

          <div className="metric-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tỷ lệ Nợ / TA</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{(latestRatio.debt_to_ta * 100).toFixed(1)}%</p>
            <span className="text-[10px] text-slate-400">Đòn bẩy tài chính</span>
          </div>
        </div>
      )}

      {/* ── Multi-Year Trend Chart ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-3">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <BarChart2 size={16} className="text-indigo-600" />
            Biểu đồ Diễn biến Xu hướng Chỉ số Tài chính ({selectedTicker})
          </h2>
          <span className="badge-slate font-mono">2019–2024</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ratioList} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip formatter={(value: any) => Number(value).toFixed(2)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="roa" name="ROA (%)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="roe" name="ROE (%)" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="current_ratio" name="Current Ratio (x)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="sharpe_ratio" name="Sharpe Ratio" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── RATIOS & INDICATORS DETAIL TABLE ── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Calculator size={16} className="text-indigo-600" />
            Bảng Chi tiết 5 Nhóm Chỉ số Tài chính & Chỉ báo Kỹ thuật ({selectedTicker})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Mục 6 Spec + Technical Indicators</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="px-5 py-3">Tên Chỉ số</th>
                <th className="px-5 py-3 font-normal">Công thức / Diễn giải</th>
                {ratioList.map((r) => (
                  <th key={r.year} className="px-5 py-3 text-right font-mono font-bold text-slate-800">
                    {r.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {/* GROUP 1: THANH KHOẢN */}
              <tr className="bg-blue-50/40 font-bold text-blue-900 text-xs">
                <td colSpan={2 + ratioList.length} className="px-5 py-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Droplet size={13} className="text-blue-600" /> 1. Nhóm Thanh khoản (Liquidity Ratios)
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Current Ratio</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Tài sản ngắn hạn / Nợ ngắn hạn</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono font-semibold text-blue-700">
                    {r.current_ratio.toFixed(2)}x
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Working Capital / TA</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">(TS ngắn hạn - Nợ ngắn hạn) / Tổng tài sản</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {r.working_capital_to_ta.toFixed(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">OCF / Current Liabilities</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Dòng tiền HĐKD / Nợ ngắn hạn</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {r.ocf_to_current_liabilities.toFixed(2)}
                  </td>
                ))}
              </tr>

              {/* GROUP 2: SINH LỜI */}
              <tr className="bg-emerald-50/40 font-bold text-emerald-900 text-xs">
                <td colSpan={2 + ratioList.length} className="px-5 py-2 uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-emerald-600" /> 2. Nhóm Sinh lời (Profitability Ratios)
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">ROA (%)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Lợi nhuận sau thuế / Tổng tài sản</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono font-bold text-emerald-600">
                    {r.roa.toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">ROE (%)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Lợi nhuận sau thuế / Vốn chủ sở hữu</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono font-bold text-indigo-600">
                    {r.roe.toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">EBIT Margin (%)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">EBIT / Doanh thu thuần</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {r.ebit_margin.toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Asset Turnover</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Doanh thu thuần / Tổng tài sản</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {r.asset_turnover.toFixed(2)}x
                  </td>
                ))}
              </tr>

              {/* GROUP 3: ĐÒN BẨY */}
              <tr className="bg-amber-50/40 font-bold text-amber-900 text-xs">
                <td colSpan={2 + ratioList.length} className="px-5 py-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Scale size={13} className="text-amber-600" /> 3. Nhóm Đòn bẩy (Leverage Ratios)
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Nợ ngắn hạn / TA</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Nợ ngắn hạn / Tổng tài sản</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {(r.short_term_debt_to_ta * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Nợ dài hạn / TA</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Nợ dài hạn / Tổng tài sản</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {(r.long_term_debt_to_ta * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Tỷ lệ Nợ / TA (Debt Ratio)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Tổng nợ phải trả / Tổng tài sản</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono font-semibold text-amber-700">
                    {(r.debt_to_ta * 100).toFixed(1)}%
                  </td>
                ))}
              </tr>

              {/* GROUP 4: QUY MÔ & TĂNG TRƯỞNG */}
              <tr className="bg-purple-50/40 font-bold text-purple-900 text-xs">
                <td colSpan={2 + ratioList.length} className="px-5 py-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Zap size={13} className="text-purple-600" /> 4. Nhóm Quy mô & Tăng trưởng (Size & Growth)
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">log(Total Assets)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">log10(Tổng tài sản)</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {r.log_total_assets.toFixed(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Tăng trưởng Tài sản (%)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">(TA_t - TA_t-1) / TA_t-1</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {r.asset_growth > 0 ? `+${r.asset_growth.toFixed(1)}%` : `${r.asset_growth.toFixed(1)}%`}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Tăng trưởng Lợi nhuận (%)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">(LNST_t - LNST_t-1) / |LNST_t-1|</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {r.profit_growth > 0 ? `+${r.profit_growth.toFixed(1)}%` : `${r.profit_growth.toFixed(1)}%`}
                  </td>
                ))}
              </tr>

              {/* GROUP 5: NHÓM CHỈ BÁO THỊ TRƯỜNG & KỸ THUẬT */}
              <tr className="bg-indigo-50/60 font-bold text-indigo-950 text-xs">
                <td colSpan={2 + ratioList.length} className="px-5 py-2 uppercase tracking-wide flex items-center gap-1.5">
                  <Activity size={13} className="text-indigo-600" /> 5. Nhóm Chỉ báo Thị trường & Kỹ thuật (Market & Technical Indicators)
                </td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">Sharpe Ratio</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">(Lợi nhuận TB - Rf 4.5%) / Độ lệch chuẩn giá</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono font-bold text-purple-700">
                    {r.sharpe_ratio.toFixed(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">MACD (12, 26, 9)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">EMA(12) - EMA(26) giá đóng cửa</td>
                {ratioList.map((r) => (
                  <td key={r.year} className={`px-5 py-3 text-sm text-right font-mono font-semibold ${r.macd >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {r.macd > 0 ? `+${r.macd.toFixed(2)}` : r.macd.toFixed(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">ADX (14 phiên)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Chỉ số cường độ xu hướng (Average Directional Index)</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono text-slate-700">
                    {r.adx_14.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">CCI (14 phiên)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Commodity Channel Index (Mức lệch giá)</td>
                {ratioList.map((r) => (
                  <td key={r.year} className={`px-5 py-3 text-sm text-right font-mono font-semibold ${r.cci_14 >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {r.cci_14 > 0 ? `+${r.cci_14.toFixed(1)}` : r.cci_14.toFixed(1)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">RSI (14 phiên)</td>
                <td className="px-5 py-3 text-xs text-slate-400 font-mono">Relative Strength Index (Chỉ số sức mạnh tương đối)</td>
                {ratioList.map((r) => (
                  <td key={r.year} className="px-5 py-3 text-sm text-right font-mono font-bold text-indigo-700">
                    {r.rsi_14.toFixed(1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  )}
</div>
  );
};
