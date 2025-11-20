import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { type Address } from 'viem';

export interface SessionKey {
    privateKey: `0x${string}`;
    address: Address;
}

export const generateSessionKey = (): SessionKey => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { privateKey, address: account.address };
};
