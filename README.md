# TTerminal

A terminal-first crypto trading terminal. Keyboard-first, lightweight, and built as a clean MVP.

```
▰▰ TTerminal
terminal-first trading · Ethereum
╭──────────────────────────────────────────────────────────────────────╮
│ Wallet: 0x1f..4d  (0x1f3c…4d)                                          │
│ Network: Ethereum                                                      │
│                                                                        │
│ Balance:                                                               │
│   USDT  1000.53                                                        │
│   WBTC  0.0123                                                         │
│                                                                        │
│ Pair: USDT / WBTC                                                      │
│                                                                        │
│ Commands:                                                              │
│   balance · pairs · trade · help · clear · exit                       │
│                                                                        │
│ ❯ trade                                                                │
╰──────────────────────────────────────────────────────────────────────╯
```

## Stack

- **TypeScript** (strict mode)
- **Ink** (React for the CLI) + **ink-text-input**
- **viem** — on-chain balance + pool reads
- **@tetherto/wdk-wallet-evm** (Tether's WDK) — BIP-39 / BIP-44 wallet management
- **@uniswap/sdk-core** + **@uniswap/v3-sdk** — quotes & live pool state
- **asciichart** + **ink-spinner** — price charts & loading spinners
- **Zod** + **dotenv** — config
- Node's built-in `crypto` (scrypt + AES-256-GCM) — encrypted secret storage

## Requirements

- Node.js >= 20 (developed on Node 23)

## Setup

```bash
npm install
cp .env.example .env   # optional — a public RPC is used by default
```

### Run (development)

```bash
npm run dev
```

### Build & run as the `tterminal` command

```bash
npm run build
npm link        # makes `tterminal` available globally
tterminal
```

(Or run the built app directly with `npm start`.)

## Usage

On first launch you'll see:

```
Welcome to TTerminal
  1. Create wallet
  2. Import wallet
  3. Exit
```

- **Create wallet** — generates a new 12-word wallet via WDK, shows the address and
  recovery phrase **once**, and stores the mnemonic encrypted with a password you choose.
- **Import wallet** — restore from an existing mnemonic phrase.

On subsequent launches you'll be asked for your password to unlock the wallet.

### Commands (main screen)

| Command    | Action                                                        |
| ---------- | ------------------------------------------------------------- |
| `balance`  | Refresh & show balances across **all networks** (via viem)    |
| `send`     | Send a token (or native coin) to an address                   |
| `pairs`    | Select a trading pair (grouped by network)                    |
| `pools`    | Live Uniswap v3 pool state for every pair                     |
| `trade`    | Open the trade screen (live Uniswap quote)                    |
| `chart`    | Price chart + live Uniswap v3 pool info                       |
| `settings` | Switch the active network / configure each network's RPC node |
| `help`     | List commands                                                 |
| `clear`    | Clear the output log                                          |
| `exit`     | Quit                                                          |

Navigation is keyboard-first: `↑/↓` (or `j/k`) to move, number keys to jump,
`Enter` to select, `Esc` to go back.

### Networks

TTerminal is multi-chain. The dashboard shows balances aggregated across every
supported network at once, while trading (quotes/pools/charts) runs on a pair's
own network.

| Network  | Chain id | Native | Stable | Other tokens    |
| -------- | -------- | ------ | ------ | --------------- |
| Ethereum | 1        | ETH    | USDT   | WBTC, WETH      |
| Arbitrum | 42161    | ETH    | USDT   | WBTC, WETH, ARB |
| Optimism | 10       | ETH    | USDT   | WBTC, WETH, OP  |
| Base     | 8453     | ETH    | USDC   | WETH, cbBTC     |

Use `/settings` to pick the **active network** (used as the default for `send`
and shown in the header) and to set a custom **RPC node** per network. RPC
overrides and the active network are persisted to `~/.tterminal/settings.json`;
each network falls back to a public RPC when no custom node is configured.

### Sending

`/send` walks you through choosing a network, the asset (the chain's native coin
or any of its tokens), a recipient address, and an amount. The recipient and
amount are validated before you confirm, and executing requires **re-entering
your password** (a sensitive action).

> **Execution is simulated in the MVP** — like trades, no on-chain transaction is
> sent and a placeholder tx hash is returned. The real path (WDK
> `account.transfer` / `sendTransaction`) is stubbed behind the `SendExecutor`
> interface in `src/wallet/transferService.ts`.

### Trading

The trade screen fetches a live price from the selected pair's network via the
Uniswap v3 QuoterV2 and quotes your order. Executing a trade requires
**re-entering your password** (a sensitive action).

> **Execution is mocked in the MVP.** No on-chain transaction is sent — the swap is
> simulated and a placeholder tx hash is returned.

### Charts & pool info (`chart`)

```
Market · USDT / WBTC                            updated 3:05:14 PM

WBTC $63,528  ▼ -0.67% (7d)

   67056.10 ┤            ╭╮
   66037.99 ┤           ╭╯ ╰╮│╰╮
   65528.93 ┤        ╭──╯   ╰╯ ╰───╮ ╭╮
   ...
╭────────────────────────────────────────────────────────────────╮
│ Uniswap v3 pool (0.30% fee)                                    │
│ Address:  0x9D..5B  0x9Db9e0e53058C89e5B94e29621a205198648425B  │
│ Price:    63517.632 USDT / WBTC                                │
│ Tick:     64542                                                │
│ Reserves: 12.10M USDT  ·  212.27 WBTC                          │
╰────────────────────────────────────────────────────────────────╯

1/7/3 1d·7d·30d   r refresh   esc back
```

- The **price chart** is the quote asset's USD history from CoinGecko, rendered with
  `asciichart`. Toggle the range with `1` / `7` / `3` (1d / 7d / 30d).
- The **pool panel** reads the pair's Uniswap v3 pool live: address (resolved via the
  V3 Factory), current price (from `slot0.sqrtPriceX96`, modelled with the v3-sdk
  `Pool`), tick, and token reserves held by the pool.
- The screen **auto-refreshes every 30s**; press `r` to refresh now, `esc` to go back.

## Security

Modeled on the practices of the Solana / Sui CLIs:

- Private keys and mnemonics are **never logged**. The recovery phrase is displayed
  exactly once, at creation.
- Secrets are stored **encrypted at rest** in `~/.tterminal/wallet.json`
  (scrypt-derived key + AES-256-GCM), with `0600` file / `0700` dir permissions.
- The wallet is **unlocked with a password**, and sensitive actions (trades and
  sends) require password re-confirmation.

## Architecture

Business logic is fully separated from the UI.

```
src/
  cli/               # Ink app + screens (UI only)
    App.tsx          #   router between setup screens and the main terminal
    screens/         #   Welcome, Create, Import, Unlock, Main, Pairs, Trade,
                      #   Market, Send, Settings
  components/         # Reusable Ink components (Frame, Menu, Field, Logo, Chart,
                      #   Loading spinner, StatusBar)
  wallet/             # WDK wallet service, per-chain viem clients, balance reads,
                      #   SendExecutor abstraction (transferService)
  uniswap/            # Quote service, pool service (v3-sdk), SwapExecutor abstraction
  market/             # Off-chain price history feed (CoinGecko) for charts
  commands/           # Command parsing/registry
  storage/            # Encrypted wallet store + settings store (active chain, RPCs)
  utils/              # crypto + formatting helpers
  types/              # Shared domain types (no UI imports)
  config/             # zod-validated env, chains (tokens + Uniswap addrs), pairs
  main.tsx            # entry point
```

### Going live with real swaps & sends

The UI talks only to the `SwapExecutor` interface (`src/uniswap/router.ts`) and the
`SendExecutor` interface (`src/wallet/transferService.ts`). To enable real swaps,
implement `UniswapSwapExecutor` (approve → `exactInputSingle` via SwapRouter02 for
the pair's chain, signed with the WDK account) and return it from `getSwapExecutor()`.
For real sends, implement `WdkSendExecutor` (WDK `account.transfer` for ERC-20s /
`sendTransaction` for native) and return it from `getSendExecutor()`. No UI changes
are required in either case.

## Configuration

Networks (RPC node + active network) are configured at runtime via `/settings`
and persisted to `~/.tterminal/settings.json`. The env vars below only seed the
_initial_ RPC for one chain on first run:

| Env var    | Default                    | Description                                                                 |
| ---------- | -------------------------- | --------------------------------------------------------------------------- |
| `RPC_URL`  | _(public RPC per network)_ | Seeds the initial RPC for the `CHAIN_ID` chain                              |
| `CHAIN_ID` | `1`                        | Chain `RPC_URL` applies to + default active network (1 / 42161 / 10 / 8453) |
