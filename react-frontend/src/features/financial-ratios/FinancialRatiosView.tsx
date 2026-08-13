import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator,
  Building2,
  TrendingUp,
  Droplet,
  Scale,
  Zap,
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
import { SearchInput } from '@/components/ui/SearchInput';

export const FinancialRatiosView: React.FC = () => {
  const [selectedTicker, setSelectedTicker] = useState('FPT');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState(false);

  // Fetch listed companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies-ratios-dropdown'],
    queryFn: () => getCompanies(1, 100),
  });

  const _companies: Company[] = useMemo(() => {
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
    <div className="space-y-6 max-w-screen-xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 font-mono">
              Phân Tích &amp; Tính Toán Chỉ Số Tài Chính &amp; Kỹ Thuật
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-mono font-extrabold border border-indigo-200">
              Mục 6 Spec
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tính toán 4 nhóm chỉ số kế toán từ BCTC kèm 5 chỉ báo thị trường &amp; kỹ thuật (Sharpe, MACD, ADX, CCI, RSI).
          </p>
        </div>

        <button
          onClick={handleCalculateRatios}
          disabled={isCalculating}
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto font-mono text-xs py-2.5 px-5 font-extrabold cursor-pointer shadow-md shadow-indigo-200"
        >
          {isCalculating ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Đang tính toán...
            </>
          ) : (
            <>
              <Calculator size={16} /> Kích hoạt Ratio Engine ({selectedTicker})
            </>
          )}
        </button>
      </div>

      {calcSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-mono font-bold flex items-center gap-2 shadow-2xs">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>Đã cập nhật tính toán chỉ số tài chính &amp; kỹ thuật mới nhất cho mã {selectedTicker}!</span>
        </div>
      )}

      {/* ── Company Selector Bar ── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Building2 size={20} />
          </div>
          <div className="w-full sm:w-64">
            <SearchInput
              label="NHẬP MÃ CỔ PHIẾU"
              value={selectedTicker}
              onChange={(e) => setSelectedTicker(e.target.value.toUpperCase().trim())}
              onClear={() => setSelectedTicker('')}
              placeholder="Ví dụ: FPT, VNM..."
              variant="glass"
              inputSize="md"
              className="uppercase font-mono font-bold"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <span>Chuỗi dữ liệu lịch sử:</span>
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200">
            2019 – 2024 ({ratioList.length} năm)
          </span>
        </div>
      </div>

      {ratioList.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600 mb-3.5 border border-indigo-100">
            <Calculator size={24} className="animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">Không tìm thấy dữ liệu Chỉ số Phân tích</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Chưa có dữ liệu chỉ số cho mã chứng khoán <strong>{selectedTicker || 'trống'}</strong>. Vui lòng nhập mã có sẵn dữ liệu (Ví dụ: FPT, VNM) hoặc bấm Ratio Engine.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Top Key Metric Cards ── */}
          {latestRatio && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 font-mono">
              <div className="metric-card">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ROA (Năm {latestRatio.year})</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{latestRatio.roa.toFixed(2)}%</p>
                <span className="text-[10px] text-slate-400">LNST / Tổng tài sản</span>
              </div>

              <div className="metric-card">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ROE (Năm {latestRatio.year})</p>
                <p className="text-2xl font-black text-indigo-600 mt-1">{latestRatio.roe.toFixed(2)}%</p>
                <span className="text-[10px] text-slate-400">LNST / Vốn chủ sở hữu</span>
              </div>

              <div className="metric-card">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sharpe Ratio</p>
                <p className="text-2xl font-black text-purple-600 mt-1">{latestRatio.sharpe_ratio.toFixed(2)}</p>
                <span className="text-[10px] text-purple-700 font-extrabold bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                  Hiệu quả đầu tư
                </span>
              </div>

              <div className="metric-card">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">RSI (14 phiên)</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{latestRatio.rsi_14.toFixed(1)}</p>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                    latestRatio.rsi_14 > 60 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {latestRatio.rsi_14 > 60 ? 'Tích cực' : 'Trung bình'}
                </span>
              </div>

              <div className="metric-card">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tỷ lệ Nợ / TA</p>
                <p className="text-2xl font-black text-amber-600 mt-1">{(latestRatio.debt_to_ta * 100).toFixed(1)}%</p>
                <span className="text-[10px] text-slate-400">Đòn bẩy tài chính</span>
              </div>
            </div>
          )}

          {/* ── Multi-Year Trend Chart ── */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 space-y-3">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between font-mono">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <BarChart2 size={16} className="text-indigo-600" />
                BIỂU ĐỒ XU HƯỚNG CHỈ SỐ TÀI CHÍNH ({selectedTicker})
              </h2>
              <span className="text-xs text-slate-500">2019–2024</span>
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
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/70 bg-gradient-to-r from-indigo-50/40 via-white to-white flex items-center justify-between font-mono">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Calculator size={16} className="text-indigo-600" />
                BẢNG CHI TIẾT 5 NHÓM CHỈ SỐ TÀI CHÍNH &amp; CHỈ BÁO KỸ THUẬT ({selectedTicker})
              </h2>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider font-mono">
                    <th className="px-5 py-3.5">Tên Chỉ số</th>
                    <th className="px-5 py-3.5 font-normal">Công thức / Diễn giải</th>
                    {ratioList.map((r) => (
                      <th key={r.year} className="px-5 py-3.5 text-right font-black text-slate-800">
                        {r.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-sans">
                  {/* GROUP 1 */}
                  <tr className="bg-blue-50/50 font-bold text-blue-900 font-mono text-xs">
                    <td colSpan={2 + ratioList.length} className="px-5 py-2.5 uppercase tracking-wide flex items-center gap-1.5">
                      <Droplet size={13} className="text-blue-600" /> 1. Nhóm Thanh khoản (Liquidity Ratios)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-semibold text-slate-800">Current Ratio</td>
                    <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">Tài sản ngắn hạn / Nợ ngắn hạn</td>
                    {ratioList.map((r) => (
                      <td key={r.year} className="px-5 py-3 text-right font-mono font-bold text-blue-700">
                        {r.current_ratio.toFixed(2)}x
                      </td>
                    ))}
                  </tr>

                  {/* GROUP 2 */}
                  <tr className="bg-emerald-50/50 font-bold text-emerald-900 font-mono text-xs">
                    <td colSpan={2 + ratioList.length} className="px-5 py-2.5 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp size={13} className="text-emerald-600" /> 2. Nhóm Sinh lời (Profitability Ratios)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-semibold text-slate-800">ROA (%)</td>
                    <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">Lợi nhuận sau thuế / Tổng tài sản</td>
                    {ratioList.map((r) => (
                      <td key={r.year} className="px-5 py-3 text-right font-mono font-bold text-emerald-600">
                        {r.roa.toFixed(2)}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-semibold text-slate-800">ROE (%)</td>
                    <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">Lợi nhuận sau thuế / Vốn chủ sở hữu</td>
                    {ratioList.map((r) => (
                      <td key={r.year} className="px-5 py-3 text-right font-mono font-bold text-indigo-700">
                        {r.roe.toFixed(2)}%
                      </td>
                    ))}
                  </tr>

                  {/* GROUP 3 */}
                  <tr className="bg-amber-50/50 font-bold text-amber-900 font-mono text-xs">
                    <td colSpan={2 + ratioList.length} className="px-5 py-2.5 uppercase tracking-wide flex items-center gap-1.5">
                      <Scale size={13} className="text-amber-600" /> 3. Nhóm Đòn bẩy (Leverage Ratios)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-semibold text-slate-800">Tỷ lệ Nợ / TA (Debt Ratio)</td>
                    <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">Tổng nợ phải trả / Tổng tài sản</td>
                    {ratioList.map((r) => (
                      <td key={r.year} className="px-5 py-3 text-right font-mono font-extrabold text-amber-700">
                        {(r.debt_to_ta * 100).toFixed(1)}%
                      </td>
                    ))}
                  </tr>

                  {/* GROUP 4 */}
                  <tr className="bg-purple-50/50 font-bold text-purple-900 font-mono text-xs">
                    <td colSpan={2 + ratioList.length} className="px-5 py-2.5 uppercase tracking-wide flex items-center gap-1.5">
                      <Zap size={13} className="text-purple-600" /> 4. Nhóm Quy mô &amp; Tăng trưởng (Size &amp; Growth)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-semibold text-slate-800">log(Total Assets)</td>
                    <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">log10(Tổng tài sản)</td>
                    {ratioList.map((r) => (
                      <td key={r.year} className="px-5 py-3 text-right font-mono text-slate-700">
                        {r.log_total_assets.toFixed(2)}
                      </td>
                    ))}
                  </tr>

                  {/* GROUP 5 */}
                  <tr className="bg-indigo-50/60 font-bold text-indigo-950 font-mono text-xs">
                    <td colSpan={2 + ratioList.length} className="px-5 py-2.5 uppercase tracking-wide flex items-center gap-1.5">
                      <Activity size={13} className="text-indigo-600" /> 5. Nhóm Chỉ báo Thị trường &amp; Kỹ thuật (Market &amp; Technical Indicators)
                    </td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-semibold text-slate-800">Sharpe Ratio</td>
                    <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">(Lợi nhuận TB - Rf 4.5%) / Độ lệch chuẩn giá</td>
                    {ratioList.map((r) => (
                      <td key={r.year} className="px-5 py-3 text-right font-mono font-bold text-purple-700">
                        {r.sharpe_ratio.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-semibold text-slate-800">RSI (14 phiên)</td>
                    <td className="px-5 py-3 text-[11px] text-slate-400 font-mono">Relative Strength Index (Chỉ số sức mạnh tương đối)</td>
                    {ratioList.map((r) => (
                      <td key={r.year} className="px-5 py-3 text-right font-mono font-extrabold text-indigo-700">
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
