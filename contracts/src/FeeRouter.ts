import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    ADDRESS_BYTE_LENGTH,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    NetEvent,
    OP_NET,
    Revert,
    Selector,
    StoredU256,
    StoredAddress,
    StoredBoolean,
    SafeMath,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';
import { EMPTY_POINTER } from '@btc-vision/btc-runtime/runtime/math/bytes';
import { CallResult } from '@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment';

const BPS_DENOMINATOR: u256 = u256.fromU64(10000);
const DEFAULT_TEAM_BPS: u256 = u256.fromU64(1000); // 10%
const MAX_TEAM_BPS: u256 = u256.fromU64(3000); // 30% max cap

// OP20 selectors
const OP20_TRANSFER_SELECTOR: Selector = encodeSelector('transfer(address,uint256)');
const OP20_APPROVE_SELECTOR: Selector = encodeSelector('approve(address,uint256)');
const OP20_BALANCE_OF_SELECTOR: Selector = encodeSelector('balanceOf(address)');

// RVT vault selector
const DISTRIBUTE_REWARD_SELECTOR: Selector = encodeSelector(
    'distributeReward(address,uint256)',
);

// =============================================
// EVENTS
// =============================================

@final class DistributedEvent extends NetEvent {
    constructor(token: Address, total: u256, teamAmount: u256, vaultAmount: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH * 3);
        data.writeAddress(token);
        data.writeU256(total);
        data.writeU256(teamAmount);
        data.writeU256(vaultAmount);
        super('Distributed', data);
    }
}

@final class ConfigChangedEvent extends NetEvent {
    constructor(rvtVault: Address, teamWallet: Address, teamBps: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH * 2 + U256_BYTE_LENGTH);
        data.writeAddress(rvtVault);
        data.writeAddress(teamWallet);
        data.writeU256(teamBps);
        super('ConfigChanged', data);
    }
}

export class FeeRouter extends OP_NET {
    // --- Storage pointers ---
    private readonly ownerPointer: u16 = Blockchain.nextPointer;
    private readonly rvtVaultPointer: u16 = Blockchain.nextPointer;
    private readonly teamWalletPointer: u16 = Blockchain.nextPointer;
    private readonly teamBpsPointer: u16 = Blockchain.nextPointer;
    private readonly lockedPointer: u16 = Blockchain.nextPointer;
    private readonly totalDistributedPointer: u16 = Blockchain.nextPointer;

    // --- Storage instances ---
    private readonly ownerStore: StoredAddress = new StoredAddress(this.ownerPointer);
    private readonly rvtVaultStore: StoredAddress = new StoredAddress(this.rvtVaultPointer);
    private readonly teamWalletStore: StoredAddress = new StoredAddress(this.teamWalletPointer);
    private readonly teamBpsStore: StoredU256 = new StoredU256(this.teamBpsPointer, EMPTY_POINTER);
    private readonly lockedStore: StoredBoolean = new StoredBoolean(this.lockedPointer, false);
    private readonly totalDistributedStore: StoredU256 = new StoredU256(
        this.totalDistributedPointer,
        EMPTY_POINTER,
    );

    public constructor() {
        super();
    }

    public onDeployment(_calldata: Calldata): void {
        this.ownerStore.value = Blockchain.tx.origin;
        this.teamWalletStore.value = Blockchain.tx.origin;
        this.teamBpsStore.value = DEFAULT_TEAM_BPS;
        this.lockedStore.value = false;
        this.totalDistributedStore.value = u256.Zero;
    }

    // =============================================
    // GUARDS
    // =============================================

    private _onlyOwner(): void {
        const sender: Address = Blockchain.tx.sender;
        const currentOwner: Address = this.ownerStore.value;
        if (sender != currentOwner) {
            throw new Revert('Only owner');
        }
    }

    private _nonReentrant(): void {
        if (this.lockedStore.value) {
            throw new Revert('Reentrancy');
        }
        this.lockedStore.value = true;
    }

    private _unlock(): void {
        this.lockedStore.value = false;
    }

    // =============================================
    // ADMIN METHODS
    // =============================================

    @method({ name: 'vault', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private setRvtVault(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const vault: Address = calldata.readAddress();
        this.rvtVaultStore.value = vault;

        this.emitEvent(
            new ConfigChangedEvent(vault, this.teamWalletStore.value, this.teamBpsStore.value),
        );

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'wallet', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private setTeamWallet(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const wallet: Address = calldata.readAddress();
        this.teamWalletStore.value = wallet;

        this.emitEvent(
            new ConfigChangedEvent(this.rvtVaultStore.value, wallet, this.teamBpsStore.value),
        );

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'bps', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private setTeamBps(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const bps: u256 = calldata.readU256();

        if (u256.gt(bps, MAX_TEAM_BPS)) {
            throw new Revert('Team cut too high (max 30%)');
        }

        this.teamBpsStore.value = bps;

        this.emitEvent(
            new ConfigChangedEvent(this.rvtVaultStore.value, this.teamWalletStore.value, bps),
        );

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // =============================================
    // CORE: DISTRIBUTE
    // =============================================

    /**
     * Anyone can call this to distribute a token held by the router.
     * 1. Queries own balance of `token`
     * 2. Sends teamBps% to teamWallet
     * 3. Approves RVT vault for remainder
     * 4. Calls distributeReward(token, remainder) on RVT vault
     *
     * Fully trustless: no admin involvement needed.
     */
    @method({ name: 'token', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'distributed', type: ABIDataTypes.UINT256 })
    private distribute(calldata: Calldata): BytesWriter {
        this._nonReentrant();

        const token: Address = calldata.readAddress();
        const rvtVault: Address = this.rvtVaultStore.value;
        const teamWallet: Address = this.teamWalletStore.value;
        const teamBps: u256 = this.teamBpsStore.value;

        // Validate config
        const zeroCheck = new BytesWriter(ADDRESS_BYTE_LENGTH);
        zeroCheck.writeAddress(rvtVault);
        const rvtBytes = zeroCheck.getBuffer();
        let allZero: bool = true;
        for (let i: i32 = 0; i < rvtBytes.length; i++) {
            if (rvtBytes[i] != 0) {
                allZero = false;
                break;
            }
        }
        if (allZero) {
            throw new Revert('RVT vault not configured');
        }

        // Get our balance of this token
        const balance: u256 = this._getBalance(token);
        if (u256.eq(balance, u256.Zero)) {
            throw new Revert('No tokens to distribute');
        }

        // Calculate split
        const teamAmount: u256 = SafeMath.div(SafeMath.mul(balance, teamBps), BPS_DENOMINATOR);
        const vaultAmount: u256 = SafeMath.sub(balance, teamAmount);

        // 1. Send team cut
        if (u256.gt(teamAmount, u256.Zero)) {
            this._transfer(token, teamWallet, teamAmount);
        }

        // 2. Approve RVT vault to pull remainder
        if (u256.gt(vaultAmount, u256.Zero)) {
            this._approve(token, rvtVault, vaultAmount);

            // 3. Call distributeReward on RVT vault
            this._callDistributeReward(rvtVault, token, vaultAmount);
        }

        // Track total distributed
        this.totalDistributedStore.value = SafeMath.add(
            this.totalDistributedStore.value,
            balance,
        );

        this.emitEvent(new DistributedEvent(token, balance, teamAmount, vaultAmount));

        this._unlock();

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(balance);
        return writer;
    }

    // =============================================
    // VIEW METHODS
    // =============================================

    @method()
    @returns(
        { name: 'owner', type: ABIDataTypes.ADDRESS },
        { name: 'rvtVault', type: ABIDataTypes.ADDRESS },
        { name: 'teamWallet', type: ABIDataTypes.ADDRESS },
        { name: 'teamBps', type: ABIDataTypes.UINT256 },
        { name: 'totalDistributed', type: ABIDataTypes.UINT256 },
    )
    private getConfig(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH * 3 + U256_BYTE_LENGTH * 2);
        writer.writeAddress(this.ownerStore.value);
        writer.writeAddress(this.rvtVaultStore.value);
        writer.writeAddress(this.teamWalletStore.value);
        writer.writeU256(this.teamBpsStore.value);
        writer.writeU256(this.totalDistributedStore.value);
        return writer;
    }

    @method()
    @returns({ name: 'owner', type: ABIDataTypes.ADDRESS })
    private getOwner(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(ADDRESS_BYTE_LENGTH);
        writer.writeAddress(this.ownerStore.value);
        return writer;
    }

    // =============================================
    // INTERNAL HELPERS
    // =============================================

    private _getBalance(token: Address): u256 {
        const self: Address = Blockchain.contract.address;

        const cd: BytesWriter = new BytesWriter(36);
        cd.writeSelector(OP20_BALANCE_OF_SELECTOR);
        cd.writeAddress(self);

        const result: CallResult = Blockchain.call(token, cd, true);
        if (!result.success) {
            throw new Revert('balanceOf call failed');
        }

        // Read u256 from return data
        return result.data.readU256();
    }

    private _transfer(token: Address, to: Address, amount: u256): void {
        const cd: BytesWriter = new BytesWriter(68);
        cd.writeSelector(OP20_TRANSFER_SELECTOR);
        cd.writeAddress(to);
        cd.writeU256(amount);

        const result: CallResult = Blockchain.call(token, cd, true);
        if (!result.success) {
            throw new Revert('Token transfer failed');
        }
    }

    private _approve(token: Address, spender: Address, amount: u256): void {
        const cd: BytesWriter = new BytesWriter(68);
        cd.writeSelector(OP20_APPROVE_SELECTOR);
        cd.writeAddress(spender);
        cd.writeU256(amount);

        const result: CallResult = Blockchain.call(token, cd, true);
        if (!result.success) {
            throw new Revert('Token approve failed');
        }
    }

    private _callDistributeReward(vault: Address, token: Address, amount: u256): void {
        const cd: BytesWriter = new BytesWriter(100);
        cd.writeSelector(DISTRIBUTE_REWARD_SELECTOR);
        cd.writeAddress(token);
        cd.writeU256(amount);

        const result: CallResult = Blockchain.call(vault, cd, true);
        if (!result.success) {
            throw new Revert('distributeReward call failed');
        }
    }
}
