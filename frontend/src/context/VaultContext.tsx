import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { getNetworkVaults, getDefaultVault, type VaultEntry } from '../config/contracts';
import { getNetworkConfig, DEFAULT_NETWORK } from '../config/networks';

interface VaultContextValue {
    /** Currently selected vault */
    selectedVault: VaultEntry | null;
    /** All available vaults for the current network */
    availableVaults: readonly VaultEntry[];
    /** Switch to a different vault by id */
    selectVault: (id: string) => void;
}

const VaultContext = createContext<VaultContextValue>({
    selectedVault: null,
    availableVaults: [],
    selectVault: () => {},
});

export function VaultProvider({ children }: { children: ReactNode }) {
    const { network } = useWalletConnect();

    const activeNetwork = network ?? getNetworkConfig(DEFAULT_NETWORK).network;
    const availableVaults = useMemo(() => getNetworkVaults(activeNetwork), [activeNetwork]);

    const [selectedId, setSelectedId] = useState<string>(() => {
        // Restore last selection from localStorage
        const saved = localStorage.getItem('rvault-selected-vault');
        return saved ?? '';
    });

    // Resolve selected vault — fall back to default if saved ID not found
    const selectedVault = useMemo(() => {
        const found = availableVaults.find(v => v.id === selectedId);
        if (found) return found;
        return getDefaultVault(activeNetwork);
    }, [availableVaults, selectedId, activeNetwork]);

    // Persist selection
    useEffect(() => {
        if (selectedVault) {
            localStorage.setItem('rvault-selected-vault', selectedVault.id);
        }
    }, [selectedVault]);

    const selectVault = (id: string) => setSelectedId(id);

    return (
        <VaultContext.Provider value={{ selectedVault, availableVaults, selectVault }}>
            {children}
        </VaultContext.Provider>
    );
}

export function useVaultContext() {
    return useContext(VaultContext);
}
