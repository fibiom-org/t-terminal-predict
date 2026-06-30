import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Screen } from '@/components/Screen.js';
import { Panel } from '@/components/Panel.js';
import type { WalletSession } from '@/types/index.js';

interface Props {
  session: WalletSession;
  onBack: () => void;
}

export function ReceiveScreen({ session, onBack }: Props): React.ReactElement {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  return (
    <Screen hints={[{ keys: 'esc', label: 'back' }]}>
      <Box flexDirection="column">
        <Text bold>Receive</Text>
        <Text dimColor>Share these addresses to receive funds on each network.</Text>
        <Box marginTop={1} flexDirection="column">
          <Panel title="Deposit addresses" flexGrow={1}>
            <Text>
              EVM <Text color="green">{session.addresses.evm}</Text>
            </Text>
            <Text>
              Solana <Text color="green">{session.addresses.solana}</Text>
            </Text>
          </Panel>
        </Box>
      </Box>
    </Screen>
  );
}
