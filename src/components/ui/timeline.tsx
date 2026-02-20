import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface TimelineItemProps {
  indicator?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function TimelineItem({ indicator, title, description, meta, className }: TimelineItemProps) {
  return (
    <li className={cn('relative pl-6', className)}>
      <span className="absolute left-0 top-1 flex h-2 w-2 -translate-x-1/2 items-center justify-center rounded-full border border-primary/50 bg-background text-[10px] leading-none text-primary">
        {indicator}
      </span>
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
      </div>
    </li>
  );
}

interface TimelineProps {
  children: ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <ol className={cn('relative border-l border-border pl-6', className)}>
      {children}
    </ol>
  );
}
