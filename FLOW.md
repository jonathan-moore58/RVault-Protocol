# RVault Protocol — Comprehensive Flow Document

> **Multi-vault revenue-sharing protocol on Bitcoin L1, powered by OPNet.**
> Three vaults (MOTO, PILL, RVT) · Trustless FeeRouter · Multi-token rewards for RVT stakers

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Smart Contract Design](#2-smart-contract-design)
3. [FeeRouter Contract](#3-feerouter-contract)
4. [User Flows (with ASCII Diagrams)](#4-user-flows-with-ascii-diagrams)
5. [Revenue Distribution Algorithm](#5-revenue-distribution-algorithm-detailed)
6. [Fee Flow: End-to-End](#6-fee-flow-end-to-end)
7. [Contract Method Reference](#7-contract-method-reference)
8. [Frontend Component Map](#8-frontend-component-map)
9. [Deployment Flow](#9-deployment-flow)

---

## 1. Architecture Overview

### 1.1 System Topology

```
+------------------------------------------------------------------------+
|                            BITCOIN L1                                   |
|  +-------------------------------------------------------------------+ |
|  |                         OPNet Runtime                              | |
|  |                                                                    | |
|  |  +------------------+  +------------------+  +-------------------+ | |
|  |  | MOTO Vault.wasm  |  | PILL Vault.wasm  |  | RVT Vault.wasm    | | |
|  |  | (RevenueVault)   |  | (RevenueVault)   |  | (RevenueVault)    | | |
|  |  |                  |  |                  |  |                    | | |
|  |  | deposit()        |  | deposit()        |  | deposit()         | | |
|  |  | withdraw()       |  | withdraw()       |  | withdraw()        | | |
|  |  | claimRevenue()   |  | claimRevenue()   |  | claimRevenue()    | | |
|  |  | collectFees()    |  | collectFees()    |  | claimAllRewards() | | |
|  |  | autoCompound()   |  | autoCompound()   |  | distributeReward()| | |
|  |  | emergencyExit()  |  | emergencyExit()  |  | emergencyExit()   | | |
|  |  +-------+----------+  +-------+----------+  +--------+----------+ | |
|  |          |                      |                       ^          | |
|  |          | 5% fee               | 5% fee                |          | |
|  |          v                      v                       |          | |
|  |  +--------------------------------------------------+   |          | |
|  |  |              FeeRouter.wasm (1 instance)          |   |          | |
|  |  |                                                   |   |          | |
|  |  |  distribute(token) — permissionless               |   |          | |
|  |  |  ┌──────────────────────────────────────────────┐ |   |          | |
|  |  |  │ 90% ──► approve + distributeReward() ────────┼─┼───┘          | |
|  |  |  │ 10% ──► transfer() to team wallet            │ |              | |
|  |  |  └──────────────────────────────────────────────┘ |              | |
|  |  +--------------------------------------------------+              | |
|  |                                                                    | |
|  |  +------------------+  +------------------+  +-------------------+ | |
|  |  | MOTO Token OP20  |  | PILL Token OP20  |  | RVT Token OP20    | | |
|  |  | (external token) |  | (external token) |  | (protocol token)  | | |
|  |  +------------------+  +------------------+  +-------------------+ | |
|  +-------------------------------------------------------------------+ |
+------------------------------------------------------------------------+
         ^                    ^
         | simulate           | sendTransaction
         | (read-only)        | (signer:null, wallet signs)
         |                    |
+------------------------------------------------------------------------+
|                     OPNet SDK (opnet npm)                                |
|  getContract<T>(address, ABI, provider, network)                        |
|  - Generates typed proxy from BitcoinInterfaceAbi                       |
|  - simulate: call method -> returns CallResult w/ properties            |
|  - sendTransaction: sign via WalletConnect -> broadcast to node         |
+------------------------------------------------------------------------+
         ^
         |
+------------------------------------------------------------------------+
|                      FRONTEND APPLICATION                               |
|  React 19 + Vite 7 + TypeScript 5 + Tailwind CSS 4 + Framer Motion    |
|                                                                         |
|  Pages:            Hooks:                Components:                    |
|  - Vaults          - useVaultContract     - DepositForm                 |
|  - Dashboard       - useVaultData         - WithdrawForm                |
|  - Deposit         - useTransaction       - ClaimCard                   |
|  - Withdraw        - useAllVaultsData     - VaultStats                  |
|  - Claim                                  - VaultGauge                  |
|  - Admin           Context:               - TransactionStatus           |
|  - Tokenomics      - VaultContext          - Skeleton                   |
|                                                                         |
|  Wallet: @btc-vision/walletconnect (OP_WALLET, UniSat)                 |
+------------------------------------------------------------------------+
         ^
         |
+------------------------------------------------------------------------+
|                           USER                                          |
|  Browser with OP_WALLET or UniSat Bitcoin wallet extension              |
+------------------------------------------------------------------------+
```

### 1.2 Multi-Vault Architecture

The protocol deploys the **same RevenueVault.wasm** three times, each with isolated storage:

| Vault | Deposit Token | Purpose |
|-------|--------------|---------|
| **MOTO Vault** | MOTO (OP20) | Earn fees from MOTO deposits |
| **PILL Vault** | PILL (OP20) | Earn fees from PILL deposits |
| **RVT Vault** | RVT (OP20) | Earn fees from RVT deposits + receive MOTO/PILL rewards from FeeRouter |

The RVT Vault is special: it also accepts **external reward tokens** (MOTO, PILL) via `distributeReward()`, enabling RVT stakers to earn from all three vaults.

### 1.3 Contract Architecture

| Layer | Technology |
|-------|-----------|
| Blockchain | Bitcoin L1 |
| Smart Contract | OPNet Runtime (btc-runtime) |
| Language | AssemblyScript (compiles to WASM) |
| Token Standard | OP20 (OPNet's ERC-20 equivalent) |
| Base Class | `OP_NET` from `@btc-vision/btc-runtime/runtime` |
| Math Library | `SafeMath` (overflow-safe u256 arithmetic) |
| Big Integers | `u256` from `@btc-vision/as-bignum/assembly` |

### 1.4 How Contract Calls Work (Simulate → Send Pattern)

Every contract interaction follows the same two-phase pattern:

```
Phase 1: SIMULATE (read-only, no gas, instant)
+-------+     +-----------+     +----------+     +----------+
| React | --> | OPNet SDK | --> | Provider | --> | Contract |
| Hook  |     | proxy.fn()|     | simulate |     | (WASM)   |
+-------+     +-----------+     +----------+     +----------+
                                                      |
    CallResult { revert?: string, properties: {...} } <+

Phase 2: SEND TRANSACTION (requires wallet signature)
+-------+     +------------------+     +-----------+     +-----------+
| React | --> | simulation       | --> | Wallet    | --> | Bitcoin   |
| Hook  |     | .sendTransaction |     | (signs)   |     | Network   |
+-------+     | ({signer: null}) |     +-----------+     +-----------+
              +------------------+
                 Parameters:
                   signer: null           // wallet signs externally
                   mldsaSigner: null      // no MLDSA signer
                   refundTo: walletAddr   // refund excess sats
                   maximumAllowedSatToSpend: 1_000_000n  // 0.01 BTC cap
                   network: activeNetwork
```

The `useTransaction` hook encapsulates this lifecycle:

```
idle --> simulating --> pending --> confirming --> success
                   \              \
                    +-> error      +-> error
```

---

## 2. Smart Contract Design

### 2.1 RevenueVault Storage Layout

Each vault deployment has its own isolated storage. Pointer addresses are sequential:

```
Pointer   Type              Variable                    Description
----------------------------------------------------------------------
0         StoredAddress     depositToken                OP20 token accepted by vault
1         StoredAddress     owner                       Contract deployer / admin
2         StoredU256        totalDeposited              Sum of all deposited tokens
3         StoredU256        totalShares                 Sum of all minted shares
4         StoredU256        totalFees                   Lifetime fees collected
5         StoredU256        revenuePerShareAccumulator  Synthetix-style accumulator (scaled 1e18)
6         AddressMemoryMap  userShares                  user -> share balance
7         AddressMemoryMap  userDeposited               user -> deposited token amount
8         AddressMemoryMap  userRevenueDebt             user -> accumulator snapshot at entry
9         AddressMemoryMap  userClaimedRevenue          user -> lifetime claimed revenue
10        StoredBoolean     paused                      Circuit breaker flag
11        StoredU256        minimumDeposit              Min first-deposit amount
12        StoredBoolean     locked                      Reentrancy guard mutex
13        StoredU256        protocolFeeBps              Fee in basis points (1 bp = 0.01%)
14        StoredAddress     protocolFeeRecipient        Address receiving protocol cut
15        StoredU256        totalProtocolFees           Lifetime protocol fees collected
16        StoredU256        cooldownBlocks              Blocks to wait after deposit
17        AddressMemoryMap  userLastDepositBlock        user -> block number of last deposit
18        StoredU256        rewardTokenCount            Number of external reward tokens (0-2)
19        StoredAddress     rewardToken0                First external reward token address
20        StoredAddress     rewardToken1                Second external reward token address
21        StoredU256        rewardAccumulator0          Per-share accumulator for token0
22        StoredU256        rewardAccumulator1          Per-share accumulator for token1
23        StoredU256        totalRewardDistributed0     Total token0 distributed
24        StoredU256        totalRewardDistributed1     Total token1 distributed
25        AddressMemoryMap  userRewardDebt0             user -> token0 accumulator snapshot
26        AddressMemoryMap  userRewardDebt1             user -> token1 accumulator snapshot
```

### 2.2 Revenue Algorithm (Synthetix-Style Accumulator)

The vault uses a **global per-share accumulator** for O(1) revenue distribution:

```
revenuePerShareAccumulator += (newRevenue * PRECISION) / totalShares
```

Each user's pending revenue is:

```
pendingRevenue = (userShares * (accumulator - userDebt)) / PRECISION
```

Where `PRECISION = 1e18`. The same math is used for external reward token accumulators.

### 2.3 External Reward System (Multi-Token)

The RVT Vault supports up to 2 external reward tokens (MOTO, PILL). Each has its own accumulator:

```
distributeReward(token, amount):
  1. Identify which reward slot (0 or 1) matches the token
  2. transferFrom(sender, vault, amount)
  3. rewardAccumulator[slot] += (amount * PRECISION) / totalShares
  4. totalRewardDistributed[slot] += amount

claimAllRewards():
  For each reward slot (0, 1):
    pending = (userShares * (rewardAccumulator[slot] - userRewardDebt[slot])) / PRECISION
    if pending > 0: transfer pending to user
    userRewardDebt[slot] = rewardAccumulator[slot]
```

External rewards are also auto-settled on `withdraw()` and `emergencyWithdraw()`.

### 2.4 Security Features

#### Reentrancy Guard
```
_nonReentrant():
    if locked == true -> Revert("Reentrancy")
    locked = true

_unlock():
    locked = false
```

Every state-changing method calls `_nonReentrant()` at entry and `_unlock()` at exit.

#### Checks-Effects-Interactions (CEI) Pattern

All write methods follow CEI strictly:
```
1. CHECKS:        Validate inputs, check balances, verify permissions
2. EFFECTS:       Update storage (shares, deposits, debt, accumulators)
3. INTERACTIONS:  External calls (transferFrom, transfer to user)
```

#### SafeMath (Overflow Protection)

All arithmetic uses `SafeMath.add()`, `SafeMath.sub()`, `SafeMath.mul()`, `SafeMath.div()`. These revert on overflow/underflow/division-by-zero for u256 operations.

#### Withdrawal Cooldown
```
_checkCooldown(user):
    cooldown = cooldownBlocks.value         // configurable, default 6 blocks (~1hr)
    if cooldown == 0 -> return              // disabled
    lastDeposit = userLastDepositBlock[user]
    if lastDeposit == 0 -> return           // never deposited
    unlockBlock = lastDeposit + cooldown
    if currentBlock < unlockBlock -> Revert("Withdrawal cooldown active")
```

#### Pause Mechanism

- `pause()` / `unpause()` — owner-only toggle
- `_whenNotPaused()` guard on: deposit, withdraw, claimRevenue, autoCompound
- `emergencyWithdraw()` works even when paused
- `collectFees()` works even when paused

#### Access Control

- `_onlyOwner()`: checks `Blockchain.tx.sender === owner` for admin methods
- Owner is set to `Blockchain.tx.origin` during deployment
- No ownership transfer function (immutable owner)

### 2.5 Event System

The RevenueVault emits these event types:

| Event | Fields | Emitted By |
|-------|--------|-----------|
| `Deposit` | user, amount, shares | `_deposit()` |
| `Withdraw` | user, shares, amountOut | `_withdraw()` |
| `ClaimRevenue` | user, amount | `_claimRevenue()`, `_withdraw()`, `_settleRevenue()` |
| `CollectFees` | sender, amount, protocolCut | `_collectFees()` |
| `AutoCompound` | user, revenue, newShares | `_autoCompound()` |
| `EmergencyWithdraw` | user, shares, amountOut | `_emergencyWithdraw()` |
| `Paused` | account | `_pause()` |
| `Unpaused` | account | `_unpause()` |
| `MinimumDepositChanged` | newAmount | `_setMinimumDeposit()` |
| `ProtocolFeeChanged` | newBps | `_setProtocolFee()` |
| `FeeRecipientChanged` | newRecipient | `_setProtocolFeeRecipient()` |
| `CooldownChanged` | newBlocks | `_setCooldownBlocks()` |

---

## 3. FeeRouter Contract

### 3.1 Purpose

The FeeRouter solves the trust problem: instead of protocol fees going to a team wallet (which looks like a rug), fees go to a **contract** that splits them trustlessly on-chain.

```
Without FeeRouter:
  Vault fees ──► Team's personal wallet ──► "trust us we'll distribute"

With FeeRouter:
  Vault fees ──► FeeRouter contract ──► 90% to RVT stakers (automatic)
                                    ──► 10% to team wallet (automatic)
```

### 3.2 Storage Layout

```
Pointer   Type           Variable           Description
-----------------------------------------------------------------
0         StoredAddress  owner              Contract deployer / admin
1         StoredAddress  rvtVault           RVT Vault contract address
2         StoredAddress  teamWallet         Team wallet address
3         StoredU256     teamBps            Team cut in basis points (default 1000 = 10%)
4         StoredBoolean  locked             Reentrancy guard mutex
5         StoredU256     totalDistributed   Lifetime tokens distributed
```

### 3.3 Core Method: distribute(token)

**Permissionless** — anyone can call this.

```
distribute(tokenAddress):
  1. _nonReentrant()
  2. require rvtVault is set
  3. require teamWallet is set
  4. balance = token.balanceOf(FeeRouter)        // how much FeeRouter holds
  5. require balance > 0
  6. teamAmount = balance * teamBps / 10000      // 10% default
  7. vaultAmount = balance - teamAmount           // 90% default
  8. token.transfer(teamWallet, teamAmount)       // send team cut
  9. token.approve(rvtVault, vaultAmount)         // approve RVT vault
  10. rvtVault.distributeReward(token, vaultAmount) // push to RVT vault
  11. totalDistributed += balance
  12. _unlock()
```

### 3.4 Cross-Contract Call Chain

When `distribute(MOTO)` is called:

```
Caller ──► FeeRouter.distribute(MOTO_address)
               |
               ├── FeeRouter calls MOTO.balanceOf(FeeRouter) ──► returns 50 MOTO
               |
               ├── FeeRouter calls MOTO.transfer(teamWallet, 5 MOTO)
               |
               ├── FeeRouter calls MOTO.approve(rvtVault, 45 MOTO)
               |
               └── FeeRouter calls RVT_Vault.distributeReward(MOTO, 45 MOTO)
                       |
                       └── RVT Vault calls MOTO.transferFrom(FeeRouter, rvtVault, 45 MOTO)
                           RVT Vault updates rewardAccumulator0
                           Now all RVT stakers have pending MOTO rewards
```

**Key**: `Blockchain.tx.sender` in the RVT vault's `distributeReward` is the FeeRouter contract (not the original caller). The FeeRouter approves the vault beforehand, so `transferFrom` succeeds.

### 3.5 Admin Methods

| Method | Description |
|--------|------------|
| `setRvtVault(addr)` | Set RVT vault address (one-time setup) |
| `setTeamWallet(addr)` | Set team wallet address |
| `setTeamBps(bps)` | Set team cut 0-3000 bps (max 30%, default 10%) |

### 3.6 Why Permissionless Distribution

`distribute()` has no access control because:
- Money always goes to the same places (team + RVT vault) — hardcoded in contract
- The caller gets nothing — they just pay gas
- No one can redirect funds — the split is on-chain
- Prevents hostage situation — team can't withhold fees from stakers
- Anyone (user, bot, keeper) can trigger payouts at any time

---

## 4. User Flows (with ASCII Diagrams)

### 4.1 Deposit Flow

The user deposits OP20 tokens into a vault and receives proportional shares. This is a **two-transaction** process: always approve then deposit (MotoSwap pattern).

```
 User            DepositForm        useTransaction      OPNet SDK         OP20 Token      RevenueVault
  |                   |                   |                  |                  |                |
  | Enter amount      |                   |                  |                  |                |
  |------------------>|                   |                  |                  |                |
  |                   | previewDeposit()  |                  |                  |                |
  |                   |------------------------------------->(simulate)------->|                |
  |                   |<-------------------------------------| shares preview  |                |
  |                   |                   |                  |                  |                |
  | Click "Deposit"   |                   |                  |                  |                |
  |------------------>|                   |                  |                  |                |
  |                   |                   |                  |                  |                |
  |                   | STEP 1: APPROVE (always, MotoSwap pattern)             |                |
  |                   | execute(          |                  |                  |                |
  |                   |  increaseAllow.)  |                  |                  |                |
  |                   |------------------>|                  |                  |                |
  |                   |                   | simulateFn()     |                  |                |
  |                   |                   |----------------->| increaseAllowance(vault, amount) |
  |                   |                   |                  |----------------->|                |
  |                   |                   |                  |<-----------------| CallResult     |
  |                   |                   | sendTransaction  |                  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast |                |
  |                   |                   |<-----------------| txId             |                |
  |                   |                   |                  |                  |                |
  |                   | STEP 2: DEPOSIT (ignoreRevert — approve is in mempool) |                |
  |                   | execute(deposit)  |                  |                  |                |
  |                   |------------------>|                  |                  |                |
  |                   |                   | simulateFn()     |                  |                |
  |                   |                   |----------------->| vault.deposit(amount)             |
  |                   |                   |                  |---------------------------------->|
  |                   |                   |                  |                  |                |
  |                   |                   |                  |   CONTRACT LOGIC:                |
  |                   |                   |                  |   1. _whenNotPaused()            |
  |                   |                   |                  |   2. _nonReentrant()             |
  |                   |                   |                  |   3. validate amount > 0         |
  |                   |                   |                  |   4. check minimumDeposit        |
  |                   |                   |                  |   5. _settleRevenue(sender)      |
  |                   |                   |                  |   6. calc shares to mint         |
  |                   |                   |                  |   7. update storage              |
  |                   |                   |                  |   8. transferFrom(sender, vault) |
  |                   |                   |                  |   9. emit Deposit event          |
  |                   |                   |                  |   10. _unlock()                  |
  |                   |                   |                  |                  |                |
  |                   |                   | sendTransaction(ignoreRevert:true) |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast |                |
  |                   |                   |                  |                  |                |
  |                   |                   | pollConfirmation (wait for block)  |                |
  |                   |                   |<-----------------| confirmed        |                |
  |                   |<------------------| success          |                  |                |
  |<------------------| "Deposit success" |                  |                  |                |
```

**Why always approve?** Bitcoin blocks take ~10 minutes. The RPC can return stale allowance data — checking `allowance()` before deciding to approve is unreliable and causes intermittent failures. The MotoSwap pattern (always approve + ignoreRevert on deposit) is the only reliable approach.

**Share calculation:**
```
if totalShares == 0:
    sharesToMint = amount                           // 1:1 for first depositor
else:
    sharesToMint = (amount * totalShares) / totalDeposited  // proportional
```

### 4.2 Withdraw Flow

Burns shares to retrieve tokens. Pending revenue and external rewards are **automatically claimed**.

```
 User            WithdrawForm       useTransaction      OPNet SDK        RevenueVault
  |                   |                   |                  |                |
  | Enter shares      |                   |                  |                |
  |------------------>|                   |                  |                |
  |                   | previewWithdraw() |                  |                |
  |                   |------------------------------------->(simulate)----->|
  |                   |<-------------------------------------| amountOut     |
  |                   |                   |                  |                |
  | Click "Withdraw"  |                   |                  |                |
  |------------------>|                   |                  |                |
  |                   | execute(withdraw) |                  |                |
  |                   |------------------>|                  |                |
  |                   |                   |----------------->| vault.withdraw(shares)
  |                   |                   |                  |--------------->|
  |                   |                   |                  |                |
  |                   |                   |                  |  CONTRACT LOGIC:
  |                   |                   |                  |  1. _whenNotPaused()
  |                   |                   |                  |  2. _nonReentrant()
  |                   |                   |                  |  3. validate shares
  |                   |                   |                  |  4. _checkCooldown(sender)
  |                   |                   |                  |  5. AUTO-CLAIM vault revenue
  |                   |                   |                  |  6. AUTO-CLAIM external rewards
  |                   |                   |                  |  7. calc amountOut
  |                   |                   |                  |  8. burn shares, update storage
  |                   |                   |                  |  9. transfer amountOut to user
  |                   |                   |                  |  10. emit Withdraw event
  |                   |                   |                  |  11. _unlock()
  |                   |                   |                  |                |
  |                   |                   |<-----------------| CallResult     |
  |                   |                   | sendTransaction  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast
  |                   |                   |<-----------------| txId           |
  |                   |<------------------| success          |                |
  |<------------------| "Withdraw success"|                  |                |
```

**Token output:** `amountOut = (sharesToBurn * totalDeposited) / totalShares`

### 4.3 Claim Revenue Flow

Claim accumulated vault revenue without touching deposit or shares.

```
 User              ClaimCard         useTransaction      OPNet SDK        RevenueVault
  |                   |                   |                  |                |
  | Click "Claim"     |                   |                  |                |
  |------------------>|                   |                  |                |
  |                   | execute(          |                  |                |
  |                   |  claimRevenue)    |                  |                |
  |                   |------------------>|                  |                |
  |                   |                   |----------------->| vault.claimRevenue()
  |                   |                   |                  |--------------->|
  |                   |                   |                  |  1. _whenNotPaused()
  |                   |                   |                  |  2. _nonReentrant()
  |                   |                   |                  |  3. calc pending revenue
  |                   |                   |                  |  4. require pending > 0
  |                   |                   |                  |  5. set debt = accumulator
  |                   |                   |                  |  6. transfer pending to sender
  |                   |                   |                  |  7. emit ClaimRevenue
  |                   |                   |                  |  8. _unlock()
  |                   |                   |<-----------------| CallResult     |
  |                   |                   | sendTransaction  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast
  |<------------------| "Claim success"   |                  |                |
```

### 4.4 Claim All External Rewards Flow (RVT Vault)

RVT stakers claim MOTO + PILL rewards in a single transaction.

```
 User              ClaimCard         useTransaction      OPNet SDK        RVT Vault
  |                   |                   |                  |                |
  | Click "Claim      |                   |                  |                |
  |  All Rewards"     |                   |                  |                |
  |------------------>|                   |                  |                |
  |                   | execute(          |                  |                |
  |                   |  claimAllRewards) |                  |                |
  |                   |------------------>|                  |                |
  |                   |                   |----------------->| vault.claimAllRewards()
  |                   |                   |                  |--------------->|
  |                   |                   |                  |  1. _nonReentrant()
  |                   |                   |                  |  2. For reward slot 0 (MOTO):
  |                   |                   |                  |     pending0 = calc from accumulator0
  |                   |                   |                  |     if pending0 > 0:
  |                   |                   |                  |       transfer MOTO to user
  |                   |                   |                  |       update userRewardDebt0
  |                   |                   |                  |  3. For reward slot 1 (PILL):
  |                   |                   |                  |     pending1 = calc from accumulator1
  |                   |                   |                  |     if pending1 > 0:
  |                   |                   |                  |       transfer PILL to user
  |                   |                   |                  |       update userRewardDebt1
  |                   |                   |                  |  4. _unlock()
  |                   |                   |<-----------------| reward0, reward1
  |                   |                   | sendTransaction  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast
  |<------------------| "Rewards claimed" |                  |                |
```

### 4.5 Auto-Compound Flow

Reinvest pending revenue as additional vault shares.

```
autoCompound():
  1. _whenNotPaused()
  2. _nonReentrant()
  3. pending = _pendingRevenue(sender)
  4. require pending > 0
  5. newShares = (pending * totalShares) / totalDeposited
  6. set debt = accumulator
  7. add newShares to userShares + totalShares
  8. add pending to userDeposited + totalDeposited
  9. NO token transfer (stays in vault)
  10. emit AutoCompound event
  11. _unlock()
```

### 4.6 Emergency Withdraw Flow

Available even when paused. Burns ALL user shares. **Pending revenue AND external rewards are forfeited.**

```
emergencyWithdraw():
  (NO _whenNotPaused — works when paused!)
  1. _nonReentrant()
  2. require userShares > 0
  3. Settle external rewards (MOTO, PILL sent to user)
  4. amountOut = (userShares * totalDeposited) / totalShares
  5. WIPE user state (shares, deposited, debt all set to 0)
  6. sub shares from totalShares, amountOut from totalDeposited
  7. transfer amountOut to sender
  8. emit EmergencyWithdraw event
  9. _unlock()
```

### 4.7 Collect Fees Flow

Anyone can inject revenue tokens into the vault. A protocol fee is skimmed and sent to the fee recipient (FeeRouter).

```
collectFees(amount):
  1. _nonReentrant()
  2. require amount > 0, totalShares > 0
  3. protocolCut = amount * feeBps / 10000
  4. distributed = amount - protocolCut
  5. ACCUMULATOR UPDATE:
     perShareIncrease = (distributed * 1e18) / totalShares
     accumulator += perShareIncrease
  6. totalFees += amount
  7. transferFrom(caller, vault, amount)
  8. if protocolCut > 0: transfer(feeRecipient, protocolCut)
  9. emit CollectFees event
  10. _unlock()
```

### 4.8 FeeRouter Distribute Flow

```
 Anyone           Frontend/Bot       OPNet SDK          FeeRouter       MOTO Token      RVT Vault
  |                   |                  |                  |                |                |
  | Click "Distribute"|                  |                  |                |                |
  |------------------>|                  |                  |                |                |
  |                   |----------------->| distribute(MOTO) |                |                |
  |                   |                  |----------------->|                |                |
  |                   |                  |                  |                |                |
  |                   |                  |                  | balanceOf(self)|                |
  |                   |                  |                  |--------------->|                |
  |                   |                  |                  |<---------------| 50 MOTO        |
  |                   |                  |                  |                |                |
  |                   |                  |                  | teamCut = 5    |                |
  |                   |                  |                  | vaultCut = 45  |                |
  |                   |                  |                  |                |                |
  |                   |                  |                  | transfer(team, 5)               |
  |                   |                  |                  |--------------->|                |
  |                   |                  |                  |                |                |
  |                   |                  |                  | approve(rvtVault, 45)           |
  |                   |                  |                  |--------------->|                |
  |                   |                  |                  |                |                |
  |                   |                  |                  | distributeReward(MOTO, 45)      |
  |                   |                  |                  |------------------------------->|
  |                   |                  |                  |                |                |
  |                   |                  |                  |                | transferFrom   |
  |                   |                  |                  |                |<---------------| (pulls 45 MOTO)
  |                   |                  |                  |                |                |
  |                   |                  |                  |                | update         |
  |                   |                  |                  |                | accumulator0   |
  |                   |                  |<-----------------| distributed    |                |
  |                   |<-----------------| success          |                |                |
  |<------------------| "Distribution    |                  |                |                |
  |                   |  complete"       |                  |                |                |
```

---

## 5. Revenue Distribution Algorithm (Detailed)

### 5.1 The Accumulator Model

**State variables:**

```
revenuePerShareAccumulator   (global, scaled by 1e18)
userRevenueDebt[user]        (per-user snapshot of accumulator)
userShares[user]             (per-user share balance)
```

### 5.2 Step-by-Step Math with Example

**Initial State:**
```
totalShares = 0, totalDeposited = 0, accumulator = 0
```

**Step 1: Alice deposits 100 tokens**
```
sharesToMint = 100   (first depositor, 1:1)
totalShares = 100, totalDeposited = 100
userShares[A] = 100, userDebt[A] = 0
```

**Step 2: Bob deposits 50 tokens**
```
sharesToMint = (50 * 100) / 100 = 50
totalShares = 150, totalDeposited = 150
userShares[B] = 50, userDebt[B] = 0
```

**Step 3: 30 tokens of fees collected (5% protocol fee)**
```
protocolCut = 30 * 500 / 10000 = 1.5 tokens → sent to FeeRouter
distributed = 28.5 tokens

perShareIncrease = (28.5 * 1e18) / 150 = 190000000000000000
accumulator = 190000000000000000
```

**Step 4: Alice checks pending**
```
pending[A] = (100 * (190000000000000000 - 0)) / 1e18 = 19.0 tokens
(100/150 = 66.7% of 28.5 = 19.0)
```

**Step 5: Bob checks pending**
```
pending[B] = (50 * (190000000000000000 - 0)) / 1e18 = 9.5 tokens
(50/150 = 33.3% of 28.5 = 9.5)
Verification: 19.0 + 9.5 = 28.5 ✓
```

**Step 6: Alice claims (19.0 tokens)**
```
userDebt[A] = 190000000000000000  (set to current accumulator)
userClaimedRevenue[A] += 19.0
transfer 19.0 tokens from vault to Alice
```

**Step 7: Another 15 tokens of fees arrive**
```
protocolCut = 0.75, distributed = 14.25
perShareIncrease = (14.25 * 1e18) / 150 = 95000000000000000
accumulator = 285000000000000000
```

**Step 8: Alice checks again**
```
pending[A] = (100 * (285000000000000000 - 190000000000000000)) / 1e18 = 9.5 tokens
(Only new fees — she already claimed the first batch)
```

### 5.3 What Happens During Key Operations

| Operation | Accumulator Effect | Debt Effect |
|-----------|-------------------|-------------|
| `collectFees()` | accumulator += (distributed * 1e18) / totalShares | No change |
| `deposit()` | No change (settleRevenue auto-claims first) | debt = accumulator |
| `withdraw()` | No change (auto-claims first) | debt = accumulator (or 0) |
| `claimRevenue()` | No change | debt = accumulator |
| `autoCompound()` | No change | debt = accumulator |
| `emergencyWithdraw()` | No change | debt = 0 (wiped) |

---

## 6. Fee Flow: End-to-End

### 6.1 Complete Protocol Fee Flow

```
Step 1: User deposits 1000 MOTO into MOTO Vault
        ├── 950 MOTO stays in vault (for depositors)
        └── 50 MOTO sent to FeeRouter (5% protocol fee)

Step 2: FeeRouter now holds 50 MOTO

Step 3: Anyone calls distribute(MOTO_token_address)
        ├── FeeRouter checks balance: 50 MOTO
        ├── Team cut (10%): 5 MOTO → team wallet
        └── Vault cut (90%): 45 MOTO → RVT Vault via distributeReward()

Step 4: RVT Vault updates MOTO reward accumulator
        All RVT stakers now have pending MOTO rewards

Step 5: RVT staker (holding 20% of staked RVT) calls claimAllRewards()
        └── Receives 9 MOTO (20% of 45)
```

### 6.2 Multi-Vault Revenue Example (Monthly)

| Source | Monthly Fees | Protocol Cut (5%) | → RVT Stakers (90%) | → Team (10%) |
|--------|-------------|-------------------|---------------------|--------------|
| MOTO Vault | 10,000 MOTO | 500 MOTO | 450 MOTO | 50 MOTO |
| PILL Vault | 6,000 PILL | 300 PILL | 270 PILL | 30 PILL |
| RVT Vault | 4,000 RVT | 200 RVT | 180 RVT | 20 RVT |

**If you hold 20% of total staked RVT:**
- 90 MOTO + 54 PILL + 36 RVT per month

### 6.3 Why This Model Works

1. **No sell pressure** — Protocol never sells MOTO or PILL. They flow directly to RVT stakers.
2. **Aligned incentives** — Team earns by holding RVT (same as every staker) + 10% protocol cut.
3. **Sustainable** — Revenue comes from vault activity, not inflation or emissions.
4. **Trustless** — FeeRouter is on-chain. No admin can redirect fees. Anyone can trigger distribution.

---

## 7. Contract Method Reference

### 7.1 RevenueVault — Write Methods

| # | Method | Params | Returns | Access | Description |
|---|--------|--------|---------|--------|------------|
| 1 | `deposit` | amount: uint256 | success: bool | Public* | Deposit tokens, receive shares |
| 2 | `withdraw` | shares: uint256 | amountOut: uint256 | Public* | Burn shares, get tokens + auto-claim |
| 3 | `claimRevenue` | (none) | claimed: uint256 | Public* | Claim vault revenue |
| 4 | `autoCompound` | (none) | newShares: uint256 | Public* | Reinvest revenue as shares |
| 5 | `collectFees` | amount: uint256 | success: bool | Anyone | Inject revenue for distribution |
| 6 | `emergencyWithdraw` | (none) | amountOut: uint256 | Anyone** | Exit all shares |
| 7 | `distributeReward` | token: address, amount: uint256 | success: bool | Anyone | Distribute external reward token |
| 8 | `claimAllRewards` | (none) | reward0, reward1: uint256 | Public | Claim all external rewards |

*Public = requires wallet, affected by pause. **Anyone = works when paused.

### 7.2 RevenueVault — Admin Methods (Owner Only)

| # | Method | Params | Returns | Description |
|---|--------|--------|---------|------------|
| 9 | `pause` | (none) | success: bool | Pause vault |
| 10 | `unpause` | (none) | success: bool | Unpause vault |
| 11 | `setMinimumDeposit` | amount: uint256 | success: bool | Set min deposit (default 1e18) |
| 12 | `setProtocolFee` | bps: uint256 | success: bool | Set fee 0-2000 bps (max 20%) |
| 13 | `setProtocolFeeRecipient` | recipient: address | success: bool | Set fee recipient |
| 14 | `setCooldownBlocks` | blocks: uint256 | success: bool | Set cooldown 0-144 blocks |
| 15 | `setDepositToken` | token: address | success: bool | Set accepted OP20 token |
| 16 | `addRewardToken` | token: address | success: bool | Register external reward token (max 2) |

### 7.3 RevenueVault — View Methods

| # | Method | Params | Returns | Description |
|---|--------|--------|---------|------------|
| 17 | `getVaultInfo` | (none) | totalDeposited, totalShares, totalFees, accumulator | Global stats |
| 18 | `getUserInfo` | user: address | shares, deposited, pendingRevenue, totalClaimed | User position |
| 19 | `previewDeposit` | amount: uint256 | shares: uint256 | Preview shares for deposit |
| 20 | `previewWithdraw` | shares: uint256 | amountOut: uint256 | Preview tokens for withdrawal |
| 21 | `getOwner` | (none) | owner: address | Contract owner |
| 22 | `isPaused` | (none) | paused: bool | Pause status |
| 23 | `getMinimumDeposit` | (none) | minimumDeposit: uint256 | Min deposit threshold |
| 24 | `getDepositToken` | (none) | depositToken: address | Accepted token |
| 25 | `getProtocolInfo` | (none) | feeBps, feeRecipient, totalProtocolFees, cooldownBlocks | Protocol config |
| 26 | `getRewardInfo` | (none) | count, token0, totalDistributed0, token1, totalDistributed1 | Reward config |
| 27 | `getUserRewardInfo` | user: address | pending0, pending1: uint256 | User pending rewards |

**Total RevenueVault: 27 methods** (8 write + 8 admin + 11 view)

### 7.4 FeeRouter — All Methods

| # | Method | Params | Returns | Access | Description |
|---|--------|--------|---------|--------|------------|
| 1 | `distribute` | token: address | distributed: uint256 | **Anyone** | Split balance: 90% RVT vault, 10% team |
| 2 | `setRvtVault` | vault: address | success: bool | Owner | Set RVT vault address |
| 3 | `setTeamWallet` | wallet: address | success: bool | Owner | Set team wallet |
| 4 | `setTeamBps` | bps: uint256 | success: bool | Owner | Set team cut 0-3000 bps (max 30%) |
| 5 | `getConfig` | (none) | owner, rvtVault, teamWallet, teamBps, totalDistributed | View | Get config |
| 6 | `getOwner` | (none) | owner: address | View | Contract owner |

**Total FeeRouter: 6 methods** (1 write + 3 admin + 2 view)

---

## 8. Frontend Component Map

### 8.1 Page Architecture

```
App
 |
 +-- VaultProvider (multi-vault context, persists selection to localStorage)
 |    |
 |    +-- Layout (Header, Navigation, WalletConnect)
 |         |
 |         +-- Vaults (/)
 |         |    |-- VaultCard × 3       reads: getVaultInfo() per vault
 |         |    |-- Protocol specs      static display
 |         |    +-- selectVault()       sets context, navigates to Dashboard
 |         |
 |         +-- Dashboard (/dashboard)
 |         |    |-- VaultStats          reads: getVaultInfo(), getProtocolInfo()
 |         |    |-- VaultGauge × 2      reads: userShares / totalShares, revenue earned
 |         |    |-- "Your Position"     reads: getUserInfo()
 |         |    |-- ClaimCard           calls: claimRevenue(), autoCompound(), claimAllRewards()
 |         |    +-- Quick Actions       navigates to Deposit/Claim/Withdraw/Admin
 |         |
 |         +-- Deposit (/deposit)
 |         |    |-- DepositForm         calls: token.increaseAllowance(), vault.deposit()
 |         |    |                       reads: previewDeposit(), token.balanceOf()
 |         |    +-- VaultStats          reads: getVaultInfo(), getProtocolInfo()
 |         |
 |         +-- Withdraw (/withdraw)
 |         |    |-- WithdrawForm        calls: vault.withdraw(), vault.emergencyWithdraw()
 |         |    |                       reads: previewWithdraw(), getUserInfo()
 |         |    +-- VaultStats
 |         |
 |         +-- Claim (/claim)
 |         |    +-- ClaimCard           calls: claimRevenue(), autoCompound(), claimAllRewards()
 |         |
 |         +-- Tokenomics (/tokenomics)
 |         |    |-- Fee flow diagram    static (no vault selection needed)
 |         |    |-- Why RVT section
 |         |    |-- Revenue example table
 |         |    |-- Protocol specs
 |         |    +-- On-chain features
 |         |
 |         +-- Admin (/admin)
 |              |-- VaultStats
 |              |-- Pause/Unpause       calls: vault.pause(), vault.unpause()
 |              |-- Set Min Deposit     calls: vault.setMinimumDeposit()
 |              |-- Set Protocol Fee    calls: vault.setProtocolFee()
 |              |-- Set Fee Recipient   calls: vault.setProtocolFeeRecipient()
 |              |-- Set Cooldown        calls: vault.setCooldownBlocks()
 |              |-- Set Deposit Token   calls: vault.setDepositToken()
 |              |-- Add Reward Token    calls: vault.addRewardToken()
 |              |-- Collect Fees        calls: token.increaseAllowance(), vault.collectFees()
 |              |-- Distribute Reward   calls: rewardToken.increaseAllowance(), vault.distributeReward()
 |              +-- Fee Router          calls: feeRouter.setRvtVault(), setTeamWallet(), distribute()
 |
 +-- Hooks
      |-- useVaultContract()   Creates typed vault + token proxies for selected vault
      |-- useVaultData()       Polls every 15s: vaultInfo, userInfo, protocolInfo, rewardInfo, balance
      |-- useAllVaultsData()   Fetches getVaultInfo() for all vaults (Vaults page overview)
      +-- useTransaction()     Simulate → send lifecycle with confirming state
```

### 8.2 Hook Responsibilities

| Hook | Purpose | Depends On |
|------|---------|-----------|
| `useVaultContract` | Creates typed IVaultContract + IOP20Contract proxies using `getContract()` from opnet SDK | WalletConnect provider, network, selectedVault |
| `useVaultData` | Polls vault state every 15s. Returns vaultInfo, userInfo, protocolInfo, rewardInfo, userRewardInfo, tokenBalance, tokenMismatch | useVaultContract, walletAddress |
| `useAllVaultsData` | Fetches getVaultInfo() for all configured vaults. Used by Vaults page for overview cards | WalletConnect network |
| `useTransaction` | State machine for simulate→send flow. States: idle→simulating→pending→confirming→success/error. Supports ignoreRevert and waitForConfirmation | WalletConnect walletAddress + network |

### 8.3 VaultContext

```typescript
interface VaultContextValue {
    selectedVault: VaultEntry | null;    // Currently selected vault
    availableVaults: readonly VaultEntry[];  // All vaults for current network
    selectVault: (id: string) => void;   // Switch vault by id
}
```

Selection persisted to `localStorage` under key `rvault-selected-vault`.

---

## 9. Deployment Flow

### 9.1 Contract Compilation

```
# RevenueVault (used for all 3 vaults)
cd contracts
npm install
npm run build              # → build/contract.wasm

# FeeRouter
npm run build:feerouter    # → build/FeeRouter.wasm

# RVT Token
cd ../token
npm install
npm run build              # → build/contract.wasm
```

### 9.2 Deployment Order

```
Step 1: Deploy RVT Token (OP20, fixed supply 100M)
Step 2: Deploy RevenueVault.wasm × 3 (MOTO, PILL, RVT vaults)
Step 3: Deploy FeeRouter.wasm × 1
```

### 9.3 Post-Deployment Configuration

```
┌───┬────────────────────────────────────────────────────────┬──────────┐
│ # │ Action                                                 │ Required │
├───┼────────────────────────────────────────────────────────┼──────────┤
│   │ FOR EACH VAULT (MOTO, PILL, RVT):                     │          │
│ 1 │ setDepositToken(token_address)                         │ YES      │
│ 2 │ setProtocolFee(500)  — 5% = 500 bps                   │ Optional │
│   │                                                        │          │
│   │ FOR MOTO + PILL VAULTS:                                │          │
│ 3 │ setProtocolFeeRecipient(FeeRouter_address)             │ YES      │
│   │                                                        │          │
│   │ FOR RVT VAULT:                                         │          │
│ 4 │ setProtocolFeeRecipient(FeeRouter_address)             │ YES      │
│ 5 │ addRewardToken(MOTO_token_address)                     │ YES      │
│ 6 │ addRewardToken(PILL_token_address)                     │ YES      │
│   │                                                        │          │
│   │ FOR FEEROUTER:                                         │          │
│ 7 │ setRvtVault(RVT_vault_address)                         │ YES      │
│ 8 │ setTeamWallet(team_wallet_address)                     │ YES      │
│   │ setTeamBps(1000) — 10% default, already set            │ Optional │
└───┴────────────────────────────────────────────────────────┴──────────┘
```

### 9.4 Frontend Configuration

After deploying contracts, update `frontend/src/config/contracts.ts`:

```typescript
const NETWORK_VAULTS: Map<string, NetworkVaults> = new Map([
    ['testnet', {
        feeRouter: '<FEEROUTER_ADDRESS>',
        vaults: [
            { id: 'moto', vault: '<MOTO_VAULT>', depositToken: '<MOTO_TOKEN>', ... },
            { id: 'pill', vault: '<PILL_VAULT>', depositToken: '<PILL_TOKEN>', ... },
            { id: 'rvt',  vault: '<RVT_VAULT>',  depositToken: '<RVT_TOKEN>',  ... },
        ],
    }],
]);
```

### 9.5 End-to-End Sequence

```
Deployer                 Bitcoin L1 (OPNet)              Frontend
   |                          |                             |
   | 1. Deploy RVT Token      |                             |
   |------------------------->|                             |
   |                          |                             |
   | 2. Deploy Vault × 3      |                             |
   |------------------------->|                             |
   |                          |                             |
   | 3. Deploy FeeRouter       |                             |
   |------------------------->|                             |
   |                          |                             |
   | 4. Configure all contracts (8 transactions)            |
   |------------------------->|                             |
   |                          |                             |
   | 5. Update contracts.ts + push to GitHub                |
   |------------------------------------------------------>|
   |                          |                             |
   | 6. Vercel auto-deploys                                 |
   |                          |                             |
   |                          |      7. Users connect       |
   |                          |      wallets & deposit      |
   |                          |<----------------------------|
   |                          |                             |
   |   8. Fees accumulate in FeeRouter                      |
   |                          |                             |
   |   9. Anyone calls distribute() — fees flow to stakers  |
   |------------------------->|                             |
   |                          |   RVT stakers see pending   |
   |                          |   MOTO + PILL + RVT rewards |
   |                          |<----------------------------|
```

---

## Appendix A: Constants

| Constant | Value | Description |
|----------|-------|------------|
| `PRECISION` | 1e18 | Scaling factor for accumulator math |
| `DEFAULT_MIN_DEPOSIT` | 1e18 | 1.0 tokens (18 decimals) |
| `DEFAULT_COOLDOWN_BLOCKS` | 6 | ~1 hour on Bitcoin (~10 min/block) |
| `DEFAULT_PROTOCOL_FEE_BPS` | 500 | 5% (500 basis points) |
| `DEFAULT_TEAM_BPS` | 1000 | 10% (FeeRouter team cut) |
| `MAX_TEAM_BPS` | 3000 | 30% (FeeRouter max cap) |
| `BPS_DENOMINATOR` | 10000 | 100% in basis points |
| `MAX_REWARD_TOKENS` | 2 | External reward token limit |
| `MAX_SAT_TO_SPEND` | 1,000,000 | 0.01 BTC safety cap (frontend) |
| `POLL_INTERVAL` | 15,000 ms | Frontend data refresh interval |
| `CONFIRM_TIMEOUT` | 900,000 ms | 15 min tx confirmation timeout |

## Appendix B: Error Messages

| Error | Method(s) | Cause |
|-------|-----------|-------|
| `Only owner` | All admin methods | Non-owner called admin function |
| `Vault is paused` | deposit, withdraw, claim, compound | Vault is paused |
| `Reentrancy` | All write methods | Reentrant call detected |
| `Deposit amount must be > 0` | deposit | Zero amount |
| `First deposit must be >= minimum` | deposit | Below minimumDeposit |
| `Deposit too small for shares` | deposit | Rounds to 0 shares |
| `Fee amount must be > 0` | collectFees | Zero fee amount |
| `No shares exist to distribute fees` | collectFees | No depositors |
| `No revenue to claim` | claimRevenue | Zero pending |
| `Shares must be > 0` | withdraw | Zero shares |
| `Insufficient shares` | withdraw | More than owned |
| `Withdrawal cooldown active` | withdraw | Too soon after deposit |
| `No shares to withdraw` | emergencyWithdraw | No position |
| `No revenue to compound` | autoCompound | Zero pending |
| `Already paused` | pause | Already paused |
| `Not paused` | unpause | Not paused |
| `Fee too high (max 20%)` | setProtocolFee | bps > 2000 |
| `Cooldown too long (max 144)` | setCooldownBlocks | blocks > 144 |
| `Max reward tokens reached` | addRewardToken | Already 2 tokens |
| `RVT vault not set` | FeeRouter.distribute | rvtVault is zero |
| `Team wallet not set` | FeeRouter.distribute | teamWallet is zero |
| `No balance to distribute` | FeeRouter.distribute | Zero token balance |
| `Team bps too high` | FeeRouter.setTeamBps | bps > 3000 |

## Appendix C: Cross-Contract Calls

### RevenueVault Cross-Contract Calls

**1. `transferFrom(sender, vault, amount)` — Pull tokens in**
```
Used by: deposit(), collectFees(), distributeReward()
Requires: sender has approved vault for >= amount
```

**2. `transfer(recipient, amount)` — Push tokens out**
```
Used by: withdraw(), claimRevenue(), emergencyWithdraw(),
         collectFees() (protocol cut to feeRecipient),
         claimAllRewards() (external rewards to user)
```

### FeeRouter Cross-Contract Calls

**1. `balanceOf(self)` — Check own token balance**
```
Used by: distribute()
Calls OP20 token contract to check how much FeeRouter holds
```

**2. `transfer(teamWallet, amount)` — Send team cut**
```
Used by: distribute()
Sends team percentage directly to team wallet
```

**3. `approve(rvtVault, amount)` — Approve RVT vault to pull tokens**
```
Used by: distribute()
FeeRouter approves RVT vault before calling distributeReward
```

**4. `distributeReward(token, amount)` — Push rewards to RVT vault**
```
Used by: distribute()
Cross-contract call to RVT vault. Blockchain.tx.sender = FeeRouter address.
RVT vault calls transferFrom(FeeRouter, self, amount) using the approval.
```

---

*RVault Protocol — Multi-vault revenue sharing on Bitcoin L1 via OPNet*
*Contracts: RevenueVault.ts + FeeRouter.ts | Token: RVT (OP20) | Frontend: React 19 + OPNet SDK*
