import { JSONRpcProvider } from 'opnet';
import { Network, networks } from '@btc-vision/bitcoin';

class ProviderService {
    private static instance: ProviderService;
    private readonly providers: Map<string, JSONRpcProvider> = new Map();

    private constructor() {}

    public static getInstance(): ProviderService {
        if (!ProviderService.instance) {
            ProviderService.instance = new ProviderService();
        }
        return ProviderService.instance;
    }

    public getProvider(network: Network): JSONRpcProvider {
        const key = this.networkKey(network);

        if (!this.providers.has(key)) {
            const url = this.getRpcUrl(network);
            const provider = new JSONRpcProvider({ url, network });
            this.providers.set(key, provider);
        }

        return this.providers.get(key)!;
    }

    public clearAll(): void {
        this.providers.clear();
    }

    private getRpcUrl(network: Network): string {
        if (network === networks.bitcoin) return 'https://mainnet.opnet.org';
        if (network === networks.opnetTestnet) return 'https://testnet.opnet.org';
        return 'http://localhost:9001';
    }

    private networkKey(network: Network): string {
        if (network === networks.bitcoin) return 'mainnet';
        if (network === networks.opnetTestnet) return 'testnet';
        return 'regtest';
    }
}

export const providerService = ProviderService.getInstance();
