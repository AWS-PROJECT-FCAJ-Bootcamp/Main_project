import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/axios';
import { useAppStore } from '@/store/useAppStore';
import type { RegisterFormValues } from '../schemas/register.schema';
import type { AuthResponse } from '../types';

export const useRegisterMutation = () => {
  const navigate = useNavigate();
  const loginStore = useAppStore((s) => s.login);

  return useMutation<AuthResponse, Error, RegisterFormValues>({
    mutationFn: (data: RegisterFormValues) =>
      apiClient.post('/auth/register', {
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      }),
    onSuccess: (res, variables) => {
      if (res.access_token) {
        localStorage.setItem('access_token', res.access_token);
        loginStore(res.full_name || variables.email);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    },
  });
};
