import { useMemo } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { getContract, IOP20Contract, OP_20_ABI } from 'opnet';
import { VAULT_ABI } from '../abi/VaultABI';
import { providerService } from '../services/ProviderService';
import { getNetworkConfig, DEFAULT_NETWORK } from '../config/networks';
import { useVaultContext } from '../context/VaultContext';
import type { IVaultContract } from '../types/vault';

export function useVaultContract() {
    const { provider, network, address: senderAddress } = useWalletConnect();
    const { selectedVault } = useVaultContext();

    return useMemo(() => {
        if (!selectedVault) return null;

        const fallback = getNetworkConfig(DEFAULT_NETWORK);
        const activeProvider = provider ?? providerService.getProvider(fallback.network);
        const activeNetwork = network ?? fallback.network;

        const vault = getContract<IVaultContract>(
            selectedVault.vault,
            VAULT_ABI,
            activeProvider,
            activeNetwork,
            senderAddress ?? undefined,
        );
        const token = getContract<IOP20Contract>(
            selectedVault.depositToken,
            OP_20_ABI,
            activeProvider,
            activeNetwork,
            senderAddress ?? undefined,
        );

        return {
            vault,
            token,
            addresses: {
                vault: selectedVault.vault,
                depositToken: selectedVault.depositToken,
            },
        };
    }, [provider, network, senderAddress, selectedVault]);
}
