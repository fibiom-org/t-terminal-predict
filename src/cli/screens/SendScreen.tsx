import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { isAddress } from 'viem';
import { Menu } from '@/components/Menu.js';
import { Field } from '@/components/Field.js';
import { Loading } from '@/components/Loading.js';
import { Screen } from '@/components/Screen.js';
import { CHAINS, getChain, nativeToken } from '@/config/chains.js';
import {
  buildSendRequest,
  getSendExecutor,
  validateSendRequest,
  type ValidatedSend,
} from '@/wallet/transferService.js';
import { unlockWallet } from '@/wallet/walletService.js';
import type { SendResult, TokenInfo, WalletSession } from '@/types/index.js';

type Step = 'network' | 'token' | 'recipient' | 'amount' | 'confirm' | 'password' | 'executing' | 'result';

interface Props {
  session: WalletSession;

  initialChainId: number;
  onBack: () => void;
  onSent: () => void;
}

const executor = getSendExecutor();

export function SendScreen({ session, initialChainId, onBack, onSent }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('network');
  const [chainId, setChainId] = useState<number>(initialChainId);
  const [token, setToken] = useState<TokenInfo | null>(null);
  const [recipient, setRecipient] = useState<string>('');
  const [send, setSend] = useState<ValidatedSend | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goBack = (): void => {
    setError(null);
    switch (step) {
      case 'token':
        setStep('network');
        break;
      case 'recipient':
        setStep('token');
        break;
      case 'amount':
        setStep('recipient');
        break;
      case 'confirm':
        setStep('amount');
        break;
      case 'password':
        setStep('confirm');
        break;
      case 'network':
      case 'result':
      default:
        onBack();
        break;
    }
  };

  useInput(
    (_input, key) => {
      if (key.escape) {
        goBack();
      } else if (step === 'result' && key.return) {
        onSent();
        onBack();
      }
    },

    { isActive: step !== 'executing' },
  );

  const tokenChoices = (): TokenInfo[] => {
    const chain = getChain(chainId);
    return [nativeToken(chain), ...chain.tokens];
  };

  const handleAmount = (value: string): void => {
    if (!token) return;
    try {
      const validated = validateSendRequest(buildSendRequest(chainId, token, recipient, value));
      setSend(validated);
      setError(null);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRecipient = (value: string): void => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter a recipient address.');
      return;
    }

    if (!isAddress(trimmed)) {
      setError('Enter a valid recipient address (0x…).');
      return;
    }
    setRecipient(trimmed);
    setError(null);
    setStep('amount');
  };

  const handlePassword = async (password: string): Promise<void> => {
    if (!send) return;
    setStep('executing');
    setError(null);
    try {
      await unlockWallet(password);
      const res = await executor.execute(session, send);
      setResult(res);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('confirm');
    }
  };

  const chainName = getChain(chainId).name;

  return (
    <Screen
      hints={[
        { keys: 'enter', label: 'select' },
        { keys: 'esc', label: 'back' },
      ]}
    >
      <Box flexDirection="column">
        <Text bold>Send</Text>

        <Box marginTop={1} flexDirection="column">
          {step === 'network' && (
            <>
              <Text dimColor>Choose the network to send on.</Text>
              <Box marginTop={1}>
                <Menu<string>
                  items={[
                    ...CHAINS.map((c) => ({
                      value: String(c.id),
                      label: c.name,
                      hint: c.id === initialChainId ? '(active)' : undefined,
                    })),
                    { value: 'back', label: 'Back' },
                  ]}
                  onSelect={(v) => {
                    if (v === 'back') return onBack();
                    setChainId(Number(v));
                    setStep('token');
                  }}
                />
              </Box>
            </>
          )}

          {step === 'token' && (
            <>
              <Text>
                Network: <Text color="cyan">{chainName}</Text>
              </Text>
              <Text dimColor>Choose the asset to send.</Text>
              <Box marginTop={1}>
                <Menu<string>
                  items={tokenChoices().map((t, i) => ({
                    value: String(i),
                    label: `${t.symbol}`,
                    hint: t.name,
                  }))}
                  onSelect={(v) => {
                    setToken(tokenChoices()[Number(v)] ?? null);
                    setError(null);
                    setStep('recipient');
                  }}
                />
              </Box>
            </>
          )}

          {step === 'recipient' && token && (
            <>
              <Text>
                Sending <Text color="cyan">{token.symbol}</Text> on <Text color="cyan">{chainName}</Text>
              </Text>
              <Box marginTop={1}>
                <Field label="Recipient (0x…):" onSubmit={handleRecipient} />
              </Box>
            </>
          )}

          {step === 'amount' && token && (
            <>
              <Text dimColor>To: {recipient}</Text>
              <Box marginTop={1}>
                <Field label={`Amount (${token.symbol}):`} onSubmit={handleAmount} />
              </Box>
            </>
          )}

          {(step === 'confirm' || step === 'password' || step === 'executing') && send && (
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
              <Text>
                Send{' '}
                <Text color="yellow">
                  {send.amountHuman} {send.token.symbol}
                </Text>
              </Text>
              <Text>
                On: <Text color="cyan">{chainName}</Text>
              </Text>
              <Text>
                To: <Text color="green">{send.recipient}</Text>
              </Text>
              {executor.simulated ? <Text dimColor>(execution simulated — no funds move)</Text> : null}
            </Box>
          )}

          {step === 'confirm' && (
            <Box marginTop={1}>
              <Menu<'confirm' | 'cancel'>
                items={[
                  { value: 'confirm', label: 'Confirm send' },
                  { value: 'cancel', label: 'Cancel' },
                ]}
                onSelect={(v) => (v === 'confirm' ? setStep('password') : onBack())}
              />
            </Box>
          )}

          {step === 'password' && (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>Confirm with your wallet password to authorise this send.</Text>
              <Field label="Password:" mask onSubmit={(v) => void handlePassword(v)} />
            </Box>
          )}

          {step === 'executing' && <Loading label="Sending…" />}

          {step === 'result' && result && (
            <Box flexDirection="column">
              <Text color={result.ok ? 'green' : 'red'}>{result.ok ? '✓ Done' : '✗ Failed'}</Text>
              <Text>{result.message}</Text>
              {result.hash && <Text dimColor>tx: {result.hash}</Text>}
              <Box marginTop={1}>
                <Text color="cyan">Press Enter to return.</Text>
              </Box>
            </Box>
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
