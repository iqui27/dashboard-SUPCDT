import { FileSpreadsheet, FolderKanban, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, Wifi } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  showTabs?: boolean;
  projetosCount?: number;
  activeContextTitle?: string;
  activeContextDescription?: string;
}

function BrandMark() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#0f766e_100%)] text-white shadow-[0_20px_40px_-24px_rgba(15,23,42,0.75)]">
      <ShieldCheck className="h-6 w-6" />
    </div>
  );
}

export function Header({
  currentTab,
  onTabChange,
  showTabs = true,
  projetosCount = 0,
  activeContextTitle,
  activeContextDescription
}: HeaderProps) {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'projetos', label: 'Projetos', icon: FolderKanban },
    { id: 'wifi', label: 'Wi‑Fi Social', icon: Wifi },
    { id: 'relatorios', label: 'Relatórios', icon: FileSpreadsheet }
  ];

  if (user?.role === 'admin') {
    tabs.push({ id: 'usuarios', label: 'Usuários', icon: Users });
  }

  const currentTabLabel = tabs.find((tab) => tab.id === currentTab)?.label ?? 'Módulo ativo';

  const renderTabs = (compact = false) => (
    <div className={`flex ${compact ? 'flex-col gap-2' : 'flex-wrap gap-2'}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setMobileNavOpen(false);
              onTabChange(tab.id);
            }}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? 'bg-slate-950 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.8)]'
                : 'bg-white/75 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(248,250,252,0.78))] backdrop-blur-2xl">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <BrandMark />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sky-700/75">SECTI DF</p>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-950">Dashboard SUPCDT</h1>
                <p className="text-sm text-slate-500">Monitoramento institucional de projetos e operações</p>
              </div>
            </div>

            <div className="flex items-center gap-3 xl:gap-4">
              <div className="hidden rounded-2xl border border-white/80 bg-white/80 px-4 py-2.5 shadow-sm sm:block">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Projetos monitorados</p>
                <p className="mt-1 text-base font-semibold text-slate-950">{projetosCount}</p>
              </div>

              <div className="hidden rounded-2xl border border-white/80 bg-white/80 px-4 py-2.5 shadow-sm sm:block">
                <p className="text-sm font-semibold text-slate-950">{user?.fullName || user?.username}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{user?.role}</p>
              </div>

              <Button
                variant="outline"
                onClick={logout}
                className="hidden rounded-full border-slate-200 bg-white/80 text-slate-700 hover:bg-white md:inline-flex"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>

              {showTabs && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMobileNavOpen((current) => !current)}
                  className="rounded-full border-slate-200 bg-white/80 text-slate-700 md:hidden"
                  aria-label="Abrir navegação"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {showTabs && (
            <div className="hidden items-center justify-between gap-4 md:flex">
              {renderTabs(false)}
              <div className="rounded-full bg-white/70 px-4 py-2 text-sm text-slate-500 shadow-sm">
                Acesso autenticado e navegação protegida.
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-4 shadow-sm lg:max-w-[60%]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  {currentTabLabel}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/80">Contexto ativo</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-950">{activeContextTitle || currentTabLabel}</p>
              <p className="mt-1 text-sm text-slate-500">{activeContextDescription || 'Área ativa do dashboard institucional.'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
              <div className="rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Módulo atual</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{currentTabLabel}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Carteira carregada</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{projetosCount} projeto(s)</p>
              </div>
            </div>
          </div>

          {showTabs && mobileNavOpen && (
            <div className="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.45)] md:hidden">
              {renderTabs(true)}
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{user?.fullName || user?.username}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{user?.role}</p>
                </div>
                <Button variant="outline" onClick={logout} className="rounded-full border-slate-200 bg-white text-slate-700">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
