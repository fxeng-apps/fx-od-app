import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 border border-gray-300/90 dark:border-gray-700 rounded-md p-4 shadow-xs ${onClick ? 'cursor-pointer hover:border-[#2f5da8]/60 dark:hover:border-[#2f5da8]/70' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
