import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useVaultContract } from '../hooks/useVaultContract';
import { useVaultData } from '../hooks/useVaultData';
import { useTransaction } from '../hooks/useTransaction';
import { TransactionStatus } from '../components/common/TransactionStatus';
import { VaultStats } from '../components/vault/VaultStats';
import { Skeleton } from '../components/common/Skeleton';
import { parseTokenAmount, formatTokenAmount, isValidHexAddress } from '../utils/formatting';
import { Address } from '@btc-vision/transaction';
import { useVaultContext } from '../context/VaultContext';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

export function Admin() {
    const { walletAddress, address: userAddress, openConnectModal } = useWalletConnect();
    const contracts = useVaultContract();
    const { vaultInfo, protocolInfo, activeTokenSymbol, loading, refetch } = useVaultData();
    const { selectedVault } = useVaultContext();
    const hasActiveDeposits = vaultInfo && vaultInfo.totalDeposited > 0n;
    const pauseTx = useTransaction();
    const minDepositTx = useTransaction();
    const collectFeesTx = useTransaction();
    const setTokenTx = useTransaction();
    const setFeeTx = useTransaction();
    const setRecipientTx = useTransaction();
    const setCooldownTx = useTransaction();

    const [isPaused, setIsPaused] = useState<boolean | null>(null);
    const [owner, setOwner] = useState<Address | null>(null);
    const [minDeposit, setMinDeposit] = useState<string>('');
    const [currentMinDeposit, setCurrentMinDeposit] = useState<bigint | null>(null);
    const [feeAmount, setFeeAmount] = useState('');
    const [depositTokenInput, setDepositTokenInput] = useState('');
    const [protocolFeeBps, setProtocolFeeBps] = useState('');
    const [feeRecipientInput, setFeeRecipientInput] = useState('');
    const [cooldownBlocksInput, setCooldownBlocksInput] = useState('');
    const [adminLoading, setAdminLoading] = useState(true);

    const isOwner = !!(walletAddress && owner && userAddress && owner.equals(userAddress));

    const fetchAdminData = useCallback(async () => {
        if (!contracts) return;
        try {
            const [ownerResult, pausedResult, minResult] = await Promise.all([
                contracts.vault.getOwner(),
                contracts.vault.isPaused(),
                contracts.vault.getMinimumDeposit(),
            ]);

            if (!ownerResult.revert) {
                setOwner(ownerResult.properties.owner);
            }
            if (!pausedResult.revert) {
                setIsPaused(pausedResult.properties.paused as boolean);
            }
            if (!minResult.revert) {
                setCurrentMinDeposit(minResult.properties.minimumDeposit as bigint);
            }
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setAdminLoading(false);
        }
    }, [contracts]);

    useEffect(() => {
        void fetchAdminData();
    }, [fetchAdminData]);

    async function handlePauseToggle() {
        if (!contracts) return;

        const txId = await pauseTx.execute(async () => {
            return isPaused
                ? await contracts.vault.unpause()
                : await contracts.vault.pause();
        });

        if (txId) {
            setTimeout(() => {
                void fetchAdminData();
                void refetch();
            }, 2000);
        }
    }

    async function handleSetMinDeposit() {
        if (!contracts) return;
        const parsed = parseTokenAmount(minDeposit);
        if (parsed <= 0n) return;

        const txId = await minDepositTx.execute(async () => {
            return await contracts.vault.setMinimumDeposit(parsed);
        });

        if (txId) {
            setMinDeposit('');
            setTimeout(() => void fetchAdminData(), 2000);
        }
    }

    async function handleCollectFees() {
        if (!contracts) return;
        const parsed = parseTokenAmount(feeAmount);
        if (parsed <= 0n) return;

        const txId = await collectFeesTx.execute(async () => {
            return await contracts.vault.collectFees(parsed);
        });

        if (txId) {
            setFeeAmount('');
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleSetDepositToken() {
        if (!contracts || !isValidHexAddress(depositTokenInput)) return;

        const txId = await setTokenTx.execute(async () => {
            return await contracts.vault.setDepositToken(Address.fromString(depositTokenInput.trim()));
        });

        if (txId) {
            setDepositTokenInput('');
        }
    }

    async function handleSetProtocolFee() {
        if (!contracts || !protocolFeeBps.trim()) return;
        const bps = BigInt(Math.round(Number(protocolFeeBps)));
        if (bps < 0n || bps > 2000n) return;

        const txId = await setFeeTx.execute(async () => {
            return await contracts.vault.setProtocolFee(bps);
        });

        if (txId) {
            setProtocolFeeBps('');
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleSetFeeRecipient() {
        if (!contracts || !isValidHexAddress(feeRecipientInput)) return;

        const txId = await setRecipientTx.execute(async () => {
            return await contracts.vault.setProtocolFeeRecipient(
                Address.fromString(feeRecipientInput.trim()),
            );
        });

        if (txId) {
            setFeeRecipientInput('');
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleSetCooldown() {
        if (!contracts || !cooldownBlocksInput.trim()) return;
        const blocks = BigInt(Math.round(Number(cooldownBlocksInput)));
        if (blocks < 0n) return;

        const txId = await setCooldownTx.execute(async () => {
            return await contracts.vault.setCooldownBlocks(blocks);
        });

        if (txId) {
            setCooldownBlocksInput('');
            setTimeout(() => void refetch(), 2000);
        }
    }

    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="space-y-8"
        >
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <div className="flex items-center gap-3">
                    <div className="flex h-2 w-2 rounded-full" style={{ background: isPaused ? '#ef4444' : '#00ffaa' }} />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                        {isPaused === null ? 'Loading...' : isPaused ? 'Vault Paused' : 'Vault Active'}
                    </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
                    Admin <span className="text-gradient-animated">Panel</span>
                </h1>
                <p className="mt-2 text-[14px] text-gray-500">
                    Owner controls for vault management
                </p>
            </motion.div>

            <VaultStats vaultInfo={vaultInfo} protocolInfo={protocolInfo} loading={loading} />

            {!walletAddress ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="gradient-border relative overflow-hidden rounded-2xl px-8 py-14 text-center"
                >
                    <div className="relative">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                            style={{ background: 'rgba(191,90,242,0.08)' }}>
                            <svg className="h-6 w-6" style={{ color: 'rgba(191,90,242,0.6)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7z" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-white">Connect as Owner</h3>
                        <p className="mt-1.5 text-sm text-gray-500">Connect the vault owner wallet</p>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={openConnectModal}
                            className="btn-neon mt-5 rounded-xl px-8 py-3 text-sm"
                        >
                            Connect Wallet
                        </motion.button>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                >
                    {/* Owner status banner */}
                    {!adminLoading && (
                        <div className="rounded-xl px-4 py-3" style={{
                            background: isOwner ? 'rgba(0,255,170,0.04)' : 'rgba(239,68,68,0.04)',
                            border: `1px solid ${isOwner ? 'rgba(0,255,170,0.1)' : 'rgba(239,68,68,0.1)'}`,
                        }}>
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4" style={{ color: isOwner ? '#00ffaa' : '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    {isOwner ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    )}
                                </svg>
                                <span className="text-[13px] font-medium" style={{ color: isOwner ? '#00ffaa' : '#ef4444' }}>
                                    {isOwner ? 'You are the vault owner' : 'You are not the vault owner — admin actions will revert'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Pause / Unpause */}
                        <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
                            <div className="relative">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                                        style={{ background: isPaused ? 'rgba(0,255,170,0.08)' : 'rgba(239,68,68,0.06)' }}>
                                        {isPaused ? (
                                            <svg className="h-5 w-5 text-[#00ffaa]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Vault Status</h3>
                                        <p className="text-[12px] text-gray-500">
                                            {adminLoading ? 'Loading...' : isPaused ? 'Vault is currently paused' : 'Vault is running normally'}
                                        </p>
                                    </div>
                                </div>

                                {adminLoading ? (
                                    <Skeleton className="mt-6 h-12 w-full rounded-xl" />
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.005 }}
                                        whileTap={{ scale: 0.995 }}
                                        onClick={handlePauseToggle}
                                        disabled={pauseTx.state.status === 'simulating' || pauseTx.state.status === 'pending'}
                                        className="mt-6 w-full rounded-xl py-3.5 text-sm font-bold transition-all duration-300 disabled:opacity-40"
                                        style={{
                                            background: isPaused
                                                ? 'linear-gradient(135deg, rgba(0,255,170,0.15), rgba(0,229,255,0.1))'
                                                : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))',
                                            border: `1px solid ${isPaused ? 'rgba(0,255,170,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                            color: isPaused ? '#00ffaa' : '#ef4444',
                                        }}
                                    >
                                        {pauseTx.state.status === 'simulating' || pauseTx.state.status === 'pending'
                                            ? 'Processing...'
                                            : isPaused ? 'Unpause Vault' : 'Pause Vault'}
                                    </motion.button>
                                )}

                                <TransactionStatus state={pauseTx.state} onReset={pauseTx.reset} />
                            </div>
                        </div>

                        {/* Set Minimum Deposit */}
                        <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
                            <div className="relative">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,229,255,0.08)' }}>
                                        <svg className="h-5 w-5 text-[#00e5ff]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Minimum Deposit</h3>
                                        <p className="text-[12px] text-gray-500">
                                            Current: {currentMinDeposit !== null ? formatTokenAmount(currentMinDeposit) : '...'} tokens
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={minDeposit}
                                        onChange={(e) => setMinDeposit(e.target.value)}
                                        placeholder="New minimum amount"
                                        className="input-neon w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-gray-700 outline-none"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.005 }}
                                    whileTap={{ scale: 0.995 }}
                                    onClick={handleSetMinDeposit}
                                    disabled={!parseTokenAmount(minDeposit) || minDepositTx.state.status === 'simulating' || minDepositTx.state.status === 'pending'}
                                    className="btn-ghost mt-4 w-full rounded-xl py-3.5 text-sm font-semibold"
                                >
                                    {minDepositTx.state.status === 'simulating' || minDepositTx.state.status === 'pending'
                                        ? 'Setting...'
                                        : 'Set Minimum Deposit'}
                                </motion.button>

                                <TransactionStatus state={minDepositTx.state} onReset={minDepositTx.reset} />
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Protocol Fee + Cooldown Blocks */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Set Protocol Fee */}
                        <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
                            <div className="relative">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(251,191,36,0.08)' }}>
                                        <svg className="h-5 w-5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Protocol Fee</h3>
                                        <p className="text-[12px] text-gray-500">
                                            Current: {protocolInfo ? `${Number(protocolInfo.feeBps) / 100}%` : '...'} (max 20%)
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={protocolFeeBps}
                                            onChange={(e) => setProtocolFeeBps(e.target.value)}
                                            placeholder="e.g. 500 = 5%"
                                            className="input-neon w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-gray-700 outline-none"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            BPS
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.005 }}
                                    whileTap={{ scale: 0.995 }}
                                    onClick={handleSetProtocolFee}
                                    disabled={!protocolFeeBps.trim() || setFeeTx.state.status === 'simulating' || setFeeTx.state.status === 'pending'}
                                    className="btn-ghost mt-4 w-full rounded-xl py-3.5 text-sm font-semibold"
                                >
                                    {setFeeTx.state.status === 'simulating' || setFeeTx.state.status === 'pending'
                                        ? 'Setting...'
                                        : 'Set Protocol Fee'}
                                </motion.button>

                                <TransactionStatus state={setFeeTx.state} onReset={setFeeTx.reset} />
                            </div>
                        </div>

                        {/* Set Cooldown Blocks */}
                        <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
                            <div className="relative">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(191,90,242,0.08)' }}>
                                        <svg className="h-5 w-5" style={{ color: 'rgba(191,90,242,0.7)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Cooldown Blocks</h3>
                                        <p className="text-[12px] text-gray-500">
                                            Current: {protocolInfo ? `${protocolInfo.cooldownBlocks.toString()} blocks` : '...'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={cooldownBlocksInput}
                                        onChange={(e) => setCooldownBlocksInput(e.target.value)}
                                        placeholder="Number of blocks"
                                        className="input-neon w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-gray-700 outline-none"
                                    />
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.005 }}
                                    whileTap={{ scale: 0.995 }}
                                    onClick={handleSetCooldown}
                                    disabled={!cooldownBlocksInput.trim() || setCooldownTx.state.status === 'simulating' || setCooldownTx.state.status === 'pending'}
                                    className="btn-ghost mt-4 w-full rounded-xl py-3.5 text-sm font-semibold"
                                >
                                    {setCooldownTx.state.status === 'simulating' || setCooldownTx.state.status === 'pending'
                                        ? 'Setting...'
                                        : 'Set Cooldown Blocks'}
                                </motion.button>

                                <TransactionStatus state={setCooldownTx.state} onReset={setCooldownTx.reset} />
                            </div>
                        </div>
                    </div>

                    {/* Set Fee Recipient */}
                    <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
                        <div className="relative">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,229,255,0.08)' }}>
                                    <svg className="h-5 w-5 text-[#00e5ff]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Fee Recipient</h3>
                                    <p className="text-[12px] text-gray-500">
                                        Current: {protocolInfo?.feeRecipient ? `${String(protocolInfo.feeRecipient).slice(0, 10)}...${String(protocolInfo.feeRecipient).slice(-8)}` : 'Not set'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <input
                                    type="text"
                                    value={feeRecipientInput}
                                    onChange={(e) => setFeeRecipientInput(e.target.value)}
                                    placeholder="Recipient address (0x...)"
                                    className="input-neon w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-gray-700 outline-none font-mono"
                                />
                                {feeRecipientInput.trim() && !isValidHexAddress(feeRecipientInput) && (
                                    <p className="mt-1.5 text-[11px] text-red-400">Must be 0x-prefixed, 64 hex chars</p>
                                )}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.005 }}
                                whileTap={{ scale: 0.995 }}
                                onClick={handleSetFeeRecipient}
                                disabled={!isValidHexAddress(feeRecipientInput) || setRecipientTx.state.status === 'simulating' || setRecipientTx.state.status === 'pending'}
                                className="btn-ghost mt-4 w-full rounded-xl py-3.5 text-sm font-semibold"
                            >
                                {setRecipientTx.state.status === 'simulating' || setRecipientTx.state.status === 'pending'
                                    ? 'Setting...'
                                    : 'Set Fee Recipient'}
                            </motion.button>

                            <TransactionStatus state={setRecipientTx.state} onReset={setRecipientTx.reset} />
                        </div>
                    </div>

                    {/* Set Deposit Token */}
                    <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
                        <div className="relative">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(251,191,36,0.08)' }}>
                                    <svg className="h-5 w-5 text-amber-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Set Deposit Token</h3>
                                    <p className="text-[12px] text-gray-500">Set which OP20 token the vault accepts</p>
                                </div>
                            </div>

                            {/* Warning: deposits exist */}
                            {hasActiveDeposits && (
                                <div className="mt-4 rounded-lg px-3 py-2" style={{
                                    background: 'rgba(251,191,36,0.06)',
                                    border: '1px solid rgba(251,191,36,0.15)',
                                }}>
                                    <p className="text-[11px] font-medium text-amber-400/80">
                                        Deposits exist ({formatTokenAmount(vaultInfo!.totalDeposited)} {activeTokenSymbol}). Changing the token will revert on-chain.
                                    </p>
                                </div>
                            )}

                            {/* Current vault token info */}
                            {selectedVault && (
                                <div className="mt-5 rounded-lg px-3 py-2" style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <p className="text-[11px] text-gray-500">
                                        Current vault: <span className="font-semibold text-white">{selectedVault.name}</span> ({selectedVault.symbol})
                                    </p>
                                </div>
                            )}

                            <div className="mt-3">
                                <input
                                    type="text"
                                    value={depositTokenInput}
                                    onChange={(e) => setDepositTokenInput(e.target.value)}
                                    placeholder="Or paste custom 0x address..."
                                    className="input-neon w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-gray-700 outline-none font-mono"
                                />
                                {depositTokenInput.trim() && !isValidHexAddress(depositTokenInput) && (
                                    <p className="mt-1.5 text-[11px] text-red-400">Must be 0x-prefixed, 64 hex chars</p>
                                )}
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.005 }}
                                whileTap={{ scale: 0.995 }}
                                onClick={handleSetDepositToken}
                                disabled={!isValidHexAddress(depositTokenInput) || setTokenTx.state.status === 'simulating' || setTokenTx.state.status === 'pending'}
                                className="btn-ghost mt-4 w-full rounded-xl py-3.5 text-sm font-semibold"
                            >
                                {setTokenTx.state.status === 'simulating' || setTokenTx.state.status === 'pending'
                                    ? 'Setting...'
                                    : 'Set Deposit Token'}
                            </motion.button>

                            <TransactionStatus state={setTokenTx.state} onReset={setTokenTx.reset} />
                        </div>
                    </div>

                    {/* Collect Fees - full width */}
                    <div className="gradient-border relative overflow-hidden rounded-2xl p-8">
                        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(191,90,242,0.05) 0%, transparent 70%)' }} />

                        <div className="relative">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(191,90,242,0.08)' }}>
                                    <svg className="h-5 w-5" style={{ color: 'rgba(191,90,242,0.7)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Collect Protocol Fees</h3>
                                    <p className="text-[12px] text-gray-500">Send revenue tokens to the vault for distribution (anyone can call)</p>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-4">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={feeAmount}
                                        onChange={(e) => setFeeAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="input-neon w-full rounded-xl px-5 py-4 text-lg font-semibold text-white placeholder-gray-700 outline-none"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                        {activeTokenSymbol}
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCollectFees}
                                    disabled={!parseTokenAmount(feeAmount) || collectFeesTx.state.status === 'simulating' || collectFeesTx.state.status === 'pending'}
                                    className="btn-neon whitespace-nowrap rounded-xl px-8 py-4 text-sm"
                                >
                                    {collectFeesTx.state.status === 'simulating' || collectFeesTx.state.status === 'pending'
                                        ? 'Sending...'
                                        : 'Collect Fees'}
                                </motion.button>
                            </div>

                            <TransactionStatus state={collectFeesTx.state} onReset={collectFeesTx.reset} />
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
