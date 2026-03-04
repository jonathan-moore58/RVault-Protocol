<p align="center">
  <img src="frontend/public/favicon.svg" alt="RVault Protocol" width="80" height="80" />
</p>

<h1 align="center">RVault Protocol</h1>

<p align="center">
  <strong>Revenue-sharing vault on Bitcoin L1, powered by OPNet.</strong><br/>
  Deposit OP20 tokens · Earn proportional protocol fees · Claim or auto-compound revenue
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

**RVault** is a decentralized revenue-sharing vault built natively on **Bitcoin Layer 1** using the [OPNet](https://opnet.org) smart contract runtime. Users deposit OP20 tokens into the vault and receive proportional shares. When protocol fees are collected, they are distributed to all shareholders using a **Synthetix-style accumulator** — O(1) per operation, regardless of the number of depositors.

### Key Features

- 🏦 **Deposit & Earn** — Deposit OP20 tokens, receive proportional vault shares
- 💰 **Revenue Distribution** — Synthetix-style accumulator ensures fair, gas-efficient fee distribution
- 🔄 **Auto-Compound** — Reinvest pending revenue as additional shares with one click
- 🛡️ **Security First** — Reentrancy guards, CEI pattern, SafeMath, withdrawal cooldowns
- ⏸️ **Circuit Breaker** — Owner can pause/unpause; emergency withdraw always available
- ⚙️ **Configurable** — Protocol fee (0–20%), cooldown period, minimum deposit, fee recipient

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      BITCOIN L1                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  OPNet Runtime                     │  │
│  │  ┌─────────────────────┐  ┌────────────────────┐  │  │
│  │  │  RevenueVault.wasm  │  │  RVT Token (OP20)  │  │  │
│  │  │  · deposit()        │◄►│  · transfer()      │  │  │
│  │  │  · withdraw()       │  │  · transferFrom()  │  │  │
│  │  │  · claimRevenue()   │  │  · balanceOf()     │  │  │
│  │  │  · collectFees()    │  │  · allowance()     │  │  │
│  │  │  · autoCompound()   │  └────────────────────┘  │  │
│  │  │  · emergencyWithdraw│                           │  │
│  │  └─────────────────────┘                           │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ OPNet SDK (simulate → send)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React 19)                    │
│  Vite · TypeScript · Tailwind CSS · Framer Motion       │
│  Wallet: @btc-vision/walletconnect (OP_WALLET)          │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
RVault-Protocol/
├── contracts/          # RevenueVault smart contract (AssemblyScript → WASM)
│   ├── src/
│   │   ├── RevenueVault.ts    # Main vault contract (32KB)
│   │   └── index.ts           # Entry point
│   ├── abis/                  # Generated ABIs
│   └── asconfig.json          # AssemblyScript build config
│
├── token/              # RVT OP20 token contract
│   ├── src/
│   │   ├── RVT.ts             # Token implementation
│   │   └── index.ts           # Entry point
│   └── abis/                  # Generated ABIs
│
├── frontend/           # React 19 frontend application
│   ├── src/
│   │   ├── components/        # UI components (13 files)
│   │   ├── hooks/             # Custom React hooks (5 files)
│   │   ├── pages/             # Route pages (6 files)
│   │   ├── config/            # Contract addresses & network config
│   │   ├── services/          # Service layer
│   │   ├── context/           # React contexts
│   │   └── App.tsx            # Root application
│   ├── index.html
│   └── vite.config.ts
│
├── FLOW.md             # Comprehensive protocol documentation
├── .gitignore
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
| **Math Library** | SafeMath (overflow-safe `u256`) |
| **Frontend** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS + Framer Motion |
| **Wallet** | OP_WALLET via `@btc-vision/walletconnect` |
| **SDK** | `opnet` (typed contract proxies) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [OP_WALLET](https://opnet.org) browser extension
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/jonathan-moore58/RVault-Protocol.git
cd RVault-Protocol
```

### 2. Smart Contracts

```bash
# RevenueVault contract
cd contracts
npm install
npm run build

# RVT Token contract
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

## Contract Methods

### User Methods

| Method | Description |
|--------|------------|
| `deposit(amount)` | Deposit OP20 tokens, receive proportional vault shares |
| `withdraw(shares)` | Burn shares, retrieve tokens + auto-claim pending revenue |
| `claimRevenue()` | Claim accumulated revenue without touching deposit |
| `autoCompound()` | Reinvest pending revenue as additional vault shares |
| `collectFees(amount)` | Inject revenue tokens for distribution to all shareholders |
| `emergencyWithdraw()` | Exit all shares (works even when paused, forfeits pending revenue) |

### Admin Methods (Owner Only)

| Method | Description |
|--------|------------|
| `pause()` / `unpause()` | Circuit breaker for vault operations |
| `setProtocolFee(bps)` | Set protocol fee (0–2000 bps, max 20%) |
| `setProtocolFeeRecipient(addr)` | Set fee recipient address |
| `setCooldownBlocks(n)` | Set withdrawal cooldown (0–144 blocks) |
| `setMinimumDeposit(amount)` | Set minimum first-deposit threshold |
| `setDepositToken(token)` | Configure accepted OP20 token |

### View Methods

| Method | Description |
|--------|------------|
| `getVaultInfo()` | Total deposited, shares, fees, accumulator |
| `getUserInfo(address)` | User shares, deposited, pending revenue, claimed |
| `previewDeposit(amount)` | Preview shares for a given deposit |
| `previewWithdraw(shares)` | Preview token output for share burn |
| `getProtocolInfo()` | Fee config, recipient, cooldown |

---

## Revenue Distribution

RVault uses a **Synthetix-style global accumulator** for O(1) revenue distribution:

```
When fees arrive:
  revenuePerShareAccumulator += (distributed × 1e18) / totalShares

Per-user pending revenue:
  pending = (userShares × (accumulator − userDebt)) / 1e18
```

This model is used by Synthetix StakingRewards, MasterChef, and similar battle-tested DeFi protocols. See [FLOW.md](./FLOW.md) for detailed math with step-by-step examples.

---

## Security

- **Reentrancy Guard** — Mutex lock on all state-changing methods
- **Checks-Effects-Interactions** — CEI pattern strictly followed
- **SafeMath** — All `u256` arithmetic uses overflow-safe operations
- **Withdrawal Cooldown** — Configurable delay prevents deposit-then-withdraw attacks
- **Emergency Withdraw** — Always available, even when vault is paused
- **Access Control** — Owner-only admin functions with `_onlyOwner()` guard

---

## Documentation

For comprehensive technical documentation including:

- Detailed storage layout & pointer assignments
- Step-by-step revenue algorithm with numeric examples
- ASCII sequence diagrams for all user flows
- Complete method reference with selectors
- Frontend component-to-contract mapping

See **[FLOW.md](./FLOW.md)**

---

## License

This project is licensed under the MIT License.

---

<p align="center">
  Built on <strong>Bitcoin L1</strong> with <strong>OPNet</strong> · Secured by the world's most resilient blockchain
</p>
