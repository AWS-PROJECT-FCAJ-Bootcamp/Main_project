import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../services/api';

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Tên đăng nhập phải từ 2 ký tự trở lên'),
    password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const [showPwd, setShowPwd] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      await authApi.register({
        full_name: data.full_name.trim(),
        password: data.password,
      });
      setSuccess(true);
    } catch (err: any) {
      setServerError(err?.detail ?? err?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="fsd-logo text-3xl mb-2">FSD //</div>
        <p className="text-sm text-slate-500 font-medium">Financial Distress Analysis Platform</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-8">
        {success ? (
          /* ─── Success state ─── */
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Đăng ký thành công!</h2>
            <p className="text-sm text-slate-500 mb-6">
              Tài khoản của bạn đã được tạo.
              <br />
              Bạn có thể đăng nhập ngay bây giờ.
            </p>
            <Link
              to="/login"
              className="btn-primary inline-flex items-center justify-center gap-2 px-6"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : (
          /* ─── Form ─── */
          <>
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-900">Tạo tài khoản</h1>
              <p className="text-sm text-slate-500 mt-1">
                Đăng ký tài khoản mới để truy cập hệ thống
              </p>
            </div>

            {serverError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="register-form">
              {/* Full name / Username */}
              <div className="space-y-1.5">
                <label htmlFor="reg-fullname" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Tên đăng nhập
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  {...register('full_name')}
                  placeholder="Nhập tên đăng nhập"
                  className="input-field"
                  autoComplete="username"
                />
                {errors.full_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPwd ? 'text' : 'password'}
                    {...register('password')}
                    placeholder="••••••••"
                    className="input-field pr-10"
                    autoComplete="new-password"
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

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-confirm" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Xác nhận mật khẩu
                </label>
                <input
                  id="reg-confirm"
                  type="password"
                  {...register('confirmPassword')}
                  placeholder="••••••••"
                  className="input-field"
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                id="register-submit"
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? (
                  <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</>
                ) : (
                  <><UserPlus size={14} /> Đăng ký</>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-6">
              Đã có tài khoản?{' '}
              <Link
                to="/login"
                className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors"
              >
                Đăng nhập
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
};
