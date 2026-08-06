import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export class ApiClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Attach JWT Bearer Token if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }

    let detail = '';
    if (error.response?.data) {
      const data = error.response.data as any;
      detail = `: ${data.detail || JSON.stringify(data)}`;
    } else {
      detail = `: ${error.message}`;
    }
    throw new ApiClientError(`Backend request failed (${error.config?.method?.toUpperCase()} ${error.config?.url})${detail}`);
  }
);

// --- Auth & User API ---

export const registerApi = async (data: { email: string; password: string; full_name: string }): Promise<any> => {
  return apiClient.post('/auth/register', data);
};

export const loginApi = async (data: { email: string; password: string }): Promise<any> => {
  return apiClient.post('/auth/login', data);
};

export const getProfileApi = async (): Promise<any> => {
  return apiClient.get('/auth/me');
};

export const getWatchlistApi = async (): Promise<any> => {
  return apiClient.get('/users/watchlist');
};

export const addToWatchlistApi = async (data: { ticker: string; note?: string }): Promise<any> => {
  return apiClient.post('/users/watchlist', data);
};

export const deleteWatchlistApi = async (ticker: string): Promise<any> => {
  return apiClient.delete(`/users/watchlist/${ticker}`);
};

// --- General API Functions ---

export const getHealth = async (): Promise<any> => {
  return apiClient.get('/health', { timeout: 5000 });
};

export const getCompanies = async (
  page = 1,
  limit = 15,
  search?: string,
  exchange?: string,
  industry?: string,
  excludeFinancial = false
): Promise<any> => {
  const params: Record<string, any> = { page, limit };
  if (search && search.trim()) params.search = search.trim();
  if (exchange && exchange !== 'ALL') params.exchange = exchange;
  if (industry && industry !== 'ALL') params.industry = industry;
  if (excludeFinancial) params.exclude_financial = true;
  return apiClient.get('/companies', { params });
};

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

export const runPipeline = async (
  tickers: string[],
  startDate: string,
  endDate: string,
  interval = '1D'
): Promise<any> => {
  return apiClient.post(
    '/pipeline/run',
    {
      tickers,
      start_date: startDate,
      end_date: endDate,
      interval,
    },
    { timeout: 180000 }
  );
};

export const getFinancialReport = async (
  ticker: string,
  periodType: 'YEARLY' | 'QUARTERLY' = 'YEARLY'
): Promise<any> => {
  return apiClient.get(`/financial-reports/${ticker}`, {
    params: { period_type: periodType },
  });
};

export const ingestFinancialReports = async (
  tickers: string[],
  startYear: number,
  endYear: number,
  reportTypes = ['BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW']
): Promise<any> => {
  return apiClient.post(
    '/financial-reports/ingest',
    {
      tickers,
      start_year: startYear,
      end_year: endYear,
      report_types: reportTypes,
    },
    { timeout: 180000 }
  );
};

export const getMetricMappings = async (): Promise<any> => {
  return apiClient.get('/data-processing/metric-mappings');
};

export const getDataQualityReport = async (): Promise<any> => {
  return apiClient.get('/data-processing/quality-report');
};

export const runDataNormalization = async (config: {
  minYears: number;
  winsorizePct: number;
  targetUnit: string;
}): Promise<any> => {
  return apiClient.post('/data-processing/normalize', config);
};

export const getFinancialRatios = async (ticker: string): Promise<any> => {
  return apiClient.get(`/financial-ratios/${ticker}`);
};

export const calculateFinancialRatios = async (tickers: string[]): Promise<any> => {
  return apiClient.post('/financial-ratios/calculate', { tickers }, { timeout: 180000 });
};

export const getDistressLabels = async (ticker: string): Promise<any> => {
  return apiClient.get(`/distress-labeling/${ticker}`);
};

export const runDistressLabelingEngine = async (config: {
  method: 'RULE_BASED' | 'Z_SCORE' | 'HYBRID';
  zThreshold: number;
}): Promise<any> => {
  return apiClient.post('/distress-labeling/run', config);
};

export const getDatasetPreview = async (): Promise<any> => {
  return apiClient.get('/dataset/preview');
};

export const exportDatasetFile = async (format: 'CSV' | 'EXCEL' | 'PARQUET'): Promise<any> => {
  return apiClient.get('/dataset/export', {
    params: { format },
    responseType: 'blob',
  });
};

export const trainModel = async (config: {
  model_type: string;
  train_start_year: number;
  train_end_year: number;
  test_start_year: number;
  test_end_year: number;
  handle_imbalance: boolean;
}): Promise<any> => {
  return apiClient.post('/ai-models/train', config, { timeout: 180000 });
};

export const getModelEvaluation = async (modelType: string): Promise<any> => {
  return apiClient.get(`/ai-models/evaluation/${modelType}`);
};

export const getDistressPrediction = async (ticker: string): Promise<any> => {
  return apiClient.get(`/prediction/${ticker}`);
};

export const getCurrentUser = async (): Promise<any> => {
  return apiClient.get('/users/me');
};

export const getUserWatchlist = async (): Promise<any> => {
  return apiClient.get('/users/watchlist');
};

export const addToWatchlist = async (ticker: string, note: string = ''): Promise<any> => {
  return apiClient.post('/users/watchlist', { ticker, note });
};

export const removeFromWatchlist = async (ticker: string): Promise<any> => {
  return apiClient.delete(`/users/watchlist/${ticker}`);
};
