# RVault Protocol -- Comprehensive Flow Document

> **Revenue-sharing vault on Bitcoin L1, powered by OPNet.**
> Deposit OP20 tokens, earn proportional protocol fees, claim or auto-compound revenue.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Smart Contract Design](#2-smart-contract-design)
3. [User Flows (with ASCII Diagrams)](#3-user-flows-with-ascii-diagrams)
4. [Revenue Distribution Algorithm](#4-revenue-distribution-algorithm-detailed)
5. [Contract Method Reference](#5-contract-method-reference)
6. [Frontend Component Map](#6-frontend-component-map)
7. [Deployment Flow](#7-deployment-flow)

---

## 1. Architecture Overview

### 1.1 System Topology

```
+------------------------------------------------------------------+
|                         BITCOIN L1                                |
|  +------------------------------------------------------------+  |
|  |                    OPNet Runtime                            |  |
|  |  +------------------------+   +-------------------------+  |  |
|  |  |    RevenueVault.wasm   |   |   OP20 Token (MOTO)     |  |  |
|  |  |  (AssemblyScript-based)|   |   (Standard OP20)       |  |  |
|  |  |                        |<->|                         |  |  |
|  |  |  - deposit()           |   |  - transfer()           |  |  |
|  |  |  - withdraw()          |   |  - transferFrom()       |  |  |
|  |  |  - claimRevenue()      |   |  - increaseAllowance()  |  |  |
|  |  |  - collectFees()       |   |  - balanceOf()          |  |  |
|  |  |  - autoCompound()      |   |                         |  |  |
|  |  |  - emergencyWithdraw() |   +-------------------------+  |  |
|  |  +------------------------+                                |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
         ^                    ^
         | simulate           | sendTransaction
         | (read-only)        | (signer:null, wallet signs)
         |                    |
+------------------------------------------------------------------+
|                    OPNet SDK (opnet npm)                          |
|  getContract<T>(address, ABI, provider, network)                 |
|  - Generates typed proxy from BitcoinInterfaceAbi                |
|  - simulate: call method -> returns CallResult w/ properties     |
|  - sendTransaction: sign via WalletConnect -> broadcast to node  |
+------------------------------------------------------------------+
         ^
         |
+------------------------------------------------------------------+
|                     FRONTEND APPLICATION                          |
|  React 19 + Vite + TypeScript + Tailwind CSS + Framer Motion     |
|                                                                   |
|  Pages:          Hooks:              Components:                  |
|  - Dashboard     - useVaultContract   - DepositForm              |
|  - Deposit       - useVaultData       - WithdrawForm             |
|  - Withdraw      - useTransaction     - ClaimCard                |
|  - Admin                              - VaultStats               |
|                                        - VaultGauge              |
|                                                                   |
|  Wallet: @btc-vision/walletconnect (OP_WALLET, UniSat)          |
+------------------------------------------------------------------+
         ^
         |
+------------------------------------------------------------------+
|                          USER                                     |
|  Browser with OP_WALLET or UniSat Bitcoin wallet extension        |
+------------------------------------------------------------------+
```

### 1.2 Contract Architecture

| Layer           | Technology                                         |
| --------------- | -------------------------------------------------- |
| Blockchain      | Bitcoin L1                                         |
| Smart Contract  | OPNet Runtime (btc-runtime)                        |
| Language        | AssemblyScript (compiles to WASM)                  |
| Token Standard  | OP20 (OPNet's ERC-20 equivalent)                   |
| Base Class      | `OP_NET` from `@btc-vision/btc-runtime/runtime`    |
| Math Library    | `SafeMath` (overflow-safe u256 arithmetic)          |
| Big Integers    | `u256` from `@btc-vision/as-bignum/assembly`       |

The contract is written in AssemblyScript, compiled to WASM, and deployed to Bitcoin L1
via the OPNet runtime. It extends `OP_NET`, which provides the standard contract lifecycle
(`onDeployment`, `callMethod`) and blockchain primitives (`Blockchain.tx.sender`,
`Blockchain.block.numberU256`, `Blockchain.call`).

### 1.3 Frontend Architecture

| Layer             | Technology                                        |
| ----------------- | ------------------------------------------------- |
| Framework         | React 19 with TypeScript                          |
| Bundler           | Vite                                              |
| Styling           | Tailwind CSS + custom CSS variables               |
| Animations        | Framer Motion                                     |
| Wallet Connection | `@btc-vision/walletconnect` (WalletConnect v2)    |
| Contract SDK      | `opnet` (getContract, OP_20_ABI, typed proxies)   |
| Routing           | React Router with animated page transitions        |

### 1.4 How Contract Calls Work (Simulate -> Send Pattern)

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

The `useTransaction` hook encapsulates this entire lifecycle:

```
idle --> simulating --> pending --> success
                   \              \
                    +-> error      +-> error
```

1. `idle` -- button enabled, waiting for user click
2. `simulating` -- `simulateFn()` called, checks if tx would revert
3. If `simulation.revert` exists, transition to `error`
4. `pending` -- `simulation.sendTransaction(...)` called, wallet popup shown
5. `success` -- transaction broadcast, `receipt.transactionId` captured
6. `error` -- any exception caught, error message displayed

---

## 2. Smart Contract Design

### 2.1 Storage Layout

The contract uses OPNet's pointer-based storage. Each `Blockchain.nextPointer` returns
a monotonically increasing `u16` that addresses a unique storage slot.

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
16        StoredU256        cooldownBlocks              Blocks to wait after deposit before withdraw
17        AddressMemoryMap  userLastDepositBlock        user -> block number of last deposit
```

**Storage types:**
- `StoredU256(pointer, EMPTY_POINTER)` -- single u256 value in contract storage
- `StoredAddress(pointer)` -- single Address (Bitcoin taproot address) in storage
- `StoredBoolean(pointer, default)` -- single boolean flag
- `AddressMemoryMap(pointer)` -- mapping from Address -> u256 (key-value store)

### 2.2 Revenue Algorithm (Synthetix-Style Accumulator)

The vault uses a **Synthetix RewardsDistributor-style** global accumulator to efficiently
track revenue entitlements for all depositors without iterating over users.

**Core Concept:**

```
revenuePerShareAccumulator += (newRevenue * PRECISION) / totalShares
```

Each user's pending revenue is:

```
pendingRevenue = (userShares * (accumulator - userDebt)) / PRECISION
```

Where:
- `PRECISION = 1e18` (prevents rounding to zero for small amounts)
- `userDebt` is set to the current accumulator whenever a user deposits, withdraws, or claims

**Why this works:**
- When fees arrive, the per-share increase is recorded globally once
- Each user's entitlement is computed on-demand from their share count and the
  difference between current accumulator and their personal snapshot (debt)
- O(1) per operation regardless of number of depositors

### 2.3 Security Features

#### 2.3.1 Reentrancy Guard

```
_nonReentrant():
    if locked == true -> Revert("Reentrancy")
    locked = true

_unlock():
    locked = false
```

Every state-changing method calls `_nonReentrant()` at entry and `_unlock()` at exit.
This prevents a malicious token contract from re-entering the vault during a
`transfer` or `transferFrom` callback.

#### 2.3.2 Checks-Effects-Interactions (CEI) Pattern

All write methods follow CEI strictly:

```
1. CHECKS:    Validate inputs, check balances, verify permissions
2. EFFECTS:   Update storage (shares, deposits, debt, accumulators)
3. INTERACTIONS: External calls (transferFrom, transfer to user)
```

Example in `_deposit()`:
- Check: amount > 0, minimum deposit, not paused
- Effect: update userShares, totalShares, totalDeposited, userRevenueDebt, userLastDepositBlock
- Interaction: `_transferFromSender()` (external call to OP20 token)

#### 2.3.3 SafeMath (Overflow Protection)

All arithmetic uses `SafeMath.add()`, `SafeMath.sub()`, `SafeMath.mul()`, `SafeMath.div()`
from the btc-runtime. These revert on overflow/underflow/division-by-zero for u256
operations, preventing silent wraparound bugs.

#### 2.3.4 Withdrawal Cooldown

```
_checkCooldown(user):
    cooldown = cooldownBlocks.value         // configurable, default 6 blocks (~1hr)
    if cooldown == 0 -> return              // disabled
    lastDeposit = userLastDepositBlock[user]
    if lastDeposit == 0 -> return           // never deposited
    unlockBlock = lastDeposit + cooldown
    if currentBlock < unlockBlock -> Revert("Withdrawal cooldown active")
```

Prevents deposit-then-immediately-withdraw attacks and front-running fee distributions.

#### 2.3.5 Pause Mechanism

- `pause()` / `unpause()` -- owner-only toggle
- `_whenNotPaused()` guard on: deposit, withdraw, claimRevenue, autoCompound
- `emergencyWithdraw()` works even when paused (no `_whenNotPaused` check)
- `collectFees()` works even when paused (fees can still accumulate)

#### 2.3.6 Access Control

- `_onlyOwner()`: checks `Blockchain.tx.sender === owner` for admin methods
- Owner is set to `Blockchain.tx.origin` during deployment
- No ownership transfer function (immutable owner)

### 2.4 Event System

The contract emits 12 event types for on-chain indexing and frontend feedback:

| Event                     | Fields                             | Emitted By                |
| ------------------------- | ---------------------------------- | ------------------------- |
| `Deposit`                 | user, amount, shares               | `_deposit()`              |
| `Withdraw`                | user, shares, amountOut            | `_withdraw()`             |
| `ClaimRevenue`            | user, amount                       | `_claimRevenue()`, `_withdraw()`, `_settleRevenue()` |
| `CollectFees`             | sender, amount, protocolCut        | `_collectFees()`          |
| `AutoCompound`            | user, revenue, newShares           | `_autoCompound()`         |
| `EmergencyWithdraw`       | user, shares, amountOut            | `_emergencyWithdraw()`    |
| `Paused`                  | account                            | `_pause()`                |
| `Unpaused`                | account                            | `_unpause()`              |
| `MinimumDepositChanged`   | newAmount                          | `_setMinimumDeposit()`    |
| `ProtocolFeeChanged`      | newBps                             | `_setProtocolFee()`       |
| `FeeRecipientChanged`     | newRecipient                       | `_setProtocolFeeRecipient()` |
| `CooldownChanged`         | newBlocks                          | `_setCooldownBlocks()`    |

---

## 3. User Flows (with ASCII Diagrams)

### 3.1 Deposit Flow

The user deposits OP20 tokens into the vault and receives proportional shares.
This is a **two-transaction** process: approve then deposit.

```
 User            DepositForm        useTransaction      OPNet SDK         OP20 Token      RevenueVault
  |                   |                   |                  |                  |                |
  | Enter amount      |                   |                  |                  |                |
  |------------------>|                   |                  |                  |                |
  |                   |                   |                  |                  |                |
  |                   | previewDeposit()  |                  |                  |                |
  |                   |------------------------------------->(simulate)------->|                |
  |                   |<-------------------------------------| shares preview  |                |
  |                   |                   |                  |                  |                |
  | Click "Approve"   |                   |                  |                  |                |
  |------------------>|                   |                  |                  |                |
  |                   | execute(          |                  |                  |                |
  |                   |  increaseAllow.)  |                  |                  |                |
  |                   |------------------>|                  |                  |                |
  |                   |                   | simulateFn()     |                  |                |
  |                   |                   |----------------->|                  |                |
  |                   |                   |                  | increaseAllowance(vault, amount) |
  |                   |                   |                  |----------------->|                |
  |                   |                   |                  |<-----------------| CallResult     |
  |                   |                   |<-----------------| (no revert)      |                |
  |                   |                   |                  |                  |                |
  |                   |                   | sendTransaction  |                  |                |
  |                   |                   |  (signer: null)  |                  |                |
  |                   |                   |----------------->| Wallet signs     |                |
  | [Wallet Popup] <--|-------------------|------------------|  & broadcasts    |                |
  | [User approves]   |                   |                  |                  |                |
  |                   |                   |<-----------------| txId             |                |
  |                   |<------------------| step='deposit'   |                  |                |
  |                   |                   |                  |                  |                |
  | Click "Deposit"   |                   |                  |                  |                |
  |------------------>|                   |                  |                  |                |
  |                   | execute(deposit)  |                  |                  |                |
  |                   |------------------>|                  |                  |                |
  |                   |                   | simulateFn()     |                  |                |
  |                   |                   |----------------->|                  |                |
  |                   |                   |                  | vault.deposit(amount)             |
  |                   |                   |                  |---------------------------------->|
  |                   |                   |                  |                  |                |
  |                   |                   |                  |   CONTRACT LOGIC:                |
  |                   |                   |                  |   1. _whenNotPaused()            |
  |                   |                   |                  |   2. _nonReentrant()             |
  |                   |                   |                  |   3. validate amount > 0         |
  |                   |                   |                  |   4. check minimumDeposit        |
  |                   |                   |                  |   5. _settleRevenue(sender)      |
  |                   |                   |                  |   6. calc shares to mint         |
  |                   |                   |                  |   7. update userShares           |
  |                   |                   |                  |   8. update totalShares          |
  |                   |                   |                  |   9. set userRevenueDebt         |
  |                   |                   |                  |   10. set userLastDepositBlock   |
  |                   |                   |                  |   11. transferFrom(sender,vault) |
  |                   |                   |                  |   12. emit Deposit event         |
  |                   |                   |                  |   13. _unlock()                  |
  |                   |                   |                  |                  |                |
  |                   |                   |                  |<---------------------------------|
  |                   |                   |<-----------------| CallResult       |                |
  |                   |                   |                  |                  |                |
  |                   |                   | sendTransaction  |                  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast |                |
  |                   |                   |<-----------------| txId             |                |
  |                   |<------------------| success          |                  |                |
  |<------------------| "Deposit success" |                  |                  |                |
  |                   | refetch() after 2s|                  |                  |                |
```

**Share calculation:**
```
if totalShares == 0:
    sharesToMint = amount                           // 1:1 for first depositor
else:
    sharesToMint = (amount * totalShares) / totalDeposited  // proportional
```

### 3.2 Withdraw Flow

The user burns shares to retrieve deposited tokens. Any pending revenue is
**automatically claimed** before the withdrawal.

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
  |                   |                   | simulateFn()     |                |
  |                   |                   |----------------->|                |
  |                   |                   |                  | vault.withdraw(shares)
  |                   |                   |                  |--------------->|
  |                   |                   |                  |                |
  |                   |                   |                  |  CONTRACT LOGIC:
  |                   |                   |                  |  1. _whenNotPaused()
  |                   |                   |                  |  2. _nonReentrant()
  |                   |                   |                  |  3. validate shares > 0
  |                   |                   |                  |  4. check shares <= userShares
  |                   |                   |                  |  5. _checkCooldown(sender)
  |                   |                   |                  |  6. AUTO-CLAIM pending revenue:
  |                   |                   |                  |     a. calc pendingRevenue
  |                   |                   |                  |     b. update debt & claimed
  |                   |                   |                  |     c. transfer revenue to user
  |                   |                   |                  |     d. emit ClaimRevenue event
  |                   |                   |                  |  7. amountOut = (shares * totalDep) / totalShares
  |                   |                   |                  |  8. burn shares (sub from user & total)
  |                   |                   |                  |  9. sub amountOut from totalDeposited
  |                   |                   |                  |  10. reset debt for remaining shares
  |                   |                   |                  |  11. transfer amountOut to user
  |                   |                   |                  |  12. emit Withdraw event
  |                   |                   |                  |  13. _unlock()
  |                   |                   |                  |                |
  |                   |                   |<-----------------| CallResult     |
  |                   |                   | sendTransaction  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast
  |                   |                   |<-----------------| txId           |
  |                   |<------------------| success          |                |
  |<------------------| "Withdraw success"|                  |                |
```

**Token output calculation:**
```
amountOut = (sharesToBurn * totalDeposited) / totalShares
```

### 3.3 Claim Revenue Flow

The user claims accumulated revenue without touching their deposit or shares.

```
 User              ClaimCard         useTransaction      OPNet SDK        RevenueVault
  |                   |                   |                  |                |
  | (sees pending     |                   |                  |                |
  |  revenue > 0)     |                   |                  |                |
  |                   |                   |                  |                |
  | Click "Claim"     |                   |                  |                |
  |------------------>|                   |                  |                |
  |                   | execute(          |                  |                |
  |                   |  claimRevenue)    |                  |                |
  |                   |------------------>|                  |                |
  |                   |                   | simulateFn()     |                |
  |                   |                   |----------------->|                |
  |                   |                   |                  | vault.claimRevenue()
  |                   |                   |                  |--------------->|
  |                   |                   |                  |                |
  |                   |                   |                  |  CONTRACT LOGIC:
  |                   |                   |                  |  1. _whenNotPaused()
  |                   |                   |                  |  2. _nonReentrant()
  |                   |                   |                  |  3. pending = _pendingRevenue(sender)
  |                   |                   |                  |  4. require pending > 0
  |                   |                   |                  |  5. set debt = accumulator
  |                   |                   |                  |  6. add pending to userClaimedRevenue
  |                   |                   |                  |  7. transfer pending tokens to sender
  |                   |                   |                  |  8. emit ClaimRevenue event
  |                   |                   |                  |  9. _unlock()
  |                   |                   |                  |                |
  |                   |                   |<-----------------| CallResult     |
  |                   |                   | sendTransaction  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast
  |                   |                   |<-----------------| txId           |
  |                   |<------------------| success          |                |
  |<------------------| "Claim success"   |                  |                |
```

### 3.4 Auto-Compound Flow

Instead of claiming revenue as tokens, the user reinvests it as additional
vault shares, compounding their position.

```
 User              ClaimCard         useTransaction      OPNet SDK        RevenueVault
  |                   |                   |                  |                |
  | Click "Compound"  |                   |                  |                |
  |------------------>|                   |                  |                |
  |                   | execute(          |                  |                |
  |                   |  autoCompound)    |                  |                |
  |                   |------------------>|                  |                |
  |                   |                   | simulateFn()     |                |
  |                   |                   |----------------->|                |
  |                   |                   |                  | vault.autoCompound()
  |                   |                   |                  |--------------->|
  |                   |                   |                  |                |
  |                   |                   |                  |  CONTRACT LOGIC:
  |                   |                   |                  |  1. _whenNotPaused()
  |                   |                   |                  |  2. _nonReentrant()
  |                   |                   |                  |  3. pending = _pendingRevenue(sender)
  |                   |                   |                  |  4. require pending > 0
  |                   |                   |                  |  5. calc newShares:
  |                   |                   |                  |     newShares = (pending * totalShares) / totalDeposited
  |                   |                   |                  |  6. set debt = accumulator
  |                   |                   |                  |  7. add newShares to userShares
  |                   |                   |                  |  8. add pending to userDeposited
  |                   |                   |                  |  9. add newShares to totalShares
  |                   |                   |                  |  10. add pending to totalDeposited
  |                   |                   |                  |  11. add pending to userClaimedRevenue
  |                   |                   |                  |  12. NO token transfer (stays in vault)
  |                   |                   |                  |  13. emit AutoCompound event
  |                   |                   |                  |  14. _unlock()
  |                   |                   |                  |                |
  |                   |                   |<-----------------| CallResult     |
  |                   |                   | sendTransaction  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast
  |                   |                   |<-----------------| txId           |
  |                   |<------------------| success          |                |
  |<------------------| "Compound success"|                  |                |
```

**Key difference from Claim:** No token transfer occurs. The revenue amount is
treated as a new deposit, minting additional shares and increasing the user's
deposited amount, all within the vault's existing token balance.

### 3.5 Emergency Withdraw Flow

Available even when the vault is paused. Burns ALL user shares and returns the
proportional deposit. **Pending revenue is forfeited.**

```
 User              Frontend          useTransaction      OPNet SDK        RevenueVault
  |                   |                   |                  |                |
  | Click "Emergency  |                   |                  |                |
  |  Withdraw"        |                   |                  |                |
  |------------------>|                   |                  |                |
  |                   | execute(          |                  |                |
  |                   | emergencyWithdraw)|                  |                |
  |                   |------------------>|                  |                |
  |                   |                   | simulateFn()     |                |
  |                   |                   |----------------->|                |
  |                   |                   |                  | vault.emergencyWithdraw()
  |                   |                   |                  |--------------->|
  |                   |                   |                  |                |
  |                   |                   |                  |  CONTRACT LOGIC:
  |                   |                   |                  |  (NO _whenNotPaused -- works when paused!)
  |                   |                   |                  |  1. _nonReentrant()
  |                   |                   |                  |  2. require userShares > 0
  |                   |                   |                  |  3. amountOut = (userShares * totalDep) / totalShares
  |                   |                   |                  |  4. WIPE user state:
  |                   |                   |                  |     - userShares[sender] = 0
  |                   |                   |                  |     - userDeposited[sender] = 0
  |                   |                   |                  |     - userRevenueDebt[sender] = 0
  |                   |                   |                  |     (userClaimedRevenue preserved)
  |                   |                   |                  |  5. sub shares from totalShares
  |                   |                   |                  |  6. sub amountOut from totalDeposited
  |                   |                   |                  |  7. transfer amountOut to sender
  |                   |                   |                  |  8. emit EmergencyWithdraw event
  |                   |                   |                  |  9. _unlock()
  |                   |                   |                  |                |
  |                   |                   |<-----------------| CallResult     |
  |                   |                   | sendTransaction  |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast
  |                   |                   |<-----------------| txId           |
  |<------------------| "Emergency exit"  |                  |                |
```

**WARNING:** Pending revenue is NOT claimed. It remains in the accumulator
and effectively gets redistributed to remaining shareholders.

### 3.6 Collect Fees Flow (Revenue Distribution)

Anyone can call `collectFees()` to inject revenue tokens into the vault.
A protocol fee (configurable, default 5%) is skimmed and sent to the fee recipient.
The remainder is distributed proportionally to all shareholders via the accumulator.

```
 Caller           Admin Page        useTransaction      OPNet SDK        RevenueVault     OP20 Token
  |                   |                   |                  |                |                |
  | Enter fee amount  |                   |                  |                |                |
  |------------------>|                   |                  |                |                |
  | Click "Collect"   |                   |                  |                |                |
  |------------------>|                   |                  |                |                |
  |                   | execute(          |                  |                |                |
  |                   |  collectFees)     |                  |                |                |
  |                   |------------------>|                  |                |                |
  |                   |                   | simulateFn()     |                |                |
  |                   |                   |----------------->|                |                |
  |                   |                   |                  | vault.collectFees(amount)       |
  |                   |                   |                  |--------------->|                |
  |                   |                   |                  |                |                |
  |                   |                   |                  |  CONTRACT LOGIC:                |
  |                   |                   |                  |  1. _nonReentrant()             |
  |                   |                   |                  |  2. require amount > 0          |
  |                   |                   |                  |  3. require totalShares > 0     |
  |                   |                   |                  |  4. protocolCut = amount * feeBps / 10000
  |                   |                   |                  |  5. distributed = amount - protocolCut
  |                   |                   |                  |  6. totalProtocolFees += protocolCut
  |                   |                   |                  |  7. ACCUMULATOR UPDATE:         |
  |                   |                   |                  |     perShareIncrease =          |
  |                   |                   |                  |       (distributed * 1e18)      |
  |                   |                   |                  |       / totalShares             |
  |                   |                   |                  |     accumulator += perShareIncrease
  |                   |                   |                  |  8. totalFees += amount         |
  |                   |                   |                  |  9. transferFrom(caller, vault, amount)
  |                   |                   |                  |  10. if protocolCut > 0:        |
  |                   |                   |                  |      transfer(feeRecipient, protocolCut)
  |                   |                   |                  |  11. emit CollectFees event     |
  |                   |                   |                  |  12. _unlock()                  |
  |                   |                   |                  |                |                |
  |                   |                   |<-----------------| CallResult     |                |
  |                   |                   | sendTransaction  |                |                |
  | [Wallet Popup] <--|-------------------|----------------->| sign & broadcast               |
  |                   |                   |<-----------------| txId           |                |
  |<------------------| "Fees collected"  |                  |                |                |
```

**Important:** `collectFees()` is callable by ANYONE (no `_onlyOwner` check).
This allows external systems, keepers, or dApps to feed revenue into the vault.
The caller must have previously approved the vault to spend their tokens.

### 3.7 Admin Flows

All admin methods require `_onlyOwner()` (sender == deployer).

#### 3.7.1 Pause / Unpause

```
 Owner            Admin Page        useTransaction      OPNet SDK        RevenueVault
  |                   |                   |                  |                |
  | Click "Pause"     |                   |                  |                |
  |------------------>| execute(pause)    |                  |                |
  |                   |------------------>|                  |                |
  |                   |                   |----------------->| vault.pause()  |
  |                   |                   |                  |--------------->|
  |                   |                   |                  | 1. _onlyOwner()|
  |                   |                   |                  | 2. require !paused
  |                   |                   |                  | 3. paused = true
  |                   |                   |                  | 4. emit Paused |
  |                   |                   |<-----------------| success        |
  |                   |                   | sendTransaction  |                |
  | [sign] <----------|-------------------|----------------->| broadcast      |
  |                   |<------------------| txId             |                |
  |                   |                   |                  |                |
  | Click "Unpause"   |                   |                  |                |
  |------------------>| execute(unpause)  |                  |                |
  |                   |------------------>|                  |                |
  |                   |                   |----------------->| vault.unpause()|
  |                   |                   |                  |--------------->|
  |                   |                   |                  | 1. _onlyOwner()|
  |                   |                   |                  | 2. require paused
  |                   |                   |                  | 3. paused = false
  |                   |                   |                  | 4. emit Unpaused
  |                   |                   |<-----------------| success        |
```

**Effects of pause:**
- `deposit()` -- blocked
- `withdraw()` -- blocked
- `claimRevenue()` -- blocked
- `autoCompound()` -- blocked
- `emergencyWithdraw()` -- STILL WORKS
- `collectFees()` -- STILL WORKS

#### 3.7.2 Set Minimum Deposit

```
Admin -> setMinimumDeposit(amount)
  1. _onlyOwner()
  2. require amount > 0
  3. minimumDeposit = amount
  4. emit MinimumDepositChanged(amount)
```

Default: `1e18` (1.0 tokens with 18 decimals).
Applied only for the first deposit (when totalShares == 0).

#### 3.7.3 Set Protocol Fee

```
Admin -> setProtocolFee(bps)
  1. _onlyOwner()
  2. require bps <= 2000  (max 20%)
  3. protocolFeeBps = bps
  4. emit ProtocolFeeChanged(bps)
```

Default: 500 bps (5%). Range: 0 -- 2000 bps (0% -- 20%).

#### 3.7.4 Set Fee Recipient

```
Admin -> setProtocolFeeRecipient(address)
  1. _onlyOwner()
  2. protocolFeeRecipient = address
  3. emit FeeRecipientChanged(address)
```

Default: deployer address (tx.origin at deployment).

#### 3.7.5 Set Cooldown Blocks

```
Admin -> setCooldownBlocks(blocks)
  1. _onlyOwner()
  2. require blocks <= 144  (max ~24 hours on Bitcoin)
  3. cooldownBlocks = blocks
  4. emit CooldownChanged(blocks)
```

Default: 6 blocks (~1 hour). Range: 0 -- 144 blocks.
Set to 0 to disable the cooldown.

#### 3.7.6 Set Deposit Token

```
Admin -> setDepositToken(tokenAddress)
  1. _onlyOwner()
  2. depositToken = tokenAddress
```

Must be called after deployment to configure which OP20 token the vault accepts.
No event emitted (design choice -- set once after deploy).

---

## 4. Revenue Distribution Algorithm (Detailed)

### 4.1 The Accumulator Model

The vault uses a **global per-share accumulator** to track how much revenue each
share is entitled to. This is the same model used by Synthetix StakingRewards,
MasterChef, and similar DeFi protocols.

**State variables:**

```
revenuePerShareAccumulator   (global, scaled by 1e18)
userRevenueDebt[user]        (per-user snapshot of accumulator)
userShares[user]             (per-user share balance)
```

### 4.2 Step-by-Step Math with Example

**Initial State:**

```
totalShares     = 0
totalDeposited  = 0
accumulator     = 0
```

---

**Step 1: Alice deposits 100 tokens**

```
sharesToMint = 100   (first depositor, 1:1)

totalShares     = 100
totalDeposited  = 100
userShares[A]   = 100
userDebt[A]     = 0    (accumulator is 0)
```

---

**Step 2: Bob deposits 50 tokens**

```
sharesToMint = (50 * 100) / 100 = 50

totalShares     = 150
totalDeposited  = 150
userShares[B]   = 50
userDebt[B]     = 0    (accumulator is still 0)
```

---

**Step 3: 30 tokens of fees are collected (5% protocol fee = 500 bps)**

```
protocolCut     = 30 * 500 / 10000 = 1.5 tokens  -> sent to feeRecipient
distributed     = 30 - 1.5 = 28.5 tokens

perShareIncrease = (28.5 * 1e18) / 150 = 190000000000000000  (0.19 * 1e18)

accumulator     = 0 + 190000000000000000 = 190000000000000000
totalFees       = 30
```

---

**Step 4: Alice checks pending revenue**

```
pendingRevenue[A] = (userShares[A] * (accumulator - userDebt[A])) / 1e18
                  = (100 * (190000000000000000 - 0)) / 1e18
                  = (100 * 190000000000000000) / 1e18
                  = 19.0 tokens

Alice is entitled to 19.0 out of 28.5 distributed (100/150 = 66.7%)
```

---

**Step 5: Bob checks pending revenue**

```
pendingRevenue[B] = (50 * (190000000000000000 - 0)) / 1e18
                  = 9.5 tokens

Bob is entitled to 9.5 out of 28.5 distributed (50/150 = 33.3%)
Verification: 19.0 + 9.5 = 28.5 (exact match with distributed)
```

---

**Step 6: Alice claims her revenue (19.0 tokens)**

```
userDebt[A]          = 190000000000000000  (set to current accumulator)
userClaimedRevenue[A] += 19.0
transfer 19.0 tokens from vault to Alice
```

---

**Step 7: Another 15 tokens of fees arrive**

```
protocolCut     = 15 * 500 / 10000 = 0.75 tokens
distributed     = 14.25 tokens

perShareIncrease = (14.25 * 1e18) / 150 = 95000000000000000

accumulator     = 190000000000000000 + 95000000000000000 = 285000000000000000
```

---

**Step 8: Alice checks again**

```
pendingRevenue[A] = (100 * (285000000000000000 - 190000000000000000)) / 1e18
                  = (100 * 95000000000000000) / 1e18
                  = 9.5 tokens

(Only the new fees, since she already claimed the first batch)
```

---

**Step 9: Bob checks again**

```
pendingRevenue[B] = (50 * (285000000000000000 - 0)) / 1e18
                  = 14.25 tokens

(Both batches, since Bob never claimed. 9.5 from first + 4.75 from second = 14.25)
```

### 4.3 What Happens During Key Operations

| Operation           | Accumulator Effect                        | Debt Effect                     |
| ------------------- | ----------------------------------------- | ------------------------------- |
| `collectFees()`     | accumulator += (distributed * 1e18) / totalShares | No change            |
| `deposit()`         | No change (settleRevenue auto-claims first) | debt[user] = accumulator      |
| `withdraw()`        | No change (auto-claims first)             | debt[user] = accumulator (or 0 if no remaining shares) |
| `claimRevenue()`    | No change                                 | debt[user] = accumulator        |
| `autoCompound()`    | No change                                 | debt[user] = accumulator        |
| `emergencyWithdraw()` | No change                              | debt[user] = 0 (wiped)          |

### 4.4 Settlement on Deposit

When a user deposits additional tokens, `_settleRevenue()` is called first.
This auto-claims any pending revenue before the share balance changes, ensuring
the user does not lose accrued revenue and the new shares start earning from the
current accumulator value.

```
_settleRevenue(user):
    pending = _pendingRevenue(user)
    if pending > 0:
        userClaimedRevenue[user] += pending
        transfer pending to user
        emit ClaimRevenue
    userRevenueDebt[user] = accumulator   // reset snapshot
```

---

## 5. Contract Method Reference

### 5.1 Write Methods

| #  | Method                | Selector                         | Params                    | Returns          | Access    | Description                                           |
| -- | --------------------- | -------------------------------- | ------------------------- | ---------------- | --------- | ----------------------------------------------------- |
| 1  | `deposit`             | `deposit(uint256)`               | amount: uint256           | success: bool    | Public*   | Deposit tokens, receive proportional shares            |
| 2  | `withdraw`            | `withdraw(uint256)`              | shares: uint256           | amountOut: uint256| Public*  | Burn shares, get tokens back + auto-claim revenue      |
| 3  | `claimRevenue`        | `claimRevenue()`                 | (none)                    | claimed: uint256 | Public*   | Claim accumulated revenue                              |
| 4  | `autoCompound`        | `autoCompound()`                 | (none)                    | newShares: uint256| Public*  | Reinvest pending revenue as new shares                 |
| 5  | `collectFees`         | `collectFees(uint256)`           | amount: uint256           | success: bool    | Anyone    | Inject revenue tokens into vault for distribution      |
| 6  | `emergencyWithdraw`   | `emergencyWithdraw()`            | (none)                    | amountOut: uint256| Anyone** | Withdraw all shares, forfeit pending revenue           |

*Public = requires wallet connected, affected by pause state
**Anyone = works even when paused

### 5.2 Admin Methods (Owner Only)

| #  | Method                    | Selector                            | Params              | Returns       | Description                              |
| -- | ------------------------- | ----------------------------------- | ------------------- | ------------- | ---------------------------------------- |
| 7  | `pause`                   | `pause()`                           | (none)              | success: bool | Pause vault (blocks deposit/withdraw/claim) |
| 8  | `unpause`                 | `unpause()`                         | (none)              | success: bool | Unpause vault                            |
| 9  | `setMinimumDeposit`       | `setMinimumDeposit(uint256)`        | amount: uint256     | success: bool | Set minimum first-deposit amount         |
| 10 | `setProtocolFee`          | `setProtocolFee(uint256)`           | bps: uint256        | success: bool | Set protocol fee (0-2000 bps, max 20%)   |
| 11 | `setProtocolFeeRecipient` | `setProtocolFeeRecipient(address)`  | recipient: address  | success: bool | Set who receives protocol fee cut        |
| 12 | `setCooldownBlocks`       | `setCooldownBlocks(uint256)`        | blocks: uint256     | success: bool | Set withdrawal cooldown (0-144 blocks)   |
| 13 | `setDepositToken`         | `setDepositToken(address)`          | token: address      | success: bool | Set accepted OP20 token address          |

### 5.3 View Methods (Read-Only)

| #  | Method             | Selector                      | Params            | Returns                                                          | Description                          |
| -- | ------------------ | ----------------------------- | ----------------- | ---------------------------------------------------------------- | ------------------------------------ |
| 14 | `getVaultInfo`     | `getVaultInfo()`              | (none)            | totalDeposited, totalShares, totalFees, accumulator (all uint256)| Global vault statistics              |
| 15 | `getUserInfo`      | `getUserInfo(address)`        | user: address     | shares, deposited, pendingRevenue, totalClaimed (all uint256)    | Per-user position data               |
| 16 | `previewDeposit`   | `previewDeposit(uint256)`     | amount: uint256   | shares: uint256                                                  | Preview shares for deposit amount    |
| 17 | `previewWithdraw`  | `previewWithdraw(uint256)`    | shares: uint256   | amountOut: uint256                                               | Preview tokens for share burn        |
| 18 | `getOwner`         | `getOwner()`                  | (none)            | owner: address                                                   | Get vault owner address              |
| 19 | `isPaused`         | `isPaused()`                  | (none)            | paused: bool                                                     | Check if vault is paused             |
| 20 | `getMinimumDeposit`| `getMinimumDeposit()`         | (none)            | minimumDeposit: uint256                                          | Get minimum deposit threshold        |
| 21 | `getProtocolInfo`  | `getProtocolInfo()`           | (none)            | feeBps, feeRecipient, totalProtocolFees, cooldownBlocks          | Get protocol configuration           |

**Total: 21 methods** (6 write + 7 admin + 8 view)

---

## 6. Frontend Component Map

### 6.1 Page-Level Architecture

```
App
 |
 +-- Layout (Header, Navigation, WalletConnect)
 |    |
 |    +-- Dashboard (/dashboard)
 |    |    |-- VaultStats          reads: getVaultInfo(), getProtocolInfo()
 |    |    |-- VaultGauge          reads: userInfo.shares / vaultInfo.totalShares
 |    |    |-- ClaimCard           calls: claimRevenue(), autoCompound()
 |    |    |-- "Your Position"     reads: getUserInfo()
 |    |    +-- isPaused banner     reads: isPaused()
 |    |
 |    +-- Deposit (/deposit)
 |    |    |-- DepositForm         calls: token.increaseAllowance(), vault.deposit()
 |    |    |                       reads: previewDeposit(), token.balanceOf()
 |    |    +-- VaultStats          reads: getVaultInfo(), getProtocolInfo()
 |    |
 |    +-- Withdraw (/withdraw)
 |    |    |-- WithdrawForm        calls: vault.withdraw()
 |    |    |                       reads: previewWithdraw(), getUserInfo()
 |    |    +-- VaultStats          reads: getVaultInfo(), getProtocolInfo()
 |    |
 |    +-- Admin (/admin)
 |         |-- VaultStats          reads: getVaultInfo(), getProtocolInfo()
 |         |-- Pause/Unpause       calls: vault.pause(), vault.unpause()
 |         |-- Set Min Deposit     calls: vault.setMinimumDeposit()
 |         |-- Set Protocol Fee    calls: vault.setProtocolFee()
 |         |-- Set Cooldown        calls: vault.setCooldownBlocks()
 |         |-- Set Fee Recipient   calls: vault.setProtocolFeeRecipient()
 |         |-- Set Deposit Token   calls: vault.setDepositToken()
 |         +-- Collect Fees        calls: vault.collectFees()
 |
 +-- Hooks
      |-- useVaultContract()   Creates typed contract proxies (vault + token)
      |-- useVaultData()       Polls vault data every 15s (vaultInfo, userInfo, protocolInfo, balance)
      +-- useTransaction()     Manages simulate -> send lifecycle with state machine
```

### 6.2 Data Flow Diagram

```
                         useVaultContract()
                               |
               +---------------+---------------+
               |                               |
        vault: IVaultContract          token: IOP20Contract
        (typed proxy over ABI)         (standard OP20 proxy)
               |                               |
               v                               v
         useVaultData()                  useVaultData()
         |  Polls every 15s:            |  tokenBalance:
         |  - getVaultInfo()            |  - balanceOf(wallet)
         |  - getUserInfo(wallet)       |
         |  - getProtocolInfo()         |
         |                              |
         v                              v
    +----------+  +----------+  +-----------+  +----------+
    | VaultInfo|  | UserInfo |  |ProtocolInfo| |tokenBal  |
    +----------+  +----------+  +-----------+  +----------+
         |              |            |              |
         |   +----------+------------+--------------+
         |   |          |            |
         v   v          v            v
    +-----------+  +-----------+  +-----------+  +-----------+
    | VaultStats|  | ClaimCard |  |DepositForm|  |WithdrawForm|
    |           |  |           |  |           |  |            |
    | totalDep  |  | pending   |  | balance   |  | shares     |
    | totalShrs |  | claimed   |  | preview   |  | preview    |
    | totalFees |  |           |  |           |  | pending    |
    | feeBps    |  |           |  |           |  |            |
    +-----------+  +-----------+  +-----------+  +-----------+
```

### 6.3 Hook Responsibilities

| Hook                | Purpose                                           | Depends On               |
| ------------------- | ------------------------------------------------- | ------------------------ |
| `useVaultContract`  | Creates typed IVaultContract + IOP20Contract proxies using getContract() from opnet SDK | WalletConnect provider, network, contract addresses |
| `useVaultData`      | Polls vault state every 15s, returns vaultInfo/userInfo/protocolInfo/tokenBalance | useVaultContract, walletAddress |
| `useTransaction`    | State machine for simulate->send flow, handles errors, exposes {state, execute, reset} | WalletConnect walletAddress + network |

### 6.4 Component-to-Contract Method Mapping

| Component       | Contract Methods Called                                     | Purpose                            |
| --------------- | ----------------------------------------------------------- | ---------------------------------- |
| DepositForm     | `token.increaseAllowance()`, `vault.deposit()`, `vault.previewDeposit()` | Two-step approve+deposit flow  |
| WithdrawForm    | `vault.withdraw()`, `vault.previewWithdraw()`              | Burn shares, auto-claim revenue    |
| ClaimCard       | `vault.claimRevenue()`, `vault.autoCompound()`             | Claim or reinvest pending revenue  |
| VaultStats      | (reads from useVaultData props)                            | Display vault-wide statistics      |
| VaultGauge      | (reads from props)                                         | Radial gauge for share % and earned|
| Dashboard       | `vault.isPaused()` + all useVaultData reads                | Overview page with position info   |
| Admin           | `vault.pause()`, `vault.unpause()`, `vault.setMinimumDeposit()`, `vault.setProtocolFee()`, `vault.setProtocolFeeRecipient()`, `vault.setCooldownBlocks()`, `vault.setDepositToken()`, `vault.collectFees()`, `vault.getOwner()`, `vault.isPaused()`, `vault.getMinimumDeposit()` | Full admin control panel |

---

## 7. Deployment Flow

### 7.1 Contract Deployment

```
Step 1: Compile AssemblyScript to WASM
+----------------------------+
| $ npm run build            |
| asc src/RevenueVault.ts    |
|   --target release         |
|   --exportRuntime          |
| Output: build/contract.wasm|
+----------------------------+

Step 2: Deploy via OPNet CLI or SDK
+-------------------------------------+
| Deploy RevenueVault.wasm to Bitcoin  |
| L1 via OPNet deployment transaction. |
|                                      |
| onDeployment() runs automatically:   |
|   - owner = tx.origin (deployer)     |
|   - totalDeposited = 0               |
|   - totalShares = 0                  |
|   - totalFees = 0                    |
|   - accumulator = 0                  |
|   - paused = false                   |
|   - minimumDeposit = 1e18            |
|   - locked = false                   |
|   - protocolFeeBps = 500 (5%)        |
|   - protocolFeeRecipient = deployer  |
|   - totalProtocolFees = 0            |
|   - cooldownBlocks = 6              |
+-------------------------------------+

Step 3: Configure Deposit Token (REQUIRED)
+------------------------------------------+
| Owner calls setDepositToken(tokenAddress)|
| This tells the vault which OP20 token    |
| to accept for deposits and use for       |
| revenue distribution.                    |
|                                          |
| Without this step, all deposit/withdraw  |
| calls will fail (zero address token).    |
+------------------------------------------+
```

### 7.2 Post-Deployment Configuration Checklist

```
+---+-------------------------------+----------------------------------+----------+
| # | Action                        | Command                          | Required |
+---+-------------------------------+----------------------------------+----------+
| 1 | Set deposit token             | setDepositToken(tokenAddr)       | YES      |
| 2 | Adjust protocol fee           | setProtocolFee(bps)              | Optional |
|   |   (default 500 = 5%)          |                                  |          |
| 3 | Set fee recipient             | setProtocolFeeRecipient(addr)    | Optional |
|   |   (default = deployer)        |                                  |          |
| 4 | Set cooldown blocks           | setCooldownBlocks(n)             | Optional |
|   |   (default = 6 blocks)        |                                  |          |
| 5 | Set minimum deposit           | setMinimumDeposit(amount)        | Optional |
|   |   (default = 1e18)            |                                  |          |
+---+-------------------------------+----------------------------------+----------+
```

### 7.3 Frontend Configuration

After deploying the contract, update the frontend configuration:

**File: `src/config/contracts.ts`**

```typescript
const CONTRACT_ADDRESSES: Map<string, ContractAddresses> = new Map([
    ['testnet', {
        vault: '<DEPLOYED_VAULT_ADDRESS>',
        depositToken: '<OP20_TOKEN_ADDRESS>',
    }],
    ['mainnet', {
        vault: '<MAINNET_VAULT_ADDRESS>',
        depositToken: '<MAINNET_TOKEN_ADDRESS>',
    }],
]);
```

### 7.4 End-to-End Deployment Sequence

```
Deployer                 Bitcoin L1 (OPNet)              Frontend
   |                          |                             |
   | 1. Deploy WASM           |                             |
   |------------------------->|                             |
   |                          | contract live               |
   |<-------------------------|                             |
   |                          |                             |
   | 2. setDepositToken(MOTO) |                             |
   |------------------------->|                             |
   |                          |                             |
   | 3. (optional) setProtocolFee, setCooldown, etc.        |
   |------------------------->|                             |
   |                          |                             |
   | 4. Update contracts.ts   |                             |
   |----------------------------------------------------->  |
   |                          |                             |
   | 5. Build & deploy frontend                             |
   |----------------------------------------------------->  |
   |                          |                             |
   |                          |      6. Users connect       |
   |                          |      wallets & interact     |
   |                          |<----------------------------|
   |                          |                             |
   | 7. collectFees() to distribute revenue                 |
   |------------------------->|                             |
   |                          |   accumulator updated       |
   |                          |   users see pending revenue |
   |                          |<----------------------------|
```

---

## Appendix A: Constants

| Constant                    | Value           | Description                            |
| --------------------------- | --------------- | -------------------------------------- |
| `PRECISION`                 | 1e18            | Scaling factor for accumulator math    |
| `DEFAULT_MIN_DEPOSIT`       | 1e18            | 1.0 tokens (18 decimals)              |
| `DEFAULT_COOLDOWN_BLOCKS`   | 6               | ~1 hour on Bitcoin (~10 min/block)     |
| `DEFAULT_PROTOCOL_FEE_BPS`  | 500             | 5% (500 basis points)                  |
| `BPS_DENOMINATOR`           | 10000           | 100% in basis points                   |
| `MAX_SAT_TO_SPEND`          | 1,000,000       | 0.01 BTC safety cap (frontend)         |
| `POLL_INTERVAL`             | 15,000 ms       | Frontend data refresh interval         |

## Appendix B: Error Messages

| Error                                | Method(s)             | Cause                                      |
| ------------------------------------ | --------------------- | ------------------------------------------ |
| `Only owner`                         | All admin methods     | Non-owner called admin function            |
| `Vault is paused`                    | deposit, withdraw, claim, compound | Vault is paused             |
| `Reentrancy`                         | All write methods     | Reentrant call detected                    |
| `Deposit amount must be > 0`         | deposit               | Zero amount                                |
| `First deposit must be >= minimum`   | deposit               | First deposit below minimumDeposit         |
| `Deposit too small for shares`       | deposit               | Amount rounds to 0 shares                  |
| `Fee amount must be > 0`             | collectFees           | Zero fee amount                            |
| `No shares exist to distribute fees` | collectFees           | No depositors yet                          |
| `No revenue to claim`                | claimRevenue          | Zero pending revenue                       |
| `Shares must be > 0`                | withdraw              | Zero shares                                |
| `Insufficient shares`                | withdraw              | More shares than owned                     |
| `Withdrawal cooldown active`         | withdraw              | Too soon after deposit                     |
| `No shares to withdraw`              | emergencyWithdraw     | User has no position                       |
| `No revenue to compound`             | autoCompound          | Zero pending revenue                       |
| `Revenue too small to compound`      | autoCompound          | Revenue rounds to 0 new shares             |
| `Already paused`                     | pause                 | Vault already paused                       |
| `Not paused`                         | unpause               | Vault not paused                           |
| `Min deposit must be > 0`            | setMinimumDeposit     | Zero minimum                               |
| `Fee too high (max 20%)`             | setProtocolFee        | bps > 2000                                 |
| `Cooldown too long (max 144 blocks)` | setCooldownBlocks     | blocks > 144                               |
| `Token transferFrom failed`          | deposit, collectFees  | Insufficient allowance or balance          |
| `Token transfer failed`              | withdraw, claim, etc. | Vault lacks tokens (should not happen)     |

## Appendix C: Cross-Contract Calls

The vault makes two types of OP20 cross-contract calls:

**1. `transferFrom(sender, vault, amount)` -- Pull tokens in**
```
Used by: deposit(), collectFees()
Selector: encodeSelector('transferFrom(address,address,uint256)')
Requires: sender has approved vault for >= amount
```

**2. `transfer(recipient, amount)` -- Push tokens out**
```
Used by: withdraw(), claimRevenue(), emergencyWithdraw(), autoCompound (no),
         collectFees() (protocol cut to feeRecipient)
Selector: encodeSelector('transfer(address,uint256)')
Vault must hold sufficient token balance
```

---

*Generated for the RVault Protocol competition submission.*
*Contract: RevenueVault.ts | Frontend: React 19 + OPNet SDK | Chain: Bitcoin L1 via OPNet*
