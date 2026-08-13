import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import authBg from '@/assets/auth.webp';

export const AuthLayout: React.FC = () => {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div 
      className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      {/* Dark overlay with corporate blue glows for enterprise data terminal feel */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm pointer-events-none" />
      
      {/* Subtle colorful ambient lights in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full py-8">
        <Outlet />
      </div>
    </div>
  );
};
