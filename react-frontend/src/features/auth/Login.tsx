import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { authApi, apiClient } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/useAppStore';

const loginSchema = z.object({
  full_name: z.string().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setLegacyLogin = useAppStore((s) => s.login);
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);

    try {
      // 1. Authenticate with backend API
      const tokenRes = await authApi.login({ full_name: data.full_name.trim(), password: data.password });

      // 2. Fetch user profile explicitly passing the new access token
      const userRes = await apiClient.get<any, any>('/auth/me', {
        headers: { Authorization: `Bearer ${tokenRes.access_token}` },
      });

      // 3. Set auth state ONLY upon clean server verification
      setAuth(tokenRes.access_token, {
        id: userRes.id,
        full_name: userRes.full_name,
        role: tokenRes.role || userRes.role,
        created_at: userRes.created_at,
      });
      setLegacyLogin(userRes.full_name);

      // 4. Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      // Extract error status & detail safely
      const statusCode = err?.statusCode;
      const detail: string = err?.detail || err?.message || '';

      if (statusCode === 401 || detail.toLowerCase().includes('incorrect') || detail.toLowerCase().includes('không chính xác')) {
        setServerError('Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.');
      } else if (/network error|ecconnrefused|failed to fetch|timeout/i.test(detail)) {
        setServerError('Không thể kết nối đến máy chủ API backend. Vui lòng kiểm tra dịch vụ backend.');
      } else {
        setServerError(detail || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="fsd-logo text-3xl mb-2">FSD //</div>
        <p className="text-sm text-slate-500 font-medium">Financial Distress Analysis Platform</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Đăng nhập tài khoản</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập để truy cập hệ thống phân tích rủi ro tài chính</p>
        </div>

        {/* Server error banner */}
        {serverError && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3.5 mb-5 text-sm">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 mb-0.5">Đăng nhập không thành công</p>
              <p className="text-red-700 text-xs">{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="login-form">
          <div className="space-y-1.5">
            <label htmlFor="login-fullname" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Tên đăng nhập
            </label>
            <input
              id="login-fullname"
              type="text"
              {...register('full_name')}
              placeholder="Nhập tên đăng nhập"
              className="input-field"
              autoComplete="username"
            />
            {errors.full_name && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                {errors.full_name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className="input-field pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Đang xác thực...</>
            ) : (
              <><LogIn size={14} /> Đăng nhập</>
            )}
          </button>
        </form>

        {/* System accounts notice */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold mb-1">
            <KeyRound size={13} className="text-indigo-500" /> Tài khoản mặc định hệ thống:
          </div>
          <div className="flex justify-between bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px]">
            <span>Admin: Admin</span>
            <span className="text-slate-400">admin123456</span>
          </div>
          <div className="flex justify-between bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px]">
            <span>Guest: Guest</span>
            <span className="text-slate-400">guest123456</span>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};
