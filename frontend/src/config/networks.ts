import { networks, Network } from '@btc-vision/bitcoin';

export interface NetworkConfig {
    readonly name: string;
    readonly rpcUrl: string;
    readonly network: Network;
}

export const NETWORK_CONFIGS: Map<string, NetworkConfig> = new Map([
    [
        'testnet',
        {
            name: 'OPNet Testnet',
            rpcUrl: 'https://testnet.opnet.org',
            network: networks.opnetTestnet,
        },
    ],
    [
        'regtest',
        {
            name: 'Regtest',
            rpcUrl: 'http://localhost:9001',
            network: networks.regtest,
        },
    ],
    [
        'mainnet',
        {
            name: 'Mainnet',
            rpcUrl: 'https://mainnet.opnet.org',
            network: networks.bitcoin,
        },
    ],
]);

export const DEFAULT_NETWORK = 'testnet';

export function getNetworkConfig(networkKey: string): NetworkConfig {
    const config = NETWORK_CONFIGS.get(networkKey);
    if (!config) {
        throw new Error(`Unknown network: ${networkKey}`);
    }
    return config;
}

export function getNetworkKey(network: Network): string {
    if (network === networks.opnetTestnet) return 'testnet';
    if (network === networks.regtest) return 'regtest';
    if (network === networks.bitcoin) return 'mainnet';
    return 'testnet';
}
