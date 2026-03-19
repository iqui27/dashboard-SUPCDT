interface FullScreenStatusProps {
  title: string;
  description: string;
}

export function FullScreenStatus({ title, description }: FullScreenStatusProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[linear-gradient(135deg,#eaf4fb_0%,#f8fafc_40%,#eef6f2_100%)]">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/90 px-8 py-10 text-center shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-700" />
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}
