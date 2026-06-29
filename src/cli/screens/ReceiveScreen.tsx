import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Screen } from '@/components/Screen.js';
import { Panel } from '@/components/Panel.js';
import { Menu } from '@/components/Menu.js';
import { Field } from '@/components/Field.js';
import { Loading } from '@/components/Loading.js';
import { getSparkManager } from '@/wallet/managers.js';
import type { WalletSession } from '@/types/index.js';

interface Props {
  session: WalletSession;
  onBack: () => void;
}

type Action = 'sparkDeposit' | 'sparkInvoice';

export function ReceiveScreen({ session, onBack }: Props): React.ReactElement {
  const [step, setStep] = useState<'list' | 'invoiceAmount'>('list');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput(
    (_input, key) => {
      if (key.escape) {
        if (step === 'list') onBack();
        else setStep('list');
      }
    },
    { isActive: !busy },
  );

  const runSparkDeposit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const account = await getSparkManager(session.mnemonic).getAccount(0);
      const addr = await account.getStaticDepositAddress();
      setResult(`Spark on-chain (BTC) deposit address:\n${addr}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const runSparkInvoice = async (amountSats: string): Promise<void> => {
    setStep('list');
    const sats = Number(amountSats.trim());
    if (!Number.isInteger(sats) || sats <= 0) {
      setError('Enter a positive whole number of sats.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const account = await getSparkManager(session.mnemonic).getAccount(0);
      const invoice = await account.createLightningInvoice({ amountSats: sats });
      const encoded =
        (invoice as { invoice?: { encodedInvoice?: string } }).invoice?.encodedInvoice ?? JSON.stringify(invoice);
      setResult(`Lightning invoice for ${sats} sats:\n${encoded}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'invoiceAmount') {
    return (
      <Screen hints={[{ keys: 'enter', label: 'create' }, { keys: 'esc', label: 'back' }]}>
        <Box flexDirection="column">
          <Text bold>Receive · Lightning invoice</Text>
          <Box marginTop={1}>
            <Field label="Amount (sats):" placeholder="1000" onSubmit={(v) => void runSparkInvoice(v)} />
          </Box>
        </Box>
      </Screen>
    );
  }

  return (
    <Screen hints={[{ keys: '↑/↓', label: 'move' }, { keys: 'enter', label: 'select' }, { keys: 'esc', label: 'back' }]}>
      <Box flexDirection="column">
        <Text bold>Receive</Text>
        <Text dimColor>Share these addresses to receive funds on each network.</Text>
        <Box marginTop={1} flexDirection="column">
          <Panel title="Deposit addresses" flexGrow={1}>
            <Text>
              EVM <Text color="green">{session.addresses.evm}</Text>
            </Text>
            <Text>
              Solana <Text color="green">{session.addresses.solana}</Text>
            </Text>
            <Text>
              Spark <Text color="green">{session.addresses.spark}</Text>
            </Text>
          </Panel>
        </Box>

        <Box marginTop={1}>
          <Menu<Action>
            items={[
              { value: 'sparkDeposit', label: 'Spark: on-chain BTC deposit address' },
              { value: 'sparkInvoice', label: 'Spark: create Lightning invoice' },
            ]}
            onSelect={(v) => {
              if (v === 'sparkDeposit') void runSparkDeposit();
              else setStep('invoiceAmount');
            }}
          />
        </Box>

        {busy && (
          <Box marginTop={1}>
            <Loading label="Talking to Spark…" />
          </Box>
        )}
        {result && (
          <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
            <Text color="green">{result}</Text>
          </Box>
        )}
        {error && (
          <Box marginTop={1}>
            <Text color="red">{error}</Text>
          </Box>
        )}
      </Box>
    </Screen>
  );
}
