import { networks, Network } from '@btc-vision/bitcoin';

/**
 * Each vault instance: one contract deployment + one OP20 token.
 * Same WASM, deployed multiple times — each with isolated storage.
 */
export interface VaultEntry {
    readonly id: string;
    readonly vault: string;          // vault contract address
    readonly depositToken: string;   // OP20 token address
    readonly symbol: string;         // token symbol (MOTO, PILL, RVT)
    readonly name: string;           // display name
    readonly decimals: number;
}

interface NetworkVaults {
    readonly vaults: readonly VaultEntry[];
}

const NETWORK_VAULTS: Map<string, NetworkVaults> = new Map([
    [
        'testnet',
        {
            vaults: [
                {
                    id: 'moto',
                    vault: 'opt1sqqm5zdlhswk3u7qt395hl4d0wg70xvvxyv2k4j3w',
                    depositToken: '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd',
                    symbol: 'MOTO',
                    name: 'Motoswap Vault',
                    decimals: 18,
                },
                {
                    id: 'pill',
                    vault: 'opt1sqzz42z8jgrdg75v8dve6q8qpmj48eg7hechqp7r6',
                    depositToken: '0xb09fc29c112af8293539477e23d8df1d3126639642767d707277131352040cbb',
                    symbol: 'PILL',
                    name: 'Pill Vault',
                    decimals: 18,
                },
                {
                    id: 'rvt',
                    vault: 'opt1sqzgjj9wkfj632manzew4kz49nrrfzkqpvsyztsz3',
                    depositToken: '0xfbee8fcb9e0b9acafcebccb0a704554037c3feee4c6081bef378d1a8dd8aece5',
                    symbol: 'RVT',
                    name: 'RVault Token Vault',
                    decimals: 18,
                },
            ],
        },
    ],
    [
        'regtest',
        {
            vaults: [
                {
                    id: 'moto',
                    vault: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    depositToken: '0x0000000000000000000000000000000000000000000000000000000000000000',
                    symbol: 'MOTO',
                    name: 'Motoswap Vault',
                    decimals: 18,
                },
            ],
        },
    ],
]);

export function getNetworkVaults(network: Network): readonly VaultEntry[] {
    let key = 'testnet';
    if (network === networks.regtest) key = 'regtest';
    if (network === networks.bitcoin) key = 'mainnet';

    const config = NETWORK_VAULTS.get(key);
    // Only return vaults that have both addresses filled
    return (config?.vaults ?? []).filter(v => v.vault && v.depositToken);
}

export function getDefaultVault(network: Network): VaultEntry | null {
    const vaults = getNetworkVaults(network);
    return vaults[0] ?? null;
}
