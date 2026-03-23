import { FileSpreadsheet, FolderKanban, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, Wifi } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { canAccessUserManagement } from '../lib/auth';
import { Button } from './ui/button';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  showTabs?: boolean;
  projetosCount?: number;
  activeContextTitle?: string;
  activeContextDescription?: string;
}

export function Header({
  currentTab,
  onTabChange,
  showTabs = true,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const canAccessUsersTab = canAccessUserManagement(user);

  const tabs = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'projetos', label: 'Projetos', icon: FolderKanban },
    { id: 'wifi', label: 'Wi‑Fi Social', icon: Wifi },
    { id: 'relatorios', label: 'Relatórios', icon: FileSpreadsheet }
  ];

  if (canAccessUsersTab) {
    tabs.push({ id: 'usuarios', label: 'Usuários', icon: Users });
  }

  const renderTabs = (compact = false) => (
    <div className={`flex ${compact ? 'flex-col gap-2' : 'flex-wrap gap-1.5'}`}>
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
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? 'bg-slate-950 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[1480px] px-4 sm:px-6 lg:px-8">

        {/* Row 1: brand + user */}
        <div className="flex h-12 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950 text-white">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700/70 leading-none">SECTI DF</p>
              <p className="text-sm font-bold tracking-tight text-slate-900 leading-tight">Dashboard SUPCDT</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 sm:flex">
              <p className="text-sm font-medium text-slate-700">{user?.fullName || user?.username}</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{user?.role}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="h-7 rounded-full px-2.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="mr-1 h-3 w-3" />
              Sair
            </Button>
            {showTabs && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileNavOpen((v) => !v)}
                className="h-8 w-8 rounded-full text-slate-600 md:hidden"
                aria-label="Abrir navegação"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Row 2: tabs */}
        {showTabs && (
          <div className="hidden border-t border-slate-100 py-2 md:flex">
            {renderTabs(false)}
          </div>
        )}

        {/* Mobile nav dropdown */}
        {showTabs && mobileNavOpen && (
          <div className="border-t border-slate-100 py-3 md:hidden">
            {renderTabs(true)}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{user?.fullName || user?.username}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{user?.role}</p>
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="rounded-full border-slate-200 text-slate-700">
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sair
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
