import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Trash2,
  Shield,
  TrendingUp,
  Database,
  Activity,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import type { UserSummary, AdminStats } from '../../services/api';

type RoleFilter = 'all' | 'admin' | 'guest';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-indigo-100 text-indigo-700' },
  guest: { label: 'Guest', color: 'bg-slate-100 text-slate-600' },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: string;
}> = ({ icon, label, value, accent = 'text-indigo-600' }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
    <div className={`w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center ${accent}`}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const AdminPanel: React.FC = () => {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = React.useState<RoleFilter>('all');
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30_000,
  });

  const { data: users = [], isLoading } = useQuery<UserSummary[]>({
    queryKey: ['admin', 'users', roleFilter],
    queryFn: () =>
      adminApi.listUsers(roleFilter !== 'all' ? { role: roleFilter } : undefined),
    refetchInterval: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      setActionLoading(null);
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa người dùng "${name}"?`)) return;
    setActionLoading(id);
    deleteMutation.mutate(id);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield size={22} className="text-indigo-500" />
          Quản lý người dùng
        </h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý tài khoản người dùng hệ thống</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users size={18} />} label="Tổng người dùng" value={stats.total_users} />
          <StatCard icon={<UserCheck size={18} />} label="Admin" value={stats.admin_users} accent="text-indigo-600" />
          <StatCard icon={<UserMinus size={18} />} label="Guest" value={stats.guest_users} accent="text-emerald-600" />
          <StatCard icon={<Database size={18} />} label="Tổng records" value={stats.total_records_ingested.toLocaleString()} />
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header + filter */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Danh sách người dùng</span>
            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {users.length}
            </span>
          </div>

          {/* Role filter tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['all', 'admin', 'guest'] as RoleFilter[]).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
                  roleFilter === r
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {r === 'all' ? 'Tất cả' : ROLE_LABELS[r].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400">
            <TrendingUp size={16} className="animate-pulse mr-2" /> Đang tải...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-400">
            Không có người dùng nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tên đăng nhập</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vai trò</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ngày đăng ký</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-600">
                            {user.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="font-medium text-slate-800">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ROLE_LABELS[user.role]?.color ?? 'bg-slate-100 text-slate-600'
                      }`}>
                        {ROLE_LABELS[user.role]?.label ?? user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5">
                      {user.role !== 'admin' && (
                        <button
                          id={`delete-${user.id}`}
                          onClick={() => handleDelete(user.id, user.full_name)}
                          disabled={actionLoading === user.id}
                          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
