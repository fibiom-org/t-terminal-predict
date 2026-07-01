import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Menu } from '@/components/Menu.js';
import { Field } from '@/components/Field.js';
import { Screen } from '@/components/Screen.js';
import { CHAINS } from '@/config/chains.js';
import {
  getActiveChainId,
  getRpcUrl,
  getSolanaRpcUrl,
  hasRpcOverride,
  hasSolanaRpcOverride,
  hasExecutionOverride,
  isLiveExecution,
  setActiveChainId,
  setLiveExecution,
  clearLiveExecution,
  setRpcUrl,
  setSolanaRpcUrl,
  type LiveFeature,
} from '@/storage/settingsStore.js';
import { resetAll } from '@/storage/secureStore.js';
import { hasBuilderCredentials, saveBuilderCredentials, clearBuilderCredentials } from '@/storage/credentialsStore.js';
import { resetTradeContext } from '@/polymarket/tradeClient.js';
import { resetClients } from '@/wallet/client.js';
import { disposeManagers } from '@/wallet/managers.js';
import type { WalletSession } from '@/types/index.js';

type Step =
  | 'home'
  | 'networks'
  | 'detail'
  | 'editRpc'
  | 'solana'
  | 'wallet'
  | 'confirmReset'
  | 'execution'
  | 'builderMenu'
  | 'builder';

type BuilderField = 'key' | 'secret' | 'pass';

const EXECUTION_FEATURES: readonly { value: LiveFeature; label: string }[] = [
  { value: 'sends', label: 'Sends  (/send)  ' },
  { value: 'bridges', label: 'Bridges (/bridge)' },
  { value: 'bets', label: 'Bets   (/predict)' },
];

interface Props {
  session: WalletSession;
  onBack: () => void;
  onChange: () => void;
  onLogout: () => void;
  onReset: () => void;
  onRestore: () => void;
}

export function SettingsScreen({ session, onBack, onChange, onLogout, onReset, onRestore }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('home');
  const [chainId, setChainId] = useState<number>(getActiveChainId());

  const [builderField, setBuilderField] = useState<BuilderField>('key');
  const [builderKey, setBuilderKey] = useState('');
  const [builderSecret, setBuilderSecret] = useState('');

  const [, setTick] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const refresh = (): void => setTick((t) => t + 1);

  const openBuilder = (): void => {
    setStatus(null);
    setStep(hasBuilderCredentials() ? 'builderMenu' : startBuilderFields());
  };

  const startBuilderFields = (): 'builder' => {
    setBuilderKey('');
    setBuilderSecret('');
    setBuilderField('key');
    return 'builder';
  };

  useInput(
    (_input, key) => {
      if (!key.escape) return;
      if (step === 'home') onBack();
      else if (step === 'detail') setStep('networks');
      else if (step === 'editRpc') setStep('detail');
      else if (step === 'builder' || step === 'builderMenu') setStep('execution');
      else setStep('home');
    },
    { isActive: step !== 'editRpc' && step !== 'solana' },
  );

  const activeId = getActiveChainId();

  if (step === 'home') {
    return (
      <Screen
        hints={[
          { keys: '↑/↓', label: 'move' },
          { keys: 'enter', label: 'open' },
          { keys: 'esc', label: 'back' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings</Text>
          <Box marginTop={1}>
            <Menu<'networks' | 'solana' | 'execution' | 'wallet'>
              items={[
                { value: 'networks', label: 'EVM networks', hint: 'active chain & RPC nodes' },
                { value: 'solana', label: 'Solana RPC', hint: getSolanaRpcUrl() },
                {
                  value: 'execution',
                  label: 'Execution & API',
                  hint: 'live vs simulation · Builder API keys',
                },
                { value: 'wallet', label: 'Wallet', hint: 'logout · restore · reset' },
              ]}
              onSelect={(v) => {
                setStatus(null);
                setStep(v);
              }}
            />
          </Box>
          {status && (
            <Box marginTop={1}>
              <Text color="green">{status}</Text>
            </Box>
          )}
        </Box>
      </Screen>
    );
  }

  if (step === 'networks') {
    return (
      <Screen
        hints={[
          { keys: '↑/↓', label: 'move' },
          { keys: 'enter', label: 'configure' },
          { keys: 'esc', label: 'back' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings · EVM networks</Text>
          <Text dimColor>Select a network to set it active or change its RPC node.</Text>
          <Box marginTop={1}>
            <Menu<string>
              items={CHAINS.map((c) => ({
                value: String(c.id),
                label: c.name.padEnd(10),
                hint: `${c.id === activeId ? '● active  ' : '          '}${getRpcUrl(c.id)}`,
              }))}
              onSelect={(v) => {
                setChainId(Number(v));
                setStatus(null);
                setStep('detail');
              }}
            />
          </Box>
        </Box>
      </Screen>
    );
  }

  if (step === 'detail') {
    const chain = CHAINS.find((c) => c.id === chainId)!;
    const isActive = chainId === activeId;
    const custom = hasRpcOverride(chainId);
    return (
      <Screen
        hints={[
          { keys: 'enter', label: 'select' },
          { keys: 'esc', label: 'back' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings · {chain.name}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>Status: {isActive ? <Text color="cyan">active</Text> : <Text dimColor>inactive</Text>}</Text>
            <Text>
              RPC: <Text color="white">{getRpcUrl(chainId)}</Text>
              {custom ? <Text dimColor> (custom)</Text> : <Text dimColor> (default)</Text>}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Menu<'active' | 'edit' | 'reset' | 'back'>
              items={[
                ...(isActive ? [] : ([{ value: 'active', label: 'Set as active network' }] as const)),
                { value: 'edit', label: 'Edit RPC URL' },
                ...(custom ? ([{ value: 'reset', label: 'Reset RPC to default' }] as const) : []),
                { value: 'back', label: 'Back' },
              ]}
              onSelect={(v) => {
                if (v === 'active') {
                  setActiveChainId(chainId);
                  onChange();
                  setStatus(`Active network set to ${chain.name}.`);
                  setStep('networks');
                } else if (v === 'edit') {
                  setStep('editRpc');
                } else if (v === 'reset') {
                  setRpcUrl(chainId, '');
                  resetClients(chainId);
                  onChange();
                  refresh();
                  setStatus(`${chain.name} RPC reset to default.`);
                } else {
                  setStep('networks');
                }
              }}
            />
          </Box>
        </Box>
      </Screen>
    );
  }

  if (step === 'editRpc') {
    const chain = CHAINS.find((c) => c.id === chainId)!;
    return (
      <Screen
        hints={[
          { keys: 'enter', label: 'save' },
          { keys: 'esc', label: 'cancel' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings · {chain.name} · RPC node</Text>
          <Text dimColor>Enter a JSON-RPC URL (leave empty to use the default). Current:</Text>
          <Text>{getRpcUrl(chainId)}</Text>
          <Box marginTop={1}>
            <Field
              label="RPC URL:"
              placeholder={chain.defaultRpcUrl}
              onSubmit={(v) => {
                setRpcUrl(chainId, v);
                resetClients(chainId);
                onChange();
                setStatus(`${chain.name} RPC updated.`);
                setStep('detail');
              }}
            />
          </Box>
        </Box>
      </Screen>
    );
  }

  if (step === 'solana') {
    return (
      <Screen
        hints={[
          { keys: 'enter', label: 'save' },
          { keys: 'esc', label: 'cancel' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings · Solana RPC</Text>
          <Text dimColor>
            Enter a Solana JSON-RPC URL (leave empty for the default
            {hasSolanaRpcOverride() ? ', currently custom' : ''}). Current:
          </Text>
          <Text>{getSolanaRpcUrl()}</Text>
          <Box marginTop={1}>
            <Field
              label="RPC URL:"
              placeholder="https://api.mainnet-beta.solana.com"
              onSubmit={(v) => {
                setSolanaRpcUrl(v);
                disposeManagers();
                onChange();
                setStatus('Solana RPC updated.');
                setStep('home');
              }}
            />
          </Box>
        </Box>
      </Screen>
    );
  }

  if (step === 'execution') {
    const builderConfigured = hasBuilderCredentials();
    return (
      <Screen
        hints={[
          { keys: '↑/↓', label: 'move' },
          { keys: 'enter', label: 'toggle / open' },
          { keys: 'esc', label: 'back' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings · Execution &amp; API</Text>
          <Text dimColor>
            Toggle each flow between real on-chain execution and local simulation. Values persist on this device.
          </Text>
          <Box marginTop={1}>
            <Menu<LiveFeature | 'builder' | 'back'>
              items={[
                ...EXECUTION_FEATURES.map((f) => {
                  const live = isLiveExecution(f.value);
                  const custom = hasExecutionOverride(f.value);
                  return {
                    value: f.value,
                    label: f.label,
                    hint: `${live ? '● real execution' : '○ simulation   '}${custom ? '' : ' (default)'}`,
                  };
                }),
                {
                  value: 'builder' as const,
                  label: 'Builder API credentials',
                  hint: builderConfigured ? '✓ stored (encrypted)' : 'not set',
                },
                { value: 'back' as const, label: 'Back' },
              ]}
              onSelect={(v) => {
                if (v === 'back') {
                  setStep('home');
                } else if (v === 'builder') {
                  openBuilder();
                } else {
                  const next = !isLiveExecution(v);
                  setLiveExecution(v, next);
                  onChange();
                  refresh();
                  const label = EXECUTION_FEATURES.find((f) => f.value === v)?.label.trim();
                  setStatus(`${label} set to ${next ? 'real execution' : 'simulation'}.`);
                }
              }}
            />
          </Box>
          {EXECUTION_FEATURES.some((f) => hasExecutionOverride(f.value)) && (
            <Box marginTop={1}>
              <Menu<'reset'>
                items={[{ value: 'reset', label: 'Reset all to defaults', hint: 'use env / built-in defaults' }]}
                onSelect={() => {
                  for (const f of EXECUTION_FEATURES) clearLiveExecution(f.value);
                  onChange();
                  refresh();
                  setStatus('Execution modes reset to defaults.');
                }}
              />
            </Box>
          )}
          {status && (
            <Box marginTop={1}>
              <Text color="green">{status}</Text>
            </Box>
          )}
        </Box>
      </Screen>
    );
  }

  if (step === 'builderMenu') {
    return (
      <Screen
        hints={[
          { keys: '↑/↓', label: 'move' },
          { keys: 'enter', label: 'select' },
          { keys: 'esc', label: 'back' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings · Builder API credentials</Text>
          <Text dimColor>Credentials are stored encrypted on this device. Values are never shown again.</Text>
          <Box marginTop={1}>
            <Menu<'replace' | 'remove' | 'back'>
              items={[
                { value: 'replace', label: 'Replace credentials', hint: 'enter a new key/secret/passphrase' },
                { value: 'remove', label: 'Remove credentials', hint: 'fall back to .env' },
                { value: 'back', label: 'Back' },
              ]}
              onSelect={(v) => {
                if (v === 'replace') {
                  setStatus(null);
                  setStep(startBuilderFields());
                } else if (v === 'remove') {
                  clearBuilderCredentials();
                  resetTradeContext();
                  onChange();
                  setStatus('Builder API credentials removed.');
                  setStep('execution');
                } else {
                  setStep('execution');
                }
              }}
            />
          </Box>
          {status && (
            <Box marginTop={1}>
              <Text color="green">{status}</Text>
            </Box>
          )}
        </Box>
      </Screen>
    );
  }

  if (step === 'builder') {
    const labels: Record<BuilderField, string> = {
      key: 'API key:',
      secret: 'API secret:',
      pass: 'Passphrase:',
    };
    const stepNo = builderField === 'key' ? 1 : builderField === 'secret' ? 2 : 3;
    return (
      <Screen
        hints={[
          { keys: 'enter', label: builderField === 'pass' ? 'save' : 'next' },
          { keys: 'esc', label: 'cancel' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings · Builder API credentials</Text>
          <Text dimColor>
            Stored encrypted (AES-256-GCM) on this device, the same as your seed phrase — only readable while your
            wallet is unlocked, and erased on wallet reset.
          </Text>
          <Box marginTop={1}>
            <Text dimColor>Step {stepNo} of 3</Text>
          </Box>
          <Box>
            <Field
              key={builderField}
              label={labels[builderField]}
              mask
              onSubmit={(v) => {
                const value = v.trim();
                if (!value) {
                  setStatus('Value cannot be empty.');
                  return;
                }
                if (builderField === 'key') {
                  setBuilderKey(value);
                  setBuilderField('secret');
                } else if (builderField === 'secret') {
                  setBuilderSecret(value);
                  setBuilderField('pass');
                } else {
                  saveBuilderCredentials({ key: builderKey, secret: builderSecret, passphrase: value }, session);
                  resetTradeContext();
                  onChange();
                  setStatus('Builder API credentials saved (encrypted).');
                  setStep('execution');
                }
              }}
            />
          </Box>
        </Box>
      </Screen>
    );
  }

  if (step === 'confirmReset') {
    return (
      <Screen
        hints={[
          { keys: 'enter', label: 'confirm' },
          { keys: 'esc', label: 'cancel' },
        ]}
      >
        <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
          <Text color="red" bold>
            Erase this wallet?
          </Text>
          <Text dimColor>
            Deletes the encrypted wallet and all settings on this device. Funds are only recoverable with your seed
            phrase. Type RESET to confirm.
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
                  setStatus('Reset cancelled (you must type RESET).');
                  setStep('wallet');
                }
              }}
            />
          </Box>
        </Box>
      </Screen>
    );
  }

  return (
    <Screen
      hints={[
        { keys: '↑/↓', label: 'move' },
        { keys: 'enter', label: 'select' },
        { keys: 'esc', label: 'back' },
      ]}
    >
      <Box flexDirection="column">
        <Text bold>Settings · Wallet</Text>
        <Box marginTop={1}>
          <Menu<'logout' | 'restore' | 'reset' | 'back'>
            items={[
              { value: 'logout', label: 'Logout', hint: 'lock and return to unlock' },
              { value: 'restore', label: 'Restore from seed phrase', hint: 'replace this wallet' },
              { value: 'reset', label: 'Reset wallet', hint: 'erase everything on this device' },
              { value: 'back', label: 'Back' },
            ]}
            onSelect={(v) => {
              if (v === 'logout') onLogout();
              else if (v === 'restore') onRestore();
              else if (v === 'reset') setStep('confirmReset');
              else setStep('home');
            }}
          />
        </Box>
      </Box>
    </Screen>
  );
}
