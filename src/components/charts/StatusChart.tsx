import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { getStatusColor } from '../../lib/utils';
import { StatusProjeto } from '../../types/fomento';

interface StatusChartProps {
  data: Record<StatusProjeto, number>;
}

export function StatusChart({
  data
}: StatusChartProps) {
  // Garante que todas as categorias existam nos dados
  const completeData: Record<StatusProjeto, number> = {
    'Reprovada': data['Reprovada'] ?? 0,
    'Em andamento': data['Em andamento'] ?? 0,
    'Assinado': data['Assinado'] ?? 0,
    'Encerrado': data['Encerrado'] ?? 0
  };
  
  const total = Object.values(completeData).reduce((sum, value) => sum + value, 0) || 1;
  const displayOrder: StatusProjeto[] = ['Reprovada', 'Em andamento', 'Assinado', 'Encerrado'];
  return (
    <Card className="md:h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status dos Projetos</p>
            <CardTitle className="text-lg font-semibold">Visão geral das etapas de assinatura</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Total: {total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayOrder.map(status => {
          const value = completeData[status] ?? 0;
          const percentage = Math.round((value / total) * 100);
          const color = getStatusColor(status);
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 md:h-2 md:w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></span>
                  <span className="font-medium text-sm md:text-base">{status}</span>
                </div>
                <div className="text-muted-foreground text-xs md:text-sm whitespace-nowrap">
                  <span className="hidden md:inline">{value} projetos · </span>
                  {percentage}%
                </div>
              </div>
              <div className="h-2.5 md:h-2 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${percentage}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}