import { toast } from 'sonner';
import { ModulosAtivos, Projeto } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { updateModulosAtivos } from '../../lib/api/modulos';
import { Switch } from '../ui/switch';

const MODULOS_CONFIG: { key: keyof ModulosAtivos; nome: string; descricao: string }[] = [
  { key: 'etapas', nome: 'Etapas', descricao: 'Fases do projeto com percentual de conclusão e entregáveis' },
  { key: 'orcamento', nome: 'Orçamento', descricao: 'Rubricas orçamentárias com valores previstos, executados e aditivos' },
  { key: 'parceiros', nome: 'Parceiros', descricao: 'Organizações e pessoas envolvidas com papel e status' },
  { key: 'riscos', nome: 'Riscos', descricao: 'Registro de riscos com probabilidade, impacto e mitigação' },
  { key: 'governanca', nome: 'Governança', descricao: 'Decisões estratégicas com data, responsável e contexto' },
  { key: 'indicadores', nome: 'Indicadores de Pesquisa', descricao: 'Métricas e séries de dados para acompanhamento de resultados' },
];

interface ModulosConfigPanelProps {
  projeto: Projeto;
  onUpdate: () => void;
}

export function ModulosConfigPanel({ projeto, onUpdate }: ModulosConfigPanelProps) {
  const { token } = useAuth();

  const handleToggle = async (modKey: keyof ModulosAtivos, checked: boolean) => {
    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    try {
      await updateModulosAtivos(projeto.id, { [modKey]: checked }, token);
      toast.success(`${checked ? 'Módulo ativado' : 'Módulo desativado'}`);
      onUpdate();
    } catch {
      toast.error('Erro ao atualizar módulo');
    }
  };

  return (
    <div className="w-80">
      <div className="mb-3 px-3 pt-3">
        <h3 className="text-sm font-semibold text-slate-950">Módulos ativos</h3>
        <p className="mt-1 text-xs text-slate-500">
          Ative ou desative módulos de monitoramento. Os dados são preservados ao desativar.
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {MODULOS_CONFIG.map((mod) => (
          <label
            key={mod.key}
            className="flex cursor-pointer items-center justify-between px-3 py-3 hover:bg-slate-50"
          >
            <div className="flex-1 pr-3">
              <span className="block text-sm font-medium text-slate-900">{mod.nome}</span>
              <span className="block text-xs text-slate-500">{mod.descricao}</span>
            </div>
            <Switch
              checked={!!projeto.modulosAtivos?.[mod.key]}
              onCheckedChange={(checked) => handleToggle(mod.key, checked)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
