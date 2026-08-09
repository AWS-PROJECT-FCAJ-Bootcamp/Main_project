import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { registerSchema, type RegisterFormValues } from '../schemas/register.schema';
import { useRegisterMutation } from '../api/useRegisterMutation';

export const RegisterForm: React.FC = () => {
  const [showPwd, setShowPwd] = useState(false);
  const { mutate: registerUser, isPending, error } = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerUser(data);
  };

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/80 rounded-2xl p-8 relative overflow-hidden">
        {/* Glow decoration inside the card */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="fsd-logo text-3xl tracking-widest font-extrabold">FSD</span>
          </div>
          <span className="text-[10px] font-mono tracking-[0.25em] text-cyan-400 uppercase font-semibold">
            FINANCIAL DATA LAKE
          </span>
        </div>

        <div className="mb-6 text-center border-b border-slate-800 pb-5">
          <h1 className="text-lg font-bold text-white tracking-wide uppercase">Tạo tài khoản mới</h1>
          <p className="text-xs text-slate-400 mt-1">Đăng ký để truy cập nền tảng phân tích tài chính</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Họ và tên</label>
            <input
              {...register('full_name')}
              type="text"
              placeholder="Nguyễn Văn A"
              className="w-full h-10 px-3 py-2 text-sm bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-transparent transition-all"
            />
            {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full h-10 px-3 py-2 text-sm bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-transparent transition-all"
              autoComplete="email"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className="w-full h-10 pl-3 pr-10 py-2 text-sm bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Xác nhận mật khẩu</label>
            <input
              type={showPwd ? 'text' : 'password'}
              {...register('confirm_password')}
              placeholder="••••••••"
              className="w-full h-10 px-3 py-2 text-sm bg-slate-950/60 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/80 focus:border-transparent transition-all"
            />
            {errors.confirm_password && <p className="text-xs text-red-500 mt-1">{errors.confirm_password.message}</p>}
          </div>

          <button 
            type="submit" 
            disabled={isPending} 
            className="w-full h-10 flex items-center justify-center gap-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-6"
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" /> Đang tạo tài khoản...</>
            ) : (
              <><UserPlus size={14} /> Đăng ký tài khoản</>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6 border-t border-slate-800/60 pt-4">
          Đã có tài khoản?{' '}
          <Link to="/login" className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition-colors">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};
