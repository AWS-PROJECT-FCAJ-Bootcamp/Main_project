/**
 * DistressLabelingView — Hiển thị kết quả phân tích rủi ro tài chính.
 *
 * Quy tắc: Chỉ hiển thị khi có kết quả thật từ backend (ML job đã hoàn thành
 * hoặc distress engine đã tính toán từ BCTC thực).
 * Không sử dụng dữ liệu mock hay hardcoded.
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, AlertTriangle, XCircle,
  ChevronDown, Loader2, Scale, Zap, Sliders,
  RefreshCw, Info, ShieldAlert, ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/api';

// ── Types
interface DistressRule {
  rule_code: string;
  rule_name: string;
  triggered: boolean;
  weight: number;
  details: string;
}

interface ZComponents {
  x1_wc_ta: number | null;
  x2_re_ta: number | null;
  x3_ebit_ta: number | null;
  x5_rev_ta: number | null;
}

interface DistressResult {
  symbol: string;
  period: string;
  distress_score: number;
  distress_label: 0 | 1;
  distress_status: 'SAFE' | 'GREY' | 'DISTRESS';
  rules: DistressRule[];
  z_score: number | null;
  z_zone: string;
  z_components: ZComponents;
}


// ── Status badge
const StatusBadge: React.FC<{ status: string; score: number }> = ({ status, score }) => {
  const config = {
    SAFE:     { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', icon: <ShieldCheck size={14} /> },
    GREY:     { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   icon: <ShieldAlert size={14} /> },
    DISTRESS: { bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200',      icon: <XCircle size={14} />     },
  }[status] ?? { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: <Info size={14} /> };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${config.bg} ${config.text} ${config.border}`}>
      {config.icon}
      {status} — Score {score}/100
    </div>
  );
};

// ── Score bar
const ScoreBar: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 50 ? 'bg-red-500' : score >= 25 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
};

// ── Z-Score gauge
const ZScoreGauge: React.FC<{ z: number | null; zone: string }> = ({ z, zone }) => {
  if (z === null) return <span className="text-xs text-slate-400">Không đủ dữ liệu</span>;

  const color = zone === 'SAFE' ? 'text-emerald-600' : zone === 'GREY' ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center gap-3">
      <span className={`text-3xl font-bold ${color}`}>{z.toFixed(2)}</span>
      <div>
        <div className={`text-xs font-semibold ${color}`}>{zone}</div>
        <div className="text-xs text-slate-400">Altman Z-Score</div>
      </div>
    </div>
  );
};

// ── Main Component
export const DistressLabelingView: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [inputSymbol, setInputSymbol] = useState('');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // Fetch available symbols from backend
  const { data: companiesData } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => apiClient.get('/companies?limit=500') as Promise<any>,
  });

  const companies = companiesData?.data ?? [];

  // Only fetch distress when user has explicitly searched
  const {
    data: distressData,
    isLoading,
    isError,
    error,
    refetch,
    isFetched,
  } = useQuery<DistressResult>({
    queryKey: ['distress', symbol],
    queryFn: () => apiClient.get(`/distress/${symbol}`) as Promise<DistressResult>,
    enabled: !!symbol,
    retry: false,
  });

  const handleSearch = () => {
    const s = inputSymbol.trim().toUpperCase();
    if (s) setSymbol(s);
  };

  const activeResult = distressData;

  // ── Idle state (no symbol searched yet)
  if (!symbol) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale size={20} className="text-indigo-500" />
            Phân tích Rủi ro Tài chính
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Nhập mã cổ phiếu để phân tích distress score theo Rule-based + Altman Z-Score
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
            Mã chứng khoán
          </label>
          <div className="flex gap-3">
            <input
              id="distress-symbol-input"
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="VD: FPT, VNM, HPG..."
              className="input-field flex-1"
              list="distress-symbols"
            />
            <datalist id="distress-symbols">
              {companies.slice(0, 100).map((c: any) => (
                <option key={c.ticker} value={c.ticker}>{c.name}</option>
              ))}
            </datalist>
            <button
              id="distress-search-btn"
              onClick={handleSearch}
              disabled={!inputSymbol.trim()}
              className="btn-primary px-6"
            >
              Phân tích
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Kết quả được tính từ Báo cáo Tài chính thực trong storage. Cần chạy pipeline trước nếu chưa có dữ liệu.
          </p>
        </div>

        {/* Info card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Scale size={16} />, title: 'Rule-based', desc: '6 quy tắc tài chính theo chuẩn mực Việt Nam (ROE, Equity, EBIT, OCF...)' },
            { icon: <Zap size={16} />, title: 'Altman Z-Score', desc: 'Mô hình Emerging Market 4 thành phần (X1, X2, X3, X5)' },
            { icon: <Sliders size={16} />, title: 'Combined Score', desc: 'Kết hợp 2 phương pháp: 0-24 SAFE, 25-49 GREY, 50-100 DISTRESS' },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2 text-indigo-600">{item.icon}<span className="text-sm font-semibold">{item.title}</span></div>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scale size={20} className="text-indigo-500" />
            Phân tích Rủi ro — {symbol}
          </h1>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <input
              id="distress-symbol-change"
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Mã khác..."
              className="input-field w-32 text-sm"
            />
            <button onClick={handleSearch} className="btn-secondary text-sm">Đổi mã</button>
          </div>
          <button
            onClick={() => refetch()}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw size={13} /> Làm mới
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-indigo-400" />
          <p className="text-sm text-slate-500">Đang phân tích Báo cáo Tài chính của {symbol}...</p>
        </div>
      )}

      {/* Error / No data */}
      {isError && isFetched && !activeResult && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <AlertTriangle size={28} className="text-amber-500 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 mb-1">Không có dữ liệu cho {symbol}</h3>
          <p className="text-sm text-slate-500">
            {(error as any)?.detail ?? 'Mã này chưa có trong storage. Hãy chạy pipeline crawl trước.'}
          </p>
          <button onClick={() => setSymbol('')} className="mt-4 text-sm text-indigo-600 hover:underline">
            ← Quay lại
          </button>
        </div>
      )}

      {/* Results — only shown when real data exists */}
      {activeResult && !isLoading && (
        <>
          {/* Summary card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{symbol}</h2>
                <p className="text-sm text-slate-500">Kỳ báo cáo: <strong>{activeResult.period}</strong></p>
              </div>
              <StatusBadge status={activeResult.distress_status} score={activeResult.distress_score} />
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Điểm Rủi ro</span>
                <span className="font-semibold">{activeResult.distress_score} / 100</span>
              </div>
              <ScoreBar score={activeResult.distress_score} />
              <div className="flex justify-between text-xs text-slate-400">
                <span>SAFE (0–24)</span>
                <span>GREY (25–49)</span>
                <span>DISTRESS (50+)</span>
              </div>
            </div>

            {/* Z-Score */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <ZScoreGauge z={activeResult.z_score} zone={activeResult.z_zone} />
                {activeResult.z_components && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(activeResult.z_components).map(([k, v]) => (
                      <div key={k} className="text-slate-600">
                        <span className="font-medium text-slate-400 mr-1">{k.replace('_', ' ').toUpperCase()}:</span>
                        {v !== null ? v.toFixed(3) : 'N/A'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rule analysis */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Chi tiết Rule-based Analysis</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeResult.rules.filter(r => r.triggered).length}/{activeResult.rules.length} quy tắc kích hoạt
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {activeResult.rules.map((rule) => (
                <div key={rule.rule_code}>
                  <button
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => setExpandedRule(expandedRule === rule.rule_code ? null : rule.rule_code)}
                  >
                    <div className="flex items-center gap-3">
                      {rule.triggered ? (
                        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                          <XCircle size={12} className="text-red-500" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-slate-700">{rule.rule_name}</span>
                        <span className={`ml-2 text-xs font-semibold ${rule.triggered ? 'text-red-500' : 'text-emerald-600'}`}>
                          ({rule.triggered ? `+${rule.weight} điểm` : 'OK'})
                        </span>
                      </div>
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedRule === rule.rule_code ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedRule === rule.rule_code && (
                    <div className="px-14 pb-4">
                      <p className={`text-sm px-3 py-2 rounded-lg ${rule.triggered ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {rule.details}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-500">
            <Info size={14} className="shrink-0 mt-0.5 text-slate-400" />
            <p>
              Kết quả phân tích được tính toán từ Báo cáo Tài chính đã thu thập trong hệ thống storage.
              Đây là công cụ hỗ trợ quyết định, không thay thế đánh giá chuyên gia. Dữ liệu BCTC có thể
              chênh lệch với báo cáo chính thức do làm tròn và đơn vị tính.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
