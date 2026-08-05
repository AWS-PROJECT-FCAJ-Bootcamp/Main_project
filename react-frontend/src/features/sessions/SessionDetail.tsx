import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Database,
  Loader2,
  Trash2,
  RefreshCw,
  FileJson,
  Tag,
} from 'lucide-react';
import { deleteSession, getSessionById } from './sessionData';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const SessionDetail: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: session, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSessionById(sessionId ?? ''),
    enabled: !!sessionId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate('/sessions');
    },
  });

  if (!sessionId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3">
          <Database size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-800">Thiếu session ID</p>
          <Link to="/sessions" className="btn-primary inline-flex">
            Về danh sách session
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-slate-200 bg-white p-12 flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500">Đang tải session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/sessions" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={14} /> Quay lại
          </Link>
          <button onClick={() => refetch()} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Làm mới
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3">
          <FileJson size={32} className="mx-auto text-slate-300" />
          <div>
            <p className="text-sm font-semibold text-slate-800">Không tìm thấy session này</p>
            <p className="text-xs text-slate-500 mt-1">
              Session có thể đã bị xóa hoặc backend chưa đồng bộ dữ liệu.
            </p>
          </div>
          <Link to="/sessions" className="btn-primary inline-flex">
            Về danh sách session
          </Link>
        </div>
      </div>
    );
  }

  const paramEntries = Object.entries(session.params ?? {});

  return (
    <div className="p-6 space-y-6 max-w-screen-lg mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Link to="/sessions" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700">
            <ArrowLeft size={14} /> Quay lại danh sách session
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{session.name}</h1>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${session.source === 'api' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {session.source}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {session.description || 'Session lưu lại tham số truy vấn và cấu hình phân tích.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button onClick={() => refetch()} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Làm mới
          </button>
          <button
            onClick={() => deleteMutation.mutate(session.id)}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Xóa session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Database size={15} className="text-indigo-600" /> Thông tin session
              </h2>
              <span className="text-xs text-slate-400 font-mono">{session.id}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Tạo lúc</div>
                <div className="font-medium text-slate-800 flex items-center gap-2">
                  <CalendarDays size={13} className="text-indigo-500" /> {formatDateTime(session.created_at)}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Cập nhật</div>
                <div className="font-medium text-slate-800">{formatDateTime(session.updated_at)}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Số tham số</div>
                <div className="font-medium text-slate-800">{session.item_count}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileJson size={15} className="text-indigo-600" /> Params JSON
              </h2>
              <span className="text-xs text-slate-400">Preview cấu hình</span>
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-6 bg-slate-950 text-slate-100 font-mono">
              {JSON.stringify(session.params ?? {}, null, 2)}
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Tag size={15} className="text-indigo-600" /> Trường dữ liệu nổi bật
            </h2>

            {paramEntries.length === 0 ? (
              <p className="text-sm text-slate-500">Session này chưa có tham số cụ thể.</p>
            ) : (
              <div className="space-y-3">
                {paramEntries.slice(0, 12).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold mb-1">{key}</div>
                    <div className="text-sm text-slate-800 font-medium break-words">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-xl border border-indigo-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Gợi ý dùng lại</h3>
            <p className="text-sm text-slate-600">
              Dùng session này làm đầu vào cho Model Studio hoặc để đối chiếu kết quả sau khi rerun pipeline.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/ai-studio" className="btn-primary inline-flex text-sm">
                Mở ML Studio
              </Link>
              <Link to="/explorer" className="btn-secondary inline-flex text-sm">
                Mở Data Explorer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
