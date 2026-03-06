import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import type { Address } from '@btc-vision/transaction';
import { useVaultData } from '../hooks/useVaultData';
import { useVaultContract } from '../hooks/useVaultContract';
import { useVaultContext } from '../context/VaultContext';
import { useTransaction } from '../hooks/useTransaction';
import { providerService } from '../services/ProviderService';
import { getNetworkConfig, DEFAULT_NETWORK } from '../config/networks';
import { VaultStats } from '../components/vault/VaultStats';
import { TransactionStatus } from '../components/common/TransactionStatus';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { Confetti } from '../components/common/Confetti';
import { Skeleton } from '../components/common/Skeleton';
import { formatTokenAmount } from '../utils/formatting';
import type { VaultEntry } from '../config/contracts';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

/* Resolve a reward token Address to a known symbol from the vault registry */
function resolveTokenSymbol(tokenAddress: Address | undefined, vaults: readonly VaultEntry[]): string {
    if (!tokenAddress) return 'TOKEN';
    const addrStr = String(tokenAddress).toLowerCase();
    if (!addrStr || addrStr === '0x' || addrStr.replace(/0x/i, '').replace(/0/g, '') === '') return 'TOKEN';
    for (const v of vaults) {
        if (v.depositToken.toLowerCase() === addrStr) return v.symbol;
    }
    return `${addrStr.slice(0, 8)}...`;
}

/* Theme colors per reward token symbol */
const REWARD_COLORS: Record<string, string> = {
    MOTO: '#00ffaa',
    PILL: '#ff6b6b',
    RVT: '#bf5af2',
};

export function Claim() {
    const { walletAddress, openConnectModal, provider, network } = useWalletConnect();
    const { vaultInfo, userInfo, protocolInfo, rewardInfo, userRewardInfo, loading, refetch } = useVaultData();
    const contracts = useVaultContract();
    const { availableVaults } = useVaultContext();
    const claimTx = useTransaction();
    const compoundTx = useTransaction();
    const claimRewardsTx = useTransaction();
    const [showConfetti, setShowConfetti] = useState(false);

    const pending = userInfo?.pendingRevenue ?? 0n;
    const hasPending = pending > 0n;

    async function handleClaim() {
        if (!contracts || !hasPending) return;

        const activeProvider = provider ?? providerService.getProvider(
            network ?? getNetworkConfig(DEFAULT_NETWORK).network,
        );

        const txId = await claimTx.execute(
            async () => {
                return await contracts.vault.claimRevenue();
            },
            { waitForConfirmation: activeProvider },
        );

        if (txId) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleCompound() {
        if (!contracts || !hasPending) return;

        const activeProvider = provider ?? providerService.getProvider(
            network ?? getNetworkConfig(DEFAULT_NETWORK).network,
        );

        const txId = await compoundTx.execute(
            async () => {
                return await contracts.vault.autoCompound();
            },
            { waitForConfirmation: activeProvider },
        );

        if (txId) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleClaimRewards() {
        if (!contracts) return;

        const activeProvider = provider ?? providerService.getProvider(
            network ?? getNetworkConfig(DEFAULT_NETWORK).network,
        );

        const txId = await claimRewardsTx.execute(
            async () => {
                return await contracts.vault.claimAllRewards();
            },
            { waitForConfirmation: activeProvider },
        );

        if (txId) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
            setTimeout(() => void refetch(), 2000);
        }
    }

    // Derive external reward state
    const hasExternalRewards = rewardInfo && rewardInfo.count > 0n;
    const reward0Symbol = hasExternalRewards ? resolveTokenSymbol(rewardInfo.token0, availableVaults) : '';
    const reward1Symbol = hasExternalRewards && rewardInfo.count > 1n ? resolveTokenSymbol(rewardInfo.token1, availableVaults) : '';
    const pending0 = userRewardInfo?.pending0 ?? 0n;
    const pending1 = userRewardInfo?.pending1 ?? 0n;
    const hasAnyPendingReward = pending0 > 0n || pending1 > 0n;

    const isProcessing =
        claimTx.state.status === 'simulating' || claimTx.state.status === 'pending' || claimTx.state.status === 'confirming' ||
        compoundTx.state.status === 'simulating' || compoundTx.state.status === 'pending' || compoundTx.state.status === 'confirming' ||
        claimRewardsTx.state.status === 'simulating' || claimRewardsTx.state.status === 'pending' || claimRewardsTx.state.status === 'confirming';

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-8"
        >
            <Confetti active={showConfetti} />

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Claim
                </h1>
                <p className="mt-2 text-[14px] text-gray-500">
                    Collect accrued revenue or compound it back into shares
                </p>
            </motion.div>

            <VaultStats vaultInfo={vaultInfo} protocolInfo={protocolInfo} loading={loading} />

            {walletAddress ? (
                <>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                >
                    {/* Claim card */}
                    <div className="gradient-border relative overflow-hidden rounded-2xl p-8">
                        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full animate-glow-pulse"
                            style={{ background: 'radial-gradient(circle, rgba(0,255,170,0.08) 0%, transparent 70%)' }} />

                        <div className="relative">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,255,170,0.08)' }}>
                                    <svg className="h-5 w-5 text-[#00ffaa]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Pending Revenue</h2>
                                    <p className="text-[12px] text-gray-500">Available to claim now</p>
                                </div>
                            </div>

                            <div className="mt-8">
                                {loading ? (
                                    <Skeleton className="h-12 w-48" />
                                ) : (
                                    <div className="flex items-end gap-3">
                                        <AnimatedNumber
                                            value={formatTokenAmount(pending)}
                                            className="text-4xl font-bold text-gradient-warm"
                                        />
                                        <span className="mb-1 text-sm text-gray-600">tokens</span>
                                    </div>
                                )}
                            </div>

                            {/* Dual buttons: Claim + Compound */}
                            <div className="mt-8 grid grid-cols-2 gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleClaim}
                                    disabled={!hasPending || isProcessing}
                                    className="btn-neon rounded-xl py-4 text-sm"
                                >
                                    {claimTx.state.status === 'simulating' || claimTx.state.status === 'pending'
                                        ? 'Claiming...'
                                        : hasPending
                                          ? 'Claim'
                                          : 'No Revenue'}
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCompound}
                                    disabled={!hasPending || isProcessing}
                                    className="btn-ghost rounded-xl py-4 text-sm font-semibold"
                                    title="Re-invest revenue as additional shares"
                                >
                                    {compoundTx.state.status === 'simulating' || compoundTx.state.status === 'pending'
                                        ? 'Compounding...'
                                        : (
                                            <span className="flex items-center justify-center gap-1.5">
                                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Compound
                                            </span>
                                        )}
                                </motion.button>
                            </div>

                            {hasPending && (
                                <p className="mt-2 text-center text-[10px] text-gray-600">
                                    Compound re-invests revenue as additional vault shares
                                </p>
                            )}

                            {claimTx.state.status !== 'idle' && (
                                <TransactionStatus state={claimTx.state} onReset={claimTx.reset} />
                            )}
                            {compoundTx.state.status !== 'idle' && (
                                <TransactionStatus state={compoundTx.state} onReset={compoundTx.reset} />
                            )}
                        </div>
                    </div>

                    {/* Stats card */}
                    <div className="gradient-border relative overflow-hidden rounded-2xl p-8">
                        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)' }} />

                        <div className="relative">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,229,255,0.08)' }}>
                                    <svg className="h-5 w-5 text-[#00e5ff]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Position</h2>
                                    <p className="text-[12px] text-gray-500">Shares, deposits, and claimed totals</p>
                                </div>
                            </div>

                            <div className="mt-8 space-y-4">
                                {loading ? (
                                    <>
                                        <Skeleton className="h-5 w-40" />
                                        <Skeleton className="h-5 w-36" />
                                        <Skeleton className="h-5 w-44" />
                                    </>
                                ) : (
                                    <>
                                        {[
                                            {
                                                label: 'Total Claimed',
                                                value: formatTokenAmount(userInfo?.totalClaimed ?? 0n),
                                                color: '#bf5af2',
                                            },
                                            {
                                                label: 'Your Shares',
                                                value: formatTokenAmount(userInfo?.shares ?? 0n),
                                                color: '#00ffaa',
                                            },
                                            {
                                                label: 'Your Deposited',
                                                value: formatTokenAmount(userInfo?.deposited ?? 0n),
                                                color: '#00e5ff',
                                            },
                                        ].map((row) => (
                                            <div key={row.label} className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.02]">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: row.color }} />
                                                    <span className="text-[13px] text-gray-500">{row.label}</span>
                                                </div>
                                                <AnimatedNumber
                                                    value={row.value}
                                                    className="text-[15px] font-semibold text-white"
                                                />
                                            </div>
                                        ))}

                                        {vaultInfo && vaultInfo.totalFees > 0n && userInfo && userInfo.shares > 0n && vaultInfo.totalShares > 0n && (
                                            <div className="mt-2 overflow-hidden rounded-xl" style={{
                                                background: 'linear-gradient(135deg, rgba(191,90,242,0.04), rgba(0,229,255,0.02))',
                                                border: '1px solid rgba(191,90,242,0.08)',
                                            }}>
                                                <div className="px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[12px] text-gray-500">Your share of fees</span>
                                                        <span className="text-sm font-bold" style={{ color: '#bf5af2' }}>
                                                            {(Number((userInfo.shares * 10000n) / vaultInfo.totalShares) / 100).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* External Rewards card — shows when vault has registered reward tokens */}
                {hasExternalRewards && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="gradient-border relative overflow-hidden rounded-2xl p-8"
                    >
                        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(191,90,242,0.06) 0%, transparent 70%)' }} />

                        <div className="relative">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(191,90,242,0.08)' }}>
                                    <svg className="h-5 w-5" style={{ color: 'rgba(191,90,242,0.7)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">External Rewards</h2>
                                    <p className="text-[12px] text-gray-500">
                                        Multi-token rewards from protocol revenue
                                    </p>
                                </div>
                            </div>

                            {/* Reward token rows */}
                            <div className="mt-6 space-y-3">
                                {/* Reward token 0 */}
                                {rewardInfo.count >= 1n && (
                                    <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{
                                        background: `${REWARD_COLORS[reward0Symbol] ?? '#888'}06`,
                                        border: `1px solid ${REWARD_COLORS[reward0Symbol] ?? '#888'}15`,
                                    }}>
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-2 w-2 rounded-full" style={{ background: REWARD_COLORS[reward0Symbol] ?? '#888' }} />
                                            <span className="text-[13px] font-semibold" style={{ color: REWARD_COLORS[reward0Symbol] ?? '#ccc' }}>
                                                {reward0Symbol}
                                            </span>
                                        </div>
                                        {loading ? (
                                            <Skeleton className="h-6 w-20" />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <AnimatedNumber
                                                    value={formatTokenAmount(pending0)}
                                                    className="text-[17px] font-bold text-white"
                                                />
                                                <span className="text-[11px] text-gray-600">pending</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Reward token 1 */}
                                {rewardInfo.count >= 2n && (
                                    <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{
                                        background: `${REWARD_COLORS[reward1Symbol] ?? '#888'}06`,
                                        border: `1px solid ${REWARD_COLORS[reward1Symbol] ?? '#888'}15`,
                                    }}>
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-2 w-2 rounded-full" style={{ background: REWARD_COLORS[reward1Symbol] ?? '#888' }} />
                                            <span className="text-[13px] font-semibold" style={{ color: REWARD_COLORS[reward1Symbol] ?? '#ccc' }}>
                                                {reward1Symbol}
                                            </span>
                                        </div>
                                        {loading ? (
                                            <Skeleton className="h-6 w-20" />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <AnimatedNumber
                                                    value={formatTokenAmount(pending1)}
                                                    className="text-[17px] font-bold text-white"
                                                />
                                                <span className="text-[11px] text-gray-600">pending</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Claim All button */}
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleClaimRewards}
                                disabled={!hasAnyPendingReward || isProcessing}
                                className="mt-6 w-full rounded-xl py-4 text-sm font-bold transition-all disabled:opacity-40"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(191,90,242,0.12), rgba(0,255,170,0.06))',
                                    border: '1px solid rgba(191,90,242,0.15)',
                                    color: hasAnyPendingReward ? '#bf5af2' : '#666',
                                }}
                            >
                                {claimRewardsTx.state.status === 'simulating' || claimRewardsTx.state.status === 'pending'
                                    ? 'Claiming...'
                                    : claimRewardsTx.state.status === 'confirming'
                                      ? 'Confirming...'
                                      : hasAnyPendingReward
                                        ? 'Claim All Rewards'
                                        : 'No Pending Rewards'}
                            </motion.button>

                            <p className="mt-2 text-center text-[10px] text-gray-600">
                                Claims all external reward tokens in a single transaction
                            </p>

                            {claimRewardsTx.state.status !== 'idle' && (
                                <TransactionStatus state={claimRewardsTx.state} onReset={claimRewardsTx.reset} />
                            )}
                        </div>
                    </motion.div>
                )}
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="gradient-border relative overflow-hidden rounded-2xl px-8 py-14 text-center"
                >
                    <div className="relative">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, rgba(0,255,170,0.1), rgba(0,229,255,0.05))' }}>
                            <svg className="h-6 w-6 text-[#00ffaa]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-white">Connect to Claim</h3>
                        <p className="mt-1.5 text-sm text-gray-500">Connect your wallet to claim revenue</p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={openConnectModal}
                            className="btn-neon mt-5 rounded-xl px-8 py-3 text-sm"
                        >
                            Connect Wallet
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
