'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { TestResult } from '@/lib/types';

interface AccuracyChartProps {
  results: TestResult[];
}

export function AccuracyChart({ results }: AccuracyChartProps) {
  const chartData = useMemo(() => {
    // Sort by date ascending
    const sorted = [...results].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return sorted.map((result) => ({
      date: new Date(result.createdAt),
      accuracy: result.accuracy,
      id: result.id,
    }));
  }, [results]);

  if (chartData.length === 0) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
        <p className="text-editor-muted">No data available for accuracy chart</p>
      </div>
    );
  }

  // Calculate statistics
  const avgAccuracy = (
    chartData.reduce((sum, d) => sum + d.accuracy, 0) / chartData.length
  ).toFixed(1);
  const maxAccuracy = Math.max(...chartData.map((d) => d.accuracy));
  const minAccuracy = Math.min(...chartData.map((d) => d.accuracy));

  // Helper to get accuracy color
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return '#4ec9b0'; // green
    if (accuracy >= 80) return '#dcdcaa'; // yellow
    return '#f48771'; // red
  };

  const avgColor = getAccuracyColor(parseFloat(avgAccuracy));

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Accuracy Trends</h2>
        <p className="text-editor-muted mb-4">Your typing accuracy over time</p>

        {/* Stats Summary */}
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-editor-muted">Average: </span>
            <span className="font-semibold" style={{ color: avgColor }}>
              {avgAccuracy}%
            </span>
          </div>
          <div>
            <span className="text-editor-muted">Peak: </span>
            <span className="font-semibold text-editor-success">
              {maxAccuracy.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-editor-muted">Lowest: </span>
            <span className="font-semibold">{minAccuracy.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ec9b0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4ec9b0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(date, 'MMM d')}
            stroke="#6e6e6e"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="#6e6e6e"
            style={{ fontSize: '12px' }}
            label={{
              value: 'Accuracy %',
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
            itemStyle={{ color: '#4ec9b0' }}
            labelFormatter={(date) =>
              format(new Date(date), 'MMM d, yyyy h:mm a')
            }
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Accuracy']}
          />
          <Area
            type="monotone"
            dataKey="accuracy"
            stroke="#4ec9b0"
            strokeWidth={2}
            fill="url(#colorAccuracy)"
            dot={{ fill: '#4ec9b0', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
