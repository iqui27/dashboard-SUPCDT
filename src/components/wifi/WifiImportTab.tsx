import { useCallback, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Loader2,
  Plus,
  Search,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../contexts/AuthContext';
import { bulkCreateWifiPoints, importWifiPointsFromSei, type WifiImportPoint, type WifiImportResult } from '../../lib/api/wifi';
import { getWifiStatusLabel, getWifiStatusColor, type WifiPointInput } from '../../types/wifi';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface WifiImportTabProps {
  onImportComplete: () => void;
}

type ImportPhase = 'idle' | 'scraping' | 'review' | 'creating' | 'done';

export function WifiImportTab({ onImportComplete }: WifiImportTabProps) {
  const { token } = useAuth();
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [processoSEI, setProcessoSEI] = useState('');
  const [importResult, setImportResult] = useState<WifiImportResult | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrapingProgress, setScrapingProgress] = useState<string>('');

  const handleScrape = useCallback(async () => {
    const process = processoSEI.trim();
    if (!process) {
      toast.error('Informe o número do processo SEI');
      return;
    }

    if (!token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    setPhase('scraping');
    setError(null);
    setImportResult(null);
    setSelectedPoints(new Set());
    setScrapingProgress('Conectando ao SEI...');

    // Show a progress timer while polling
    const progressInterval = setInterval(() => {
      setScrapingProgress((prev) => {
        if (prev.endsWith('...')) return prev.replace(/\.\.\.+$/, '..');
        return prev + '.';
      });
    }, 1500);

    try {
      const result = await importWifiPointsFromSei(token, process);
      clearInterval(progressInterval);

      if (!result.success) {
        setError(result.error || result.metadata.error || 'Falha ao importar pontos do processo');
        setPhase('idle');
        return;
      }

      setImportResult(result);
      setSelectedPoints(new Set(result.points.map((_, i) => i)));
      setPhase(result.points.length > 0 ? 'review' : 'done');
    } catch (err) {
      clearInterval(progressInterval);
      const message = err instanceof Error ? err.message : 'Erro ao buscar processo SEI';
      setError(message);
      setPhase('idle');
    }
  }, [token, processoSEI]);

  const handleTogglePoint = (index: number) => {
    setSelectedPoints((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!importResult) return;
    setSelectedPoints(new Set(importResult.points.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedPoints(new Set());
  };

  const handleCreatePoints = async () => {
    if (!token || !importResult) return;

    const pointsToCreate = importResult.points
      .filter((_, i) => selectedPoints.has(i))
      .map((point): WifiPointInput => ({
        nome: point.nome,
        endereco: point.endereco,
        cep: point.cep,
        regiaoAdministrativa: point.regiaoAdministrativa,
        latitude: point.latitude,
        longitude: point.longitude,
        status: point.status as WifiPointInput['status'],
        coberturaRaioMetros: point.coberturaRaioMetros,
        velocidadeMbps: point.velocidadeMbps,
        usuariosConectados: point.usuariosConectados,
        precisaAcao: false,
        statusManutencao: 'pendente',
        incidentesAbertos: 0,
        responsavelOperacional: point.responsavelOperacional,
        observacoes: point.observacoes
          ? `[Importado do SEI] ${point.observacoes}`
          : `[Importado do processo ${importResult.metadata.processoSEI}]`
      }));

    if (pointsToCreate.length === 0) {
      toast.error('Selecione pelo menos um ponto para adicionar');
      return;
    }

    setPhase('creating');

    try {
      const result = await bulkCreateWifiPoints(token, pointsToCreate);
      setBulkResult({ created: result.createdCount, errors: result.errors.length });

      if (result.createdCount > 0) {
        toast.success(`${result.createdCount} ponto(s) Wi-Fi adicionado(s) com sucesso.`);
      }

      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} ponto(s) não puderam ser criados.`);
      }

      setPhase('done');
      onImportComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar pontos';
      setError(message);
      setPhase('review');
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setProcessoSEI('');
    setImportResult(null);
    setSelectedPoints(new Set());
    setBulkResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border/80 bg-card px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSearch className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Importar pontos de um processo SEI</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Informe o número de um processo do SEI-DF. O sistema vai extrair documentos, analisar com inteligência
              artificial e identificar pontos de Wi-Fi Social mencionados no processo. Você poderá revisar e selecionar
              quais pontos adicionar antes de confirmar.
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Ex: 00700.000123/2025-01"
              value={processoSEI}
              onChange={(e) => setProcessoSEI(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && phase === 'idle' && handleScrape()}
              disabled={phase === 'scraping' || phase === 'creating'}
              className="h-10 rounded-full border-border bg-muted pl-10 text-sm"
            />
          </div>
          <Button
            onClick={handleScrape}
            disabled={phase === 'scraping' || phase === 'creating' || !processoSEI.trim()}
            className="h-10 rounded-full bg-primary px-5 text-white hover:bg-primary/90"
          >
            {phase === 'scraping' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <FileSearch className="mr-2 h-4 w-4" />
                Buscar pontos
              </>
            )}
          </Button>

          {/* Progress message during scraping */}
          {phase === 'scraping' && scrapingProgress && (
            <p className="mt-3 text-xs text-muted-foreground">{scrapingProgress}</p>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-semibold text-destructive">Erro na importação</p>
              <p className="mt-1 text-xs leading-5 text-destructive/80">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="mt-3 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review phase - show found points */}
      {phase === 'review' && importResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-2xl border border-primary/25 bg-primary/10 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">
                  {importResult.points.length} ponto(s) encontrado(s)
                </p>
                <p className="mt-0.5 text-xs text-primary/70">
                  Processo {importResult.metadata.processoSEI} &middot;{' '}
                  {importResult.metadata.documentsAnalyzed} documento(s) analisado(s) &middot;{' '}
                  Gemini {importResult.metadata.extractionModel}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="rounded-full text-xs"
                >
                  Selecionar todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="rounded-full text-xs"
                >
                  Desmarcar todos
                </Button>
              </div>
            </div>
          </div>

          {/* Points list */}
          <div className="space-y-2">
            {importResult.points.map((point, index) => (
              <WifiImportPointCard
                key={index}
                point={point}
                selected={selectedPoints.has(index)}
                onToggle={() => handleTogglePoint(index)}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
            <p className="text-sm text-muted-foreground">
              {selectedPoints.size} de {importResult.points.length} ponto(s) selecionado(s)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="rounded-full"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreatePoints}
                disabled={selectedPoints.size === 0}
                className="rounded-full bg-primary text-white hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar {selectedPoints.size} ponto(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Creating phase */}
      {phase === 'creating' && (
        <div className="rounded-2xl border border-border bg-card px-8 py-14 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/25 border-t-sky-700" />
            <div>
              <p className="font-semibold text-foreground">Criando pontos Wi-Fi...</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicionando {selectedPoints.size} ponto(s) ao sistema.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Done phase */}
      {phase === 'done' && bulkResult && (
        <div className="rounded-2xl border border-emerald-600/25 bg-emerald-600/10 px-5 py-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-600">
                Importação concluída
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-600/80">
                {bulkResult.created} ponto(s) adicionado(s) ao sistema
                {bulkResult.errors > 0 && ` · ${bulkResult.errors} com erro`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="rounded-full border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/10"
            >
              Importar outro processo
            </Button>
          </div>
        </div>
      )}

      {/* Done phase - no points found */}
      {phase === 'done' && !bulkResult && importResult && importResult.points.length === 0 && (
        <div className="rounded-2xl border border-border bg-card px-8 py-14 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <WifiOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Nenhum ponto de Wi-Fi encontrado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                O processo {importResult.metadata.processoSEI} não contém informações sobre pontos de Wi-Fi Social,
                ou os documentos não puderam ser acessados.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              className="mt-2 rounded-full"
            >
              Tentar outro processo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Point card component
// ---------------------------------------------------------------------------

function WifiImportPointCard({
  point,
  selected,
  onToggle
}: {
  point: WifiImportPoint;
  selected: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = getWifiStatusColor(point.status as never);
  const isGeneric = point.latitude === -15.7942 && point.longitude === -47.8822;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        selected
          ? 'border-primary/40 bg-primary/5 shadow-sm'
          : 'border-border/60 bg-card'
      }`}
    >
      {/* Main row */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
            selected
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-card hover:border-primary/50'
          }`}
        >
          {selected && <Check className="h-3 w-3" />}
        </button>

        {/* Status dot */}
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: statusColor }}
          title={getWifiStatusLabel(point.status as never)}
        />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{point.nome}</span>
            {isGeneric && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                Coordenadas aproximadas
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{point.endereco}</p>
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {point.regiaoAdministrativa}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border/40 px-4 py-3">
          <div className="grid gap-2 text-xs md:grid-cols-2">
            <Detail label="Endereço" value={point.endereco} />
            <Detail label="CEP" value={point.cep || '—'} />
            <Detail label="Região Administrativa" value={point.regiaoAdministrativa} />
            <Detail label="Status" value={getWifiStatusLabel(point.status as never)} />
            <Detail label="Cobertura" value={`${point.coberturaRaioMetros}m`} />
            {point.velocidadeMbps && <Detail label="Velocidade" value={`${point.velocidadeMbps} Mbps`} />}
            <Detail label="Latitude" value={point.latitude.toFixed(6)} />
            <Detail label="Longitude" value={point.longitude.toFixed(6)} />
            {point.responsavelOperacional && <Detail label="Responsável" value={point.responsavelOperacional} />}
          </div>
          {point.sourceExcerpt && (
            <div className="mt-3 rounded-xl border border-border/40 bg-muted/50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Trecho extraído do documento
              </p>
              <p className="mt-1 text-[11px] leading-4 text-foreground/80 italic">
                "{point.sourceExcerpt}"
              </p>
            </div>
          )}
          {point.observacoes && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Observações
              </p>
              <p className="mt-0.5 text-xs text-foreground/80">{point.observacoes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}