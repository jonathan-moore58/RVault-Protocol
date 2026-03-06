const DECIMALS = 18;
const DISPLAY_DECIMALS = 4;

export function formatTokenAmount(amount: bigint, decimals: number = DECIMALS): string {
    if (amount === 0n) return '0';

    const divisor = 10n ** BigInt(decimals);
    const whole = amount / divisor;
    const fraction = amount % divisor;

    if (fraction === 0n) return whole.toLocaleString();

    const fractionStr = fraction.toString().padStart(decimals, '0');
    const trimmed = fractionStr.slice(0, DISPLAY_DECIMALS).replace(/0+$/, '');

    if (!trimmed) return whole.toLocaleString();
    return `${whole.toLocaleString()}.${trimmed}`;
}

export function formatAddress(address: string): string {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function parseTokenAmount(value: string, decimals: number = DECIMALS): bigint {
    if (!value || value === '0') return 0n;

    // Strip locale commas/spaces so "344,047" or "1 000" still parse
    const clean = value.replace(/[,\s]/g, '');
    const parts = clean.split('.');
    const whole = BigInt(parts[0] || '0');
    let fraction = 0n;

    if (parts[1]) {
        const fractionStr = parts[1].padEnd(decimals, '0').slice(0, decimals);
        fraction = BigInt(fractionStr);
    }

    return whole * 10n ** BigInt(decimals) + fraction;
}

export function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`;
}

/** Validates a hex string is a proper 0x-prefixed hex (64 chars for contract hashes, or any even-length). */
export function isValidHexAddress(value: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}
