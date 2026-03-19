import { useMemo, useState } from 'react';
import { ArrowUpRight, Link2, MapPin, Plus, Search, Target, UserRound } from 'lucide-react';

import { CriacaoProjetoWizard } from './CriacaoProjetoWizard';
import { Projeto, getProjetoNivelRisco, getProjetoNome, getProjetoOsc, getProjetoPercentualExecucao, getProjetoPrecisaAcao, getProjetoResponsavel, getProjetoStatus, getProjetoStatusOperacional, getProjetoTerritorio } from '../../types/projeto';
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(14,116,144,0.10),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,255,255,0.72))] p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.35)] lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700/80">Base operacional</p>
          <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">Projetos monitorados</h2>
          <p className="mt-3 text-base text-slate-600">
            A listagem abaixo já usa os campos reais do banco, destaca a chave de integração e evita expor placeholders como se fossem dados confiáveis.
          </p>
        </div>

        <Button onClick={() => setIsProjetoModalOpen(true)} className="h-11 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
          <Plus className="mr-2 h-4 w-4" />
          Novo projeto
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/80 bg-white/85 p-5 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)] lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por projeto, OSC, categoria, território ou chave de integração..."
            className="h-12 rounded-full border-slate-200 bg-slate-50 pl-11 text-slate-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {filtered.length} de {projetos.length} projetos
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {filtered.map((projeto) => {
          const progresso = getProjetoPercentualExecucao(projeto);
          const status = getProjetoStatus(projeto);
          const statusOperacional = getProjetoStatusOperacional(projeto);
          const nivelRisco = getProjetoNivelRisco(projeto);
          const precisaAcao = getProjetoPrecisaAcao(projeto);
          const osc = getProjetoOsc(projeto) ?? 'OSC ainda não informada';
          const territorio = getProjetoTerritorio(projeto) ?? 'Cobertura ainda não detalhada';
          const responsavel = getProjetoResponsavel(projeto) ?? 'Responsável ainda não informado';

          return (
            <button
              key={projeto.id}
              type="button"
              onClick={() => onProjectSelect(projeto.id)}
              className="group rounded-[1.75rem] border border-white/80 bg-white/85 p-6 text-left shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(status)}`}>
                    {status}
                  </span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {statusOperacional}
                    </span>
                    <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                      Risco {nivelRisco}
                    </span>
                    {precisaAcao && (
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800">
                        Requer ação
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-slate-950 transition-colors group-hover:text-sky-700">
                    {getProjetoNome(projeto)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{osc}</p>
                </div>

                <ArrowUpRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-sky-700" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Categoria</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{projeto.categoria || 'Sem categoria'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Investimento</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatCurrency(projeto.valorTotal)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{territorio}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <span>{responsavel}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Target className="h-4 w-4 text-slate-400" />
                  <span>{projeto.monitoramento.totalMetas} metas modeladas</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Link2 className="h-4 w-4 text-slate-400" />
                  <span className="truncate font-mono text-xs text-slate-800">{projeto.chaveIntegracao}</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Progresso físico</span>
                  <span className="font-semibold text-slate-900">{progresso.toFixed(0)}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-sky-600 transition-all" style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }} />
                </div>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-[1.75rem] border border-dashed border-slate-200 bg-white/75 py-14 text-center">
            <p className="text-base font-medium text-slate-700">Nenhum projeto encontrado.</p>
            <p className="mt-2 text-sm text-slate-500">Ajuste a busca ou cadastre um novo projeto para iniciar o monitoramento.</p>
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
