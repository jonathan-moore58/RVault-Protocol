/* ─── Vault theme colors (same as Vaults.tsx) ─── */
const VAULTS = [
    { id: 'moto', label: 'MOTO Vault', color: '#00ffaa' },
    { id: 'pill', label: 'PILL Vault', color: '#ff6b6b' },
    { id: 'rvt', label: 'RVT Vault', color: '#bf5af2' },
];

export function Tokenomics() {
    return (
        <div className="space-y-12">
            {/* ─── HEADER ─── */}
            <div className="px-1 py-2">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#00ffaa]" />
                    <span className="text-[11px] font-medium uppercase tracking-widest text-gray-600">
                        Revenue Model
                    </span>
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                    Tokenomics
                </h1>
                <p className="mt-2 max-w-lg text-[14px] text-gray-500">
                    How revenue flows through the protocol and why RVT captures value from every vault.
                </p>
            </div>

            {/* ─── FEE FLOW DIAGRAM ─── */}
            <div>
                <h2 className="text-[12px] font-semibold uppercase tracking-widest text-gray-600">
                    Fee Flow
                </h2>

                <div className="mt-4 rounded-xl p-6 sm:p-8" style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    {/* Source vaults */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        {VAULTS.map((v) => (
                            <div
                                key={v.id}
                                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium"
                                style={{
                                    background: `${v.color}08`,
                                    border: `1px solid ${v.color}18`,
                                    color: v.color,
                                }}
                            >
                                <div className="h-1.5 w-1.5 rounded-full" style={{ background: v.color }} />
                                {v.label}
                            </div>
                        ))}
                    </div>

                    {/* Arrow down */}
                    <div className="flex items-center gap-2 py-3 pl-4">
                        <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                        <span className="text-[11px] text-gray-600">each vault takes 5% protocol fee</span>
                    </div>

                    {/* Fee split */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                        <div className="flex-1 rounded-lg p-4" style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-600">95%</div>
                            <div className="mt-1 text-[13px] text-gray-400">Back to vault depositors</div>
                            <div className="mt-2 text-[11px] text-gray-600">
                                Proportional to shares held. Claimable or auto-compound.
                            </div>
                        </div>

                        <div className="flex-1 rounded-lg p-4" style={{
                            background: 'rgba(0,255,170,0.03)',
                            border: '1px solid rgba(0,255,170,0.08)',
                        }}>
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#00ffaa]/60">5%</div>
                            <div className="mt-1 text-[13px] text-gray-400">FeeRouter contract</div>
                            <div className="mt-2 text-[11px] text-gray-600">
                                On-chain contract splits fees trustlessly. No human wallet in the path.
                            </div>
                        </div>
                    </div>

                    {/* Arrow down — FeeRouter split */}
                    <div className="flex items-center gap-2 py-3 pl-4">
                        <div className="h-8 w-px" style={{ background: 'rgba(0,255,170,0.15)' }} />
                        <span className="text-[11px] text-gray-600">FeeRouter splits automatically</span>
                    </div>

                    {/* 90/10 split */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                        <div className="flex-[9] rounded-lg p-4" style={{
                            background: 'rgba(191,90,242,0.04)',
                            border: '1px solid rgba(191,90,242,0.12)',
                        }}>
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#bf5af2]/60">90%</div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-2 w-2 rounded-full bg-[#bf5af2]" />
                                <span className="text-[13px] font-semibold text-gray-300">RVT Stakers</span>
                            </div>
                            <div className="mt-2 text-[12px] text-gray-500">
                                Earn MOTO + PILL + RVT from all three vaults. Hold RVT to capture protocol-wide revenue.
                            </div>
                        </div>

                        <div className="flex-1 rounded-lg p-4" style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-600">10%</div>
                            <div className="mt-1 text-[13px] text-gray-400">Team</div>
                            <div className="mt-2 text-[11px] text-gray-600">
                                Operations + development. On-chain, transparent, capped at 30%.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── WHY RVT ─── */}
            <div>
                <h2 className="text-[12px] font-semibold uppercase tracking-widest text-gray-600">
                    Why Hold RVT
                </h2>

                <div className="mt-4 space-y-2">
                    {[
                        {
                            title: 'Multi-vault yield',
                            desc: 'RVT stakers earn protocol fees from MOTO, PILL, and RVT vaults — all three revenue streams in one position.',
                        },
                        {
                            title: 'No sell pressure',
                            desc: 'Protocol never sells partner tokens. MOTO and PILL fees are redistributed directly — never dumped on market.',
                        },
                        {
                            title: 'Aligned incentives',
                            desc: 'Protocol team earns by holding RVT, same as every other staker. No separate fee extraction.',
                        },
                        {
                            title: 'Sustainable model',
                            desc: 'Revenue comes from vault activity, not inflation or emissions. More deposits = more fees = more RVT demand.',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg px-5 py-4"
                            style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}
                        >
                            <div className="text-[13px] font-semibold text-gray-300">{item.title}</div>
                            <div className="mt-1 text-[12px] text-gray-600">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── EARNING EXAMPLE ─── */}
            <div>
                <h2 className="text-[12px] font-semibold uppercase tracking-widest text-gray-600">
                    Example
                </h2>

                <div className="mt-4 overflow-hidden rounded-xl" style={{
                    border: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <table className="w-full text-left text-[12px]">
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <th className="px-5 py-3 font-semibold text-gray-500">Source</th>
                                <th className="px-5 py-3 font-semibold text-gray-500">Monthly fees</th>
                                <th className="px-5 py-3 font-semibold text-gray-500">Protocol cut (5%)</th>
                                <th className="px-5 py-3 font-semibold text-gray-500">→ RVT stakers (90%)</th>
                                <th className="px-5 py-3 font-semibold text-gray-500">→ Team (10%)</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-400">
                            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <td className="px-5 py-3 font-medium" style={{ color: '#00ffaa' }}>MOTO Vault</td>
                                <td className="px-5 py-3">10,000 MOTO</td>
                                <td className="px-5 py-3">500 MOTO</td>
                                <td className="px-5 py-3 text-gray-300">450 MOTO</td>
                                <td className="px-5 py-3 text-gray-600">50 MOTO</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <td className="px-5 py-3 font-medium" style={{ color: '#ff6b6b' }}>PILL Vault</td>
                                <td className="px-5 py-3">6,000 PILL</td>
                                <td className="px-5 py-3">300 PILL</td>
                                <td className="px-5 py-3 text-gray-300">270 PILL</td>
                                <td className="px-5 py-3 text-gray-600">30 PILL</td>
                            </tr>
                            <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                <td className="px-5 py-3 font-medium" style={{ color: '#bf5af2' }}>RVT Vault</td>
                                <td className="px-5 py-3">4,000 RVT</td>
                                <td className="px-5 py-3">200 RVT</td>
                                <td className="px-5 py-3 text-gray-300">180 RVT</td>
                                <td className="px-5 py-3 text-gray-600">20 RVT</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="px-5 py-3 text-[11px] text-gray-600" style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        If you hold 20% of total RVT supply staked → you earn 90 MOTO + 54 PILL + 36 RVT per month
                    </div>
                </div>
            </div>

            {/* ─── PROTOCOL SPECS ─── */}
            <div>
                <h2 className="text-[12px] font-semibold uppercase tracking-widest text-gray-600">
                    Protocol Specs
                </h2>

                <div className="mt-4 flex flex-wrap gap-2">
                    {[
                        { label: 'Distribution', value: 'Synthetix accumulator, 1e18 precision' },
                        { label: 'Protocol fee', value: '5% default (max 20%, admin-configurable)' },
                        { label: 'Deposit cooldown', value: '6 blocks (~1 hour on Bitcoin)' },
                        { label: 'Emergency exit', value: 'Always available, bypasses cooldown' },
                        { label: 'RVT supply', value: '100,000,000 (fixed, no inflation)' },
                        { label: 'Fee routing', value: 'FeeRouter contract — trustless 90/10 split, permissionless distribution' },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-lg px-3 py-2 text-[11px]"
                            style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}
                        >
                            <span className="text-gray-600">{item.label}</span>
                            <span className="ml-1.5 text-gray-400">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── CONTRACT FEATURES ─── */}
            <div>
                <h2 className="text-[12px] font-semibold uppercase tracking-widest text-gray-600">
                    On-Chain Features
                </h2>

                <div className="mt-4 space-y-2">
                    {[
                        {
                            title: 'Multi-token reward distribution',
                            desc: 'RVT vault accepts up to 2 external reward tokens (MOTO, PILL) via distributeReward(). Same Synthetix accumulator, separate accumulators per token.',
                            status: 'live',
                        },
                        {
                            title: 'Auto-settle on withdraw',
                            desc: 'External rewards are automatically claimed when users withdraw or emergency exit. No pending rewards left behind.',
                            status: 'live',
                        },
                        {
                            title: 'Claim all rewards in one transaction',
                            desc: 'claimAllRewards() settles MOTO + PILL pending amounts in a single call. Gas efficient, user friendly.',
                            status: 'live',
                        },
                        {
                            title: 'Trustless FeeRouter',
                            desc: 'Dedicated contract receives protocol fees and splits them on-chain: 90% to RVT vault stakers, 10% to team. Anyone can trigger distribution — no admin needed.',
                            status: 'live',
                        },
                        {
                            title: 'Governance (planned)',
                            desc: 'RVT holders vote on protocol fee percentage, treasury allocation, and new vault integrations.',
                            status: 'planned',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="flex items-start gap-3 rounded-lg px-5 py-4"
                            style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                            }}
                        >
                            <div
                                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                                style={{
                                    background: item.status === 'live' ? '#00ffaa' : 'rgba(255,255,255,0.1)',
                                }}
                            />
                            <div>
                                <div className="text-[13px] font-semibold text-gray-300">{item.title}</div>
                                <div className="mt-1 text-[12px] text-gray-600">{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── LINKS ─── */}
            <div className="flex items-center gap-4 text-[11px] text-gray-600">
                <a
                    href="https://github.com/jonathan-moore58/RVault-Protocol"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-gray-400"
                >
                    GitHub ↗
                </a>
                <a
                    href="https://docs.opnet.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-gray-400"
                >
                    OPNet Docs ↗
                </a>
            </div>
        </div>
    );
}
