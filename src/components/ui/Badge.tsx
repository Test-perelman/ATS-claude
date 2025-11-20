import React from 'react';
import { cn } from '@/lib/utils/cn';
import { getStatusColor } from '@/lib/utils/format';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'status';
  status?: string;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', status, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';

    const variantStyles =
      variant === 'status' && status
        ? getStatusColor(status)
        : 'bg-gray-100 text-gray-800';

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variantStyles, className)}
        {...props}
      >
        {children || status}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
