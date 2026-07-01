import React from 'react';
import { Box, Text } from 'ink';
import { toFriendlyError } from '@/utils/errorMessage.js';

interface ErrorBoxProps {
  readonly error: unknown;
  readonly showRaw?: boolean;
  readonly marginTop?: number;
}

export function ErrorBox({ error, showRaw = false, marginTop = 1 }: ErrorBoxProps): React.ReactElement {
  const f = toFriendlyError(error);
  return (
    <Box marginTop={marginTop} flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
      <Text color="red" bold>
        ✗ {f.title}
      </Text>
      <Text>{f.detail}</Text>
      {f.hint ? (
        <Text color="yellow" dimColor>
          → {f.hint}
        </Text>
      ) : null}
      {showRaw && f.raw && f.raw !== f.detail ? <Text dimColor>{f.raw}</Text> : null}
    </Box>
  );
}
