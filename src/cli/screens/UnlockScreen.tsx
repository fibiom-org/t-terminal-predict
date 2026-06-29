import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Field } from '@/components/Field.js';
import { Screen } from '@/components/Screen.js';
import { Loading } from '@/components/Loading.js';
import { Menu } from '@/components/Menu.js';
import { unlockWallet } from '@/wallet/walletService.js';
import { loadWallet, resetAll } from '@/storage/secureStore.js';
import { shortAddress } from '@/utils/format.js';
import type { StoredWallet, WalletSession } from '@/types/index.js';

interface Props {
  onDone: (session: WalletSession) => void;
  onRestore: () => void;
  onReset: () => void;
}

function storedAddress(stored: StoredWallet | null): string | null {
  if (!stored) return null;
  return stored.version === 2 ? stored.addresses.evm : stored.address;
}

type Mode = 'password' | 'menu' | 'confirmReset';

export function UnlockScreen({ onDone, onRestore, onReset }: Props): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('password');
  const stored = loadWallet();
  const address = storedAddress(stored);

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

  useInput(
    (_input, key) => {
      if (key.escape && mode !== 'password') setMode('password');
    },
    { isActive: mode !== 'password' && !busy },
  );

  useInput(
    (_input, key) => {
      if (key.tab) setMode('menu');
    },
    { isActive: mode === 'password' && !busy },
  );

  if (mode === 'menu') {
    return (
      <Screen hints={[{ keys: '↑/↓', label: 'move' }, { keys: 'enter', label: 'select' }, { keys: 'esc', label: 'back' }]}>
        <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
          <Box flexDirection="column">
            <Text bold>Wallet options</Text>
            <Box marginTop={1}>
              <Menu<'restore' | 'reset' | 'back'>
                items={[
                  { value: 'restore', label: 'Restore from seed phrase', hint: 'replace this wallet' },
                  { value: 'reset', label: 'Reset wallet', hint: 'erase everything on this device' },
                  { value: 'back', label: 'Back to unlock' },
                ]}
                onSelect={(v) => {
                  if (v === 'restore') onRestore();
                  else if (v === 'reset') setMode('confirmReset');
                  else setMode('password');
                }}
              />
            </Box>
          </Box>
        </Box>
      </Screen>
    );
  }

  if (mode === 'confirmReset') {
    return (
      <Screen hints={[{ keys: 'enter', label: 'confirm' }, { keys: 'esc', label: 'cancel' }]}>
        <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
          <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
            <Text color="red" bold>
              Erase this wallet?
            </Text>
            <Text dimColor>
              This deletes the encrypted wallet and all settings on this device. Funds are only
              recoverable with your seed phrase. Type RESET to confirm.
            </Text>
            <Box marginTop={1}>
              <Field
                label="Confirm:"
                placeholder="RESET"
                onSubmit={(v) => {
                  if (v.trim().toUpperCase() === 'RESET') {
                    resetAll();
                    onReset();
                  } else {
                    setError('Type RESET to confirm, or press Esc to cancel.');
                    setMode('password');
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
      </Screen>
    );
  }

  return (
    <Screen hints={[{ keys: 'enter', label: 'unlock' }, { keys: 'tab', label: 'options' }]}>
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Box flexDirection="column">
          <Text bold>Unlock wallet</Text>
          {address && <Text dimColor>Wallet {shortAddress(address)} · enter your password to continue.</Text>}
          <Box marginTop={1}>
            {busy ? (
              <Loading label="Unlocking…" />
            ) : (
              <Field label="Password:" mask onSubmit={(v) => void handle(v)} />
            )}
          </Box>
          {!busy && <Text dimColor>Forgot your password? Press Tab for restore / reset options.</Text>}
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
