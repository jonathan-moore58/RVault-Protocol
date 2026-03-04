import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { formatAddress } from '../../utils/formatting';
import { motion, AnimatePresence } from 'framer-motion';

const WALLET_META: Record<string, { label: string; desc: string }> = {
    OP_WALLET: {
        label: 'OP Wallet',
        desc: 'Recommended for OPNet',
    },
    UNISAT: {
        label: 'UniSat',
        desc: 'Bitcoin wallet',
    },
};

export function WalletConnect() {
    const { connectToWallet, disconnect, walletAddress, connecting, walletBalance, allWallets } =
        useWalletConnect();

    const [open, setOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    // Close on ESC
    useEffect(() => {
        if (!open) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open]);

    // Auto-close modal on successful connection
    useEffect(() => {
        if (walletAddress && open) setOpen(false);
    }, [walletAddress, open]);

    if (connecting) {
        return (
            <button
                disabled
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-500"
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#00ffaa]/30 border-t-[#00ffaa]" />
                Connecting...
            </button>
        );
    }

    if (walletAddress) {
        return (
            <div className="flex items-center gap-3">
                {walletBalance && (
                    <span className="text-[12px] font-medium text-gray-500">
                        {(walletBalance.confirmed / 1e8).toFixed(4)}{' '}
                        <span className="text-gradient-warm font-bold">BTC</span>
                    </span>
                )}
                <button
                    onClick={disconnect}
                    className="group flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] font-medium text-gray-300 transition-all duration-300 hover:text-white"
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <span className="relative flex h-2 w-2">
                        <span className="pulse-glow absolute inline-flex h-full w-full rounded-full bg-[#00ffaa]" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00ffaa]" />
                    </span>
                    <span className="font-mono text-[12px]">{formatAddress(walletAddress)}</span>
                </button>
            </div>
        );
    }

    return (
        <>
            <button onClick={() => setOpen(true)} className="btn-neon rounded-xl px-5 py-2.5 text-[13px]">
                Connect Wallet
            </button>

            {createPortal(
                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                        >
                            <motion.div
                                ref={modalRef}
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                                className="w-full max-w-sm mx-4"
                            >
                            {/* Card */}
                            <div
                                className="relative overflow-hidden rounded-2xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(5,10,14,0.98), rgba(10,17,24,0.98))',
                                    border: '1px solid rgba(0,255,170,0.08)',
                                    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,255,170,0.04)',
                                }}
                            >
                                {/* Top accent */}
                                <div
                                    className="h-[2px]"
                                    style={{
                                        background: 'linear-gradient(90deg, #00ffaa, #00e5ff, transparent)',
                                    }}
                                />

                                {/* Header */}
                                <div className="flex items-center justify-between px-6 pt-5 pb-1">
                                    <div>
                                        <h3 className="text-[15px] font-bold text-white">Connect Wallet</h3>
                                        <p className="mt-0.5 text-[11px] text-gray-500">
                                            Choose a wallet to connect to RVault
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Wallet list */}
                                <div className="space-y-2.5 px-6 py-4">
                                    {allWallets.map((w) => {
                                        const meta = WALLET_META[w.name] || {
                                            label: w.name,
                                            desc: 'Wallet',
                                        };
                                        return (
                                            <button
                                                key={w.name}
                                                onClick={() => connectToWallet(w.name)}
                                                disabled={!w.isInstalled}
                                                className="group relative flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-left transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                                                style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (w.isInstalled) {
                                                        e.currentTarget.style.background = 'rgba(0,255,170,0.04)';
                                                        e.currentTarget.style.borderColor = 'rgba(0,255,170,0.15)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                                                }}
                                            >
                                                {/* Icon */}
                                                <div
                                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.04)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                    }}
                                                >
                                                    {w.icon ? (
                                                        <img src={w.icon} alt={meta.label} className="h-6 w-6 rounded" />
                                                    ) : (
                                                        <span className="text-sm font-bold text-gray-400">
                                                            {meta.label.charAt(0)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Text */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-semibold text-white">
                                                            {meta.label}
                                                        </span>
                                                        {w.isInstalled && (
                                                            <span className="rounded-full bg-[#00ffaa]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#00ffaa]">
                                                                DETECTED
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-gray-500">
                                                        {w.isInstalled ? meta.desc : 'Not installed'}
                                                    </p>
                                                </div>

                                                {/* Arrow */}
                                                {w.isInstalled && (
                                                    <svg
                                                        className="h-4 w-4 flex-shrink-0 text-gray-600 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#00ffaa]"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                        strokeWidth={2}
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Footer */}
                                <div
                                    className="px-6 py-3 text-center text-[10px] text-gray-600"
                                    style={{
                                        borderTop: '1px solid rgba(255,255,255,0.04)',
                                        background: 'rgba(0,0,0,0.2)',
                                    }}
                                >
                                    Powered by OPNet &middot; Bitcoin L1
                                </div>
                            </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body,
            )}
        </>
    );
}
