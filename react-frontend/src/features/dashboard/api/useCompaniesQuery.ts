import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { Company } from '@/types';

interface CompaniesApiResponse {
  data: Company[];
  total?: number;
  page?: number;
  limit?: number;
}

export const useCompaniesQuery = () => {
  return useQuery<Company[], Error>({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await apiClient.get<unknown, CompaniesApiResponse>('/companies', {
        params: { page: 1, limit: 100 },
      });
      return res?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
};
