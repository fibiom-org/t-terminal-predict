import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import { PairsScreen } from '@/cli/screens/PairsScreen.js';
import { PoolsScreen } from '@/cli/screens/PoolsScreen.js';
import { PoolDetailScreen } from '@/cli/screens/PoolDetailScreen.js';
import { TradeScreen } from '@/cli/screens/TradeScreen.js';
import { MarketScreen } from '@/cli/screens/MarketScreen.js';
import { SendScreen } from '@/cli/screens/SendScreen.js';
import { SettingsScreen } from '@/cli/screens/SettingsScreen.js';
import { Screen } from '@/components/Screen.js';
import { Panel } from '@/components/Panel.js';
import { Loading } from '@/components/Loading.js';
import { CommandInput } from '@/components/CommandInput.js';
import { getAllChainBalances } from '@/wallet/balanceService.js';
import { parseCommand, commandLabel, COMMANDS } from '@/commands/registry.js';
import { DEFAULT_PAIR } from '@/config/index.js';
import { getChain } from '@/config/chains.js';
import { shortAddress } from '@/utils/format.js';
import type { ChainBalances, TradingPair, WalletSession } from '@/types/index.js';

interface Props {
  session: WalletSession;

  activeChainId: number;

  onSettingsChanged: () => void;
}

type View = 'home' | 'pairs' | 'pools' | 'poolDetail' | 'trade' | 'market' | 'send' | 'settings';

export function MainScreen({ session, activeChainId, onSettingsChanged }: Props): React.ReactElement {
  const { exit } = useApp();
  const [view, setView] = useState<View>('home');
  const [pair, setPair] = useState<TradingPair>(DEFAULT_PAIR);
  const [poolPair, setPoolPair] = useState<TradingPair>(DEFAULT_PAIR);
  const [balances, setBalances] = useState<ChainBalances[] | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [log, setLog] = useState<string[]>(['Type / to see commands, or /help.']);

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-8), line]);
  }, []);

  const refreshBalances = useCallback(async (): Promise<void> => {
    setLoadingBalances(true);
    try {
      const result = await getAllChainBalances(session.address);
      setBalances(result);
    } finally {
      setLoadingBalances(false);
    }
  }, [session.address]);

  useEffect(() => {
    void refreshBalances();
  }, [refreshBalances]);

  const runCommand = (raw: string): void => {
    const cmd = parseCommand(raw);
    if (!cmd) {
      if (raw.trim()) pushLog(`Unknown command: "${raw.trim()}". Type /help.`);
      return;
    }
    switch (cmd) {
      case 'balance':
        pushLog('Refreshing balances…');
        void refreshBalances();
        break;
      case 'send':
        setView('send');
        break;
      case 'pairs':
        setView('pairs');
        break;
      case 'pools':
        setView('pools');
        break;
      case 'trade':
        setView('trade');
        break;
      case 'chart':
        setView('market');
        break;
      case 'settings':
        setView('settings');
        break;
      case 'help':
        pushLog('Commands:');
        for (const c of COMMANDS) pushLog(`  ${commandLabel(c.name).padEnd(10)} ${c.summary}`);
        break;
      case 'clear':
        setLog([]);
        break;
      case 'exit':
        exit();
        break;
    }
  };

  if (view === 'pairs') {
    return (
      <PairsScreen
        selectedId={pair.id}
        onSelect={(p) => {
          setPair(p);
          pushLog(`Selected pair: ${p.label} (${getChain(p.chainId).name})`);
          setView('home');
        }}
        onBack={() => setView('home')}
      />
    );
  }

  if (view === 'pools') {
    return (
      <PoolsScreen
        onSelect={(p) => {
          setPoolPair(p);
          setView('poolDetail');
        }}
        onBack={() => setView('home')}
      />
    );
  }

  if (view === 'poolDetail') {
    return <PoolDetailScreen pair={poolPair} onBack={() => setView('pools')} />;
  }

  if (view === 'trade') {
    return (
      <TradeScreen
        pair={pair}
        session={session}
        onBack={() => setView('home')}
        onTraded={() => void refreshBalances()}
      />
    );
  }

  if (view === 'market') {
    return <MarketScreen pair={pair} onBack={() => setView('home')} />;
  }

  if (view === 'send') {
    return (
      <SendScreen
        session={session}
        initialChainId={activeChainId}
        onBack={() => setView('home')}
        onSent={() => void refreshBalances()}
      />
    );
  }

  if (view === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setView('home')}
        onChange={() => {
          onSettingsChanged();
          void refreshBalances();
        }}
      />
    );
  }

  return (
    <Screen
      hints={[
        { keys: '/', label: 'commands' },
        { keys: '↑/↓', label: 'pick' },
        { keys: 'tab', label: 'complete' },
        { keys: 'enter', label: 'run' },
      ]}
    >
      <Box flexDirection="column" flexGrow={1}>
        <Box>
          <Panel title="Account" flexGrow={1}>
            <Text>{shortAddress(session.address)}</Text>
            <Text dimColor>{session.address}</Text>
            <Text>
              Active network <Text color="cyan">{getChain(activeChainId).name}</Text>
            </Text>
            <Text>
              Pair <Text color="cyan">{pair.label}</Text> <Text dimColor>{getChain(pair.chainId).name}</Text>
            </Text>
          </Panel>
          <Panel title="Balances (all networks)" width={40}>
            {loadingBalances && !balances ? (
              <Loading label="loading…" />
            ) : (
              balances?.map((cb) => (
                <Box key={cb.chainId} flexDirection="column">
                  <Text color="cyan">{cb.chainName}</Text>
                  {cb.error ? (
                    <Text color="red"> unavailable</Text>
                  ) : (
                    <>
                      {cb.native && (
                        <Text>
                          {'  '}
                          {cb.native.token.symbol.padEnd(6)} <Text color="white">{cb.native.formatted}</Text>
                        </Text>
                      )}
                      {cb.tokens.map((b) => (
                        <Text key={b.token.symbol}>
                          {'  '}
                          {b.token.symbol.padEnd(6)} <Text color="white">{b.formatted}</Text>
                        </Text>
                      ))}
                    </>
                  )}
                </Box>
              ))
            )}
          </Panel>
        </Box>

        <Box flexGrow={1} flexDirection="column" justifyContent="flex-end" marginTop={1}>
          {log.map((line, i) => (
            <Text key={i} dimColor>
              {line}
            </Text>
          ))}
        </Box>

        <Box marginTop={1} width="100%">
          <CommandInput onSubmit={runCommand} />
        </Box>
      </Box>
    </Screen>
  );
}
