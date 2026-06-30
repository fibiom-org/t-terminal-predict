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
  setActiveChainId,
  setRpcUrl,
  setSolanaRpcUrl,
} from '@/storage/settingsStore.js';
import { resetAll } from '@/storage/secureStore.js';
import { resetClients } from '@/wallet/client.js';
import { disposeManagers } from '@/wallet/managers.js';

type Step =
  | 'home'
  | 'networks'
  | 'detail'
  | 'editRpc'
  | 'solana'
  | 'wallet'
  | 'confirmReset';

interface Props {
  onBack: () => void;
  onChange: () => void;
  onLogout: () => void;
  onReset: () => void;
  onRestore: () => void;
}

export function SettingsScreen({ onBack, onChange, onLogout, onReset, onRestore }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('home');
  const [chainId, setChainId] = useState<number>(getActiveChainId());

  const [, setTick] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const refresh = (): void => setTick((t) => t + 1);

  useInput(
    (_input, key) => {
      if (!key.escape) return;
      if (step === 'home') onBack();
      else if (step === 'detail') setStep('networks');
      else if (step === 'editRpc') setStep('detail');
      else setStep('home');
    },
    { isActive: step !== 'editRpc' && step !== 'solana' },
  );

  const activeId = getActiveChainId();

  if (step === 'home') {
    return (
      <Screen hints={[{ keys: '↑/↓', label: 'move' }, { keys: 'enter', label: 'open' }, { keys: 'esc', label: 'back' }]}>
        <Box flexDirection="column">
          <Text bold>Settings</Text>
          <Box marginTop={1}>
            <Menu<'networks' | 'solana' | 'wallet'>
              items={[
                { value: 'networks', label: 'EVM networks', hint: 'active chain & RPC nodes' },
                { value: 'solana', label: 'Solana RPC', hint: getSolanaRpcUrl() },
                { value: 'wallet', label: 'Wallet', hint: 'logout · restore · reset' },
              ]}
              onSelect={(v) => {
                setStatus(null);
                setStep(v === 'networks' ? 'networks' : v);
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
      <Screen hints={[{ keys: '↑/↓', label: 'move' }, { keys: 'enter', label: 'configure' }, { keys: 'esc', label: 'back' }]}>
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
      <Screen hints={[{ keys: 'enter', label: 'select' }, { keys: 'esc', label: 'back' }]}>
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
      <Screen hints={[{ keys: 'enter', label: 'save' }, { keys: 'esc', label: 'cancel' }]}>
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
      <Screen hints={[{ keys: 'enter', label: 'save' }, { keys: 'esc', label: 'cancel' }]}>
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

  if (step === 'confirmReset') {
    return (
      <Screen hints={[{ keys: 'enter', label: 'confirm' }, { keys: 'esc', label: 'cancel' }]}>
        <Box flexDirection="column" borderStyle="round" borderColor="red" paddingX={1}>
          <Text color="red" bold>
            Erase this wallet?
          </Text>
          <Text dimColor>
            Deletes the encrypted wallet and all settings on this device. Funds are only recoverable
            with your seed phrase. Type RESET to confirm.
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
    <Screen hints={[{ keys: '↑/↓', label: 'move' }, { keys: 'enter', label: 'select' }, { keys: 'esc', label: 'back' }]}>
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
