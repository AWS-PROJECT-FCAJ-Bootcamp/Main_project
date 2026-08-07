import type { AuthProviderProps } from 'react-oidc-context';

export const cognitoAuthority = import.meta.env.VITE_COGNITO_AUTHORITY || '';
export const cognitoClientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '';

// Auto-detect redirect URI: Local DEV -> http://localhost:5173/login, PROD -> VITE_COGNITO_REDIRECT_URI
export const cognitoRedirectUri =
  import.meta.env.VITE_COGNITO_REDIRECT_URI ||
  (typeof window !== 'undefined'
    ? `${window.location.origin}/login`
    : 'http://localhost:5173/login');

// Safe flag checking whether AWS Cognito is configured in environment
export const isCognitoConfigured = Boolean(
  cognitoAuthority && cognitoAuthority.trim() !== '' && cognitoClientId && cognitoClientId.trim() !== ''
);

export const cognitoAuthConfig: AuthProviderProps = {
  authority: cognitoAuthority,
  client_id: cognitoClientId,
  redirect_uri: cognitoRedirectUri,
  response_type: 'code',
  scope: 'phone openid email profile',
  onSigninCallback: () => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  },
};

export const signOutRedirect = () => {
  if (!cognitoAuthority || !cognitoClientId) {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    return;
  }
  
  const logoutUri = encodeURIComponent(cognitoRedirectUri);
  window.location.href = `${cognitoAuthority}/logout?client_id=${cognitoClientId}&logout_uri=${logoutUri}`;
};
