interface ModuleLoadingStateProps {
  title?: string;
  description?: string;
}

export function ModuleLoadingState({
  title = 'Carregando módulo',
  description = 'Preparando dados e componentes desta área.'
}: ModuleLoadingStateProps) {
  return (
    <div data-theme-surface="module-loading" className="space-y-5">
      <div className="overflow-hidden rounded-[1.65rem] border border-border/75 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_36%),linear-gradient(135deg,hsl(var(--card)/0.96),hsl(var(--card)/0.72))] p-5 shadow-[0_30px_80px_-45px_hsl(var(--foreground)/0.35)] backdrop-blur-xl transition-colors">
        <div className="max-w-2xl">
          <div className="h-3 w-32 animate-pulse rounded-full bg-primary/18" />
          <div className="mt-4 h-9 w-4/5 animate-pulse rounded-2xl bg-muted" />
          <div className="mt-2.5 h-4 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[1.45rem] border border-border/75 bg-card/80 p-5 shadow-[0_20px_70px_-42px_hsl(var(--foreground)/0.35)] transition-colors">
            <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
            <div className="mt-4 h-8 w-20 animate-pulse rounded-2xl bg-muted" />
            <div className="mt-3 h-4 w-32 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>

      <div className="rounded-[1.45rem] border border-border/75 bg-card/80 px-6 py-7 text-center shadow-[0_24px_70px_-42px_hsl(var(--foreground)/0.35)] transition-colors">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
        <p className="mt-4 font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
