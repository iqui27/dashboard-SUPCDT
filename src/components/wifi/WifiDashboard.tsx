import { AlertTriangle, Gauge, MapPinned, ShieldAlert, Wifi, Wrench } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { WifiPoint, WifiStats, getWifiMaintenanceLabel, getWifiMaintenanceTone, getWifiPointPriorityLevel, getWifiPointPriorityTone, getWifiStatusLabel, getWifiStatusTone } from '../../types/wifi';
import { formatBRDate } from '../../lib/utils';

interface WifiDashboardProps {
  stats: WifiStats;
  points: WifiPoint[];
}

const STATUS_COLORS = ['#059669', '#d97706', '#dc2626', '#0284c7'];

function formatDate(value?: string | null) {
  return value ? formatBRDate(new Date(value)) : 'Sem registro';
}

export function WifiDashboard({ stats, points }: WifiDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total de Pontos', value: stats.totalPontos, helper: 'Pontos cadastrados na operação', icon: Wifi, tone: 'bg-primary/20 text-primary' },
          { label: 'Pontos Críticos', value: stats.pontosCriticos, helper: 'Fila com criticidade máxima', icon: ShieldAlert, tone: 'bg-rose-100 text-destructive' },
          { label: 'Manutenção Pendente', value: stats.manutencaoPendente, helper: 'Pontos em corretiva ou pendente', icon: Wrench, tone: 'bg-warning/20 text-warning' },
          { label: 'Incidentes Abertos', value: stats.incidentesAbertos, helper: 'Volume atual de ocorrências registradas', icon: AlertTriangle, tone: 'bg-secondary text-muted-foreground' }
        ].map((item) => (
          <div key={item.label} className="rounded-[1.75rem] border border-border/80 bg-card/85 p-6 shadow-[0_20px_70px_-42px_rgba(15,23,42,0.35)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
              <div className={`rounded-xl p-2 ${item.tone}`}>
                <item.icon className="h-4 w-4" />
              </div>
            </div>
            <h3 className="mt-4 text-3xl font-bold text-foreground">{item.value}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-[1.75rem] border border-border/80 bg-card/85 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Distribuição operacional</h3>
              <p className="mt-1 text-sm text-muted-foreground">Status dos pontos já cadastrados no Wi‑Fi Social.</p>
            </div>
            <div className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              {stats.totalPontos} pontos
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.distribStatus} dataKey="value" innerRadius={56} outerRadius={92} paddingAngle={3}>
                    {stats.distribStatus.map((entry, index) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} ponto(s)`, 'Quantidade']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {stats.distribStatus.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between rounded-2xl border border-border bg-muted px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                    <span className="font-medium text-foreground">{entry.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{entry.value}</span>
                </div>
              ))}

              <div className="rounded-2xl border border-border bg-muted px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Usuários conectados</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{stats.totalUsuarios}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Velocidade média</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{stats.velocidadeMedia || 0} Mbps</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-card/85 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Gauge className="h-5 w-5 text-primary" />
            Cobertura por região
          </div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pontosPorRegiao} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="regiaoAdministrativa"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  tick={{ fontSize: 12, fill: 'rgb(71 85 105)' }}
                />
                <Tooltip formatter={(value: number) => [`${value} ponto(s)`, 'Quantidade']} />
                <Bar dataKey="total" radius={[0, 10, 10, 0]} fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-[1.75rem] border border-border/80 bg-card/85 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Fila operacional prioritária
          </div>
          <div className="mt-5 space-y-3">
            {stats.filaAtencao.length ? (
              stats.filaAtencao.map((point) => {
                const prioridade = getWifiPointPriorityLevel(point);
                return (
                  <div key={point.id} className="rounded-2xl border border-border bg-muted px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiStatusTone(point.status)}`}>
                        {getWifiStatusLabel(point.status)}
                      </span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiMaintenanceTone(point.statusManutencao)}`}>
                        {getWifiMaintenanceLabel(point.statusManutencao)}
                      </span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiPointPriorityTone(prioridade)}`}>
                        {prioridade}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-foreground">{point.nome}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{point.regiaoAdministrativa}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{point.incidentesAbertos} incidente(s)</span>
                      <span>{point.precisaAcao ? 'Ação prioritária' : 'Rotina monitorada'}</span>
                      <span>{point.usuariosConectados ?? 0} usuário(s)</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-sm text-emerald-800">
                Nenhum ponto crítico foi identificado com os critérios atuais.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-card/85 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <MapPinned className="h-5 w-5 text-warning" />
            Territórios sob atenção
          </div>
          <div className="mt-5 space-y-3">
            {stats.regioesCriticas.length ? (
              stats.regioesCriticas.map((item) => (
                <div key={item.regiaoAdministrativa} className="rounded-2xl border border-border bg-muted px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{item.regiaoAdministrativa}</p>
                    <span className="text-sm text-muted-foreground">{item.total} ponto(s)</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.min(100, item.total * 18)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-sm text-emerald-800">
                Nenhuma RA concentra pontos sob atenção neste momento.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-[1.75rem] border border-border/80 bg-card/85 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <h3 className="text-xl font-semibold text-foreground">Resumo rápido da rede</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {points.slice(0, 4).map((point) => (
              <div key={point.id} className="rounded-[1.5rem] border border-border bg-muted px-4 py-4">
                <p className="font-semibold text-foreground">{point.nome}</p>
                <p className="mt-1 text-sm text-muted-foreground">{point.regiaoAdministrativa}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">Cobertura</p>
                <p className="mt-1 text-sm font-medium text-foreground">{point.coberturaRaioMetros} m</p>
              </div>
            ))}
            {points.length === 0 && (
              <div className="sm:col-span-2 rounded-[1.5rem] border border-dashed border-border bg-muted px-5 py-10 text-center text-sm text-muted-foreground">
                Nenhum ponto cadastrado. Use o mapa para lançar o primeiro ponto da rede.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/80 bg-card/85 p-6 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)]">
          <h3 className="text-xl font-semibold text-foreground">Últimas movimentações</h3>
          <div className="mt-5 space-y-3">
            {stats.recentes.length ? (
              stats.recentes.map((point) => (
                <div key={point.id} className="rounded-2xl border border-border bg-muted px-4 py-3">
                  <p className="font-medium text-foreground">{point.nome}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{point.regiaoAdministrativa}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Atualizado em {formatDate(point.updatedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted px-5 py-10 text-center text-sm text-muted-foreground">
                O histórico operacional começa quando o primeiro ponto for cadastrado.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
