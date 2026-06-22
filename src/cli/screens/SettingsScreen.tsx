import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Menu } from '@/components/Menu.js';
import { Field } from '@/components/Field.js';
import { Screen } from '@/components/Screen.js';
import { CHAINS } from '@/config/chains.js';
import { getActiveChainId, getRpcUrl, hasRpcOverride, setActiveChainId, setRpcUrl } from '@/storage/settingsStore.js';
import { resetClients } from '@/wallet/client.js';

type Step = 'list' | 'detail' | 'editRpc';

interface Props {
  onBack: () => void;
  onChange: () => void;
}

export function SettingsScreen({ onBack, onChange }: Props): React.ReactElement {
  const [step, setStep] = useState<Step>('list');
  const [chainId, setChainId] = useState<number>(getActiveChainId());

  const [, setTick] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const refresh = (): void => setTick((t) => t + 1);

  useInput(
    (_input, key) => {
      if (key.escape) {
        if (step === 'list') onBack();
        else if (step === 'detail') setStep('list');
        else if (step === 'editRpc') setStep('detail');
      }
    },
    { isActive: step !== 'editRpc' },
  );

  const activeId = getActiveChainId();

  if (step === 'list') {
    return (
      <Screen
        hints={[
          { keys: '↑/↓', label: 'move' },
          { keys: 'enter', label: 'configure' },
          { keys: 'esc', label: 'back' },
        ]}
      >
        <Box flexDirection="column">
          <Text bold>Settings · Networks</Text>
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
          {status && (
            <Box marginTop={1}>
              <Text color="green">{status}</Text>
            </Box>
          )}
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
                  setStep('list');
                } else if (v === 'edit') {
                  setStep('editRpc');
                } else if (v === 'reset') {
                  setRpcUrl(chainId, '');
                  resetClients(chainId);
                  onChange();
                  refresh();
                  setStatus(`${chain.name} RPC reset to default.`);
                } else {
                  setStep('list');
                }
              }}
            />
          </Box>
        </Box>
      </Screen>
    );
  }

  // editRpc
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
