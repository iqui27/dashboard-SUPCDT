import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, FolderPlus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../contexts/AuthContext';
import { createProjeto } from '../../lib/api/projetos';
import { Categoria, ModulosAtivos, ProjetoInput, StatusProjeto } from '../../types/projeto';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

interface CriacaoProjetoWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const steps = [
  { id: 'identificacao', label: '1. Identificação' },
  { id: 'governanca', label: '2. Governança & território' },
  { id: 'escopo', label: '3. Escopo & valor' },
  { id: 'cronograma', label: '4. Cronograma' },
  { id: 'modulos', label: '5. Módulos' }
];

const MODULOS_CONFIG: { key: keyof ModulosAtivos; nome: string; descricao: string }[] = [
  { key: 'etapas', nome: 'Etapas', descricao: 'Fases do projeto com percentual de conclusão e entregáveis' },
  { key: 'orcamento', nome: 'Orçamento', descricao: 'Rubricas orçamentárias com valores previstos, executados e aditivos' },
  { key: 'parceiros', nome: 'Parceiros', descricao: 'Organizações e pessoas envolvidas com papel e status' },
  { key: 'riscos', nome: 'Riscos', descricao: 'Registro de riscos com probabilidade, impacto e mitigação' },
  { key: 'governanca', nome: 'Governança', descricao: 'Decisões estratégicas com data, responsável e contexto' },
  { key: 'indicadores', nome: 'Indicadores de Pesquisa', descricao: 'Métricas e séries de dados para acompanhamento de resultados' },
];

export function CriacaoProjetoWizard({ onClose, onSuccess }: CriacaoProjetoWizardProps) {
  const { token } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ProjetoInput>({
    numeroUnico: '',
    nome: '',
    nomeOSC: '',
    status: 'Em Planejamento' as StatusProjeto,
    responsavelSECTI: '',
    numeroTermo: '',
    processoSEI: '',
    parceiro: '',
    categoria: 'Outro' as Categoria,
    dataInicio: null,
    dataFim: null,
    valorTotal: 0,
    raPerigao: '',
    descricao: '',
    objetivos: '',
    metas: [],
    cronograma: { totalTrimestres: 4 },
    modulosAtivos: {}
  });

  const updateData = <K extends keyof ProjetoInput>(field: K, value: ProjetoInput[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  const handlePrev = () => setActiveStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast.error('Informe o nome do projeto.');
      return;
    }

    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      await createProjeto(formData, token);
      toast.success('Projeto criado com sucesso.');
      onSuccess();
    } catch {
      toast.error('Erro ao criar projeto.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <Card className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_40px_120px_-60px_rgba(15,23,42,0.65)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="h-4 w-4 text-sky-600" />
            <div>
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.22em] text-sky-700/70">SUPCDT</p>
              <h2 className="text-sm font-bold leading-tight text-slate-900">Novo projeto</h2>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4 text-slate-400" />
          </Button>
        </div>

        <CardContent className="flex min-h-0 flex-1 flex-col p-0 md:flex-row">
          <div className="w-full border-b border-slate-100 bg-slate-50/80 p-5 md:w-72 md:border-b-0 md:border-r">
            <div className="flex flex-col gap-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(index)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    activeStep === index
                      ? 'bg-slate-950 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8">
            {activeStep === 0 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-950">Identificação</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nome do projeto *</Label>
                    <Input value={formData.nome} onChange={(e) => updateData('nome', e.target.value)} placeholder="Ex: Wi-Fi Social DF" className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Número único</Label>
                    <Input value={formData.numeroUnico || ''} onChange={(e) => updateData('numeroUnico', e.target.value)} placeholder="Chave compartilhada entre dashboards" className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Número do termo</Label>
                    <Input value={formData.numeroTermo || ''} onChange={(e) => updateData('numeroTermo', e.target.value)} placeholder="Ex: Termo de Fomento 001/2026" className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Processo SEI</Label>
                    <Input value={formData.processoSEI || ''} onChange={(e) => updateData('processoSEI', e.target.value)} placeholder="00000-00000000/0000-00" className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(value) => updateData('status', value)}>
                      <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Em Planejamento">Em Planejamento</SelectItem>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Em andamento">Em andamento</SelectItem>
                        <SelectItem value="Encerrado">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Input value={formData.categoria || ''} onChange={(e) => updateData('categoria', e.target.value)} placeholder="Infraestrutura, Inclusão Digital, Eventos..." className="h-11 rounded-2xl" />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-950">Governança e território</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>OSC</Label>
                    <Input value={formData.nomeOSC || ''} onChange={(e) => updateData('nomeOSC', e.target.value)} placeholder="Organização parceira" className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável SECTI</Label>
                    <Input value={formData.responsavelSECTI || ''} onChange={(e) => updateData('responsavelSECTI', e.target.value)} placeholder="Servidor(a) responsável" className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Parceiro institucional</Label>
                    <Input value={formData.parceiro || ''} onChange={(e) => updateData('parceiro', e.target.value)} placeholder="Órgão parceiro" className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Território / cobertura</Label>
                    <Input value={formData.raPerigao || ''} onChange={(e) => updateData('raPerigao', e.target.value)} placeholder="Ex: DF, Plano Piloto, Gama, Samambaia..." className="h-11 rounded-2xl" />
                  </div>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-950">Escopo e valor</h3>
                <div className="space-y-2">
                  <Label>Descrição operacional</Label>
                  <textarea
                    rows={4}
                    value={formData.descricao || ''}
                    onChange={(e) => updateData('descricao', e.target.value)}
                    placeholder="Resumo do que o projeto entrega e como opera."
                    className="w-full rounded-[1.5rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Objetivos</Label>
                  <textarea
                    rows={4}
                    value={formData.objetivos || ''}
                    onChange={(e) => updateData('objetivos', e.target.value)}
                    placeholder="Resultados e objetivos esperados."
                    className="w-full rounded-[1.5rem] border border-input bg-background px-4 py-3 text-sm text-foreground outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor total</Label>
                  <Input
                    type="number"
                    value={formData.valorTotal}
                    onChange={(e) => updateData('valorTotal', Number(e.target.value))}
                    className="h-11 rounded-2xl text-lg font-semibold"
                  />
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-950">Cronograma</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data de início</Label>
                    <Input type="date" value={formData.dataInicio || ''} onChange={(e) => updateData('dataInicio', e.target.value || null)} className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de fim</Label>
                    <Input type="date" value={formData.dataFim || ''} onChange={(e) => updateData('dataFim', e.target.value || null)} className="h-11 rounded-2xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Total de trimestres monitorados</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={formData.cronograma?.totalTrimestres || 4}
                    onChange={(e) => updateData('cronograma', { totalTrimestres: Number(e.target.value) || 1 })}
                    className="h-11 w-40 rounded-2xl"
                  />
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-slate-950">Módulos</h3>
                <p className="text-sm text-slate-500">
                  Ative os módulos de monitoramento que este projeto utilizará. Você poderá alterar essa configuração depois.
                </p>
                <div className="divide-y divide-slate-100 rounded-[1.35rem] border border-slate-200 bg-white">
                  {MODULOS_CONFIG.map((mod) => (
                    <label
                      key={mod.key}
                      htmlFor={`modulo-${mod.key}`}
                      className="flex cursor-pointer items-center justify-between px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900">{mod.nome}</p>
                        <p className="text-xs text-slate-500">{mod.descricao}</p>
                      </div>
                      <Switch
                        id={`modulo-${mod.key}`}
                        checked={!!formData.modulosAtivos?.[mod.key]}
                        onCheckedChange={(checked) =>
                          updateData('modulosAtivos', {
                            ...formData.modulosAtivos,
                            [mod.key]: checked,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-slate-100 bg-slate-50/80 p-4">
          <Button variant="outline" onClick={handlePrev} disabled={activeStep === 0 || loading} className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button onClick={handleNext} disabled={loading} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
              {loading ? 'Salvando...' : 'Salvar projeto'}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
}
