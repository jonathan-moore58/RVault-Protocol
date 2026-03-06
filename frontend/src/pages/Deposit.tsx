import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useVaultData } from '../hooks/useVaultData';
import { useVaultContract } from '../hooks/useVaultContract';
import { DepositForm } from '../components/vault/DepositForm';
import { VaultStats } from '../components/vault/VaultStats';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

export function Deposit() {
    const { walletAddress, openConnectModal } = useWalletConnect();
    const contracts = useVaultContract();
    const { vaultInfo, protocolInfo, tokenBalance, activeTokenSymbol, tokenMismatch, loading, refetch } = useVaultData();
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (!contracts) return;
        contracts.vault.isPaused().then((r) => {
            if (!r.revert) setIsPaused(r.properties.paused as boolean);
        }).catch(() => {});
    }, [contracts]);

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-8"
        >
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Deposit
                </h1>
                <p className="mt-2 text-[14px] text-gray-500">
                    Lock tokens → receive vault shares → earn fees
                </p>
            </motion.div>

            {isPaused && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-semibold text-red-400">Vault is Paused</span>
                        <span className="text-[12px] text-gray-500">— Deposits are currently disabled</span>
                    </div>
                </motion.div>
            )}

            {tokenMismatch && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm font-semibold text-amber-400">Token Not Configured</span>
                        <span className="text-[12px] text-gray-500">— Owner must call setDepositToken() before deposits work</span>
                    </div>
                </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <VaultStats vaultInfo={vaultInfo} protocolInfo={protocolInfo} loading={loading} />
            </motion.div>

            {walletAddress ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <DepositForm onSuccess={() => void refetch()} tokenBalance={tokenBalance} tokenSymbol={activeTokenSymbol} />
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="gradient-border relative overflow-hidden rounded-2xl px-8 py-14 text-center"
                >
                    <div className="float-slow absolute left-[15%] top-[10%] h-20 w-20 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(0,255,170,0.06) 0%, transparent 70%)' }} />

                    <div className="relative">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ background: 'linear-gradient(135deg, rgba(0,255,170,0.1), rgba(0,229,255,0.05))' }}>
                            <svg className="h-6 w-6 text-[#00ffaa]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-white">Wallet Required</h3>
                        <p className="mt-1.5 text-sm text-gray-500">Connect OP_WALLET or UniSat to deposit</p>
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
