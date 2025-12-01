// https://erc7824.org/quick_start/initializing_channel
import { NitroliteClient, createAuthRequestMessage, createECDSAMessageSigner, createGetLedgerBalancesMessage, parseAnyRPCResponse, RPCMethod, createEIP712AuthMessageSigner, createAuthVerifyMessage } from '@erc7824/nitrolite';
import { generateSessionKey } from './lib/utils';

import { createPublicClient, createWalletClient, http } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import { Client } from 'yellow-ts'


const AUTH_SCOPE = 'test.app';

const APP_NAME = 'Test app';

const SESSION_DURATION = 3600; // 1 hour


export async function main() {

    config()

    const publicClient = createPublicClient({
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
    console.log(`Wallet address: ${account.address}`);

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(),
    })
    const sessionKey = generateSessionKey();

    // Think of this like a temporary stamp that proves we're allowed to make requests
    const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

    const yellow = new Client()

    await yellow.connect()

    console.log(`Yellow connected`);

    console.log(`Session signer`, sessionSigner);

    const sessionExpireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);

    // Create authentication message with session configuration
    const authMessage = await createAuthRequestMessage({
        address: account.address,
        session_key: sessionKey.address, // Using account address as session key
        app_name: APP_NAME,
        allowances: [], // Define RPC allowances as needed
        expire: sessionExpireTimestamp, // 24 hours from now
        scope: AUTH_SCOPE, // Chain scope
        application: account.address, // Application contract address
    });
    console.log(`Auth message created`, authMessage);

    await yellow.sendMessage(authMessage)
    
    yellow.listen(async (message) => {
        
        const response = parseAnyRPCResponse(JSON.stringify(message));
        
        if (response.method === RPCMethod.AuthChallenge) {

            console.log(`Auth Challenge`, response);

            const authParams = {
                scope: AUTH_SCOPE,
                application: walletClient.account?.address as `0x${string}`,
                participant: sessionKey.address as `0x${string}`,
                expire: sessionExpireTimestamp, // 24 hours from now
                allowances: [],
                session_key: sessionKey.address,
                expires_at: BigInt(sessionExpireTimestamp),
            };

            const eip712Signer = createEIP712AuthMessageSigner(walletClient, authParams, { name: APP_NAME });

            const authVerifyMessage = await createAuthVerifyMessage(eip712Signer, response);

            await yellow.sendMessage(authVerifyMessage);
        }

        if (response.method === RPCMethod.Assets) {
            const assets = response.params.assets;
            console.log(`Assets`, assets);
        }

        if (response.method === RPCMethod.Error) {
            const error = response.params.error;
            console.log(`Error`, error);
        }

        if (response.method === RPCMethod.AuthVerify) {

            console.log(`Auth verify`, response.params);
        }

        if (response.method === RPCMethod.ChannelsUpdate) {
            console.log(`Channels`, response.params);
        }

        if (response.method === RPCMethod.BalanceUpdate) {
            console.log(`Balances`, response.params);
        }

    })

    /*const signature = await walletClient.signMessage({
        message: authMessage,
    });
    console.log(`Authentication signature: ${signature}`);
    */
    
    const blockNumber = await publicClient.getBlockNumber() 
    console.log(`Current block number: ${blockNumber}`)

    /*const nitroliteClient = new NitroliteClient({
        publicClient,
        walletClient,
        addresses: {
            custody: '0x...',
            adjudicator: '0x...',
            guestAddress: '0x...',
        },
        chainId: base.id,
        challengePeriod: 1000000n
    })

    const channel = await nitroliteClient.openChannel(1000000n, 1000000n);

    const depositTxHash = await nitroliteClient.deposit(1000000n);
    */

}

if (require.main === module) {
    main().catch(console.error);
}
