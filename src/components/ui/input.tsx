import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = 'text', ...props }, ref) => {
  return <input ref={ref} type={type} className={cn('flex h-11 md:h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />;
});

Input.displayName = 'Input';

export { Input };
