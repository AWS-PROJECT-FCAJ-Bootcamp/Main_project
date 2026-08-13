import React, { useState, useEffect } from 'react';
import {
  Download,
  Play,
  Terminal,
  Database,
  RefreshCw,
  Info,
  Layers,
  FileCheck,
} from 'lucide-react';
import { runPipeline, getPrices } from '@/services/api';
import type { PriceData } from '@/types';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/Select';

export const DataExplorer: React.FC = () => {
  const [dataSource, setDataSource] = useState('VNSTOCK_FREE');
  const [selectedTickers, setSelectedTickers] = useState('');
  const [startDate, setStartDate] = useState('2025-05-09');
  const [endDate, setEndDate] = useState('2026-08-07');
  const [intervalVal, setIntervalVal] = useState('1D');

  const [isIngesting, setIsIngesting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: 'INFO' | 'SUCCESS' | 'ERROR'; message: string }>>([]);
  const [pipelineResult, setPipelineResult] = useState<any>(null);
  const [ingestedTickers, setIngestedTickers] = useState<string[]>([]);

  const [previewTicker, setPreviewTicker] = useState('');
  const [previewData, setPreviewData] = useState<PriceData[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const addLog = (level: 'INFO' | 'SUCCESS' | 'ERROR', message: string) => {
    const timestamp = new Date().toTimeString().split(' ')[0] + '.' + String(new Date().getMilliseconds()).padStart(3, '0');
    setLogs((prev) => [...prev, { timestamp, level, message }]);
  };

  const handleQuickGroup = (group: string) => {
    if (group === 'VN30') setSelectedTickers('FPT, VNM, VCB, HPG, VPB, TCB, MBB, MWG, VIC, VHM');
    if (group === 'BANK') setSelectedTickers('VCB, BID, CTG, TCB, MBB, VPB, ACB, STB');
    if (group === 'TECH') setSelectedTickers('FPT, CMG, ELC, SAM');
  };

  const handleTriggerIngestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTickers.trim()) return;

    const rawTickers = selectedTickers
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const invalidTickers = rawTickers.filter((t) => !/^[A-Za-z0-9._-]+$/.test(t));
    if (invalidTickers.length > 0) {
      alert(`Mã chứng khoán không hợp lệ: "${invalidTickers.join('", "')}". Mã chỉ được chứa chữ cái, số, dấu chấm (.), dấu gạch dưới (_), hoặc dấu gạch ngang (-).`);
      return;
    }

    const tickers = rawTickers.map((t) => t.toUpperCase());
    if (tickers.length === 0) return;

    setIsIngesting(true);
    setProgressPct(10);
    setPipelineResult(null);
    setLogs([]);

    addLog('INFO', `Khởi tạo tiến trình Ingestion từ nguồn [${dataSource}]...`);
    addLog('INFO', `Danh sách mã yêu cầu (${tickers.length} tickers): ${tickers.join(', ')}`);
    addLog('INFO', `Khoảng thời gian: ${startDate} đến ${endDate} | Interval: ${intervalVal}`);

    let timerId: any = null;
    timerId = window.setInterval(() => {
      setProgressPct((prev) => (prev >= 85 ? 85 : prev + 15));
    }, 400);

    try {
      const startTime = performance.now();
      const res = await runPipeline(tickers, startDate, endDate, intervalVal);
      if (timerId) clearInterval(timerId);
      setProgressPct(100);

      const endTime = performance.now();
      const elapsedMs = Math.round(endTime - startTime);

      const rawRes = (res as any)?.ingestion ? res : (res as any)?.data ? (res as any).data : res;
      const ingestionObj = rawRes?.ingestion || rawRes || { requested: tickers.length, passed: 0, failed: tickers.length, details: [] };

      setPipelineResult({ ingestion: ingestionObj });

      const requestedCount = ingestionObj.requested ?? tickers.length;
      const passedCount = ingestionObj.passed ?? 0;
      const failedCount = ingestionObj.failed ?? 0;

      addLog('INFO', `Hoàn tất phản hồi HTTP API trong ${elapsedMs}ms.`);
      addLog('INFO', `Tổng quan kết quả cào: Tổng yêu cầu=${requestedCount} | Thành công=${passedCount} | Thất bại=${failedCount}`);

      const detailsList = ingestionObj.details ?? [];

      if (detailsList.length > 0) {
        detailsList.forEach((d: { ticker: string; status: string; rows?: number; error_code?: string }) => {
          if (d.status === 'PASS') {
            addLog('SUCCESS', `✅ Ticker [${d.ticker}]: Cào & Kiểm duyệt HỢP LỆ (${d.rows || 0} nến) → Đã lưu vào Data Lake.`);
          } else {
            addLog('ERROR', `❌ Ticker [${d.ticker}]: THẤT BẠI (${d.error_code || 'SOURCE_ERROR'} — Mã không tồn tại hoặc nhà cung cấp dữ liệu không có sẵn). KHÔNG lưu file.`);
          }
        });
      }

      const passedTickers = detailsList
        .filter((d: { status: string; ticker: string }) => d.status === 'PASS')
        .map((d: { status: string; ticker: string }) => d.ticker);

      if (passedTickers.length > 0) {
        setIngestedTickers((prev) => Array.from(new Set([...prev, ...passedTickers])));
        setPreviewTicker(passedTickers[0]);
        addLog('SUCCESS', `🎉 ĐÃ NẠP THÀNH CÔNG ${passedTickers.length}/${requestedCount} MÃ CỔ PHIẾU VÀO DATA LAKE!`);
      } else {
        addLog('ERROR', `⚠️ KHÔNG CÓ MÃ NÀO NẠP THÀNH CÔNG! Vui lòng kiểm tra lại mã chứng khoán (Ví dụ: FPT, VNM, VCB, HPG).`);
      }
    } catch (err: unknown) {
      if (timerId) clearInterval(timerId);
      setProgressPct(0);
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi gọi pipeline API.';
      addLog('ERROR', `Pipeline Ingestion Thất Bại: ${errorMsg}`);
      alert(`Lỗi thực thi Pipeline: ${errorMsg}`);
    } finally {
      setIsIngesting(false);
    }
  };

  useEffect(() => {
    if (!previewTicker) return;
    setIsLoadingPreview(true);
    getPrices(previewTicker, undefined, undefined, 100)
      .then((res) => setPreviewData(res.data ?? []))
      .catch(() => setPreviewData([]))
      .finally(() => setIsLoadingPreview(false));
  }, [previewTicker]);

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto pb-12">
      {/* ── Feature Purpose Banner ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base font-sans">
          <Info size={20} className="text-blue-600 flex-shrink-0" />
          <span>KHÁM PHÁ VÀ KÍCH HOẠT CÀO DỮ LIỆU (DATA EXPLORER &amp; INGESTION)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 space-y-1">
            <span className="font-bold text-blue-900 flex items-center gap-1.5 font-sans">
              <Download size={14} className="text-blue-600" /> 1. MỤC ĐÍCH TRANG
            </span>
            <p className="leading-relaxed text-slate-600 font-sans">
              Nhập danh sách mã cổ phiếu để kích hoạt tiến trình cào nến lịch sử thực tế từ Vnstock API / Yahoo Finance.
            </p>
          </div>
          <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100 space-y-1">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5 font-sans">
              <FileCheck size={14} className="text-emerald-600" /> 2. PARQUET DATA LAKE
            </span>
            <p className="leading-relaxed text-slate-600 font-sans">
              Dữ liệu hợp lệ được tự động lưu dạng Parquet nén trực tiếp trong AWS S3 Data Lake.
            </p>
          </div>
          <div className="bg-slate-100/80 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 font-sans">
              <Terminal size={14} className="text-slate-700" /> 3. LOG REAL-TIME
            </span>
            <p className="leading-relaxed text-slate-600 font-sans">
              Terminal hiển thị log trực tiếp từng mã thành công (PASS) hoặc thất bại (FAIL) kèm lý do.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Ingestion Form Card ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2 border-b border-slate-100 pb-3 font-sans">
          <Layers size={16} className="text-blue-600" /> THIẾT LẬP THAM SỐ CÀO DỮ LIỆU (INGESTION CONFIG)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Nguồn Dữ Liệu (API Provider)"
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
            options={[
              { value: 'VNSTOCK_FREE', label: 'Vnstock API' },
              { value: 'YAHOO_FINANCE', label: 'Yahoo Finance' },
            ]}
          />

          <Input
            label="Từ Ngày (Start Date)"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="font-mono"
          />

          <Input
            label="Đến Ngày (End Date)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="font-mono"
          />

          <Select
            label="Tần Suất Nến (Interval)"
            value={intervalVal}
            onChange={(e) => setIntervalVal(e.target.value)}
            options={[
              { value: '1D', label: '1D — Daily Candlestick' },
              { value: '1W', label: '1W — Weekly Candlestick' },
              { value: '1M', label: '1M — Monthly Candlestick' },
            ]}
          />
        </div>

        {/* Ticker Selection Input */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-bold text-slate-700 font-sans">
              DANH SÁCH MÃ CỔ PHIẾU CẦN CÀO (CÁCH NHAU BỞI DẤU PHẨY)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickGroup('VN30')}
                className="text-[11px] px-2.5 py-1 rounded-lg font-sans font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 cursor-pointer transition-all"
              >
                + Nhóm VN30
              </button>
              <button
                type="button"
                onClick={() => handleQuickGroup('BANK')}
                className="text-[11px] px-2.5 py-1 rounded-lg font-sans font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer transition-all"
              >
                + Ngân Hàng
              </button>
              <button
                type="button"
                onClick={() => handleQuickGroup('TECH')}
                className="text-[11px] px-2.5 py-1 rounded-lg font-sans font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer transition-all"
              >
                + Công Nghệ
              </button>
            </div>
          </div>

          <Input
            value={selectedTickers}
            onChange={(e) => setSelectedTickers(e.target.value)}
            placeholder="Ví dụ: FPT, VNM, VCB, HPG"
            className="uppercase font-mono font-bold text-blue-700"
          />
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
          <div className="text-xs font-sans text-slate-500">
            Dữ liệu sẽ được làm sạch và lưu tại: <code className="text-blue-600 font-extrabold font-mono">AWS S3 Data Lake</code>
          </div>

          <button
            type="button"
            onClick={handleTriggerIngestion}
            disabled={isIngesting}
            className="btn-primary py-3 px-8 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-200 font-sans"
          >
            {isIngesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            {isIngesting ? `Đang cào dữ liệu từ ${dataSource}...` : '🚀 KÍCH HOẠT CÀO DỮ LIỆU (TRIGGER INGESTION)'}
          </button>
        </div>

        {/* Progress Bar */}
        {isIngesting && (
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-sans text-blue-700 font-bold">
              <span>Đang kết nối API nguồn [{dataSource}] và trích xuất dữ liệu...</span>
              <span className="font-mono">{progressPct}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 shadow-inner">
              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Live Log Terminal ── */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Terminal size={16} className="text-emerald-400" /> INGESTION PIPELINE LIVE LOG TERMINAL
          </h3>
          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded font-mono border border-slate-700">
            Real-time Stream
          </span>
        </div>

        <div className="h-48 overflow-y-auto space-y-1.5 text-xs pr-2 text-slate-300 custom-scrollbar">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic font-mono">Sẵn sàng. Nhấn "Kích hoạt cào dữ liệu" để bắt đầu tiến trình...</p>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span
                  className={`font-bold shrink-0 px-1.5 py-0.5 rounded text-[10px] ${
                    log.level === 'SUCCESS'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : log.level === 'ERROR'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-slate-800 text-blue-300'
                  }`}
                >
                  {log.level}
                </span>
                <span className={log.level === 'SUCCESS' ? 'text-emerald-400' : log.level === 'ERROR' ? 'text-rose-300' : 'text-slate-300'}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Ingestion Result Summary & Parquet Data Preview ── */}
      {pipelineResult && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 font-sans flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database size={16} className="text-blue-600" /> XEM TRƯỚC DỮ LIỆU VỪA CÀO THÀNH CÔNG (DATA PREVIEW)
          </h3>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 font-sans">CHỌN MÃ XEM TRƯỚC:</span>
            <div className="flex gap-2 flex-wrap">
              {ingestedTickers.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPreviewTicker(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-extrabold cursor-pointer transition-all ${
                    previewTicker === t
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {isLoadingPreview ? (
            <div className="p-8 text-center text-xs font-mono text-slate-500">Đang đọc dữ liệu mã {previewTicker}...</div>
          ) : previewData.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 bg-slate-50 rounded-xl">
              Chưa có dữ liệu cho mã {previewTicker}.
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar border border-slate-200/80 rounded-xl">
              <table className="w-full text-xs text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-sans border-b border-slate-200">
                    <th className="px-4 py-3 font-bold">Ngày Giao Dịch</th>
                    <th className="px-4 py-3 text-right font-bold">Mở Cửa (Open)</th>
                    <th className="px-4 py-3 text-right font-bold">Cao Nhất (High)</th>
                    <th className="px-4 py-3 text-right font-bold">Thấp Nhất (Low)</th>
                    <th className="px-4 py-3 text-right font-bold">Đóng Cửa (Close)</th>
                    <th className="px-4 py-3 text-right font-bold">Khối Lượng (Volume)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {previewData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700 font-semibold">{row.trading_date.split('T')[0]}</td>
                      <td className="px-4 py-2.5 text-right">{row.open_price.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">{row.high_price.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2.5 text-right text-rose-600 font-semibold">{row.low_price.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-blue-700">{row.close_price.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-2.5 text-right text-slate-800">{row.volume.toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
