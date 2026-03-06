import type { CallResult, BaseContractProperties, ContractDecodedObjectResult } from 'opnet';
import type { Address } from '@btc-vision/transaction';

export interface VaultInfo extends ContractDecodedObjectResult {
    totalDeposited: bigint;
    totalShares: bigint;
    totalFees: bigint;
    accumulator: bigint;
}

export interface UserInfo extends ContractDecodedObjectResult {
    shares: bigint;
    deposited: bigint;
    pendingRevenue: bigint;
    totalClaimed: bigint;
}

export interface ProtocolInfo extends ContractDecodedObjectResult {
    feeBps: bigint;
    feeRecipient: Address;
    totalProtocolFees: bigint;
    cooldownBlocks: bigint;
}

export interface TransactionState {
    status: 'idle' | 'simulating' | 'pending' | 'confirming' | 'success' | 'error';
    txId?: string;
    error?: string;
    /** Unix ms when confirmation polling started */
    confirmStartedAt?: number;
    /** Estimated seconds until next block */
    estimatedWaitSecs?: number;
}

// Typed vault contract interface
export interface IVaultContract extends BaseContractProperties {
    // Write methods
    deposit(amount: bigint): Promise<CallResult<{ success: boolean }>>;
    collectFees(amount: bigint): Promise<CallResult<{ success: boolean }>>;
    claimRevenue(): Promise<CallResult<{ claimed: bigint }>>;
    withdraw(shares: bigint): Promise<CallResult<{ amountOut: bigint }>>;
    emergencyWithdraw(): Promise<CallResult<{ amountOut: bigint }>>;
    autoCompound(): Promise<CallResult<{ newShares: bigint }>>;

    // Admin methods
    pause(): Promise<CallResult<{ success: boolean }>>;
    unpause(): Promise<CallResult<{ success: boolean }>>;
    setMinimumDeposit(amount: bigint): Promise<CallResult<{ success: boolean }>>;
    setProtocolFee(bps: bigint): Promise<CallResult<{ success: boolean }>>;
    setProtocolFeeRecipient(recipient: Address): Promise<CallResult<{ success: boolean }>>;
    setCooldownBlocks(blocks: bigint): Promise<CallResult<{ success: boolean }>>;
    setDepositToken(token: Address): Promise<CallResult<{ success: boolean }>>;

    // View methods
    getVaultInfo(): Promise<CallResult<VaultInfo>>;
    getUserInfo(user: Address): Promise<CallResult<UserInfo>>;
    previewDeposit(amount: bigint): Promise<CallResult<{ shares: bigint }>>;
    previewWithdraw(shares: bigint): Promise<CallResult<{ amountOut: bigint }>>;
    getOwner(): Promise<CallResult<{ owner: Address }>>;
    isPaused(): Promise<CallResult<{ paused: boolean }>>;
    getMinimumDeposit(): Promise<CallResult<{ minimumDeposit: bigint }>>;
    getDepositToken(): Promise<CallResult<{ depositToken: Address }>>;
    getProtocolInfo(): Promise<CallResult<ProtocolInfo>>;
}
