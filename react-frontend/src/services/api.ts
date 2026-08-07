import apiClient from '@/lib/axios';

export { ApiClientError } from '@/lib/axios';
export { apiClient };

// --- Auth API ---
export const registerApi = async (data: { email: string; password: string; full_name: string }) => {
  return apiClient.post('/auth/register', data);
};

export const loginApi = async (data: { email: string; password: string }) => {
  return apiClient.post('/auth/login', data);
};

export const getProfileApi = async () => {
  return apiClient.get('/auth/me');
};

export const getWatchlistApi = async () => {
  return apiClient.get('/users/watchlist');
};

export const addToWatchlistApi = async (data: { ticker: string; note?: string }) => {
  return apiClient.post('/users/watchlist', data);
};

export const deleteWatchlistApi = async (ticker: string) => {
  return apiClient.delete(`/users/watchlist/${ticker}`);
};

// --- General Data API Functions ---
export const getHealth = async () => {
  return apiClient.get('/health', { timeout: 5000 });
};

export const getCompanies = async (
  page = 1,
  limit = 15,
  search?: string,
  exchange?: string,
  industry?: string,
  excludeFinancial = false
) => {
  const params: Record<string, unknown> = { page, limit };
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
) => {
  const params: Record<string, unknown> = { ticker, page: 1, limit };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return apiClient.get('/prices', { params });
};

export const runPipeline = async (
  tickers: string[],
  startDate: string,
  endDate: string,
  interval = '1D'
) => {
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
) => {
  return apiClient.get(`/financial-reports/${ticker}`, {
    params: { period_type: periodType },
  });
};

export const ingestFinancialReports = async (
  tickers: string[],
  startYear: number,
  endYear: number,
  reportTypes = ['BALANCE_SHEET', 'INCOME_STATEMENT', 'CASH_FLOW']
) => {
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

export const getMetricMappings = async () => {
  return apiClient.get('/data-processing/metric-mappings');
};

export const getDataQualityReport = async () => {
  return apiClient.get('/data-processing/quality-report');
};

export const runDataNormalization = async (config: {
  minYears: number;
  winsorizePct: number;
  targetUnit: string;
}) => {
  return apiClient.post('/data-processing/normalize', config);
};

export const getFinancialRatios = async (ticker: string) => {
  return apiClient.get(`/financial-ratios/${ticker}`);
};

export const calculateFinancialRatios = async (tickers: string[]) => {
  return apiClient.post('/financial-ratios/calculate', { tickers }, { timeout: 180000 });
};

export const getDistressLabels = async (ticker: string) => {
  return apiClient.get(`/distress-labeling/${ticker}`);
};

export const runDistressLabelingEngine = async (config: {
  method: 'RULE_BASED' | 'Z_SCORE' | 'HYBRID';
  zThreshold: number;
}) => {
  return apiClient.post('/distress-labeling/run', config);
};

export const getDatasetPreview = async () => {
  return apiClient.get('/dataset/preview');
};

export const exportDatasetFile = async (format: 'CSV' | 'EXCEL' | 'PARQUET') => {
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
}) => {
  return apiClient.post('/ai-models/train', config, { timeout: 180000 });
};

export const getModelEvaluation = async (modelType: string) => {
  return apiClient.get(`/ai-models/evaluation/${modelType}`);
};

export const getDistressPrediction = async (ticker: string) => {
  return apiClient.get(`/prediction/${ticker}`);
};

export const getCurrentUser = async () => {
  return apiClient.get('/users/me');
};

export const getUserWatchlist = async () => {
  return apiClient.get('/users/watchlist');
};

export const addToWatchlist = async (ticker: string, note = '') => {
  return apiClient.post('/users/watchlist', { ticker, note });
};

export const removeFromWatchlist = async (ticker: string) => {
  return apiClient.delete(`/users/watchlist/${ticker}`);
};
