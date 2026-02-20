import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Fomento } from '../../types/projeto';
import { calcularValorPorParlamentar, type ParlamentarValor } from '../../lib/parlamentaresAPI';
import { useState, useEffect } from 'react';

interface ParlamentarQuantidadeChartProps {
  fomentos: Fomento[];
}

const chartConfig = {
  quantidade: {
    label: 'Quantidade de Projetos',
    color: 'var(--chart-2)'
  }
} satisfies ChartConfig;

export function ParlamentarQuantidadeChart({ fomentos }: ParlamentarQuantidadeChartProps) {
  const [chartData, setChartData] = useState<Array<{
    parlamentar: string;
    quantidade: number;
    valorTotal: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const parlamentaresData = await calcularValorPorParlamentar(fomentos);
        
        const data = parlamentaresData
          .filter((item: ParlamentarValor) => item.quantidade > 0)
          .sort((a: ParlamentarValor, b: ParlamentarValor) => b.quantidade - a.quantidade)
          .slice(0, 10)
          .map((item: ParlamentarValor) => ({
            parlamentar: item.nome,
            quantidade: item.quantidade,
            valorTotal: item.valorTotal
          }));
        
        setChartData(data);
      } catch (error) {
        console.error('Error loading parlamentares data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fomentos]);

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando dados...</div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-full overflow-hidden">
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-sm md:text-lg">Top 10 Parlamentares por Quantidade</CardTitle>
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
                formatter={(value, name) => [
                  name === 'quantidade' ? `${value} projetos` : value,
                  name === 'quantidade' ? '' : 'Valor Total'
                ]}
                labelFormatter={(label) => `Parlamentar: ${label}`}
              />}
            />
            {!isMobile && <ChartLegend content={<ChartLegendContent />} />}
            <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
