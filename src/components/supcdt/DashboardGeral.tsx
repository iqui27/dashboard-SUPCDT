import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Projeto } from '../../types/projeto';
import {
    FolderKanban,
    Users,
    Activity,
    AlertTriangle,
    TrendingUp
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface DashboardGeralProps {
    projetos: Projeto[];
}

// Animações base do projeto para staggered children
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function DashboardGeral({ projetos }: DashboardGeralProps) {
    // === Cálculos de Macro Indicadores ===
    const projetosAtivos = projetos.filter(p => ['Em andamento', 'Assinado'].includes(p.statusProjeto)).length;

    // TODO: Ajustar lógica monetária real quando existir no DB. Usando mock temporário baseado na QTD de projetos para volume.
    const investimentoMock = 12500000;
    const publicoAtingidoMock = 6200;

    // Alertas (ex: Projetos com problemas físicos/financeiros ou aguardando aditivo)
    const alertasCount = projetos.filter(p => ['Atrasado', 'Paralisado'].includes(p.statusProjeto) || p.pendencias?.length).length;

    // === Lógica do Gráfico de Eixos (Recharts Oco) ===
    const chartData = useMemo(() => {
        // Mock de distribuição temática para o gráfico "oco"
        return [
            { name: 'Educação', value: 45, fill: 'hsl(var(--chart-1))' },
            { name: 'Inclusão', value: 30, fill: 'hsl(var(--chart-4))' },
            { name: 'Clima', value: 15, fill: 'hsl(var(--chart-2))' },
            { name: 'Infra', value: 10, fill: 'hsl(var(--chart-5))' },
        ];
    }, [projetos]);

    return (
        <motion.div
            className="space-y-8 pb-12"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            {/* Header Status */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold tracking-tight text-gradient">Painel de Controle</h2>
                    <p className="text-muted-foreground mt-2 text-lg">Acompanhamento executivo da SUPCDT em tempo real</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-medium text-emerald-500/90">Sistema Operante • Atualizado hoje</span>
                </div>
            </motion.div>

            {/* Linha 1: 4 Macro Indicadores */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card Investimento */}
                <div className="glass p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group spring-hover">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-primary/20" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-muted-foreground">Investimento Total</span>
                        <div className="p-2 bg-primary/10 rounded-lg text-primary ring-1 ring-primary/20">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold">R$ {(investimentoMock / 1000000).toFixed(1)} Mi</h3>
                        <p className="text-xs text-primary/80 mt-1 font-medium">+12% vs. trimestre anterior</p>
                    </div>
                </div>

                {/* Card Público */}
                <div className="glass p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group spring-hover">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-chart-4/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-chart-4/20" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-muted-foreground">Público Atingido</span>
                        <div className="p-2 bg-chart-4/10 rounded-lg text-chart-4 ring-1 ring-chart-4/20">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold">{publicoAtingidoMock.toLocaleString('pt-BR')}</h3>
                        <p className="text-xs text-chart-4/80 mt-1 font-medium">Cidadãos beneficiados</p>
                    </div>
                </div>

                {/* Card Projetos Ativos */}
                <div className="glass p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group spring-hover">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-chart-1/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-chart-1/20" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-muted-foreground">Projetos Ativos</span>
                        <div className="p-2 bg-chart-1/10 rounded-lg text-chart-1 ring-1 ring-chart-1/20">
                            <Activity className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold">{projetosAtivos} <span className="text-lg text-muted-foreground font-normal">/ {projetos.length}</span></h3>
                        <p className="text-xs text-chart-1/80 mt-1 font-medium">Em execução regular</p>
                    </div>
                </div>

                {/* Card Alertas */}
                <div className="glass p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group spring-hover">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-destructive/20" />
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-medium text-muted-foreground">Pontos de Atenção</span>
                        <div className="p-2 bg-destructive/10 rounded-lg text-destructive ring-1 ring-destructive/20">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold">{alertasCount}</h3>
                        <p className="text-xs text-destructive/80 mt-1 font-medium">Exigem ação imediata</p>
                    </div>
                </div>
            </motion.div>

            {/* Linha 2: Bento Grid Intermediária (Gráfico + Painel de Alertas Rápidos) */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Gráfico Temático (Ocupa 2 colunas) - Recharts */}
                <div className="glass-panel p-6 rounded-3xl lg:col-span-2 relative overflow-hidden glow-border">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        Distribuição Temática (Radar)
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={80} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', backdropFilter: 'blur(10px)', color: 'hsl(var(--foreground))' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tabela de Alertas Rápidos (Ocupa 1 coluna) */}
                <div className="glass-panel p-6 rounded-3xl flex flex-col glow-border">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-chart-2" />
                        Radar de Alertas
                    </h3>

                    <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
                        {/* Mock de alertas urgentes */}
                        <div className="p-3 rounded-xl bg-chart-3/10 border border-chart-3/20 flex gap-3 items-start">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-chart-3 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Proclima</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Paralisado: Aguardando remanejamento financeiro (SEFAZ).</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-chart-2/10 border border-chart-2/20 flex gap-3 items-start">
                            <div className="w-2 h-2 mt-1.5 rounded-full bg-chart-2 shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Polo C. SCS</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Aviso: Prazo de execução próximo ao fim (30 dias).</p>
                            </div>
                        </div>
                    </div>

                    <button className="w-full mt-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors bg-primary/5 hover:bg-primary/10 rounded-xl">
                        Ver todos os alertas →
                    </button>
                </div>
            </motion.div>

            {/* Linha 3: Projetos Detalhados (Grid) */}
            <motion.div variants={itemVariants} className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold tracking-tight">Status do Portfólio</h3>
                    <div className="flex gap-2 text-xs font-medium">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Em Dia</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Atenção</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Crítico</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Padrão</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projetos.map((proj, idx) => {
                        // Lógica de Cor Semântica (Ajustado para Light Theme)
                        let statusColor = "border-zinc-200 bg-zinc-50/50 text-muted-foreground"; // Padrão
                        let indicatorColor = "bg-blue-500 text-blue-500";
                        let progressColor = "bg-blue-500";

                        const st = proj.statusProjeto?.toLowerCase() || '';
                        if (st.includes('em andamento') || st.includes('assinado') || st.includes('concluído')) {
                            statusColor = "border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/80";
                            indicatorColor = "bg-emerald-500 text-emerald-500";
                            progressColor = "bg-emerald-500";
                        } else if (st.includes('atenção') || st.includes('pausado')) {
                            statusColor = "border-amber-200 bg-amber-50/30 hover:bg-amber-50/80";
                            indicatorColor = "bg-amber-500 text-amber-500";
                            progressColor = "bg-amber-500";
                        } else if (st.includes('atrasado') || st.includes('paralisado') || st.includes('cancelado')) {
                            statusColor = "border-rose-200 bg-rose-50/30 hover:bg-rose-50/80";
                            indicatorColor = "bg-rose-500 text-rose-500";
                            progressColor = "bg-rose-500";
                        } else if (st.includes('análise') || st.includes('elaboração')) {
                            statusColor = "border-blue-200 bg-blue-50/30 hover:bg-blue-50/80";
                            indicatorColor = "bg-blue-500 text-blue-500";
                            progressColor = "bg-blue-500";
                        }

                        // Calcular % progresso
                        let progresso = 0;
                        if (proj.metas && proj.metas.length > 0) {
                            const totalRealizado = proj.metas.reduce((acc, m) => acc + (m.realizadoTotal || 0), 0);
                            const totalPrevisto = proj.metas.reduce((acc, m) => acc + m.totalPrevisto, 0);
                            if (totalPrevisto > 0) {
                                progresso = (totalRealizado / totalPrevisto) * 100;
                            }
                        }

                        // Formatar valor (mock ou real se existir no type depois)
                        // Atualmente não há "Global Value" no type do projeto, então exibimos placeholders ou derivamos das metas.

                        return (
                            <div
                                key={proj.id || idx}
                                className={`glass-panel rounded-2xl p-6 relative overflow-hidden transition-all duration-300 border hover:-translate-y-1 ${statusColor}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${indicatorColor} shadow-[0_0_8px_currentColor] opacity-80`}></div>
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-80 text-foreground">{proj.statusProjeto || 'Status Indefinido'}</span>
                                    </div>
                                    <span className="text-xs font-mono opacity-60">ID: {((proj as any)._id || '---').toString().substring(0, 6)}</span>
                                </div>

                                <h4 className="text-lg font-bold leading-tight mb-1 text-foreground">{proj.projeto || 'Projeto sem Nome'}</h4>
                                <p className="text-sm font-medium opacity-70 mb-6">{proj.osc || 'OSC Não Especificada'}</p>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs mb-1 font-medium">
                                            <span>Progresso Físico</span>
                                            <span>{progresso.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden shadow-inner">
                                            <div className={`h-full ${progressColor} rounded-full`} style={{ width: `${Math.min(progresso, 100)}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end pt-2 border-t border-zinc-200/60">
                                        <div>
                                            <p className="text-xs opacity-60 mb-0.5">Vigência Restante</p>
                                            <p className="text-sm font-semibold">120 dias</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs opacity-60 mb-0.5">Ação Necessária?</p>
                                            <p className="text-sm font-semibold">{proj.pendencias?.length ? 'Sim (Pendências)' : 'Não'}</p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )
                    })}
                </div>
                {projetos.length === 0 && (
                    <div className="text-center py-12 glass border-dashed">
                        <p className="text-muted-foreground">Nenhum projeto cadastrado no portfólio.</p>
                    </div>
                )}
            </motion.div>

        </motion.div>
    );
}
