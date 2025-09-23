import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'construction' | 'professional' | 'industrial';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    leftIcon,
    rightIcon,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = `
      inline-flex items-center justify-center gap-2 font-medium rounded-lg
      transition-all duration-300 ease-in-out transform
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
      active:scale-95 hover:scale-105
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-blue-600 to-blue-700 text-white
        hover:from-blue-700 hover:to-blue-800
        shadow-lg hover:shadow-xl
        border border-transparent
      `,
      secondary: `
        bg-blue-50 text-blue-700 border border-blue-200
        hover:bg-blue-100 hover:border-blue-300
        shadow-sm hover:shadow-md
      `,
      outline: `
        bg-transparent text-blue-600 border-2 border-blue-600
        hover:bg-blue-600 hover:text-white
        shadow-sm hover:shadow-lg
      `,
      ghost: `
        bg-transparent text-gray-600 border border-transparent
        hover:bg-gray-100 hover:text-gray-700
      `,
      construction: `
        bg-gradient-to-r from-orange-500 to-orange-600 text-white
        hover:from-orange-600 hover:to-orange-700
        shadow-lg hover:shadow-xl
        border border-transparent
        font-semibold
      `,
      professional: `
        bg-gradient-to-r from-slate-600 to-slate-700 text-white
        hover:from-slate-700 hover:to-slate-800
        shadow-lg hover:shadow-xl
        border border-transparent
      `,
      industrial: `
        bg-gradient-to-r from-blue-600 via-slate-600 to-orange-500 text-white
        hover:from-blue-700 hover:via-slate-700 hover:to-orange-600
        shadow-lg hover:shadow-2xl
        border border-transparent
        relative overflow-hidden
        before:absolute before:inset-0 before:bg-gradient-to-r 
        before:from-white/10 before:to-transparent before:opacity-0
        hover:before:opacity-100 before:transition-opacity before:duration-300
      `
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-sm h-10',
      lg: 'px-6 py-3 text-base h-12',
      xl: 'px-8 py-4 text-lg h-14'
    };

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          isLoading && 'cursor-wait',
          className
        )}
        disabled={disabled || isLoading}
        ref={ref}
        {...props}
      >
        {isLoading ? (
          <>
            <svg 
              className="animate-spin h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Зареждане...
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
