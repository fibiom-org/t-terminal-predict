import React from 'react';
import { Box, Text } from 'ink';
import { useTerminalSize } from '@/components/useTerminalSize.js';
import { useHeaderRight } from '@/cli/uiContext.js';
import type { Hint } from '@/components/StatusBar.js';

interface ScreenProps {
  readonly hints?: readonly Hint[];
  readonly children: React.ReactNode;
}

export function Screen({ hints = [], children }: ScreenProps): React.ReactElement {
  const { columns, rows } = useTerminalSize();
  const headerRight = useHeaderRight();
  const rule = '─'.repeat(Math.max(0, columns));

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box width={columns} paddingX={1} justifyContent="space-between">
        <Text color="cyan" bold>
          ▰▰ TTerminal
        </Text>
        <Text dimColor>{headerRight}</Text>
      </Box>
      <Text color="gray">{rule}</Text>

      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {children}
      </Box>
      <Text color="gray">{rule}</Text>
      <Box width={columns} paddingX={1} justifyContent="space-between">
        <Text dimColor>
          {hints.map((h, i) => (
            <Text key={h.keys}>
              {i > 0 ? '   ' : ''}
              <Text color="cyan">{h.keys}</Text> {h.label}
            </Text>
          ))}
        </Text>
        <Text dimColor>
          <Text color="cyan">ctrl+c</Text> quit
        </Text>
      </Box>
    </Box>
  );
}
