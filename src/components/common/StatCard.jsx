import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const COLOR_MAP = {
  indigo: {
    bg: 'bg-indigo-50/80',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-600 text-white',
    ring: 'focus-within:ring-indigo-500/20',
  },
  emerald: {
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-600 text-white',
    ring: 'focus-within:ring-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-50/80',
    border: 'border-amber-100',
    iconBg: 'bg-amber-500 text-white',
    ring: 'focus-within:ring-amber-500/20',
  },
  rose: {
    bg: 'bg-rose-50/80',
    border: 'border-rose-100',
    iconBg: 'bg-rose-600 text-white',
    ring: 'focus-within:ring-rose-500/20',
  },
  blue: {
    bg: 'bg-sky-50/80',
    border: 'border-sky-100',
    iconBg: 'bg-sky-600 text-white',
    ring: 'focus-within:ring-sky-500/20',
  },
  slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconBg: 'bg-slate-700 text-white',
    ring: 'focus-within:ring-slate-500/20',
  },
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendType = 'up', // 'up' | 'down' | 'neutral'
  changeLabel,
  color = 'indigo',
  subtitle,
  onClick,
  badge,
  className = '',
}) => {
  const theme = COLOR_MAP[color] || COLOR_MAP.indigo;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-sm ${onClick ? 'cursor-pointer' : ''
        } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {value}
            </h3>
            {badge && <div>{badge}</div>}
          </div>
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-xs ${theme.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(trend !== undefined || changeLabel || subtitle) && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          {trend !== undefined && (
            <span
              className={`inline-flex items-center font-semibold ${trendType === 'up'
                  ? 'text-emerald-600'
                  : trendType === 'down'
                    ? 'text-rose-600'
                    : 'text-slate-600'
                }`}
            >
              {trendType === 'up' ? (
                <TrendingUp className="mr-0.5 h-3.5 w-3.5" />
              ) : trendType === 'down' ? (
                <TrendingDown className="mr-0.5 h-3.5 w-3.5" />
              ) : null}
              {trend}
            </span>
          )}
          {changeLabel && <span>{changeLabel}</span>}
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;
