/**
 * Multi-Party Application Session Tutorial
 * ========================================
 * 
 * 📖 Complete Tutorial: https://github.com/stevenzeiler/yellow-sdk-tutorials/tree/main/scripts/app_sessions/README.md
 * 💻 Run this script: https://github.com/stevenzeiler/yellow-sdk-tutorials/blob/main/scripts/app_sessions/app_session_two_signers.ts
 * 
 * To run this TypeScript SDK program:
 * ```bash
 * git clone https://github.com/stevenzeiler/yellow-sdk-tutorials.git
 * cd yellow-sdk-tutorials
 * npm install
 * # Add SEED_PHRASE and WALLET_2_SEED_PHRASE to .env
 * npx tsx scripts/app_sessions/app_session_two_signers.ts
 * ```
 * 
 * This script demonstrates how to create and manage a multi-party application session
 * using Nitrolite state channels. An app session allows multiple participants to interact
 * within a shared off-chain context with cryptographically secured state updates.
 * 
 * What You'll Learn:
 * -----------------
 * 1. Setting up multi-party authentication (2 wallets)
 * 2. Defining an application with multiple participants
 * 3. Creating an app session with initial allocations
 * 4. Updating session state (transferring value between participants)
 * 5. Closing a session with multi-party signatures
 * 
 * Use Cases:
 * ----------
 * - Peer-to-peer payments and escrows
 * - Gaming with multiple players
 * - Collaborative applications (shared whiteboards, auctions)
 * - Multi-party negotiations and settlements
 * 
 * Prerequisites:
 * --------------
 * - Two seed phrases in .env file:
 *   SEED_PHRASE="first wallet mnemonic here"
 *   WALLET_2_SEED_PHRASE="second wallet mnemonic here"
 * - Both wallets should have USDC in Yellow ledger (see deposit_to_custody.ts)
 * 
 * Flow Overview:
 * --------------
 * 1. Connect to Yellow network
 * 2. Authenticate both participants' wallets
 * 3. Define app configuration (participants, weights, quorum)
 * 4. Create session with initial balance allocations
 * 5. Submit state update (demonstrating off-chain state changes)
 * 6. Close session with multi-party signatures
 */

import { Client } from "yellow-ts";
import { authenticateWallet, publicClient } from "../../lib/auth";
import { createAppSessionMessage, createCloseAppSessionMessage, createECDSAMessageSigner, createSubmitAppStateMessage, RPCAppDefinition, RPCAppSessionAllocation, RPCData, RPCMethod, RPCProtocolVersion, RPCResponse } from "@erc7824/nitrolite";
import { createWalletClient, http, WalletClient } from "viem";
import { base } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";

export async function main() {

    // ============================================================================
    // STEP 1: Connect to Yellow Network
    // ============================================================================
    // Establish WebSocket connection to the Yellow clearnet endpoint
    const yellow = new Client({
        url: 'wss://clearnet.yellow.com/ws',
    });

    await yellow.connect();
    console.log('🔌 Connected to Yellow clearnet');

    // ============================================================================
    // STEP 2: Set Up Both Participants' Wallets
    // ============================================================================
    // Create wallet clients for both participants from their seed phrases
    // In a real application, each participant would control their own wallet
    const walletClient = createWalletClient({
        account: mnemonicToAccount(process.env.SEED_PHRASE as string),
        chain: base,
        transport: http(),
    });

    const wallet2Client = createWalletClient({
        account: mnemonicToAccount(process.env.WALLET_2_SEED_PHRASE as string),
        chain: base,
        transport: http(),
    });

    // ============================================================================
    // STEP 3: Authenticate Both Participants
    // ============================================================================
    // Each participant must authenticate to create a session key for signing messages
    // This allows them to sign RPC messages without signing with their main wallet
    const sessionKey = await authenticateWallet(yellow, walletClient as WalletClient);
    const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);

    const sessionKey2 = await authenticateWallet(yellow, wallet2Client);
    const messageSigner2 = createECDSAMessageSigner(sessionKey2.privateKey);

    // Extract participant addresses for use in app definition
    const userAddress = walletClient.account?.address as `0x${string}`;
    const partnerAddress = wallet2Client.account?.address as `0x${string}`;

    // ============================================================================
    // STEP 4: Define Application Configuration
    // ============================================================================
    // The app definition specifies:
    // - participants: Array of participant addresses
    // - weights: Voting weights for each participant (50/50 here)
    // - quorum: Percentage required for decisions (100 = unanimous)
    // - challenge: Challenge period in seconds (0 = no challenge period)
    // - nonce: Unique identifier for this app instance
    const appDefinition: RPCAppDefinition = {
        protocol: RPCProtocolVersion.NitroRPC_0_4,
        participants: [userAddress, partnerAddress],
        weights: [50, 50],        // Equal voting power
        quorum: 100,              // Requires unanimous agreement
        challenge: 0,             // No challenge period
        nonce: Date.now(),        // Unique session identifier
        application: 'Test app',
      };
    
    // ============================================================================
    // STEP 5: Set Initial Allocations
    // ============================================================================
    // Define how much of each asset each participant starts with
    // In this example: userAddress gets 0.01 USDC, partnerAddress gets 0
    const allocations = [
        { participant: userAddress, asset: 'usdc', amount: '0.01' },
        { participant: partnerAddress, asset: 'usdc', amount: '0.00' }
    ] as RPCAppSessionAllocation[];
    
    // ============================================================================
    // STEP 6: Create and Submit App Session
    // ============================================================================
    // Create the session message signed by the first participant
    const sessionMessage = await createAppSessionMessage(
        messageSigner,
        { definition: appDefinition, allocations }
    );

    console.log('📝 Session message created:', sessionMessage);

    // Submit the session creation request to Yellow
    const sessionResponse = await yellow.sendMessage(sessionMessage);
    console.log('✅ Session message sent');

    console.log('🆔 Session response:', sessionResponse);

    // ============================================================================
    // STEP 7: Update Session State (Transfer Between Participants)
    // ============================================================================
    // Create new allocations that represent a state change
    // Here we're transferring the full 0.01 USDC from user to partner
    // This demonstrates off-chain state updates without on-chain transactions
    const finalAllocations = [
        {participant: userAddress, asset: 'usdc', amount: '0.00' },
        {participant: partnerAddress, asset: 'usdc', amount: '0.01' }
    ] as RPCAppSessionAllocation[];
    
    // Submit the updated state to Yellow
    const submitAppStateMessage = await createSubmitAppStateMessage(
      messageSigner,
      { app_session_id: sessionResponse.params.appSessionId, allocations: finalAllocations }
    );

    const submitAppStateMessageJson = JSON.parse(submitAppStateMessage);
    console.log('📊 Submit app state message:', submitAppStateMessageJson);

    // ============================================================================
    // STEP 8: Close Session with Multi-Party Signatures
    // ============================================================================
    // Create the close session message (signed by first participant)
    const closeSessionMessage = await createCloseAppSessionMessage(
        messageSigner,
        { app_session_id: sessionResponse.params.appSessionId, allocations: finalAllocations }
    );

    // Parse the message to add additional signatures
    const closeSessionMessageJson = JSON.parse(closeSessionMessage);

    // ============================================================================
    // STEP 9: Collect Second Participant's Signature
    // ============================================================================
    // In a multi-party session, all participants must sign the close message
    // Here we're signing with the second participant's session key
    const signedCloseSessionMessageSignature2 = await messageSigner2(
        closeSessionMessageJson.req as RPCData
    );

    console.log('✍️  Wallet 2 signed close session message:', signedCloseSessionMessageSignature2);

    // Add the second signature to the message
    // Both signatures are required because quorum is 100%
    closeSessionMessageJson.sig.push(signedCloseSessionMessageSignature2);

    console.log('📤 Close session message (with all signatures):', closeSessionMessage);

    // ============================================================================
    // STEP 10: Submit Close Request
    // ============================================================================
    // Send the fully-signed close message to finalize the session
    const closeSessionResponse = await yellow.sendMessage(
        JSON.stringify(closeSessionMessageJson)
    );
    console.log('✅ Close session message sent');

    console.log('🎉 Close session response:', closeSessionResponse);

    // Listen for any additional messages from the server
    yellow.listen(async (message: RPCResponse) => {
        console.log('📨 Received message:', message);
    });

}

if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Error:', error.message || error);
        process.exitCode = 1;
    });
}