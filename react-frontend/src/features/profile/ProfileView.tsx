import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  ShieldCheck,
  Bookmark,
  Plus,
  Trash2,
  Calendar,
  Mail,
  Key,
  Star,
  RefreshCw,
  ServerCrash,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { getCurrentUser, getUserWatchlist, addToWatchlist, removeFromWatchlist } from '@/services/api';
import type { UserProfile, WatchlistItem } from '@/types';

export const ProfileView: React.FC = () => {
  const queryClient = useQueryClient();
  const [newTicker, setNewTicker] = useState('');
  const [newNote, setNewNote] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch User Profile
  const {
    data: profileData,
    isLoading: isLoadingProfile,
    isError: isErrorProfile,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 60_000,
  });

  // Fetch Watchlist
  const {
    data: watchlistData,
    isLoading: isLoadingWatchlist,
    isError: isErrorWatchlist,
    refetch: refetchWatchlist,
  } = useQuery({
    queryKey: ['userWatchlist'],
    queryFn: getUserWatchlist,
    staleTime: 15_000,
  });

  const user: UserProfile | null = profileData?.data ?? null;
  const watchlistDataObj = watchlistData?.data ?? watchlistData;
  const watchlist: WatchlistItem[] = Array.isArray(watchlistDataObj) ? watchlistDataObj : [];

  // Add Ticker Mutation
  const addMutation = useMutation({
    mutationFn: ({ ticker, note }: { ticker: string; note: string }) => addToWatchlist(ticker, note),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlist'] });
      setNewTicker('');
      setNewNote('');
      setActionSuccess(`Đã thêm mã ${variables.ticker.toUpperCase()} vào danh sách theo dõi`);
      setTimeout(() => setActionSuccess(null), 4000);
    },
  });

  // Remove Ticker Mutation
  const removeMutation = useMutation({
    mutationFn: (ticker: string) => removeFromWatchlist(ticker),
    onSuccess: (_, ticker) => {
      queryClient.invalidateQueries({ queryKey: ['userWatchlist'] });
      setActionSuccess(`Đã xóa mã ${ticker.toUpperCase()} khỏi danh sách theo dõi`);
      setTimeout(() => setActionSuccess(null), 4000);
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim()) return;
    addMutation.mutate({ ticker: newTicker.trim().toUpperCase(), note: newNote.trim() });
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* ── Page Title ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <User className="text-indigo-600" size={24} /> Hồ sơ cá nhân & Danh sách theo dõi
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Quản lý thông tin tài khoản cá nhân và danh sách cổ phiếu yêu thích (Watchlist)
        </p>
      </div>

      {/* ── Success Toast Notification ── */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 size={16} /> {actionSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column: User Profile Details ── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold text-xl shadow-md">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{user?.full_name || 'Tài khoản người dùng'}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
                  <ShieldCheck size={12} /> {user?.role ? user.role.toUpperCase() : 'USER'}
                </span>
              </div>
            </div>

            {isLoadingProfile ? (
              <div className="space-y-3">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-5/6" />
              </div>
            ) : isErrorProfile ? (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-600 flex items-center gap-2">
                <ServerCrash size={14} /> Không thể tải thông tin hồ sơ.
                <button onClick={() => refetchProfile()} className="underline font-semibold ml-auto">Thử lại</button>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-400">Email tài khoản</p>
                    <p className="font-semibold text-slate-800">{user?.email || '—'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Key size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-400">Mã User ID</p>
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-indigo-600 font-mono font-semibold">
                      {user?.user_id || '—'}
                    </code>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-400">Ngày khởi tạo</p>
                    <p className="font-medium text-slate-700">
                      {user?.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy HH:mm') : '—'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-100 text-xs text-indigo-800 space-y-1">
                    <p className="font-bold flex items-center gap-1">
                      <ShieldCheck size={14} className="text-indigo-600" /> Xác thực an toàn (JWT Token)
                    </p>
                    <p className="text-slate-600">
                      Tài khoản của bạn đã được xác thực an toàn qua JSON Web Token (JWT 24h).
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Personal Watchlist ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bookmark size={18} className="text-indigo-600" /> Danh sách cổ phiếu theo dõi (Watchlist)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu trữ các mã chứng khoán bạn quan tâm để truy cập nhanh chóng
                </p>
              </div>
              <button
                onClick={() => refetchWatchlist()}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Làm mới danh sách"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Form thêm mã mới */}
            <form onSubmit={handleAddSubmit} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Plus size={14} className="text-indigo-600" /> Thêm cổ phiếu vào Watchlist
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="Mã CP (VD: FPT, VNM)"
                    value={newTicker}
                    onChange={(e) => setNewTicker(e.target.value)}
                    maxLength={10}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Ghi chú (Tùy chọn)"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={addMutation.isPending || !newTicker.trim()}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {addMutation.isPending ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Star size={14} /> Thêm theo dõi
                      </>
                    )}
                  </button>
                </div>
              </div>
              {addMutation.isError && (
                <p className="text-xs text-red-500 font-medium">
                  Không thể thêm mã cổ phiếu này. Vui lòng kiểm tra lại.
                </p>
              )}
            </form>

            {/* Bảng danh sách Watchlist */}
            {isLoadingWatchlist ? (
              <div className="space-y-3 py-4">
                <div className="skeleton h-10 w-full" />
                <div className="skeleton h-10 w-full" />
                <div className="skeleton h-10 w-full" />
              </div>
            ) : isErrorWatchlist ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600 flex items-center gap-2">
                <ServerCrash size={16} /> Không thể tải danh sách Watchlist.
              </div>
            ) : watchlist.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                <Bookmark size={32} className="mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Chưa có mã cổ phiếu nào trong Watchlist</p>
                <p className="text-xs text-slate-400">Hãy thêm mã cổ phiếu đầu tiên ở ô bên trên</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Mã CP</th>
                      <th className="px-4 py-3">Ghi chú</th>
                      <th className="px-4 py-3">Thời gian thêm</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {watchlist.map((item) => (
                      <tr key={item.ticker} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-indigo-600 flex items-center gap-1.5">
                          <Tag size={14} className="text-slate-400" />
                          {item.ticker}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {item.note || <span className="text-slate-400 italic">Không có</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {item.added_at ? format(new Date(item.added_at), 'dd/MM/yyyy HH:mm') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeMutation.mutate(item.ticker)}
                            disabled={removeMutation.isPending}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title={`Xóa ${item.ticker} khỏi Watchlist`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
