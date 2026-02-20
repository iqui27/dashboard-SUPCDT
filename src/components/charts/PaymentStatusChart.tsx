import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';
import { Fomento } from '../../types/fomento';
interface PaymentStatusChartProps {
  fomentos: Fomento[];
}
export function PaymentStatusChart({
  fomentos
}: PaymentStatusChartProps) {
  const paymentData = fomentos.reduce((acc, f) => {
    const status = f.tipoSituacaoPagamento || 'Não especificado';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const palette = ['#22c55e', '#f59e0b', '#ef4444', '#6b7280', '#3b82f6'];
  const chartData = Object.entries(paymentData).map(([status, value], index) => {
    const colorKey = `payment-${index}`;
    return {
      status,
      value,
      colorKey
    };
  });
  const chartConfig = chartData.reduce((acc, item, index) => {
    acc[item.colorKey] = {
      label: item.status,
      color: palette[index % palette.length]
    };
    return acc;
  }, {} as ChartConfig);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Situação de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="colorKey" />} />
            <ChartLegend content={<ChartLegendContent nameKey="colorKey" />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={60}
              paddingAngle={2}
              label={({ percent, payload }) => `${payload.status}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map(item => (
                <Cell key={item.colorKey} fill={`var(--color-${item.colorKey})`} stroke="transparent" />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}