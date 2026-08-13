import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { LogIn, LogOut, Loader2, KeyRound } from 'lucide-react';
import { isCognitoConfigured, signOutRedirect } from '@/config/cognito';
import { useAppStore } from '@/store/useAppStore';

export const AuthButton: React.FC = () => {
  const { username: localUser, logout: localLogout } = useAppStore();

  // If Cognito environment variables are NOT configured (e.g. running local dev), fallback to standard local auth UI
  if (!isCognitoConfigured) {
    if (localUser) {
      return (
        <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-full border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-inner">
            {localUser.charAt(0).toUpperCase()}
          </div>
          <div className="flex-col hidden sm:flex px-1">
            <span className="text-xs font-bold text-slate-800 leading-tight">{localUser}</span>
            <span className="text-[10px] text-slate-500 font-medium leading-tight">Admin</span>
          </div>
          <button
            type="button"
            onClick={localLogout}
            className="ml-1 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
            title="Đăng xuất local"
          >
            <LogOut size={14} />
          </button>
        </div>
      );
    }
    return (
      <a
        href="/login"
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl transition-colors"
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
        <Loader2 size={14} className="animate-spin text-blue-600" />
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
      <div className="flex items-center gap-2 bg-white p-1 pr-2 rounded-full border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-inner">
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <div className="flex-col hidden sm:flex px-1 max-w-[120px]">
          <span className="text-xs font-bold text-slate-800 truncate leading-tight">{userEmail}</span>
          <span className="text-[10px] text-slate-500 font-medium truncate leading-tight">Cognito</span>
        </div>
        <button
          type="button"
          onClick={() => {
            auth.removeUser();
            signOutRedirect();
          }}
          className="ml-1 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
          title="Đăng xuất Cognito"
        >
          <LogOut size={14} />
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
