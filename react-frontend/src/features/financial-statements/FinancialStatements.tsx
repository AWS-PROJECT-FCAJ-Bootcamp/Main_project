import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Play } from 'lucide-react';
import { getCompanies } from '@/services/api';
import { FinancialViewer } from './components/FinancialViewer';
import { FinancialIngestion } from './components/FinancialIngestion';
import type { Company } from '@/types';

export const FinancialStatements: React.FC = () => {
  const [activeMainTab, setActiveMainTab] = useState<'VIEWER' | 'INGESTION'>('VIEWER');

  const { data: companiesData } = useQuery({
    queryKey: ['companies-financial-dropdown'],
    queryFn: () => getCompanies(1, 100),
  });

  const companies: Company[] = useMemo(() => {
    return companiesData?.data ?? [];
  }, [companiesData]);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Báo cáo Tài chính Doanh nghiệp</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Thu thập & tra cứu 3 bảng báo cáo tài chính cốt lõi: Bảng Cân đối Kế toán, KQKD và Lưu chuyển Tiền tệ.
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            onClick={() => setActiveMainTab('VIEWER')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeMainTab === 'VIEWER' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText size={14} /> Tra cứu 3 Bảng BCTC
          </button>
          <button
            onClick={() => setActiveMainTab('INGESTION')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeMainTab === 'INGESTION' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play size={14} /> Trình Thu thập BCTC
          </button>
        </div>
      </div>

      {activeMainTab === 'VIEWER' ? (
        <FinancialViewer companies={companies} />
      ) : (
        <FinancialIngestion />
      )}
    </div>
  );
};

export default FinancialStatements;
