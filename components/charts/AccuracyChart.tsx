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
      wordAccuracy: result.accuracy,
      charAccuracy: result.perCharacterAccuracy,
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
  const avgWordAccuracy = (
    chartData.reduce((sum, d) => sum + d.wordAccuracy, 0) / chartData.length
  ).toFixed(1);
  const maxWordAccuracy = Math.max(...chartData.map((d) => d.wordAccuracy));
  const minWordAccuracy = Math.min(...chartData.map((d) => d.wordAccuracy));
  
  // Calculate char accuracy stats (only for results that have it)
  const charAccuracyData = chartData.filter((d) => d.charAccuracy !== undefined);
  const avgCharAccuracy = charAccuracyData.length > 0
    ? (charAccuracyData.reduce((sum, d) => sum + d.charAccuracy!, 0) / charAccuracyData.length).toFixed(1)
    : null;
  const maxCharAccuracy = charAccuracyData.length > 0
    ? Math.max(...charAccuracyData.map((d) => d.charAccuracy!))
    : null;
  const minCharAccuracy = charAccuracyData.length > 0
    ? Math.min(...charAccuracyData.map((d) => d.charAccuracy!))
    : null;

  // Helper to get accuracy color
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return '#4ec9b0'; // green
    if (accuracy >= 80) return '#dcdcaa'; // yellow
    return '#f48771'; // red
  };

  const avgWordColor = getAccuracyColor(parseFloat(avgWordAccuracy));

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">Accuracy Trends</h2>
        <p className="text-editor-muted text-sm mb-3">Your typing accuracy over time</p>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
          <div>
            <div className="font-semibold mb-1 text-[#4ec9b0]">Per-Word Accuracy</div>
            <div className="flex gap-4">
              <div>
                <span className="text-editor-muted">Avg: </span>
                <span className="font-semibold" style={{ color: avgWordColor }}>
                  {avgWordAccuracy}%
                </span>
              </div>
              <div>
                <span className="text-editor-muted">Peak: </span>
                <span className="font-semibold text-editor-success">
                  {maxWordAccuracy.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-editor-muted">Low: </span>
                <span className="font-semibold">{minWordAccuracy.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div>
            <div className="font-semibold mb-1 text-[#ce9178]">Per-Character Accuracy</div>
            {avgCharAccuracy !== null ? (
              <div className="flex gap-4">
                <div>
                  <span className="text-editor-muted">Avg: </span>
                  <span className="font-semibold">
                    {avgCharAccuracy}%
                  </span>
                </div>
                <div>
                  <span className="text-editor-muted">Peak: </span>
                  <span className="font-semibold text-editor-success">
                    {maxCharAccuracy?.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-editor-muted">Low: </span>
                  <span className="font-semibold">{minCharAccuracy?.toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <div className="text-editor-muted text-xs">No data available</div>
            )}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorWordAccuracy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ec9b0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4ec9b0" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCharAccuracy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ce9178" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ce9178" stopOpacity={0} />
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
            labelFormatter={(date) =>
              format(new Date(date), 'MMM d, yyyy h:mm a')
            }
            formatter={(value, name) => {
              return [value, name as string];
             }}
          />
          <Area
            type="monotone"
            dataKey="wordAccuracy"
            stroke="#4ec9b0"
            strokeWidth={2}
            fill="url(#colorWordAccuracy)"
            dot={{ fill: '#4ec9b0', r: 4 }}
            activeDot={{ r: 6 }}
            name="Word Accuracy"
          />
          <Area
            type="monotone"
            dataKey="charAccuracy"
            stroke="#ce9178"
            strokeWidth={2}
            fill="url(#colorCharAccuracy)"
            dot={{ fill: '#ce9178', r: 4 }}
            activeDot={{ r: 6 }}
            name="Char Accuracy"
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
