# TTerminal

A terminal-first crypto trading terminal. Keyboard-first, lightweight, and built as a clean MVP.
One BIP-39 seed drives **EVM, Solana, and Spark (Bitcoin / Lightning)** identities at once.

```
▰▰ TTerminal                                          Ethereum · 0xf3..66
──────────────────────────────────────────────────────────────────────────
╭ Account ───────────────────────────╮ ╭ Assets ──────────────────────────╮
│ EVM  0xf39F..2266                   │ │ ETH    1.2041        Ethereum     │
│ SOL  oeYf6K..kq96                   │ │ USDT   1000.53       Ethereum     │
│ BTC  spark1pg..e9n                  │ │ SOL    4.5000        Solana       │
│ Active network  Ethereum            │ │ BTC    0.0123        Spark (BTC)  │
│ Pair  USDT / WBTC  Ethereum         │ │                                   │
╰─────────────────────────────────────╯ ╰───────────────────────────────────╯

  Type / to see commands, or /help.

  ❯ receive
──────────────────────────────────────────────────────────────────────────
/ commands   ↑/↓ pick   tab complete   enter run                ctrl+c quit
```

## Stack

- **TypeScript** (strict mode)
- **Ink** (React for the CLI) + **ink-text-input**
- **viem** — EVM on-chain balance + pool reads
- Tether's **WDK** — one mnemonic, three chain families:
  - **@tetherto/wdk-wallet-evm** — EVM (Ethereum, Arbitrum, Optimism, Base)
  - **@tetherto/wdk-wallet-solana** — Solana (SOL + SPL tokens)
  - **@tetherto/wdk-wallet-spark** — Spark (Bitcoin / Lightning)
- **@uniswap/sdk-core** + **@uniswap/v3-sdk** — quotes & live pool state (EVM)
- **asciichart** + **ink-spinner** — price charts & loading spinners
- **bip39** + **Zod** + **dotenv** — mnemonics & config
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

- **Create wallet** — generates a new 12-word seed, derives your **EVM, Solana, and
  Spark** addresses from it, shows them and the recovery phrase **once**, and stores
  the mnemonic encrypted with a password you choose.
- **Import wallet** — restore from an existing mnemonic phrase.

On subsequent launches you'll be asked for your password to unlock the wallet. From the
unlock screen, press **Tab** for "forgot password" options — **restore from seed** or
**reset wallet**.

> One seed, three identities: the same mnemonic deterministically derives an EVM
> (`0x…`), a Solana (base58), and a Spark (`spark1…`) address, each on its own
> BIP-44 / SLIP-0010 coin type.

### Commands (main screen)

| Command    | Action                                                          |
| ---------- | --------------------------------------------------------------- |
| `balance`  | Refresh & show your held assets across **all chains**           |
| `send`     | Send a token / native coin on EVM, Solana, or Spark             |
| `receive`  | Show deposit addresses + Spark on-chain / Lightning invoices    |
| `history`  | Recent transactions (Spark)                                     |
| `pairs`    | Select a trading pair (grouped by network)                      |
| `pools`    | Live Uniswap v3 pool state for every pair                       |
| `trade`    | Open the trade screen (live Uniswap quote)                      |
| `chart`    | Price chart + live Uniswap v3 pool info                         |
| `settings` | Networks / RPC nodes / Spark network / wallet (logout · reset)  |
| `logout`   | Lock the wallet and return to the unlock screen                 |
| `help`     | List commands                                                   |
| `clear`    | Clear the output log                                            |
| `exit`     | Quit                                                            |

Navigation is keyboard-first: `↑/↓` (or `j/k`) to move, number keys to jump,
`Enter` to select, `Esc` to go back.

### Networks

TTerminal is multi-chain across three families. The dashboard **Assets** panel shows
only the assets you actually hold (zero balances are hidden), each tagged with its
network. Trading (quotes/pools/charts) is **EVM-only** and runs on a pair's own network.

**EVM** (via viem + Uniswap):

| Network  | Chain id | Native | Stable | Other tokens    |
| -------- | -------- | ------ | ------ | --------------- |
| Ethereum | 1        | ETH    | USDT   | WBTC, WETH      |
| Arbitrum | 42161    | ETH    | USDT   | WBTC, WETH, ARB |
| Optimism | 10       | ETH    | USDT   | WBTC, WETH, OP  |
| Base     | 8453     | ETH    | USDC   | WETH, cbBTC     |

**Non-EVM** (via WDK):

| Network      | Native | Tokens     | Receive                                   |
| ------------ | ------ | ---------- | ----------------------------------------- |
| Solana       | SOL    | USDT, USDC | base58 address                            |
| Spark (BTC)  | BTC    | —          | Spark address · on-chain deposit · LN inv |

Use `/settings` to pick the **active EVM network** (the default for EVM `send` and
shown in the header), set a custom **RPC node** per EVM network, configure the
**Solana RPC** URL, and choose the **Spark network** (MAINNET / TESTNET / SIGNET /
REGTEST / LOCAL). All of this is persisted to `~/.tterminal/settings.json`; each
network falls back to a public endpoint when nothing custom is configured.

### Sending

`/send` walks you through choosing a **chain family** (EVM / Solana / Spark), then —
for EVM — a network, then the asset (native coin or token), a recipient, and an
amount. The recipient is validated **per family** (EVM `0x…`, Solana base58, Spark
address or `ln…` Lightning invoice), and executing requires **re-entering your
password** (a sensitive action).

> **Sends are simulated by default** — no on-chain transaction is sent and a
> placeholder tx hash is returned. Real broadcasts are gated behind an explicit
> opt-in to prevent accidental mainnet sends: set **`TT_LIVE_SENDS=1`** to switch
> `getSendExecutor()` to the real `WdkSendExecutor`, which calls WDK
> `account.transfer()` on the chosen chain. The toggle lives in
> `src/wallet/transferService.ts`.

### Receiving

`/receive` shows your deposit address for each chain family (EVM `0x…`, Solana
base58, Spark `spark1…`). For Spark it can also fetch an **on-chain BTC deposit
address** (`getStaticDepositAddress`) and **create a Lightning invoice**
(`createLightningInvoice`) for a given amount in sats.

### History

`/history` lists your most recent **Spark** transfers (`getTransfers`). EVM and
Solana history are not pulled in-app — use a block explorer for those.

### Account lifecycle

- **Logout** (`/logout`, alias `/lock`, or Settings → Wallet) — locks the wallet,
  disposes the in-memory WDK managers, and returns to the unlock screen. Your
  encrypted wallet file is kept; just re-enter your password to unlock.
- **Restore from seed** — reachable from the unlock screen (Tab → options) or
  Settings → Wallet. Replaces the current wallet with one imported from a mnemonic.
- **Reset wallet** — a full factory reset that **wipes the entire `~/.tterminal`
  directory** (wallet + settings). Requires typing `RESET` to confirm. Funds are
  only recoverable afterwards via your seed phrase.

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
- Only the **mnemonic** is stored, **encrypted at rest** in `~/.tterminal/wallet.json`
  (scrypt-derived key + AES-256-GCM), with `0600` file / `0700` dir permissions. The
  EVM / Solana / Spark addresses are re-derived from it on every unlock (the file
  format is versioned; legacy single-address wallets migrate transparently).
- The wallet is **unlocked with a password**, and sensitive actions (trades and
  sends) require password re-confirmation.
- On **logout / reset** the in-memory WDK managers (which hold the decrypted seed)
  are disposed, so the secret doesn't linger after you lock.

## Architecture

Business logic is fully separated from the UI.

```
src/
  cli/               # Ink app + screens (UI only)
    App.tsx          #   router between setup screens and the main terminal
    screens/         #   Welcome, Create, Import, Unlock, Main, Pairs, Trade,
                      #   Market, Send, Receive, History, Settings
  components/         # Reusable Ink components (Frame, Menu, Field, Logo, Chart,
                      #   Loading spinner, StatusBar)
  wallet/             # walletService (derive/create/import/unlock), managers
                      #   (session-scoped WDK managers per chain family), viem
                      #   clients, balanceService (EVM) + portfolio (all chains),
                      #   SendExecutor abstraction (transferService)
  uniswap/            # Quote service, pool service (v3-sdk), SwapExecutor abstraction
  market/             # Off-chain price history feed (CoinGecko) for charts
  commands/           # Command parsing/registry
  storage/            # Encrypted wallet store (+ resetAll) + settings store
                      #   (active chain, EVM RPCs, Solana RPC, Spark network)
  utils/              # crypto + formatting helpers
  types/              # Shared domain types (no UI imports)
  config/             # zod-validated env, EVM chains, pairs, nonEvm (Solana/Spark)
  main.tsx            # entry point
```

### Multichain model

One mnemonic backs three chain families. `walletService.deriveAddresses()` derives
the EVM, Solana, and Spark addresses; `managers.ts` lazily builds and caches a WDK
manager per family + config (EVM per chain/RPC, Solana per RPC, Spark per network)
for the life of the session and disposes them on logout/reset. `portfolio.ts`
aggregates balances across viem (EVM) and the WDK accounts (Solana/Spark).

### Going live with real swaps & sends

The UI talks only to the `SwapExecutor` interface (`src/uniswap/router.ts`) and the
`SendExecutor` interface (`src/wallet/transferService.ts`). To enable real swaps,
implement `UniswapSwapExecutor` (approve → `exactInputSingle` via SwapRouter02 for
the pair's chain, signed with the WDK account) and return it from `getSwapExecutor()`.
Real **sends are already wired** through `WdkSendExecutor` (WDK `account.transfer()`
per chain family) — they're just gated: `getSendExecutor()` returns it only when
`TT_LIVE_SENDS=1`, otherwise a simulated executor is used. No UI changes are required.

## Configuration

Networks are configured at runtime via `/settings` (active EVM network, per-EVM-network
RPC, Solana RPC, Spark network) and persisted to `~/.tterminal/settings.json`. The env
vars below only seed the _initial_ EVM RPC on first run, plus the live-send toggle:

| Env var         | Default                    | Description                                                                 |
| --------------- | -------------------------- | --------------------------------------------------------------------------- |
| `RPC_URL`       | _(public RPC per network)_ | Seeds the initial RPC for the `CHAIN_ID` chain                              |
| `CHAIN_ID`      | `1`                        | Chain `RPC_URL` applies to + default active network (1 / 42161 / 10 / 8453) |
| `TT_LIVE_SENDS` | _(unset → simulated)_      | Set to `1` to broadcast **real** on-chain sends via WDK instead of simulating |
