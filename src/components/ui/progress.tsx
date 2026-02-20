import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  color?: string;
}

export function Progress({ value, color, className, ...props }: ProgressProps) {
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted/60', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all', color ? '' : 'bg-primary')}
        style={{
          width: `${Math.min(Math.max(value, 0), 100)}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
}
