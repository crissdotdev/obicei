import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { HabitEntry } from '../models/habit-entry';
import { formatValue } from '../lib/format-utils';
import { fromDateString, formatChartDate } from '../lib/date-utils';

interface NumericChartProps {
  entries: HabitEntry[];
  average: number;
}

export default function NumericChart({ entries, average }: NumericChartProps) {
  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] font-mono text-[14px] text-[var(--secondary)]">
        No data yet
      </div>
    );
  }

  const data = entries.map((e) => ({
    date: formatChartDate(fromDateString(e.date)),
    value: e.value ?? 0,
    rawDate: e.date,
  }));

  return (
    <div className="w-full min-h-[200px]">
      <div className="flex justify-end mb-1">
        <span className="font-mono text-[10px] text-[var(--accent)]">
          avg {formatValue(average)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid
            strokeDasharray="2 2"
            stroke="var(--secondary)"
            strokeWidth={0.5}
            strokeOpacity={0.3}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--primary)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--primary)' }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--primary-15)',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
            }}
            formatter={(value: number | undefined) => [value != null ? formatValue(value) : '0', 'Value']}
          />
          <ReferenceLine
            y={average}
            stroke="var(--accent)"
            strokeDasharray="4 3"
            strokeWidth={1}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'var(--primary)', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
