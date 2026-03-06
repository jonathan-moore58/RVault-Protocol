import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useVaultContract } from '../../hooks/useVaultContract';
import { useTransaction } from '../../hooks/useTransaction';
import { providerService } from '../../services/ProviderService';
import { getNetworkConfig, DEFAULT_NETWORK } from '../../config/networks';
import { TransactionStatus } from '../common/TransactionStatus';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { formatTokenAmount } from '../../utils/formatting';
import type { UserInfo } from '../../types/vault';

interface ClaimCardProps {
    userInfo: UserInfo | null;
    onSuccess: () => void;
    tokenSymbol?: string;
}

export function ClaimCard({ userInfo, onSuccess, tokenSymbol = 'TOKEN' }: ClaimCardProps) {
    const { provider, network } = useWalletConnect();
    const contracts = useVaultContract();
    const claimTx = useTransaction();
    const compoundTx = useTransaction();

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
            setTimeout(onSuccess, 2000);
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
            setTimeout(onSuccess, 2000);
        }
    }

    const isProcessing =
        claimTx.state.status === 'simulating' || claimTx.state.status === 'pending' || claimTx.state.status === 'confirming' ||
        compoundTx.state.status === 'simulating' || compoundTx.state.status === 'pending' || compoundTx.state.status === 'confirming';

    return (
        <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
            {/* Animated glow accent */}
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full animate-glow-pulse"
                style={{ background: 'radial-gradient(circle, rgba(0,255,170,0.08) 0%, transparent 70%)' }} />

            <div className="relative">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(0,255,170,0.08)' }}>
                        <svg className="h-4 w-4 text-[#00ffaa]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                        Pending Revenue
                    </p>
                </div>

                <div className="mt-5 flex items-end justify-between">
                    <div>
                        <AnimatedNumber
                            value={formatTokenAmount(pending)}
                            className="text-3xl font-bold text-gradient-warm"
                        />
                        <span className="ml-2 text-xs font-medium text-gray-600">{tokenSymbol}</span>
                    </div>
                </div>

                {userInfo && (
                    <p className="mt-3 text-[11px] text-gray-600">
                        Lifetime claimed:{' '}
                        <span className="text-gray-400 font-medium">{formatTokenAmount(userInfo.totalClaimed)}</span>
                    </p>
                )}

                {/* Dual buttons: Claim + Compound */}
                <div className="mt-6 grid grid-cols-2 gap-3">
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleClaim}
                        disabled={!hasPending || isProcessing}
                        className="btn-neon rounded-xl py-3.5 text-sm"
                    >
                        {claimTx.state.status === 'simulating' || claimTx.state.status === 'pending'
                            ? 'Claiming...'
                            : 'Claim'}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCompound}
                        disabled={!hasPending || isProcessing}
                        className="btn-ghost rounded-xl py-3.5 text-sm font-semibold"
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
                        Compound re-invests revenue as additional shares
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
    );
}
