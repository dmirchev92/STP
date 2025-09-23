import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'construction' | 'professional';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', icon, children, ...props }, ref) => {
    const baseClasses = `
      inline-flex items-center gap-1 font-medium rounded-full
      transition-all duration-200 ease-in-out
      border
    `;

    const variants = {
      default: `
        bg-gray-100 text-gray-800 border-gray-200
        hover:bg-gray-200
      `,
      primary: `
        bg-blue-100 text-blue-800 border-blue-200
        hover:bg-blue-200
      `,
      success: `
        bg-green-100 text-green-800 border-green-200
        hover:bg-green-200
      `,
      warning: `
        bg-yellow-100 text-yellow-800 border-yellow-200
        hover:bg-yellow-200
      `,
      error: `
        bg-red-100 text-red-800 border-red-200
        hover:bg-red-200
      `,
      info: `
        bg-blue-100 text-blue-800 border-blue-200
        hover:bg-blue-200
      `,
      outline: `
        bg-transparent text-gray-600 border-gray-300
        hover:bg-gray-50
      `,
      construction: `
        bg-gradient-to-r from-orange-500 to-orange-600 text-white border-transparent
        hover:from-orange-600 hover:to-orange-700
        shadow-sm hover:shadow-md
      `,
      professional: `
        bg-gradient-to-r from-slate-600 to-slate-700 text-white border-transparent
        hover:from-slate-700 hover:to-slate-800
        shadow-sm hover:shadow-md
      `
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base'
    };

    return (
      <div
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </div>
    );
  }
);

Badge.displayName = 'Badge';

// Status Badge Component for case statuses
interface StatusBadgeProps {
  status: 'open' | 'wip' | 'closed' | 'pending' | 'accepted' | 'declined';
  size?: BadgeProps['size'];
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className }) => {
  const statusConfig = {
    open: {
      variant: 'success' as const,
      icon: '🟢',
      label: 'Отворена'
    },
    wip: {
      variant: 'warning' as const,
      icon: '⚡',
      label: 'В процес'
    },
    closed: {
      variant: 'default' as const,
      icon: '✅',
      label: 'Затворена'
    },
    pending: {
      variant: 'info' as const,
      icon: '⏳',
      label: 'Очаква'
    },
    accepted: {
      variant: 'success' as const,
      icon: '✅',
      label: 'Приета'
    },
    declined: {
      variant: 'error' as const,
      icon: '❌',
      label: 'Отказана'
    }
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      size={size}
      className={className}
      icon={<span>{config.icon}</span>}
    >
      {config.label}
    </Badge>
  );
};

// Rating Badge Component
interface RatingBadgeProps {
  rating: number;
  totalReviews?: number;
  size?: BadgeProps['size'];
  showCount?: boolean;
  className?: string;
}

const RatingBadge: React.FC<RatingBadgeProps> = ({ 
  rating, 
  totalReviews = 0, 
  size = 'md', 
  showCount = true,
  className 
}) => {
  const getVariant = (rating: number) => {
    if (rating >= 4.5) return 'construction';
    if (rating >= 4.0) return 'success';
    if (rating >= 3.0) return 'warning';
    return 'error';
  };

  return (
    <Badge
      variant={getVariant(rating)}
      size={size}
      className={className}
      icon={<span>⭐</span>}
    >
      {rating.toFixed(1)}
      {showCount && totalReviews > 0 && (
        <span className="opacity-75">({totalReviews})</span>
      )}
    </Badge>
  );
};

export { Badge, StatusBadge, RatingBadge };
export type { BadgeProps, StatusBadgeProps, RatingBadgeProps };
