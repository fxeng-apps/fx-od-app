import React from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'ghost' | 'default' | string;

interface BadgeProps {
  variant?: BadgeVariant;
  status?: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  status,
  children,
  className = '',
}) => {
  const normKey = (variant || status || 'default').toLowerCase();

  const variantStyles: Record<string, string> = {
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
    fully_approved: 'bg-[#DCFCE7] text-[#166534] border-[#22C55E]',
    partially_approved: 'bg-[#FFF7CC] text-[#8A6D00] border-[#E6C65A]',
    approved: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
    danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    info: 'bg-blue-50 text-[#2f5da8] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    ghost: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    default: 'bg-blue-50 text-[#2f5da8] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  };

  const currentStyle = variantStyles[normKey] || variantStyles.default;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${currentStyle} ${className}`}
    >
      {children || normKey.toUpperCase()}
    </span>
  );
};
