// This script lists all channels for the account using NitroliteClient

import { config } from 'dotenv';
import { base } from 'viem/chains';
import {
    NitroliteClient,
    WalletStateSigner,
} from '@erc7824/nitrolite';

import { publicClient, walletClient } from '../lib/auth';
import { getContractAddresses } from '../lib/utils';

const BASE_CHAIN_ID = base.id;

export async function main() {
    config();

    const walletAddress = walletClient.account?.address as `0x${string}`;
    console.log(`\n📋 List Account Channels`);
    console.log(`   Wallet: ${walletAddress}\n`);

    const nitroliteClient = new NitroliteClient({
        publicClient: publicClient as any,
        walletClient: walletClient as any,
        stateSigner: new WalletStateSigner(walletClient),
        addresses: getContractAddresses(BASE_CHAIN_ID),
        chainId: BASE_CHAIN_ID,
        challengeDuration: 3600n,
    });

    console.log('🔍 Fetching channels from custody contract...\n');

    const channels = await nitroliteClient.getOpenChannels();
    const channelsData1 = await nitroliteClient.getChannelData(channels[0]);
    const channelsData2 = await nitroliteClient.getChannelData(channels[1]);

    console.log({
        channelsData1,
        channelsData2,
    })

    if (channels.length === 0) {
        console.log('No channels found for this account.');
    } else {
        console.log(`Found ${channels.length} channel(s):\n`);
        
        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];
            console.log(`Channel ${i + 1}:`);
            console.log(`   ID: ${channel}`);
            console.log('');
        }
    }

    console.log('✅ Done');
}

if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Error:', error.message || error);
        process.exitCode = 1;
    });
}


