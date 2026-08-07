import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const location = useLocation();

  if (!token) {
    // Redirect unauthenticated user to /login, keeping original location state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
