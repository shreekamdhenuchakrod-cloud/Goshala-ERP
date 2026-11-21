import React from 'react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  };
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  trend,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {value}
        </div>

        {(subtitle || badge || trend) && (
          <div className="mt-2.5 flex items-center flex-wrap gap-2 text-xs">
            {trend && (
              <span
                className={`inline-flex items-center text-[11px] font-semibold ${
                  trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {trend.isPositive ? '↑ ' : '↓ '}
                {trend.value}
                {trend.label && (
                  <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">
                    {trend.label}
                  </span>
                )}
              </span>
            )}

            {badge && (
              <span
                className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  badge.variant === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                    : badge.variant === 'danger'
                    ? 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                    : badge.variant === 'warning'
                    ? 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                    : badge.variant === 'info'
                    ? 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50'
                    : 'bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
              >
                {badge.text}
              </span>
            )}

            {subtitle && !trend && (
              <span className="text-slate-400 dark:text-slate-500 text-[11px] truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
