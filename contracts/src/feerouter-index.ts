import { Blockchain } from '@btc-vision/btc-runtime/runtime';
import { FeeRouter } from './FeeRouter';
import { revertOnError } from '@btc-vision/btc-runtime/runtime/abort/abort';

Blockchain.contract = (): FeeRouter => {
    return new FeeRouter();
};

export * from '@btc-vision/btc-runtime/runtime/exports';

// @ts-ignore: Decorator valid at runtime
@global
export function abort(message: string, fileName: string, line: u32, column: u32): void {
    revertOnError(message, fileName, line, column);
}
