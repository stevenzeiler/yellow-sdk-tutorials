import { config } from 'dotenv'
import { createPublicClient, createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { generateSessionKey } from '../lib/utils';
import { Client } from 'yellow-ts'
import { 
    createAuthRequestMessage, 
    createAuthVerifyMessage,
    createCreateChannelMessage,
    createEIP712AuthMessageSigner, 
    createECDSAMessageSigner,
    AuthChallengeResponse, 
    RPCMethod, 
    RPCResponse, 
    NitroliteClient,
    WalletStateSigner,
    Channel,
    StateIntent,
    Allocation,
    ContractAddresses
} from '@erc7824/nitrolite';

config()

function getBaseContractAddresses() {
    return {
        custody: '0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6',
        adjudicator: '0x7de4A0736Cf5740fD3Ca2F2e9cc85c9AC223eF0C',
    }
}

const USDC_TOKEN_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const BASE_CHAIN_ID = base.id;

export async function main() {
    // Load the wallet from the environment variable
    const wallet = mnemonicToAccount(process.env.SEED_PHRASE as string);
    
    const walletClient = createWalletClient({
        account: wallet,
        chain: base,
        transport: http(),
    })

    const publicClient = createPublicClient({
        chain: base,
        transport: http(),
    })

    const sessionKey = generateSessionKey();
    const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);


    const yellow = new Client({
        url: 'wss://clearnet.yellow.com/ws',
    })

    await yellow.connect()
    console.log('🔌 Connected to Yellow clearnet');

    const sessionExpireTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600);

    // Step 1: Request authentication
    const authMessage = await createAuthRequestMessage({
        address: wallet.address,
        session_key: sessionKey.address,
        application: 'Test app',
        allowances: [{
            asset: 'usdc',
            amount: '0.01',
        }],
        expires_at: BigInt(sessionExpireTimestamp),
        scope: 'test.app',
    })

    yellow.sendMessage(authMessage);

    yellow.listen(async (message: RPCResponse) => {
        switch (message.method) {
            case RPCMethod.AuthChallenge:
                console.log('🔐 Received auth challenge');

                const authParams = {
                    scope: 'test.app',
                    application: wallet.address,
                    participant: sessionKey.address,
                    expire: sessionExpireTimestamp,
                    allowances: [{
                        asset: 'usdc',
                        amount: '0.01',
                    }],
                    session_key: sessionKey.address,
                    expires_at: BigInt(sessionExpireTimestamp),
                }

                const eip712Signer = createEIP712AuthMessageSigner(walletClient, authParams, { name: 'Test app' });
                const authVerifyMessage = await createAuthVerifyMessage(eip712Signer, message as AuthChallengeResponse);

                yellow.sendMessage(authVerifyMessage);
                break;

            case RPCMethod.AuthVerify:
                if (message.params.success) {
                    console.log('✅ Authentication successful');

                    // Step 2: Create a channel for USDC on Base
                    const createChannelMessage = await createCreateChannelMessage(sessionSigner, {
                        chain_id: BASE_CHAIN_ID,
                        token: USDC_TOKEN_BASE as `0x${string}`,
                    });

                    console.log('📤 Creating channel for USDC on Base...');
                    yellow.sendMessage(createChannelMessage);
                } else {
                    console.error('❌ Authentication failed:', message.params);
                }
                break;

            case RPCMethod.CreateChannel:
                // Step 3: Log the channel details
                console.log('🧬 Channel created successfully!');
                console.log('\n📋 Channel Details:');
                console.log('Channel', message);
                console.log("Participants", message.params.channel.participants);

                const nitroliteClient = new NitroliteClient({
                    walletClient,
                    publicClient: publicClient as any,
                    stateSigner: new WalletStateSigner(walletClient),
                    addresses: getBaseContractAddresses() as ContractAddresses,
                    chainId: BASE_CHAIN_ID,
                    challengeDuration: 3600n,
                });
                //console.log(JSON.stringify(message.params, null, 2));

                const { channelId, txHash } = await nitroliteClient.createChannel({
                    channel: message.params.channel as unknown as Channel,
                    unsignedInitialState: {
                        intent: message.params.state.intent as StateIntent,
                        version: BigInt(message.params.state.version),
                        data: message.params.state.stateData as `0x${string}`,
                        allocations: message.params.state.allocations as Allocation[],
                    },
                    serverSignature: message.params.serverSignature as `0x${string}`,                    
                });

                console.log(`🧬 Channel ${channelId} created (tx: ${txHash})`);                
                
                // Clean exit
                await yellow.disconnect();
                process.exit(0);
                break;

            case RPCMethod.Error:
                console.error('❌ Error:', message.params);
                await yellow.disconnect();
                process.exit(1);
                break;
        }
    })
}

if (require.main === module) {
    main().catch(console.error);
}