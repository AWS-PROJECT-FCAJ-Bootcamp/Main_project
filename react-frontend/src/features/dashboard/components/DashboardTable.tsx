import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import type { PriceData } from '@/types';

interface DashboardTableProps {
  prices: PriceData[];
}

export const DashboardTable: React.FC<DashboardTableProps> = ({ prices }) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <button
        onClick={() => setShowTable((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span>Dữ liệu Curated ({prices.length} dòng)</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${showTable ? 'rotate-180' : ''}`} />
      </button>

      {showTable && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {['Ngày', 'Mở cửa', 'Cao nhất', 'Thấp nhất', 'Đóng cửa', 'Khối lượng', 'MA20', 'RSI 14'].map((h) => (
                  <th key={h} className="table-header whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {prices.slice(-30).reverse().map((p, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell font-medium text-slate-600">{format(new Date(p.trading_date), 'dd/MM/yyyy')}</td>
                  <td className="table-cell text-right">{p.open_price.toLocaleString('vi-VN')}</td>
                  <td className="table-cell text-right text-emerald-600 font-medium">{p.high_price.toLocaleString('vi-VN')}</td>
                  <td className="table-cell text-right text-red-500 font-medium">{p.low_price.toLocaleString('vi-VN')}</td>
                  <td className="table-cell text-right font-semibold text-slate-800">{p.close_price.toLocaleString('vi-VN')}</td>
                  <td className="table-cell text-right">{p.volume.toLocaleString('vi-VN')}</td>
                  <td className="table-cell text-right text-amber-600">{p.ma20 != null ? p.ma20.toFixed(0) : '—'}</td>
                  <td className="table-cell text-right">{p.rsi_14 != null ? p.rsi_14.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-center">
            Hiển thị 30 phiên gần nhất
          </div>
        </div>
      )}
    </div>
  );
};
