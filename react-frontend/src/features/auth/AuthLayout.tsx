import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export const AuthLayout: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady] = React.useState(useAuthStore.persist.hasHydrated());

  React.useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setReady(true);
      return undefined;
    }

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setReady(true));
    return unsubscribe;
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Đang khôi phục phiên đăng nhập...
        </div>
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="relative min-h-screen bg-slate-50 flex items-center justify-center p-6 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100/50 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-50/40 rounded-full blur-2xl" />
      </div>
      <div className="relative z-10 w-full">
        <Outlet />
      </div>
    </div>
  );
};
