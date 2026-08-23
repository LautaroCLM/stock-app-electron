'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  error: string | null;
  onDismiss?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  return (
    <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-medium">
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>{error}</span>
      </div>
      {onDismiss ? (
        <button onClick={onDismiss} className="underline hover:no-underline text-xs">
          Descartar
        </button>
      ) : null}
    </div>
  );
};
