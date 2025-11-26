import { AuthChallengeResponse, createAuthRequestMessage, createEIP712AuthMessageSigner, createAuthVerifyMessage, RPCResponse, RPCMethod } from '@erc7824/nitrolite';
import { Client } from 'yellow-ts';

import { createPublicClient, createWalletClient, http } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { generateSessionKey, SessionKey } from './utils';

import { config } from 'dotenv'

config()

const AUTH_SCOPE = 'test.app';

const APP_NAME = 'Test app';

const SESSION_DURATION = 3600; // 1 hour

export const publicClient = createPublicClient({
    chain: base,
    transport: http(),
})

// get seed phrase from environment variable
const seedPhrase = process.env.SEED_PHRASE;
if (!seedPhrase) {
    throw new Error('SEED_PHRASE environment variable is not set');
}

// derive wallet account from seed phrase
const account = mnemonicToAccount(seedPhrase);

export const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(),
})
export async function authentitate(client: Client): Promise<SessionKey> {

    console.log(`Wallet address: ${account.address}`);

    const sessionKey = generateSessionKey();

    const sessionExpireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);

    // Create authentication message with session configuration
    const authMessage = await createAuthRequestMessage({
        address: account.address,
        session_key: sessionKey.address, // Using account address as session key
        app_name: APP_NAME,
        allowances: [], // Define RPC allowances as needed
        expire: sessionExpireTimestamp,
        scope: AUTH_SCOPE, // Chain scope
        application: account.address, // Application contract address
    });

    async function handleAuthChallenge(message: AuthChallengeResponse) {

        const authParams = {
            scope: AUTH_SCOPE,
            application: walletClient.account?.address as `0x${string}`,
            participant: sessionKey.address as `0x${string}`,
            expire: sessionExpireTimestamp,
            allowances: [],
        };

        const eip712Signer = createEIP712AuthMessageSigner(walletClient, authParams, { name: APP_NAME });

        const authVerifyMessage = await createAuthVerifyMessage(eip712Signer, message);

        await client.sendMessage(authVerifyMessage);

    }

    client.listen(async (message: RPCResponse) => {

        if (message.method === RPCMethod.AuthChallenge) {
            await handleAuthChallenge(message);
        }
    })

    await client.sendMessage(authMessage)

    return sessionKey;

}