import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { loginApi } from '../../services/api';
import { LogIn, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});
type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const loginStore = useAppStore((s) => s.login);
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setErrorMessage(null);
    try {
      const res = await loginApi(data);
      if (res.access_token) {
        localStorage.setItem('access_token', res.access_token);
        loginStore(res.full_name || res.email);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="fsd-logo text-3xl mb-2">FSD //</div>
        <p className="text-sm text-slate-500 font-medium">Data Lake Terminal</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Chào mừng trở lại</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập để truy cập hệ thống phân tích</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="input-field"
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-red-500 flex items-center gap-1 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mật khẩu</label>
            <div className="relative">
              <input
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
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Đang xác thực...</>
            ) : (
              <><LogIn size={14} /> Đăng nhập</>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
};
