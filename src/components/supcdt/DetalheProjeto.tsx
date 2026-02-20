import { useState, useEffect } from 'react';
import { Projeto, Lancamento } from '../../types/projeto';
import { useAuth } from '../../contexts/AuthContext';
import { fetchLancamentosDeProjeto } from '../../lib/api/lancamentos';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency } from '../../lib/currencyUtils';
import { Download, Plus, Target, Users, MapPin, CalendarDays, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

import { LancamentoModal } from './LancamentoModal';
import { MetaModal } from './MetaModal';

interface DetalheProjetoProps {
    projeto: Projeto;
    onUpdate: () => void;
}

export function DetalheProjeto({ projeto, onUpdate }: DetalheProjetoProps) {
    const { token } = useAuth();
    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

    useEffect(() => {
        carregarLancamentos();
    }, [projeto.id]);

    const carregarLancamentos = async () => {
        if (!token || !projeto.id) return;
        setLoading(true);
        try {
            const data = await fetchLancamentosDeProjeto(projeto.id.toString(), token);
            setLancamentos(data);
        } catch (e) {
            toast.error('Erro ao carregar histórico de lançamentos.');
        } finally {
            setLoading(false);
        }
    };

    const andamentoTotal = (projeto.metas || []).length > 0
        ? ((projeto.metas || []).reduce((acc, m) => acc + (m.totalPrevisto > 0 ? ((m.realizadoTotal || 0) / m.totalPrevisto) : 0), 0) / (projeto.metas || []).length * 100)
        : 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header do Projeto */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">{projeto.projeto}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {projeto.osc}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {projeto.regiaoAdministrativa}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> Termo: {projeto.numeroTermoFomento}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => toast.info('Em desenvolvimento')}>
                        <Download className="w-4 h-4 mr-2" /> PDF Resumo
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-primary/20">
                        <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
                    </Button>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Status Atual</CardTitle>
                        <CheckCircle2 className={`w-4 h-4 ${projeto.statusProjeto === 'Em andamento' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${projeto.statusProjeto === 'Em andamento' ? 'text-emerald-500' : 'text-foreground'}`}>
                            {projeto.statusProjeto}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Status executivo</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Andamento Físico</CardTitle>
                        <TrendingUp className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{andamentoTotal.toFixed(1)}%</div>
                        <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, Math.max(0, andamentoTotal))}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{formatCurrency(projeto.valorTotal)}</div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Metas Cadastradas</CardTitle>
                        <Target className="w-4 h-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{(projeto.metas || []).length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Linhas de atuação e metas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Visão de Metas Pactuadas vs Realizadas */}
            <div className="flex items-center justify-between mt-8 mb-4">
                <h3 className="text-xl font-semibold">Acompanhamento das Metas</h3>
                <Button variant="outline" size="sm" onClick={() => setIsMetaModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nova Meta
                </Button>
            </div>
            <div className="grid gap-4">
                {(projeto.metas || []).map((meta) => {
                    const perc = meta.totalPrevisto > 0 ? ((meta.realizadoTotal || 0) / meta.totalPrevisto) * 100 : 0;
                    return (
                        <div key={meta.id} className="bg-card border border-border rounded-xl p-5">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                                <div>
                                    <h4 className="font-medium text-foreground text-lg">
                                        <span className="text-primary mr-2">{meta.codigo}</span>
                                        {meta.descricao}
                                    </h4>
                                    <p className="text-sm text-muted-foreground mt-1">Unidade: {meta.unidade}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-sm text-muted-foreground">Progresso</div>
                                    <div className="font-bold text-xl text-foreground">
                                        {meta.realizadoTotal || 0} / {meta.totalPrevisto} <span className="text-sm font-normal text-muted-foreground">{meta.unidade}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar principal */}
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mb-6 relative">
                                <div
                                    className={`h-full absolute left-0 top-0 transition-all duration-1000 ${perc >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]'}`}
                                    style={{ width: `${Math.min(100, perc)}%` }}
                                />
                            </div>

                            {/* Detalhamento de Trimestres */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-border/50 pt-4">
                                {Array.from({ length: projeto.cronograma?.totalTrimestres || 1 }).map((_, idx) => {
                                    const previsto = meta.previstoPorTrimestre[idx] || 0;
                                    const realizado = (meta.realizadoPorTrimestre && meta.realizadoPorTrimestre[idx]) || 0;
                                    return (
                                        <div key={idx} className="bg-muted/50 p-3 rounded-lg border border-border/50">
                                            <div className="text-xs font-semibold text-muted-foreground mb-2">Trimestre {idx + 1}</div>
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground">Previsto</p>
                                                    <p className="text-sm font-medium">{previsto}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-muted-foreground">Real.</p>
                                                    <p className={`text-sm font-bold ${realizado >= previsto && previsto > 0 ? 'text-emerald-500' : realizado > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                                        {realizado}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Histórico de Lançamentos */}
            <h3 className="text-xl font-semibold mt-8 mb-4">Histórico de Lançamentos</h3>
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Carregando histórico...</div>
                ) : lancamentos.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">Nenhum lançamento registrado até o momento.</div>
                ) : (
                    <div className="divide-y divide-border">
                        {lancamentos.map((lanc) => (
                            <div key={lanc.id?.toString()} className="p-5 flex flex-col md:flex-row justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold border border-primary/20">
                                            T{lanc.trimestre}
                                        </span>
                                        <span className="text-muted-foreground text-sm">
                                            Registrado em {new Date(lanc.dataRegistro).toLocaleDateString('pt-BR')} por {lanc.registradoPor}
                                        </span>
                                    </div>
                                    <p className="text-foreground text-sm mt-2 font-medium">{lanc.descricaoAtividade}</p>
                                    {lanc.localAtendido && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <MapPin className="w-3 h-3" /> {lanc.localAtendido}
                                        </p>
                                    )}
                                </div>
                                <div className="shrink-0 text-right space-y-1">
                                    {lanc.valores.map(v => {
                                        const metaRef = (projeto.metas || []).find(m => m.id === v.metaId);
                                        return (
                                            <div key={v.metaId} className="text-sm bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
                                                <span className="text-muted-foreground mr-2">{metaRef?.codigo}:</span>
                                                <span className="font-bold text-foreground">+{v.valorRealizado}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <LancamentoModal
                    projeto={projeto}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        carregarLancamentos();
                        onUpdate();
                    }}
                />
            )}

            {isMetaModalOpen && (
                <MetaModal
                    projeto={projeto}
                    onClose={() => setIsMetaModalOpen(false)}
                    onSuccess={() => {
                        setIsMetaModalOpen(false);
                        onUpdate();
                    }}
                />
            )}
        </div>
    );
}
