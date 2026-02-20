import { LayoutDashboard, FolderKanban, FileSpreadsheet, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  showTabs?: boolean;
}

function TargetIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function Header({ currentTab, onTabChange, showTabs = true }: HeaderProps) {
  const { user } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Estatísticas', icon: LayoutDashboard },
    { id: 'projetos', label: 'Projetos e Metas', icon: FolderKanban },
    { id: 'relatorios', label: 'Relatórios', icon: FileSpreadsheet },
  ];

  if (user?.role === 'admin') {
    tabs.push({ id: 'usuarios', label: 'Usuários', icon: Users });
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200 bg-white/70 backdrop-blur-2xl shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo / Branding */}
        <div className="flex items-center gap-3 group">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 flex items-center justify-center glow-accent transition-all group-hover:bg-primary/20">
            <TargetIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wider text-gradient">
              SUPCDT
            </h1>
          </div>
        </div>

        {/* Navigation Tabs */}
        {showTabs && (
          <nav className="hidden md:flex items-center gap-2 bg-zinc-100/50 p-1.5 rounded-xl border border-zinc-200/50 shadow-inner">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${isActive
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-zinc-200/50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-right hidden sm:block">
            <p className="font-semibold text-foreground tracking-wide">{user?.fullName || user?.username}</p>
            <p className="text-xs text-primary/80 uppercase tracking-widest font-bold">{user?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20 shadow-inner glow-accent">
            {(user?.fullName || user?.username)?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}