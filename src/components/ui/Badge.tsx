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
          return 'bg-cyan-100 text-cyan-800';
        case 'success':
          return 'bg-green-100 text-green-800';
        case 'warning':
          return 'bg-amber-100 text-amber-800';
        case 'error':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-purple-100 text-purple-800';
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
