import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock3,
  Database,
  FileJson,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Eye,
} from 'lucide-react';
import { createSession, deleteSession, listSessions, type SavedSession } from './sessionData';

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const sessionSummary = (session: SavedSession) => {
  const entries = Object.entries(session.params ?? {});
  if (entries.length === 0) return 'Không có tham số';
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
    .join(' · ');
};

export const SessionList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [paramsText, setParamsText] = useState(JSON.stringify({ ticker: 'FPT', periodType: 'YEARLY' }, null, 2));
  const [formError, setFormError] = useState<string | null>(null);

  const { data: sessions = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: listSessions,
  });

  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return sessions;
    const term = searchTerm.trim().toLowerCase();
    return sessions.filter((session) => {
      const haystack = [session.name, session.description ?? '', JSON.stringify(session.params), session.id].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [searchTerm, sessions]);

  const createMutation = useMutation({
    mutationFn: createSession,
    onSuccess: async (session) => {
      setName('');
      setDescription('');
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate(`/sessions/${session.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    let parsedParams: Record<string, any>;
    try {
      parsedParams = JSON.parse(paramsText);
      if (typeof parsedParams !== 'object' || parsedParams === null || Array.isArray(parsedParams)) {
        throw new Error('Tham số phải là object JSON');
      }
    } catch {
      setFormError('Tham số session phải là JSON object hợp lệ.');
      return;
    }

    if (!name.trim()) {
      setFormError('Vui lòng đặt tên session.');
      return;
    }

    await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      params: parsedParams,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Session List</h1>
            <span className="badge-slate font-mono">Sprint 3</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Lưu và xem lại các cấu hình truy vấn, bộ lọc dữ liệu và tham số dùng cho ML Studio.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Làm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Database size={15} className="text-indigo-600" />
                Danh sách đã lưu
              </div>
              <span className="text-xs text-slate-400 font-medium">{filteredSessions.length} mục</span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo tên session, mã cổ phiếu, hoặc tham số..."
                className="input-field pl-9"
              />
            </div>

            {isLoading ? (
              <div className="py-16 flex items-center justify-center text-slate-500 gap-3">
                <Loader2 size={18} className="animate-spin text-indigo-500" />
                Đang tải session...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <FileJson size={32} className="mx-auto text-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Chưa có session nào</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Tạo session mới bằng form bên phải hoặc đồng bộ từ backend khi API sẵn sàng.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-indigo-200 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">{session.name}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${session.source === 'api' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {session.source}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {session.description || sessionSummary(session)}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 border border-slate-200">
                            <Clock3 size={11} /> {formatDateTime(session.created_at)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 border border-slate-200">
                            {session.item_count} tham số
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 border border-slate-200 font-mono">
                            {session.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-center">
                        <Link to={`/sessions/${session.id}`} className="btn-secondary flex items-center gap-2 text-sm">
                          <Eye size={14} /> Xem
                        </Link>
                        <button
                          onClick={() => deleteMutation.mutate(session.id)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 h-fit space-y-4 sticky top-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Plus size={15} className="text-indigo-600" /> Tạo session mới
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Lưu lại bộ lọc hoặc cấu hình phân tích để dùng lại cho Data Explorer, ML Studio hoặc so sánh sau này.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tên session</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: Nhóm FPT tháng 8"
                className="input-field"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mô tả</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ghi chú ngắn về phạm vi truy vấn hoặc mục đích sử dụng"
                className="input-field min-h-24 resize-y"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Params JSON</label>
              <textarea
                value={paramsText}
                onChange={(event) => setParamsText(event.target.value)}
                className="input-field min-h-44 font-mono text-xs resize-y"
              />
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Lưu session
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
