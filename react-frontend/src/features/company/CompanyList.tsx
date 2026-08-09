import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  useCompaniesFilterQuery,
  DEFAULT_COMPANIES,
  STANDARD_INDUSTRIES,
  type IndustryOption,
} from './api/useCompaniesFilterQuery';
import { CompanyFilterControl } from './components/CompanyFilterControl';
import { CompanyTable } from './components/CompanyTable';
import type { Company } from '@/types';

// Helper to determine financial sector using both English ICB and Vietnamese keywords
const checkIsFinancial = (ind: string): boolean => {
  const clean = ind.toLowerCase().trim();
  const finKeywords = [
    'banks',
    'financial services',
    'insurance',
    'ngân hàng',
    'chứng khoán',
    'bảo hiểm',
    'tài chính',
    'bank',
  ];
  return finKeywords.some((kw) => clean.includes(kw));
};

// Helper for client-side fallback industry matching
const matchesIndustry = (companyIndustry: string, targetIndustry: string): boolean => {
  if (targetIndustry === 'ALL') return true;
  if (!companyIndustry) return false;
  const cInd = companyIndustry.toLowerCase().trim();
  const tInd = targetIndustry.toLowerCase().trim();

  if (cInd === tInd) return true;

  // Substring or bilingual fallback mapping
  const aliases: Record<string, string[]> = {
    'banks': ['ngân hàng', 'bank'],
    'financial services': ['dịch vụ tài chính', 'chứng khoán', 'financial'],
    'insurance': ['bảo hiểm', 'insurance'],
    'technology': ['công nghệ', 'technology', 'tech'],
    'real estate': ['bất động sản', 'real estate'],
    'basic resources': ['tài nguyên', 'thép', 'basic resources'],
    'food & beverage': ['thực phẩm', 'đồ uống', 'food & beverage'],
    'industrial goods & services': ['công nghiệp', 'vận tải', 'industrial goods'],
    'construction & materials': ['xây dựng', 'vật liệu', 'construction'],
    'utilities': ['tiện ích', 'điện', 'nước', 'utilities'],
    'chemicals': ['hóa chất', 'chemicals'],
    'health care': ['y tế', 'dược phẩm', 'health care'],
    'automobiles & parts': ['ô tô', 'phụ tùng', 'automobiles'],
    'personal & household goods': ['hàng cá nhân', 'gia dụng'],
    'travel & leisure': ['du lịch', 'giải trí', 'travel'],
    'media': ['truyền thông', 'media'],
    'retail': ['bán lẻ', 'retail'],
    'oil & gas': ['dầu khí', 'oil & gas'],
  };

  const aliasList = aliases[tInd] || [];
  return aliasList.some((alias) => cInd.includes(alias));
};

export const CompanyList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedExchange, setSelectedExchange] = useState<string>('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('ALL');
  const [excludeFinancial, setExcludeFinancial] = useState<boolean>(true);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: apiData, isLoading, refetch } = useCompaniesFilterQuery(
    currentPage,
    pageSize,
    debouncedSearchTerm,
    selectedExchange,
    selectedIndustry,
    excludeFinancial
  );

  // Normalize base list
  const baseCompanies: Company[] = useMemo(() => {
    const list = apiData?.data ?? [];
    const source = list;
    return source.map((c: Company) => {
      const exchange = c.exchange || c.market || 'HOSE';
      const industry = c.industry || c.sector || 'Unassigned';
      const isFin = c.is_financial ?? checkIsFinancial(industry);
      return {
        ...c,
        name: c.name || `CTCP ${c.ticker}`,
        exchange,
        industry,
        is_financial: isFin,
        sector: isFin ? 'Tài chính' : 'Phi tài chính',
        status: c.status || 'LISTED',
      };
    });
  }, [apiData]);

  // Industry dropdown options merged with standard ICB taxonomy
  const industries: IndustryOption[] = useMemo(() => {
    const existing = new Set<string>();
    baseCompanies.forEach((c) => {
      if (c.industry) existing.add(c.industry);
    });

    const optionsMap = new Map<string, IndustryOption>();
    STANDARD_INDUSTRIES.forEach((item) => {
      optionsMap.set(item.value, item);
    });

    // Add any non-standard industry dynamically
    existing.forEach((ind) => {
      if (!optionsMap.has(ind)) {
        optionsMap.set(ind, { value: ind, label: ind });
      }
    });

    return Array.from(optionsMap.values());
  }, [baseCompanies]);

  // Smart dual-mode filtering: If backend returns real server-filtered data, use directly.
  // Otherwise, apply client-side filtering on fallback data.
  const filteredCompanies = useMemo(() => {
    if (apiData?.data && apiData.data.length > 0 && apiData.total_records !== undefined) {
      return baseCompanies;
    }
    return baseCompanies.filter((c) => {
      if (excludeFinancial && c.is_financial) return false;
      const ex = (c.exchange || '').toUpperCase();
      if (selectedExchange !== 'ALL' && ex !== selectedExchange.toUpperCase()) return false;
      if (!matchesIndustry(c.industry || '', selectedIndustry)) return false;
      if (debouncedSearchTerm) {
        const query = debouncedSearchTerm.toLowerCase();
        const matchTicker = c.ticker.toLowerCase().includes(query);
        const matchName = c.name?.toLowerCase().includes(query);
        if (!matchTicker && !matchName) return false;
      }
      return true;
    });
  }, [baseCompanies, apiData, excludeFinancial, selectedExchange, selectedIndustry, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedExchange, selectedIndustry, excludeFinancial, pageSize]);

  const totalRecords = apiData?.total_records ?? filteredCompanies.length;
  const financialCount = baseCompanies.filter((c) => c.is_financial).length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;

  // Paginated slice for display
  const paginatedCompanies = useMemo(() => {
    if (apiData?.data && apiData.data.length > 0 && apiData.total_records !== undefined) {
      return filteredCompanies;
    }
    return filteredCompanies.slice(startIndex, startIndex + pageSize);
  }, [filteredCompanies, startIndex, pageSize, apiData]);

  const endIndex = Math.min(startIndex + paginatedCompanies.length, totalRecords);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Danh sách Doanh nghiệp Niêm yết</h1>
            <span className="badge-slate font-mono">Mục 4 — Bước 1</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý và lọc danh sách doanh nghiệp trên HOSE, HNX, UPCOM phục vụ thu thập dữ liệu & huấn luyện AI.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2 self-start sm:self-auto">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <CompanyFilterControl
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedExchange={selectedExchange}
        onExchangeChange={setSelectedExchange}
        selectedIndustry={selectedIndustry}
        onIndustryChange={setSelectedIndustry}
        industries={industries}
        excludeFinancial={excludeFinancial}
        onToggleExcludeFinancial={() => setExcludeFinancial((prev) => !prev)}
        filteredCount={totalRecords}
        totalRaw={baseCompanies.length}
        financialCount={financialCount}
      />

      <CompanyTable
        companies={paginatedCompanies}
        filteredCount={totalRecords}
        startIndex={startIndex}
        endIndex={endIndex}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        currentPage={currentPage}
        totalPages={totalPages}
        pageNumbers={pageNumbers}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default CompanyList;

