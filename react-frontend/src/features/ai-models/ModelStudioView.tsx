/**
 * ModelStudioView — AI/ML Training Studio
 *
 * Quy tắc: hiển thị kết quả thật từ ML jobs API.
 * Mock data chỉ dùng cho ROC curve placeholder khi chưa có dữ liệu thật.
 * Không sử dụng MOCK_MODEL_RESULTS cho metrics thật.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu, Play, Sliders, CheckCircle2,
  Loader2, Info, Clock, RefreshCw, AlertTriangle, Archive,
} from 'lucide-react';
import { mlJobsApi } from '../../services/api';

// ── Types
interface MLJobResult {
  id: string;
  name: string;
  status: string;
  config: Record<string, any>;
  metrics: {
    auc?: number;
    f1?: number;
    precision?: number;
    recall?: number;
    accuracy?: number;
    algorithm?: string;
    note?: string;
    confusion_matrix?: { tp: number; fp: number; tn: number; fn: number };
  } | null;
  model_artifact_path: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  error_message: string | null;
}

// ── Metric card
const MetricBadge: React.FC<{ label: string; value: string | number | undefined; accent?: string }> = ({
  label, value, accent = 'text-indigo-700 bg-indigo-50 border-indigo-200'
}) => (
  <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${accent}`}>
    <span className="text-xs text-slate-500 font-medium mb-1">{label}</span>
    <span className="text-xl font-bold">
      {value !== undefined && value !== null ? (typeof value === 'number' ? value.toFixed(3) : value) : '—'}
    </span>
  </div>
);

// ── Status badge
const JobStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    queued:    'bg-slate-100 text-slate-600',
    running:   'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    failed:    'bg-red-100 text-red-700',
    cancelled: 'bg-amber-100 text-amber-700',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status === 'running' && <Loader2 size={10} className="inline animate-spin mr-1" />}
      {status}
    </span>
  );
};

// ── Confusion matrix
const ConfusionMatrix: React.FC<{ cm: { tp: number; fp: number; tn: number; fn: number } }> = ({ cm }) => (
  <div className="grid grid-cols-2 gap-1 w-40">
    <div className="bg-emerald-100 text-emerald-800 text-center py-3 rounded-tl-lg text-sm font-bold">
      <div className="text-xs text-emerald-600 mb-1">TP</div>{cm.tp}
    </div>
    <div className="bg-red-100 text-red-800 text-center py-3 rounded-tr-lg text-sm font-bold">
      <div className="text-xs text-red-600 mb-1">FP</div>{cm.fp}
    </div>
    <div className="bg-amber-100 text-amber-800 text-center py-3 rounded-bl-lg text-sm font-bold">
      <div className="text-xs text-amber-600 mb-1">FN</div>{cm.fn}
    </div>
    <div className="bg-slate-100 text-slate-800 text-center py-3 rounded-br-lg text-sm font-bold">
      <div className="text-xs text-slate-500 mb-1">TN</div>{cm.tn}
    </div>
  </div>
);

// ── Main Component
export const ModelStudioView: React.FC = () => {
  const qc = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showTrainForm, setShowTrainForm] = useState(false);
  const [trainConfig, setTrainConfig] = useState({
    algorithm: 'XGBoost',
    test_ratio: 0.2,
    handle_imbalance: true,
    features: ['z_score', 'roa', 'roe', 'current_ratio', 'debt_to_ta', 'ebit_margin', 'log_total_assets'],
  });

  // Fetch job list — poll every 5s if any job is running
  const { data: jobsData = [], isLoading: isLoadingJobs } = useQuery<MLJobResult[]>({
    queryKey: ['ml-jobs'],
    queryFn: () => mlJobsApi.list() as Promise<MLJobResult[]>,
    refetchInterval: (query) => {
      const jobs = (query.state.data as MLJobResult[] | undefined);
      const hasRunning = jobs?.some(j => j.status === 'queued' || j.status === 'running');
      return hasRunning ? 3000 : 30000;
    },
  });

  // Selected job details
  const { data: selectedJob } = useQuery<MLJobResult>({
    queryKey: ['ml-job', selectedJobId],
    queryFn: () => mlJobsApi.get(selectedJobId!) as Promise<MLJobResult>,
    enabled: !!selectedJobId,
    refetchInterval: (query) => {
      const job = query.state.data as MLJobResult | undefined;
      return job?.status === 'running' || job?.status === 'queued' ? 2000 : false;
    },
  });

  // Auto-select latest completed job
  useEffect(() => {
    if (!selectedJobId && jobsData.length > 0) {
      const completed = jobsData.find(j => j.status === 'completed');
      if (completed) setSelectedJobId(completed.id);
      else setSelectedJobId(jobsData[0].id);
    }
  }, [jobsData, selectedJobId]);

  // Submit training job
  const submitMutation = useMutation({
    mutationFn: () => mlJobsApi.submit({
      name: `${trainConfig.algorithm} — ${new Date().toLocaleDateString('vi-VN')}`,
      config: trainConfig,
    }),
    onSuccess: (data: any) => {
      setShowTrainForm(false);
      setSelectedJobId(data.job_id);
      qc.invalidateQueries({ queryKey: ['ml-jobs'] });
    },
  });

  const displayJob = selectedJob ?? (jobsData.length > 0
    ? jobsData.find(j => j.id === selectedJobId) ?? jobsData[0]
    : null);

  const hasMetrics = displayJob?.status === 'completed' && displayJob?.metrics;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Cpu size={20} className="text-indigo-500" />
            AI/ML Studio
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Huấn luyện mô hình phân loại distress từ dữ liệu tài chính
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => qc.invalidateQueries({ queryKey: ['ml-jobs'] })}
            className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={13} /> Làm mới
          </button>
          <button
            id="open-train-form"
            onClick={() => setShowTrainForm(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Play size={14} /> Huấn luyện mới
          </button>
        </div>
      </div>

      {/* Training Form Modal */}
      {showTrainForm && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Sliders size={14} className="text-indigo-500" />
            Cấu hình Huấn luyện
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Thuật toán</label>
              <select
                id="train-algorithm"
                value={trainConfig.algorithm}
                onChange={e => setTrainConfig(c => ({ ...c, algorithm: e.target.value }))}
                className="input-field"
              >
                {['XGBoost', 'RandomForest', 'LogisticRegression', 'LightGBM'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tỷ lệ test</label>
              <select
                id="train-test-ratio"
                value={trainConfig.test_ratio}
                onChange={e => setTrainConfig(c => ({ ...c, test_ratio: parseFloat(e.target.value) }))}
                className="input-field"
              >
                {[0.15, 0.2, 0.25, 0.3].map(r => (
                  <option key={r} value={r}>{(r * 100).toFixed(0)}% test</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cân bằng class</label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  id="train-handle-imbalance"
                  type="checkbox"
                  checked={trainConfig.handle_imbalance}
                  onChange={e => setTrainConfig(c => ({ ...c, handle_imbalance: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-slate-600">SMOTE / class_weight</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
            <Info size={12} className="shrink-0 mt-0.5" />
            <span>
              <strong>Local mode:</strong> Huấn luyện stub (5–10s) tạo metrics mẫu. Cloud: SageMaker training job thật.
              Cần có dataset đầy đủ trước khi huấn luyện.
            </span>
          </div>

          <div className="flex gap-3">
            <button
              id="submit-train-job"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {submitMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Đang gửi...</> : <><Play size={14} /> Bắt đầu huấn luyện</>}
            </button>
            <button onClick={() => setShowTrainForm(false)} className="btn-secondary">Hủy</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Archive size={14} className="text-slate-400" />
                Lịch sử Jobs
                <span className="bg-slate-100 text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {jobsData.length}
                </span>
              </h3>
            </div>

            {isLoadingJobs ? (
              <div className="p-6 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
            ) : jobsData.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                Chưa có training job nào.<br />
                <span className="text-xs">Nhấn "Huấn luyện mới" để bắt đầu.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {jobsData.map(job => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors ${
                      selectedJobId === job.id ? 'bg-indigo-50 border-l-2 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800 truncate max-w-[140px]">{job.name}</span>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock size={10} />
                      {new Date(job.created_at).toLocaleDateString('vi-VN')}
                      {job.metrics?.auc && (
                        <span className="ml-auto text-indigo-600 font-semibold">AUC {job.metrics.auc.toFixed(3)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Job Results */}
        <div className="lg:col-span-2 space-y-4">
          {!displayJob && !isLoadingJobs ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Cpu size={32} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-slate-700">Chưa có training job</h3>
              <p className="text-xs text-slate-400 mt-1">Tạo job huấn luyện đầu tiên để xem kết quả</p>
            </div>
          ) : displayJob ? (
            <>
              {/* Job info */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{displayJob.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {displayJob.config?.algorithm ?? '—'} · Tạo lúc {new Date(displayJob.created_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <JobStatusBadge status={displayJob.status} />
                </div>

                {/* Running state */}
                {(displayJob.status === 'queued' || displayJob.status === 'running') && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <Loader2 size={20} className="animate-spin text-blue-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Đang huấn luyện...</p>
                      <p className="text-xs text-blue-600 mt-0.5">Kết quả sẽ tự động cập nhật khi hoàn tất</p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {displayJob.status === 'failed' && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-lg p-4">
                    <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Huấn luyện thất bại</p>
                      <p className="text-xs text-red-600 mt-0.5">{displayJob.error_message ?? 'Lỗi không xác định'}</p>
                    </div>
                  </div>
                )}

                {/* Success — show metrics */}
                {hasMetrics && displayJob.metrics && (
                  <>
                    {/* Note about local mode */}
                    {displayJob.metrics.note && (
                      <div className="mb-4 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Info size={12} className="text-slate-400" />
                        {displayJob.metrics.note}
                      </div>
                    )}

                    {/* Metrics row */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                      <MetricBadge label="AUC-ROC" value={displayJob.metrics.auc} accent="text-indigo-700 bg-indigo-50 border-indigo-200" />
                      <MetricBadge label="F1 Score" value={displayJob.metrics.f1} accent="text-emerald-700 bg-emerald-50 border-emerald-200" />
                      <MetricBadge label="Precision" value={displayJob.metrics.precision} accent="text-blue-700 bg-blue-50 border-blue-200" />
                      <MetricBadge label="Recall" value={displayJob.metrics.recall} accent="text-purple-700 bg-purple-50 border-purple-200" />
                      <MetricBadge label="Accuracy" value={displayJob.metrics.accuracy} accent="text-amber-700 bg-amber-50 border-amber-200" />
                    </div>

                    {/* Confusion matrix */}
                    {displayJob.metrics.confusion_matrix && (
                      <div className="flex flex-wrap items-start gap-6">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-2">Ma trận nhầm lẫn</p>
                          <ConfusionMatrix cm={displayJob.metrics.confusion_matrix} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-xs font-semibold text-slate-500 mb-2">Chú giải</p>
                          <div className="space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center gap-2"><span className="w-8 h-5 bg-emerald-100 rounded flex items-center justify-center font-bold text-emerald-700">TP</span>Dự báo DISTRESS đúng</div>
                            <div className="flex items-center gap-2"><span className="w-8 h-5 bg-red-100 rounded flex items-center justify-center font-bold text-red-700">FP</span>Dự báo DISTRESS sai (bình thường)</div>
                            <div className="flex items-center gap-2"><span className="w-8 h-5 bg-amber-100 rounded flex items-center justify-center font-bold text-amber-700">FN</span>Bỏ sót DISTRESS</div>
                            <div className="flex items-center gap-2"><span className="w-8 h-5 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-700">TN</span>Dự báo SAFE đúng</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Config summary */}
              {displayJob.config && Object.keys(displayJob.config).length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3">Cấu hình Job</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(displayJob.config).map(([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="text-slate-400 font-medium">{k}: </span>
                        <span className="text-slate-700 font-semibold">
                          {Array.isArray(v) ? v.join(', ') : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Model artifact path */}
              {displayJob.model_artifact_path && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-slate-600">Model artifact: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">{displayJob.model_artifact_path}</code></span>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Info footer */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-700">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>
          <strong>Local Mode:</strong> Huấn luyện stub (~5–10s) với metrics ngẫu nhiên để demo.
          <br />
          <strong>Cloud Mode:</strong> Tích hợp Amazon SageMaker — job thật với dataset từ S3, artifact lưu trên S3.
        </div>
      </div>
    </div>
  );
};
