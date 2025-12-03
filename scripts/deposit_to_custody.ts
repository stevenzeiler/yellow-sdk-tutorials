// This script deposits USDC to the custody contract on Base

import { ContractAddresses, NitroliteClient, WalletStateSigner } from "@erc7824/nitrolite";
import { config } from "dotenv";
import { createWalletClient, formatUnits, http, parseUnits } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { base } from "viem/chains";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getContractAddresses } from "../lib/utils";
import { publicClient } from "../lib/auth";

const BASE_CHAIN_ID = base.id;
const USDC_TOKEN_BASE = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const USDC_DECIMALS = 6;

const argv = yargs(hideBin(process.argv))
    .option('amount', {
        alias: 'a',
        type: 'number',
        description: 'Amount of USDC to deposit',
        demandOption: true,
    })
    .check((argv) => {
        if (argv.amount <= 0) {
            throw new Error('Amount must be a positive number');
        }
        return true;
    })
    .example('$0 --amount 0.01', 'Deposit 0.01 USDC to custody')
    .example('$0 -a 1.5', 'Deposit 1.5 USDC to custody')
    .parseSync();

export async function main() {
    config();

    const amount = argv.amount.toString();

    const seedPhrase = process.env.SEED_PHRASE;
    if (!seedPhrase) {
        throw new Error('SEED_PHRASE env variable is required');
    }

    const account = mnemonicToAccount(seedPhrase)

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(),
    })

    // fetch available balance in USDC on Base network for the wallet address
    const balance = await publicClient.readContract({
        address: USDC_TOKEN_BASE as `0x${string}`,
        abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'balanceOf',
        args: [walletClient.account?.address as `0x${string}`],
    });

    console.log('Available balance in USDC on Base network for the wallet address', formatUnits(balance, 6));

    const nitroliteClient = new NitroliteClient({
        walletClient,
        publicClient: publicClient as any,
        stateSigner: new WalletStateSigner(walletClient),
        addresses: getContractAddresses(BASE_CHAIN_ID) as ContractAddresses,
        chainId: BASE_CHAIN_ID,
        challengeDuration: 3600n,
    })

    const depositAmountInUnits = parseUnits(amount, USDC_DECIMALS);
    console.log(`Depositing ${amount} USDC (${depositAmountInUnits} units) to custody...`);

    const depositHash = await nitroliteClient.deposit(USDC_TOKEN_BASE, depositAmountInUnits);

    console.log('Deposit tx hash', depositHash);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: depositHash });

    console.log('Deposit receipt', receipt);
    
}

if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}
