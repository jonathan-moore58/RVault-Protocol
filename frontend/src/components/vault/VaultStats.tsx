import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '../common/Skeleton';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { formatTokenAmount } from '../../utils/formatting';
import type { VaultInfo, ProtocolInfo } from '../../types/vault';

interface VaultStatsProps {
    vaultInfo: VaultInfo | null;
    protocolInfo?: ProtocolInfo | null;
    loading: boolean;
}

function SpotlightCard({ children, color, className }: { children: React.ReactNode; color: string; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    function handleMouseMove(e: React.MouseEvent) {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ref.current?.style.setProperty('--mouse-x', `${x}px`);
        ref.current?.style.setProperty('--mouse-y', `${y}px`);
    }

    return (
        <div
            ref={ref}
            onMouseMove={handleMouseMove}
            className={className}
            style={{
                '--mouse-x': '50%',
                '--mouse-y': '50%',
                '--spot-color': color,
            } as React.CSSProperties}
        >
            {children}
        </div>
    );
}

const stats = [
    {
        label: 'Total Value Locked',
        key: 'totalDeposited' as const,
        sub: 'tokens deposited',
        icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z',
        color: '#00ffaa',
        glow: 'rgba(0,255,170,0.06)',
    },
    {
        label: 'Total Revenue',
        key: 'totalFees' as const,
        sub: 'fees collected',
        icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
        color: '#00e5ff',
        glow: 'rgba(0,229,255,0.06)',
    },
    {
        label: 'Total Shares',
        key: 'totalShares' as const,
        sub: 'outstanding',
        icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z',
        color: '#bf5af2',
        glow: 'rgba(191,90,242,0.06)',
    },
];

function estimateAPY(vaultInfo: VaultInfo): string {
    if (vaultInfo.totalDeposited <= 0n || vaultInfo.totalFees <= 0n) return '—';
    // Simple APY estimate: (totalFees / totalDeposited) * 100, annualized assumption
    const feeRatio = Number(vaultInfo.totalFees * 10000n / vaultInfo.totalDeposited) / 100;
    if (feeRatio <= 0) return '—';
    return `~${feeRatio.toFixed(1)}%`;
}

export function VaultStats({ vaultInfo, protocolInfo, loading }: VaultStatsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="glass-card rounded-2xl p-6">
                        <Skeleton className="mb-4 h-3 w-24" />
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="mt-3 h-3 w-20" />
                    </div>
                ))}
            </div>
        );
    }

    const displayInfo: VaultInfo = vaultInfo ?? {
        totalDeposited: 0n,
        totalShares: 0n,
        totalFees: 0n,
        accumulator: 0n,
    };

    const apy = estimateAPY(displayInfo);
    const protocolFeePct = protocolInfo ? Number(protocolInfo.feeBps) / 100 : null;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.5 }}
                    >
                        <SpotlightCard color={stat.color} className="gradient-border group relative overflow-hidden rounded-2xl p-6">
                            {/* Top gradient line */}
                            <div className="absolute inset-x-6 top-0 h-px" style={{
                                background: `linear-gradient(90deg, transparent, ${stat.color}40, transparent)`,
                            }} />

                            {/* Background glow */}
                            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full transition-all duration-500 group-hover:scale-150"
                                style={{ background: `radial-gradient(circle, ${stat.glow} 0%, transparent 70%)` }} />

                            <div className="relative flex items-start justify-between">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                                        {stat.label}
                                    </p>
                                    <AnimatedNumber
                                        value={formatTokenAmount(displayInfo[stat.key] as bigint)}
                                        className="mt-2.5 block text-2xl font-bold text-white"
                                    />
                                    <p className="mt-1.5 text-[11px] text-gray-600">{stat.sub}</p>
                                </div>

                                <motion.div
                                    whileHover={{ scale: 1.15, rotate: 5 }}
                                    className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-300"
                                    style={{ background: `${stat.color}10` }}
                                >
                                    <svg className="h-4.5 w-4.5" style={{ color: `${stat.color}80` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                                    </svg>
                                </motion.div>
                            </div>
                        </SpotlightCard>
                    </motion.div>
                ))}
            </div>

            {/* APY + Protocol fee row */}
            {(apy !== '—' || protocolFeePct !== null) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap items-center gap-3"
                >
                    {apy !== '—' && (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                            style={{ background: 'rgba(0,255,170,0.05)', border: '1px solid rgba(0,255,170,0.1)' }}>
                            <svg className="h-3.5 w-3.5 text-[#00ffaa]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            <span className="text-[12px] text-gray-400">
                                Fee/TVL Ratio: <span className="font-semibold text-[#00ffaa]">{apy}</span>
                            </span>
                        </div>
                    )}

                    {protocolFeePct !== null && protocolFeePct > 0 && (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                            style={{ background: 'rgba(191,90,242,0.05)', border: '1px solid rgba(191,90,242,0.1)' }}>
                            <svg className="h-3.5 w-3.5 text-[#bf5af2]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                            </svg>
                            <span className="text-[12px] text-gray-400">
                                Protocol Fee: <span className="font-semibold text-[#bf5af2]">{protocolFeePct}%</span>
                            </span>
                        </div>
                    )}

                    {protocolInfo && protocolInfo.totalProtocolFees > 0n && (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                            style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)' }}>
                            <span className="text-[12px] text-gray-400">
                                Protocol Earned: <span className="font-semibold text-[#00e5ff]">{formatTokenAmount(protocolInfo.totalProtocolFees)}</span>
                            </span>
                        </div>
                    )}

                    {protocolInfo && protocolInfo.cooldownBlocks > 0n && (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                            style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)' }}>
                            <svg className="h-3.5 w-3.5 text-amber-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[12px] text-gray-400">
                                Cooldown: <span className="font-semibold text-amber-400">{protocolInfo.cooldownBlocks.toString()} blocks</span>
                            </span>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
}
