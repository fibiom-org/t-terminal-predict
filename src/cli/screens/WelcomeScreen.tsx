import React from 'react';
import { Box, Text } from 'ink';
import { Menu } from '@/components/Menu.js';
import { Screen } from '@/components/Screen.js';

export type WelcomeChoice = 'create' | 'import' | 'exit';

interface Props {
  onSelect: (choice: WelcomeChoice) => void;
}

export function WelcomeScreen({ onSelect }: Props): React.ReactElement {
  return (
    <Screen
      hints={[
        { keys: '↑/↓', label: 'move' },
        { keys: '1-3', label: 'jump' },
        { keys: 'enter', label: 'select' },
      ]}
    >
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Box flexDirection="column">
          <Text bold>Welcome to TTerminal</Text>
          <Text dimColor>A terminal-first trading terminal.</Text>
          <Box marginTop={1}>
            <Menu<WelcomeChoice>
              items={[
                { value: 'create', label: 'Create wallet' },
                { value: 'import', label: 'Import wallet' },
                { value: 'exit', label: 'Exit' },
              ]}
              onSelect={onSelect}
            />
          </Box>
        </Box>
      </Box>
    </Screen>
  );
}
