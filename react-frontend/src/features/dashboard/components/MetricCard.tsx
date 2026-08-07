import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: number;
  icon: React.ReactNode;
  prefix?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, delta, icon, prefix }) => {
  const isPositive = delta !== undefined && delta >= 0;
  return (
    <div className="metric-card group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors duration-200">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">
        {prefix && <span className="text-slate-400 text-lg font-medium">{prefix}</span>}
        {value}
      </div>
      {delta !== undefined && (
        <div className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {delta > 0 ? '+' : ''}{delta.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} so với phiên trước
        </div>
      )}
    </div>
  );
};
