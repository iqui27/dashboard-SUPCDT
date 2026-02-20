import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Fomento } from '../../types/fomento';
import { formatBRL } from '../../lib/utils';
import { useState, useEffect } from 'react';

interface RegionChartProps {
  fomentos: Fomento[];
}
const chartConfig = {
  valorTotal: {
    label: 'Valor Total',
    color: 'var(--chart-3)'
  }
} satisfies ChartConfig;

export function RegionChart({ fomentos }: RegionChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const regionData = fomentos.reduce((acc, f) => {
    const regions = f.regioesAdministrativas && f.regioesAdministrativas.length > 0 ? f.regioesAdministrativas : [f.regiaoAdministrativa || 'Não informado'];
    const uniqueRegions = Array.from(new Set(regions.map(region => (region || '').trim()).filter(Boolean)));
    const fallbackValor = uniqueRegions.length > 0 ? f.valorTotal / uniqueRegions.length : f.valorTotal;
    uniqueRegions.forEach(regionName => {
      const regiao = regionName || 'Não informado';
      if (!regiao || regiao.toLowerCase() === 'não se aplica') {
        return;
      }
      if (!acc[regiao]) {
        acc[regiao] = {
          regiao,
          quantidade: 0,
          valorTotal: 0
        };
      }
      acc[regiao].quantidade += 1;
      const valor = fallbackValor;
      if (!isNaN(valor)) {
        acc[regiao].valorTotal += valor;
      }
    });
    return acc;
  }, {} as Record<string, {
    regiao: string;
    quantidade: number;
    valorTotal: number;
  }>);
  const chartData = Object.values(regionData).sort((a, b) => b.valorTotal - a.valorTotal);
  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-sm md:text-lg">Distribuição por Região Administrativa</CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-6 pt-2 md:pt-0">
        <ChartContainer config={chartConfig} className="min-h-[400px] md:min-h-[300px] w-full">
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
              dataKey="regiao"
              type="category"
              width={isMobile ? 1 : 160}
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