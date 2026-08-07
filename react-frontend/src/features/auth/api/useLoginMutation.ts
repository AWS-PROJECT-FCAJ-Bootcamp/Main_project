import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/axios';
import { useAppStore } from '@/store/useAppStore';
import type { LoginFormValues } from '../schemas/login.schema';
import type { AuthResponse } from '../types';

export const useLoginMutation = () => {
  const navigate = useNavigate();
  const loginStore = useAppStore((s) => s.login);

  return useMutation<AuthResponse, Error, LoginFormValues>({
    mutationFn: (data: LoginFormValues) => apiClient.post('/auth/login', data),
    onSuccess: (res, variables) => {
      if (res.access_token) {
        localStorage.setItem('access_token', res.access_token);
        loginStore(res.full_name || variables.email);
        navigate('/dashboard');
      }
    },
  });
};
