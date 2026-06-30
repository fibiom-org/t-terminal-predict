import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Menu } from '@/components/Menu.js';
import { Field } from '@/components/Field.js';
import { Loading } from '@/components/Loading.js';
import { Screen } from '@/components/Screen.js';
import {
  BRIDGE_CHAINS,
  bridgeChainsExcept,
  getBridgeExecutor,
  validateBridgeRequest,
  type BridgeChain,
  type BridgeQuote,
  type BridgeResult,
  type BridgeToken,
  type ValidatedBridge,
} from '@/bridge/relayService.js';
import { unlockWallet } from '@/wallet/walletService.js';
import type { WalletSession } from '@/types/index.js';

type Step =
  | 'source'
  | 'sourceToken'
  | 'dest'
  | 'destToken'
  | 'amount'
  | 'quoting'
  | 'confirm'
  | 'password'
  | 'executing'
  | 'result';

interface Props {
  session: WalletSession;
  onBack: () => void;
  onBridged: () => void;
}

const executor = getBridgeExecutor();

export function BridgeScreen({ session, onBack, onBridged }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<BridgeChain | null>(null);
  const [sourceToken, setSourceToken] = useState<BridgeToken | null>(null);
  const [dest, setDest] = useState<BridgeChain | null>(null);
  const [destToken, setDestToken] = useState<BridgeToken | null>(null);
  const [validated, setValidated] = useState<ValidatedBridge | null>(null);
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [result, setResult] = useState<BridgeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goBack = (): void => {
    setError(null);
    switch (step) {
      case 'sourceToken':
        setStep('source');
        break;
      case 'dest':
        setStep('sourceToken');
        break;
      case 'destToken':
        setStep('dest');
        break;
      case 'amount':
        setStep('destToken');
        break;
      case 'confirm':
        setStep('amount');
        break;
      case 'password':
        setStep('confirm');
        break;
      case 'source':
      case 'quoting':
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
        onBridged();
        onBack();
      }
    },
    { isActive: step !== 'executing' && step !== 'quoting' },
  );

  const pickSourceChain = (chain: BridgeChain): void => {
    setSource(chain);
    setError(null);
    if (chain.tokens.length === 1) {
      setSourceToken(chain.tokens[0] ?? null);
      setStep('dest');
    } else {
      setSourceToken(null);
      setStep('sourceToken');
    }
  };

  const pickDestChain = (chain: BridgeChain): void => {
    setDest(chain);
    setError(null);
    if (chain.tokens.length === 1) {
      setDestToken(chain.tokens[0] ?? null);
      setStep('amount');
    } else {
      setDestToken(null);
      setStep('destToken');
    }
  };

  const handleAmount = async (value: string): Promise<void> => {
    if (!source || !sourceToken || !dest || !destToken) return;
    try {
      const v = validateBridgeRequest({ source, sourceToken, dest, destToken, amountHuman: value.trim() });
      setValidated(v);
      setError(null);
      setStep('quoting');
      const q = await executor.quote(session, v);
      setQuote(q);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('amount');
    }
  };

  const handlePassword = async (password: string): Promise<void> => {
    if (!validated || !quote) return;
    setStep('executing');
    setError(null);
    try {
      await unlockWallet(password);
      const res = await executor.execute(session, validated, quote);
      setResult(res);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('confirm');
    }
  };

  return (
    <Screen
      hints={[
        { keys: 'enter', label: 'select' },
        { keys: 'esc', label: 'back' },
      ]}
    >
      <Box flexDirection="column">
        <Text bold>Bridge</Text>

        <Box marginTop={1} flexDirection="column">
          {step === 'source' && (
            <>
              <Text dimColor>Choose the chain to bridge from.</Text>
              <Box marginTop={1}>
                <Menu<string>
                  items={[
                    ...BRIDGE_CHAINS.map((c) => ({ value: String(c.id), label: c.label, hint: c.kind })),
                    { value: 'back', label: 'Back' },
                  ]}
                  onSelect={(v) => {
                    if (v === 'back') return onBack();
                    const chain = BRIDGE_CHAINS.find((c) => String(c.id) === v);
                    if (chain) pickSourceChain(chain);
                  }}
                />
              </Box>
            </>
          )}

          {step === 'sourceToken' && source && (
            <>
              <Text>
                From: <Text color="cyan">{source.label}</Text>
              </Text>
              <Text dimColor>Choose the token to send.</Text>
              <Box marginTop={1}>
                <Menu<string>
                  items={source.tokens.map((t, i) => ({ value: String(i), label: t.symbol, hint: t.name }))}
                  onSelect={(v) => {
                    setSourceToken(source.tokens[Number(v)] ?? null);
                    setError(null);
                    setStep('dest');
                  }}
                />
              </Box>
            </>
          )}

          {step === 'dest' && source && sourceToken && (
            <>
              <Text>
                Sending <Text color="cyan">{sourceToken.symbol}</Text> from <Text color="cyan">{source.label}</Text>
              </Text>
              <Text dimColor>Choose the destination chain.</Text>
              <Box marginTop={1}>
                <Menu<string>
                  items={[
                    ...bridgeChainsExcept(source.id).map((c) => ({
                      value: String(c.id),
                      label: c.label,
                      hint: c.kind,
                    })),
                    { value: 'back', label: 'Back' },
                  ]}
                  onSelect={(v) => {
                    if (v === 'back') return setStep('sourceToken');
                    const chain = BRIDGE_CHAINS.find((c) => String(c.id) === v);
                    if (chain) pickDestChain(chain);
                  }}
                />
              </Box>
            </>
          )}

          {step === 'destToken' && dest && (
            <>
              <Text>
                To: <Text color="cyan">{dest.label}</Text>
              </Text>
              <Text dimColor>Choose the token to receive.</Text>
              <Box marginTop={1}>
                <Menu<string>
                  items={dest.tokens.map((t, i) => ({ value: String(i), label: t.symbol, hint: t.name }))}
                  onSelect={(v) => {
                    setDestToken(dest.tokens[Number(v)] ?? null);
                    setError(null);
                    setStep('amount');
                  }}
                />
              </Box>
            </>
          )}

          {step === 'amount' && source && sourceToken && dest && destToken && (
            <>
              <Text>
                <Text color="cyan">{source.label}</Text> ({sourceToken.symbol}) → <Text color="cyan">{dest.label}</Text>{' '}
                ({destToken.symbol})
              </Text>
              <Box marginTop={1}>
                <Field label={`Amount (${sourceToken.symbol}):`} onSubmit={(v) => void handleAmount(v)} />
              </Box>
            </>
          )}

          {step === 'quoting' && <Loading label="Fetching Relay quote…" />}

          {(step === 'confirm' || step === 'password' || step === 'executing') && validated && quote && (
            <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
              <Text>
                Send{' '}
                <Text color="yellow">
                  {validated.amountHuman} {validated.sourceToken.symbol}
                </Text>{' '}
                on <Text color="cyan">{validated.source.label}</Text>
              </Text>
              <Text>
                Receive{' '}
                <Text color="green">
                  ~{quote.amountOutFormatted} {validated.destToken.symbol}
                </Text>{' '}
                on <Text color="cyan">{validated.dest.label}</Text>
              </Text>
              {quote.etaSeconds != null && <Text dimColor>ETA ~{quote.etaSeconds}s</Text>}
              {executor.simulated ? <Text dimColor>(execution simulated — no funds move)</Text> : null}
            </Box>
          )}

          {step === 'confirm' && (
            <Box marginTop={1}>
              <Menu<'confirm' | 'cancel'>
                items={[
                  { value: 'confirm', label: 'Confirm bridge' },
                  { value: 'cancel', label: 'Cancel' },
                ]}
                onSelect={(v) => (v === 'confirm' ? setStep('password') : onBack())}
              />
            </Box>
          )}

          {step === 'password' && (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>Confirm with your wallet password to authorise this bridge.</Text>
              <Field label="Password:" mask onSubmit={(v) => void handlePassword(v)} />
            </Box>
          )}

          {step === 'executing' && <Loading label="Bridging…" />}

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
