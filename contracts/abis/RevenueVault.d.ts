import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the pause function call.
 */
export type Pause = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the unpause function call.
 */
export type Unpause = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setMinimumDeposit function call.
 */
export type SetMinimumDeposit = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setProtocolFee function call.
 */
export type SetProtocolFee = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setProtocolFeeRecipient function call.
 */
export type SetProtocolFeeRecipient = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setCooldownBlocks function call.
 */
export type SetCooldownBlocks = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setDepositToken function call.
 */
export type SetDepositToken = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the deposit function call.
 */
export type Deposit = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the collectFees function call.
 */
export type CollectFees = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the claimRevenue function call.
 */
export type ClaimRevenue = CallResult<
    {
        claimed: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the withdraw function call.
 */
export type Withdraw = CallResult<
    {
        amountOut: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the emergencyWithdraw function call.
 */
export type EmergencyWithdraw = CallResult<
    {
        amountOut: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the autoCompound function call.
 */
export type AutoCompound = CallResult<
    {
        newShares: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getVaultInfo function call.
 */
export type GetVaultInfo = CallResult<
    {
        totalDeposited: bigint;
        totalShares: bigint;
        totalFees: bigint;
        accumulator: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUserInfo function call.
 */
export type GetUserInfo = CallResult<
    {
        shares: bigint;
        deposited: bigint;
        pendingRevenue: bigint;
        totalClaimed: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the previewDeposit function call.
 */
export type PreviewDeposit = CallResult<
    {
        shares: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the previewWithdraw function call.
 */
export type PreviewWithdraw = CallResult<
    {
        amountOut: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getOwner function call.
 */
export type GetOwner = CallResult<
    {
        owner: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the isPaused function call.
 */
export type IsPaused = CallResult<
    {
        paused: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getMinimumDeposit function call.
 */
export type GetMinimumDeposit = CallResult<
    {
        minimumDeposit: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getDepositToken function call.
 */
export type GetDepositToken = CallResult<
    {
        depositToken: Address;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getProtocolInfo function call.
 */
export type GetProtocolInfo = CallResult<
    {
        feeBps: bigint;
        feeRecipient: Address;
        totalProtocolFees: bigint;
        cooldownBlocks: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IRevenueVault
// ------------------------------------------------------------------
export interface IRevenueVault extends IOP_NETContract {
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    setMinimumDeposit(amount: bigint): Promise<SetMinimumDeposit>;
    setProtocolFee(bps: bigint): Promise<SetProtocolFee>;
    setProtocolFeeRecipient(recipient: Address): Promise<SetProtocolFeeRecipient>;
    setCooldownBlocks(blocks: bigint): Promise<SetCooldownBlocks>;
    setDepositToken(token: Address): Promise<SetDepositToken>;
    deposit(amount: bigint): Promise<Deposit>;
    collectFees(amount: bigint): Promise<CollectFees>;
    claimRevenue(): Promise<ClaimRevenue>;
    withdraw(shares: bigint): Promise<Withdraw>;
    emergencyWithdraw(): Promise<EmergencyWithdraw>;
    autoCompound(): Promise<AutoCompound>;
    getVaultInfo(): Promise<GetVaultInfo>;
    getUserInfo(user: Address): Promise<GetUserInfo>;
    previewDeposit(amount: bigint): Promise<PreviewDeposit>;
    previewWithdraw(shares: bigint): Promise<PreviewWithdraw>;
    getOwner(): Promise<GetOwner>;
    isPaused(): Promise<IsPaused>;
    getMinimumDeposit(): Promise<GetMinimumDeposit>;
    getDepositToken(): Promise<GetDepositToken>;
    getProtocolInfo(): Promise<GetProtocolInfo>;
}
