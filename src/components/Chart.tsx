import React from 'react';
import { Text } from 'ink';
import asciichart from 'asciichart';

interface ChartProps {
  readonly series: readonly number[];
  readonly height?: number;

  readonly width?: number;
  readonly color?: string;
}

export function Chart({ series, height = 8, width = 50, color }: ChartProps): React.ReactElement {
  if (series.length < 2) return <Text dimColor>no data</Text>;

  const step = Math.max(1, Math.ceil(series.length / width));
  const sampled = series.filter((_, i) => i % step === 0);

  const plot = asciichart.plot(sampled as number[], { height });
  return <Text color={color}>{plot}</Text>;
}
