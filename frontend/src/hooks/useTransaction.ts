import { useState, useCallback } from 'react';
import { useWalletConnect } from '@btc-vision/walletconnect';
import type { AbstractRpcProvider } from 'opnet';
import type { TransactionState } from '../types/vault';

const MAX_SAT_TO_SPEND = 1_000_000n; // 0.01 BTC safety cap
const CONFIRM_POLL_MS = 3_000;
const CONFIRM_TIMEOUT_MS = 120_000; // 2 min max wait
const AVG_BLOCK_TIME_SECS = 600; // Bitcoin ~10 min

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySimulation = { revert?: string; sendTransaction: (...args: any[]) => Promise<{ transactionId: string }> };

async function pollConfirmation(provider: AbstractRpcProvider, txId: string): Promise<void> {
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
    while (Date.now() < deadline) {
        try {
            await provider.getTransaction(txId);
            return; // tx found in a block
        } catch {
            // not yet confirmed — wait and retry
            await new Promise((r) => setTimeout(r, CONFIRM_POLL_MS));
        }
    }
    throw new Error('Transaction confirmation timed out');
}

async function estimateBlockWait(provider: AbstractRpcProvider): Promise<number> {
    try {
        const blockNum = await provider.getBlockNumber();
        const [current, previous] = await Promise.all([
            provider.getBlock(blockNum),
            provider.getBlock(blockNum - 1n),
        ]);
        // Use actual gap between last 2 blocks as estimate, capped to reasonable range
        const actualGap = current.time - previous.time;
        const avgBlockTime = Math.max(30, Math.min(actualGap, AVG_BLOCK_TIME_SECS));
        const elapsed = Math.floor(Date.now() / 1000) - current.time;
        return Math.max(10, avgBlockTime - elapsed);
    } catch {
        return AVG_BLOCK_TIME_SECS; // fallback
    }
}

interface ExecuteOptions {
    /** If provided, poll the provider until tx is confirmed on-chain */
    waitForConfirmation?: AbstractRpcProvider;
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

                if (simulation.revert) {
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
