import React from 'react';
import { Box, Text } from 'ink';

export interface Hint {
  readonly keys: string;
  readonly label: string;
}

export function StatusBar({ hints }: { hints: readonly Hint[] }): React.ReactElement {
  return (
    <Box marginTop={1}>
      <Text dimColor>
        {hints.map((h, i) => (
          <Text key={h.keys}>
            {i > 0 ? '   ' : ''}
            <Text color="cyan">{h.keys}</Text> {h.label}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
