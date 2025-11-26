
import { config } from 'dotenv'
import { createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { generateSessionKey } from '../lib/utils';
import { Client } from 'yellow-ts'
import { createAuthRequestMessage, RPCMethod, RPCResponse, createEIP712AuthMessageSigner, createAuthVerifyMessage, AuthChallengeResponse, createECDSAMessageSigner, createTransferMessage } from '@erc7824/nitrolite';

config()

export async function main() {

    // load the wallet from the environment variable

    const wallet = mnemonicToAccount(process.env.SEED_PHRASE as string);
    
    const walletClient = createWalletClient({
        account: wallet,
        chain: base,
        transport: http(),
    })

    const sessionKey = generateSessionKey();

    const yellow = new Client({
        url: 'wss://clearnet.yellow.com/ws',
    })

    await yellow.connect()

    console.log('Yellow connected');

    const sessionExpireTimestamp = String(Math.floor(Date.now() / 1000) + 3600);

    const authMessage = await createAuthRequestMessage({
        address: wallet.address,
        session_key: sessionKey.address,
        app_name: 'Test app',
        allowances: [],
        expire: sessionExpireTimestamp,
        scope: 'test.app',
        application: wallet.address,
    })

    console.log('Auth message', authMessage);

    yellow.sendMessage(authMessage);

    yellow.listen(async (message: RPCResponse) => {

        switch (message.method) {

            case RPCMethod.AuthChallenge:
                console.log('Auth challenge', message.params);

                const authParams = {
                    scope: 'test.app',
                    application: wallet.address,
                    participant: sessionKey.address,
                    expire: sessionExpireTimestamp,
                    allowances: [],
                }

                const eip712Signer = createEIP712AuthMessageSigner(walletClient, authParams, { name: 'Test app' });

                const authVerifyMessage = await createAuthVerifyMessage(eip712Signer, message as AuthChallengeResponse);

                console.log('Auth verify message', authVerifyMessage);

                yellow.sendMessage(authVerifyMessage);

                break;

            case RPCMethod.AuthVerify:
                console.log('Auth verify', message.params);

                const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

                const transferPayload = await createTransferMessage(sessionSigner, {
                    destination: '0xe487a5287f511de9dbfe11d8fb56b83432580e7c',
                    allocations: [
                        {
                            asset: 'usdc',
                            amount: '0.01',
                        }
                    ],
                });

                console.log('Transfer payload', transferPayload);

                yellow.sendMessage(transferPayload);

                break;

            case RPCMethod.BalanceUpdate:
                console.log('Balance update', message.params);
                break;

            case RPCMethod.Assets:
                console.log('Assets', message.params);
                break;

            case RPCMethod.Error:
                console.log('Error', message.params);
                break;
                
        
        }
    })

}

if (require.main === module) {
    main().catch(console.error);
}