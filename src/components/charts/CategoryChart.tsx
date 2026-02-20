import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Fomento } from '../../types/fomento';
import { formatBRL } from '../../lib/utils';
import { useState, useEffect } from 'react';

interface CategoryChartProps {
  fomentos: Fomento[];
}
const chartConfig = {
  quantidade: {
    label: 'Quantidade',
    color: 'var(--chart-1)'
  },
  valorTotal: {
    label: 'Valor Total',
    color: 'var(--chart-2)'
  }
} satisfies ChartConfig;

export function CategoryChart({ fomentos }: CategoryChartProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const categoryData = fomentos.reduce((acc, f) => {
    const cat = f.categoria || 'Outros';
    if (!acc[cat]) {
      acc[cat] = {
        categoria: cat,
        quantidade: 0,
        valorTotal: 0
      };
    }
    acc[cat].quantidade++;
    acc[cat].valorTotal += f.valorTotal;
    return acc;
  }, {} as Record<string, {
    categoria: string;
    quantidade: number;
    valorTotal: number;
  }>);
  const chartData = Object.values(categoryData);
  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-sm md:text-lg">Projetos por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-6 pt-2 md:pt-0">
        <ChartContainer config={chartConfig} className="min-h-[350px] md:min-h-[300px] w-full">
          <BarChart
            data={chartData}
            accessibilityLayer
            margin={isMobile ? { top: 5, right: 5, left: 5, bottom: 5 } : { top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="categoria"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={isMobile ? { fontSize: 9 } : { fontSize: 12 }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? 'end' : 'middle'}
              height={isMobile ? 60 : 30}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              tickLine={false}
              axisLine={false}
              tick={isMobile ? false : { fontSize: 12 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={isMobile ? false : { fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === 'valorTotal' && typeof value === 'number') {
                      return formatBRL(value);
                    }
                    return value;
                  }}
                />
              }
            />
            {!isMobile && <ChartLegend content={<ChartLegendContent />} />}
            <Bar yAxisId="left" dataKey="quantidade" fill="var(--color-quantidade)" radius={4} />
            <Bar yAxisId="right" dataKey="valorTotal" fill="var(--color-valorTotal)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}