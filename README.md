<p align="center">
  <img src="frontend/public/favicon.svg" alt="RVault Protocol" width="80" height="80" />
</p>

<h1 align="center">RVault Protocol</h1>

<p align="center">
  <strong>Multi-vault revenue-sharing protocol on Bitcoin L1, powered by OPNet.</strong><br/>
  Deposit OP20 tokens · Earn protocol fees · Trustless fee distribution via FeeRouter
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Bitcoin-L1-F7931A?logo=bitcoin&logoColor=white" alt="Bitcoin L1" />
  <img src="https://img.shields.io/badge/OPNet-Smart%20Contracts-6366F1" alt="OPNet" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AssemblyScript-WASM-007AAC" alt="AssemblyScript" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Overview

**RVault** is a multi-vault revenue-sharing protocol built natively on **Bitcoin Layer 1** using the [OPNet](https://opnet.org) smart contract runtime. The protocol deploys multiple vaults (MOTO, PILL, RVT), each accepting a different OP20 token. Users deposit tokens and receive proportional shares. Protocol fees from all vaults are routed through a **trustless FeeRouter contract** that splits revenue: 90% to RVT stakers, 10% to the team. Revenue distribution uses a **Synthetix-style accumulator** — O(1) per operation, regardless of the number of depositors.

### Key Features

- **Multi-Vault Architecture** — Three independent vaults (MOTO, PILL, RVT), same WASM deployed with isolated storage
- **Trustless FeeRouter** — On-chain contract splits protocol fees automatically (90/10), no human wallet in the path
- **Multi-Token Rewards** — RVT stakers earn MOTO + PILL + RVT from all three vaults in one position
- **Synthetix Accumulator** — O(1) gas-efficient revenue distribution, battle-tested math
- **Permissionless Distribution** — Anyone can trigger `distribute()` on FeeRouter, no admin gatekeeper
- **Auto-Compound** — Reinvest pending revenue as additional shares with one click
- **Security First** — Reentrancy guards, CEI pattern, SafeMath, withdrawal cooldowns
- **Circuit Breaker** — Owner can pause/unpause; emergency withdraw always available
- **Configurable** — Protocol fee (0-20%), cooldown period, minimum deposit, fee recipient

---

## Architecture

```
+-----------------------------------------------------------------------+
|                            BITCOIN L1                                  |
|  +------------------------------------------------------------------+ |
|  |                        OPNet Runtime                              | |
|  |                                                                   | |
|  |  +------------------+  +------------------+  +------------------+ | |
|  |  | MOTO Vault.wasm  |  | PILL Vault.wasm  |  | RVT Vault.wasm   | | |
|  |  | deposit()        |  | deposit()        |  | deposit()        | | |
|  |  | withdraw()       |  | withdraw()       |  | withdraw()       | | |
|  |  | claimRevenue()   |  | claimRevenue()   |  | claimRevenue()   | | |
|  |  | collectFees()    |  | collectFees()    |  | claimAllRewards()| | |
|  |  +--------+---------+  +--------+---------+  +--------+---------+ | |
|  |           |                      |                      ^         | |
|  |           | 5% fee               | 5% fee               |         | |
|  |           v                      v                      |         | |
|  |  +-----------------------------------------------+      |         | |
|  |  |              FeeRouter.wasm                    |      |         | |
|  |  |  distribute(token) — permissionless            |      |         | |
|  |  |  ┌──────────────────────────────────────────┐  |      |         | |
|  |  |  │ 90% ──► distributeReward() on RVT Vault ─┼──┼──────┘         | |
|  |  |  │ 10% ──► Team wallet                      │  |               | |
|  |  |  └──────────────────────────────────────────┘  |               | |
|  |  +------------------------------------------------+               | |
|  |                                                                   | |
|  |  +------------------+  +------------------+  +------------------+ | |
|  |  | MOTO Token OP20  |  | PILL Token OP20  |  | RVT Token OP20   | | |
|  |  +------------------+  +------------------+  +------------------+ | |
|  +------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
                              ^
                              | OPNet SDK (simulate + send)
                              v
+-----------------------------------------------------------------------+
|                      Frontend (React 19)                               |
|  Vite · TypeScript · Tailwind CSS · Framer Motion                     |
|  Pages: Vaults · Dashboard · Deposit · Withdraw · Claim · Tokenomics  |
|  Wallet: @btc-vision/walletconnect (OP_WALLET, UniSat)                |
+-----------------------------------------------------------------------+
```

---

## Fee Flow

```
User deposits 1000 MOTO into MOTO Vault
         |
         v
    950 MOTO ──► stays in vault for depositors (95%)
     50 MOTO ──► sent to FeeRouter contract (5% protocol fee)
         |
         v
    FeeRouter holds MOTO until distribute() is called
         |
    Anyone calls distribute(MOTO_address)
         |
         ├── 5 MOTO ──► Team wallet (10% of protocol fee)
         |
         └── 45 MOTO ──► RVT Vault via distributeReward()
                          |
                          v
                     RVT stakers claim MOTO proportionally
```

RVT stakers earn fees from **all three vaults** — MOTO, PILL, and RVT — in a single staking position.

---

## Project Structure

```
RVault-Protocol/
├── contracts/              # Smart contracts (AssemblyScript → WASM)
│   ├── src/
│   │   ├── RevenueVault.ts       # Main vault contract (~46KB)
│   │   ├── FeeRouter.ts          # Trustless fee distribution (~12KB)
│   │   ├── index.ts              # Vault entry point
│   │   └── feerouter-index.ts    # FeeRouter entry point
│   ├── build/                    # Compiled WASM + WAT
│   ├── abis/                     # Generated ABIs
│   └── asconfig.json             # Build targets (vault + feerouter)
│
├── token/                  # RVT OP20 token contract
│   ├── src/
│   │   ├── RVT.ts                # Fixed supply, no inflation
│   │   └── index.ts
│   └── abis/
│
├── frontend/               # React 19 frontend
│   ├── src/
│   │   ├── pages/                # Vaults, Dashboard, Deposit, Withdraw, Claim, Admin, Tokenomics
│   │   ├── components/           # DepositForm, WithdrawForm, ClaimCard, VaultStats, VaultGauge
│   │   ├── hooks/                # useVaultContract, useVaultData, useTransaction, useAllVaultsData
│   │   ├── abi/                  # VaultABI.ts, FeeRouterABI.ts
│   │   ├── config/               # Contract addresses, network config
│   │   ├── context/              # VaultContext (multi-vault selection)
│   │   └── services/             # Provider, Contract services
│   └── vite.config.ts
│
├── FLOW.md                 # Comprehensive protocol documentation
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Blockchain** | Bitcoin L1 |
| **Smart Contracts** | OPNet Runtime (btc-runtime) |
| **Contract Language** | AssemblyScript → WebAssembly |
| **Token Standard** | OP20 (OPNet's ERC-20 equivalent) |
| **Math** | SafeMath (overflow-safe `u256`), Synthetix accumulator (1e18 precision) |
| **Frontend** | React 19 + TypeScript 5 + Vite 7 |
| **Styling** | Tailwind CSS 4 + Framer Motion |
| **Wallet** | OP_WALLET / UniSat via `@btc-vision/walletconnect` |
| **SDK** | `opnet` (typed contract proxies, simulate + send) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [OP_WALLET](https://opnet.org) browser extension
- Git

### 1. Clone

```bash
git clone https://github.com/jonathan-moore58/RVault-Protocol.git
cd RVault-Protocol
```

### 2. Build Contracts

```bash
# Revenue Vault
cd contracts
npm install
npm run build          # builds RevenueVault.wasm

# FeeRouter
npm run build:feerouter   # builds FeeRouter.wasm

# Or build both
npm run build:all

# RVT Token
cd ../token
npm install
npm run build
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Contracts

### RevenueVault (deployed 3x: MOTO, PILL, RVT)

Same WASM, deployed with isolated storage per vault.

| Method | Access | Description |
|--------|--------|------------|
| `deposit(amount)` | User | Deposit OP20 tokens, receive proportional shares |
| `withdraw(shares)` | User | Burn shares, retrieve tokens + auto-claim revenue |
| `claimRevenue()` | User | Claim accumulated vault revenue |
| `autoCompound()` | User | Reinvest pending revenue as additional shares |
| `collectFees(amount)` | User | Inject revenue tokens for distribution |
| `emergencyWithdraw()` | User | Exit all shares (works when paused, forfeits pending) |
| `distributeReward(token, amount)` | External | Distribute external reward tokens (used by FeeRouter) |
| `claimAllRewards()` | User | Claim all external rewards (MOTO + PILL) in one call |
| `addRewardToken(token)` | Admin | Register external reward token (max 2) |
| `pause()` / `unpause()` | Admin | Circuit breaker |
| `setProtocolFee(bps)` | Admin | Set fee 0-2000 bps (max 20%) |
| `setProtocolFeeRecipient(addr)` | Admin | Set fee recipient (FeeRouter address) |
| `setCooldownBlocks(n)` | Admin | Withdrawal cooldown (0-144 blocks) |
| `setMinimumDeposit(amount)` | Admin | Minimum first-deposit threshold |
| `setDepositToken(token)` | Admin | Configure accepted OP20 token |
| `getVaultInfo()` | View | Total deposited, shares, fees, accumulator |
| `getUserInfo(addr)` | View | Shares, deposited, pending revenue, claimed |
| `getProtocolInfo()` | View | Fee BPS, recipient, total fees, cooldown |
| `getRewardInfo()` | View | External reward token addresses + totals |
| `getUserRewardInfo(addr)` | View | Pending external rewards per user |
| `previewDeposit(amount)` | View | Preview shares for deposit |
| `previewWithdraw(shares)` | View | Preview tokens for withdrawal |

### FeeRouter (deployed 1x)

Trustless fee distribution contract. Receives protocol fees from MOTO and PILL vaults, splits them on-chain.

| Method | Access | Description |
|--------|--------|------------|
| `distribute(token)` | **Anyone** | Split token balance: 90% to RVT vault stakers, 10% to team |
| `setRvtVault(addr)` | Admin | Set RVT vault address (one-time setup) |
| `setTeamWallet(addr)` | Admin | Set team wallet address |
| `setTeamBps(bps)` | Admin | Set team cut 0-3000 bps (max 30%, default 10%) |
| `getConfig()` | View | Owner, RVT vault, team wallet, team BPS, total distributed |
| `getOwner()` | View | Contract owner address |

### RVT Token (OP20)

Fixed supply governance/revenue token. 100,000,000 RVT, no inflation, no minting after deployment.

---

## Revenue Distribution

### Vault-Level (Synthetix Accumulator)

```
When fees arrive:
  accumulator += (feeAmount * 1e18) / totalShares

Per-user pending:
  pending = (userShares * (accumulator - userDebt)) / 1e18
```

O(1) per operation. Same math used by Synthetix StakingRewards, SushiSwap MasterChef, and similar battle-tested protocols.

### Protocol-Level (FeeRouter)

```
Each vault collects 5% protocol fee on deposits
         |
         v
FeeRouter contract receives fees
         |
    distribute(token) called by anyone
         |
         ├── 90% → distributeReward() on RVT Vault
         │         (updates multi-token accumulator)
         │
         └── 10% → transfer() to team wallet
```

No human wallet between vault fees and staker rewards. Fully on-chain, fully verifiable.

---

## Security

- **Reentrancy Guard** — Mutex lock on all state-changing methods (both Vault and FeeRouter)
- **Checks-Effects-Interactions** — CEI pattern strictly followed
- **SafeMath** — All `u256` arithmetic uses overflow-safe operations
- **Withdrawal Cooldown** — Configurable delay prevents deposit-then-withdraw attacks
- **Emergency Withdraw** — Always available, even when vault is paused
- **Access Control** — Owner-only admin functions with `_onlyOwner()` guard
- **Team Cut Cap** — FeeRouter team BPS capped at 30% (hardcoded max)
- **Permissionless Distribution** — Anyone can trigger fee distribution, no admin bottleneck

---

## Deployment

### Contract Deployment Order

1. Deploy **RVT Token** (OP20)
2. Deploy **RevenueVault.wasm** × 3 (MOTO vault, PILL vault, RVT vault)
3. Deploy **FeeRouter.wasm** × 1

### Post-Deployment Configuration

```
For each vault:
  setDepositToken(token_address)
  setProtocolFee(500)                    # 5% = 500 bps

For MOTO + PILL vaults:
  setProtocolFeeRecipient(FeeRouter_address)

For RVT vault:
  setProtocolFeeRecipient(FeeRouter_address)
  addRewardToken(MOTO_token_address)
  addRewardToken(PILL_token_address)

For FeeRouter:
  setRvtVault(RVT_vault_address)
  setTeamWallet(team_wallet_address)
```

---

## Documentation

For comprehensive technical documentation including storage layout, revenue algorithm math with numeric examples, ASCII sequence diagrams for all user flows, complete method reference with selectors, and frontend component mapping, see **[FLOW.md](./FLOW.md)**.

---

## Live

- **Frontend**: [rvaultprotocol.vercel.app](https://rvaultprotocol.vercel.app)
- **Network**: OPNet Testnet (Bitcoin Signet)
- **Source**: [github.com/jonathan-moore58/RVault-Protocol](https://github.com/jonathan-moore58/RVault-Protocol)

---

## License

MIT License. See [LICENSE](./LICENSE).

---

<p align="center">
  Built on <strong>Bitcoin L1</strong> with <strong>OPNet</strong> · Secured by the world's most resilient blockchain
</p>
