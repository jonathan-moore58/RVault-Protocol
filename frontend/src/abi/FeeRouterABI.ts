import { ABIDataTypes } from 'opnet';
import { BitcoinAbiTypes } from 'opnet';
import type { BitcoinInterfaceAbi } from 'opnet';

export const FEE_ROUTER_ABI: BitcoinInterfaceAbi = [
    // Admin methods
    {
        name: 'setRvtVault',
        inputs: [{ name: 'vault', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setTeamWallet',
        inputs: [{ name: 'wallet', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setTeamBps',
        inputs: [{ name: 'bps', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    // Core
    {
        name: 'distribute',
        inputs: [{ name: 'token', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'distributed', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    // View
    {
        name: 'getConfig',
        constant: true,
        inputs: [],
        outputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'rvtVault', type: ABIDataTypes.ADDRESS },
            { name: 'teamWallet', type: ABIDataTypes.ADDRESS },
            { name: 'teamBps', type: ABIDataTypes.UINT256 },
            { name: 'totalDistributed', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'getOwner',
        constant: true,
        inputs: [],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        type: BitcoinAbiTypes.Function,
    },
];
