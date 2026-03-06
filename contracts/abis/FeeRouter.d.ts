import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the setRvtVault function call.
 */
export type SetRvtVault = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setTeamWallet function call.
 */
export type SetTeamWallet = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setTeamBps function call.
 */
export type SetTeamBps = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the distribute function call.
 */
export type Distribute = CallResult<
    {
        distributed: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getConfig function call.
 */
export type GetConfig = CallResult<
    {
        owner: Address;
        rvtVault: Address;
        teamWallet: Address;
        teamBps: bigint;
        totalDistributed: bigint;
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

// ------------------------------------------------------------------
// IFeeRouter
// ------------------------------------------------------------------
export interface IFeeRouter extends IOP_NETContract {
    setRvtVault(vault: Address): Promise<SetRvtVault>;
    setTeamWallet(wallet: Address): Promise<SetTeamWallet>;
    setTeamBps(bps: bigint): Promise<SetTeamBps>;
    distribute(token: Address): Promise<Distribute>;
    getConfig(): Promise<GetConfig>;
    getOwner(): Promise<GetOwner>;
}
