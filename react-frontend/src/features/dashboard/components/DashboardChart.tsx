import React, { useState } from 'react';
import { format } from 'date-fns';
import { Eye, EyeOff } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import type { PriceData } from '@/types';

interface DashboardChartProps {
  ticker: string;
  prices: PriceData[];
  isLoading: boolean;
}

interface CustomTooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 p-3 text-sm">
      <p className="font-semibold text-slate-600 mb-2">{format(new Date(label), 'dd/MM/yyyy')}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-bold text-slate-800">{entry.value?.toLocaleString('vi-VN')}</span>
        </div>
      ))}
    </div>
  );
};

export const DashboardChart: React.FC<DashboardChartProps> = ({ ticker, prices, isLoading }) => {
  const [showChart, setShowChart] = useState(true);

  if (isLoading) {
    return <div className="skeleton h-72 w-full rounded-xl" />;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Biểu đồ phân tích kỹ thuật — {ticker}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{prices.length} phiên giao dịch</p>
        </div>
        <button
          onClick={() => setShowChart((p) => !p)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showChart ? <><EyeOff size={13} /> Ẩn</> : <><Eye size={13} /> Hiện</>}
        </button>
      </div>

      {showChart && (
        <div className="p-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={prices} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="trading_date"
                tickFormatter={(v) => format(new Date(v as string), 'dd/MM')}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} iconType="circle" iconSize={8} />
              <Area
                type="monotone"
                dataKey="close_price"
                name="Close Price"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorClose)"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="ma20"
                name="MA20"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
