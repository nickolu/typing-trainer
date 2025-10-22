'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { TestResult } from '@/lib/types';

interface WPMChartProps {
  results: TestResult[];
}

export function WPMChart({ results }: WPMChartProps) {
  const chartData = useMemo(() => {
    // Sort by date ascending
    const sorted = [...results].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sorted.map((result) => ({
      date: new Date(result.createdAt),
      wpm: result.wpm,
      id: result.id,
    }));
  }, [results]);

  if (chartData.length === 0) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
        <p className="text-editor-muted">No data available for WPM chart</p>
      </div>
    );
  }

  // Calculate statistics
  const avgWPM = Math.round(
    chartData.reduce((sum, d) => sum + d.wpm, 0) / chartData.length
  );
  const maxWPM = Math.max(...chartData.map((d) => d.wpm));
  const minWPM = Math.min(...chartData.map((d) => d.wpm));

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">WPM Progress</h2>
        <p className="text-editor-muted text-sm mb-3">Your typing speed over time</p>

        {/* Stats Summary */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-editor-muted">Average: </span>
            <span className="font-semibold text-editor-accent">{avgWPM} WPM</span>
          </div>
          <div>
            <span className="text-editor-muted">Peak: </span>
            <span className="font-semibold text-editor-success">{maxWPM} WPM</span>
          </div>
          <div>
            <span className="text-editor-muted">Lowest: </span>
            <span className="font-semibold">{minWPM} WPM</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(date, 'MMM d')}
            stroke="#6e6e6e"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6e6e6e"
            style={{ fontSize: '12px' }}
            label={{
              value: 'WPM',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6e6e6e', fontSize: '12px' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e1e1e',
              border: '1px solid #3e3e3e',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
            labelStyle={{ color: '#d4d4d4', marginBottom: '4px' }}
            itemStyle={{ color: '#569cd6' }}
            labelFormatter={(date) =>
              format(new Date(date), 'MMM d, yyyy h:mm a')
            }
            formatter={(value: number) => [`${value} WPM`, 'Speed']}
          />
          <Line
            type="monotone"
            dataKey="wpm"
            stroke="#569cd6"
            strokeWidth={2}
            dot={{ fill: '#569cd6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
