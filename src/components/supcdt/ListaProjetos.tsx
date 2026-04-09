import { useMemo, useState } from 'react';
import { ArrowUpRight, Link2, MapPin, Plus, Search, Target, UserRound } from 'lucide-react';

import { CriacaoProjetoWizard } from './CriacaoProjetoWizard';
import { Projeto, getProjetoMonitoramento, getProjetoNivelRisco, getProjetoNome, getProjetoOsc, getProjetoPercentualExecucao, getProjetoPrecisaAcao, getProjetoResponsavel, getProjetoStatus, getProjetoStatusOperacional, getProjetoTerritorio } from '../../types/projeto';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { formatCurrency } from '../../lib/currencyUtils';

interface ListaProjetosProps {
  projetos: Projeto[];
  onProjectSelect: (id: string) => void;
  onUpdate: () => void;
}

function getStatusClasses(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes('ativo') || normalized.includes('andamento') || normalized.includes('assinado')) {
    return 'bg-emerald-600 text-white';
  }
  if (normalized.includes('planejamento') || normalized.includes('analise')) {
    return 'bg-sky-600 text-white';
  }
  if (normalized.includes('atras') || normalized.includes('paralis') || normalized.includes('cancel')) {
    return 'bg-rose-600 text-white';
  }
  return 'bg-slate-800 text-white';
}

export function ListaProjetos({ projetos, onProjectSelect, onUpdate }: ListaProjetosProps) {
  const [search, setSearch] = useState('');
  const [isProjetoModalOpen, setIsProjetoModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return projetos;
    }

    return projetos.filter((projeto) =>
      [
        getProjetoNome(projeto),
        getProjetoOsc(projeto) || '',
        projeto.categoria || '',
        getProjetoTerritorio(projeto) || '',
        getProjetoResponsavel(projeto) || '',
        projeto.chaveIntegracao
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [projetos, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 px-1 py-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Base operacional</p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">Projetos monitorados</h2>
        </div>
        <Button onClick={() => setIsProjetoModalOpen(true)} className="h-8 rounded-full bg-slate-950 px-3 text-xs text-white hover:bg-slate-800">
          <Plus className="mr-1.5 h-3 w-3" />
          Novo projeto
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-[1.45rem] border border-border/80 bg-card/85 p-4 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)] lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por projeto, OSC, categoria, território ou chave de integração..."
            className="h-11 rounded-full border-border bg-muted pl-11 text-foreground"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-secondary px-3 py-1 font-medium text-muted-foreground">
            {filtered.length} de {projetos.length} projetos
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((projeto) => {
          const progresso = getProjetoPercentualExecucao(projeto);
          const status = getProjetoStatus(projeto);
          const statusOperacional = getProjetoStatusOperacional(projeto);
          const nivelRisco = getProjetoNivelRisco(projeto);
          const precisaAcao = getProjetoPrecisaAcao(projeto);
          const monitoramento = getProjetoMonitoramento(projeto);
          const osc = getProjetoOsc(projeto) ?? 'OSC ainda não informada';
          const territorio = getProjetoTerritorio(projeto) ?? 'Cobertura ainda não detalhada';
          const responsavel = getProjetoResponsavel(projeto) ?? 'Responsável ainda não informado';

          return (
            <button
              key={projeto.id}
              type="button"
              onClick={() => onProjectSelect(projeto.id)}
              className="group rounded-[1.45rem] border border-border/80 bg-card/85 p-5 text-left shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}>
                    {status}
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {statusOperacional}
                    </span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground ring-1 ring-slate-200">
                      Risco {nivelRisco}
                    </span>
                    {precisaAcao && (
                      <span className="inline-flex rounded-full bg-warning/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                        Requer ação
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3.5 text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                    {getProjetoNome(projeto)}
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">{osc}</p>
                </div>

                <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Categoria</p>
                  <p className="mt-1 text-[13px] font-medium text-foreground">{projeto.categoria || 'Sem categoria'}</p>
                </div>
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Investimento</p>
                  <p className="mt-1 text-[13px] font-medium text-foreground">{formatCurrency(projeto.valorTotal)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{territorio}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <span>{responsavel}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span>{monitoramento.totalMetas} metas modeladas</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate font-mono text-xs text-slate-800">{projeto.chaveIntegracao}</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-muted px-4 py-3">
                <div className="flex items-center justify-between text-[13px] text-muted-foreground">
                  <span>Progresso físico</span>
                  <span className="font-semibold text-foreground">{progresso.toFixed(0)}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-sky-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }} />
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-[1.45rem] border border-dashed border-border bg-white/75 py-14 text-center">
            <p className="text-base font-medium text-muted-foreground">Nenhum projeto encontrado.</p>
            <p className="mt-2 text-sm text-muted-foreground">Ajuste a busca ou cadastre um novo projeto para iniciar o monitoramento.</p>
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
