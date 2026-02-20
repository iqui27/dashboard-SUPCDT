import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Fomento } from '../../types/fomento';
import { formatBRL } from '../../lib/utils';
import { useState, useEffect } from 'react';

interface ParlamentarChartProps {
  fomentos: Fomento[];
}
const chartConfig = {
  valorTotal: {
    label: 'Valor Total',
    color: 'var(--chart-4)'
  }
} satisfies ChartConfig;

export function ParlamentarChart({ fomentos }: ParlamentarChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const parlamentarData = fomentos.reduce((acc, f) => {
    const entries = f.emendasParlamentares && f.emendasParlamentares.length > 0 ? f.emendasParlamentares : [{ nome: f.parlamentar || 'Não informado' }];
    const fallbackValor = entries.length > 0 ? f.valorTotal / entries.length : f.valorTotal;
    entries.forEach((entry: any) => {
      const nome = entry.nome?.trim() || 'Não informado';
      if (!nome || nome.toLowerCase() === 'não se aplica') {
        return;
      }
      const key = nome;
      if (!acc[key]) {
        acc[key] = {
          parlamentar: nome,
          quantidade: 0,
          valorTotal: 0
        };
      }
      acc[key].quantidade += 1;
      const valor = entry.valor ?? fallbackValor;
      if (typeof valor === 'number' && !isNaN(valor)) {
        acc[key].valorTotal += valor;
      }
    });
    return acc;
  }, {} as Record<string, {
    parlamentar: string;
    quantidade: number;
    valorTotal: number;
  }>);
  const chartData = Object.values(parlamentarData)
    .filter(item => item.valorTotal > 0)
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, 10);
  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-sm md:text-lg">Top 10 Parlamentares por Valor</CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-6 pt-2 md:pt-0">
        <ChartContainer config={chartConfig} className="min-h-[400px] md:min-h-[320px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            accessibilityLayer
            margin={isMobile ? { top: 5, right: 15, left: 5, bottom: 5 } : { top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickFormatter={value => isMobile ? '' : formatBRL(Number(value))}
              tick={isMobile ? false : { fontSize: 12 }}
            />
            <YAxis
              dataKey="parlamentar"
              type="category"
              width={isMobile ? 1 : 180}
              tickLine={false}
              axisLine={false}
              tick={isMobile ? false : { fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
              content={<ChartTooltipContent
                formatter={value => formatBRL(Number(value))}
                labelFormatter={(label) => `${label}`}
              />}
            />
            {!isMobile && <ChartLegend content={<ChartLegendContent />} />}
            <Bar dataKey="valorTotal" fill="var(--color-valorTotal)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}