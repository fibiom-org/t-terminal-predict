import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Menu } from '@/components/Menu.js';
import { Field } from '@/components/Field.js';
import { Loading } from '@/components/Loading.js';
import { Screen } from '@/components/Screen.js';
import { ErrorBox } from '@/components/ErrorBox.js';
import { CHAINS, getChain } from '@/config/chains.js';
import { SOLANA } from '@/config/nonEvm.js';
import {
  assetsForKind,
  buildSendRequest,
  getSendExecutor,
  validateSendRequest,
  type SendAsset,
  type ValidatedSend,
} from '@/wallet/transferService.js';
import { unlockWallet } from '@/wallet/walletService.js';
import type { ChainKind, SendResult, WalletSession } from '@/types/index.js';

type Step = 'kind' | 'network' | 'token' | 'recipient' | 'amount' | 'confirm' | 'password' | 'executing' | 'result';

interface Props {
  session: WalletSession;
  initialChainId: number;
  onBack: () => void;
  onSent: () => void;
}

const executor = getSendExecutor();

function kindLabel(kind: ChainKind, chainId: number): string {
  return kind === 'evm' ? getChain(chainId).name : SOLANA.label;
}

function recipientHint(kind: ChainKind): string {
  return kind === 'evm' ? 'Recipient (0x…):' : 'Recipient (Solana address):';
}

export function SendScreen({ session, initialChainId, onBack, onSent }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('kind');
  const [kind, setKind] = useState<ChainKind>('evm');
  const [chainId, setChainId] = useState<number>(initialChainId);
  const [asset, setAsset] = useState<SendAsset | null>(null);
  const [recipient, setRecipient] = useState<string>('');
  const [send, setSend] = useState<ValidatedSend | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const beforeToken: Step = kind === 'evm' ? 'network' : 'kind';

  const goBack = (): void => {
    setError(null);
    switch (step) {
      case 'network':
        setStep('kind');
        break;
      case 'token':
        setStep(beforeToken);
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
      case 'kind':
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

  const enterAssetStep = (nextKind: ChainKind, nextChainId: number): void => {
    const assets = assetsForKind(nextKind, nextChainId);
    if (assets.length === 1) {
      setAsset(assets[0] ?? null);
      setStep('recipient');
    } else {
      setStep('token');
    }
  };

  const handleRecipient = (value: string): void => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter a recipient.');
      return;
    }
    setRecipient(trimmed);
    setError(null);
    setStep('amount');
  };

  const handleAmount = (value: string): void => {
    if (!asset) return;
    try {
      const validated = validateSendRequest(buildSendRequest(kind, chainId, asset, recipient, value));
      setSend(validated);
      setError(null);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
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

  const assetChoices = asset ? null : kind === 'evm' ? assetsForKind('evm', chainId) : assetsForKind(kind, chainId);

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
          {step === 'kind' && (
            <>
              <Text dimColor>Choose the chain family to send on.</Text>
              <Box marginTop={1}>
                <Menu<ChainKind | 'back'>
                  items={[
                    { value: 'evm', label: 'EVM', hint: 'Ethereum, Arbitrum, Optimism, Base' },
                    { value: 'solana', label: SOLANA.label, hint: 'SOL & SPL tokens' },
                    { value: 'back', label: 'Back' },
                  ]}
                  onSelect={(v) => {
                    if (v === 'back') return onBack();
                    setKind(v);
                    setAsset(null);
                    setError(null);
                    if (v === 'evm') setStep('network');
                    else enterAssetStep(v, chainId);
                  }}
                />
              </Box>
            </>
          )}

          {step === 'network' && (
            <>
              <Text dimColor>Choose the EVM network to send on.</Text>
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
                    if (v === 'back') return setStep('kind');
                    const id = Number(v);
                    setChainId(id);
                    enterAssetStep('evm', id);
                  }}
                />
              </Box>
            </>
          )}

          {step === 'token' && assetChoices && (
            <>
              <Text>
                Network: <Text color="cyan">{kindLabel(kind, chainId)}</Text>
              </Text>
              <Text dimColor>Choose the asset to send.</Text>
              <Box marginTop={1}>
                <Menu<string>
                  items={assetChoices.map((a, i) => ({
                    value: String(i),
                    label: a.token.symbol,
                    hint: a.token.name,
                  }))}
                  onSelect={(v) => {
                    setAsset(assetChoices[Number(v)] ?? null);
                    setError(null);
                    setStep('recipient');
                  }}
                />
              </Box>
            </>
          )}

          {step === 'recipient' && asset && (
            <>
              <Text>
                Sending <Text color="cyan">{asset.token.symbol}</Text> on{' '}
                <Text color="cyan">{kindLabel(kind, chainId)}</Text>
              </Text>
              <Box marginTop={1}>
                <Field label={recipientHint(kind)} onSubmit={handleRecipient} />
              </Box>
            </>
          )}

          {step === 'amount' && asset && (
            <>
              <Text dimColor>To: {recipient}</Text>
              <Box marginTop={1}>
                <Field label={`Amount (${asset.token.symbol}):`} onSubmit={handleAmount} />
              </Box>
            </>
          )}

          {(step === 'confirm' || step === 'password' || step === 'executing') && send && (
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
              <Text>
                Send{' '}
                <Text color="yellow">
                  {send.amountHuman} {send.asset.token.symbol}
                </Text>
              </Text>
              <Text>
                On: <Text color="cyan">{kindLabel(kind, chainId)}</Text>
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
              {result.ok ? (
                <>
                  <Text color="green">✓ Done</Text>
                  <Text>{result.message}</Text>
                </>
              ) : (
                <ErrorBox error={result.message} showRaw marginTop={0} />
              )}
              {result.hash && <Text dimColor>tx: {result.hash}</Text>}
              <Box marginTop={1}>
                <Text color="cyan">Press Enter to return.</Text>
              </Box>
            </Box>
          )}

          {error && <ErrorBox error={error} />}
        </Box>
      </Box>
    </Screen>
  );
}
