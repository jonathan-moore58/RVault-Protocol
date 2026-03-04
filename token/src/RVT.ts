import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    OP20,
    OP20InitParameters,
    Blockchain,
    Calldata,
    BytesWriter,
    ABIDataTypes,
    Revert,
} from '@btc-vision/btc-runtime/runtime';

// RVT — RVault Token
// Standard OP20 with owner-gated minting.
// Max supply: 100 million (18 decimals).
// Deployer receives full initial supply on deployment.

const MAX_SUPPLY: u256 = u256.fromString('100000000000000000000000000'); // 100M * 1e18

@final
export class RVT extends OP20 {
    public constructor() {
        super();
    }

    public override onDeployment(_calldata: Calldata): void {
        this.instantiate(
            new OP20InitParameters(
                MAX_SUPPLY,
                18,
                'RVault Token',
                'RVT',
                '',
            ),
        );

        // Mint full supply to deployer
        this._mint(Blockchain.tx.origin, MAX_SUPPLY);
    }

    // Owner-only mint (respects maxSupply ceiling enforced by OP20 _mint)
    @method(
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    @emit('Minted')
    public mint(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const to = calldata.readAddress();
        const amount = calldata.readU256();

        this._mint(to, amount);

        return new BytesWriter(0);
    }
}
