import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { useState, useEffect } from 'react';

interface OSCData {
  osc: string;
  valorTotal: number;
}

interface OSCValorChartProps {
  className?: string;
}

const chartConfig = {
  valorTotal: {
    label: 'Valor Total (R$)',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig;

export function OSCValorChart({ className }: OSCValorChartProps) {
  const [chartData, setChartData] = useState<OSCData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Busca os dados da API OSCs
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'}/api/oscs`);
        if (!response.ok) {
          throw new Error('Erro ao buscar dados das OSCs');
        }
        
        const oscs = await response.json();
        
        // Agrupa por OSC e soma os valores
        const valorPorOSC = new Map<string, number>();
        
        oscs.forEach((osc: any) => {
          if (osc.osc && osc.valor) {
            const valorNumerico = parseFloat(osc.valor.toString().replace(/[^\d.-]/g, ''));
            if (!isNaN(valorNumerico)) {
              const nomeOSC = osc.osc.trim();
              valorPorOSC.set(nomeOSC, (valorPorOSC.get(nomeOSC) || 0) + valorNumerico);
            }
          }
        });
        
        // Converte para array e ordena pelo valor total (maior para menor)
        const dataArray = Array.from(valorPorOSC.entries())
          .map(([osc, valorTotal]) => ({
            osc: osc.length > 25 ? osc.substring(0, 22) + '...' : osc,
            valorTotal
          }))
          .sort((a, b) => b.valorTotal - a.valorTotal)
          .slice(0, 10); // Top 10 OSCs
        
        setChartData(dataArray);
      } catch (error) {
        console.error('Erro ao carregar dados das OSCs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Formata valor para exibição
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Top 10 OSCs por Valor Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top 10 OSCs por Valor Total</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 80, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="osc" 
              angle={-45} 
              textAnchor="end" 
              height={60}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              tickFormatter={formatarValor}
              width={80}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />}
              formatter={(value: number) => [formatarValor(value), '']}
            />
            <Bar 
              dataKey="valorTotal" 
              fill={chartConfig.valorTotal.color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
