/**
 * API service layer — axios client + typed wrappers.
 *
 * Auth: JWT Bearer injected automatically via request interceptor.
 * On 401: clears auth store + redirects to /login.
 */
import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  withCredentials: true,   // send cookies (refresh_token HttpOnly cookie)
});

export class ApiClientError extends Error {
  statusCode?: number;
  detail?: string;

  constructor(
    message: string,
    statusCode?: number,
    detail?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

// ─── Request interceptor: inject Bearer token ─────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: extract .data + handle errors ──────────────────────
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data as any;
    const detail = data?.detail ?? error.message;

    // 401 → clear auth + redirect to login
    if (status === 401) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
    }

    throw new ApiClientError(
      `[${error.config?.method?.toUpperCase()} ${error.config?.url}] ${detail}`,
      status,
      detail
    );
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload { full_name: string; password: string }
export interface RegisterPayload { full_name: string; password: string }
export interface TokenResponse { access_token: string; token_type: string; role: string }
export interface AuthUser { id: string; full_name: string; role: string; created_at: string }

export const authApi = {
  login: (payload: LoginPayload): Promise<TokenResponse> =>
    apiClient.post('/auth/login', payload),

  register: (payload: RegisterPayload): Promise<{ message: string; user_id: string; role: string }> =>
    apiClient.post('/auth/register', payload),

  me: (): Promise<AuthUser> =>
    apiClient.get('/auth/me'),

  logout: (): Promise<void> =>
    apiClient.post('/auth/logout'),

  refresh: (): Promise<TokenResponse> =>
    apiClient.post('/auth/refresh'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface UserSummary {
  id: string; full_name: string;
  role: string; created_at: string;
}
export interface AdminStats {
  total_users: number; admin_users: number; guest_users: number;
  total_pipeline_jobs: number;
  total_ml_jobs: number; total_records_ingested: number;
}

export const adminApi = {
  listUsers: (params?: { role?: string }): Promise<UserSummary[]> =>
    apiClient.get('/admin/users', { params }),

  deleteUser: (userId: string): Promise<void> =>
    apiClient.delete(`/admin/users/${userId}`),

  getStats: (): Promise<AdminStats> =>
    apiClient.get('/admin/stats'),
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const getHealth = async (): Promise<any> =>
  apiClient.get('/health', { timeout: 5_000 });

// ─── Data Normalization ───────────────────────────────────────────────────────

export const getMetricMappings = async (): Promise<any> =>
  apiClient.get('/data-normalization/mappings');

export const getDataQualityReport = async (): Promise<any> =>
  apiClient.get('/data-normalization/quality-report');

export const runDataNormalization = async (config: {
  minYears: number;
  winsorizePct: number;
  targetUnit: string;
}): Promise<any> =>
  apiClient.post('/data-normalization/run', config, { timeout: 180_000 });

// ─── Companies ────────────────────────────────────────────────────────────────

export const getCompanies = async (
  limit = 1000,
  exchange?: string,
  industry?: string,
  excludeFinancial = false
): Promise<any> => {
  const params: Record<string, any> = { page: 1, limit };
  if (exchange) params.exchange = exchange;
  if (industry) params.industry = industry;
  if (excludeFinancial) params.exclude_financial = true;
  return apiClient.get('/companies', { params });
};

// ─── Prices ───────────────────────────────────────────────────────────────────

export const getPrices = async (
  ticker: string,
  startDate?: string,
  endDate?: string,
  limit = 1000
): Promise<any> => {
  const params: Record<string, any> = { ticker, page: 1, limit };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return apiClient.get('/prices', { params });
};

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export const runPipeline = async (
  tickers: string[],
  startDate: string,
  endDate: string,
  interval = '1D'
): Promise<any> =>
  apiClient.post('/pipeline/run', { tickers, start_date: startDate, end_date: endDate, interval }, { timeout: 180_000 });

// ─── Financial Reports ────────────────────────────────────────────────────────

export const getFinancialReport = async (
  ticker: string,
  periodType: 'YEARLY' | 'QUARTERLY' = 'YEARLY'
): Promise<any> =>
  apiClient.get(`/financial-reports/${ticker}`, { params: { period_type: periodType } });

export const ingestFinancialReports = async (
  tickers: string[],
  startYear: number,
  endYear: number,
  reportTypes = ['BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW']
): Promise<any> =>
  apiClient.post('/financial-reports/ingest', { tickers, start_year: startYear, end_year: endYear, report_types: reportTypes }, { timeout: 180_000 });

// ─── Financial Ratios ─────────────────────────────────────────────────────────

export const getFinancialRatios = async (ticker: string): Promise<any> =>
  apiClient.get(`/financial-ratios/${ticker}`);

export const calculateFinancialRatios = async (tickers: string[]): Promise<any> =>
  apiClient.post('/financial-ratios/calculate', { tickers }, { timeout: 180_000 });

// ─── Distress ─────────────────────────────────────────────────────────────────

export const getDistressLabels = async (ticker: string): Promise<any> =>
  apiClient.get(`/distress-labeling/${ticker}`);

export const runDistressLabelingEngine = async (config: {
  method: 'RULE_BASED' | 'Z_SCORE' | 'HYBRID';
  zThreshold: number;
}): Promise<any> =>
  apiClient.post('/distress-labeling/run', config);

// ─── Dataset ──────────────────────────────────────────────────────────────────

export const getDatasetPreview = async (page = 1, pageSize = 50): Promise<any> =>
  apiClient.get('/dataset/preview', { params: { page, page_size: pageSize } });

export const exportDatasetFile = async (format: 'CSV' | 'EXCEL' | 'PARQUET'): Promise<any> =>
  apiClient.get('/dataset/export', { params: { format }, responseType: 'blob' });

// ─── ML / AI Models ───────────────────────────────────────────────────────────

export const trainModel = async (config: {
  model_type: string;
  train_start_year: number;
  train_end_year: number;
  test_start_year: number;
  test_end_year: number;
  handle_imbalance: boolean;
}): Promise<any> =>
  apiClient.post('/ai-models/train', config, { timeout: 180_000 });

export const getModelEvaluation = async (modelType: string): Promise<any> =>
  apiClient.get(`/ai-models/evaluation/${modelType}`);

// ─── ML Jobs (Sprint 5) ───────────────────────────────────────────────────────

export const mlJobsApi = {
  list: (): Promise<any[]> => apiClient.get('/ml/jobs'),
  submit: (config: any): Promise<any> => apiClient.post('/ml/jobs', config),
  get: (jobId: string): Promise<any> => apiClient.get(`/ml/jobs/${jobId}`),
};

// ─── Prediction ───────────────────────────────────────────────────────────────

export const getDistressPrediction = async (ticker: string): Promise<any> =>
  apiClient.get(`/prediction/${ticker}`);

// ─── Sessions ─────────────────────────────────────────────────────────────────

export const sessionsApi = {
  list: (): Promise<any[]> => apiClient.get('/sessions'),
  create: (data: { name: string; description?: string; params: any }): Promise<any> =>
    apiClient.post('/sessions', data),
  get: (id: string): Promise<any> => apiClient.get(`/sessions/${id}`),
  delete: (id: string): Promise<void> => apiClient.delete(`/sessions/${id}`),
};
