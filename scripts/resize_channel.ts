// This script resizes a channel - allocate or deallocate funds

import { config } from 'dotenv';
import {
    Hex,
    formatUnits,
    parseUnits,
} from 'viem';
import { base } from 'viem/chains';
import {
    Allocation,
    FinalState,
    NitroliteClient,
    RPCChannelOperation,
    RPCMethod,
    RPCResponse,
    ResizeChannelParams,
    State,
    StateIntent,
    WalletStateSigner,
    createECDSAMessageSigner,
    createGetConfigMessage,
    createResizeChannelMessage,
} from '@erc7824/nitrolite';
import { Client } from 'yellow-ts';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { authenticate, publicClient, walletClient } from '../lib/auth';

const BASE_CHAIN_ID = base.id;
const USDC_DECIMALS = 6;

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
    .option('channel-id', {
        alias: 'c',
        type: 'string',
        description: 'Channel ID (hex string)',
        demandOption: true,
    })
    .option('resize', {
        alias: 'r',
        type: 'number',
        description: 'Resize amount: positive to add funds from custody to channel, negative to remove',
    })
    .option('allocate', {
        alias: 'a',
        type: 'number',
        description: 'Allocate amount: positive to move to unified balance, negative to move back to channel',
    })
    .check((argv) => {
        if (!argv['channel-id'].startsWith('0x')) {
            throw new Error('Channel ID must be a hex string starting with 0x');
        }
        if (argv.resize === undefined && argv.allocate === undefined) {
            throw new Error('At least one of --resize or --allocate must be provided');
        }
        if (argv.resize === 0 && argv.allocate === 0) {
            throw new Error('Amounts cannot both be zero');
        }
        return true;
    })
    .example('$0 -c 0x123... -r 1.0', 'Resize: add 1 USDC from custody to channel')
    .example('$0 -c 0x123... -a 0.5', 'Allocate: move 0.5 USDC to unified balance')
    .example('$0 -c 0x123... -r 1.0 -a 0.5', 'Resize and allocate in one operation')
    .example('$0 -c 0x123... -a -0.5', 'Deallocate: move 0.5 USDC back to channel')
    .parseSync();

function toBigInt(value: number | bigint): bigint {
    return typeof value === 'bigint' ? value : BigInt(value);
}

export function composeResizeChannelParams(
    channelId: Hex,
    resizeResponseParams: RPCChannelOperation,
    previousState: State,
): ResizeChannelParams {
    console.log({
        channelId,
        resizeResponseParams,
        previousState,
    })
    return {
            resizeState: {
                channelId,
                ...resizeResponseParams.state,
                serverSignature: resizeResponseParams.serverSignature,
                data: resizeResponseParams.state.stateData as Hex,
                version: BigInt(resizeResponseParams.state.version),
            },
            //proofStates: [previousState],
            proofStates: [],
        };
}

export async function main() {
    config();

    const channelId = argv['channel-id'] as Hex;
    const resizeAmount = argv.resize;
    const allocateAmount = argv.allocate;

    // Convert to units (with sign preserved)
    const resizeAmountInUnits = resizeAmount !== undefined
        ? parseUnits(resizeAmount.toString(), USDC_DECIMALS)
        : undefined;
    const allocateAmountInUnits = allocateAmount !== undefined
        ? parseUnits(allocateAmount.toString(), USDC_DECIMALS)
        : undefined;

    console.log(`\n📋 Resize Channel`);
    console.log(`   Channel ID: ${channelId}`);
    if (resizeAmount !== undefined) {
        console.log(`   Resize: ${resizeAmount > 0 ? '+' : ''}${resizeAmount} USDC (${resizeAmount > 0 ? 'custody → channel' : 'channel → custody'})`);
    }
    if (allocateAmount !== undefined) {
        console.log(`   Allocate: ${allocateAmount > 0 ? '+' : ''}${allocateAmount} USDC (${allocateAmount > 0 ? 'channel → unified' : 'unified → channel'})`);
    }
    console.log();

    const yellow = new Client({
        url: 'wss://clearnet.yellow.com/ws',
    });

    await yellow.connect();
    console.log('🔌 Connected to Yellow clearnet');

    const sessionKey = await authenticate(yellow);
    const sessionSigner = createECDSAMessageSigner(sessionKey.privateKey);

    const walletAddress = walletClient.account?.address as `0x${string}`;

    // State tracking
    let brokerAddress: string;
    let nitroliteClient: NitroliteClient;
    let baseNetwork: {
        chainId: number;
        custodyAddress: string;
        adjudicatorAddress: string;
    };

    yellow.listen(async (message: RPCResponse) => {
        switch (message.method) {
            case RPCMethod.AuthVerify:
                console.log('✅ Authenticated');

                // Get config for broker address and contract addresses
                const configMessage = await createGetConfigMessage(sessionSigner);
                await yellow.sendMessage(configMessage);
                break;

            case RPCMethod.GetConfig:
                const { networks, brokerAddress: broker } = message.params as {
                    networks: Array<{
                        chainId: number;
                        custodyAddress: string;
                        adjudicatorAddress: string;
                    }>;
                    brokerAddress: string;
                };

                brokerAddress = broker;

                baseNetwork = networks.find((n) => n.chainId === BASE_CHAIN_ID) as {
                    chainId: number;
                    custodyAddress: string;
                    adjudicatorAddress: string;
                };
                if (!baseNetwork) {
                    console.error(`❌ Could not find Base network (${BASE_CHAIN_ID}) in config`);
                    await yellow.disconnect();
                    process.exit(1);
                }

                // Funds destination: broker for allocation, user for deallocation
                const isAllocating = allocateAmount !== undefined && allocateAmount > 0;
                const fundsDestination = (isAllocating ? brokerAddress : walletAddress) as `0x${string}`;

                console.log(`📤 Sending resize request...`);
                console.log(`   Funds destination: ${fundsDestination}`);

                const resizeMessage = await createResizeChannelMessage(sessionSigner, {
                    channel_id: channelId,
                    ...(resizeAmountInUnits !== undefined && { resize_amount: resizeAmountInUnits }),
                    ...(allocateAmountInUnits !== undefined && { allocate_amount: allocateAmountInUnits }),
                    funds_destination: fundsDestination,
                });

                await yellow.sendMessage(resizeMessage);
                break;

            case RPCMethod.ResizeChannel:
                console.log(`✅ Resize approved by server, executing on-chain...`, message.params);
                console.log(message.params.state)
                //const txHash = await nitroliteClient.resizeChannel(resizeParams);
                nitroliteClient = new NitroliteClient({
                    publicClient: publicClient as any,
                    walletClient: walletClient as any,
                    stateSigner: new WalletStateSigner(walletClient),
                    addresses: {
                        custody: baseNetwork.custodyAddress as `0x${string}`,
                        adjudicator: baseNetwork.adjudicatorAddress as `0x${string}`,
                    },
                    chainId: BASE_CHAIN_ID,
                    challengeDuration: 3600n,
                });

                console.log("STATE",message.params.state)

                const resizeState: FinalState = {
                    intent: message.params.state.intent as StateIntent,
                    channelId: message.params.channelId as Hex,
                    version: BigInt(message.params.state.version),
                    data: message.params.state.stateData as Hex,
                    allocations: message.params.state.allocations as Allocation[],
                    serverSignature: message.params.serverSignature as Hex,
                };

                // fetch the previous state
                const previousState = await nitroliteClient.getChannelData(message.params.channelId as Hex);
                console.log({
                    previousState,
                })

                console.log({
                    resizeState,
                })

                const {txHash: resizeChannelTxHash} = await nitroliteClient.resizeChannel({
                    resizeState: {
                        channelId: message.params.channelId as Hex,
                        intent: message.params.state.intent as StateIntent,
                        version: BigInt(message.params.state.version) as bigint,
                        data: message.params.state.stateData as Hex,
                        allocations: message.params.state.allocations as Allocation[],
                        serverSignature: message.params.serverSignature as Hex,
                    },
                    proofStates: [previousState.lastValidState as State]
                });            

                console.log(`\n🎉 Resize successful!`);
                console.log(`   Resize channel tx hash: ${resizeChannelTxHash}`);
                if (resizeAmount !== undefined) {
                    console.log(`   Resized: ${resizeAmount > 0 ? '+' : ''}${resizeAmount} USDC`);
                }
                if (allocateAmount !== undefined) {
                    console.log(`   Allocated: ${allocateAmount > 0 ? '+' : ''}${allocateAmount} USDC`);
                }

                await yellow.disconnect();
                process.exit(0);

            case RPCMethod.Error:
                console.error('❌ Error:', message.params);
                await yellow.disconnect();
                process.exit(1);
        }
    });
}

if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Resize channel failed:', error.message || error);
        process.exitCode = 1;
    });
}
