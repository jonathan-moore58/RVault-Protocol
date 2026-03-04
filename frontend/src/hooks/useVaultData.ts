import { useState, useEffect, useCallback } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import type { Address } from '@btc-vision/transaction';
import { useVaultContract } from './useVaultContract';
import { useVaultContext } from '../context/VaultContext';
import type { VaultInfo, UserInfo, ProtocolInfo } from '../types/vault';

const POLL_INTERVAL = 15_000;

export function useVaultData() {
    const { walletAddress, address: userAddress } = useWalletConnect();
    const contracts = useVaultContract();
    const { selectedVault } = useVaultContext();

    const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [protocolInfo, setProtocolInfo] = useState<ProtocolInfo | null>(null);
    const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
    const [loading, setLoading] = useState(true);

    // Token symbol comes from the vault registry — no on-chain call needed
    const activeTokenSymbol = selectedVault?.symbol ?? 'TOKEN';

    const fetchData = useCallback(async () => {
        if (!contracts) return;

        try {
            const vaultResult = await contracts.vault.getVaultInfo();

            if (!vaultResult.revert) {
                const p = vaultResult.properties;
                setVaultInfo({
                    totalDeposited: (p.totalDeposited as bigint) ?? 0n,
                    totalShares: (p.totalShares as bigint) ?? 0n,
                    totalFees: (p.totalFees as bigint) ?? 0n,
                    accumulator: (p.accumulator as bigint) ?? 0n,
                });
            }

            // Fetch protocol info
            try {
                const protoResult = await contracts.vault.getProtocolInfo();
                if (!protoResult.revert) {
                    const pi = protoResult.properties;
                    setProtocolInfo({
                        feeBps: (pi.feeBps as bigint) ?? 0n,
                        feeRecipient: pi.feeRecipient as Address,
                        totalProtocolFees: (pi.totalProtocolFees as bigint) ?? 0n,
                        cooldownBlocks: (pi.cooldownBlocks as bigint) ?? 0n,
                    });
                }
            } catch {
                // Protocol info may not be available on older contracts
            }

            if (walletAddress && userAddress) {
                const userResult = await contracts.vault.getUserInfo(userAddress);

                if (!userResult.revert) {
                    const u = userResult.properties;
                    setUserInfo({
                        shares: (u.shares as bigint) ?? 0n,
                        deposited: (u.deposited as bigint) ?? 0n,
                        pendingRevenue: (u.pendingRevenue as bigint) ?? 0n,
                        totalClaimed: (u.totalClaimed as bigint) ?? 0n,
                    });
                }

                // Fetch token balance
                try {
                    const balResult = await contracts.token.balanceOf(userAddress);
                    if (!balResult.revert) {
                        setTokenBalance((balResult.properties.balance as bigint) ?? 0n);
                    }
                } catch {
                    setTokenBalance(0n);
                }
            } else {
                setUserInfo(null);
                setTokenBalance(0n);
            }
        } catch (err) {
            console.error('Failed to fetch vault data:', err);
        } finally {
            setLoading(false);
        }
    }, [contracts, walletAddress, userAddress]);

    // Reset state when vault changes
    useEffect(() => {
        setVaultInfo(null);
        setUserInfo(null);
        setProtocolInfo(null);
        setTokenBalance(0n);
        setLoading(true);
    }, [selectedVault?.id]);

    useEffect(() => {
        void fetchData();
        const interval = setInterval(() => void fetchData(), POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchData]);

    return {
        vaultInfo, userInfo, protocolInfo, tokenBalance,
        activeTokenSymbol,
        loading, refetch: fetchData,
    };
}
