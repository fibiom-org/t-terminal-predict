export type CommandName =
  | 'balance'
  | 'send'
  | 'receive'
  | 'bridge'
  | 'settings'
  | 'logout'
  | 'help'
  | 'exit'
  | 'clear';

export interface CommandSpec {
  readonly name: CommandName;
  readonly aliases: readonly string[];
  readonly summary: string;
}

export const COMMANDS: readonly CommandSpec[] = [
  { name: 'balance', aliases: ['b', 'bal'], summary: 'Show balances across all networks' },
  { name: 'send', aliases: ['s', 'transfer'], summary: 'Send a token (EVM / Solana)' },
  { name: 'receive', aliases: ['r', 'deposit'], summary: 'Show deposit addresses' },
  { name: 'bridge', aliases: ['br', 'swap'], summary: 'Bridge tokens across chains (Relay)' },
  { name: 'help', aliases: ['h', '?'], summary: 'Show available commands' },
  { name: 'clear', aliases: ['cls'], summary: 'Clear the output log' },
  { name: 'settings', aliases: ['cfg', 'config'], summary: 'Switch network / configure RPC node' },
  { name: 'logout', aliases: ['lock'], summary: 'Lock the wallet and return to unlock' },
  { name: 'exit', aliases: ['q', 'quit'], summary: 'Quit TTerminal' },
];

export function commandLabel(name: CommandName): string {
  return `/${name}`;
}

export function parseCommand(input: string): CommandName | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed.startsWith('/')) return null;
  const token = trimmed.slice(1).split(/\s+/)[0];
  if (!token) return null;
  for (const cmd of COMMANDS) {
    if (cmd.name === token || cmd.aliases.includes(token)) return cmd.name;
  }
  return null;
}

export function matchCommands(input: string): readonly CommandSpec[] {
  if (!input.startsWith('/')) return [];
  const query = input.slice(1).toLowerCase().split(/\s+/)[0] ?? '';
  return COMMANDS.filter((c) => c.name.startsWith(query) || c.aliases.some((a) => a.startsWith(query)));
}
