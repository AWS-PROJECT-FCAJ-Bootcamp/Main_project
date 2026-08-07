import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { FinancialStatementItem } from '@/types';

export const MOCK_FINANCIAL_DATA: Record<string, {
  years: string[];
  balanceSheet: FinancialStatementItem[];
  incomeStatement: FinancialStatementItem[];
  cashFlow: FinancialStatementItem[];
}> = {
  FPT: {
    years: ['2019', '2020', '2021', '2022', '2023', '2024'],
    balanceSheet: [
      { metric_code: 'BS_01', metric_name: 'TÀI SẢN NGẮN HẠN', unit: 'Tỷ VNĐ', category: 'Tài sản', values: { '2019': 22500, '2020': 26800, '2021': 32400, '2022': 38200, '2023': 44500, '2024': 52100 } },
      { metric_code: 'BS_02', metric_name: 'Hàng tồn kho', unit: 'Tỷ VNĐ', category: 'Tài sản', values: { '2019': 1450, '2020': 1620, '2021': 1980, '2022': 2350, '2023': 2850, '2024': 3400 } },
      { metric_code: 'BS_03', metric_name: 'TÀI SẢN DÀI HẠN', unit: 'Tỷ VNĐ', category: 'Tài sản', values: { '2019': 10800, '2020': 11900, '2021': 14100, '2022': 17600, '2023': 21300, '2024': 25800 } },
      { metric_code: 'BS_04', metric_name: 'TỔNG CỘNG TÀI SẢN', unit: 'Tỷ VNĐ', category: 'Tài sản', values: { '2019': 33300, '2020': 38700, '2021': 46500, '2022': 55800, '2023': 65800, '2024': 77900 } },
      { metric_code: 'BS_05', metric_name: 'NỢ PHẢI TRẢ', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 18100, '2020': 21400, '2021': 26200, '2022': 31500, '2023': 37100, '2024': 43800 } },
      { metric_code: 'BS_06', metric_name: 'Nợ ngắn hạn', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 16800, '2020': 19900, '2021': 24500, '2022': 29600, '2023': 35200, '2024': 41500 } },
      { metric_code: 'BS_07', metric_name: 'Nợ dài hạn', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 1300, '2020': 1500, '2021': 1700, '2022': 1900, '2023': 1900, '2024': 2300 } },
      { metric_code: 'BS_08', metric_name: 'VỐN CHỦ SỞ HỮU', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 15200, '2020': 17300, '2021': 20300, '2022': 24300, '2023': 28700, '2024': 34100 } },
      { metric_code: 'BS_09', metric_name: 'Lợi nhuận chưa phân phối', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 5400, '2020': 6200, '2021': 7600, '2022': 9400, '2023': 11800, '2024': 14600 } },
    ],
    incomeStatement: [
      { metric_code: 'IS_01', metric_name: 'Doanh thu thuần', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 27717, '2020': 29830, '2021': 35657, '2022': 44010, '2023': 52618, '2024': 62800 } },
      { metric_code: 'IS_02', metric_name: 'Giá vốn hàng bán', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 17200, '2020': 18100, '2021': 21700, '2022': 26800, '2023': 32100, '2024': 38200 } },
      { metric_code: 'IS_03', metric_name: 'Lợi nhuận gộp', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 10517, '2020': 11730, '2021': 13957, '2022': 17210, '2023': 20518, '2024': 24600 } },
      { metric_code: 'IS_04', metric_name: 'Chi phí lãi vay', unit: 'Tỷ VNĐ', category: 'Chi phí', values: { '2019': 420, '2020': 480, '2021': 560, '2022': 690, '2023': 810, '2024': 950 } },
      { metric_code: 'IS_05', metric_name: 'Lợi nhuận trước thuế (EBIT)', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 4686, '2020': 5263, '2021': 6337, '2022': 7652, '2023': 9203, '2024': 11100 } },
      { metric_code: 'IS_06', metric_name: 'Lợi nhuận sau thuế', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 3912, '2020': 4424, '2021': 5349, '2022': 6491, '2023': 7788, '2024': 9350 } },
    ],
    cashFlow: [
      { metric_code: 'CF_01', metric_name: 'Dòng tiền từ hoạt động kinh doanh (OCF)', unit: 'Tỷ VNĐ', category: 'Dòng tiền', values: { '2019': 4150, '2020': 5200, '2021': 6100, '2022': 7400, '2023': 8900, '2024': 10600 } },
      { metric_code: 'CF_02', metric_name: 'Dòng tiền từ hoạt động đầu tư', unit: 'Tỷ VNĐ', category: 'Dòng tiền', values: { '2019': -2800, '2020': -3100, '2021': -3900, '2022': -4500, '2023': -5200, '2024': -6100 } },
      { metric_code: 'CF_03', metric_name: 'Dòng tiền từ hoạt động tài chính', unit: 'Tỷ VNĐ', category: 'Dòng tiền', values: { '2019': -1100, '2020': -1500, '2021': -1800, '2022': -2200, '2023': -2900, '2024': -3500 } },
      { metric_code: 'CF_04', metric_name: 'Tăng/giảm tiền thuần trong kỳ', unit: 'Tỷ VNĐ', category: 'Dòng tiền', values: { '2019': 250, '2020': 600, '2021': 400, '2022': 700, '2023': 800, '2024': 1000 } },
    ],
  },
  VNM: {
    years: ['2019', '2020', '2021', '2022', '2023', '2024'],
    balanceSheet: [
      { metric_code: 'BS_01', metric_name: 'TÀI SẢN NGẮN HẠN', unit: 'Tỷ VNĐ', category: 'Tài sản', values: { '2019': 24700, '2020': 29500, '2021': 36100, '2022': 31200, '2023': 35800, '2024': 38900 } },
      { metric_code: 'BS_02', metric_name: 'Hàng tồn kho', unit: 'Tỷ VNĐ', category: 'Tài sản', values: { '2019': 4800, '2020': 4900, '2021': 6700, '2022': 5500, '2023': 6100, '2024': 6400 } },
      { metric_code: 'BS_03', metric_name: 'TÀI SẢN DÀI HẠN', unit: 'Tỷ VNĐ', category: 'Tài sản', values: { '2019': 19900, '2020': 18900, '2021': 17200, '2022': 17200, '2023': 16900, '2024': 17500 } },
      { metric_code: 'BS_04', metric_name: 'TỔNG CỘNG TÀI SẢN', unit: 'Tỷ VNĐ', category: 'Tài sản', values: { '2019': 44600, '2020': 48400, '2021': 53300, '2022': 48400, '2023': 52700, '2024': 56400 } },
      { metric_code: 'BS_05', metric_name: 'NỢ PHẢI TRẢ', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 14900, '2020': 14800, '2021': 17400, '2022': 15600, '2023': 17600, '2024': 18900 } },
      { metric_code: 'BS_06', metric_name: 'Nợ ngắn hạn', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 14600, '2020': 14400, '2021': 17000, '2022': 15300, '2023': 17300, '2024': 18500 } },
      { metric_code: 'BS_07', metric_name: 'Nợ dài hạn', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 300, '2020': 400, '2021': 400, '2022': 300, '2023': 300, '2024': 400 } },
      { metric_code: 'BS_08', metric_name: 'VỐN CHỦ SỞ HỮU', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 29700, '2020': 33600, '2021': 35900, '2022': 32800, '2023': 35100, '2024': 37500 } },
      { metric_code: 'BS_09', metric_name: 'Lợi nhuận chưa phân phối', unit: 'Tỷ VNĐ', category: 'Nguồn vốn', values: { '2019': 7800, '2020': 8900, '2021': 9200, '2022': 7900, '2023': 8500, '2024': 9100 } },
    ],
    incomeStatement: [
      { metric_code: 'IS_01', metric_name: 'Doanh thu thuần', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 56318, '2020': 59636, '2021': 60919, '2022': 59956, '2023': 60479, '2024': 63100 } },
      { metric_code: 'IS_02', metric_name: 'Giá vốn hàng bán', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 30000, '2020': 31900, '2021': 34700, '2022': 36000, '2023': 35800, '2024': 36900 } },
      { metric_code: 'IS_03', metric_name: 'Lợi nhuận gộp', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 26318, '2020': 27736, '2021': 26219, '2022': 23956, '2023': 24679, '2024': 26200 } },
      { metric_code: 'IS_04', metric_name: 'Chi phí lãi vay', unit: 'Tỷ VNĐ', category: 'Chi phí', values: { '2019': 110, '2020': 150, '2021': 190, '2022': 280, '2023': 340, '2024': 310 } },
      { metric_code: 'IS_05', metric_name: 'Lợi nhuận trước thuế (EBIT)', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 12796, '2020': 13519, '2021': 12922, '2022': 10496, '2023': 10968, '2024': 11800 } },
      { metric_code: 'IS_06', metric_name: 'Lợi nhuận sau thuế', unit: 'Tỷ VNĐ', category: 'Kết quả KD', values: { '2019': 10554, '2020': 11236, '2021': 10632, '2022': 8578, '2023': 9019, '2024': 9650 } },
    ],
    cashFlow: [
      { metric_code: 'CF_01', metric_name: 'Dòng tiền từ hoạt động kinh doanh (OCF)', unit: 'Tỷ VNĐ', category: 'Dòng tiền', values: { '2019': 10200, '2020': 11400, '2021': 9800, '2022': 8900, '2023': 9500, '2024': 10100 } },
      { metric_code: 'CF_02', metric_name: 'Dòng tiền từ hoạt động đầu tư', unit: 'Tỷ VNĐ', category: 'Dòng tiền', values: { '2019': -2100, '2020': -3200, '2021': -2900, '2022': 1400, '2023': -1800, '2024': -2200 } },
      { metric_code: 'CF_03', metric_name: 'Dòng tiền từ hoạt động tài chính', unit: 'Tỷ VNĐ', category: 'Dòng tiền', values: { '2019': -7800, '2020': -8100, '2021': -8200, '2022': -8900, '2023': -8100, '2024': -8400 } },
      { metric_code: 'CF_04', metric_name: 'Tăng/giảm tiền thuần trong kỳ', unit: 'Tỷ VNĐ', category: 'Dòng tiền', values: { '2019': 300, '2020': 100, '2021': -1300, '2022': 1400, '2023': -400, '2024': -500 } },
    ],
  },
};

export interface FinancialReportData {
  ticker: string;
  period_type: string;
  periods: string[];
  balance_sheet: FinancialStatementItem[];
  income_statement: FinancialStatementItem[];
  cash_flow: FinancialStatementItem[];
}

export const useFinancialReportQuery = (ticker: string, periodType: 'YEARLY' | 'QUARTERLY') => {
  return useQuery({
    queryKey: ['financial-report', ticker, periodType],
    queryFn: async () => {
      try {
        const res = await apiClient.get<unknown, { data: FinancialReportData }>(
          `/financial-reports/${ticker}`,
          { params: { period_type: periodType } }
        );
        return res?.data;
      } catch {
        return null;
      }
    },
    enabled: !!ticker,
  });
};
