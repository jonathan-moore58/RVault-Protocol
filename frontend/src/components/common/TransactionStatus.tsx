import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TransactionState } from '../../types/vault';

interface TransactionStatusProps {
    state: TransactionState;
    onReset?: () => void;
}

const statusConfig = {
    simulating: { gradient: 'from-[#00ffaa]/5 to-[#00e5ff]/5', border: 'rgba(0,255,170,0.12)', icon: 'spin', label: 'Simulating transaction...', accent: '#00ffaa' },
    pending: { gradient: 'from-[#00e5ff]/5 to-[#bf5af2]/5', border: 'rgba(0,229,255,0.12)', icon: 'spin', label: 'Broadcasting transaction...', accent: '#00e5ff' },
    confirming: { gradient: 'from-[#bf5af2]/5 to-[#00e5ff]/5', border: 'rgba(191,90,242,0.12)', icon: 'spin', label: 'Confirming on-chain...', accent: '#bf5af2' },
    success: { gradient: 'from-[#00ffaa]/8 to-transparent', border: 'rgba(0,255,170,0.2)', icon: 'check', label: 'Transaction confirmed', accent: '#00ffaa' },
    error: { gradient: 'from-red-500/5 to-transparent', border: 'rgba(239,68,68,0.15)', icon: 'x', label: 'Transaction failed', accent: '#ef4444' },
};

function formatCountdown(rawSecs: number): string {
    const secs = Math.min(rawSecs, 600); // cap at 10 min
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    if (m > 0) return `~${m}m ${s}s`;
    return `~${s}s`;
}

function ConfirmationTimer({ startedAt, estimatedSecs }: { startedAt: number; estimatedSecs: number }) {
    const [remaining, setRemaining] = useState(estimatedSecs);

    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            setRemaining(Math.max(0, estimatedSecs - elapsed));
        }, 1000);
        return () => clearInterval(interval);
    }, [startedAt, estimatedSecs]);

    const progress = Math.min(1, 1 - remaining / Math.max(estimatedSecs, 1));

    return (
        <div className="mt-2">
            <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-500">Next block in {formatCountdown(remaining)}</span>
                <span className="text-gray-600">{Math.round(progress * 100)}%</span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #bf5af2, #00e5ff)' }}
                    initial={{ width: `${progress * 100}%` }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.3, ease: 'linear' }}
                />
            </div>
        </div>
    );
}

export function TransactionStatus({ state, onReset }: TransactionStatusProps) {
    if (state.status === 'idle') return null;

    const config = statusConfig[state.status];

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={state.status}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className={`mt-5 overflow-hidden rounded-xl bg-gradient-to-r ${config.gradient}`}
                style={{ border: `1px solid ${config.border}` }}
            >
                {/* Top accent beam */}
                <div className="h-px w-full" style={{
                    background: `linear-gradient(90deg, transparent, ${config.accent}40, transparent)`,
                }} />

                <div className="flex items-center gap-3 px-4 py-3.5">
                    {config.icon === 'spin' && (
                        <div className="relative">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#00ffaa]/20 border-t-[#00ffaa]" />
                            <div className="absolute inset-0 animate-ping rounded-full bg-[#00ffaa]/10" />
                        </div>
                    )}

                    {config.icon === 'check' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="flex h-6 w-6 items-center justify-center rounded-full"
                            style={{ background: 'linear-gradient(135deg, rgba(0,255,170,0.2), rgba(0,229,255,0.1))' }}
                        >
                            <svg className="h-3.5 w-3.5 text-[#00ffaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <motion.path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.4, delay: 0.2 }}
                                />
                            </svg>
                        </motion.div>
                    )}

                    {config.icon === 'x' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15"
                        >
                            <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </motion.div>
                    )}

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-200">{config.label}</p>
                        {state.txId && (
                            <a
                                href={`https://opscan.org/transactions/${state.txId}?network=op_testnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group mt-0.5 flex items-center gap-1 truncate font-mono text-[11px] text-gray-500 hover:text-[#00ffaa] transition-colors"
                            >
                                <span className="truncate">{state.txId}</span>
                                <svg className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        )}
                        {state.error && (
                            <p className="mt-0.5 text-xs text-red-400/80">{state.error}</p>
                        )}
                        {state.status === 'confirming' && state.confirmStartedAt && state.estimatedWaitSecs && (
                            <ConfirmationTimer
                                startedAt={state.confirmStartedAt}
                                estimatedSecs={state.estimatedWaitSecs}
                            />
                        )}
                    </div>

                    {(state.status === 'success' || state.status === 'error') && onReset && (
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            onClick={onReset}
                            className="rounded-lg px-2.5 py-1 text-xs text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                        >
                            Dismiss
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
