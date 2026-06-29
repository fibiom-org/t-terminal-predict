import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Screen } from '@/components/Screen.js';
import { Panel } from '@/components/Panel.js';
import { Loading } from '@/components/Loading.js';
import { getSparkManager } from '@/wallet/managers.js';
import { trimDecimals } from '@/utils/format.js';
import { formatUnits } from 'viem';
import type { WalletSession } from '@/types/index.js';

interface Props {
  session: WalletSession;
  onBack: () => void;
}

interface Row {
  id: string;
  amount: string;
  status: string;
  when: string;
}

export function HistoryScreen({ session, onBack }: Props): React.ReactElement {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const account = await getSparkManager(session.mnemonic).getAccount(0);
        const transfers = await account.getTransfers({ limit: 10 });
        const mapped: Row[] = transfers.map((t) => {
          const totalValue = (t as { totalValue?: number }).totalValue ?? 0;
          const createdTime = (t as { createdTime?: Date }).createdTime;
          return {
            id: String((t as { id?: string }).id ?? '').slice(0, 10),
            amount: `${trimDecimals(formatUnits(BigInt(Math.trunc(totalValue)), 8), 2)} BTC`,
            status: String((t as { status?: unknown }).status ?? ''),
            when: createdTime ? new Date(createdTime).toISOString().slice(0, 10) : '',
          };
        });
        if (!cancelled) setRows(mapped);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <Screen hints={[{ keys: 'esc', label: 'back' }]}>
      <Box flexDirection="column">
        <Text bold>History · Spark</Text>
        <Text dimColor>Most recent Spark transfers. EVM &amp; Solana history: use a block explorer.</Text>
        <Box marginTop={1}>
          <Panel title="Recent transfers" flexGrow={1}>
            {error ? (
              <Text color="red">{error}</Text>
            ) : rows === null ? (
              <Loading label="Loading transfers…" />
            ) : rows.length === 0 ? (
              <Text dimColor>No transfers yet.</Text>
            ) : (
              rows.map((r) => (
                <Text key={r.id}>
                  <Text dimColor>{r.when.padEnd(11)}</Text>
                  {r.amount.padEnd(14)}
                  <Text color="cyan">{r.status.padEnd(12)}</Text>
                  <Text dimColor>{r.id}</Text>
                </Text>
              ))
            )}
          </Panel>
        </Box>
      </Box>
    </Screen>
  );
}
