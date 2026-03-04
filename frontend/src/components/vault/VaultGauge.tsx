import { motion } from 'framer-motion';

interface VaultGaugeProps {
    label: string;
    value: number;
    max: number;
    color: string;
    displayValue: string;
    sub: string;
}

export function VaultGauge({ label, value, max, color, displayValue, sub }: VaultGaugeProps) {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const progress = max > 0 ? Math.min(value / max, 1) : 0;
    const offset = circumference - progress * circumference;

    return (
        <div className="gradient-border group relative overflow-hidden rounded-2xl p-6">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full transition-all duration-500 group-hover:scale-150"
                style={{ background: `radial-gradient(circle, ${color}10 0%, transparent 70%)` }} />

            <div className="relative flex items-center gap-5">
                <div className="relative flex-shrink-0">
                    <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                        <circle
                            cx="50" cy="50" r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.04)"
                            strokeWidth="6"
                        />
                        <motion.circle
                            cx="50" cy="50" r={radius}
                            fill="none"
                            stroke={`url(#gauge-grad-${label.replace(/\s/g, '')})`}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                        />
                        <defs>
                            <linearGradient id={`gauge-grad-${label.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor={color} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.4} />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[13px] font-bold" style={{ color }}>
                            {(progress * 100).toFixed(0)}%
                        </span>
                    </div>
                </div>

                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                        {label}
                    </p>
                    <p className="mt-1.5 text-xl font-bold text-white truncate">{displayValue}</p>
                    <p className="mt-0.5 text-[11px] text-gray-600">{sub}</p>
                </div>
            </div>
        </div>
    );
}
