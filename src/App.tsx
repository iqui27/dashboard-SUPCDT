import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';

import { Header } from './components/Header';
import { ModuleLoadingState } from './components/ModuleLoadingState';
import { useAuth } from './contexts/AuthContext';
import { canAccessUserManagement } from './lib/auth';
import { fetchProjetos } from './lib/api/projetos';
import { Projeto } from './types/projeto';

type AppTab = 'dashboard' | 'projetos' | 'wifi' | 'relatorios' | 'usuarios';

const DashboardGeral = lazy(() => import('./components/supcdt/DashboardGeral').then((module) => ({ default: module.DashboardGeral })));
const DetalheProjeto = lazy(() => import('./components/supcdt/DetalheProjeto').then((module) => ({ default: module.DetalheProjeto })));
const ListaProjetos = lazy(() => import('./components/supcdt/ListaProjetos').then((module) => ({ default: module.ListaProjetos })));
const Relatorios = lazy(() => import('./components/supcdt/Relatorios').then((module) => ({ default: module.Relatorios })));
const WifiSocial = lazy(() => import('./components/wifi/WifiSocial').then((module) => ({ default: module.WifiSocial })));
const UserManagement = lazy(() => import('./components/UserManagement').then((module) => ({ default: module.UserManagement })));

export function App() {
  const { user, token, requirePasswordChange } = useAuth();
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const canAccessUsersTab = canAccessUserManagement(user);

  const loadProjetos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchProjetos(token);
      setProjetos(data);
    } catch (error) {
      console.error('Failed to load projetos', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token && !requirePasswordChange) {
      loadProjetos();
    }
  }, [user, token, requirePasswordChange, loadProjetos]);

  useEffect(() => {
    if (currentTab === 'usuarios' && !canAccessUsersTab) {
      setCurrentTab('dashboard');
    }
  }, [canAccessUsersTab, currentTab]);

  if (!user) {
    return null;
  }

  const selectedProject = selectedProjectId
    ? projetos.find((projeto) => projeto.id === selectedProjectId) ?? null
    : null;
  const tabForHeader: AppTab = selectedProject ? 'projetos' : currentTab;
  const activeContext = selectedProject
    ? {
        title: selectedProject.nome,
        description: 'Detalhe executivo, metas e monitoramento operacional do projeto em foco.'
      }
    : {
        dashboard: {
          title: 'Painel Executivo',
          description: 'Visão consolidada da carteira institucional, com alertas e leitura operacional.'
        },
        projetos: {
          title: 'Carteira de Projetos',
          description: 'Base navegável de projetos, metas, responsáveis e chaves de integração.'
        },
        wifi: {
          title: 'Wi‑Fi Social',
          description: 'Operação territorial da rede com mapa, cobertura, criticidade e manutenção.'
        },
        relatorios: {
          title: 'Relatórios',
          description: 'Exportações e leituras consolidadas para apoio à gestão institucional.'
        },
        usuarios: {
          title: 'Gestão de Usuários',
          description: 'Controle de acesso, perfis e governança do ambiente autenticado.'
        }
      }[currentTab];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.08),transparent_24%),linear-gradient(180deg,#f7fafc_0%,#eef3f8_100%)] text-foreground">
      <Header
        currentTab={tabForHeader}
        activeContextTitle={activeContext.title}
        activeContextDescription={activeContext.description}
        onTabChange={(tab) => {
          setSelectedProjectId(null);
          setCurrentTab(tab as AppTab);
        }}
        showTabs={!selectedProject}
        projetosCount={projetos.length}
      />

      <main className="mx-auto w-full max-w-[1480px] px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex min-h-[55vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4 rounded-[1.75rem] border border-white/80 bg-white/85 px-8 py-10 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)]">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-sky-200 border-t-sky-700" />
              <div className="text-center">
                <p className="font-semibold text-slate-900">Carregando monitoramento</p>
                <p className="mt-1 text-sm text-slate-500">Conferindo projetos e métricas da base atual.</p>
              </div>
            </div>
          </div>
        ) : selectedProject ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedProject.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              <button
                onClick={() => setSelectedProjectId(null)}
                className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
              >
                ← Voltar para a carteira de projetos
              </button>
              <Suspense fallback={<ModuleLoadingState title="Abrindo projeto" description="Carregando detalhes, metas e monitoramento operacional." />}>
                <DetalheProjeto projeto={selectedProject} onUpdate={loadProjetos} />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 18, filter: 'blur(5px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -18, filter: 'blur(5px)' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense
                fallback={
                  <ModuleLoadingState
                    title="Preparando módulo"
                    description="Carregando a área selecionada com divisão progressiva de componentes."
                  />
                }
              >
                {currentTab === 'dashboard' && <DashboardGeral projetos={projetos} />}

                {currentTab === 'projetos' && (
                  <ListaProjetos
                    projetos={projetos}
                    onProjectSelect={setSelectedProjectId}
                    onUpdate={loadProjetos}
                  />
                )}

                {currentTab === 'wifi' && <WifiSocial projetos={projetos} />}

                {currentTab === 'relatorios' && <Relatorios projetos={projetos} />}

                {currentTab === 'usuarios' && canAccessUsersTab && <UserManagement currentUserId={user.id} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      <Toaster position="top-right" theme="light" />
    </div>
  );
}
