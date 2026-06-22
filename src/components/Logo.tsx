import React from 'react';
import { Box, Text } from 'ink';

export function Logo(): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan" bold>
        ▰▰ TTerminal
      </Text>
      <Text dimColor>terminal-first trading · multi-chain</Text>
    </Box>
  );
}
