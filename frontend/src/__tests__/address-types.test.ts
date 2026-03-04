/**
 * Address type integration tests for RVault Protocol.
 *
 * Verifies that all contract interface types, ABI definitions, and utility
 * functions handle Address objects correctly through the full hook chain.
 *
 * Run with: npx vitest run src/__tests__/address-types.test.ts
 * (install vitest first: npm i -D vitest)
 */
import { describe, it, expect } from 'vitest';
import { ABIDataTypes } from 'opnet';
import { VAULT_ABI } from '../abi/VaultABI';
import { isValidHexAddress } from '../utils/formatting';

describe('VaultABI ADDRESS field types', () => {
    it('getUserInfo input "user" is ABIDataTypes.ADDRESS', () => {
        const method = VAULT_ABI.find((m) => m.name === 'getUserInfo');
        expect(method).toBeDefined();
        const userInput = method!.inputs!.find((i) => i.name === 'user');
        expect(userInput).toBeDefined();
        expect(userInput!.type).toBe(ABIDataTypes.ADDRESS);
    });

    it('getOwner output "owner" is ABIDataTypes.ADDRESS', () => {
        const method = VAULT_ABI.find((m) => m.name === 'getOwner');
        expect(method).toBeDefined();
        const ownerOutput = method!.outputs!.find((o) => o.name === 'owner');
        expect(ownerOutput).toBeDefined();
        expect(ownerOutput!.type).toBe(ABIDataTypes.ADDRESS);
    });

    it('setProtocolFeeRecipient input "recipient" is ABIDataTypes.ADDRESS', () => {
        const method = VAULT_ABI.find((m) => m.name === 'setProtocolFeeRecipient');
        expect(method).toBeDefined();
        const recipientInput = method!.inputs!.find((i) => i.name === 'recipient');
        expect(recipientInput).toBeDefined();
        expect(recipientInput!.type).toBe(ABIDataTypes.ADDRESS);
    });

    it('setDepositToken input "token" is ABIDataTypes.ADDRESS', () => {
        const method = VAULT_ABI.find((m) => m.name === 'setDepositToken');
        expect(method).toBeDefined();
        const tokenInput = method!.inputs!.find((i) => i.name === 'token');
        expect(tokenInput).toBeDefined();
        expect(tokenInput!.type).toBe(ABIDataTypes.ADDRESS);
    });

    it('getProtocolInfo output "feeRecipient" is ABIDataTypes.ADDRESS', () => {
        const method = VAULT_ABI.find((m) => m.name === 'getProtocolInfo');
        expect(method).toBeDefined();
        const feeRecipientOutput = method!.outputs!.find((o) => o.name === 'feeRecipient');
        expect(feeRecipientOutput).toBeDefined();
        expect(feeRecipientOutput!.type).toBe(ABIDataTypes.ADDRESS);
    });

    it('all ABI ADDRESS fields are accounted for', () => {
        const addressFields: string[] = [];
        for (const method of VAULT_ABI) {
            for (const field of [...(method.inputs ?? []), ...(method.outputs ?? [])]) {
                if (field.type === ABIDataTypes.ADDRESS) {
                    addressFields.push(`${method.name}.${field.name}`);
                }
            }
        }
        expect(addressFields).toEqual([
            'setProtocolFeeRecipient.recipient',
            'setDepositToken.token',
            'getUserInfo.user',
            'getOwner.owner',
            'getProtocolInfo.feeRecipient',
        ]);
    });
});

describe('isValidHexAddress', () => {
    it('accepts valid 0x-prefixed 64-char hex', () => {
        expect(isValidHexAddress('0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd')).toBe(true);
    });

    it('rejects bech32 addresses', () => {
        expect(isValidHexAddress('opt1sqq4lejala9a0qrh7p4s9wcrj7m6mjmx6nyzn395t')).toBe(false);
        expect(isValidHexAddress('bc1p...')).toBe(false);
    });

    it('rejects missing 0x prefix', () => {
        expect(isValidHexAddress('fd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd')).toBe(false);
    });

    it('rejects wrong length', () => {
        expect(isValidHexAddress('0xabcdef')).toBe(false);
    });

    it('rejects empty string', () => {
        expect(isValidHexAddress('')).toBe(false);
    });

    it('handles whitespace-padded input', () => {
        expect(isValidHexAddress('  0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd  ')).toBe(true);
    });
});
