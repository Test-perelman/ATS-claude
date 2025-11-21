import React from 'react';
import { cn } from '@/lib/utils/cn';
import { getStatusColor } from '@/lib/utils/format';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'status' | 'info' | 'success' | 'warning' | 'error';
  status?: string;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', status, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';

    const getVariantStyles = () => {
      if (variant === 'status' && status) {
        return getStatusColor(status);
      }

      switch (variant) {
        case 'info':
          return 'bg-blue-100 text-blue-800';
        case 'success':
          return 'bg-green-100 text-green-800';
        case 'warning':
          return 'bg-yellow-100 text-yellow-800';
        case 'error':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, getVariantStyles(), className)}
        {...props}
      >
        {children || status}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
