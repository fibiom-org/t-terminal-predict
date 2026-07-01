# TTerminal Predict

A terminal-first, **self-custodial sports prediction wallet**. Keyboard-first, lightweight,
and built on Tether's **Wallet Development Kit (WDK)** — you hold your own keys. One BIP-39 seed
drives **EVM and Solana** identities at once.

The hook: **hold USDT/USDC on any chain → one step bridges it to USDC.e on Polygon → bet on
sports match outcomes via Polymarket.** The chain plumbing stays hidden; you stay in the
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

The theme is **sports + the global tournament moment** (FIFA World Cup 2026). The stack is the
point: a WDK self-custodial wallet is the core, with two integrations layered on top.

- **Relay bridge** (`@relayprotocol/relay-sdk`) — move collateral **into Polygon** from Solana,
  Ethereum, Arbitrum, Optimism, and Base (and back). Because Relay routes are **cross-asset**, the
  user can fund with **USDT** and receive **USDC.e** on Polygon in a single step — no manual swap.
- **Polymarket** (`@polymarket/client`) — browse and trade sports prediction markets; orders are
  placed through the Polymarket CLOB and settled in **pUSD** on Polygon.

**Hero flow:** _"I have USDT on Solana. I want to bet on Brazil vs. Argentina."_ →
`bridge` (USDT → USDC.e on Polygon) → `predict` (place the order) → `predict → My bets` (track it).

## Status

| Area                                                               | State    |
| ------------------------------------------------------------------ | -------- |
| WDK wallet (create / import / unlock, encrypted store)             | ✅ Built |
| EVM (Ethereum, Arbitrum, Optimism, Base, Polygon) + Solana         | ✅ Built |
| `balance`, `send`, `receive`, `settings`, `logout`, `help`, `exit` | ✅ Built |
| **Relay bridge** — any chain/token → USDC.e on Polygon (and back)  | ✅ Built |
| **Polymarket** prediction markets (`predict` → browse / bet / PnL) | ✅ Built |

## Stack

- **TypeScript** (strict mode)
- **Ink** (React for the CLI) + **ink-text-input** + **ink-spinner**
- **viem** — EVM on-chain balance reads + Polygon trading transactions
- Tether's **WDK** — one mnemonic, two chain families:
  - **@tetherto/wdk-wallet-evm** — EVM (Ethereum, Arbitrum, Optimism, Base, Polygon)
  - **@tetherto/wdk-wallet-solana** — Solana (SOL + SPL tokens)
- **@relayprotocol/relay-sdk** — cross-chain, cross-asset bridging
- **@polymarket/client** — prediction market orders via the Builder API + CLOB
- **bip39** + **Zod** + **dotenv** — mnemonics & config
- Node's built-in `crypto` (scrypt + AES-256-GCM) — encrypted secret & credential storage

## Requirements

- **Node.js >= 20** (developed on Node 23) — bundles `npm`. Install from
  [nodejs.org](https://nodejs.org) or a version manager like `nvm`.
- **Git** — to clone the repository.

Verify your toolchain:

```bash
node -v   # should print v20 or newer
npm -v
git --version
```

## Quick start (from scratch)

Clone, build, and install the `tterminal` command globally:

```bash
# 1. Clone the repository
git clone git@github.com:fibiom-org/t-terminal-predict.git
# (HTTPS alternative: git clone https://github.com/fibiom-org/t-terminal-predict.git)

# 2. Enter the project
cd t-terminal-predict

# 3. Install dependencies
npm install

# 4. (Optional) create a local .env — a public RPC is used by default
cp .env.example .env

# 5. Build the app
npm run build

# 6. Link it as a global `tterminal` command
npm link

# 7. Run it
tterminal
```

That's it — on first launch you'll be prompted to **create** or **import** a wallet (see
[Usage](#usage) below).

> To later remove the global command, run `npm unlink -g tterminal`.

### Run without linking

- **Development** (rebuilds, then runs): `npm run dev`
- **Run the built app directly** (after `npm run build`): `npm start`

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

| Command    | Aliases                    | Action                                                   |
| ---------- | -------------------------- | -------------------------------------------------------- |
| `balance`  | `b`, `bal`                 | Refresh & show your held assets across **all chains**    |
| `send`     | `s`, `transfer`            | Send a token / native coin on EVM or Solana              |
| `receive`  | `r`, `deposit`             | Show deposit addresses (EVM `0x…`, Solana base58)        |
| `bridge`   | `br`, `swap`               | Bridge tokens across chains via **Relay**                |
| `predict`  | `p`, `poly`, `bet`         | Browse sports markets, place bets, track positions & PnL |
| `settings` | `cfg`, `config`            | Networks / RPC nodes / execution & API / wallet          |
| `logout`   | `lock`                     | Lock the wallet and return to the unlock screen          |
| `help`     | `h`, `?`                   | List commands                                            |
| `clear`    | `cls`                      | Clear the output log                                     |
| `exit`     | `q`, `quit`                | Quit                                                     |

Navigation is keyboard-first: `↑/↓` (or `j/k`) to move, number keys to jump, `Enter` to select,
`Esc` to go back.

### Networks

| Network  | Chain id | Native | Tokens       | Role                                    |
| -------- | -------- | ------ | ------------ | --------------------------------------- |
| Ethereum | 1        | ETH    | USDT, USDC…  | Bridge source                           |
| Arbitrum | 42161    | ETH    | USDT, USDC…  | Bridge source                           |
| Optimism | 10       | ETH    | USDT, USDC…  | Bridge source                           |
| Base     | 8453     | ETH    | USDC…        | Bridge source                           |
| Solana   | —        | SOL    | USDT, USDC   | Bridge source (base58 address)          |
| Polygon  | 137      | POL    | USDC.e, USDT | Collateral + Polymarket settlement      |

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

> **Sends broadcast real on-chain transactions by default.** Signing goes through WDK
> `account.transfer()` on the chosen chain. To run `/send` in **simulation** mode (no on-chain
> tx, placeholder hash), flip it off in `/settings → Execution & API` or set `TT_LIVE_SENDS=0`.
> The executor lives in `src/wallet/transferService.ts`.

### Receiving

`/receive` shows your deposit address for each chain family (EVM `0x…`, Solana base58).

### Bridge

`/bridge` funds your Polymarket collateral on **Polygon** from whatever chain you already hold
value on, using the **Relay SDK** (`@relayprotocol/relay-sdk`).

- **Source → destination:** any supported token (native / USDT / USDC) on **Solana / Ethereum /
  Arbitrum / Optimism / Base** → **USDC.e on Polygon** (chainId 137). Relay routes are
  **cross-asset**, so the swap from USDT to USDC.e happens **inside the bridge** — one quote, one
  confirmation, no separate DEX step.
- **Flow:** pick a source chain → pick the token → enter amount → get a live quote
  (expected out · ETA) → confirm with your password → watch status until the funds land on Polygon.
- **Signing:** the source-chain transaction is signed with the matching **WDK** manager — the
  **EVM** manager for EVM sources, the **Solana** manager for Solana — so funds never leave your
  custody.
- **Reverse / cash out:** the same route runs backwards — **USDC.e on Polygon → USDT** back on your
  source chain — to withdraw winnings.

> Like sends, the bridge broadcasts real transactions by default, wrapped behind a service
> interface (`src/bridge/relayService.ts`) with a simulated executor for offline demos. Toggle it
> in `/settings → Execution & API` or set `TT_LIVE_BRIDGES=0`.

### Predict

`/predict` opens the Polymarket flow:

- **Browse sports events** — curated live **sports** markets from Polymarket's Gamma API, with
  outcomes and implied odds. Pick an event → market → outcome → enter a **pUSD** amount → confirm.
- **My bets** — your open positions with average price, current value, and PnL. Sell shares back
  into the market or redeem winnings once a market resolves.

Under the hood, orders are placed through the **Polymarket CLOB** as Fill-Or-Kill market orders
and signed with your **WDK EVM key** via the **Builder API**. Collateral is held as **pUSD**
(Polymarket USD): when you place a buy, any shortfall is wrapped from your **USDC.e** on Polygon
through the **CollateralOnramp** into a gasless **deposit wallet**, so you only need to bridge
USDC.e — the app handles the wrap and approvals. A small amount of **POL** is required for gas.

> **Bets are simulated by default.** Going live requires (1) enabling bets in
> `/settings → Execution & API` (or `TT_LIVE_BETS=1`) **and** (2) **Polymarket Builder API
> credentials** (key / secret / passphrase) entered in-app or via `.env`. The trade client lives
> in `src/polymarket/tradeClient.ts`.

### Account lifecycle

- **Logout** (`/logout`, alias `/lock`, or Settings → Wallet) — locks the wallet, disposes the
  in-memory WDK managers, and returns to the unlock screen. Your encrypted wallet file is kept;
  just re-enter your password to unlock.
- **Restore from seed** — reachable from the unlock screen (Tab → options) or Settings → Wallet.
  Replaces the current wallet with one imported from a mnemonic.
- **Reset wallet** — a full factory reset that **wipes the entire `~/.tterminal` directory**
  (wallet + settings + credentials). Requires typing `RESET` to confirm. Funds are only
  recoverable afterwards via your seed phrase.

## Security

Modeled on the practices of the Solana / Sui CLIs:

- Private keys and mnemonics are **never logged**. The recovery phrase is displayed exactly once,
  at creation.
- Only the **mnemonic** is stored, **encrypted at rest** in `~/.tterminal/wallet.json`
  (scrypt-derived key + AES-256-GCM), with `0600` file / `0700` dir permissions. The EVM / Solana
  addresses are re-derived from it on every unlock (the file format is versioned; legacy
  single-address wallets migrate transparently).
- **Polymarket Builder API credentials** are likewise stored **encrypted** in
  `~/.tterminal/credentials.json` (AES-256-GCM, keyed by the seed phrase) — decryption fails
  gracefully for a different/restored seed, falling back to `.env`.
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
    screens/         #   Welcome, Create, Import, Unlock, Main, Send, Receive,
                      #   Settings, Bridge, Polymarket
  components/         # Reusable Ink components (Frame, Menu, Field, Logo, Loading,
                      #   StatusBar, PaginatedList, ErrorBox, Panel)
  wallet/             # walletService (derive/create/import/unlock), managers (session-scoped
                      #   WDK managers per chain family), viem clients, balanceService (EVM) +
                      #   portfolio (all chains), SendExecutor abstraction (transferService)
  bridge/             # Relay quote + execute, multi-VM source signing (relayService)
  polymarket/         # Gamma market discovery, CLOB trade client, bet service, positions,
                      #   config (contracts, collateral), formatting
  commands/           # Command parsing/registry
  storage/            # Encrypted wallet store (+ resetAll), settings store (active chain,
                      #   EVM RPCs, Solana RPC, execution toggles), encrypted credentials store
  utils/              # crypto + formatting + error-message helpers
  types/              # Shared domain types (no UI imports)
  config/             # zod-validated env, EVM chains, nonEvm (Solana)
  main.tsx            # entry point
```

### Multichain model

One mnemonic backs two chain families. `walletService.deriveAddresses()` derives the EVM and
Solana addresses; `managers.ts` lazily builds and caches a WDK manager per family + config
(EVM per chain/RPC, Solana per RPC) for the life of the session and disposes them on
logout/reset. `portfolio.ts` aggregates balances across viem (EVM) and the WDK Solana account.

### Live vs. simulated execution

The UI talks only to small service interfaces, each with a simulated executor and a live
implementation. Which one runs is decided per feature by `isLiveExecution()`
(`src/storage/settingsStore.js`), settable in-app via `/settings → Execution & API` and persisted
to `~/.tterminal/settings.json`; env vars seed the initial default:

- **Sends** — live by default (`WdkSendExecutor`, WDK `account.transfer()`); `TT_LIVE_SENDS=0`
  simulates. (`src/wallet/transferService.ts`)
- **Bridge** — live by default (`RelayBridgeExecutor`, signs the source-chain tx with the matching
  WDK manager); `TT_LIVE_BRIDGES=0` simulates. (`src/bridge/relayService.ts`)
- **Predict** — **simulated by default**; `TT_LIVE_BETS=1` **plus** Builder API credentials enables
  the `ClobBetExecutor` (EIP-712-signed CLOB orders). (`src/polymarket/betService.ts`)

## Configuration

Networks and execution are configured at runtime via `/settings` (active EVM network,
per-EVM-network RPC, Solana RPC, live/simulation toggles, Builder API credentials) and persisted to
`~/.tterminal/settings.json` (+ encrypted `~/.tterminal/credentials.json`). **In-app settings take
precedence** over the env vars below, which only seed initial defaults:

| Env var              | Default                    | Description                                                                        |
| -------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `RPC_URL`            | _(public RPC per network)_ | Seeds the initial RPC for the `CHAIN_ID` chain                                      |
| `CHAIN_ID`           | `1`                        | Chain `RPC_URL` applies to + default active network (1 / 42161 / 10 / 8453 / 137)  |
| `TT_LIVE_SENDS`      | `1` (live)                 | Set to `0` to **simulate** sends instead of broadcasting real WDK transactions      |
| `TT_LIVE_BRIDGES`    | `1` (live)                 | Set to `0` to **simulate** bridges instead of broadcasting real Relay transactions  |
| `TT_LIVE_BETS`       | `0` (simulated)            | Set to `1` to place **real** Polymarket orders (also needs Builder API credentials) |
| `BUILDER_API_KEY`    | _(unset)_                  | Polymarket Builder API key — required for live betting unless entered in-app         |
| `BUILDER_SECRET`     | _(unset)_                  | Polymarket Builder API secret                                                       |
| `BUILDER_PASS_PHRASE`| _(unset)_                  | Polymarket Builder API passphrase                                                   |
</content>
