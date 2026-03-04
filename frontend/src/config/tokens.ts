/**
 * Known OP20 tokens on testnet.
 * Update addresses here after deploying PILL and RVT.
 */
export interface KnownToken {
    readonly symbol: string;
    readonly name: string;
    readonly address: string;
    readonly decimals: number;
}

export const KNOWN_TOKENS: readonly KnownToken[] = [
    {
        symbol: 'MOTO',
        name: 'Motoswap Token',
        address: '0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd',
        decimals: 18,
    },
    {
        symbol: 'PILL',
        name: 'Pill Token',
        address: '', // TODO: paste PILL testnet address after deploy
        decimals: 18,
    },
    {
        symbol: 'RVT',
        name: 'RVault Token',
        address: '', // TODO: paste RVT testnet address after deploy
        decimals: 18,
    },
] as const;
