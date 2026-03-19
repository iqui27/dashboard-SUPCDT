import { AreaChart, Area, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Fomento } from '../../types/projeto';
import { formatBRL, calculateValorExecutado } from '../../lib/utils';
import { useState, useEffect } from 'react';

interface FinancialChartProps {
  fomentos: Fomento[];
}
const chartConfig = {
  valorAprovado: {
    label: 'Valor Aprovado',
    color: 'var(--chart-4)'
  },
  valorExecutado: {
    label: 'Valor Executado',
    color: 'var(--chart-5)'
  }
} satisfies ChartConfig;

export function FinancialChart({ fomentos }: FinancialChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  // Group by month/year of project start date
  const monthlyData = fomentos.reduce((acc, f) => {
    if (!f.dataInicio) return acc;
    const startDate = new Date(f.dataInicio);
    if (Number.isNaN(startDate.getTime())) return acc;
    const monthYear = new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    }).format(startDate);
    if (!acc[monthYear]) {
      acc[monthYear] = {
        periodo: monthYear,
        valorAprovado: 0,
        valorExecutado: 0,
        projetos: 0
      };
    }
    acc[monthYear].valorAprovado += f.valorTotal;
    acc[monthYear].valorExecutado += calculateValorExecutado(f);
    acc[monthYear].projetos++;
    return acc;
  }, {} as Record<string, {
    periodo: string;
    valorAprovado: number;
    valorExecutado: number;
    projetos: number;
  }>);
  const chartData = Object.values(monthlyData).sort((a, b) => {
    return a.periodo.localeCompare(b.periodo);
  });
  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-sm md:text-lg">Evolução Financeira</CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-6 pt-2 md:pt-0">
        <ChartContainer config={chartConfig} className="min-h-[350px] md:min-h-[320px] w-full">
          <AreaChart
            data={chartData}
            accessibilityLayer
            margin={isMobile ? { top: 5, right: 5, left: 5, bottom: 5 } : { top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="periodo"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={isMobile ? { fontSize: 9 } : { fontSize: 12 }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={value => isMobile ? '' : formatBRL(Number(value))}
              tick={isMobile ? false : { fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
              content={<ChartTooltipContent formatter={value => formatBRL(Number(value))} />}
            />
            {!isMobile && <ChartLegend content={<ChartLegendContent />} />}
            <Area type="monotone" dataKey="valorAprovado" stroke="var(--color-valorAprovado)" fill="var(--color-valorAprovado)" fillOpacity={0.4} />
            <Area type="monotone" dataKey="valorExecutado" stroke="var(--color-valorExecutado)" fill="var(--color-valorExecutado)" fillOpacity={0.4} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
