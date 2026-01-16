import { mnemonicToAccount } from 'viem/accounts';
import { toHex } from 'viem';

function mnemonicToPrivateKey(mnemonic: string, addressIndex: number = 0): `0x${string}` {
    const account = mnemonicToAccount(mnemonic, { addressIndex });
    const hdKey = account.getHdKey();
    
    if (!hdKey.privateKey) {
        throw new Error('Failed to derive private key from mnemonic');
    }
    
    return toHex(hdKey.privateKey);
}

// Get mnemonic from command line args or environment variable
const mnemonic = process.argv[2] || process.env.SEED_PHRASE;

if (!mnemonic) {
    console.error('Usage: npx tsx mnemonic_to_private_key.ts "<mnemonic phrase>"');
    console.error('Or set SEED_PHRASE environment variable');
    process.exit(1);
}

const privateKey = mnemonicToPrivateKey(mnemonic);
console.log(privateKey);

