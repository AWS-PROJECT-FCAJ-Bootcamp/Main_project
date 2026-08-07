import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { PriceData } from '@/types';

interface PricesApiResponse {
  data: PriceData[];
  total?: number;
}

export const usePricesQuery = (
  ticker: string,
  startDate?: string,
  endDate?: string,
  useFilter = false
) => {
  return useQuery<PriceData[], Error>({
    queryKey: ['prices', ticker, useFilter ? startDate : undefined, useFilter ? endDate : undefined],
    queryFn: async () => {
      const params: Record<string, unknown> = { ticker, page: 1, limit: 1000 };
      if (useFilter && startDate) params.start_date = startDate;
      if (useFilter && endDate) params.end_date = endDate;

      const res = await apiClient.get<unknown, PricesApiResponse>('/prices', { params });
      return res?.data ?? [];
    },
    enabled: !!ticker,
    staleTime: 30 * 1000,
  });
};
