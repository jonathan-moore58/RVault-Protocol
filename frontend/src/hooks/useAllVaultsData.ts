import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { contractService } from '../services/ContractService';
import { getNetworkConfig, DEFAULT_NETWORK } from '../config/networks';
import { getNetworkVaults, type VaultEntry } from '../config/contracts';
import type { VaultInfo } from '../types/vault';

export interface VaultOverview {
    vault: VaultEntry;
    info: VaultInfo | null;
    loading: boolean;
}

export function useAllVaultsData(): VaultOverview[] {
    const { network } = useWalletConnect();
    const activeNetwork = useMemo(
        () => network ?? getNetworkConfig(DEFAULT_NETWORK).network,
        [network],
    );
    const vaults = useMemo(() => getNetworkVaults(activeNetwork), [activeNetwork]);

    const [dataMap, setDataMap] = useState<Record<string, VaultInfo>>({});
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const fetchAll = useCallback(async () => {
        if (vaults.length === 0) return;

        // Mark all loading
        const loading: Record<string, boolean> = {};
        vaults.forEach((v) => { loading[v.id] = true; });
        setLoadingMap(loading);

        const results = await Promise.allSettled(
            vaults.map(async (vault) => {
                const contract = contractService.getVaultContract(vault.vault, activeNetwork);
                const result = await contract.getVaultInfo();
                return { id: vault.id, result };
            }),
        );

        const newData: Record<string, VaultInfo> = {};
        for (const r of results) {
            if (r.status === 'fulfilled' && !r.value.result.revert) {
                const p = r.value.result.properties;
                newData[r.value.id] = {
                    totalDeposited: (p.totalDeposited as bigint) ?? 0n,
                    totalShares: (p.totalShares as bigint) ?? 0n,
                    totalFees: (p.totalFees as bigint) ?? 0n,
                    accumulator: (p.accumulator as bigint) ?? 0n,
                };
            }
        }

        setDataMap(newData);

        const done: Record<string, boolean> = {};
        vaults.forEach((v) => { done[v.id] = false; });
        setLoadingMap(done);
    }, [vaults, activeNetwork]);

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    return vaults.map((vault) => ({
        vault,
        info: dataMap[vault.id] ?? null,
        loading: loadingMap[vault.id] ?? false,
    }));
}
