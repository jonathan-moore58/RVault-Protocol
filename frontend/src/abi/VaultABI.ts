import { ABIDataTypes } from 'opnet';
import { BitcoinAbiTypes } from 'opnet';
import type { BitcoinInterfaceAbi } from 'opnet';

export const VAULT_ABI: BitcoinInterfaceAbi = [
    // Write methods
    {
        name: 'deposit',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'collectFees',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimRevenue',
        inputs: [],
        outputs: [{ name: 'claimed', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'withdraw',
        inputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'amountOut', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'emergencyWithdraw',
        inputs: [],
        outputs: [{ name: 'amountOut', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'autoCompound',
        inputs: [],
        outputs: [{ name: 'newShares', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    // Admin methods
    {
        name: 'pause',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'unpause',
        inputs: [],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setMinimumDeposit',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setProtocolFee',
        inputs: [{ name: 'bps', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setProtocolFeeRecipient',
        inputs: [{ name: 'recipient', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setCooldownBlocks',
        inputs: [{ name: 'blocks', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setDepositToken',
        inputs: [{ name: 'token', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'addRewardToken',
        inputs: [{ name: 'token', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    // External reward write methods
    {
        name: 'distributeReward',
        inputs: [
            { name: 'token', type: ABIDataTypes.ADDRESS },
            { name: 'amount', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'claimAllRewards',
        inputs: [],
        outputs: [
            { name: 'reward0', type: ABIDataTypes.UINT256 },
            { name: 'reward1', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    // View methods
    {
        name: 'getVaultInfo',
        constant: true,
        inputs: [],
        outputs: [
            { name: 'totalDeposited', type: ABIDataTypes.UINT256 },
            { name: 'totalShares', type: ABIDataTypes.UINT256 },
            { name: 'totalFees', type: ABIDataTypes.UINT256 },
            { name: 'accumulator', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUserInfo',
        constant: true,
        inputs: [{ name: 'user', type: ABIDataTypes.ADDRESS }],
        outputs: [
            { name: 'shares', type: ABIDataTypes.UINT256 },
            { name: 'deposited', type: ABIDataTypes.UINT256 },
            { name: 'pendingRevenue', type: ABIDataTypes.UINT256 },
            { name: 'totalClaimed', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'previewDeposit',
        constant: true,
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'previewWithdraw',
        constant: true,
        inputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'amountOut', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getOwner',
        constant: true,
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'isPaused',
        constant: true,
        inputs: [],
        outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMinimumDeposit',
        constant: true,
        inputs: [],
        outputs: [{ name: 'minimumDeposit', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getDepositToken',
        constant: true,
        inputs: [],
        outputs: [{ name: 'depositToken', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getProtocolInfo',
        constant: true,
        inputs: [],
        outputs: [
            { name: 'feeBps', type: ABIDataTypes.UINT256 },
            { name: 'feeRecipient', type: ABIDataTypes.ADDRESS },
            { name: 'totalProtocolFees', type: ABIDataTypes.UINT256 },
            { name: 'cooldownBlocks', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    // External reward view methods
    {
        name: 'getRewardInfo',
        constant: true,
        inputs: [],
        outputs: [
            { name: 'count', type: ABIDataTypes.UINT256 },
            { name: 'token0', type: ABIDataTypes.ADDRESS },
            { name: 'totalDistributed0', type: ABIDataTypes.UINT256 },
            { name: 'token1', type: ABIDataTypes.ADDRESS },
            { name: 'totalDistributed1', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getUserRewardInfo',
        constant: true,
        inputs: [{ name: 'user', type: ABIDataTypes.ADDRESS }],
        outputs: [
            { name: 'pending0', type: ABIDataTypes.UINT256 },
            { name: 'pending1', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
];
