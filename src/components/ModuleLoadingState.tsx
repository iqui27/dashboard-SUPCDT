interface ModuleLoadingStateProps {
  title?: string;
  description?: string;
}

export function ModuleLoadingState({
  title = 'Carregando módulo',
  description = 'Preparando dados e componentes desta área.'
}: ModuleLoadingStateProps) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.10),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.72))] p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
        <div className="max-w-2xl">
          <div className="h-3 w-32 animate-pulse rounded-full bg-sky-100" />
          <div className="mt-5 h-10 w-4/5 animate-pulse rounded-2xl bg-slate-100" />
          <div className="mt-3 h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[1.75rem] border border-white/80 bg-white/85 p-6 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)]">
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-5 h-8 w-20 animate-pulse rounded-2xl bg-slate-100" />
            <div className="mt-3 h-4 w-32 animate-pulse rounded-full bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="rounded-[1.75rem] border border-white/80 bg-white/85 px-6 py-8 text-center shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-700" />
        <p className="mt-4 font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
