import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { Field } from '@/components/Field.js';
import { Screen } from '@/components/Screen.js';
import { Loading } from '@/components/Loading.js';
import { unlockWallet } from '@/wallet/walletService.js';
import { loadWallet } from '@/storage/secureStore.js';
import { shortAddress } from '@/utils/format.js';
import type { WalletSession } from '@/types/index.js';

interface Props {
  onDone: (session: WalletSession) => void;
}

export function UnlockScreen({ onDone }: Props): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const stored = loadWallet();

  const handle = async (password: string): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const session = await unlockWallet(password);
      onDone(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Screen hints={[{ keys: 'enter', label: 'unlock' }]}>
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Box flexDirection="column">
          <Text bold>Unlock wallet</Text>
          {stored && <Text dimColor>Wallet {shortAddress(stored.address)} · enter your password to continue.</Text>}
          <Box marginTop={1}>
            {busy ? <Loading label="Unlocking…" /> : <Field label="Password:" mask onSubmit={(v) => void handle(v)} />}
          </Box>
          {error && (
            <Box marginTop={1}>
              <Text color="red">{error}</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Screen>
  );
}
