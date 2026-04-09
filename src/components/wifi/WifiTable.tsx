import { PencilLine, Trash2 } from 'lucide-react';

import { WifiPoint, getWifiMaintenanceLabel, getWifiMaintenanceTone, getWifiPointPriorityLevel, getWifiPointPriorityTone, getWifiStatusLabel, getWifiStatusTone } from '../../types/wifi';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface WifiTableProps {
  points: WifiPoint[];
  onEditPoint: (point: WifiPoint) => void;
  onDeletePoint: (point: WifiPoint) => void;
}

export function WifiTable({ points, onEditPoint, onDeletePoint }: WifiTableProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:hidden">
        {points.map((point) => (
          <div key={point.id} className="rounded-[1.5rem] border border-border/80 bg-card/85 p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiStatusTone(point.status)}`}>
                  {getWifiStatusLabel(point.status)}
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getWifiMaintenanceTone(point.statusManutencao)}`}>
                    {getWifiMaintenanceLabel(point.statusManutencao)}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getWifiPointPriorityTone(getWifiPointPriorityLevel(point))}`}>
                    {getWifiPointPriorityLevel(point)}
                  </span>
                </div>
                <h4 className="mt-3 text-lg font-semibold text-foreground">{point.nome}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{point.endereco}</p>
                {point.cep && <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">CEP {point.cep}</p>}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-muted px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">RA</p>
                <p className="mt-1 text-sm font-medium text-foreground">{point.regiaoAdministrativa}</p>
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cobertura</p>
                <p className="mt-1 text-sm font-medium text-foreground">{point.coberturaRaioMetros} m</p>
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Incidentes</p>
                <p className="mt-1 text-sm font-medium text-foreground">{point.incidentesAbertos}</p>
              </div>
              <div className="rounded-2xl bg-muted px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ação</p>
                <p className="mt-1 text-sm font-medium text-foreground">{point.precisaAcao ? 'Prioritária' : 'Rotina'}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => onEditPoint(point)}>
                <PencilLine className="mr-2 h-4 w-4" />
                Editar
              </Button>
              <Button variant="outline" className="flex-1 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onDeletePoint(point)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/85 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.35)] lg:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/70">
              <TableHead>Ponto</TableHead>
              <TableHead>RA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Manutenção</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Cobertura</TableHead>
              <TableHead>Incidentes</TableHead>
              <TableHead>Usuários</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((point) => (
              <TableRow key={point.id} className="border-border/70">
                <TableCell>
                  <div>
                    <p className="font-semibold text-foreground">{point.nome}</p>
                    <p className="text-sm text-muted-foreground">{point.endereco}</p>
                    {point.cep && <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">CEP {point.cep}</p>}
                  </div>
                </TableCell>
                <TableCell>{point.regiaoAdministrativa}</TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiStatusTone(point.status)}`}>
                    {getWifiStatusLabel(point.status)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiMaintenanceTone(point.statusManutencao)}`}>
                    {getWifiMaintenanceLabel(point.statusManutencao)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getWifiPointPriorityTone(getWifiPointPriorityLevel(point))}`}>
                    {getWifiPointPriorityLevel(point)}
                  </span>
                </TableCell>
                <TableCell>{point.coberturaRaioMetros} m</TableCell>
                <TableCell>{point.incidentesAbertos}</TableCell>
                <TableCell>{point.usuariosConectados ?? 0}</TableCell>
                <TableCell>{point.precisaAcao ? 'Prioritária' : 'Rotina'}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => onEditPoint(point)}>
                      <PencilLine className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onDeletePoint(point)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {points.length === 0 && (
        <div className="rounded-[1.75rem] border border-dashed border-border bg-card/75 py-14 text-center">
          <p className="text-base font-medium text-muted-foreground">Nenhum ponto encontrado.</p>
          <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros ou cadastre o primeiro ponto da rede.</p>
        </div>
      )}
    </div>
  );
}
