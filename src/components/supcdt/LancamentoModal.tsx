import { useState } from 'react';
import { Button } from '../ui/button';
import { Projeto, Lancamento } from '../../types/projeto';
import { criarLancamento } from '../../lib/api/lancamentos';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface LancamentoModalProps {
    projeto: Projeto;
    onClose: () => void;
    onSuccess: () => void;
}

export function LancamentoModal({ projeto, onClose, onSuccess }: LancamentoModalProps) {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [trimestre, setTrimestre] = useState(1);
    const [descricaoAtividade, setDescricaoAtividade] = useState('');
    const [localAtendido, setLocalAtendido] = useState('');

    // State for meta values
    const [valores, setValores] = useState<Record<string, number>>({});

    const handleMudarValor = (metaId: string, valStr: string) => {
        const v = parseInt(valStr, 10);
        setValores(prev => ({ ...prev, [metaId]: isNaN(v) ? 0 : v }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        const valuesArray = Object.keys(valores)
            .map(metaId => ({
                metaId,
                valorRealizado: valores[metaId]
            }))
            .filter(v => v.valorRealizado > 0);

        if (valuesArray.length === 0) {
            toast.error('Informe pelo menos um valor maior que ZERO em alguma meta.');
            return;
        }

        if (!descricaoAtividade) {
            toast.error('Descrição da atividade é obrigatória.');
            return;
        }

        setLoading(true);
        try {
            const payload: Partial<Lancamento> = {
                projetoId: projeto.id?.toString(),
                trimestre,
                descricaoAtividade,
                localAtendido,
                dataRegistro: new Date(),
                valores: valuesArray
            };
            await criarLancamento(payload, token);
            toast.success('Lançamento registrado com sucesso!');
            onSuccess();
        } catch (error) {
            toast.error('Erro ao registrar lançamento.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <div>
                        <h2 className="text-xl font-bold font-sans">Novo Lançamento</h2>
                        <p className="text-muted-foreground text-sm mt-1">{projeto.projeto}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Trimestre de Referência</label>
                            <select
                                title="Trimestre"
                                className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none"
                                value={trimestre}
                                onChange={e => setTrimestre(Number(e.target.value))}
                            >
                                {Array.from({ length: projeto.cronograma.totalTrimestres || 1 }).map((_, idx) => (
                                    <option key={idx} value={idx + 1}>Trimestre {idx + 1}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">Local da Atividade</label>
                            <input
                                type="text"
                                placeholder="Ex: CEF 01 do Recanto das Emas"
                                className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none"
                                value={localAtendido}
                                onChange={e => setLocalAtendido(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Descrição da Atividade Escopo</label>
                        <textarea
                            required
                            rows={3}
                            placeholder="Descreva o que foi feito de forma resumida, mas clara..."
                            className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                            value={descricaoAtividade}
                            onChange={e => setDescricaoAtividade(e.target.value)}
                        />
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-foreground mb-3 border-b border-border pb-2">Valores Realizados</h3>
                        <div className="space-y-3">
                            {projeto.metas.map(meta => (
                                <div key={meta.id} className="flex gap-4 items-center justify-between bg-muted/50 p-3 rounded-lg border border-border/50">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-foreground">{meta.codigo} - {meta.descricao}</p>
                                        <p className="text-xs text-muted-foreground">{meta.unidade}</p>
                                    </div>
                                    <div className="w-32">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 focus:ring-2 focus:ring-ring focus:outline-none text-right"
                                            value={valores[meta.id] || ''}
                                            onChange={e => handleMudarValor(meta.id, e.target.value)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Salvando...' : 'Registrar Lançamento'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
