import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className="w-full text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2.5 sm:py-2 border rounded-md text-xs sm:text-sm min-h-[44px] transition-colors duration-150 outline-none
          focus:ring-1 focus:ring-[#2f5da8] focus:border-[#2f5da8]
          bg-white dark:bg-gray-700/90 border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400
          disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-[11px] text-red-600 font-normal">{error}</p>
      )}
    </div>
  );
};
