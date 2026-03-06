import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useVaultContract } from '../../hooks/useVaultContract';
import { useTransaction } from '../../hooks/useTransaction';
import { providerService } from '../../services/ProviderService';
import { getNetworkConfig, DEFAULT_NETWORK } from '../../config/networks';
import { TransactionStatus } from '../common/TransactionStatus';
import { parseTokenAmount, formatTokenAmount } from '../../utils/formatting';
import type { UserInfo } from '../../types/vault';

interface WithdrawFormProps {
    userInfo: UserInfo | null;
    onSuccess: () => void;
    tokenSymbol?: string;
}

export function WithdrawForm({ userInfo, onSuccess, tokenSymbol = 'TOKEN' }: WithdrawFormProps) {
    const { provider, network } = useWalletConnect();
    const contracts = useVaultContract();
    const { state, execute, reset } = useTransaction();
    const [shareAmount, setShareAmount] = useState('');
    const [preview, setPreview] = useState<string | null>(null);

    const maxShares = userInfo?.shares ?? 0n;
    const parsedShares = parseTokenAmount(shareAmount);
    const isValid = parsedShares > 0n && parsedShares <= maxShares;

    async function fetchPreview(val: string) {
        const parsed = parseTokenAmount(val);
        if (parsed > 0n && contracts) {
            try {
                const result = await contracts.vault.previewWithdraw(parsed);
                if (!result.revert) {
                    setPreview(formatTokenAmount(result.properties.amountOut as bigint));
                } else {
                    setPreview(null);
                }
            } catch {
                setPreview(null);
            }
        } else {
            setPreview(null);
        }
    }

    function onShareAmountChange(val: string) {
        setShareAmount(val);
        void fetchPreview(val);
    }

    function handleMax() {
        const formatted = formatTokenAmount(maxShares);
        setShareAmount(formatted);
        void fetchPreview(formatted);
    }

    async function handleWithdraw() {
        if (!contracts || !isValid) return;

        const activeProvider = provider ?? providerService.getProvider(
            network ?? getNetworkConfig(DEFAULT_NETWORK).network,
        );

        const txId = await execute(
            async () => {
                return await contracts.vault.withdraw(parsedShares);
            },
            { waitForConfirmation: activeProvider },
        );

        if (txId) {
            setShareAmount('');
            setPreview(null);
            setTimeout(onSuccess, 2000);
        }
    }

    const isProcessing = state.status === 'simulating' || state.status === 'pending' || state.status === 'confirming';

    return (
        <div className="gradient-border relative overflow-hidden rounded-2xl p-8">
            {/* Background orb */}
            <div className="float-slower absolute -right-24 -top-24 h-48 w-48 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)' }} />

            <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(239,68,68,0.06)' }}>
                        <svg className="h-5 w-5 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Withdraw</h2>
                        <p className="text-[12px] text-gray-500">Burn shares to withdraw + auto-claim</p>
                    </div>
                </div>

                {/* Input */}
                <div className="mt-8">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                            Shares to burn
                        </label>
                        <button
                            onClick={handleMax}
                            className="group flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500 transition-colors hover:text-[#00ffaa]"
                        >
                            <span>MAX</span>
                            <span className="text-gray-600 transition-colors group-hover:text-[#00ffaa]/70">{formatTokenAmount(maxShares)}</span>
                        </button>
                    </div>

                    <div className="relative mt-2">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={shareAmount}
                            onChange={(e) => onShareAmountChange(e.target.value)}
                            placeholder="0.00"
                            disabled={isProcessing}
                            className="input-neon w-full rounded-xl px-5 py-4 text-xl font-semibold text-white placeholder-gray-700 outline-none disabled:opacity-40"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                            SHARES
                        </div>
                    </div>

                    {preview && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
                            style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)' }}
                        >
                            <svg className="h-3.5 w-3.5 text-red-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                            <span className="text-[12px] text-gray-400">
                                You'll receive ~<span className="font-semibold text-red-400">{preview}</span> {tokenSymbol}
                            </span>
                        </motion.div>
                    )}

                    {userInfo && userInfo.pendingRevenue > 0n && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-3 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                            style={{ background: 'rgba(0,255,170,0.03)', border: '1px solid rgba(0,255,170,0.08)' }}
                        >
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00ffaa]/10">
                                <svg className="h-3 w-3 text-[#00ffaa]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <span className="text-[12px] text-gray-400">
                                <span className="text-gradient-warm font-semibold">{formatTokenAmount(userInfo.pendingRevenue)}</span> revenue auto-claimed on withdraw
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* Button */}
                <motion.button
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={handleWithdraw}
                    disabled={!isValid || isProcessing}
                    className="mt-6 w-full rounded-xl py-4 text-sm font-bold text-white transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-30"
                    style={{
                        background: isValid && !isProcessing
                            ? 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.6))'
                            : 'rgba(255,255,255,0.03)',
                        border: isValid && !isProcessing
                            ? '1px solid rgba(239,68,68,0.3)'
                            : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: isValid && !isProcessing
                            ? '0 0 30px rgba(239,68,68,0.1)'
                            : 'none',
                    }}
                >
                    {state.status === 'confirming'
                        ? 'Confirming on-chain...'
                        : isProcessing ? 'Withdrawing...' : 'Withdraw & Claim'}
                </motion.button>

                <TransactionStatus state={state} onReset={reset} />
            </div>
        </div>
    );
}
