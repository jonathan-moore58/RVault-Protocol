import { useState, useCallback } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import type { AbstractRpcProvider } from 'opnet';
import type { TransactionState } from '../types/vault';

const MAX_SAT_TO_SPEND = 1_000_000n; // 0.01 BTC safety cap
const CONFIRM_POLL_MS = 4_000;
const CONFIRM_TIMEOUT_MS = 900_000; // 15 min — blocks can take 10+ min
const AVG_BLOCK_TIME_SECS = 600; // Bitcoin ~10 min

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySimulation = { revert?: string; sendTransaction: (...args: any[]) => Promise<{ transactionId: string }> };

const REVERT_TAG = '[ON_CHAIN_REVERT]';

async function pollConfirmation(provider: AbstractRpcProvider, txId: string): Promise<void> {
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
    while (Date.now() < deadline) {
        try {
            const receipt = await provider.getTransactionReceipt(txId);
            // Receipt found — tx is in a block. Check for on-chain revert.
            if (receipt.failed) {
                throw new Error(`${REVERT_TAG} ${receipt.revert ?? 'Transaction reverted on-chain'}`);
            }
            return; // tx confirmed AND executed successfully
        } catch (err) {
            // If it's our own revert error, rethrow immediately
            if (err instanceof Error && err.message.startsWith(REVERT_TAG)) {
                throw new Error(err.message.slice(REVERT_TAG.length + 1));
            }
            // Not yet confirmed — wait and retry
            await new Promise((r) => setTimeout(r, CONFIRM_POLL_MS));
        }
    }
    throw new Error('Transaction confirmation timed out');
}

/** Normalize block timestamp — OPNet may return ms or seconds */
function toSecs(t: number | bigint): number {
    const n = typeof t === 'bigint' ? Number(t) : t;
    return n > 1e12 ? Math.floor(n / 1000) : n;
}

async function estimateBlockWait(provider: AbstractRpcProvider): Promise<number> {
    try {
        const blockNum = await provider.getBlockNumber();
        const [current, previous] = await Promise.all([
            provider.getBlock(blockNum),
            provider.getBlock(blockNum - 1n),
        ]);
        const curTime = toSecs(current.time);
        const prevTime = toSecs(previous.time);
        const actualGap = curTime - prevTime;
        const avgBlockTime = Math.max(30, Math.min(actualGap, AVG_BLOCK_TIME_SECS));
        const nowSecs = Math.floor(Date.now() / 1000);
        const elapsed = nowSecs - curTime;
        return Math.min(AVG_BLOCK_TIME_SECS, Math.max(10, avgBlockTime - elapsed));
    } catch {
        return AVG_BLOCK_TIME_SECS; // fallback
    }
}

interface ExecuteOptions {
    /** If provided, poll the provider until tx is confirmed on-chain */
    waitForConfirmation?: AbstractRpcProvider;
    /**
     * Skip simulation revert check and broadcast anyway.
     * Used when a prior tx (e.g. approve) is in the mempool but not yet confirmed —
     * the simulation sees old state and reverts, but on-chain both txs land in the
     * same block and execute in order. MotoSwap pattern.
     */
    ignoreRevert?: boolean;
}

export function useTransaction() {
    const { walletAddress, network } = useWalletConnect();
    const [state, setState] = useState<TransactionState>({ status: 'idle' });

    const execute = useCallback(
        async (
            simulateFn: () => Promise<AnySimulation>,
            options?: ExecuteOptions,
        ): Promise<string | null> => {
            if (!walletAddress || !network) {
                setState({ status: 'error', error: 'Wallet not connected' });
                return null;
            }

            setState({ status: 'simulating' });

            try {
                const simulation = await simulateFn();

                if (simulation.revert && !options?.ignoreRevert) {
                    setState({ status: 'error', error: simulation.revert });
                    return null;
                }

                setState({ status: 'pending' });

                const receipt = await simulation.sendTransaction({
                    signer: null,
                    mldsaSigner: null,
                    refundTo: walletAddress,
                    maximumAllowedSatToSpend: MAX_SAT_TO_SPEND,
                    network,
                });

                const txId = receipt.transactionId;

                if (options?.waitForConfirmation) {
                    const estimatedWaitSecs = await estimateBlockWait(options.waitForConfirmation);
                    setState({
                        status: 'confirming',
                        txId,
                        confirmStartedAt: Date.now(),
                        estimatedWaitSecs,
                    });
                    await pollConfirmation(options.waitForConfirmation, txId);
                }

                setState({ status: 'success', txId });
                return txId;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Transaction failed';
                setState({ status: 'error', error: message });
                return null;
            }
        },
        [walletAddress, network],
    );

    const reset = useCallback(() => {
        setState({ status: 'idle' });
    }, []);

    return { state, execute, reset };
}
