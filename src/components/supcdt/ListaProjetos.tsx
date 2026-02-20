import { useState } from 'react';
import { CriacaoProjetoWizard } from './CriacaoProjetoWizard';
import { Projeto } from '../../types/projeto';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Plus, Target, Users } from 'lucide-react';
import { formatCurrency } from '../../lib/currencyUtils';

interface ListaProjetosProps {
    projetos: Projeto[];
    onProjectSelect: (id: string) => void;
    onUpdate: () => void;
}

export function ListaProjetos({ projetos, onProjectSelect, onUpdate }: ListaProjetosProps) {
    const [search, setSearch] = useState('');
    const [isProjetoModalOpen, setIsProjetoModalOpen] = useState(false);

    const filtered = projetos.filter(p =>
        (p.projeto || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.osc || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Projetos</h2>
                    <p className="text-muted-foreground mt-1">Gerencie os projetos aprovados e suas metas.</p>
                </div>
                <Button onClick={() => setIsProjetoModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Projeto
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome do projeto ou OSC..."
                        className="pl-10 bg-background"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((projeto, idx) => {
                    const valor = formatCurrency(projeto.valorTotal || 0);

                    return (
                        <div
                            key={projeto.id || (projeto as any)._id || idx}
                            onClick={() => (projeto.id || (projeto as any)._id) && onProjectSelect((projeto.id || (projeto as any)._id).toString())}
                            className="group cursor-pointer bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`px-2 py-1 text-xs rounded-full font-medium ${projeto.statusProjeto === 'Em andamento' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                    projeto.statusProjeto === 'Reprovada' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                        'bg-muted text-muted-foreground border border-border border-dashed'
                                    }`}>
                                    {projeto.statusProjeto}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold pr-16 mb-1 group-hover:text-primary transition-colors">
                                {projeto.projeto || 'Sem Nome'}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-1">{projeto.osc || 'Não especificada'}</p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Target className="h-4 w-4" />
                                    <span>{projeto.metas?.length || 0} Metas Pactuadas</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span>Resp: {projeto.responsavelPlanilha || 'Não definido'}</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Valor Total</span>
                                <span className="font-medium text-foreground">{valor}</span>
                            </div>
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="col-span-full py-12 text-center border border-border rounded-xl border-dashed">
                        <p className="text-muted-foreground">Nenhum projeto encontrado com os filtros atuais.</p>
                    </div>
                )}
            </div>

            {isProjetoModalOpen && (
                <CriacaoProjetoWizard
                    onClose={() => setIsProjetoModalOpen(false)}
                    onSuccess={() => {
                        setIsProjetoModalOpen(false);
                        onUpdate();
                    }}
                />
            )}
        </div>
    );
}
