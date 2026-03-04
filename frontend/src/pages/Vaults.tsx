import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useVaultContext } from '../context/VaultContext';
import { useAllVaultsData, type VaultOverview } from '../hooks/useAllVaultsData';
import { Skeleton } from '../components/common/Skeleton';
import { formatTokenAmount } from '../utils/formatting';

/* ──────────────────── Color themes per vault ──────────────────── */
const VAULT_THEMES: Record<string, { from: string; to: string; glow: string }> = {
    moto: { from: '#00ffaa', to: '#00e5ff', glow: 'rgba(0,255,170,0.08)' },
    pill: { from: '#ff6b6b', to: '#ff9a8b', glow: 'rgba(255,107,107,0.08)' },
    rvt:  { from: '#bf5af2', to: '#8b5cf6', glow: 'rgba(191,90,242,0.08)' },
};

function getTheme(id: string) {
    return VAULT_THEMES[id] ?? VAULT_THEMES.moto;
}

/* ──────────────────── Vault token icons ──────────────────── */
const VAULT_ICONS: Record<string, string> = {
    moto: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    pill: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
    rvt:  'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
};

/* ──────────────────── Features ──────────────────── */
const features = [
    { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z', label: 'Reentrancy Guard', color: '#00ffaa', tip: 'Prevents flash loan & reentrancy attacks' },
    { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label: 'Auto-Compound', color: '#00e5ff', tip: 'Re-invest revenue into more shares' },
    { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Cooldown Timer', color: '#bf5af2', tip: 'Block-based anti-frontrun cooldown' },
    { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Emergency Exit', color: '#ff6b6b', tip: 'Withdraw even when paused, forfeits pending' },
    { icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z', label: 'Protocol Fee', color: '#fbbf24', tip: 'Configurable fee (max 20%) for sustainability' },
    { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'On-chain Events', color: '#a78bfa', tip: '8 event types emitted for indexing' },
];

/* ──────────────────── How it Works ──────────────────── */
const steps = [
    { num: '1', title: 'Deposit', desc: 'Deposit OP20 tokens to receive proportional vault shares', color: '#00ffaa', icon: 'M12 4v16m8-8H4' },
    { num: '2', title: 'Earn', desc: 'Protocol fees accumulate and distribute to all shareholders', color: '#00e5ff', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { num: '3', title: 'Claim', desc: 'Claim revenue anytime or auto-compound into more shares', color: '#bf5af2', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

/* ──────────────────── Single Vault Card ──────────────────── */
function VaultCard({ data, index }: { data: VaultOverview; index: number }) {
    const navigate = useNavigate();
    const { selectVault } = useVaultContext();
    const theme = getTheme(data.vault.id);
    const icon = VAULT_ICONS[data.vault.id] ?? VAULT_ICONS.moto;

    function handleEnter() {
        selectVault(data.vault.id);
        navigate('/dashboard');
    }

    const statItems = [
        { label: 'TVL', value: data.info ? formatTokenAmount(data.info.totalDeposited) : '0' },
        { label: 'Revenue', value: data.info ? formatTokenAmount(data.info.totalFees) : '0' },
        { label: 'Shares', value: data.info ? formatTokenAmount(data.info.totalShares) : '0' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
            <div className="vault-card group relative overflow-hidden rounded-2xl cursor-pointer">
                {/* Top gradient accent */}
                <div
                    className="h-[3px] w-full"
                    style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }}
                />

                <div className="relative p-6 sm:p-7">
                    {/* Token identity */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <motion.div
                                whileHover={{ scale: 1.08, rotate: 3 }}
                                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                                style={{
                                    background: `linear-gradient(135deg, ${theme.from}18, ${theme.to}0a)`,
                                    border: `1px solid ${theme.from}30`,
                                    boxShadow: `0 0 24px ${theme.from}08`,
                                }}
                            >
                                <svg
                                    className="h-6 w-6"
                                    style={{ color: theme.from }}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.8}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                                </svg>
                            </motion.div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-white">
                                    {data.vault.symbol}
                                </h3>
                                <p className="mt-0.5 text-[13px] text-gray-500">{data.vault.name}</p>
                            </div>
                        </div>

                        {/* Live indicator */}
                        <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{
                            background: `${theme.from}0a`,
                            border: `1px solid ${theme.from}18`,
                        }}>
                            <div className="relative flex h-1.5 w-1.5 rounded-full" style={{ background: theme.from }}>
                                <span
                                    className="absolute inset-0 rounded-full animate-ping"
                                    style={{ background: theme.from, opacity: 0.4 }}
                                />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: `${theme.from}90` }}>
                                Live
                            </span>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="mt-6 h-px w-full" style={{
                        background: `linear-gradient(90deg, transparent, ${theme.from}15, transparent)`,
                    }} />

                    {/* Stats row */}
                    <div className="mt-5 grid grid-cols-3 gap-4">
                        {statItems.map((stat) => (
                            <div key={stat.label}>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-600">
                                    {stat.label}
                                </p>
                                {data.loading ? (
                                    <Skeleton className="mt-1.5 h-6 w-16" />
                                ) : (
                                    <p className="mt-1.5 text-[15px] font-bold text-white">
                                        {stat.value}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Enter CTA */}
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleEnter}
                        className="vault-enter-btn mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold transition-all duration-300"
                        style={{
                            background: `linear-gradient(135deg, ${theme.from}18, ${theme.to}10)`,
                            border: `1px solid ${theme.from}28`,
                            color: theme.from,
                        }}
                    >
                        Enter Vault
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </motion.button>
                </div>

            </div>
        </motion.div>
    );
}

/* ──────────────────── Page Variants ──────────────────── */
const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

/* ──────────────────── Vaults Page ──────────────────── */
export function Vaults() {
    const vaults = useAllVaultsData();

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-14"
        >
            {/* ─── HERO ─── */}
            <div className="mesh-gradient-hero relative rounded-3xl px-1 py-2">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.6 }}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative flex h-2 w-2 rounded-full bg-[#00ffaa]">
                            <span className="live-dot absolute inset-0 rounded-full bg-[#00ffaa]" />
                        </div>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                            Live on Bitcoin L1
                        </span>
                        <div className="opnet-badge ml-auto flex items-center gap-1.5 rounded-full px-3 py-1">
                            <svg className="h-3 w-3 text-[#00ffaa]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-[10px] font-semibold tracking-wider text-[#00ffaa]/70">POWERED BY OPNET</span>
                        </div>
                    </div>

                    <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                        R<span className="text-gradient-animated">Vault</span>
                        <span className="ml-3 text-lg font-medium text-gray-500 sm:text-xl">Protocol</span>
                    </h1>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-gray-500">
                        Multi-vault revenue sharing on Bitcoin. Deposit tokens into any vault,
                        earn proportional protocol fees. Built for DeFi on OPNet.
                    </p>

                    {/* Protocol stats ribbon */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{
                            background: 'rgba(0,255,170,0.05)',
                            border: '1px solid rgba(0,255,170,0.1)',
                        }}>
                            <div className="h-1.5 w-1.5 rounded-full bg-[#00ffaa]" />
                            <span className="text-[11px] font-semibold text-gray-400">
                                <span className="text-[#00ffaa]">{vaults.length}</span> Active Vaults
                            </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{
                            background: 'rgba(0,229,255,0.05)',
                            border: '1px solid rgba(0,229,255,0.1)',
                        }}>
                            <div className="h-1.5 w-1.5 rounded-full bg-[#00e5ff]" />
                            <span className="text-[11px] font-semibold text-gray-400">
                                <span className="text-[#00e5ff]">OPNet</span> Testnet
                            </span>
                        </div>
                        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{
                            background: 'rgba(191,90,242,0.05)',
                            border: '1px solid rgba(191,90,242,0.1)',
                        }}>
                            <div className="h-1.5 w-1.5 rounded-full bg-[#bf5af2]" />
                            <span className="text-[11px] font-semibold text-gray-400">
                                <span className="text-[#bf5af2]">O(1)</span> Revenue Distribution
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ─── VAULT CARDS ─── */}
            <div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-2 mb-7"
                >
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06))' }} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-600">
                        Available Vaults
                    </span>
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
                </motion.div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {vaults.map((data, i) => (
                        <VaultCard key={data.vault.id} data={data} index={i} />
                    ))}
                </div>
            </div>

            {/* ─── HOW IT WORKS ─── */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
            >
                <div className="flex items-center gap-2 mb-7">
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06))' }} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-600">How it Works</span>
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {steps.map((step, i) => (
                        <motion.div
                            key={step.num}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.08 }}
                            className="relative group"
                        >
                            <div className="gradient-border overflow-hidden rounded-2xl p-5">
                                {i < steps.length - 1 && (
                                    <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 sm:block">
                                        <motion.div
                                            animate={{ x: [0, 4, 0] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                        >
                                            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            </svg>
                                        </motion.div>
                                    </div>
                                )}

                                <div className="relative flex items-start gap-4">
                                    <div
                                        className="step-ring flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                                        style={{
                                            background: `linear-gradient(135deg, ${step.color}15, ${step.color}08)`,
                                            border: `1px solid ${step.color}25`,
                                        }}
                                    >
                                        <svg className="h-4 w-4" style={{ color: step.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d={step.icon} />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold" style={{ color: `${step.color}80` }}>STEP {step.num}</span>
                                        </div>
                                        <h3 className="mt-0.5 text-[15px] font-bold text-white">{step.title}</h3>
                                        <p className="mt-1 text-[12px] leading-relaxed text-gray-500">{step.desc}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* ─── FEATURES ─── */}
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex items-center gap-2 mb-7">
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06))' }} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-600">Security & Features</span>
                    <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.55 + i * 0.04 }}
                            className="tooltip-wrapper feature-card-glow group flex flex-col items-center gap-2.5 rounded-xl p-4 text-center"
                            style={{ border: '1px solid rgba(255,255,255,0.04)' }}
                        >
                            <div className="tooltip-content">{feature.tip}</div>
                            <div
                                className="flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110"
                                style={{ background: `${feature.color}10` }}
                            >
                                <svg className="h-4 w-4" style={{ color: `${feature.color}90` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                                </svg>
                            </div>
                            <span className="text-[11px] font-medium leading-tight text-gray-500 group-hover:text-gray-400 transition-colors">
                                {feature.label}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* ─── PROTOCOL BANNER ─── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="relative overflow-hidden rounded-2xl"
                style={{
                    background: 'linear-gradient(135deg, rgba(0,255,170,0.03), rgba(0,229,255,0.02), rgba(191,90,242,0.02))',
                    border: '1px solid rgba(255,255,255,0.04)',
                }}
            >
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse at 80% 20%, rgba(0,255,170,0.04) 0%, transparent 60%)',
                }} />

                <div className="relative flex flex-col items-center gap-4 px-8 py-10 text-center">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{
                            background: 'linear-gradient(135deg, #00ffaa15, #00e5ff08)',
                            border: '1px solid rgba(0,255,170,0.2)',
                        }}>
                            <svg className="h-5 w-5 text-[#00ffaa]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-white">
                            Built on <span className="text-gradient-animated">OPNet</span>
                        </h3>
                    </div>
                    <p className="max-w-md text-sm text-gray-500">
                        RVault Protocol leverages OPNet smart contracts to bring DeFi revenue sharing
                        to Bitcoin L1 — no bridges, no wrapping, pure Bitcoin.
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                        <a
                            href="https://docs.opnet.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-gray-400 transition-colors hover:text-white"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            OPNet Docs
                        </a>
                        <a
                            href="https://github.com/JamalBanique/rv"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-gray-400 transition-colors hover:text-white"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            Source Code
                        </a>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
