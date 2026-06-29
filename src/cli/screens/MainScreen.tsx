import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text, useApp } from 'ink';
import { PairsScreen } from '@/cli/screens/PairsScreen.js';
import { PoolsScreen } from '@/cli/screens/PoolsScreen.js';
import { PoolDetailScreen } from '@/cli/screens/PoolDetailScreen.js';
import { TradeScreen } from '@/cli/screens/TradeScreen.js';
import { MarketScreen } from '@/cli/screens/MarketScreen.js';
import { SendScreen } from '@/cli/screens/SendScreen.js';
import { SettingsScreen } from '@/cli/screens/SettingsScreen.js';
import { ReceiveScreen } from '@/cli/screens/ReceiveScreen.js';
import { HistoryScreen } from '@/cli/screens/HistoryScreen.js';
import { Screen } from '@/components/Screen.js';
import { Panel } from '@/components/Panel.js';
import { Loading } from '@/components/Loading.js';
import { CommandInput } from '@/components/CommandInput.js';
import { getPortfolio } from '@/wallet/portfolio.js';
import { parseCommand, commandLabel, COMMANDS } from '@/commands/registry.js';
import { DEFAULT_PAIR } from '@/config/index.js';
import { getChain } from '@/config/chains.js';
import { shortAddress } from '@/utils/format.js';
import type { ChainBalances, TradingPair, WalletSession } from '@/types/index.js';

interface Props {
  session: WalletSession;

  activeChainId: number;

  onSettingsChanged: () => void;
  onLogout: () => void;
  onReset: () => void;
  onRestore: () => void;
}

type View = 'home' | 'pairs' | 'pools' | 'poolDetail' | 'trade' | 'market' | 'send' | 'settings' | 'receive' | 'history';

export function MainScreen({ session, activeChainId, onSettingsChanged, onLogout, onReset, onRestore }: Props): React.ReactElement {
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
      const result = await getPortfolio(session);
      setBalances(result);
    } finally {
      setLoadingBalances(false);
    }
  }, [session]);

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
      case 'receive':
        setView('receive');
        break;
      case 'history':
        setView('history');
        break;
      case 'logout':
        pushLog('Locking wallet…');
        onLogout();
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

  if (view === 'receive') {
    return <ReceiveScreen session={session} onBack={() => setView('home')} />;
  }

  if (view === 'history') {
    return <HistoryScreen session={session} onBack={() => setView('home')} />;
  }

  if (view === 'settings') {
    return (
      <SettingsScreen
        onBack={() => setView('home')}
        onChange={() => {
          onSettingsChanged();
          void refreshBalances();
        }}
        onLogout={onLogout}
        onReset={onReset}
        onRestore={onRestore}
      />
    );
  }

  // Flatten the portfolio into a clean holdings list: only assets with a non-zero
  // balance, each tagged with its network. Empty chains/tokens are hidden.
  const heldAssets = (balances ?? [])
    .filter((cb) => !cb.error)
    .flatMap((cb) => {
      const rows = cb.native && cb.native.raw > 0n ? [{ ...cb.native, network: cb.chainName }] : [];
      return [...rows, ...cb.tokens.filter((t) => t.raw > 0n).map((t) => ({ ...t, network: cb.chainName }))];
    })
    .map((b) => ({ symbol: b.token.symbol, formatted: b.formatted, network: b.network }));
  const unavailableCount = (balances ?? []).filter((cb) => cb.error).length;

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
            <Text>
              EVM <Text color="white">{shortAddress(session.addresses.evm)}</Text>
            </Text>
            <Text>
              SOL <Text color="white">{shortAddress(session.addresses.solana)}</Text>
            </Text>
            <Text>
              BTC <Text color="white">{shortAddress(session.addresses.spark)}</Text>
            </Text>
            <Text>
              Active network <Text color="cyan">{getChain(activeChainId).name}</Text>
            </Text>
            <Text>
              Pair <Text color="cyan">{pair.label}</Text> <Text dimColor>{getChain(pair.chainId).name}</Text>
            </Text>
          </Panel>
          <Panel title="Assets" width={40}>
            {loadingBalances && !balances ? (
              <Loading label="loading…" />
            ) : heldAssets.length === 0 ? (
              <Text dimColor>No assets yet. Use /receive to fund your wallet.</Text>
            ) : (
              <>
                {heldAssets.map((a) => (
                  <Text key={`${a.network}-${a.symbol}`}>
                    {a.symbol.padEnd(6)} <Text color="white">{a.formatted.padEnd(14)}</Text>
                    <Text dimColor>{a.network}</Text>
                  </Text>
                ))}
                {unavailableCount > 0 && (
                  <Text dimColor>
                    {unavailableCount} network{unavailableCount > 1 ? 's' : ''} unavailable
                  </Text>
                )}
              </>
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
