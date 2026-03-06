import { Fragment } from 'react';
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


/* ──────────────────── Single Vault Card ──────────────────── */
function VaultCard({ data }: { data: VaultOverview }) {
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
        <div>
            <div className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Top gradient accent */}
                <div
                    className="h-[3px] w-full"
                    style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }}
                />

                <div className="relative p-6 sm:p-7">
                    {/* Token identity */}
                    <div className="flex items-center gap-4">
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl"
                            style={{ background: `${theme.from}10`, border: `1px solid ${theme.from}20` }}
                        >
                            <svg className="h-5 w-5" style={{ color: theme.from }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold tracking-tight text-white">{data.vault.symbol}</h3>
                            <p className="mt-0.5 text-[13px] text-gray-500">{data.vault.name}</p>
                        </div>
                    </div>

                    <div className="mt-5 h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

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

                    <button
                        onClick={handleEnter}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all hover:brightness-110"
                        style={{
                            background: `${theme.from}12`,
                            border: `1px solid ${theme.from}20`,
                            color: theme.from,
                        }}
                    >
                        Enter Vault
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                </div>

            </div>
        </div>
    );
}

export function Vaults() {
    const vaults = useAllVaultsData();

    return (
        <div className="space-y-10">
            {/* ─── HERO ─── */}
            <div className="px-1 py-2">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#00ffaa]" />
                    <span className="text-[11px] font-medium uppercase tracking-widest text-gray-600">
                        Bitcoin L1 · OPNet Testnet
                    </span>
                </div>

                <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                    RVault
                    <span className="ml-2 text-lg font-medium text-gray-500">Protocol</span>
                </h1>
                <p className="mt-2 max-w-lg text-[15px] text-gray-500">
                    Revenue-sharing vaults on Bitcoin. Deposit OP20 tokens, earn protocol fees, claim or compound.
                </p>

                <div className="mt-5 flex items-center gap-4 text-[12px] text-gray-600">
                    <span><span className="font-semibold text-gray-400">{vaults.length}</span> vaults</span>
                    <span className="text-gray-700">·</span>
                    <span>O(1) distribution</span>
                    <span className="text-gray-700">·</span>
                    <span>No epochs</span>
                </div>

                <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-gray-600">
                    Accepts OP20 token deposits and issues pro-rata shares. Revenue pushed via{' '}
                    <code className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[12px] text-gray-400">collectFees()</code>{' '}
                    updates a global accumulator — Synthetix staking math — so every depositor's cut is O(1).
                    Claim earnings as tokens or auto-compound into more shares.
                </p>
            </div>

            {/* ─── VAULT CARDS ─── */}
            <div>
                <div className="mb-6 flex flex-wrap items-center gap-2 text-[11px]">
                    {['Deposit tokens', 'Receive shares', 'Earn fees', 'Claim or compound'].map((step, i, arr) => (
                        <Fragment key={step}>
                            <span
                                className="rounded-md px-2.5 py-1 text-gray-500"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                            >
                                {step}
                            </span>
                            {i < arr.length - 1 && <span className="text-gray-700">→</span>}
                        </Fragment>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {vaults.length > 0 ? (
                        vaults.map((data) => (
                            <VaultCard key={data.vault.id} data={data} />
                        ))
                    ) : (
                        <div className="col-span-full rounded-2xl px-8 py-14 text-center" style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <p className="text-sm text-gray-500">No vaults available on this network</p>
                        </div>
                    )}
                </div>

                {/* Protocol specs */}
                <div className="mt-8 flex flex-wrap items-center gap-2">
                    {[
                        { label: 'Math', value: 'Synthetix accumulator, 1e18' },
                        { label: 'Cooldown', value: '6 blocks after deposit' },
                        { label: 'Fee', value: '5% protocol (max 20%)' },
                        { label: 'Emergency exit', value: 'always available' },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-lg px-3 py-1.5 text-[11px]"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <span className="text-gray-600">{item.label}</span>
                            <span className="ml-1.5 text-gray-400">{item.value}</span>
                        </div>
                    ))}
                </div>

                {/* Source links */}
                <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-600">
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

        </div>
    );
}
