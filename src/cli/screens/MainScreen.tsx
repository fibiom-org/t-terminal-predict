import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, useApp } from "ink";
import { SendScreen } from "@/cli/screens/SendScreen.js";
import { BridgeScreen } from "@/cli/screens/BridgeScreen.js";
import { SettingsScreen } from "@/cli/screens/SettingsScreen.js";
import { ReceiveScreen } from "@/cli/screens/ReceiveScreen.js";
import { Screen } from "@/components/Screen.js";
import { Panel } from "@/components/Panel.js";
import { Loading } from "@/components/Loading.js";
import { CommandInput } from "@/components/CommandInput.js";
import { getPortfolio } from "@/wallet/portfolio.js";
import { parseCommand, commandLabel, COMMANDS } from "@/commands/registry.js";
import { getChain } from "@/config/chains.js";
import { shortAddress } from "@/utils/format.js";
import type { ChainBalances, WalletSession } from "@/types/index.js";

interface Props {
  session: WalletSession;

  activeChainId: number;

  onSettingsChanged: () => void;
  onLogout: () => void;
  onReset: () => void;
  onRestore: () => void;
}

type View = "home" | "send" | "bridge" | "settings" | "receive";

export function MainScreen({
  session,
  activeChainId,
  onSettingsChanged,
  onLogout,
  onReset,
  onRestore,
}: Props): React.ReactElement {
  const { exit } = useApp();
  const [view, setView] = useState<View>("home");
  const [balances, setBalances] = useState<ChainBalances[] | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [log, setLog] = useState<string[]>(["Type / to see commands, or /help."]);

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
      case "balance":
        pushLog("Refreshing balances…");
        void refreshBalances();
        break;
      case "send":
        setView("send");
        break;
      case "receive":
        setView("receive");
        break;
      case "bridge":
        setView("bridge");
        break;
      case "logout":
        pushLog("Locking wallet…");
        onLogout();
        break;
      case "settings":
        setView("settings");
        break;
      case "help":
        pushLog("Commands:");
        for (const c of COMMANDS) pushLog(`  ${commandLabel(c.name).padEnd(10)} ${c.summary}`);
        break;
      case "clear":
        setLog([]);
        break;
      case "exit":
        exit();
        break;
    }
  };

  if (view === "send") {
    return (
      <SendScreen
        session={session}
        initialChainId={activeChainId}
        onBack={() => setView("home")}
        onSent={() => void refreshBalances()}
      />
    );
  }

  if (view === "bridge") {
    return <BridgeScreen session={session} onBack={() => setView("home")} onBridged={() => void refreshBalances()} />;
  }

  if (view === "receive") {
    return <ReceiveScreen session={session} onBack={() => setView("home")} />;
  }

  if (view === "settings") {
    return (
      <SettingsScreen
        onBack={() => setView("home")}
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
        { keys: "/", label: "commands" },
        { keys: "↑/↓", label: "pick" },
        { keys: "tab", label: "complete" },
        { keys: "enter", label: "run" },
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
              Active network <Text color="cyan">{getChain(activeChainId).name}</Text>
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
                    {unavailableCount} network{unavailableCount > 1 ? "s" : ""} unavailable
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
