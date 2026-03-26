import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

import type { Meta } from '../../types/projeto';

interface MetasChartProps {
  meta: Meta;
  totalTrimestres: number;
}

export function MetasChart({ meta, totalTrimestres }: MetasChartProps) {
  const data = Array.from({ length: totalTrimestres }, (_, idx) => ({
    name: `T${idx + 1}`,
    previsto: meta.previstoPorTrimestre[idx] || 0,
    realizado: meta.realizadoPorTrimestre[idx] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barGap={2} barSize={18}>
        <XAxis
          dataKey="name"
          fontSize={11}
          tick={{ fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip
          contentStyle={{
            borderRadius: '0.75rem',
            fontSize: '12px',
            border: '1px solid #e2e8f0',
          }}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
        <Bar dataKey="previsto" name="Previsto" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="realizado" name="Realizado" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.realizado > entry.previsto ? '#10b981' : '#0ea5e9'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
