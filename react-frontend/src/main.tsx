import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App.tsx';
import { cognitoAuthConfig, isCognitoConfigured } from './config/cognito.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCognitoConfigured ? (
      <AuthProvider {...cognitoAuthConfig}>
        <App />
      </AuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
