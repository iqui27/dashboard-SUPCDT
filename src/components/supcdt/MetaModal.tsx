import { useState } from 'react';
import { Button } from '../ui/button';
import { Projeto, Meta } from '../../types/projeto';
import { updateProjeto } from '../../lib/api/projetos';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { ObjectId } from 'bson';

interface MetaModalProps {
    projeto: Projeto;
    onClose: () => void;
    onSuccess: () => void;
}

export function MetaModal({ projeto, onClose, onSuccess }: MetaModalProps) {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);

    const [codigo, setCodigo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [unidade, setUnidade] = useState('');

    // Array para segurar o valor previsto de CADA trimestre
    const totalTrimesters = projeto.cronograma?.totalTrimestres || 4;
    const [previsto, setPrevisto] = useState<number[]>(Array(totalTrimesters).fill(0));

    const handlePrevistoChange = (index: number, valStr: string) => {
        const value = parseFloat(valStr);
        setPrevisto(prev => {
            const next = [...prev];
            next[index] = isNaN(value) ? 0 : value;
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !projeto.id) return;

        if (!codigo || !descricao || !unidade) {
            toast.error('Preencha os campos obrigatórios.');
            return;
        }

        const totalPrevisto = previsto.reduce((acc, curr) => acc + curr, 0);

        setLoading(true);
        try {
            const novaMeta: Meta = {
                id: new ObjectId().toString(),
                codigo,
                descricao,
                unidade,
                totalPrevisto,
                previstoPorTrimestre: previsto,
                realizadoTotal: 0,
                realizadoPorTrimestre: Array(totalTrimesters).fill(0)
            };

            const novoProjeto = {
                ...projeto,
                metas: [...projeto.metas, novaMeta]
            };

            await updateProjeto(projeto.id.toString(), novoProjeto, token);
            toast.success('Meta adicionada com sucesso!');
            onSuccess();
        } catch (error) {
            toast.error('Erro ao adicionar meta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold font-sans">Nova Meta</h2>
                        <p className="text-sm text-muted-foreground mt-1">Projeto: {projeto.projeto}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Código <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                placeholder="1.1"
                                className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none"
                                value={codigo}
                                onChange={e => setCodigo(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium text-muted-foreground">Unidade de Medida <span className="text-red-500">*</span></label>
                            <input
                                required
                                type="text"
                                placeholder="Pessoas, Relatórios, etc."
                                className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none"
                                value={unidade}
                                onChange={e => setUnidade(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Descrição da Meta <span className="text-red-500">*</span></label>
                        <textarea
                            required
                            rows={2}
                            placeholder="Ex: Realizar formações presenciais com jovens das escolas."
                            className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                            value={descricao}
                            onChange={e => setDescricao(e.target.value)}
                        />
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2 mt-2">Valores Previstos por Trimestre</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {Array.from({ length: totalTrimesters }).map((_, idx) => (
                                <div key={idx} className="space-y-1">
                                    <label className="text-xs text-muted-foreground">Trimestre {idx + 1}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0"
                                        className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-1.5 focus:ring-2 focus:ring-ring focus:outline-none text-center"
                                        value={previsto[idx] || ''}
                                        onChange={e => handlePrevistoChange(idx, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="text-right mt-3 text-sm text-muted-foreground">
                            Total Previsto Consolidado: <strong className="text-foreground">{previsto.reduce((acc, curr) => acc + curr, 0)} {unidade}</strong>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Adicionando...' : 'Adicionar Meta'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
