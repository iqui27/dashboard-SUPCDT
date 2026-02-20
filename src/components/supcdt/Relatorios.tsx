import { useState } from 'react';
import { Projeto } from '../../types/projeto';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Download, FileSpreadsheet, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { downloadRelatorioSaiweb } from '../../lib/api/lancamentos';
import { toast } from 'sonner';

interface RelatoriosProps {
    projetos: Projeto[];
}

export function Relatorios({ projetos }: RelatoriosProps) {
    const { token } = useAuth();
    const [isDownloading, setIsDownloading] = useState(false);

    // Relatorio CSV do Saiweb
    const handleDownloadSaiweb = async () => {
        if (!token) return;
        setIsDownloading(true);
        try {
            await downloadRelatorioSaiweb(token);
            toast.success('Arquivo CSV gerado com sucesso.');
        } catch (e) {
            toast.error('Erro ao gerar relatório Saiweb.');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Relatórios e Exportação</h2>
                <p className="text-muted-foreground mt-1">Gere arquivos de prestação de contas (Saiweb, Michele)</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Exportação Saiweb */}
                <Card className="bg-card border-border relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <FileSpreadsheet className="w-24 h-24 text-primary" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-xl">Exportação Saiweb</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Gera um arquivo CSV contendo detalhamento de todos os lançamentos trimestrais de todas as metas e projetos para inserção manual no sistema Saiweb.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleDownloadSaiweb}
                            disabled={isDownloading}
                            className="w-full sm:w-auto shadow-sm"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {isDownloading ? 'Gerando CSV...' : 'Baixar Arquivo CSV'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Exportação Michele */}
                <Card className="bg-card border-border relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Filter className="w-24 h-24 text-primary" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-xl">Relatórios de Acompanhamento (Michele)</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Gera o arquivo de resumo em PDF exigido para as prestações de conta mensais ou bimestrais por projeto.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 relative z-10">
                                <select className="w-full bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 h-10 focus:ring-2 focus:ring-ring focus:outline-none">
                                    <option value="">Selecione um projeto...</option>
                                    {projetos.map(p => (
                                        <option key={p.id?.toString()} value={p.id?.toString()}>{p.projeto}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <select className="flex-1 bg-background border border-input text-foreground text-sm rounded-md px-3 py-2 h-10 focus:ring-2 focus:ring-ring focus:outline-none">
                                        <option value="">Todos os Trimestres</option>
                                        <option value="1">Trimestre 1</option>
                                        <option value="2">Trimestre 2</option>
                                        <option value="3">Trimestre 3</option>
                                        <option value="4">Trimestre 4</option>
                                    </select>
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                className="w-full sm:w-auto shadow-sm relative z-10"
                                onClick={() => toast.info('Geração de PDF por projeto está em desenvolvimento. Para visualizar agora, abra a aba Projetos -> Detalhe -> PDF Resumo.')}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Gerar PDF
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
