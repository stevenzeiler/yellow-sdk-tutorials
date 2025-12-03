import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { type Address } from 'viem';
import { base } from 'viem/chains';
import { ContractAddresses } from '@erc7824/nitrolite';

export interface SessionKey {
    privateKey: `0x${string}`;
    address: Address;
}

export const generateSessionKey = (): SessionKey => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { privateKey, address: account.address };
};

export function getContractAddresses(chainId: number): ContractAddresses {
    if (chainId === base.id) {
        return {
            custody: '0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6',
            adjudicator: '0x7de4A0736Cf5740fD3Ca2F2e9cc85c9AC223eF0C',
        }
    }
    throw new Error(`Unsupported chain ID: ${chainId}`);
}
