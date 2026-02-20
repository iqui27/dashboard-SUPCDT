import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import { toast } from 'sonner';
import { createProjeto } from '../../lib/api/projetos';
import { useAuth } from '../../contexts/AuthContext';
import { X, Save, ArrowRight, ArrowLeft } from 'lucide-react';
import { Categoria, TipoInstrumento, StatusProjeto } from '../../types/projeto';

interface CriacaoProjetoWizardProps {
    onClose: () => void;
    onSuccess: () => void;
}

const steps = [
    { id: 'identificacao', label: '1. Identificação' },
    { id: 'instituicao', label: '2. Instituição & Local' },
    { id: 'financiamento', label: '3. Financiamento' },
    { id: 'prazos', label: '4. Prazos & Estrutura' }
];

export function CriacaoProjetoWizard({ onClose, onSuccess }: CriacaoProjetoWizardProps) {
    const { token } = useAuth();
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Form State mapped to Projeto Fomento Schema
    const [formData, setFormData] = useState<Partial<any>>({
        projeto: '',
        processoSEI: '',
        numeroTermoFomento: '',
        tipoInstrumento: 'Termo de Colaboração' as TipoInstrumento,
        categoria: 'Outro' as Categoria,
        statusProjeto: 'Em andamento' as StatusProjeto,

        osc: '',
        presidenteOSC: '',
        coordenadorProjeto: '',
        regiaoAdministrativa: '',

        valorTotal: 0,
        financeiroParcela1: 0,

        vigenciaInicio: null,
        vigenciaFinal: null,
        cronograma: { totalTrimestres: 1 },
        metas: []
    });

    const updateData = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNext = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
    const handlePrev = () => setActiveStep(prev => Math.max(prev - 1, 0));

    const handleSubmit = async () => {
        if (!formData.projeto || !formData.osc) {
            toast.error('Preencha pelo menos o Nome do Projeto e a OSC.');
            return;
        }
        if (!token) {
            toast.error('Sessão expirada. Faça login novamente.');
            return;
        }

        setLoading(true);
        try {
            await createProjeto(formData as any, token);
            toast.success('Projeto criado com sucesso!');
            onSuccess();
        } catch (error) {
            toast.error('Erro ao criar projeto.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-4xl bg-card border-border shadow-2xl flex flex-col max-h-[90vh]">
                <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl text-foreground">Novo Projeto SUPCDT</CardTitle>
                        <CardDescription>Preencha os dados em etapas para recriar o fluxo completo.</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row">
                    {/* Sidebar Steps */}
                    <div className="w-full md:w-64 bg-muted/30 border-r border-border p-6 flex flex-col gap-2 shrink-0">
                        {steps.map((step, index) => (
                            <button
                                key={step.id}
                                onClick={() => setActiveStep(index)}
                                className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeStep === index
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                {step.label}
                            </button>
                        ))}
                    </div>

                    {/* Form Content */}
                    <div className="flex-1 p-6 md:p-8">
                        {activeStep === 0 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="text-lg font-semibold mb-4 text-foreground">Identificação Básica</h3>
                                <div className="space-y-2">
                                    <Label>Nome do Projeto / Objeto *</Label>
                                    <Input
                                        value={formData.projeto}
                                        onChange={e => updateData('projeto', e.target.value)}
                                        placeholder="Ex: Formação em Robótica"
                                        className="bg-background"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Instrumento Jurídico</Label>
                                        <Select value={formData.tipoInstrumento} onValueChange={v => updateData('tipoInstrumento', v)}>
                                            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Termo de Colaboração">Termo de Colaboração</SelectItem>
                                                <SelectItem value="Termo de Fomento">Termo de Fomento</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nº do Instrumento</Label>
                                        <Input
                                            value={formData.numeroTermoFomento}
                                            onChange={e => updateData('numeroTermoFomento', e.target.value)}
                                            placeholder="Ex: 01/2024"
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Processo SEI</Label>
                                    <Input
                                        value={formData.processoSEI}
                                        onChange={e => updateData('processoSEI', e.target.value)}
                                        placeholder="Ex: 00000-00000000/0000-00"
                                        className="bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Categoria / Fonte</Label>
                                    <Select value={formData.categoria} onValueChange={v => updateData('categoria', v)}>
                                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Emenda">Emenda Parlamentar</SelectItem>
                                            <SelectItem value="Outro">Chamamento / Outro</SelectItem>
                                            <SelectItem value="INEX">Inexigibilidade</SelectItem>
                                            <SelectItem value="Convênio">Convênio</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {activeStep === 1 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="text-lg font-semibold mb-4 text-foreground">Instituição & Local</h3>
                                <div className="space-y-2">
                                    <Label>OSC Parceria *</Label>
                                    <Input
                                        value={formData.osc}
                                        onChange={e => updateData('osc', e.target.value)}
                                        placeholder="Nome da Organização da Sociedade Civil"
                                        className="bg-background"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Presidente da OSC</Label>
                                        <Input
                                            value={formData.presidenteOSC}
                                            onChange={e => updateData('presidenteOSC', e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Coordenador do Projeto</Label>
                                        <Input
                                            value={formData.coordenadorProjeto}
                                            onChange={e => updateData('coordenadorProjeto', e.target.value)}
                                            className="bg-background"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Região Administrativa Principal</Label>
                                    <Input
                                        value={formData.regiaoAdministrativa}
                                        onChange={e => updateData('regiaoAdministrativa', e.target.value)}
                                        placeholder="Ex: Brasília, Ceilândia..."
                                        className="bg-background"
                                    />
                                </div>
                            </div>
                        )}

                        {activeStep === 2 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="text-lg font-semibold mb-4 text-foreground">Financiamento</h3>
                                <div className="space-y-2">
                                    <Label>Valor Total Global (R$)</Label>
                                    <Input
                                        type="number"
                                        value={formData.valorTotal}
                                        onChange={e => updateData('valorTotal', Number(e.target.value))}
                                        className="bg-background text-xl font-bold text-foreground"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Valor Parcela 1 / Única (R$)</Label>
                                    <Input
                                        type="number"
                                        value={formData.financeiroParcela1}
                                        onChange={e => updateData('financeiroParcela1', Number(e.target.value))}
                                        className="bg-background"
                                    />
                                </div>
                            </div>
                        )}

                        {activeStep === 3 && (
                            <div className="space-y-4 animate-in slide-in-from-right-4">
                                <h3 className="text-lg font-semibold mb-4 text-foreground">Prazos & Estrutura</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Início da Vigência</Label>
                                        <Input
                                            type="date"
                                            value={formData.vigenciaInicio ? new Date(formData.vigenciaInicio).toISOString().split('T')[0] : ''}
                                            onChange={e => updateData('vigenciaInicio', new Date(e.target.value))}
                                            className="bg-background block"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Término da Vigência</Label>
                                        <Input
                                            type="date"
                                            value={formData.vigenciaFinal ? new Date(formData.vigenciaFinal).toISOString().split('T')[0] : ''}
                                            onChange={e => updateData('vigenciaFinal', new Date(e.target.value))}
                                            className="bg-background block"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    <Label>Quantidade de Trimestres (Cronograma de Metas)</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        max={24}
                                        value={formData.cronograma?.totalTrimestres || 1}
                                        onChange={e => updateData('cronograma', { totalTrimestres: Number(e.target.value) })}
                                        className="bg-background w-32"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Define quantas divisões de tempo (colunas de trimestres) as metas terão.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="border-t border-border p-4 flex justify-between bg-muted/20">
                    <Button
                        variant="outline"
                        onClick={handlePrev}
                        disabled={activeStep === 0 || loading}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>

                    {activeStep < steps.length - 1 ? (
                        <Button onClick={handleNext} disabled={loading}>
                            Próximo <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? 'Salvando...' : 'Salvar Novo Projeto'} <Save className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
