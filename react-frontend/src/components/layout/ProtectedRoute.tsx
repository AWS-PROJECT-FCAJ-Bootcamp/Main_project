/**
 * ProtectedRoute — redirects to /login if not authenticated.
 *                  Validates JWT against the backend on page load.
 * RoleGuard     — redirects to /dashboard if user doesn't have required role.
 */
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';

// ─── ProtectedRoute ───────────────────────────────────────────────────────────

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, accessToken, clearAuth, setAuth } = useAuthStore();
  const location = useLocation();
  const [ready, setReady] = React.useState(useAuthStore.persist.hasHydrated());
  const [verifying, setVerifying] = React.useState(false);
  const [verified, setVerified] = React.useState(false);

  React.useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setReady(true);
      return undefined;
    }

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setReady(true));
    return unsubscribe;
  }, []);

  // Verify token against backend when the store says we're authenticated
  React.useEffect(() => {
    if (!ready || verified) return;

    if (!isAuthenticated || !accessToken) {
      setVerified(true);
      return;
    }

    // Server-side verification: call /auth/me to validate the token
    setVerifying(true);
    authApi
      .me()
      .then((userData) => {
        // Token is valid — update store with fresh server data
        setAuth(accessToken!, {
          id: userData.id,
          full_name: userData.full_name,
          role: userData.role as 'guest' | 'admin',
          created_at: userData.created_at,
        });
        setVerified(true);
      })
      .catch(() => {
        // Token is invalid/expired — clear auth and redirect to login
        clearAuth();
        setVerified(true);
      })
      .finally(() => {
        setVerifying(false);
      });
  }, [ready, isAuthenticated, accessToken, verified, clearAuth, setAuth]);

  if (!ready || verifying || !verified) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Đang xác thực phiên đăng nhập...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// ─── RoleGuard ────────────────────────────────────────────────────────────────

interface RoleGuardProps {
  role: 'admin' | 'guest';
  fallback?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ role, fallback = '/dashboard' }) => {
  const { user } = useAuthStore();

  if (!user || user.role !== role) {
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
};
