import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Field } from '@/components/Field.js';
import { Screen } from '@/components/Screen.js';
import { importWallet, persistWallet } from '@/wallet/walletService.js';
import { safeEqual } from '@/utils/crypto.js';
import { shortAddress } from '@/utils/format.js';
import type { WalletSession } from '@/types/index.js';

type Step = 'mnemonic' | 'pw1' | 'pw2' | 'working';

interface Props {
  onDone: (session: WalletSession) => void;
  onCancel: () => void;
}

export function ImportWalletScreen({ onDone, onCancel }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('mnemonic');
  const [session, setSession] = useState<WalletSession | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useInput(
    (_input, key) => {
      if (key.escape) onCancel();
    },
    { isActive: step === 'mnemonic' },
  );

  const handleMnemonic = async (value: string): Promise<void> => {
    try {
      const s = await importWallet(value);
      setSession(s);
      setError(null);
      setStep('pw1');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handlePw1 = (value: string): void => {
    if (value.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setPassword(value);
    setStep('pw2');
  };

  const handlePw2 = (confirm: string): void => {
    if (!session) return;
    if (!safeEqual(password, confirm)) {
      setError('Passwords do not match. Re-enter password.');
      setPassword('');
      setStep('pw1');
      return;
    }
    setStep('working');
    try {
      persistWallet(session, password);
      onDone(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('pw1');
    }
  };

  return (
    <Screen
      hints={[
        { keys: 'enter', label: 'submit' },
        { keys: 'esc', label: 'cancel' },
      ]}
    >
      <Box flexDirection="column">
        <Text bold>Import wallet</Text>
        <Box marginTop={1} flexDirection="column">
          {step === 'mnemonic' && (
            <>
              <Text dimColor>Enter your 12/24-word recovery phrase. Esc to cancel.</Text>
              <Box marginTop={1}>
                <Field label="Mnemonic:" placeholder="word word word …" onSubmit={(v) => void handleMnemonic(v)} />
              </Box>
            </>
          )}

          {step === 'pw1' && session && (
            <>
              <Text>
                Detected EVM address: <Text color="green">{shortAddress(session.addresses.evm)}</Text>
              </Text>
              <Text dimColor>Solana {shortAddress(session.addresses.solana)}</Text>
              <Text dimColor>Choose a password to encrypt this wallet (min 8 chars).</Text>
              <Box marginTop={1}>
                <Field label="Password:" mask onSubmit={handlePw1} />
              </Box>
            </>
          )}

          {step === 'pw2' && (
            <Box marginTop={1}>
              <Field label="Confirm: " mask onSubmit={handlePw2} />
            </Box>
          )}

          {step === 'working' && <Text color="yellow">Saving wallet…</Text>}

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
