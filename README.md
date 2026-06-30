# TTerminal Predict

A terminal-first, **self-custodial football prediction wallet**. Keyboard-first, lightweight,
and built on Tether's **Wallet Development Kit (WDK)** — you hold your own keys. One BIP-39 seed
drives **EVM and Solana** identities at once.

The hook: **hold USDT on any chain → one step bridges + swaps it to USDC on Polygon → bet on
World Cup match outcomes via Polymarket.** The chain plumbing stays hidden; you stay in the
terminal and stay in custody.

```
▰▰ TTerminal Predict                                  Ethereum · 0xf3..66
──────────────────────────────────────────────────────────────────────────
╭ Account ───────────────────────────╮ ╭ Assets ──────────────────────────╮
│ EVM  0xf39F..2266                   │ │ ETH    1.2041        Ethereum     │
│ SOL  oeYf6K..kq96                   │ │ USDT   1000.53       Ethereum     │
│ Active network  Ethereum            │ │ SOL    4.5000        Solana       │
╰─────────────────────────────────────╯ ╰───────────────────────────────────╯

  Type / to see commands, or /help.

  ❯ bridge
──────────────────────────────────────────────────────────────────────────
/ commands   ↑/↓ pick   tab complete   enter run                ctrl+c quit
```

## The idea

The theme is **football + the global tournament moment** (FIFA World Cup 2026). The stack is the
point: a WDK self-custodial wallet is the core, with two integrations layered on top.

- **Relay bridge** (`@relayprotocol/relay-sdk`) — move collateral **into Polygon** from Solana,
  Ethereum, and Base (and back). Because Relay routes are **cross-asset**, the user funds with
  **USDT** and receives **USDC** on Polygon in a single step — no manual swap.
- **Polymarket** (`@polymarket/client@beta`) — browse and trade football prediction markets;
  settlement is in USDC on Polygon.

**Hero flow:** _"I have USDT on Solana. I want to bet on Brazil vs. Argentina."_ →
`bridge` (USDT → USDC on Polygon) → `predict` (place the order) → `positions` (track it).

## Status

| Area                                                               | State          |
| ------------------------------------------------------------------ | -------------- |
| WDK wallet (create / import / unlock, encrypted store)             | ✅ Built       |
| EVM (Ethereum, Arbitrum, Optimism, Base) + Solana                  | ✅ Built       |
| `balance`, `send`, `receive`, `settings`, `logout`, `help`, `exit` | ✅ Built       |
| **Relay bridge** — USDT (any chain) → USDC on Polygon              | 🚧 In progress |
| **Polymarket** prediction markets (`predict` / `positions`)        | 🚧 In progress |

## Stack

- **TypeScript** (strict mode)
- **Ink** (React for the CLI) + **ink-text-input** + **ink-spinner**
- **viem** — EVM on-chain balance reads
- Tether's **WDK** — one mnemonic, two chain families:
  - **@tetherto/wdk-wallet-evm** — EVM (Ethereum, Arbitrum, Optimism, Base, Polygon)
  - **@tetherto/wdk-wallet-solana** — Solana (SOL + SPL tokens)
- **@relayprotocol/relay-sdk** — cross-chain, cross-asset bridging (🚧)
- **@polymarket/client** — prediction market discovery, orders, positions (🚧)
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

- **Create wallet** — generates a new 12-word seed, derives your **EVM and Solana** addresses
  from it, shows them and the recovery phrase **once**, and stores the mnemonic encrypted with a
  password you choose.
- **Import wallet** — restore from an existing mnemonic phrase.

On subsequent launches you'll be asked for your password to unlock the wallet. From the unlock
screen, press **Tab** for "forgot password" options — **restore from seed** or **reset wallet**.

> One seed, two identities: the same mnemonic deterministically derives an EVM (`0x…`) and a
> Solana (base58) address, each on its own BIP-44 / SLIP-0010 coin type.

### Commands (main screen)

| Command     | Action                                                               |
| ----------- | -------------------------------------------------------------------- |
| `balance`   | Refresh & show your held assets across **all chains**                |
| `send`      | Send a token / native coin on EVM or Solana                          |
| `receive`   | Show deposit addresses (EVM `0x…`, Solana base58)                    |
| `settings`  | Networks / RPC nodes / wallet (logout · restore · reset)             |
| `logout`    | Lock the wallet and return to the unlock screen                      |
| `help`      | List commands                                                        |
| `clear`     | Clear the output log                                                 |
| `exit`      | Quit                                                                 |
| `bridge`    | 🚧 Bridge **USDT → USDC on Polygon** (from Solana / Ethereum / Base) |
| `predict`   | 🚧 Browse World Cup markets & place a bet                            |
| `positions` | 🚧 Open positions, P&L, redeem winnings                              |

Navigation is keyboard-first: `↑/↓` (or `j/k`) to move, number keys to jump, `Enter` to select,
`Esc` to go back.

### Networks

| Network  | Chain id | Native | Stables    | Role                                  |
| -------- | -------- | ------ | ---------- | ------------------------------------- |
| Ethereum | 1        | ETH    | USDT       | Source for bridging                   |
| Arbitrum | 42161    | ETH    | USDT       | Source for bridging                   |
| Optimism | 10       | ETH    | USDT       | Source for bridging                   |
| Base     | 8453     | ETH    | USDC       | Source for bridging                   |
| Solana   | —        | SOL    | USDT, USDC | Source for bridging (base58 address)  |
| Polygon  | 137      | POL    | USDC       | 🚧 Collateral + Polymarket settlement |

The dashboard **Assets** panel shows only the assets you actually hold (zero balances are
hidden), each tagged with its network. Use `/settings` to pick the **active EVM network**, set a
custom **RPC node** per EVM network, and configure the **Solana RPC** URL. All of this is
persisted to `~/.tterminal/settings.json`; each network falls back to a public endpoint when
nothing custom is configured.

### Sending

`/send` walks you through choosing a **chain family** (EVM / Solana), then — for EVM — a network,
then the asset (native coin or token), a recipient, and an amount. The recipient is validated
**per family** (EVM `0x…`, Solana base58), and executing requires **re-entering your password**
(a sensitive action).

> **Sends are simulated by default** — no on-chain transaction is sent and a placeholder tx hash
> is returned. Real broadcasts are gated behind an explicit opt-in: set **`TT_LIVE_SENDS=1`** to
> switch `getSendExecutor()` to the real `WdkSendExecutor`, which calls WDK `account.transfer()`
> on the chosen chain. The toggle lives in `src/wallet/transferService.ts`.

### Receiving

`/receive` shows your deposit address for each chain family (EVM `0x…`, Solana base58).

### Bridge 🚧

`/bridge` funds your Polymarket collateral on **Polygon** from whatever chain you already hold
value on, using the **Relay SDK** (`@relayprotocol/relay-sdk`).

- **Source** → **destination:** USDT on **Solana / Ethereum / Base** (and other EVM chains)
  → **USDC on Polygon** (chainId 137). Relay routes are **cross-asset**, so the swap from USDT
  to USDC happens **inside the bridge** — one quote, one confirmation, no separate DEX step.
- **Flow:** pick a source chain → enter amount → get a live quote (fee · ETA · expected USDC out)
  → confirm with your password → watch status until the USDC lands on Polygon.
- **Signing:** the source-chain transaction is signed with the matching **WDK** manager — the
  **EVM** manager for EVM sources, the **Solana** manager for Solana — so funds never leave your
  custody.
- **Reverse / cash out:** the same route runs backwards — **USDC on Polygon → USDT** back on your
  source chain — to withdraw winnings.
- **Bridge-to-bet:** when `/predict` detects you don't have enough Polygon USDC for an order, it
  offers to bridge first and returns you to the bet.

> Like sends, the bridge is wrapped behind a service interface (`src/bridge/`) with a simulated
> executor for offline demos and a live Relay executor gated by an explicit opt-in.

### Predict 🚧

`/predict` lists curated **World Cup / football** markets from **Polymarket**, shows the outcomes
and implied odds, and lets you place an order. Orders are built and **signed with your WDK EVM
key** (EIP-712) and settled in **USDC on Polygon**. `/positions` tracks open positions, P&L, and
redeeming winnings once a market resolves.

### Account lifecycle

- **Logout** (`/logout`, alias `/lock`, or Settings → Wallet) — locks the wallet, disposes the
  in-memory WDK managers, and returns to the unlock screen. Your encrypted wallet file is kept;
  just re-enter your password to unlock.
- **Restore from seed** — reachable from the unlock screen (Tab → options) or Settings → Wallet.
  Replaces the current wallet with one imported from a mnemonic.
- **Reset wallet** — a full factory reset that **wipes the entire `~/.tterminal` directory**
  (wallet + settings). Requires typing `RESET` to confirm. Funds are only recoverable afterwards
  via your seed phrase.

## Security

Modeled on the practices of the Solana / Sui CLIs:

- Private keys and mnemonics are **never logged**. The recovery phrase is displayed exactly once,
  at creation.
- Only the **mnemonic** is stored, **encrypted at rest** in `~/.tterminal/wallet.json`
  (scrypt-derived key + AES-256-GCM), with `0600` file / `0700` dir permissions. The EVM / Solana
  addresses are re-derived from it on every unlock (the file format is versioned; legacy
  single-address wallets migrate transparently).
- The wallet is **unlocked with a password**, and sensitive actions (sends, bridges, bets) require
  password re-confirmation.
- On **logout / reset** the in-memory WDK managers (which hold the decrypted seed) are disposed,
  so the secret doesn't linger after you lock.

## Architecture

Business logic is fully separated from the UI.

```
src/
  cli/               # Ink app + screens (UI only)
    App.tsx          #   router between setup screens and the main terminal
    screens/         #   Welcome, Create, Import, Unlock, Main, Send, Receive, Settings
                      #   (🚧 Bridge, Markets, MarketDetail, Positions)
  components/         # Reusable Ink components (Frame, Menu, Field, Logo, Loading, StatusBar)
  wallet/             # walletService (derive/create/import/unlock), managers (session-scoped
                      #   WDK managers per chain family), viem clients, balanceService (EVM) +
                      #   portfolio (all chains), SendExecutor abstraction (transferService)
  bridge/             # 🚧 Relay quote + execute, multi-VM source signing
  predict/            # 🚧 Polymarket markets, order signing, positions
  commands/           # Command parsing/registry
  storage/            # Encrypted wallet store (+ resetAll) + settings store
                      #   (active chain, EVM RPCs, Solana RPC)
  utils/              # crypto + formatting helpers
  types/              # Shared domain types (no UI imports)
  config/             # zod-validated env, EVM chains, nonEvm (Solana)
  main.tsx            # entry point
```

### Multichain model

One mnemonic backs two chain families. `walletService.deriveAddresses()` derives the EVM and
Solana addresses; `managers.ts` lazily builds and caches a WDK manager per family + config
(EVM per chain/RPC, Solana per RPC) for the life of the session and disposes them on
logout/reset. `portfolio.ts` aggregates balances across viem (EVM) and the WDK Solana account.

### Going live with real sends, bridges & bets

The UI talks only to small service interfaces, each with a simulated default and a live
implementation gated by an explicit opt-in — so the demo never hard-depends on an RPC and there
are no accidental mainnet transactions:

- **Sends** — `getSendExecutor()` (`src/wallet/transferService.ts`) returns the real
  `WdkSendExecutor` (WDK `account.transfer()`) only when `TT_LIVE_SENDS=1`.
- **Bridge** 🚧 — `src/bridge/` wraps the Relay SDK behind a quote/execute interface; the live
  executor signs the source-chain tx with the matching WDK manager.
- **Predict** 🚧 — `src/predict/` wraps the Polymarket client; orders are EIP-712-signed with the
  WDK EVM key.

## Configuration

Networks are configured at runtime via `/settings` (active EVM network, per-EVM-network RPC,
Solana RPC) and persisted to `~/.tterminal/settings.json`. The env vars below only seed the
_initial_ EVM RPC on first run, plus the live-send toggle:

| Env var         | Default                    | Description                                                                   |
| --------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `RPC_URL`       | _(public RPC per network)_ | Seeds the initial RPC for the `CHAIN_ID` chain                                |
| `CHAIN_ID`      | `1`                        | Chain `RPC_URL` applies to + default active network (1 / 42161 / 10 / 8453)   |
| `TT_LIVE_SENDS` | _(unset → simulated)_      | Set to `1` to broadcast **real** on-chain sends via WDK instead of simulating |
