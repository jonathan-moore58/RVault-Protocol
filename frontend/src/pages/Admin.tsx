import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { getContract, OP_20_ABI, type IOP20Contract } from 'opnet';
import { useVaultContract } from '../hooks/useVaultContract';
import { useVaultData } from '../hooks/useVaultData';
import { useTransaction } from '../hooks/useTransaction';
import { TransactionStatus } from '../components/common/TransactionStatus';
import { VaultStats } from '../components/vault/VaultStats';
import { Skeleton } from '../components/common/Skeleton';
import { parseTokenAmount, formatTokenAmount, isValidHexAddress } from '../utils/formatting';
import { Address } from '@btc-vision/transaction';
import { useVaultContext } from '../context/VaultContext';
import { providerService } from '../services/ProviderService';
import { getNetworkConfig, DEFAULT_NETWORK } from '../config/networks';
import { getFeeRouterAddress } from '../config/contracts';
import { FEE_ROUTER_ABI } from '../abi/FeeRouterABI';

const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

export function Admin() {
    const { walletAddress, address: userAddress, openConnectModal, provider, network } = useWalletConnect();
    const contracts = useVaultContract();
    const { vaultInfo, protocolInfo, activeTokenSymbol, loading, refetch } = useVaultData();
    const { selectedVault } = useVaultContext();
    const hasActiveDeposits = vaultInfo && vaultInfo.totalDeposited > 0n;
    const pauseTx = useTransaction();
    const minDepositTx = useTransaction();
    const approveFeesTx = useTransaction();
    const collectFeesTx = useTransaction();
    const setTokenTx = useTransaction();
    const setFeeTx = useTransaction();
    const setRecipientTx = useTransaction();
    const setCooldownTx = useTransaction();
    const addRewardTx = useTransaction();
    const approveDistTx = useTransaction();
    const distributeTx = useTransaction();

    // FeeRouter state
    const setRvtVaultTx = useTransaction();
    const setTeamWalletTx = useTransaction();
    const feeRouterDistTx = useTransaction();
    const [frRvtVaultInput, setFrRvtVaultInput] = useState('');
    const [frTeamWalletInput, setFrTeamWalletInput] = useState('');
    const [frDistTokenInput, setFrDistTokenInput] = useState('');

    const [isPaused, setIsPaused] = useState<boolean | null>(null);
    const [owner, setOwner] = useState<Address | null>(null);
    const [minDeposit, setMinDeposit] = useState<string>('');
    const [currentMinDeposit, setCurrentMinDeposit] = useState<bigint | null>(null);
    const [feeAmount, setFeeAmount] = useState('');
    const [feesStep, setFeesStep] = useState<'input' | 'approve' | 'send'>('input');
    const [depositTokenInput, setDepositTokenInput] = useState('');
    const [protocolFeeBps, setProtocolFeeBps] = useState('');
    const [feeRecipientInput, setFeeRecipientInput] = useState('');
    const [cooldownBlocksInput, setCooldownBlocksInput] = useState('');
    const [rewardTokenInput, setRewardTokenInput] = useState('');
    const [distTokenInput, setDistTokenInput] = useState('');
    const [distAmountInput, setDistAmountInput] = useState('');
    const [distStep, setDistStep] = useState<'input' | 'approve' | 'send'>('input');
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

    function getActiveProvider() {
        return provider ?? providerService.getProvider(
            network ?? getNetworkConfig(DEFAULT_NETWORK).network,
        );
    }

    async function handlePauseToggle() {
        if (!contracts) return;

        const txId = await pauseTx.execute(
            async () => {
                return isPaused
                    ? await contracts.vault.unpause()
                    : await contracts.vault.pause();
            },
            { waitForConfirmation: getActiveProvider() },
        );

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

        const txId = await minDepositTx.execute(
            async () => {
                return await contracts.vault.setMinimumDeposit(parsed);
            },
            { waitForConfirmation: getActiveProvider() },
        );

        if (txId) {
            setMinDeposit('');
            setTimeout(() => void fetchAdminData(), 2000);
        }
    }

    /**
     * Single-click collect fees: approve + collectFees back-to-back.
     * Both txs land in same block. Only collectFees waits for confirmation.
     */
    async function handleCollectFees() {
        if (!contracts || !userAddress) return;
        const parsed = parseTokenAmount(feeAmount);
        if (parsed <= 0n) return;

        const vaultAddr = await contracts.vault.contractAddress;

        // Always approve — RPC state can be stale on Bitcoin (10min blocks)
        setFeesStep('approve');
        const approveTxId = await approveFeesTx.execute(async () => {
            return await contracts.token.increaseAllowance(vaultAddr, parsed);
        });
        if (!approveTxId) return;

        setFeesStep('send');
        const txId = await collectFeesTx.execute(
            async () => {
                return await contracts.vault.collectFees(parsed);
            },
            {
                waitForConfirmation: getActiveProvider(),
                ignoreRevert: true,
            },
        );

        if (txId) {
            setFeeAmount('');
            setFeesStep('input');
            approveFeesTx.reset();
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleSetDepositToken() {
        if (!contracts || !isValidHexAddress(depositTokenInput)) return;

        const txId = await setTokenTx.execute(
            async () => {
                return await contracts.vault.setDepositToken(Address.fromString(depositTokenInput.trim()));
            },
            { waitForConfirmation: getActiveProvider() },
        );

        if (txId) {
            setDepositTokenInput('');
        }
    }

    async function handleSetProtocolFee() {
        if (!contracts || !protocolFeeBps.trim()) return;
        const bps = BigInt(Math.round(Number(protocolFeeBps)));
        if (bps < 0n || bps > 2000n) return;

        const txId = await setFeeTx.execute(
            async () => {
                return await contracts.vault.setProtocolFee(bps);
            },
            { waitForConfirmation: getActiveProvider() },
        );

        if (txId) {
            setProtocolFeeBps('');
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleSetFeeRecipient() {
        if (!contracts || !isValidHexAddress(feeRecipientInput)) return;

        const txId = await setRecipientTx.execute(
            async () => {
                return await contracts.vault.setProtocolFeeRecipient(
                    Address.fromString(feeRecipientInput.trim()),
                );
            },
            { waitForConfirmation: getActiveProvider() },
        );

        if (txId) {
            setFeeRecipientInput('');
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleSetCooldown() {
        if (!contracts || !cooldownBlocksInput.trim()) return;
        const blocks = BigInt(Math.round(Number(cooldownBlocksInput)));
        if (blocks < 0n) return;

        const txId = await setCooldownTx.execute(
            async () => {
                return await contracts.vault.setCooldownBlocks(blocks);
            },
            { waitForConfirmation: getActiveProvider() },
        );

        if (txId) {
            setCooldownBlocksInput('');
            setTimeout(() => void refetch(), 2000);
        }
    }

    async function handleAddRewardToken() {
        if (!contracts || !isValidHexAddress(rewardTokenInput)) return;

        const txId = await addRewardTx.execute(
            async () => {
                return await contracts.vault.addRewardToken(Address.fromString(rewardTokenInput.trim()));
            },
            { waitForConfirmation: getActiveProvider() },
        );

        if (txId) {
            setRewardTokenInput('');
            setTimeout(() => void refetch(), 2000);
        }
    }

    /**
     * Distribute reward: approve the vault to pull tokens, then call distributeReward.
     * Same back-to-back pattern as collectFees — MotoSwap style.
     */
    async function handleDistributeReward() {
        if (!contracts || !userAddress || !isValidHexAddress(distTokenInput)) return;
        const parsed = parseTokenAmount(distAmountInput);
        if (parsed <= 0n) return;

        const vaultAddr = await contracts.vault.contractAddress;

        // Create a temporary token contract for the reward token
        const fallbackNetwork = network ?? getNetworkConfig(DEFAULT_NETWORK).network;
        const activeProvider = provider ?? providerService.getProvider(fallbackNetwork);
        const rewardToken = getContract<IOP20Contract>(
            distTokenInput.trim(),
            OP_20_ABI,
            activeProvider,
            fallbackNetwork,
            userAddress,
        );

        // Always approve — RPC state can be stale on Bitcoin (10min blocks)
        setDistStep('approve');
        const approveTxId = await approveDistTx.execute(async () => {
            return await rewardToken.increaseAllowance(vaultAddr, parsed);
        });
        if (!approveTxId) return;

        setDistStep('send');
        const txId = await distributeTx.execute(
            async () => {
                return await contracts.vault.distributeReward(
                    Address.fromString(distTokenInput.trim()),
                    parsed,
                );
            },
            {
                waitForConfirmation: getActiveProvider(),
                ignoreRevert: true,
            },
        );

        if (txId) {
            setDistAmountInput('');
            setDistStep('input');
            approveDistTx.reset();
            setTimeout(() => void refetch(), 2000);
        }
    }

    // --- FeeRouter helpers ---
    const activeNetwork = network ?? getNetworkConfig(DEFAULT_NETWORK).network;
    const feeRouterAddr = getFeeRouterAddress(activeNetwork);

    function getFeeRouterContract() {
        if (!feeRouterAddr) return null;
        const fallbackNetwork = network ?? getNetworkConfig(DEFAULT_NETWORK).network;
        const activeProvider = provider ?? providerService.getProvider(fallbackNetwork);
        return getContract(feeRouterAddr, FEE_ROUTER_ABI, activeProvider, fallbackNetwork);
    }

    async function handleSetRvtVault() {
        const router = getFeeRouterContract();
        if (!router || !isValidHexAddress(frRvtVaultInput)) return;
        const txId = await setRvtVaultTx.execute(
            async () => (router as any).setRvtVault(Address.fromString(frRvtVaultInput.trim())),
            { waitForConfirmation: getActiveProvider() },
        );
        if (txId) setFrRvtVaultInput('');
    }

    async function handleSetTeamWallet() {
        const router = getFeeRouterContract();
        if (!router || !isValidHexAddress(frTeamWalletInput)) return;
        const txId = await setTeamWalletTx.execute(
            async () => (router as any).setTeamWallet(Address.fromString(frTeamWalletInput.trim())),
            { waitForConfirmation: getActiveProvider() },
        );
        if (txId) setFrTeamWalletInput('');
    }

    async function handleFeeRouterDistribute() {
        const router = getFeeRouterContract();
        if (!router || !isValidHexAddress(frDistTokenInput)) return;
        await feeRouterDistTx.execute(
            async () => (router as any).distribute(Address.fromString(frDistTokenInput.trim())),
            { waitForConfirmation: getActiveProvider() },
        );
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
                    Admin
                </h1>
                <p className="mt-2 text-[14px] text-gray-500">
                    Vault owner actions — pause, fees, cooldown, token config
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
                                        onChange={(e) => { setFeeAmount(e.target.value); setFeesStep('input'); approveFeesTx.reset(); collectFeesTx.reset(); }}
                                        placeholder="0.00"
                                        disabled={feesStep !== 'input'}
                                        className="input-neon w-full rounded-xl px-5 py-4 text-lg font-semibold text-white placeholder-gray-700 outline-none disabled:opacity-40"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                        {activeTokenSymbol}
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCollectFees}
                                    disabled={!parseTokenAmount(feeAmount) ||
                                        approveFeesTx.state.status === 'simulating' || approveFeesTx.state.status === 'pending' ||
                                        collectFeesTx.state.status === 'simulating' || collectFeesTx.state.status === 'pending' ||
                                        collectFeesTx.state.status === 'confirming'}
                                    className="btn-neon whitespace-nowrap rounded-xl px-8 py-4 text-sm"
                                >
                                    {collectFeesTx.state.status === 'confirming'
                                        ? 'Confirming...'
                                        : collectFeesTx.state.status === 'simulating' || collectFeesTx.state.status === 'pending'
                                          ? 'Sending...'
                                          : approveFeesTx.state.status === 'simulating' || approveFeesTx.state.status === 'pending'
                                            ? 'Approving...'
                                            : 'Collect Fees'}
                                </motion.button>
                            </div>

                            {approveFeesTx.state.status !== 'idle' && feesStep === 'approve' && (
                                <TransactionStatus state={approveFeesTx.state} onReset={approveFeesTx.reset} />
                            )}
                            <TransactionStatus state={collectFeesTx.state} onReset={collectFeesTx.reset} />
                        </div>
                    </div>

                    {/* ─── External Reward Management ─── */}
                    <div className="mt-2 rounded-xl px-4 py-2.5" style={{
                        background: 'rgba(191,90,242,0.03)',
                        border: '1px solid rgba(191,90,242,0.08)',
                    }}>
                        <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(191,90,242,0.6)' }}>
                            External Reward System
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Add Reward Token */}
                        <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
                            <div className="relative">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(191,90,242,0.08)' }}>
                                        <svg className="h-5 w-5" style={{ color: 'rgba(191,90,242,0.7)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Add Reward Token</h3>
                                        <p className="text-[12px] text-gray-500">Register an external reward token (max 2)</p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <input
                                        type="text"
                                        value={rewardTokenInput}
                                        onChange={(e) => setRewardTokenInput(e.target.value)}
                                        placeholder="Token address (0x...)"
                                        className="input-neon w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-gray-700 outline-none font-mono"
                                    />
                                    {rewardTokenInput.trim() && !isValidHexAddress(rewardTokenInput) && (
                                        <p className="mt-1.5 text-[11px] text-red-400">Must be 0x-prefixed, 64 hex chars</p>
                                    )}
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.005 }}
                                    whileTap={{ scale: 0.995 }}
                                    onClick={handleAddRewardToken}
                                    disabled={!isValidHexAddress(rewardTokenInput) || addRewardTx.state.status === 'simulating' || addRewardTx.state.status === 'pending'}
                                    className="btn-ghost mt-4 w-full rounded-xl py-3.5 text-sm font-semibold"
                                >
                                    {addRewardTx.state.status === 'simulating' || addRewardTx.state.status === 'pending'
                                        ? 'Adding...'
                                        : 'Add Reward Token'}
                                </motion.button>

                                <TransactionStatus state={addRewardTx.state} onReset={addRewardTx.reset} />
                            </div>
                        </div>

                        {/* Distribute Reward */}
                        <div className="gradient-border relative overflow-hidden rounded-2xl p-6">
                            <div className="relative">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,255,170,0.08)' }}>
                                        <svg className="h-5 w-5 text-[#00ffaa]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Distribute Reward</h3>
                                        <p className="text-[12px] text-gray-500">Send reward tokens for distribution to stakers</p>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3">
                                    <input
                                        type="text"
                                        value={distTokenInput}
                                        onChange={(e) => { setDistTokenInput(e.target.value); setDistStep('input'); approveDistTx.reset(); distributeTx.reset(); }}
                                        placeholder="Reward token address (0x...)"
                                        disabled={distStep !== 'input'}
                                        className="input-neon w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-gray-700 outline-none font-mono disabled:opacity-40"
                                    />
                                    {distTokenInput.trim() && !isValidHexAddress(distTokenInput) && (
                                        <p className="text-[11px] text-red-400">Must be 0x-prefixed, 64 hex chars</p>
                                    )}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={distAmountInput}
                                            onChange={(e) => { setDistAmountInput(e.target.value); setDistStep('input'); approveDistTx.reset(); distributeTx.reset(); }}
                                            placeholder="Amount to distribute"
                                            disabled={distStep !== 'input'}
                                            className="input-neon w-full rounded-xl px-4 py-3.5 text-sm font-medium text-white placeholder-gray-700 outline-none disabled:opacity-40"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                            TOKENS
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.005 }}
                                    whileTap={{ scale: 0.995 }}
                                    onClick={handleDistributeReward}
                                    disabled={!isValidHexAddress(distTokenInput) || !parseTokenAmount(distAmountInput) ||
                                        approveDistTx.state.status === 'simulating' || approveDistTx.state.status === 'pending' ||
                                        distributeTx.state.status === 'simulating' || distributeTx.state.status === 'pending' ||
                                        distributeTx.state.status === 'confirming'}
                                    className="btn-ghost mt-4 w-full rounded-xl py-3.5 text-sm font-semibold"
                                >
                                    {distributeTx.state.status === 'confirming'
                                        ? 'Confirming...'
                                        : distributeTx.state.status === 'simulating' || distributeTx.state.status === 'pending'
                                          ? 'Distributing...'
                                          : approveDistTx.state.status === 'simulating' || approveDistTx.state.status === 'pending'
                                            ? 'Approving...'
                                            : 'Distribute Reward'}
                                </motion.button>

                                {approveDistTx.state.status !== 'idle' && distStep === 'approve' && (
                                    <TransactionStatus state={approveDistTx.state} onReset={approveDistTx.reset} />
                                )}
                                <TransactionStatus state={distributeTx.state} onReset={distributeTx.reset} />
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── FeeRouter (Trustless Fee Distribution) ── */}
            {feeRouterAddr && isOwner && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="h-px flex-1 bg-gray-800" />
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Fee Router</span>
                        <div className="h-px flex-1 bg-gray-800" />
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Set RVT Vault */}
                        <div className="card-glass rounded-2xl p-6">
                            <h3 className="mb-1 text-sm font-bold text-gray-300">Set RVT Vault</h3>
                            <p className="mb-4 text-[11px] text-gray-600">Target vault for 90% of fees</p>
                            <input
                                type="text"
                                value={frRvtVaultInput}
                                onChange={(e) => setFrRvtVaultInput(e.target.value)}
                                placeholder="RVT vault address (0x...)"
                                className="input-neon w-full rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-700 outline-none font-mono"
                            />
                            <motion.button
                                whileHover={{ scale: 1.005 }}
                                whileTap={{ scale: 0.995 }}
                                onClick={handleSetRvtVault}
                                disabled={!isValidHexAddress(frRvtVaultInput) || setRvtVaultTx.state.status !== 'idle'}
                                className="btn-ghost mt-3 w-full rounded-xl py-3 text-sm font-semibold"
                            >
                                Set RVT Vault
                            </motion.button>
                            <TransactionStatus state={setRvtVaultTx.state} onReset={setRvtVaultTx.reset} />
                        </div>

                        {/* Set Team Wallet */}
                        <div className="card-glass rounded-2xl p-6">
                            <h3 className="mb-1 text-sm font-bold text-gray-300">Set Team Wallet</h3>
                            <p className="mb-4 text-[11px] text-gray-600">Receives 10% team cut</p>
                            <input
                                type="text"
                                value={frTeamWalletInput}
                                onChange={(e) => setFrTeamWalletInput(e.target.value)}
                                placeholder="Team wallet address (0x...)"
                                className="input-neon w-full rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-700 outline-none font-mono"
                            />
                            <motion.button
                                whileHover={{ scale: 1.005 }}
                                whileTap={{ scale: 0.995 }}
                                onClick={handleSetTeamWallet}
                                disabled={!isValidHexAddress(frTeamWalletInput) || setTeamWalletTx.state.status !== 'idle'}
                                className="btn-ghost mt-3 w-full rounded-xl py-3 text-sm font-semibold"
                            >
                                Set Team Wallet
                            </motion.button>
                            <TransactionStatus state={setTeamWalletTx.state} onReset={setTeamWalletTx.reset} />
                        </div>

                        {/* Distribute via Router */}
                        <div className="card-glass rounded-2xl p-6">
                            <h3 className="mb-1 text-sm font-bold text-gray-300">Distribute</h3>
                            <p className="mb-4 text-[11px] text-gray-600">Push router balance → 90% RVT vault, 10% team</p>
                            <input
                                type="text"
                                value={frDistTokenInput}
                                onChange={(e) => setFrDistTokenInput(e.target.value)}
                                placeholder="Token address (0x...)"
                                className="input-neon w-full rounded-xl px-4 py-3 text-sm font-medium text-white placeholder-gray-700 outline-none font-mono"
                            />
                            <motion.button
                                whileHover={{ scale: 1.005 }}
                                whileTap={{ scale: 0.995 }}
                                onClick={handleFeeRouterDistribute}
                                disabled={!isValidHexAddress(frDistTokenInput) || feeRouterDistTx.state.status !== 'idle'}
                                className="btn-ghost mt-3 w-full rounded-xl py-3 text-sm font-semibold"
                            >
                                Distribute Token
                            </motion.button>
                            <TransactionStatus state={feeRouterDistTx.state} onReset={feeRouterDistTx.reset} />
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}
