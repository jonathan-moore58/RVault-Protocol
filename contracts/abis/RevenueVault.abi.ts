import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const RevenueVaultEvents = [];

export const RevenueVaultAbi = [
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
    {
        name: 'getVaultInfo',
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
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'previewWithdraw',
        inputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'amountOut', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getOwner',
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'isPaused',
        inputs: [],
        outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getMinimumDeposit',
        inputs: [],
        outputs: [{ name: 'minimumDeposit', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getDepositToken',
        inputs: [],
        outputs: [{ name: 'depositToken', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getProtocolInfo',
        inputs: [],
        outputs: [
            { name: 'feeBps', type: ABIDataTypes.UINT256 },
            { name: 'feeRecipient', type: ABIDataTypes.ADDRESS },
            { name: 'totalProtocolFees', type: ABIDataTypes.UINT256 },
            { name: 'cooldownBlocks', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    ...RevenueVaultEvents,
    ...OP_NET_ABI,
];

export default RevenueVaultAbi;
