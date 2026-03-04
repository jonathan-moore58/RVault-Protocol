/**
 * Address integration test runner — zero external deps.
 * Run with: node run-tests.mjs
 */
import { readFileSync } from 'fs';

let passed = 0;
let failed = 0;

function assert(condition, name) {
    if (condition) {
        console.log(`  \x1b[32mPASS\x1b[0m  ${name}`);
        passed++;
    } else {
        console.log(`  \x1b[31mFAIL\x1b[0m  ${name}`);
        failed++;
    }
}

function isValidHexAddress(value) {
    return /^0x[0-9a-fA-F]{64}$/.test(value.trim());
}

// ─── ABI ADDRESS field verification ───
console.log('\n\x1b[1m=== VaultABI ADDRESS Field Types ===\x1b[0m\n');

const abi = readFileSync('src/abi/VaultABI.ts', 'utf8');

// Parse all fields that use ABIDataTypes.ADDRESS
// Split ABI into method blocks by matching top-level entries between balanced braces
const addressFields = [];
const methodRegex = /\{\s*name:\s*'(\w+)'[\s\S]*?\n\s{4}\}/g;
let methodMatch;
while ((methodMatch = methodRegex.exec(abi)) !== null) {
    const methodName = methodMatch[1];
    const block = methodMatch[0];
    // Find ADDRESS fields within inputs/outputs (not the method name line)
    const fieldMatches = [...block.matchAll(/\{\s*name:\s*'(\w+)',\s*type:\s*ABIDataTypes\.ADDRESS\s*\}/g)];
    for (const fm of fieldMatches) {
        addressFields.push({ method: methodName, field: fm[1] });
    }
}

assert(addressFields.some(f => f.method === 'getUserInfo' && f.field === 'user'),
    'getUserInfo input "user" is ABIDataTypes.ADDRESS');

assert(addressFields.some(f => f.method === 'getOwner' && f.field === 'owner'),
    'getOwner output "owner" is ABIDataTypes.ADDRESS');

assert(addressFields.some(f => f.method === 'setProtocolFeeRecipient' && f.field === 'recipient'),
    'setProtocolFeeRecipient input "recipient" is ABIDataTypes.ADDRESS');

assert(addressFields.some(f => f.method === 'setDepositToken' && f.field === 'token'),
    'setDepositToken input "token" is ABIDataTypes.ADDRESS');

assert(addressFields.some(f => f.method === 'getProtocolInfo' && f.field === 'feeRecipient'),
    'getProtocolInfo output "feeRecipient" is ABIDataTypes.ADDRESS');

assert(addressFields.length === 5,
    `All 5 ABI ADDRESS fields accounted for (found: ${addressFields.length})`);

// ─── TypeScript interface verification ───
console.log('\n\x1b[1m=== TypeScript Interface Types ===\x1b[0m\n');

const types = readFileSync('src/types/vault.ts', 'utf8');

assert(types.includes('getUserInfo(user: Address)'),
    'IVaultContract.getUserInfo param typed as Address');

assert(types.includes('getOwner(): Promise<CallResult<{ owner: Address }>>'),
    'IVaultContract.getOwner return typed as Address');

assert(types.includes('setProtocolFeeRecipient(recipient: Address)'),
    'IVaultContract.setProtocolFeeRecipient param typed as Address');

assert(types.includes('setDepositToken(token: Address)'),
    'IVaultContract.setDepositToken param typed as Address');

assert(types.includes('feeRecipient: Address'),
    'ProtocolInfo.feeRecipient typed as Address');

// ─── useVaultContract sender param ───
console.log('\n\x1b[1m=== useVaultContract Sender Param ===\x1b[0m\n');

const hook = readFileSync('src/hooks/useVaultContract.ts', 'utf8');

assert(hook.includes('address: senderAddress'),
    'Destructures address as senderAddress from useWalletConnect');

assert((hook.match(/senderAddress \?\? undefined/g) || []).length === 2,
    'Passes senderAddress to both vault and token getContract calls');

assert(hook.includes('senderAddress]'),
    'senderAddress included in useMemo deps');

// ─── useVaultData Address usage ───
console.log('\n\x1b[1m=== useVaultData Address Handling ===\x1b[0m\n');

const vaultData = readFileSync('src/hooks/useVaultData.ts', 'utf8');

assert(vaultData.includes('address: userAddress'),
    'Destructures address as userAddress from useWalletConnect');

assert(vaultData.includes('getUserInfo(userAddress)'),
    'Passes Address object to getUserInfo (not walletAddress string)');

assert(vaultData.includes('balanceOf(userAddress)'),
    'Passes Address object to balanceOf (not walletAddress string)');

assert(vaultData.includes('feeRecipient: pi.feeRecipient as Address'),
    'Casts feeRecipient as Address type');

// ─── Admin hex validation ───
console.log('\n\x1b[1m=== Admin Hex Input Validation ===\x1b[0m\n');

const admin = readFileSync('src/pages/Admin.tsx', 'utf8');

assert(admin.includes('isValidHexAddress(depositTokenInput)'),
    'Deposit token input validated with isValidHexAddress');

assert(admin.includes('isValidHexAddress(feeRecipientInput)'),
    'Fee recipient input validated with isValidHexAddress');

assert(admin.includes('Must be 0x-prefixed, 64 hex chars'),
    'Inline validation error message present');

// ─── isValidHexAddress unit tests ───
console.log('\n\x1b[1m=== isValidHexAddress Validator ===\x1b[0m\n');

assert(isValidHexAddress('0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd') === true,
    'Accepts valid 0x + 64 hex chars');

assert(isValidHexAddress('opt1sqq4lejala9a0qrh7p4s9wcrj7m6mjmx6nyzn395t') === false,
    'Rejects bech32 OPNet addresses');

assert(isValidHexAddress('bc1p7example') === false,
    'Rejects bc1p Bitcoin addresses');

assert(isValidHexAddress('fd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd') === false,
    'Rejects missing 0x prefix');

assert(isValidHexAddress('0xabcdef') === false,
    'Rejects wrong length');

assert(isValidHexAddress('') === false,
    'Rejects empty string');

assert(isValidHexAddress('  0xfd4473840751d58d9f8b73bdd57d6c5260453d5518bd7cd02d0a4cf3df9bf4dd  ') === true,
    'Handles whitespace-padded input');

// ─── Package version pinning ───
console.log('\n\x1b[1m=== Package Version Pinning ===\x1b[0m\n');

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

assert(/^\d+\.\d+\.\d+/.test(pkg.dependencies['opnet']),
    `opnet pinned: ${pkg.dependencies['opnet']}`);

assert(/^\d+\.\d+\.\d+/.test(pkg.dependencies['@btc-vision/transaction']),
    `@btc-vision/transaction pinned: ${pkg.dependencies['@btc-vision/transaction']}`);

assert(/^\d+\.\d+\.\d+/.test(pkg.dependencies['@btc-vision/bitcoin']),
    `@btc-vision/bitcoin pinned: ${pkg.dependencies['@btc-vision/bitcoin']}`);

assert(/^\d+\.\d+\.\d+/.test(pkg.dependencies['@btc-vision/walletconnect']),
    `@btc-vision/walletconnect pinned: ${pkg.dependencies['@btc-vision/walletconnect']}`);

// ─── Summary ───
console.log(`\n\x1b[1m═════════════════════════════════\x1b[0m`);
console.log(`  \x1b[32m${passed} passed\x1b[0m, \x1b[${failed ? '31' : '90'}m${failed} failed\x1b[0m  (${passed + failed} total)`);
console.log(`\x1b[1m═════════════════════════════════\x1b[0m\n`);

process.exit(failed > 0 ? 1 : 0);
