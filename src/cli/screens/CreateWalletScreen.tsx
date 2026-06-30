import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Field } from '@/components/Field.js';
import { Screen } from '@/components/Screen.js';
import { createWallet, persistWallet } from '@/wallet/walletService.js';
import { safeEqual } from '@/utils/crypto.js';
import { walletPath } from '@/storage/secureStore.js';
import type { WalletSession } from '@/types/index.js';

type Step = 'pw1' | 'pw2' | 'working' | 'reveal';

interface Props {
  onDone: (session: WalletSession) => void;
  onCancel: () => void;
}

export function CreateWalletScreen({ onDone, onCancel }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('pw1');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<WalletSession | null>(null);

  useInput(
    (_input, key) => {
      if (step === 'reveal' && key.return && session) onDone(session);
    },
    { isActive: step === 'reveal' },
  );

  const handlePw1 = (value: string): void => {
    if (value.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setPassword(value);
    setStep('pw2');
  };

  const handlePw2 = async (confirm: string): Promise<void> => {
    if (!safeEqual(password, confirm)) {
      setError('Passwords do not match. Start again.');
      setPassword('');
      setStep('pw1');
      return;
    }
    setError(null);
    setStep('working');
    try {
      const newSession = await createWallet();
      persistWallet(newSession, password);
      setSession(newSession);
      setStep('reveal');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('pw1');
      setPassword('');
    }
  };

  useInput(
    (_input, key) => {
      if (key.escape) onCancel();
    },
    { isActive: step === 'pw1' },
  );

  return (
    <Screen hints={step === 'reveal' ? [{ keys: 'enter', label: 'continue' }] : [{ keys: 'esc', label: 'cancel' }]}>
      <Box flexDirection="column">
        <Text bold>Create wallet</Text>
        <Box marginTop={1} flexDirection="column">
          {step === 'pw1' && (
            <>
              <Text dimColor>Choose a password to encrypt your wallet (min 8 chars). Esc to cancel.</Text>
              <Box marginTop={1}>
                <Field label="Password:" mask onSubmit={(v) => void handlePw1(v)} />
              </Box>
            </>
          )}

          {step === 'pw2' && (
            <>
              <Text dimColor>Confirm your password.</Text>
              <Box marginTop={1}>
                <Field label="Confirm: " mask onSubmit={(v) => void handlePw2(v)} />
              </Box>
            </>
          )}

          {step === 'working' && <Text color="yellow">Generating wallet…</Text>}

          {step === 'reveal' && session && (
            <>
              <Box flexDirection="column">
                <Text>
                  EVM: <Text color="green">{session.addresses.evm}</Text>
                </Text>
                <Text>
                  Solana: <Text color="green">{session.addresses.solana}</Text>
                </Text>
              </Box>
              <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
                <Text color="yellow" bold>
                  Recovery phrase (shown once — write it down):
                </Text>
                <Text color="white">{session.mnemonic}</Text>
              </Box>
              <Box marginTop={1} flexDirection="column">
                <Text dimColor>Anyone with this phrase controls your funds. It is never shown again.</Text>
                <Text dimColor>Encrypted wallet saved to {walletPath()}</Text>
                <Text color="cyan">Press Enter once you have safely stored it.</Text>
              </Box>
            </>
          )}

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
