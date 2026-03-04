import { getContract, IOP20Contract, OP_20_ABI } from 'opnet';
import { Network } from '@btc-vision/bitcoin';
import { providerService } from './ProviderService';
import { VAULT_ABI } from '../abi/VaultABI';
import type { IVaultContract } from '../types/vault';

type AnyContract = ReturnType<typeof getContract>;

class ContractService {
    private static instance: ContractService;
    private readonly contracts: Map<string, AnyContract> = new Map();

    private constructor() {}

    public static getInstance(): ContractService {
        if (!ContractService.instance) {
            ContractService.instance = new ContractService();
        }
        return ContractService.instance;
    }

    public getVaultContract(
        address: string,
        network: Network,
    ): ReturnType<typeof getContract<IVaultContract>> {
        const key = `vault:${this.networkKey(network)}:${address}`;

        if (!this.contracts.has(key)) {
            const provider = providerService.getProvider(network);
            const contract = getContract<IVaultContract>(address, VAULT_ABI, provider, network);
            this.contracts.set(key, contract as AnyContract);
        }

        return this.contracts.get(key) as ReturnType<typeof getContract<IVaultContract>>;
    }

    public getTokenContract(address: string, network: Network): IOP20Contract {
        const key = `token:${this.networkKey(network)}:${address}`;

        if (!this.contracts.has(key)) {
            const provider = providerService.getProvider(network);
            const contract = getContract<IOP20Contract>(address, OP_20_ABI, provider, network);
            this.contracts.set(key, contract as AnyContract);
        }

        return this.contracts.get(key) as unknown as IOP20Contract;
    }

    public clearCache(): void {
        this.contracts.clear();
    }

    private networkKey(network: Network): string {
        return `${network.bech32}`;
    }
}

export const contractService = ContractService.getInstance();
