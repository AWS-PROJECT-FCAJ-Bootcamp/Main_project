import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { FinancialStatementItem } from '@/types';

export interface FinancialReportData {
  ticker: string;
  period_type: string;
  periods: string[];
  balance_sheet: FinancialStatementItem[];
  income_statement: FinancialStatementItem[];
  cash_flow: FinancialStatementItem[];
}


export const useFinancialReportQuery = (ticker: string, periodType: 'YEARLY' | 'QUARTERLY') => {
  const cleanTicker = ticker.trim().toUpperCase();
  return useQuery({
    queryKey: ['financial-report', cleanTicker, periodType],
    queryFn: async (): Promise<FinancialReportData | null> => {
      if (!cleanTicker) return null;
      try {
        const res = await apiClient.get<never, FinancialReportData>(
          `/financial-reports/${cleanTicker}`,
          { params: { period_type: periodType } }
        );
        return res ?? null;
      } catch {
        return null;
      }
    },
    enabled: cleanTicker.length >= 2,
    staleTime: 1000 * 60 * 5,   // 5 min cache — avoid re-fetch on tab switch
    retry: false,                // Don't retry 404s
  });
};
