import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { motion, AnimatePresence } from 'framer-motion';

import { Projeto } from './types/projeto';
import { fetchProjetos } from './lib/api/projetos';
import { Toaster } from 'sonner';

// Placeholder Components for now
import { DashboardGeral } from './components/supcdt/DashboardGeral';
import { ListaProjetos } from './components/supcdt/ListaProjetos';
import { Relatorios } from './components/supcdt/Relatorios';
import { DetalheProjeto } from './components/supcdt/DetalheProjeto';

type AppTab = 'dashboard' | 'projetos' | 'relatorios' | 'usuarios';

export function App() {
  const { user, token, requirePasswordChange } = useAuth();

  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation state for detailing a project
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (user && token && !requirePasswordChange) {
      loadProjetos();
    }
  }, [user, token, requirePasswordChange]);

  const loadProjetos = async () => {
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
  };

  if (!user) {
    return (
      <>
        <Login />
        <Toaster position="top-right" />
      </>
    );
  }

  // Se o usuário clicou em um projeto para ver detalhes
  if (selectedProjectId) {
    const projeto = projetos.find(p => p.id === selectedProjectId);
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans text-foreground selection:bg-primary/30">
        <Header
          currentTab="projetos"
          onTabChange={() => {
            setSelectedProjectId(null); // Voltar listagem
            setCurrentTab('projetos');
          }}
          showTabs={false}
        />
        <main className="flex-1 overflow-x-hidden pt-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedProjectId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="container mx-auto px-4 py-8 max-w-7xl"
            >
              <button
                onClick={() => setSelectedProjectId(null)}
                className="mb-8 text-muted-foreground hover:text-primary flex items-center gap-2 transition-all hover:-translate-x-1"
              >
                ← Voltar para listagem
              </button>
              {projeto ? (
                <DetalheProjeto projeto={projeto} onUpdate={loadProjetos} />
              ) : (
                <p>Projeto não encontrado.</p>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <Toaster position="top-right" theme="light" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-foreground selection:bg-primary/30">
      <Header
        currentTab={currentTab}
        onTabChange={(tab: string) => setCurrentTab(tab as AppTab)}
        showTabs={true}
      />

      <main className="flex-1 overflow-x-hidden pt-16">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                {currentTab === 'dashboard' && (
                  <DashboardGeral projetos={projetos} />
                )}

                {currentTab === 'projetos' && (
                  <ListaProjetos
                    projetos={projetos}
                    onProjectSelect={(id) => setSelectedProjectId(id)}
                    onUpdate={loadProjetos}
                  />
                )}

                {currentTab === 'relatorios' && (
                  <Relatorios projetos={projetos} />
                )}

                {currentTab === 'usuarios' && user.role === 'admin' && (
                  <UserManagement />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      <Toaster position="top-right" theme="light" />
    </div>
  );
}