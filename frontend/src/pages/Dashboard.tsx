import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useNavigate } from 'react-router-dom';
import { useVaultData } from '../hooks/useVaultData';
import { useVaultContract } from '../hooks/useVaultContract';
import { useVaultContext } from '../context/VaultContext';
import { VaultStats } from '../components/vault/VaultStats';
import { ClaimCard } from '../components/vault/ClaimCard';
import { VaultGauge } from '../components/vault/VaultGauge';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { Skeleton } from '../components/common/Skeleton';
import { formatTokenAmount } from '../utils/formatting';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

/* ── Color theme per vault ── */
const VAULT_COLORS: Record<string, { from: string; to: string }> = {
    moto: { from: '#00ffaa', to: '#00e5ff' },
    pill: { from: '#ff6b6b', to: '#ff9a8b' },
    rvt:  { from: '#bf5af2', to: '#8b5cf6' },
};

export function Dashboard() {
    const { walletAddress, openConnectModal } = useWalletConnect();
    const contracts = useVaultContract();
    const { selectedVault } = useVaultContext();
    const { vaultInfo, userInfo, protocolInfo, activeTokenSymbol, loading, refetch } = useVaultData();
    const [isPaused, setIsPaused] = useState(false);
    const navigate = useNavigate();

    const colors = VAULT_COLORS[selectedVault?.id ?? 'moto'] ?? VAULT_COLORS.moto;

    useEffect(() => {
        if (!contracts) return;
        contracts.vault.isPaused().then((r) => {
            if (!r.revert) setIsPaused(r.properties.paused as boolean);
        }).catch(() => {});
    }, [contracts]);

    const sharePercent = vaultInfo && vaultInfo.totalShares > 0n && userInfo && userInfo.shares > 0n
        ? Number((userInfo.shares * 10000n) / vaultInfo.totalShares) / 100
        : 0;

    /* If no vault selected, redirect to vaults page */
    if (!selectedVault) {
        return (
            <motion.div
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center py-20 text-center"
            >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, rgba(0,255,170,0.1), rgba(0,229,255,0.05))' }}>
                    <svg className="h-7 w-7 text-[#00ffaa]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <h3 className="mt-5 text-lg font-bold text-white">No Vault Selected</h3>
                <p className="mt-2 text-sm text-gray-500">Select a vault to view its dashboard</p>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/')}
                    className="btn-neon mt-5 rounded-xl px-8 py-3 text-sm"
                >
                    Browse Vaults
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-8"
        >
            {/* ── Vault Header ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
            >
                <div className="flex items-center gap-3">
                    <div className="relative flex h-2 w-2 rounded-full" style={{ background: colors.from }}>
                        <span className="live-dot absolute inset-0 rounded-full" style={{ background: colors.from }} />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                        {isPaused ? 'Vault Paused' : 'Vault Active'}
                    </span>
                </div>

                <div className="mt-3 flex items-center gap-4">
                    <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{
                            background: `linear-gradient(135deg, ${colors.from}15, ${colors.to}08)`,
                            border: `1px solid ${colors.from}25`,
                        }}
                    >
                        <span className="text-lg font-black" style={{ color: colors.from }}>
                            {selectedVault.symbol.charAt(0)}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                            {selectedVault.symbol}
                            <span className="ml-3 text-lg font-medium text-gray-500">{selectedVault.name}</span>
                        </h1>
                        <p className="mt-1 text-[13px] text-gray-500">
                            {activeTokenSymbol} vault — deposit, earn fees, claim or compound
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* ── Paused Banner ── */}
            {isPaused && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl px-4 py-3"
                    style={{
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.15)',
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/10">
                            <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-red-400">Vault is Paused</span>
                            <span className="ml-2 text-[12px] text-gray-500">Deposits and regular withdrawals are disabled. Emergency withdraw is available.</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Vault Stats ── */}
            <VaultStats vaultInfo={vaultInfo} protocolInfo={protocolInfo} loading={loading} />

            {/* ── User Section ── */}
            {walletAddress ? (
                <div className="space-y-6">
                    {/* Gauge row */}
                    {!loading && userInfo && vaultInfo && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                        >
                            <VaultGauge
                                label="Your Share"
                                value={sharePercent}
                                max={100}
                                color={colors.from}
                                displayValue={`${sharePercent.toFixed(2)}%`}
                                sub={`${formatTokenAmount(userInfo.shares)} shares`}
                            />
                            <VaultGauge
                                label="Revenue Earned"
                                value={Number(userInfo.totalClaimed + userInfo.pendingRevenue)}
                                max={Number(vaultInfo.totalFees || 1n)}
                                color="#bf5af2"
                                displayValue={formatTokenAmount(userInfo.totalClaimed + userInfo.pendingRevenue)}
                                sub="total earned"
                            />
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Position card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="relative overflow-hidden rounded-2xl p-6"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >

                            <div className="relative">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${colors.to}10` }}>
                                        <svg className="h-4 w-4" style={{ color: `${colors.to}90` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                                        Your Position
                                    </p>
                                </div>

                                {loading ? (
                                    <div className="mt-6 space-y-4">
                                        <Skeleton className="h-5 w-40" />
                                        <Skeleton className="h-5 w-32" />
                                        <Skeleton className="h-5 w-36" />
                                    </div>
                                ) : userInfo ? (
                                    <div className="mt-6 space-y-3">
                                        {[
                                            { label: 'Your Shares', value: formatTokenAmount(userInfo.shares), color: colors.from },
                                            { label: 'Deposited', value: formatTokenAmount(userInfo.deposited), color: colors.to },
                                            { label: 'Total Claimed', value: formatTokenAmount(userInfo.totalClaimed), color: '#bf5af2' },
                                        ].map((row) => (
                                            <div key={row.label} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[0.02]">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: row.color }} />
                                                    <span className="text-[13px] text-gray-500">{row.label}</span>
                                                </div>
                                                <AnimatedNumber
                                                    value={row.value}
                                                    className="text-[15px] font-semibold text-white"
                                                />
                                            </div>
                                        ))}

                                        {vaultInfo && vaultInfo.totalShares > 0n && userInfo.shares > 0n && (
                                            <div className="mt-2 overflow-hidden rounded-xl" style={{
                                                background: `linear-gradient(135deg, ${colors.from}06, ${colors.to}04)`,
                                                border: `1px solid ${colors.from}12`,
                                            }}>
                                                <div className="px-4 py-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[12px] text-gray-500">Your vault share</span>
                                                        <span className="text-sm font-bold" style={{ color: colors.from }}>
                                                            {sharePercent.toFixed(2)}%
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            style={{ background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min(sharePercent, 100)}%` }}
                                                            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-8 text-center">
                                        <p className="text-sm text-gray-500">No deposits yet</p>
                                        <p className="mt-1 text-[12px] text-gray-600">Head to Deposit to get started</p>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => navigate('/deposit')}
                                            className="mt-4 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all"
                                            style={{
                                                background: `${colors.from}12`,
                                                border: `1px solid ${colors.from}25`,
                                                color: colors.from,
                                            }}
                                        >
                                            Make First Deposit
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Claim card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                        >
                            <ClaimCard userInfo={userInfo} onSuccess={() => void refetch()} tokenSymbol={activeTokenSymbol} />
                        </motion.div>
                    </div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                    >
                        {[
                            { label: 'Deposit', to: '/deposit', icon: 'M12 4v16m8-8H4', color: '#00ffaa' },
                            { label: 'Claim', to: '/claim', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: '#00e5ff' },
                            { label: 'Withdraw', to: '/withdraw', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3', color: '#ff6b6b' },
                            { label: 'Admin', to: '/admin', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', color: '#bf5af2' },
                        ].map((action) => (
                            <motion.button
                                key={action.label}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate(action.to)}
                                className="group flex flex-col items-center gap-2 rounded-xl px-4 py-4 transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                <div
                                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110"
                                    style={{ background: `${action.color}10` }}
                                >
                                    <svg className="h-4 w-4" style={{ color: `${action.color}80` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                                    </svg>
                                </div>
                                <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-300 transition-colors">
                                    {action.label}
                                </span>
                            </motion.button>
                        ))}
                    </motion.div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="relative overflow-hidden rounded-2xl px-8 py-14 text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    <div className="relative">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                            style={{ background: `linear-gradient(135deg, ${colors.from}12, ${colors.to}08)` }}>
                            <svg className="h-7 w-7" style={{ color: `${colors.from}80` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
                            </svg>
                        </div>
                        <h3 className="mt-5 text-lg font-bold text-white">Wallet Required</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Connect to view your {selectedVault.symbol} position
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={openConnectModal}
                            className="btn-neon mt-6 rounded-xl px-8 py-3 text-sm"
                        >
                            Connect Wallet
                        </motion.button>
                        <p className="mt-3 text-[11px] text-gray-600">
                            Supports OP_WALLET and UniSat
                        </p>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
