import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useVaultContract } from '../../hooks/useVaultContract';
import { useTransaction } from '../../hooks/useTransaction';
import { providerService } from '../../services/ProviderService';
import { getNetworkConfig, DEFAULT_NETWORK } from '../../config/networks';
import { TransactionStatus } from '../common/TransactionStatus';
import { parseTokenAmount, formatTokenAmount } from '../../utils/formatting';

interface DepositFormProps {
    onSuccess: () => void;
    tokenBalance?: bigint;
    tokenSymbol?: string;
}

export function DepositForm({ onSuccess, tokenBalance = 0n, tokenSymbol = 'TOKEN' }: DepositFormProps) {
    const { walletAddress, provider, network } = useWalletConnect();
    const contracts = useVaultContract();
    const approveTx = useTransaction();
    const depositTx = useTransaction();

    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<'input' | 'approve' | 'confirming' | 'deposit'>('input');

    const parsedAmount = parseTokenAmount(amount);
    const isValidAmount = parsedAmount > 0n;
    const exceedsBalance = tokenBalance > 0n && parsedAmount > tokenBalance;

    function handleMax() {
        if (tokenBalance <= 0n) return;
        const formatted = formatTokenAmount(tokenBalance);
        void onAmountChange(formatted);
    }

    async function handleApprove() {
        if (!contracts || !isValidAmount || !walletAddress) return;
        setStep('approve');

        const activeProvider = provider ?? providerService.getProvider(
            network ?? getNetworkConfig(DEFAULT_NETWORK).network,
        );

        const txId = await approveTx.execute(
            async () => {
                const vaultAddr = await contracts.vault.contractAddress;
                return await contracts.token.increaseAllowance(vaultAddr, parsedAmount);
            },
            { waitForConfirmation: activeProvider },
        );

        if (txId) {
            setStep('deposit');
        }
    }

    async function handleDeposit() {
        if (!contracts || !isValidAmount) return;

        const txId = await depositTx.execute(async () => {
            return await contracts.vault.deposit(parsedAmount);
        });

        if (txId) {
            setAmount('');
            setStep('input');
            setTimeout(onSuccess, 2000);
        }
    }

    const [preview, setPreview] = useState<string | null>(null);

    async function onAmountChange(val: string) {
        setAmount(val);
        setStep('input');
        approveTx.reset();
        depositTx.reset();

        const parsed = parseTokenAmount(val);
        if (parsed > 0n && contracts) {
            try {
                const result = await contracts.vault.previewDeposit(parsed);
                if (!result.revert) {
                    setPreview(formatTokenAmount(result.properties.shares));
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

    const isProcessing =
        approveTx.state.status === 'simulating' ||
        approveTx.state.status === 'pending' ||
        approveTx.state.status === 'confirming' ||
        depositTx.state.status === 'simulating' ||
        depositTx.state.status === 'pending';

    return (
        <div className="gradient-border relative overflow-hidden rounded-2xl p-8">
            {/* Background glow */}
            <div className="float-slow absolute -left-24 -top-24 h-48 w-48 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(0,255,170,0.05) 0%, transparent 70%)' }} />

            <div className="relative">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,255,170,0.08)' }}>
                        <svg className="h-5 w-5 text-[#00ffaa]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Deposit</h2>
                        <p className="text-[12px] text-gray-500">Approve → deposit → receive vault shares</p>
                    </div>
                </div>

                {/* Input */}
                <div className="mt-8">
                    <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                            Amount
                        </label>
                        {tokenBalance > 0n && (
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-600">
                                    Balance: <span className="text-gray-400">{formatTokenAmount(tokenBalance)}</span>
                                </span>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleMax}
                                    disabled={isProcessing}
                                    className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors"
                                    style={{
                                        background: 'rgba(0,255,170,0.08)',
                                        color: '#00ffaa',
                                        border: '1px solid rgba(0,255,170,0.15)',
                                    }}
                                >
                                    MAX
                                </motion.button>
                            </div>
                        )}
                    </div>
                    <div className="relative mt-2">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => void onAmountChange(e.target.value)}
                            placeholder="0.00"
                            disabled={isProcessing}
                            className="input-neon w-full rounded-xl px-5 py-4 text-xl font-semibold text-white placeholder-gray-700 outline-none disabled:opacity-40"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                            {tokenSymbol}
                        </div>
                    </div>

                    {exceedsBalance && (
                        <p className="mt-2 text-[12px] text-red-400">Insufficient balance</p>
                    )}

                    {preview && !exceedsBalance && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
                            style={{ background: 'rgba(0,255,170,0.04)', border: '1px solid rgba(0,255,170,0.08)' }}
                        >
                            <svg className="h-3.5 w-3.5 text-[#00ffaa]/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <span className="text-[12px] text-gray-400">
                                You'll receive ~<span className="text-gradient-warm font-semibold">{preview}</span> shares
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* Step indicator */}
                <div className="mt-8 flex items-center gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                            step === 'deposit'
                                ? 'bg-[#00ffaa]/15 text-[#00ffaa]'
                                : step === 'approve' || step === 'confirming'
                                  ? 'bg-[#00ffaa]/15 text-[#00ffaa]'
                                  : 'bg-white/5 text-gray-600'
                        }`}>
                            {step === 'deposit' ? (
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            ) : '1'}
                        </div>
                        <span className={`text-xs font-medium ${step !== 'input' ? 'text-gray-300' : 'text-gray-600'}`}>Approve</span>
                    </div>

                    <div className="h-px flex-1" style={{
                        background: step === 'deposit'
                            ? 'linear-gradient(90deg, #00ffaa40, #00e5ff40)'
                            : step === 'confirming'
                              ? 'linear-gradient(90deg, #00ffaa20, #00e5ff20)'
                              : 'rgba(255,255,255,0.05)',
                        transition: 'background 0.5s ease',
                    }} />

                    <div className="flex items-center gap-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${
                            step === 'deposit' ? 'bg-[#00e5ff]/15 text-[#00e5ff]' : 'bg-white/5 text-gray-600'
                        }`}>
                            2
                        </div>
                        <span className={`text-xs font-medium ${step === 'deposit' ? 'text-gray-300' : 'text-gray-600'}`}>Deposit</span>
                    </div>
                </div>

                {/* Button */}
                <div className="mt-6">
                    {step === 'deposit' ? (
                        <motion.button
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            onClick={handleDeposit}
                            disabled={isProcessing}
                            className="btn-neon w-full rounded-xl py-4 text-sm"
                        >
                            {depositTx.state.status === 'simulating' || depositTx.state.status === 'pending'
                                ? 'Depositing...'
                                : 'Deposit Tokens'}
                        </motion.button>
                    ) : (
                        <motion.button
                            whileHover={{ scale: 1.005 }}
                            whileTap={{ scale: 0.995 }}
                            onClick={handleApprove}
                            disabled={!isValidAmount || !walletAddress || isProcessing || exceedsBalance}
                            className="btn-ghost w-full rounded-xl py-4 text-sm font-semibold"
                        >
                            {approveTx.state.status === 'confirming'
                                ? 'Confirming on-chain...'
                                : approveTx.state.status === 'simulating' || approveTx.state.status === 'pending'
                                  ? 'Approving...'
                                  : 'Approve Tokens'}
                        </motion.button>
                    )}
                </div>

                {approveTx.state.status !== 'idle' && (step === 'approve' || step === 'confirming') && (
                    <TransactionStatus state={approveTx.state} onReset={approveTx.reset} />
                )}
                {depositTx.state.status !== 'idle' && (
                    <TransactionStatus state={depositTx.state} onReset={depositTx.reset} />
                )}
            </div>
        </div>
    );
}
