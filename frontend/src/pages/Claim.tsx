import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useVaultData } from '../hooks/useVaultData';
import { useVaultContract } from '../hooks/useVaultContract';
import { useTransaction } from '../hooks/useTransaction';
import { VaultStats } from '../components/vault/VaultStats';
import { TransactionStatus } from '../components/common/TransactionStatus';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { Confetti } from '../components/common/Confetti';
import { Skeleton } from '../components/common/Skeleton';
import { formatTokenAmount } from '../utils/formatting';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

export function Claim() {
    const { walletAddress, openConnectModal } = useWalletConnect();
    const { vaultInfo, userInfo, protocolInfo, loading, refetch } = useVaultData();
    const contracts = useVaultContract();
    const claimTx = useTransaction();
    const compoundTx = useTransaction();
    const [showConfetti, setShowConfetti] = useState(false);

    const pending = userInfo?.pendingRevenue ?? 0n;
    const hasPending = pending > 0n;

    async function handleClaim() {
        if (!contracts || !hasPending) return;

        const txId = await claimTx.execute(async () => {
            return await contracts.vault.claimRevenue();
        });

        if (txId) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleCompound() {
        if (!contracts || !hasPending) return;

        const txId = await compoundTx.execute(async () => {
            return await contracts.vault.autoCompound();
        });

        if (txId) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 4000);
            setTimeout(() => void refetch(), 2000);
        }
    }

    const isProcessing =
        claimTx.state.status === 'simulating' || claimTx.state.status === 'pending' ||
        compoundTx.state.status === 'simulating' || compoundTx.state.status === 'pending';

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
