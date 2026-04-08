interface FullScreenStatusProps {
  title: string;
  description: string;
}

export function FullScreenStatus({ title, description }: FullScreenStatusProps) {
  return (
    <div
      data-theme-surface="fullscreen-status"
      className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_30%),linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] px-4 transition-colors"
    >
      <div className="glass-elevated rounded-[1.75rem] px-8 py-10 text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
