'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

interface KpiWidgetCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor?: string; // e.g. 'bg-emerald-100 text-emerald-600'
  badge?: React.ReactNode;
  isLoading?: boolean;
}

export const KpiWidgetCard: React.FC<KpiWidgetCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  badge,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="w-24 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-32 h-7 bg-slate-300 dark:bg-slate-700 rounded" />
            </div>
            <div className="w-11 h-11 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="mt-3 w-20 h-4 bg-slate-100 dark:bg-slate-850 rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{title}</p>
            <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {value}
            </h4>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBgColor}`}>
            {icon}
          </div>
        </div>
        {subtitle || badge ? (
          <div className="mt-3 flex items-center justify-between text-xs">
            {subtitle ? <span className="text-slate-500 dark:text-slate-400">{subtitle}</span> : <div />}
            {badge ? <div>{badge}</div> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
