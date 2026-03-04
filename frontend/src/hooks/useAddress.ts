import { useMemo } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import type { Address } from '@btc-vision/transaction';

export interface AddressState {
    /** The Address object for contract interactions (null if wallet not connected). */
    address: Address | null;
    /** The bech32 wallet address for display and refundTo (null if not connected). */
    walletAddress: string | null;
    /** True when the wallet is connected and provides both address types. */
    isReady: boolean;
    /** Error message if the wallet provides partial data. */
    error: string | null;
}

/**
 * Wraps useWalletConnect to surface a validated Address state with error handling.
 * Consumers check `isReady` before passing `address` to contract calls.
 */
export function useAddress(): AddressState {
    const { walletAddress, address } = useWalletConnect();

    return useMemo(() => {
        if (!walletAddress) {
            return { address: null, walletAddress: null, isReady: false, error: null };
        }

        if (!address) {
            return {
                address: null,
                walletAddress,
                isReady: false,
                error: 'Wallet connected but Address object unavailable — reconnect wallet',
            };
        }

        return { address, walletAddress, isReady: true, error: null };
    }, [walletAddress, address]);
}
