import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../../services/api';
import { UserPlus, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Tối thiểu 6 ký tự'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});
type RegisterForm = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await registerApi({
        email: data.email,
        password: data.password,
        full_name: data.fullName,
      });
      setSuccessMessage('Đăng ký thành công! Đang chuyển hướng sang trang Đăng nhập...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng ký thất bại. Vui lòng thử lại với email khác.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="fsd-logo text-3xl mb-2">FSD //</div>
        <p className="text-sm text-slate-500 font-medium">Data Lake Terminal</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/40 p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Tạo tài khoản</h1>
          <p className="text-sm text-slate-500 mt-1">Điền thông tin để đăng ký hệ thống</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Họ và tên</label>
            <input
              type="text"
              {...register('fullName')}
              placeholder="Nguyễn Văn A"
              className="input-field"
            />
            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</label>
            <input
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className="input-field"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className="input-field pr-10"
              />
              <button type="button" onClick={() => setShowPwd((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Xác nhận mật khẩu</label>
            <input type="password" {...register('confirmPassword')} placeholder="••••••••" className="input-field" />
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Đang xử lý...</>
            ) : (
              <><UserPlus size={14} /> Đăng ký</>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-colors">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};
