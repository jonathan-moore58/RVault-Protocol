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
    AddressMemoryMap,
    SafeMath,
    U256_BYTE_LENGTH,
} from '@btc-vision/btc-runtime/runtime';
import { EMPTY_POINTER } from '@btc-vision/btc-runtime/runtime/math/bytes';
import { CallResult } from '@btc-vision/btc-runtime/runtime/env/BlockchainEnvironment';

const PRECISION: u256 = u256.fromString('1000000000000000000'); // 1e18
const DEFAULT_MIN_DEPOSIT: u256 = u256.fromString('1000000000000000000'); // 1e18
const DEFAULT_COOLDOWN_BLOCKS: u256 = u256.fromU64(6); // ~1 hour on Bitcoin
const DEFAULT_PROTOCOL_FEE_BPS: u256 = u256.fromU64(500); // 5% = 500 basis points
const BPS_DENOMINATOR: u256 = u256.fromU64(10000);

// OP20 selectors for cross-contract calls
const OP20_TRANSFER_SELECTOR: Selector = encodeSelector('transfer(address,uint256)');
const OP20_TRANSFER_FROM_SELECTOR: Selector = encodeSelector(
    'transferFrom(address,address,uint256)',
);

// =============================================
// EVENTS
// =============================================

@final class DepositEvent extends NetEvent {
    constructor(user: Address, amount: u256, shares: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH * 2);
        data.writeAddress(user);
        data.writeU256(amount);
        data.writeU256(shares);
        super('Deposit', data);
    }
}

@final class WithdrawEvent extends NetEvent {
    constructor(user: Address, shares: u256, amountOut: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH * 2);
        data.writeAddress(user);
        data.writeU256(shares);
        data.writeU256(amountOut);
        super('Withdraw', data);
    }
}

@final class ClaimRevenueEvent extends NetEvent {
    constructor(user: Address, amount: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH);
        data.writeAddress(user);
        data.writeU256(amount);
        super('ClaimRevenue', data);
    }
}

@final class CollectFeesEvent extends NetEvent {
    constructor(sender: Address, amount: u256, protocolCut: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH * 2);
        data.writeAddress(sender);
        data.writeU256(amount);
        data.writeU256(protocolCut);
        super('CollectFees', data);
    }
}

@final class AutoCompoundEvent extends NetEvent {
    constructor(user: Address, revenue: u256, newShares: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH * 2);
        data.writeAddress(user);
        data.writeU256(revenue);
        data.writeU256(newShares);
        super('AutoCompound', data);
    }
}

@final class EmergencyWithdrawEvent extends NetEvent {
    constructor(user: Address, shares: u256, amountOut: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH + U256_BYTE_LENGTH * 2);
        data.writeAddress(user);
        data.writeU256(shares);
        data.writeU256(amountOut);
        super('EmergencyWithdraw', data);
    }
}

@final class PausedEvent extends NetEvent {
    constructor(account: Address) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH);
        data.writeAddress(account);
        super('Paused', data);
    }
}

@final class UnpausedEvent extends NetEvent {
    constructor(account: Address) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH);
        data.writeAddress(account);
        super('Unpaused', data);
    }
}

@final class MinimumDepositChangedEvent extends NetEvent {
    constructor(newAmount: u256) {
        const data = new BytesWriter(U256_BYTE_LENGTH);
        data.writeU256(newAmount);
        super('MinimumDepositChanged', data);
    }
}

@final class ProtocolFeeChangedEvent extends NetEvent {
    constructor(newBps: u256) {
        const data = new BytesWriter(U256_BYTE_LENGTH);
        data.writeU256(newBps);
        super('ProtocolFeeChanged', data);
    }
}

@final class FeeRecipientChangedEvent extends NetEvent {
    constructor(newRecipient: Address) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH);
        data.writeAddress(newRecipient);
        super('FeeRecipientChanged', data);
    }
}

@final class CooldownChangedEvent extends NetEvent {
    constructor(newBlocks: u256) {
        const data = new BytesWriter(U256_BYTE_LENGTH);
        data.writeU256(newBlocks);
        super('CooldownChanged', data);
    }
}

@final class DistributeRewardEvent extends NetEvent {
    constructor(sender: Address, token: Address, amount: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH * 2 + U256_BYTE_LENGTH);
        data.writeAddress(sender);
        data.writeAddress(token);
        data.writeU256(amount);
        super('DistributeReward', data);
    }
}

@final class ClaimRewardEvent extends NetEvent {
    constructor(user: Address, token: Address, amount: u256) {
        const data = new BytesWriter(ADDRESS_BYTE_LENGTH * 2 + U256_BYTE_LENGTH);
        data.writeAddress(user);
        data.writeAddress(token);
        data.writeU256(amount);
        super('ClaimReward', data);
    }
}

@final class RewardTokenAddedEvent extends NetEvent {
    constructor(slot: u256, token: Address) {
        const data = new BytesWriter(U256_BYTE_LENGTH + ADDRESS_BYTE_LENGTH);
        data.writeU256(slot);
        data.writeAddress(token);
        super('RewardTokenAdded', data);
    }
}

export class RevenueVault extends OP_NET {
    // --- Storage pointers ---
    private readonly depositTokenPointer: u16 = Blockchain.nextPointer;
    private readonly ownerPointer: u16 = Blockchain.nextPointer;
    private readonly totalDepositedPointer: u16 = Blockchain.nextPointer;
    private readonly totalSharesPointer: u16 = Blockchain.nextPointer;
    private readonly totalFeesPointer: u16 = Blockchain.nextPointer;
    private readonly accumulatorPointer: u16 = Blockchain.nextPointer;
    private readonly userSharesPointer: u16 = Blockchain.nextPointer;
    private readonly userDepositedPointer: u16 = Blockchain.nextPointer;
    private readonly userDebtPointer: u16 = Blockchain.nextPointer;
    private readonly userClaimedPointer: u16 = Blockchain.nextPointer;
    private readonly pausedPointer: u16 = Blockchain.nextPointer;
    private readonly minDepositPointer: u16 = Blockchain.nextPointer;
    private readonly lockedPointer: u16 = Blockchain.nextPointer;
    private readonly protocolFeeBpsPointer: u16 = Blockchain.nextPointer;
    private readonly protocolFeeRecipientPointer: u16 = Blockchain.nextPointer;
    private readonly totalProtocolFeesPointer: u16 = Blockchain.nextPointer;
    private readonly cooldownBlocksPointer: u16 = Blockchain.nextPointer;
    private readonly userLastDepositBlockPointer: u16 = Blockchain.nextPointer;

    // --- External reward token storage (2 slots) ---
    private readonly rewardTokenCountPointer: u16 = Blockchain.nextPointer;
    private readonly rewardToken0Pointer: u16 = Blockchain.nextPointer;
    private readonly rewardAccum0Pointer: u16 = Blockchain.nextPointer;
    private readonly rewardTotal0Pointer: u16 = Blockchain.nextPointer;
    private readonly rewardUserDebt0Pointer: u16 = Blockchain.nextPointer;
    private readonly rewardToken1Pointer: u16 = Blockchain.nextPointer;
    private readonly rewardAccum1Pointer: u16 = Blockchain.nextPointer;
    private readonly rewardTotal1Pointer: u16 = Blockchain.nextPointer;
    private readonly rewardUserDebt1Pointer: u16 = Blockchain.nextPointer;

    // --- Storage instances ---
    private readonly depositTokenStore: StoredAddress = new StoredAddress(this.depositTokenPointer);
    private readonly ownerStore: StoredAddress = new StoredAddress(this.ownerPointer);
    private readonly totalDepositedStore: StoredU256 = new StoredU256(
        this.totalDepositedPointer,
        EMPTY_POINTER,
    );
    private readonly totalSharesStore: StoredU256 = new StoredU256(
        this.totalSharesPointer,
        EMPTY_POINTER,
    );
    private readonly totalFeesStore: StoredU256 = new StoredU256(this.totalFeesPointer, EMPTY_POINTER);
    private readonly accumulatorStore: StoredU256 = new StoredU256(
        this.accumulatorPointer,
        EMPTY_POINTER,
    );
    private readonly userSharesMap: AddressMemoryMap = new AddressMemoryMap(this.userSharesPointer);
    private readonly userDepositedMap: AddressMemoryMap = new AddressMemoryMap(
        this.userDepositedPointer,
    );
    private readonly userRevenueDebtMap: AddressMemoryMap = new AddressMemoryMap(this.userDebtPointer);
    private readonly userClaimedRevenueMap: AddressMemoryMap = new AddressMemoryMap(
        this.userClaimedPointer,
    );
    private readonly pausedStore: StoredBoolean = new StoredBoolean(this.pausedPointer, false);
    private readonly minimumDepositStore: StoredU256 = new StoredU256(
        this.minDepositPointer,
        EMPTY_POINTER,
    );
    private readonly lockedStore: StoredBoolean = new StoredBoolean(this.lockedPointer, false);
    private readonly protocolFeeBpsStore: StoredU256 = new StoredU256(
        this.protocolFeeBpsPointer,
        EMPTY_POINTER,
    );
    private readonly protocolFeeRecipientStore: StoredAddress = new StoredAddress(
        this.protocolFeeRecipientPointer,
    );
    private readonly totalProtocolFeesStore: StoredU256 = new StoredU256(
        this.totalProtocolFeesPointer,
        EMPTY_POINTER,
    );
    private readonly cooldownBlocksStore: StoredU256 = new StoredU256(
        this.cooldownBlocksPointer,
        EMPTY_POINTER,
    );
    private readonly userLastDepositBlockMap: AddressMemoryMap = new AddressMemoryMap(
        this.userLastDepositBlockPointer,
    );

    // --- External reward storage instances ---
    private readonly rewardTokenCountStore: StoredU256 = new StoredU256(
        this.rewardTokenCountPointer,
        EMPTY_POINTER,
    );
    private readonly rewardToken0Store: StoredAddress = new StoredAddress(this.rewardToken0Pointer);
    private readonly rewardAccum0Store: StoredU256 = new StoredU256(this.rewardAccum0Pointer, EMPTY_POINTER);
    private readonly rewardTotal0Store: StoredU256 = new StoredU256(this.rewardTotal0Pointer, EMPTY_POINTER);
    private readonly rewardUserDebt0Map: AddressMemoryMap = new AddressMemoryMap(this.rewardUserDebt0Pointer);
    private readonly rewardToken1Store: StoredAddress = new StoredAddress(this.rewardToken1Pointer);
    private readonly rewardAccum1Store: StoredU256 = new StoredU256(this.rewardAccum1Pointer, EMPTY_POINTER);
    private readonly rewardTotal1Store: StoredU256 = new StoredU256(this.rewardTotal1Pointer, EMPTY_POINTER);
    private readonly rewardUserDebt1Map: AddressMemoryMap = new AddressMemoryMap(this.rewardUserDebt1Pointer);

    public constructor() {
        super();
    }

    public onDeployment(_calldata: Calldata): void {
        this.ownerStore.value = Blockchain.tx.origin;

        this.totalDepositedStore.value = u256.Zero;
        this.totalSharesStore.value = u256.Zero;
        this.totalFeesStore.value = u256.Zero;
        this.accumulatorStore.value = u256.Zero;
        this.pausedStore.value = false;
        this.minimumDepositStore.value = DEFAULT_MIN_DEPOSIT;

        this.lockedStore.value = false;
        this.protocolFeeBpsStore.value = DEFAULT_PROTOCOL_FEE_BPS;
        this.protocolFeeRecipientStore.value = Blockchain.tx.origin;
        this.totalProtocolFeesStore.value = u256.Zero;
        this.cooldownBlocksStore.value = DEFAULT_COOLDOWN_BLOCKS;

        this.rewardTokenCountStore.value = u256.Zero;
        this.rewardAccum0Store.value = u256.Zero;
        this.rewardTotal0Store.value = u256.Zero;
        this.rewardAccum1Store.value = u256.Zero;
        this.rewardTotal1Store.value = u256.Zero;
    }

    // No manual execute() override needed — OPNetTransform auto-generates
    // the dispatch table from @method() decorated methods below.

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

    private _whenNotPaused(): void {
        if (this.pausedStore.value) {
            throw new Revert('Vault is paused');
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

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private pause(_calldata: Calldata): BytesWriter {
        this._onlyOwner();
        if (this.pausedStore.value) {
            throw new Revert('Already paused');
        }
        this.pausedStore.value = true;

        this.emitEvent(new PausedEvent(Blockchain.tx.sender));

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method()
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private unpause(_calldata: Calldata): BytesWriter {
        this._onlyOwner();
        if (!this.pausedStore.value) {
            throw new Revert('Not paused');
        }
        this.pausedStore.value = false;

        this.emitEvent(new UnpausedEvent(Blockchain.tx.sender));

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private setMinimumDeposit(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const amount: u256 = calldata.readU256();

        if (u256.eq(amount, u256.Zero)) {
            throw new Revert('Min deposit must be > 0');
        }

        this.minimumDepositStore.value = amount;

        this.emitEvent(new MinimumDepositChangedEvent(amount));

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'bps', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private setProtocolFee(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const bps: u256 = calldata.readU256();

        const maxBps: u256 = u256.fromU64(2000);
        if (u256.gt(bps, maxBps)) {
            throw new Revert('Fee too high (max 20%)');
        }

        this.protocolFeeBpsStore.value = bps;

        this.emitEvent(new ProtocolFeeChangedEvent(bps));

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'recipient', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private setProtocolFeeRecipient(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const recipient: Address = calldata.readAddress();
        this.protocolFeeRecipientStore.value = recipient;

        this.emitEvent(new FeeRecipientChangedEvent(recipient));

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'blocks', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private setCooldownBlocks(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const blocks: u256 = calldata.readU256();

        const maxBlocks: u256 = u256.fromU64(144);
        if (u256.gt(blocks, maxBlocks)) {
            throw new Revert('Cooldown too long (max 144 blocks)');
        }

        this.cooldownBlocksStore.value = blocks;

        this.emitEvent(new CooldownChangedEvent(blocks));

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'token', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private setDepositToken(calldata: Calldata): BytesWriter {
        this._onlyOwner();

        // SAFETY: Prevent switching tokens while deposits exist — would lock user funds
        const totalDeposited: u256 = this.totalDepositedStore.value;
        if (u256.gt(totalDeposited, u256.Zero)) {
            throw new Revert('Cannot change token while deposits exist');
        }

        const token: Address = calldata.readAddress();
        this.depositTokenStore.value = token;

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // =============================================
    // EXTERNAL REWARD ADMIN
    // =============================================

    @method({ name: 'token', type: ABIDataTypes.ADDRESS })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private addRewardToken(calldata: Calldata): BytesWriter {
        this._onlyOwner();
        const token: Address = calldata.readAddress();
        const count: u256 = this.rewardTokenCountStore.value;
        const MAX_REWARD_TOKENS: u256 = u256.fromU64(2);

        if (u256.ge(count, MAX_REWARD_TOKENS)) {
            throw new Revert('Max 2 reward tokens');
        }

        // Prevent duplicates
        if (u256.gt(count, u256.Zero) && this.rewardToken0Store.value == token) {
            throw new Revert('Token already added');
        }

        if (u256.eq(count, u256.Zero)) {
            this.rewardToken0Store.value = token;
        } else {
            this.rewardToken1Store.value = token;
        }

        const newCount: u256 = SafeMath.add(count, u256.One);
        this.rewardTokenCountStore.value = newCount;

        this.emitEvent(new RewardTokenAddedEvent(count, token));

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // =============================================
    // EXTERNAL REWARD WRITE
    // =============================================

    @method(
        { name: 'token', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private distributeReward(calldata: Calldata): BytesWriter {
        this._nonReentrant();

        const token: Address = calldata.readAddress();
        const amount: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;
        const currentTotalShares: u256 = this.totalSharesStore.value;

        if (u256.eq(amount, u256.Zero)) {
            throw new Revert('Amount must be > 0');
        }
        if (u256.eq(currentTotalShares, u256.Zero)) {
            throw new Revert('No shares exist');
        }

        // Find which slot this token belongs to
        const count: u256 = this.rewardTokenCountStore.value;
        let slot: i32 = -1;

        if (u256.gt(count, u256.Zero) && this.rewardToken0Store.value == token) {
            slot = 0;
        } else if (u256.gt(count, u256.One) && this.rewardToken1Store.value == token) {
            slot = 1;
        }

        if (slot < 0) {
            throw new Revert('Token not registered as reward');
        }

        // Update accumulator for this slot
        const scaledAmount: u256 = SafeMath.mul(amount, PRECISION);
        const perShareIncrease: u256 = SafeMath.div(scaledAmount, currentTotalShares);

        if (slot == 0) {
            this.rewardAccum0Store.value = SafeMath.add(this.rewardAccum0Store.value, perShareIncrease);
            this.rewardTotal0Store.value = SafeMath.add(this.rewardTotal0Store.value, amount);
        } else {
            this.rewardAccum1Store.value = SafeMath.add(this.rewardAccum1Store.value, perShareIncrease);
            this.rewardTotal1Store.value = SafeMath.add(this.rewardTotal1Store.value, amount);
        }

        // Transfer tokens from sender to vault
        this._transferTokenFrom(token, sender, amount);

        this.emitEvent(new DistributeRewardEvent(sender, token, amount));

        this._unlock();

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method()
    @returns(
        { name: 'reward0', type: ABIDataTypes.UINT256 },
        { name: 'reward1', type: ABIDataTypes.UINT256 },
    )
    private claimAllRewards(_calldata: Calldata): BytesWriter {
        this._whenNotPaused();
        this._nonReentrant();

        const sender: Address = Blockchain.tx.sender;
        const shares: u256 = this.userSharesMap.get(sender);

        if (u256.eq(shares, u256.Zero)) {
            throw new Revert('No shares');
        }

        const count: u256 = this.rewardTokenCountStore.value;
        let claimed0: u256 = u256.Zero;
        let claimed1: u256 = u256.Zero;

        // Claim slot 0
        if (u256.gt(count, u256.Zero)) {
            claimed0 = this._pendingReward0(sender);
            if (u256.gt(claimed0, u256.Zero)) {
                this.rewardUserDebt0Map.set(sender, this.rewardAccum0Store.value);
                const token0: Address = this.rewardToken0Store.value;
                this._transferTokenTo(token0, sender, claimed0);
                this.emitEvent(new ClaimRewardEvent(sender, token0, claimed0));
            } else {
                this.rewardUserDebt0Map.set(sender, this.rewardAccum0Store.value);
            }
        }

        // Claim slot 1
        if (u256.gt(count, u256.One)) {
            claimed1 = this._pendingReward1(sender);
            if (u256.gt(claimed1, u256.Zero)) {
                this.rewardUserDebt1Map.set(sender, this.rewardAccum1Store.value);
                const token1: Address = this.rewardToken1Store.value;
                this._transferTokenTo(token1, sender, claimed1);
                this.emitEvent(new ClaimRewardEvent(sender, token1, claimed1));
            } else {
                this.rewardUserDebt1Map.set(sender, this.rewardAccum1Store.value);
            }
        }

        this._unlock();

        const writer: BytesWriter = new BytesWriter(64);
        writer.writeU256(claimed0);
        writer.writeU256(claimed1);
        return writer;
    }

    // =============================================
    // WRITE METHODS
    // =============================================

    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private deposit(calldata: Calldata): BytesWriter {
        this._whenNotPaused();
        this._nonReentrant();

        const amount: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;
        const currentTotalShares: u256 = this.totalSharesStore.value;
        const currentTotalDeposited: u256 = this.totalDepositedStore.value;

        if (u256.eq(amount, u256.Zero)) {
            throw new Revert('Deposit amount must be > 0');
        }

        const minDeposit: u256 = this.minimumDepositStore.value;
        if (u256.eq(currentTotalShares, u256.Zero)) {
            if (u256.lt(amount, minDeposit)) {
                throw new Revert('First deposit must be >= minimum');
            }
        }

        this._settleRevenue(sender);

        let sharesToMint: u256;
        if (u256.eq(currentTotalShares, u256.Zero)) {
            sharesToMint = amount;
        } else {
            sharesToMint = SafeMath.div(
                SafeMath.mul(amount, currentTotalShares),
                currentTotalDeposited,
            );
        }

        if (u256.eq(sharesToMint, u256.Zero)) {
            throw new Revert('Deposit too small for shares');
        }

        const newUserShares: u256 = SafeMath.add(this.userSharesMap.get(sender), sharesToMint);
        this.userSharesMap.set(sender, newUserShares);

        const newUserDeposited: u256 = SafeMath.add(this.userDepositedMap.get(sender), amount);
        this.userDepositedMap.set(sender, newUserDeposited);

        this.totalSharesStore.value = SafeMath.add(currentTotalShares, sharesToMint);
        this.totalDepositedStore.value = SafeMath.add(currentTotalDeposited, amount);

        this.userRevenueDebtMap.set(sender, this.accumulatorStore.value);
        this._syncRewardDebts(sender);
        this.userLastDepositBlockMap.set(sender, Blockchain.block.numberU256);

        this._transferFromSender(sender, amount);

        this.emitEvent(new DepositEvent(sender, amount, sharesToMint));

        this._unlock();

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    private collectFees(calldata: Calldata): BytesWriter {
        this._nonReentrant();

        const amount: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;
        const currentTotalShares: u256 = this.totalSharesStore.value;

        if (u256.eq(amount, u256.Zero)) {
            throw new Revert('Fee amount must be > 0');
        }

        if (u256.eq(currentTotalShares, u256.Zero)) {
            throw new Revert('No shares exist to distribute fees');
        }

        const feeBps: u256 = this.protocolFeeBpsStore.value;
        let distributedAmount: u256 = amount;
        let protocolCut: u256 = u256.Zero;

        if (u256.gt(feeBps, u256.Zero)) {
            protocolCut = SafeMath.div(SafeMath.mul(amount, feeBps), BPS_DENOMINATOR);
            distributedAmount = SafeMath.sub(amount, protocolCut);
            this.totalProtocolFeesStore.value = SafeMath.add(
                this.totalProtocolFeesStore.value,
                protocolCut,
            );
        }

        const scaledAmount: u256 = SafeMath.mul(distributedAmount, PRECISION);
        const perShareIncrease: u256 = SafeMath.div(scaledAmount, currentTotalShares);
        const currentAccumulator: u256 = this.accumulatorStore.value;
        this.accumulatorStore.value = SafeMath.add(currentAccumulator, perShareIncrease);

        this.totalFeesStore.value = SafeMath.add(this.totalFeesStore.value, amount);

        this._transferFromSender(sender, amount);

        if (u256.gt(protocolCut, u256.Zero)) {
            const recipient: Address = this.protocolFeeRecipientStore.value;
            this._transferToUser(recipient, protocolCut);
        }

        this.emitEvent(new CollectFeesEvent(sender, amount, protocolCut));

        this._unlock();

        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    @method()
    @returns({ name: 'claimed', type: ABIDataTypes.UINT256 })
    private claimRevenue(_calldata: Calldata): BytesWriter {
        this._whenNotPaused();
        this._nonReentrant();

        const sender: Address = Blockchain.tx.sender;

        const pending: u256 = this._pendingRevenue(sender);
        if (u256.eq(pending, u256.Zero)) {
            throw new Revert('No revenue to claim');
        }

        this.userRevenueDebtMap.set(sender, this.accumulatorStore.value);
        const totalClaimed: u256 = SafeMath.add(this.userClaimedRevenueMap.get(sender), pending);
        this.userClaimedRevenueMap.set(sender, totalClaimed);

        this._transferToUser(sender, pending);

        this.emitEvent(new ClaimRevenueEvent(sender, pending));

        this._unlock();

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(pending);
        return writer;
    }

    @method({ name: 'shares', type: ABIDataTypes.UINT256 })
    @returns({ name: 'amountOut', type: ABIDataTypes.UINT256 })
    private withdraw(calldata: Calldata): BytesWriter {
        this._whenNotPaused();
        this._nonReentrant();

        const sharesToBurn: u256 = calldata.readU256();
        const sender: Address = Blockchain.tx.sender;
        const currentUserShares: u256 = this.userSharesMap.get(sender);
        const currentTotalShares: u256 = this.totalSharesStore.value;
        const currentTotalDeposited: u256 = this.totalDepositedStore.value;

        if (u256.eq(sharesToBurn, u256.Zero)) {
            throw new Revert('Shares must be > 0');
        }

        if (u256.gt(sharesToBurn, currentUserShares)) {
            throw new Revert('Insufficient shares');
        }

        this._checkCooldown(sender);

        // Auto-claim main revenue
        const pending: u256 = this._pendingRevenue(sender);
        if (u256.gt(pending, u256.Zero)) {
            this.userRevenueDebtMap.set(sender, this.accumulatorStore.value);
            const totalClaimed: u256 = SafeMath.add(
                this.userClaimedRevenueMap.get(sender),
                pending,
            );
            this.userClaimedRevenueMap.set(sender, totalClaimed);
            this._transferToUser(sender, pending);
            this.emitEvent(new ClaimRevenueEvent(sender, pending));
        }

        // Auto-claim external rewards
        this._settleExternalRewards(sender);

        const amountOut: u256 = SafeMath.div(
            SafeMath.mul(sharesToBurn, currentTotalDeposited),
            currentTotalShares,
        );

        this.userSharesMap.set(sender, SafeMath.sub(currentUserShares, sharesToBurn));
        this.userDepositedMap.set(sender, SafeMath.sub(this.userDepositedMap.get(sender), amountOut));
        this.totalSharesStore.value = SafeMath.sub(currentTotalShares, sharesToBurn);
        this.totalDepositedStore.value = SafeMath.sub(currentTotalDeposited, amountOut);

        const remainingShares: u256 = this.userSharesMap.get(sender);
        if (u256.gt(remainingShares, u256.Zero)) {
            this.userRevenueDebtMap.set(sender, this.accumulatorStore.value);
            this._syncRewardDebts(sender);
        } else {
            this.userRevenueDebtMap.set(sender, u256.Zero);
            this.rewardUserDebt0Map.set(sender, u256.Zero);
            this.rewardUserDebt1Map.set(sender, u256.Zero);
        }

        this._transferToUser(sender, amountOut);

        this.emitEvent(new WithdrawEvent(sender, sharesToBurn, amountOut));

        this._unlock();

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(amountOut);
        return writer;
    }

    @method()
    @returns({ name: 'amountOut', type: ABIDataTypes.UINT256 })
    private emergencyWithdraw(_calldata: Calldata): BytesWriter {
        this._nonReentrant();

        const sender: Address = Blockchain.tx.sender;
        const currentUserShares: u256 = this.userSharesMap.get(sender);
        const currentTotalShares: u256 = this.totalSharesStore.value;
        const currentTotalDeposited: u256 = this.totalDepositedStore.value;

        if (u256.eq(currentUserShares, u256.Zero)) {
            throw new Revert('No shares to withdraw');
        }

        const amountOut: u256 = SafeMath.div(
            SafeMath.mul(currentUserShares, currentTotalDeposited),
            currentTotalShares,
        );

        // Settle external rewards before zeroing shares
        this._settleExternalRewards(sender);

        this.userSharesMap.set(sender, u256.Zero);
        this.userDepositedMap.set(sender, u256.Zero);
        this.userRevenueDebtMap.set(sender, u256.Zero);
        this.rewardUserDebt0Map.set(sender, u256.Zero);
        this.rewardUserDebt1Map.set(sender, u256.Zero);

        this.totalSharesStore.value = SafeMath.sub(currentTotalShares, currentUserShares);
        this.totalDepositedStore.value = SafeMath.sub(currentTotalDeposited, amountOut);

        this._transferToUser(sender, amountOut);

        this.emitEvent(new EmergencyWithdrawEvent(sender, currentUserShares, amountOut));

        this._unlock();

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(amountOut);
        return writer;
    }

    @method()
    @returns({ name: 'newShares', type: ABIDataTypes.UINT256 })
    private autoCompound(_calldata: Calldata): BytesWriter {
        this._whenNotPaused();
        this._nonReentrant();

        const sender: Address = Blockchain.tx.sender;
        const pending: u256 = this._pendingRevenue(sender);

        if (u256.eq(pending, u256.Zero)) {
            throw new Revert('No revenue to compound');
        }

        const currentTotalShares: u256 = this.totalSharesStore.value;
        const currentTotalDeposited: u256 = this.totalDepositedStore.value;

        let newShares: u256;
        if (u256.eq(currentTotalShares, u256.Zero)) {
            newShares = pending;
        } else {
            newShares = SafeMath.div(
                SafeMath.mul(pending, currentTotalShares),
                currentTotalDeposited,
            );
        }

        if (u256.eq(newShares, u256.Zero)) {
            throw new Revert('Revenue too small to compound');
        }

        this.userRevenueDebtMap.set(sender, this.accumulatorStore.value);

        const updatedShares: u256 = SafeMath.add(this.userSharesMap.get(sender), newShares);
        this.userSharesMap.set(sender, updatedShares);

        const updatedDeposited: u256 = SafeMath.add(this.userDepositedMap.get(sender), pending);
        this.userDepositedMap.set(sender, updatedDeposited);

        this.totalSharesStore.value = SafeMath.add(currentTotalShares, newShares);
        this.totalDepositedStore.value = SafeMath.add(currentTotalDeposited, pending);

        const totalClaimed: u256 = SafeMath.add(this.userClaimedRevenueMap.get(sender), pending);
        this.userClaimedRevenueMap.set(sender, totalClaimed);

        this.emitEvent(new AutoCompoundEvent(sender, pending, newShares));

        this._unlock();

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(newShares);
        return writer;
    }

    // =============================================
    // VIEW METHODS
    // =============================================

    @method()
    @returns(
        { name: 'totalDeposited', type: ABIDataTypes.UINT256 },
        { name: 'totalShares', type: ABIDataTypes.UINT256 },
        { name: 'totalFees', type: ABIDataTypes.UINT256 },
        { name: 'accumulator', type: ABIDataTypes.UINT256 },
    )
    private getVaultInfo(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(128);
        writer.writeU256(this.totalDepositedStore.value);
        writer.writeU256(this.totalSharesStore.value);
        writer.writeU256(this.totalFeesStore.value);
        writer.writeU256(this.accumulatorStore.value);
        return writer;
    }

    @method({ name: 'user', type: ABIDataTypes.ADDRESS })
    @returns(
        { name: 'shares', type: ABIDataTypes.UINT256 },
        { name: 'deposited', type: ABIDataTypes.UINT256 },
        { name: 'pendingRevenue', type: ABIDataTypes.UINT256 },
        { name: 'totalClaimed', type: ABIDataTypes.UINT256 },
    )
    private getUserInfo(calldata: Calldata): BytesWriter {
        const user: Address = calldata.readAddress();

        const writer: BytesWriter = new BytesWriter(128);
        writer.writeU256(this.userSharesMap.get(user));
        writer.writeU256(this.userDepositedMap.get(user));
        writer.writeU256(this._pendingRevenue(user));
        writer.writeU256(this.userClaimedRevenueMap.get(user));
        return writer;
    }

    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'shares', type: ABIDataTypes.UINT256 })
    private previewDeposit(calldata: Calldata): BytesWriter {
        const amount: u256 = calldata.readU256();
        const currentTotalShares: u256 = this.totalSharesStore.value;
        const currentTotalDeposited: u256 = this.totalDepositedStore.value;

        let shares: u256;
        if (u256.eq(currentTotalShares, u256.Zero)) {
            shares = amount;
        } else {
            shares = SafeMath.div(
                SafeMath.mul(amount, currentTotalShares),
                currentTotalDeposited,
            );
        }

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(shares);
        return writer;
    }

    @method({ name: 'shares', type: ABIDataTypes.UINT256 })
    @returns({ name: 'amountOut', type: ABIDataTypes.UINT256 })
    private previewWithdraw(calldata: Calldata): BytesWriter {
        const shares: u256 = calldata.readU256();
        const currentTotalShares: u256 = this.totalSharesStore.value;
        const currentTotalDeposited: u256 = this.totalDepositedStore.value;

        let amountOut: u256;
        if (u256.eq(currentTotalShares, u256.Zero)) {
            amountOut = u256.Zero;
        } else {
            amountOut = SafeMath.div(
                SafeMath.mul(shares, currentTotalDeposited),
                currentTotalShares,
            );
        }

        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(amountOut);
        return writer;
    }

    @method()
    @returns({ name: 'owner', type: ABIDataTypes.ADDRESS })
    private getOwner(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeAddress(this.ownerStore.value);
        return writer;
    }

    @method()
    @returns({ name: 'paused', type: ABIDataTypes.BOOL })
    private isPaused(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(1);
        writer.writeBoolean(this.pausedStore.value);
        return writer;
    }

    @method()
    @returns({ name: 'minimumDeposit', type: ABIDataTypes.UINT256 })
    private getMinimumDeposit(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeU256(this.minimumDepositStore.value);
        return writer;
    }

    @method()
    @returns({ name: 'depositToken', type: ABIDataTypes.ADDRESS })
    private getDepositToken(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32);
        writer.writeAddress(this.depositTokenStore.value);
        return writer;
    }

    @method()
    @returns(
        { name: 'feeBps', type: ABIDataTypes.UINT256 },
        { name: 'feeRecipient', type: ABIDataTypes.ADDRESS },
        { name: 'totalProtocolFees', type: ABIDataTypes.UINT256 },
        { name: 'cooldownBlocks', type: ABIDataTypes.UINT256 },
    )
    private getProtocolInfo(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(128);
        writer.writeU256(this.protocolFeeBpsStore.value);
        writer.writeAddress(this.protocolFeeRecipientStore.value);
        writer.writeU256(this.totalProtocolFeesStore.value);
        writer.writeU256(this.cooldownBlocksStore.value);
        return writer;
    }

    // =============================================
    // EXTERNAL REWARD VIEW METHODS
    // =============================================

    @method()
    @returns(
        { name: 'count', type: ABIDataTypes.UINT256 },
        { name: 'token0', type: ABIDataTypes.ADDRESS },
        { name: 'totalDistributed0', type: ABIDataTypes.UINT256 },
        { name: 'token1', type: ABIDataTypes.ADDRESS },
        { name: 'totalDistributed1', type: ABIDataTypes.UINT256 },
    )
    private getRewardInfo(_calldata: Calldata): BytesWriter {
        const writer: BytesWriter = new BytesWriter(32 + 32 + 32 + 32 + 32);
        writer.writeU256(this.rewardTokenCountStore.value);
        writer.writeAddress(this.rewardToken0Store.value);
        writer.writeU256(this.rewardTotal0Store.value);
        writer.writeAddress(this.rewardToken1Store.value);
        writer.writeU256(this.rewardTotal1Store.value);
        return writer;
    }

    @method({ name: 'user', type: ABIDataTypes.ADDRESS })
    @returns(
        { name: 'pending0', type: ABIDataTypes.UINT256 },
        { name: 'pending1', type: ABIDataTypes.UINT256 },
    )
    private getUserRewardInfo(calldata: Calldata): BytesWriter {
        const user: Address = calldata.readAddress();
        const writer: BytesWriter = new BytesWriter(64);
        writer.writeU256(this._pendingReward0(user));
        writer.writeU256(this._pendingReward1(user));
        return writer;
    }

    // =============================================
    // INTERNAL HELPERS
    // =============================================

    private _pendingRevenue(user: Address): u256 {
        const shares: u256 = this.userSharesMap.get(user);
        if (u256.eq(shares, u256.Zero)) {
            return u256.Zero;
        }

        const accumulator: u256 = this.accumulatorStore.value;
        const debt: u256 = this.userRevenueDebtMap.get(user);

        if (u256.le(accumulator, debt)) {
            return u256.Zero;
        }

        const diff: u256 = SafeMath.sub(accumulator, debt);
        return SafeMath.div(SafeMath.mul(shares, diff), PRECISION);
    }

    private _settleRevenue(user: Address): void {
        const pending: u256 = this._pendingRevenue(user);
        if (u256.gt(pending, u256.Zero)) {
            const totalClaimed: u256 = SafeMath.add(
                this.userClaimedRevenueMap.get(user),
                pending,
            );
            this.userClaimedRevenueMap.set(user, totalClaimed);
            this._transferToUser(user, pending);
            this.emitEvent(new ClaimRevenueEvent(user, pending));
        }
        this.userRevenueDebtMap.set(user, this.accumulatorStore.value);
    }

    private _checkCooldown(user: Address): void {
        const cooldown: u256 = this.cooldownBlocksStore.value;
        if (u256.eq(cooldown, u256.Zero)) return;

        const lastDeposit: u256 = this.userLastDepositBlockMap.get(user);
        if (u256.eq(lastDeposit, u256.Zero)) return;

        const currentBlock: u256 = Blockchain.block.numberU256;
        const unlockBlock: u256 = SafeMath.add(lastDeposit, cooldown);

        if (u256.lt(currentBlock, unlockBlock)) {
            throw new Revert('Withdrawal cooldown active');
        }
    }

    private _transferFromSender(sender: Address, amount: u256): void {
        const token: Address = this.depositTokenStore.value;
        const self: Address = Blockchain.contract.address;

        const cd: BytesWriter = new BytesWriter(100);
        cd.writeSelector(OP20_TRANSFER_FROM_SELECTOR);
        cd.writeAddress(sender);
        cd.writeAddress(self);
        cd.writeU256(amount);

        const result: CallResult = Blockchain.call(token, cd, true);
        if (!result.success) {
            throw new Revert('Token transferFrom failed');
        }
    }

    private _transferToUser(user: Address, amount: u256): void {
        const token: Address = this.depositTokenStore.value;

        const cd: BytesWriter = new BytesWriter(68);
        cd.writeSelector(OP20_TRANSFER_SELECTOR);
        cd.writeAddress(user);
        cd.writeU256(amount);

        const result: CallResult = Blockchain.call(token, cd, true);
        if (!result.success) {
            throw new Revert('Token transfer failed');
        }
    }

    // --- Generic token transfers (for external reward tokens) ---

    private _transferTokenFrom(token: Address, sender: Address, amount: u256): void {
        const self: Address = Blockchain.contract.address;

        const cd: BytesWriter = new BytesWriter(100);
        cd.writeSelector(OP20_TRANSFER_FROM_SELECTOR);
        cd.writeAddress(sender);
        cd.writeAddress(self);
        cd.writeU256(amount);

        const result: CallResult = Blockchain.call(token, cd, true);
        if (!result.success) {
            throw new Revert('Reward transferFrom failed');
        }
    }

    private _transferTokenTo(token: Address, recipient: Address, amount: u256): void {
        const cd: BytesWriter = new BytesWriter(68);
        cd.writeSelector(OP20_TRANSFER_SELECTOR);
        cd.writeAddress(recipient);
        cd.writeU256(amount);

        const result: CallResult = Blockchain.call(token, cd, true);
        if (!result.success) {
            throw new Revert('Reward transfer failed');
        }
    }

    // --- External reward pending calculations ---

    private _pendingReward0(user: Address): u256 {
        const shares: u256 = this.userSharesMap.get(user);
        if (u256.eq(shares, u256.Zero)) return u256.Zero;

        const accum: u256 = this.rewardAccum0Store.value;
        const debt: u256 = this.rewardUserDebt0Map.get(user);

        if (u256.le(accum, debt)) return u256.Zero;

        const diff: u256 = SafeMath.sub(accum, debt);
        return SafeMath.div(SafeMath.mul(shares, diff), PRECISION);
    }

    private _pendingReward1(user: Address): u256 {
        const shares: u256 = this.userSharesMap.get(user);
        if (u256.eq(shares, u256.Zero)) return u256.Zero;

        const accum: u256 = this.rewardAccum1Store.value;
        const debt: u256 = this.rewardUserDebt1Map.get(user);

        if (u256.le(accum, debt)) return u256.Zero;

        const diff: u256 = SafeMath.sub(accum, debt);
        return SafeMath.div(SafeMath.mul(shares, diff), PRECISION);
    }

    // --- Sync reward debts (on deposit/withdraw) ---

    private _syncRewardDebts(user: Address): void {
        this.rewardUserDebt0Map.set(user, this.rewardAccum0Store.value);
        this.rewardUserDebt1Map.set(user, this.rewardAccum1Store.value);
    }

    // --- Settle external rewards (auto-claim on withdraw/emergency) ---

    private _settleExternalRewards(user: Address): void {
        const count: u256 = this.rewardTokenCountStore.value;

        if (u256.gt(count, u256.Zero)) {
            const pending0: u256 = this._pendingReward0(user);
            if (u256.gt(pending0, u256.Zero)) {
                const token0: Address = this.rewardToken0Store.value;
                this._transferTokenTo(token0, user, pending0);
                this.emitEvent(new ClaimRewardEvent(user, token0, pending0));
            }
            this.rewardUserDebt0Map.set(user, this.rewardAccum0Store.value);
        }

        if (u256.gt(count, u256.One)) {
            const pending1: u256 = this._pendingReward1(user);
            if (u256.gt(pending1, u256.Zero)) {
                const token1: Address = this.rewardToken1Store.value;
                this._transferTokenTo(token1, user, pending1);
                this.emitEvent(new ClaimRewardEvent(user, token1, pending1));
            }
            this.rewardUserDebt1Map.set(user, this.rewardAccum1Store.value);
        }
    }
}
