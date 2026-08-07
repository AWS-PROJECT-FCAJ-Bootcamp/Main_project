import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { Company } from '@/types';

export interface IndustryOption {
  value: string;
  label: string;
}

export const STANDARD_INDUSTRIES: IndustryOption[] = [
  { value: 'Banks', label: 'Banks (Ngân hàng)' },
  { value: 'Financial Services', label: 'Financial Services (Dịch vụ Tài chính & Chứng khoán)' },
  { value: 'Insurance', label: 'Insurance (Bảo hiểm)' },
  { value: 'Technology', label: 'Technology (Công nghệ thông tin)' },
  { value: 'Real Estate', label: 'Real Estate (Bất động sản)' },
  { value: 'Basic Resources', label: 'Basic Resources (Tài nguyên & Thép)' },
  { value: 'Food & Beverage', label: 'Food & Beverage (Thực phẩm & Đồ uống)' },
  { value: 'Industrial Goods & Services', label: 'Industrial Goods & Services (Hàng & Dịch vụ Công nghiệp)' },
  { value: 'Construction & Materials', label: 'Construction & Materials (Xây dựng & Vật liệu)' },
  { value: 'Utilities', label: 'Utilities (Tiện ích & Điện nước)' },
  { value: 'Chemicals', label: 'Chemicals (Hóa chất)' },
  { value: 'Health Care', label: 'Health Care (Y tế & Dược phẩm)' },
  { value: 'Automobiles & Parts', label: 'Automobiles & Parts (Ô tô & Phụ tùng)' },
  { value: 'Personal & Household Goods', label: 'Personal & Household Goods (Hàng cá nhân & Gia dụng)' },
  { value: 'Travel & Leisure', label: 'Travel & Leisure (Du lịch & Giải trí)' },
  { value: 'Media', label: 'Media (Truyền thông)' },
  { value: 'Retail', label: 'Retail (Bán lẻ)' },
  { value: 'Oil & Gas', label: 'Oil & Gas (Dầu khí)' },
];

export const DEFAULT_COMPANIES: Company[] = [
  { ticker: 'FPT', name: 'CTCP FPT', exchange: 'HOSE', industry: 'Technology', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VNM', name: 'CTCP Sữa Việt Nam', exchange: 'HOSE', industry: 'Food & Beverage', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'HPG', name: 'CTCP Tập đoàn Hòa Phát', exchange: 'HOSE', industry: 'Basic Resources', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VCB', name: 'Ngân hàng TMCP Ngoại thương Việt Nam', exchange: 'HOSE', industry: 'Banks', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'BID', name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam', exchange: 'HOSE', industry: 'Banks', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'SSI', name: 'CTCP Chứng khoán SSI', exchange: 'HOSE', industry: 'Financial Services', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'BVH', name: 'Tập đoàn Bảo Việt', exchange: 'HOSE', industry: 'Insurance', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'MWG', name: 'CTCP Đầu tư Thế Giới Di Động', exchange: 'HOSE', industry: 'Retail', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VIC', name: 'Tập đoàn Vingroup - CTCP', exchange: 'HOSE', industry: 'Real Estate', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VHM', name: 'CTCP Vinhomes', exchange: 'HOSE', industry: 'Real Estate', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'MSN', name: 'CTCP Tập đoàn MaSan', exchange: 'HOSE', industry: 'Food & Beverage', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'REE', name: 'CTCP Cơ Điện Lạnh', exchange: 'HOSE', industry: 'Utilities', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'BSR', name: 'CTCP Lọc hóa dầu Bình Sơn', exchange: 'UPCOM', industry: 'Oil & Gas', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'ACV', name: 'Tổng công ty Cảng hàng không Việt Nam', exchange: 'UPCOM', industry: 'Industrial Goods & Services', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
  { ticker: 'VND', name: 'CTCP Chứng khoán VNDIRECT', exchange: 'HNX', industry: 'Financial Services', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội', exchange: 'HNX', industry: 'Banks', sector: 'Tài chính', is_financial: true, status: 'LISTED' },
  { ticker: 'PVS', name: 'Tổng CTCP Dịch vụ Kỹ thuật Dầu khí Việt Nam', exchange: 'HNX', industry: 'Oil & Gas', sector: 'Phi tài chính', is_financial: false, status: 'LISTED' },
];

interface CompaniesApiResponse {
  data: Company[];
  total_records?: number;
}

export const useCompaniesFilterQuery = (
  currentPage: number,
  pageSize: number,
  debouncedSearchTerm: string,
  selectedExchange: string,
  selectedIndustry: string,
  excludeFinancial: boolean
) => {
  return useQuery({
    queryKey: [
      'companies',
      currentPage,
      pageSize,
      debouncedSearchTerm,
      selectedExchange,
      selectedIndustry,
      excludeFinancial,
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        limit: pageSize,
      };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (selectedExchange !== 'ALL') params.exchange = selectedExchange;
      if (selectedIndustry !== 'ALL') params.industry = selectedIndustry;
      if (excludeFinancial) params.exclude_financial = true;

      const res = await apiClient.get<unknown, CompaniesApiResponse>('/companies', { params });
      return res;
    },
  });
};

