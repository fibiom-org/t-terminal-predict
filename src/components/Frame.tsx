import React from 'react';
import { Box } from 'ink';

export function Frame({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={2} paddingY={1} width={72}>
      {children}
    </Box>
  );
}
