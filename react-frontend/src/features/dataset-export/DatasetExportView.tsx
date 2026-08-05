/**
 * DatasetExportView — Xuất bộ dữ liệu huấn luyện ML.
 *
 * Yêu cầu:
 * - Phân trang khi dữ liệu nhiều
 * - Ghi rõ lý do thiếu dữ liệu (doanh nghiệp chưa niêm yết, chưa crawl, etc.)
 * - Không dùng dữ liệu mock — chỉ hiển thị từ API
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet, FileCode, CheckCircle2,
  Info, Table, Search, Loader2, ChevronLeft, ChevronRight,
  AlertTriangle, RefreshCw, Database,
} from 'lucide-react';
import { apiClient } from '../../services/api';

interface DatasetRow {
  ticker: string;
  company_name?: string;
  year?: string;
  period?: string;
  exchange?: string;
  industry?: string;
  roa?: number;
  roe?: number;
  current_ratio?: number;
  debt_to_ta?: number;
  ebit_margin?: number;
  log_total_assets?: number;
  z_score?: number;
  distress_label?: number;
  missing_reason?: string | null;
}

interface DatasetSummary {
  total_rows: number;
  total_companies: number;
  year_range?: string;
  label_0_count?: number;
  label_1_count?: number;
  distress_ratio_pct?: number;
  missing_rows?: number;
  missing_reasons?: Record<string, number>;
}

const PAGE_SIZE = 50;

// ── Missing Reason Badge
const MissingBadge: React.FC<{ reason: string }> = ({ reason }) => (
  <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
    <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-500" />
    <span>{reason}</span>
  </div>
);

// ── Stat card
const StatCard: React.FC<{ label: string; value: string | number; sub?: string; accent?: string }> = ({
  label, value, sub, accent = 'text-indigo-600'
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4">
    <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
    <p className={`text-2xl font-bold ${accent}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
    {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

export const DatasetExportView: React.FC = () => {
  const [filterLabel, setFilterLabel] = useState<'ALL' | '0' | '1'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Fetch dataset from backend with pagination
  const { data: apiData, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['dataset-preview', page, filterLabel, searchTerm],
    queryFn: (): Promise<any> => apiClient.get('/dataset/preview', {
      params: { page, page_size: PAGE_SIZE }
    }),
    placeholderData: (prev: any) => prev,
  });

  const rows: DatasetRow[] = (apiData as any)?.data?.rows ?? (apiData as any)?.rows ?? [];
  const summary: DatasetSummary = (apiData as any)?.data?.summary ?? (apiData as any)?.summary ?? {};
  const totalRows = summary.total_rows ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

  // Client-side filter on top of server data
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterLabel !== 'ALL' && r.distress_label?.toString() !== filterLabel) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        if (!r.ticker?.toLowerCase().includes(t) && !r.company_name?.toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [rows, filterLabel, searchTerm]);

  // Missing rows with reasons
  const missingRows = filteredRows.filter(r => r.missing_reason);
  const validRows = filteredRows.filter(r => !r.missing_reason);

  // ── Export handlers
  const handleExport = (format: 'CSV' | 'EXCEL' | 'PARQUET') => {
    setDownloadingFormat(format);
    setExportNotice(null);

    try {
      const exportRows = validRows;
      let content = '';
      let mimeType = 'text/csv;charset=utf-8;';
      let extension = 'csv';
      const BOM = '\uFEFF';

      if (format === 'CSV') {
        const headers = 'Ticker,Tên công ty,Kỳ/Năm,Sàn,Ngành,ROA(%),ROE(%),CurrentRatio,DebtRatio,EBITMargin(%),LogAssets,ZScore,DistressLabel\n';
        const body = exportRows.map(r =>
          `${r.ticker},"${r.company_name ?? ''}","${r.year ?? r.period ?? ''}","${r.exchange ?? ''}","${r.industry ?? ''}",${r.roa ?? ''},${r.roe ?? ''},${r.current_ratio ?? ''},${r.debt_to_ta ?? ''},${r.ebit_margin ?? ''},${r.log_total_assets ?? ''},${r.z_score ?? ''},${r.distress_label ?? ''}`
        ).join('\n');
        content = BOM + headers + body;
        extension = 'csv';
      } else if (format === 'EXCEL') {
        const headers = 'Ticker\tTên công ty\tKỳ/Năm\tSàn\tNgành\tROA(%)\tROE(%)\tCurrentRatio\tDebtRatio\tEBITMargin(%)\tLogAssets\tZScore\tDistressLabel\n';
        const body = exportRows.map(r =>
          `${r.ticker}\t${r.company_name ?? ''}\t${r.year ?? r.period ?? ''}\t${r.exchange ?? ''}\t${r.industry ?? ''}\t${r.roa ?? ''}\t${r.roe ?? ''}\t${r.current_ratio ?? ''}\t${r.debt_to_ta ?? ''}\t${r.ebit_margin ?? ''}\t${r.log_total_assets ?? ''}\t${r.z_score ?? ''}\t${r.distress_label ?? ''}`
        ).join('\n');
        content = BOM + headers + body;
        mimeType = 'application/vnd.ms-excel;charset=utf-8;';
        extension = 'xls';
      } else {
        setExportNotice('Parquet: vui lòng sử dụng nút Export từ API endpoint /dataset/export?format=PARQUET');
        setDownloadingFormat(null);
        return;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_distress_dataset.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportNotice(`Đã xuất ${exportRows.length} dòng sang ${format}`);
    } catch (e) {
      setExportNotice(`Lỗi xuất file: ${e}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // ── Loading
  if (isLoading) return (
    <div className="p-6 flex flex-col items-center justify-center h-64 gap-4">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
      <p className="text-sm text-slate-500">Đang tải dataset...</p>
    </div>
  );

  // ── Error / Empty
  if (isError || rows.length === 0) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <AlertTriangle size={28} className="text-amber-500 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-800 mb-1">Chưa có dataset</h3>
        <p className="text-sm text-slate-500 mb-4">
          Dataset được tạo sau khi đã chạy pipeline → tính Financial Ratios → Gán nhãn Distress.
          <br />Hãy hoàn thành quy trình trước khi xuất dữ liệu.
        </p>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 mx-auto">
          <RefreshCw size={14} /> Tải lại
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-indigo-500" />
            Xuất Dataset ML
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bộ dữ liệu huấn luyện phân tích rủi ro tài chính doanh nghiệp
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tổng dòng dữ liệu" value={summary.total_rows ?? validRows.length} />
        <StatCard label="Số doanh nghiệp" value={summary.total_companies ?? '—'} />
        <StatCard
          label="Nhãn DISTRESS (1)"
          value={summary.label_1_count ?? validRows.filter(r => r.distress_label === 1).length}
          sub={summary.distress_ratio_pct ? `${summary.distress_ratio_pct.toFixed(1)}% tổng` : undefined}
          accent="text-red-600"
        />
        <StatCard
          label="Thiếu dữ liệu"
          value={summary.missing_rows ?? missingRows.length}
          accent="text-amber-600"
        />
      </div>

      {/* Missing data reasons */}
      {missingRows.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            Dữ liệu thiếu hụt ({missingRows.length} dòng)
          </h3>
          <div className="space-y-2">
            {missingRows.slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-sm font-semibold text-slate-700 w-16 shrink-0">{r.ticker}</span>
                <MissingBadge reason={r.missing_reason!} />
              </div>
            ))}
            {missingRows.length > 10 && (
              <p className="text-xs text-slate-400 mt-2">... và {missingRows.length - 10} dòng khác</p>
            )}
          </div>
        </div>
      )}

      {/* Export buttons */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Xuất file</h3>
        <div className="flex flex-wrap gap-3">
          {([
            { fmt: 'CSV' as const, icon: <Table size={14} />, label: 'CSV (UTF-8 BOM)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
            { fmt: 'EXCEL' as const, icon: <FileSpreadsheet size={14} />, label: 'Excel (.xls)', color: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' },
            { fmt: 'PARQUET' as const, icon: <FileCode size={14} />, label: 'Parquet', color: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100' },
          ] as const).map(({ fmt, icon, label, color }) => (
            <button
              key={fmt}
              id={`export-${fmt.toLowerCase()}`}
              onClick={() => handleExport(fmt)}
              disabled={downloadingFormat !== null}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${color}`}
            >
              {downloadingFormat === fmt ? <Loader2 size={14} className="animate-spin" /> : icon}
              {downloadingFormat === fmt ? 'Đang xuất...' : label}
            </button>
          ))}
        </div>
        {exportNotice && (
          <div className={`mt-3 flex items-center gap-2 text-sm ${exportNotice.startsWith('Lỗi') ? 'text-red-600' : 'text-emerald-600'}`}>
            <CheckCircle2 size={14} />
            {exportNotice}
          </div>
        )}
      </div>

      {/* Data Table with Pagination */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="dataset-search"
                type="text"
                placeholder="Tìm mã / tên công ty..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="input-field pl-9 pr-4 py-2 text-sm w-52"
              />
            </div>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {(['ALL', '0', '1'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => { setFilterLabel(l); setPage(1); }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                    filterLabel === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {l === 'ALL' ? 'Tất cả' : l === '0' ? '✅ Safe' : '⚠️ Distress'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Database size={12} />
            Hiển thị {filteredRows.length} / {totalRows} dòng
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {['Mã', 'Tên công ty', 'Kỳ', 'Sàn', 'Ngành', 'ROA%', 'ROE%', 'CR', 'Debt', 'EBIT%', 'Z-Score', 'Label'].map(h => (
                  <th key={h} className="table-header whitespace-nowrap text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRows.map((r, i) => (
                <tr key={`${r.ticker}-${r.year ?? r.period}-${i}`} className={`table-row ${r.missing_reason ? 'bg-amber-50/50' : ''}`}>
                  <td className="table-cell font-semibold text-indigo-700">{r.ticker}</td>
                  <td className="table-cell text-slate-600 max-w-[160px] truncate">
                    {r.company_name ?? '—'}
                    {r.missing_reason && (
                      <div className="text-xs text-amber-600 mt-0.5 font-normal flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {r.missing_reason.slice(0, 60)}{r.missing_reason.length > 60 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td className="table-cell">{r.year ?? r.period ?? '—'}</td>
                  <td className="table-cell">
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                      {r.exchange ?? '—'}
                    </span>
                  </td>
                  <td className="table-cell text-slate-500 max-w-[120px] truncate">{r.industry ?? '—'}</td>
                  <td className={`table-cell text-right font-medium ${r.roa != null && r.roa < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                    {r.roa != null ? r.roa.toFixed(2) : '—'}
                  </td>
                  <td className={`table-cell text-right font-medium ${r.roe != null && r.roe < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                    {r.roe != null ? r.roe.toFixed(2) : '—'}
                  </td>
                  <td className={`table-cell text-right ${r.current_ratio != null && r.current_ratio < 1 ? 'text-amber-600 font-semibold' : 'text-slate-700'}`}>
                    {r.current_ratio != null ? r.current_ratio.toFixed(2) : '—'}
                  </td>
                  <td className={`table-cell text-right ${r.debt_to_ta != null && r.debt_to_ta > 0.7 ? 'text-red-500 font-semibold' : 'text-slate-700'}`}>
                    {r.debt_to_ta != null ? r.debt_to_ta.toFixed(2) : '—'}
                  </td>
                  <td className={`table-cell text-right ${r.ebit_margin != null && r.ebit_margin < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                    {r.ebit_margin != null ? r.ebit_margin.toFixed(2) : '—'}
                  </td>
                  <td className={`table-cell text-right font-semibold ${
                    r.z_score == null ? 'text-slate-400' :
                    r.z_score < 1.1 ? 'text-red-600' :
                    r.z_score < 2.6 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {r.z_score != null ? r.z_score.toFixed(2) : '—'}
                  </td>
                  <td className="table-cell text-center">
                    {r.distress_label === 1 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        ⚠ 1
                      </span>
                    ) : r.distress_label === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ✓ 0
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Trang {page} / {totalPages} ({totalRows.toLocaleString()} dòng tổng)
            </p>
            <div className="flex items-center gap-2">
              <button
                id="dataset-prev-page"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      pageNum === page
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                id="dataset-next-page"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Footer notes */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
          <Info size={12} className="shrink-0 mt-0.5" />
          <span>
            Màu đỏ: giá trị âm/nguy hiểm. Màu vàng: vùng cảnh báo. Z-Score: xanh ≥2.6 (SAFE), vàng 1.1–2.6 (GREY), đỏ &lt;1.1 (DISTRESS).
            Dòng có ⚠ thiếu dữ liệu do doanh nghiệp chưa niêm yết vào kỳ đó hoặc chưa được crawl.
          </span>
        </div>
      </div>
    </div>
  );
};
