import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { LogIn, LogOut, ShieldCheck, Loader2, KeyRound } from 'lucide-react';
import { isCognitoConfigured, signOutRedirect } from '@/config/cognito';
import { useAppStore } from '@/store/useAppStore';

export const AuthButton: React.FC = () => {
  const { username: localUser, logout: localLogout } = useAppStore();

  // If Cognito environment variables are NOT configured (e.g. running local dev), fallback to standard local auth UI
  if (!isCognitoConfigured) {
    if (localUser) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono">
            <ShieldCheck size={13} className="text-indigo-600" />
            <span className="font-bold">{localUser}</span>
          </div>
          <button
            type="button"
            onClick={localLogout}
            className="text-xs text-slate-500 hover:text-red-600 p-1 font-semibold cursor-pointer"
            title="Đăng xuất local"
          >
            <LogOut size={13} />
          </button>
        </div>
      );
    }
    return (
      <a
        href="/login"
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
      >
        <KeyRound size={13} /> Đăng Nhập
      </a>
    );
  }

  // Active Cognito OIDC Flow when isCognitoConfigured is true
  return <CognitoAuthButtonInternal />;
};

const CognitoAuthButtonInternal: React.FC = () => {
  const auth = useAuth();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      localStorage.setItem('access_token', auth.user.access_token);
    }
  }, [auth.isAuthenticated, auth.user]);

  if (auth.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
        <Loader2 size={14} className="animate-spin text-indigo-600" />
        <span>Kết nối Cognito...</span>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="text-xs font-mono text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
        Lỗi OIDC: {auth.error.message}
      </div>
    );
  }

  if (auth.isAuthenticated) {
    const userEmail = auth.user?.profile?.email || auth.user?.profile?.preferred_username || 'Cognito User';
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-900 px-3 py-1.5 rounded-xl text-xs font-mono">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span className="font-bold">{userEmail}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            auth.removeUser();
            signOutRedirect();
          }}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-slate-700 bg-white border-slate-200 hover:bg-slate-100 cursor-pointer font-bold"
        >
          <LogOut size={13} className="text-red-500" /> Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => auth.signinRedirect()}
      className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 font-bold cursor-pointer shadow-xs"
    >
      <LogIn size={13} /> Sign In Cognito
    </button>
  );
};

export default AuthButton;
