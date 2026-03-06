import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useVaultData } from '../hooks/useVaultData';
import { useVaultContract } from '../hooks/useVaultContract';
import { useTransaction } from '../hooks/useTransaction';
import { providerService } from '../services/ProviderService';
import { getNetworkConfig, DEFAULT_NETWORK } from '../config/networks';
import { WithdrawForm } from '../components/vault/WithdrawForm';
import { VaultStats } from '../components/vault/VaultStats';
import { TransactionStatus } from '../components/common/TransactionStatus';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

export function Withdraw() {
    const { walletAddress, openConnectModal, provider, network } = useWalletConnect();
    const { vaultInfo, userInfo, protocolInfo, activeTokenSymbol, loading, refetch } = useVaultData();
    const contracts = useVaultContract();
    const emergencyTx = useTransaction();
    const [showEmergency, setShowEmergency] = useState(false);

    async function handleEmergencyWithdraw() {
        if (!contracts) return;

        const activeProvider = provider ?? providerService.getProvider(
            network ?? getNetworkConfig(DEFAULT_NETWORK).network,
        );

        const txId = await emergencyTx.execute(
            async () => {
                return await contracts.vault.emergencyWithdraw();
            },
            { waitForConfirmation: activeProvider },
        );

        if (txId) {
            setTimeout(() => void refetch(), 2000);
        }
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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Withdraw
                </h1>
                <p className="mt-2 text-[14px] text-gray-500">
                    Burns shares, returns tokens + any unclaimed revenue
                </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <VaultStats vaultInfo={vaultInfo} protocolInfo={protocolInfo} loading={loading} />
            </motion.div>

            {walletAddress ? (
                <div className="space-y-6">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <WithdrawForm userInfo={userInfo} onSuccess={() => void refetch()} tokenSymbol={activeTokenSymbol} />
                    </motion.div>

                    {/* Emergency Withdraw */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <div className="rounded-2xl p-5" style={{
                            background: 'rgba(239,68,68,0.03)',
                            border: '1px solid rgba(239,68,68,0.08)',
                        }}>
                            <button
                                onClick={() => setShowEmergency(!showEmergency)}
                                className="flex w-full items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(239,68,68,0.08)' }}>
                                        <svg className="h-4 w-4 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-sm font-bold text-red-400/80">Emergency Withdraw</h3>
                                        <p className="text-[11px] text-gray-600">Works even when vault is paused — forfeits pending revenue</p>
                                    </div>
                                </div>
                                <svg className={`h-4 w-4 text-gray-600 transition-transform ${showEmergency ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showEmergency && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4"
                                >
                                    <div className="rounded-lg px-3 py-2 text-[11px] text-red-400/60" style={{ background: 'rgba(239,68,68,0.05)' }}>
                                        Warning: Emergency withdraw will return your deposited tokens but you will lose any unclaimed pending revenue.
                                    </div>

                                    <motion.button
                                        whileHover={{ scale: 1.005 }}
                                        whileTap={{ scale: 0.995 }}
                                        onClick={handleEmergencyWithdraw}
                                        disabled={!userInfo || userInfo.shares <= 0n || emergencyTx.state.status === 'simulating' || emergencyTx.state.status === 'pending'}
                                        className="mt-3 w-full rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-30"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))',
                                            border: '1px solid rgba(239,68,68,0.2)',
                                            color: '#ef4444',
                                        }}
                                    >
                                        {emergencyTx.state.status === 'simulating' || emergencyTx.state.status === 'pending'
                                            ? 'Processing...'
                                            : 'Emergency Withdraw All'}
                                    </motion.button>

                                    <TransactionStatus state={emergencyTx.state} onReset={emergencyTx.reset} />
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="gradient-border relative overflow-hidden rounded-2xl px-8 py-14 text-center"
                >
                    <div className="float-slower absolute right-[15%] top-[10%] h-20 w-20 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)' }} />

                    <div className="relative">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ background: 'rgba(239,68,68,0.06)' }}>
                            <svg className="h-6 w-6 text-red-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-white">Connect to Withdraw</h3>
                        <p className="mt-1.5 text-sm text-gray-500">Connect your wallet to withdraw shares</p>
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
