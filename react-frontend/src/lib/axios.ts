import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiClientError extends Error {
  public statusCode?: number;
  
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Extract data and handle errors cleanly without 'any'
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ detail?: string | Record<string, unknown> }>) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('access_token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    let detailMsg = '';
    const resData = error.response?.data;

    if (resData?.detail) {
      if (typeof resData.detail === 'string') {
        detailMsg = resData.detail;
      } else {
        detailMsg = JSON.stringify(resData.detail);
      }
    } else {
      detailMsg = error.message || 'Lỗi kết nối Server';
    }

    throw new ApiClientError(detailMsg, status);
  }
);

export default apiClient;
