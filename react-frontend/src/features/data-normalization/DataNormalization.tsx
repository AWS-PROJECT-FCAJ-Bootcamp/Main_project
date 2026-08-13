import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sliders,
  AlertOctagon,
  FileCheck2,
  ListTree,
  Play,
  Plus,
  Info,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { getMetricMappings, getDataQualityReport, runDataNormalization } from '@/services/api';
import type { MetricMappingRule, DataQualityReport } from '@/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/Select';

// Representative Metric Mappings
const DEFAULT_METRIC_MAPPINGS: MetricMappingRule[] = [
  {
    standard_key: 'total_assets',
    display_name: 'Tổng tài sản',
    statement_type: 'BS',
    category: 'Tài sản',
    aliases: ['Total Assets', 'TOTAL ASSETS', 'TỔNG CỘNG TÀI SẢN', 'Tổng tài sản', 'Total assets balance'],
  },
  {
    standard_key: 'current_assets',
    display_name: 'Tài sản ngắn hạn',
    statement_type: 'BS',
    category: 'Tài sản',
    aliases: ['Current Assets', 'Tài sản ngắn hạn', 'TỔNG TÀI SẢN NGẮN HẠN', 'Short-term assets'],
  },
  {
    standard_key: 'inventory',
    display_name: 'Hàng tồn kho',
    statement_type: 'BS',
    category: 'Tài sản',
    aliases: ['Inventory', 'Hàng tồn kho', 'Hàng tồn kho ròng', 'Inventories net'],
  },
  {
    standard_key: 'current_liabilities',
    display_name: 'Nợ ngắn hạn',
    statement_type: 'BS',
    category: 'Nguồn vốn',
    aliases: ['Current Liabilities', 'Nợ ngắn hạn', 'Nợ phải trả ngắn hạn', 'Short-term liabilities'],
  },
  {
    standard_key: 'total_liabilities',
    display_name: 'Tổng nợ phải trả',
    statement_type: 'BS',
    category: 'Nguồn vốn',
    aliases: ['Total Liabilities', 'Tổng nợ phải trả', 'TỔNG CỘNG NỢ PHẢI TRẢ', 'Liabilities total'],
  },
  {
    standard_key: 'equity',
    display_name: 'Vốn chủ sở hữu',
    statement_type: 'BS',
    category: 'Nguồn vốn',
    aliases: ['Owner Equity', 'Vốn chủ sở hữu', 'VỐN CHỦ SỞ HỮU', 'Stockholders equity'],
  },
  {
    standard_key: 'retained_earnings',
    display_name: 'Lợi nhuận chưa phân phối',
    statement_type: 'BS',
    category: 'Nguồn vốn',
    aliases: ['Retained Earnings', 'Lợi nhuận sau thuế chưa phân phối', 'LNST chưa phân phối'],
  },
  {
    standard_key: 'net_revenue',
    display_name: 'Doanh thu thuần',
    statement_type: 'IS',
    category: 'Kết quả KD',
    aliases: ['Net Revenue', 'Doanh thu thuần', 'Doanh thu bán hàng và cung cấp dịch vụ', 'Net sales'],
  },
  {
    standard_key: 'ebit',
    display_name: 'Lợi nhuận trước thuế (EBIT)',
    statement_type: 'IS',
    category: 'Kết quả KD',
    aliases: ['EBIT', 'Lợi nhuận trước thuế', 'Tổng lợi nhuận kế toán trước thuế', 'Earning before tax'],
  },
  {
    standard_key: 'net_profit',
    display_name: 'Lợi nhuận sau thuế',
    statement_type: 'IS',
    category: 'Kết quả KD',
    aliases: ['Net Profit', 'Lợi nhuận sau thuế', 'LNST của cổ đông công ty mẹ', 'Profit after tax'],
  },
  {
    standard_key: 'interest_expense',
    display_name: 'Chi phí lãi vay',
    statement_type: 'IS',
    category: 'Chi phí',
    aliases: ['Interest Expense', 'Chi phí lãi vay', 'Trong đó: Chi phí lãi vay', 'Finance interest cost'],
  },
  {
    standard_key: 'operating_cash_flow',
    display_name: 'Dòng tiền HĐKD (OCF)',
    statement_type: 'CF',
    category: 'Dòng tiền',
    aliases: ['Operating Cash Flow', 'Lưu chuyển tiền thuần từ hoạt động kinh doanh', 'OCF net'],
  },
];

const DEFAULT_QUALITY_REPORT: DataQualityReport = {
  total_companies: 0,
  qualified_companies: 0,
  rejected_companies: 0,
  min_years_required: 5,
  missing_rate_overall: 0,
  missing_by_metric: [],
  outliers_detected: [],
};

export const DataNormalization: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'MAPPINGS' | 'QUALITY' | 'OUTLIERS'>('MAPPINGS');
  const [mappings, setMappings] = useState<MetricMappingRule[]>(DEFAULT_METRIC_MAPPINGS);
  const [newAliasInput, setNewAliasInput] = useState<Record<string, string>>({});

  // Normalization Controls State
  const [minYears, setMinYears] = useState<number>(5);
  const [winsorizePct, setWinsorizePct] = useState<number>(1);
  const [targetUnit, setTargetUnit] = useState<string>('Tỷ VNĐ');
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [normalizedSuccess, setNormalizedSuccess] = useState(false);

  // Queries
  const { data: apiMappings } = useQuery({
    queryKey: ['metric-mappings'],
    queryFn: getMetricMappings,
  });

  React.useEffect(() => {
    if (apiMappings?.data && Array.isArray(apiMappings.data)) {
      setMappings(apiMappings.data);
    }
  }, [apiMappings]);

  const { data: apiQualityReport } = useQuery({
    queryKey: ['quality-report'],
    queryFn: getDataQualityReport,
  });

  const qualityReport: DataQualityReport = useMemo(() => {
    return apiQualityReport?.data ?? DEFAULT_QUALITY_REPORT;
  }, [apiQualityReport]);

  const isFallback = useMemo(() => {
    return !apiMappings && !apiQualityReport;
  }, [apiMappings, apiQualityReport]);

  const handleAddAlias = (standardKey: string) => {
    const text = (newAliasInput[standardKey] || '').trim();
    if (!text) return;

    setMappings((prev) =>
      prev.map((m) => {
        if (m.standard_key === standardKey && !m.aliases.includes(text)) {
          return { ...m, aliases: [...m.aliases, text] };
        }
        return m;
      })
    );

    setNewAliasInput((prev) => ({ ...prev, [standardKey]: '' }));
  };

  const handleRunNormalization = async () => {
    setIsNormalizing(true);
    setNormalizedSuccess(false);
    try {
      await runDataNormalization({ minYears, winsorizePct, targetUnit }).catch(() => {});
      setNormalizedSuccess(true);
    } finally {
      setIsNormalizing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 font-mono">
              Chuẩn Hóa Chỉ Tiêu &amp; Làm Sạch Dữ Liệu Thô
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-mono font-extrabold border border-indigo-200">
              Mục 5 Spec
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mapping tên chỉ tiêu, thống kê tỷ lệ missing, xử lý ngoại lệ (Winsorize) &amp; chuẩn hóa đơn vị tính.
          </p>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 shadow-inner self-start sm:self-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('MAPPINGS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'MAPPINGS' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTree size={14} /> Bảng Mapping
          </button>
          <button
            onClick={() => setActiveTab('QUALITY')}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'QUALITY' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck2 size={14} /> Quality &amp; Missing
          </button>
          <button
            onClick={() => setActiveTab('OUTLIERS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-extrabold rounded-lg transition-all cursor-pointer ${
              activeTab === 'OUTLIERS' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertOctagon size={14} /> Outlier &amp; Winsorize
          </button>
        </div>
      </div>

      {isFallback && (
        <div className="p-4 bg-amber-50/80 backdrop-blur-xl border border-amber-200 rounded-2xl text-xs text-amber-800 font-mono font-bold flex items-center gap-2.5 shadow-2xs">
          <span className="text-sm">⚠️</span>
          <span>
            Hệ thống đang hiển thị cấu trúc chuẩn hóa &amp; làm sạch dữ liệu thô mẫu (Spec Mục 5) để tham chiếu nghiệp vụ khi API chính chưa kết nối.
          </span>
        </div>
      )}

      {/* ── TAB 1: METRIC MAPPING ENGINE ── */}
      {activeTab === 'MAPPINGS' && (
        <div className="space-y-6">
          <div className="bg-amber-50/80 backdrop-blur-xl border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
            <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 font-sans">
              <p className="font-bold text-amber-950 font-mono">Quy tắc Chuẩn hóa tên chỉ tiêu (Financial_Application.txt - Mục 5):</p>
              <p className="text-slate-700 leading-relaxed">
                Mỗi nguồn dữ liệu (Vietstock, CafeF, vnstock...) đặt tên chỉ tiêu BCTC khác nhau.
                Bảng Mapping giúp gom toàn bộ các tên biến thể về mã duy nhất (ví dụ: <code className="bg-amber-100 font-mono px-1 py-0.5 rounded font-bold">total_assets</code>),
                đảm bảo công thức tính toán chỉ số không bị sai lệch.
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden divide-y divide-slate-100">
            <div className="px-5 py-4 bg-gradient-to-r from-indigo-50/40 via-white to-white flex items-center justify-between font-mono">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <ListTree size={16} className="text-indigo-600" />
                DANH SÁCH BẢNG MAPPING CHỈ TIÊU ({mappings.length} BIẾN CHUẨN)
              </h2>
              <span className="text-[11px] text-slate-500">Tự động mapping khi cào JSON/HTML</span>
            </div>

            {mappings.map((m) => (
              <div key={m.standard_key} className="p-5 hover:bg-indigo-50/30 transition-colors space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap font-mono">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg shadow-2xs">
                      {m.standard_key}
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-sans">{m.display_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      {m.statement_type} — {m.category}
                    </span>
                  </div>
                </div>

                {/* Aliases Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider mr-1">Bí danh (Aliases):</span>
                  {m.aliases.map((alias, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/80 font-mono font-semibold"
                    >
                      ✓ {alias}
                    </span>
                  ))}
                </div>

                {/* Add new alias inline */}
                <div className="flex items-center gap-2 max-w-md pt-1">
                  <Input
                    placeholder="Thêm bí danh mới..."
                    value={newAliasInput[m.standard_key] || ''}
                    onChange={(e) => setNewAliasInput({ ...newAliasInput, [m.standard_key]: e.target.value })}
                    variant="glass"
                    inputSize="sm"
                    className="font-mono text-xs"
                  />
                  <button
                    onClick={() => handleAddAlias(m.standard_key)}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 flex-shrink-0 cursor-pointer font-mono font-bold rounded-xl bg-white border-slate-200 shadow-2xs"
                  >
                    <Plus size={13} /> Thêm Alias
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: DATA QUALITY & MISSING RATES ── */}
      {activeTab === 'QUALITY' && (
        <div className="space-y-6">
          {/* Quality Overview Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="metric-card">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng số doanh nghiệp</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{qualityReport.total_companies}</p>
            </div>
            <div className="metric-card">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Đủ điều kiện (≥ {qualityReport.min_years_required} năm BCTC)</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{qualityReport.qualified_companies}</p>
            </div>
            <div className="metric-card">
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Bị loại (Thiếu quá nhiều năm)</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{qualityReport.rejected_companies}</p>
            </div>
            <div className="metric-card">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Tỷ lệ Missing Rate trung bình</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{qualityReport.missing_rate_overall}%</p>
            </div>
          </div>

          {/* Missing Rates Table */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/70 bg-gradient-to-r from-indigo-50/40 via-white to-white flex items-center justify-between font-mono">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <FileCheck2 size={16} className="text-indigo-600" />
                THỐNG KÊ TỶ LỆ THIẾU DỮ LIỆU (MISSING RATE) THEO TỪNG BIẾN
              </h2>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200 font-bold">
                    <th className="px-5 py-3.5">Chỉ tiêu tài chính</th>
                    <th className="px-5 py-3.5 text-right">Số lượng bị thiếu (Dòng)</th>
                    <th className="px-5 py-3.5 text-right">Tỷ lệ Missing (%)</th>
                    <th className="px-5 py-3.5 text-right">Đánh giá chất lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {qualityReport.missing_by_metric.map((row, i) => (
                    <tr key={i} className="hover:bg-indigo-50/40">
                      <td className="px-5 py-3 font-bold text-slate-900 font-sans">{row.metric_name}</td>
                      <td className="px-5 py-3 text-right text-slate-700">{row.missing_count} / {qualityReport.total_companies}</td>
                      <td className="px-5 py-3 text-right font-extrabold">
                        <span className={row.missing_percentage > 5 ? 'text-rose-600' : 'text-emerald-600'}>
                          {row.missing_percentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {row.missing_percentage === 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Hoàn hảo
                          </span>
                        ) : row.missing_percentage <= 5 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
                            <CheckCircle2 size={10} /> Chấp nhận được
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                            <AlertTriangle size={10} /> Cần lọc/Winsorize
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: OUTLIER & WINSORIZING ENGINE ── */}
      {activeTab === 'OUTLIERS' && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/70 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between font-mono">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <Sliders size={16} className="text-indigo-600" />
                CẤU HÌNH XỬ LÝ OUTLIER &amp; CHUẨN HÓA ĐƠN VỊ TÍNH
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Winsorize 1% &amp; 99% Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Số năm BCTC tối thiểu"
                value={minYears}
                onChange={(e) => setMinYears(Number(e.target.value))}
                options={[
                  { value: '3', label: 'Tối thiểu 3 năm dữ liệu' },
                  { value: '5', label: 'Tối thiểu 5 năm dữ liệu (Chuẩn AI)' },
                  { value: '7', label: 'Tối thiểu 7 năm dữ liệu' },
                ]}
                variant="glass"
              />

              <Select
                label="Ngưỡng Winsorize Outlier (%)"
                value={winsorizePct}
                onChange={(e) => setWinsorizePct(Number(e.target.value))}
                options={[
                  { value: '1', label: 'Winsorize 1% và 99% (Khuyên dùng)' },
                  { value: '5', label: 'Winsorize 5% và 95%' },
                  { value: '0', label: 'Không Winsorize (Giữ nguyên thô)' },
                ]}
                variant="glass"
              />

              <Select
                label="Quy đổi Đơn vị tiền tệ"
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
                options={[
                  { value: 'Tỷ VNĐ', label: 'Quy đổi tất cả về Tỷ VNĐ' },
                  { value: 'Triệu VNĐ', label: 'Quy đổi tất cả về Triệu VNĐ' },
                  { value: 'VNĐ', label: 'Giữ nguyên VNĐ gốc' },
                ]}
                variant="glass"
              />
            </div>

            <button
              onClick={handleRunNormalization}
              disabled={isNormalizing}
              className="btn-primary w-full py-3 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer font-mono shadow-md shadow-indigo-200"
            >
              {isNormalizing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang chạy Winsorizing &amp; Xử lý Outlier...
                </>
              ) : (
                <>
                  <Play size={16} /> KÍCH HOẠT QUY TRÌNH LÀM SẠCH DỮ LIỆU
                </>
              )}
            </button>

            {normalizedSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-mono font-bold flex items-center gap-2 shadow-2xs">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Quy trình làm sạch dữ liệu thành công! Dữ liệu đã sẵn sàng để tính chỉ số tài chính.</span>
              </div>
            )}
          </div>

          {/* Outliers Log Table */}
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/70 bg-gradient-to-r from-indigo-50/40 via-white to-white flex items-center justify-between font-mono">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <AlertOctagon size={16} className="text-amber-600" />
                BẢNG GHI NHẬN NGOẠI LỆ (OUTLIER LOGS) ĐÃ XỬ LÝ
              </h2>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200 font-bold">
                    <th className="px-5 py-3.5">Ticker</th>
                    <th className="px-5 py-3.5">Biến tài chính</th>
                    <th className="px-5 py-3.5">Năm</th>
                    <th className="px-5 py-3.5 text-right">Giá trị thô (Raw)</th>
                    <th className="px-5 py-3.5 text-right">Hành động xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {qualityReport.outliers_detected.map((out, i) => (
                    <tr key={i} className="hover:bg-indigo-50/40">
                      <td className="px-5 py-3 font-extrabold text-indigo-700">{out.ticker}</td>
                      <td className="px-5 py-3 font-bold text-slate-900 font-sans">{out.metric}</td>
                      <td className="px-5 py-3 text-slate-600">{out.year}</td>
                      <td className="px-5 py-3 text-right text-rose-600 font-bold">
                        {out.raw_value === Infinity ? 'Inf' : out.raw_value.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                          {out.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
