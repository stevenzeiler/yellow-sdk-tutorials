/**
 * Decentralized Ride-Sharing Demo using Yellow Application Sessions
 * 
 * This script demonstrates a trustless ride-sharing payment system using
 * application sessions with quorum-based governance and three parties:
 * - Rider: Pays for the ride (40% voting weight)
 * - Driver: Provides the service (40% voting weight)
 * - App: Mediates the transaction (20% voting weight)
 * 
 * Quorum threshold: 60% (requires 2 out of 3 participants)
 * 
 * The flow simulates:
 * 1. Create application session with rider's 10 USDC deposit
 * 2. Driver confirms pickup (signed state update)
 * 3. Driver completes ride (signed state update)
 * 4. Update allocations to pay driver (requires quorum approval)
 */

import { 
    createECDSAMessageSigner, 
    createAuthRequestMessage, 
    createEIP712AuthMessageSigner, 
    createAuthVerifyMessage,
    createAppSessionMessage,
    createSubmitAppStateMessage,
    parseAnyRPCResponse,
    RPCMethod,
    RPCResponse,
    AuthChallengeResponse,
} from '@erc7824/nitrolite';

import { Client } from 'yellow-ts';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { generateSessionKey, SessionKey } from '../lib/utils';
import { config } from 'dotenv';

config();

// Configuration
const AUTH_SCOPE = 'rideshare.app';
const APP_NAME = 'YellowRide';
const SESSION_DURATION = 3600; // 1 hour
const RIDE_FARE = '10000000'; // 10 USDC (with 6 decimals)
const YELLOW_WS_URL = 'wss://clearnet.yellow.com/ws';

// Application protocol definition
const APP_PROTOCOL = 'rideshare-app-v1';
const CHALLENGE_PERIOD = 86400; // 24 hours

// Participant weights and quorum
const RIDER_WEIGHT = 40;
const DRIVER_WEIGHT = 40;
const APP_WEIGHT = 20;
const QUORUM_THRESHOLD = 60; // Need 2 out of 3 participants

// Ride states
enum RideStatus {
    IDLE = 'idle',
    CREATING_SESSION = 'creating_session',
    SESSION_CREATED = 'session_created',
    RIDE_BOOKED = 'ride_booked',
    PICKUP_CONFIRMED = 'pickup_confirmed',
    RIDE_IN_PROGRESS = 'ride_in_progress',
    RIDE_COMPLETED = 'ride_completed',
    ALLOCATIONS_UPDATED = 'allocations_updated',
}

interface Participant {
    role: 'rider' | 'driver' | 'app';
    client: Client;
    account: any;
    walletClient: any;
    sessionKey: SessionKey;
    authenticated: boolean;
    address: string;
    messageSigner: any;
}

interface AppDefinition {
    protocol: any; // Will be typed by nitrolite
    participants: `0x${string}`[];
    weights: number[];
    quorum: number;
    challenge: number;
    nonce: number;
}

interface Allocation {
    participant: `0x${string}`;
    asset: string;
    amount: string;
}

// State management
let currentRideStatus: RideStatus = RideStatus.IDLE;
let rideStartTime: number = 0;
let participants: Map<string, Participant> = new Map();
let appSessionId: string | null = null;
let currentAllocations: Allocation[] = [];
let currentVersion: number = 0; // Track app session version

/**
 * Initialize a participant with their seed phrase
 */
async function initializeParticipant(
    role: 'rider' | 'driver' | 'app',
    seedPhraseEnvVar: string
): Promise<Participant> {
    console.log(`\n🔧 Initializing ${role.toUpperCase()}...`);
    
    // Try to get specific seed phrase, fall back to generic SEED_PHRASE for demo
    let seedPhrase = process.env[seedPhraseEnvVar];
    if (!seedPhrase) {
        seedPhrase = process.env.SEED_PHRASE;
        if (!seedPhrase) {
            throw new Error(`Neither ${seedPhraseEnvVar} nor SEED_PHRASE environment variable is set. Set at least SEED_PHRASE in your .env file for demo purposes.`);
        }
        console.log(`   ℹ️  Using shared SEED_PHRASE for demo (in production, use separate wallets)`);
    }

    // Create wallet account
    const account = mnemonicToAccount(seedPhrase);
    console.log(`   Wallet address: ${account.address}`);

    const publicClient = createPublicClient({
        chain: base,
        transport: http(),
    });

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(),
    });

    // Generate session key
    const sessionKey = generateSessionKey();
    console.log(`   Session key: ${sessionKey.address}`);

    // Create message signer using session key
    const messageSigner = createECDSAMessageSigner(sessionKey.privateKey);

    // Connect to Yellow network
    const client = new Client({ url: YELLOW_WS_URL });
    await client.connect();
    console.log(`   ✅ Connected to Yellow network`);

    return {
        role,
        client,
        account,
        walletClient,
        sessionKey,
        authenticated: false,
        address: account.address,
        messageSigner,
    };
}

/**
 * Authenticate a participant with the Yellow broker
 */
async function authenticateParticipant(participant: Participant): Promise<void> {
    console.log(`\n🔐 Authenticating ${participant.role.toUpperCase()}...`);

    const sessionExpireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);

    // Create authentication request
    const authMessage = await createAuthRequestMessage({
        address: participant.account.address,
        session_key: participant.sessionKey.address,
        app_name: APP_NAME,
        allowances: [], // In production, specify allowed RPC methods
        expire: sessionExpireTimestamp,
        scope: AUTH_SCOPE,
        application: participant.account.address,
    });

    // Set up message listener
    participant.client.listen(async (message: RPCResponse) => {
        await handleParticipantMessage(participant, message);
    });

    // Send auth request
    await participant.client.sendMessage(authMessage);
    console.log(`   📤 Auth request sent`);
}

/**
 * Handle incoming messages for a participant
 */
async function handleParticipantMessage(
    participant: Participant,
    message: RPCResponse
): Promise<void> {
    // Message might already be parsed or might be a string
    let response;
    try {
        if (typeof message === 'string') {
            response = parseAnyRPCResponse(message);
        } else if (message && typeof message === 'object') {
            // Already an object, use it directly
            response = message;
        } else {
            response = parseAnyRPCResponse(JSON.stringify(message));
        }
    } catch (error) {
        console.log(`   ⚠️  Received non-standard message:`, message);
        return;
    }

    switch (response.method) {
        case RPCMethod.AuthChallenge:
            await handleAuthChallenge(participant, response as AuthChallengeResponse);
            break;

        case RPCMethod.AuthVerify:
            console.log(`   ✅ ${participant.role.toUpperCase()} authenticated successfully`);
            participant.authenticated = true;
            await onParticipantAuthenticated(participant);
            break;

        case RPCMethod.Assets:
            console.log(`   💰 ${participant.role.toUpperCase()} assets:`, response.params.assets);
            break;

        case RPCMethod.BalanceUpdate:
            console.log(`   💵 ${participant.role.toUpperCase()} balance update:`, response.params);
            break;

        case RPCMethod.ChannelsUpdate:
            console.log(`   🔄 ${participant.role.toUpperCase()} channels update:`, response.params);
            await onChannelUpdate(participant, response.params);
            break;

        case RPCMethod.Error:
            console.error(`   ❌ ${participant.role.toUpperCase()} error:`, response.params.error);
            break;

        default:
            console.log(`   📨 ${participant.role.toUpperCase()} received:`, response.method, response.params);
    }
}

/**
 * Handle authentication challenge
 */
async function handleAuthChallenge(
    participant: Participant,
    challenge: AuthChallengeResponse
): Promise<void> {
    console.log(`   🔑 Processing auth challenge...`);

    const sessionExpireTimestamp = String(Math.floor(Date.now() / 1000) + SESSION_DURATION);

    const authParams = {
        scope: AUTH_SCOPE,
        application: participant.walletClient.account?.address as `0x${string}`,
        participant: participant.sessionKey.address as `0x${string}`,
        expire: sessionExpireTimestamp,
        allowances: [],
    };

    const eip712Signer = createEIP712AuthMessageSigner(
        participant.walletClient,
        authParams,
        { name: APP_NAME }
    );

    const authVerifyMessage = await createAuthVerifyMessage(eip712Signer, challenge);
    await participant.client.sendMessage(authVerifyMessage);
    console.log(`   📤 Auth verification sent`);
}

/**
 * Called when a participant is successfully authenticated
 */
async function onParticipantAuthenticated(participant: Participant): Promise<void> {
    // Check if all participants are authenticated
    const allAuthenticated = Array.from(participants.values()).every(p => p.authenticated);
    
    if (allAuthenticated && currentRideStatus === RideStatus.IDLE) {
        console.log(`\n✨ All participants authenticated! Starting ride simulation...\n`);
        await simulateRideFlow();
    }
}

/**
 * Handle channel update events (including app session creation)
 */
async function onChannelUpdate(participant: Participant, channelInfo: any): Promise<void> {
    if (currentRideStatus === RideStatus.CREATING_SESSION) {
        // App session was created
        console.log(`   📋 Application session created!`);
        appSessionId = channelInfo.id || 'session-' + Date.now();
        currentVersion = 0; // Initial version is 0
        await transitionToState(RideStatus.SESSION_CREATED);
    } else if (channelInfo.version !== undefined) {
        // Update version when we receive channel updates
        currentVersion = channelInfo.version;
        console.log(`   🔄 Session version updated to: ${currentVersion}`);
    }
}

/**
 * Transition to a new ride state
 */
async function transitionToState(newStatus: RideStatus): Promise<void> {
    const previousStatus = currentRideStatus;
    currentRideStatus = newStatus;
    
    console.log(`\n📍 STATE TRANSITION: ${previousStatus} → ${newStatus}`);
    
    // Execute actions based on new state
    switch (newStatus) {
        case RideStatus.SESSION_CREATED:
            console.log(`   ✅ Application session ready with quorum governance`);
            console.log(`   💰 Rider deposited ${parseInt(RIDE_FARE) / 1000000} USDC into session`);
            await transitionToState(RideStatus.RIDE_BOOKED);
            break;

        case RideStatus.RIDE_BOOKED:
            console.log(`   📱 Ride booked! Waiting for driver...`);
            setTimeout(() => simulatePickup(), 2000);
            break;

        case RideStatus.PICKUP_CONFIRMED:
            console.log(`   🚗 Driver confirmed pickup!`);
            setTimeout(() => transitionToState(RideStatus.RIDE_IN_PROGRESS), 1000);
            break;

        case RideStatus.RIDE_IN_PROGRESS:
            console.log(`   🚦 Ride in progress...`);
            setTimeout(() => simulateRideCompletion(), 3000);
            break;

        case RideStatus.RIDE_COMPLETED:
            console.log(`   🏁 Ride completed! Updating allocations with quorum approval...`);
            setTimeout(() => updateAllocationsForPayment(), 2000);
            break;

        case RideStatus.ALLOCATIONS_UPDATED:
            console.log(`   ✅ Payment successful! Driver received ${parseInt(RIDE_FARE) / 1000000} USDC`);
            console.log(`   ⚖️ Quorum validation: RIDER (40%) + APP (20%) = 60% ✓`);
            console.log(`\n🎉 RIDE-SHARING DEMO COMPLETED SUCCESSFULLY!\n`);
            setTimeout(() => cleanup(), 2000);
            break;
    }
}

/**
 * Simulate the complete ride flow
 */
async function simulateRideFlow(): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚕 STARTING RIDE-SHARING SIMULATION`);
    console.log(`${'='.repeat(60)}\n`);
    
    await createApplicationSession();
}

/**
 * Step 1: Create application session with quorum governance
 */
async function createApplicationSession(): Promise<void> {
    console.log(`\n📱 Step 1: CREATING APPLICATION SESSION`);
    console.log(`   Protocol: ${APP_PROTOCOL}`);
    console.log(`   Quorum threshold: ${QUORUM_THRESHOLD}%`);
    
    const rider = participants.get('rider');
    const driver = participants.get('driver');
    const app = participants.get('app');
    
    if (!rider || !driver || !app) {
        throw new Error('Not all participants initialized');
    }

    currentRideStatus = RideStatus.CREATING_SESSION;
    rideStartTime = Date.now();

    // Define application with quorum governance
    const appDefinition: AppDefinition = {
        protocol: APP_PROTOCOL as any,
        participants: [
            rider.address as `0x${string}`, 
            driver.address as `0x${string}`, 
            app.address as `0x${string}`
        ],
        weights: [RIDER_WEIGHT, DRIVER_WEIGHT, APP_WEIGHT],
        quorum: QUORUM_THRESHOLD,
        challenge: CHALLENGE_PERIOD,
        nonce: Date.now()
    };

    // Initial allocations: Rider deposits 10 USDC
    currentAllocations = [
        { participant: rider.address as `0x${string}`, asset: 'usdc', amount: RIDE_FARE },
        { participant: driver.address as `0x${string}`, asset: 'usdc', amount: '0' },
        { participant: app.address as `0x${string}`, asset: 'usdc', amount: '0' }
    ];

    console.log(`\n   👥 Participants:`);
    console.log(`      Rider:  ${rider.address.slice(0, 10)}... (${RIDER_WEIGHT}% weight)`);
    console.log(`      Driver: ${driver.address.slice(0, 10)}... (${DRIVER_WEIGHT}% weight)`);
    console.log(`      App:    ${app.address.slice(0, 10)}... (${APP_WEIGHT}% weight)`);
    
    console.log(`\n   💰 Initial Allocations:`);
    console.log(`      Rider:  ${parseInt(RIDE_FARE) / 1000000} USDC`);
    console.log(`      Driver: 0 USDC`);
    console.log(`      App:    0 USDC`);

    // Create signed app session message
    const sessionMessage = await createAppSessionMessage(
        rider.messageSigner,
        { definition: appDefinition, allocations: currentAllocations }
    );

    console.log(`\n   📤 Sending application session to Yellow network...`);
    await rider.client.sendMessage(sessionMessage);
    
    // Simulate session creation confirmation
    setTimeout(() => {
        if (currentRideStatus === RideStatus.CREATING_SESSION) {
            transitionToState(RideStatus.SESSION_CREATED);
        }
    }, 1500);
}

/**
 * Step 2: Driver confirms pickup
 */
async function simulatePickup(): Promise<void> {
    console.log(`\n🚗 Step 2: DRIVER PICKUP`);
    console.log(`   Driver is arriving at pickup location...`);
    console.log(`   GPS coordinates: [37.7749, -122.4194] (San Francisco)`);
    
    const driver = participants.get('driver');
    const app = participants.get('app');
    
    if (!driver || !app) {
        throw new Error('Driver or App participant not found');
    }

    // Update app session state with pickup event
    const pickupSessionData = {
        ride_status: 'pickup_confirmed',
        timestamp: Date.now(),
        gps: [37.7749, -122.4194],
        driver: driver.address,
    };

    console.log(`   ✏️  Submitting pickup state to app session...`);
    
    // Submit state update (no allocation change, just session_data)
    await submitAppState({
        app_session_id: appSessionId!,
        intent: 'operate',
        version: currentVersion + 1,
        allocations: currentAllocations,
        session_data: JSON.stringify(pickupSessionData),
        signers: [driver, app], // Driver + App signatures
    });
    
    console.log(`   ✅ Driver confirmed arrival`);
    console.log(`   🚪 Rider entered vehicle`);
    
    await transitionToState(RideStatus.PICKUP_CONFIRMED);
}

/**
 * Step 3: Ride completion
 */
async function simulateRideCompletion(): Promise<void> {
    console.log(`\n🏁 Step 3: RIDE COMPLETION`);
    
    const rideDuration = Math.floor((Date.now() - rideStartTime) / 1000);
    console.log(`   🕐 Ride duration: ${rideDuration} seconds`);
    console.log(`   📍 Destination reached: [37.7849, -122.4094]`);
    console.log(`   📏 Distance: 2.3 miles`);
    
    const driver = participants.get('driver');
    const rider = participants.get('rider');
    const app = participants.get('app');
    
    if (!driver || !rider || !app) {
        throw new Error('Not all participants found');
    }

    // Update app session state with completion event
    const completionSessionData = {
        ride_status: 'ride_completed',
        timestamp: Date.now(),
        distance: 2.3,
        duration: rideDuration,
        destination_gps: [37.7849, -122.4094],
    };

    console.log(`   ✏️  Submitting completion state to app session...`);
    
    // Submit state update (no allocation change yet, just session_data)
    await submitAppState({
        app_session_id: appSessionId!,
        intent: 'operate',
        version: currentVersion + 1,
        allocations: currentAllocations,
        session_data: JSON.stringify(completionSessionData),
        signers: [rider, driver, app], // All parties sign completion
    });
    
    console.log(`   ✅ Driver marked ride as complete`);
    console.log(`   ✅ Rider confirmed arrival`);
    
    await transitionToState(RideStatus.RIDE_COMPLETED);
}

/**
 * Step 4: Update allocations to pay driver (requires quorum)
 */
async function updateAllocationsForPayment(): Promise<void> {
    console.log(`\n💸 Step 4: UPDATING ALLOCATIONS WITH QUORUM (OPERATE Intent)`);
    console.log(`   App validating ride completion...`);
    
    const rider = participants.get('rider');
    const driver = participants.get('driver');
    const app = participants.get('app');
    
    if (!rider || !driver || !app) {
        throw new Error('Not all participants found');
    }

    // New allocation: Driver gets the full fare (OPERATE intent - redistributing existing funds)
    const newAllocations: Allocation[] = [
        { participant: rider.address as `0x${string}`, asset: 'usdc', amount: '0' },
        { participant: driver.address as `0x${string}`, asset: 'usdc', amount: RIDE_FARE },
        { participant: app.address as `0x${string}`, asset: 'usdc', amount: '0' }
    ];

    console.log(`\n   💰 Proposed New Allocations (FINAL state):`);
    console.log(`      Rider:  0 USDC`);
    console.log(`      Driver: ${parseInt(RIDE_FARE) / 1000000} USDC ⬆️`);
    console.log(`      App:    0 USDC`);
    console.log(`      Total:  ${parseInt(RIDE_FARE) / 1000000} USDC (unchanged) ✓`);

    const paymentSessionData = {
        ride_status: 'payment_released',
        timestamp: Date.now(),
        payment_amount: parseInt(RIDE_FARE) / 1000000,
        recipient: driver.address,
    };

    console.log(`\n   ⚖️  Using OPERATE intent (redistribute existing funds)`);
    console.log(`   📊 Version: ${currentVersion} → ${currentVersion + 1}`);
    console.log(`\n   ✏️  Getting quorum signatures...`);
    console.log(`      Rider (40%) + App (20%) = 60% ≥ 60% threshold`);

    // Submit state update with OPERATE intent to reallocate funds
    await submitAppState({
        app_session_id: appSessionId!,
        intent: 'operate',
        version: currentVersion + 1,
        allocations: newAllocations,
        session_data: JSON.stringify(paymentSessionData),
        signers: [rider, app], // Quorum: Rider (40%) + App (20%) = 60%
    });
    
    console.log(`      ✅ Rider signed (40% weight)`);
    console.log(`      ✅ App signed (20% weight)`);
    console.log(`      ⚖️  Total: 60% (meets quorum threshold)`);

    currentAllocations = newAllocations;
    
    await transitionToState(RideStatus.ALLOCATIONS_UPDATED);
}

/**
 * Helper: Submit app state update to Yellow network
 */
async function submitAppState(params: {
    app_session_id: string;
    intent: 'operate' | 'deposit' | 'withdraw';
    version: number;
    allocations: Allocation[];
    session_data?: string;
    signers: Participant[];
}): Promise<void> {
    const { app_session_id, intent, version, allocations, session_data, signers } = params;
    
    console.log(`   📤 Creating app state update (intent: ${intent}, version: ${version})...`);
    
    // Use the first signer to create the base message
    const stateUpdateMessage = await createSubmitAppStateMessage(
        signers[0].messageSigner,
        {
            app_session_id: app_session_id as `0x${string}`,
            intent: intent as any, // Cast to RPCAppStateIntent
            version,
            allocations: allocations.map(a => ({
                participant: a.participant,
                asset: a.asset,
                amount: a.amount,
            })),
            ...(session_data && { session_data }),
        }
    );

    // If we have multiple signers, collect additional signatures
    if (signers.length > 1) {
        const additionalSignatures: Array<{ participant: string; signature: any }> = [];
        
        for (let i = 1; i < signers.length; i++) {
            const signer = signers[i];
            const payload = JSON.stringify((stateUpdateMessage as any).params);
            const sig = await signer.messageSigner(payload);
            additionalSignatures.push({
                participant: signer.address,
                signature: sig,
            });
        }
        
        // Add additional signatures to the message
        if (additionalSignatures.length > 0) {
            (stateUpdateMessage as any).params.additional_signatures = additionalSignatures;
        }
    }

    console.log(`   📤 Submitting to Yellow network...`);
    
    // Send through any participant's client (they're all connected to the same session)
    await signers[0].client.sendMessage(stateUpdateMessage);
    
    // Update our local version tracker
    currentVersion = version;
    console.log(`   ✅ State update submitted`);
}

/**
 * Cleanup and disconnect
 */
async function cleanup(): Promise<void> {
    console.log(`\n🧹 Cleaning up connections...`);
    
    for (const [role, participant] of participants.entries()) {
        try {
            await participant.client.disconnect();
            console.log(`   ✅ ${role} disconnected`);
        } catch (error) {
            console.error(`   ❌ Error disconnecting ${role}:`, error);
        }
    }
    
    console.log(`\n✨ Demo complete! Thank you for using YellowRide 🚕\n`);
    console.log(`📊 Final Session State:`);
    console.log(`   Session ID: ${appSessionId}`);
    console.log(`   Protocol: ${APP_PROTOCOL}`);
    console.log(`   Quorum: ${QUORUM_THRESHOLD}%`);
    console.log(`   Status: Completed ✓\n`);
    
    process.exit(0);
}

/**
 * Main entry point
 */
export async function main() {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🌟 YELLOW APPLICATION SESSIONS - RIDE-SHARING DEMO`);
        console.log(`${'='.repeat(60)}\n`);
        console.log(`   Using quorum-based governance for trustless payments`);
        console.log(`   Multi-party state channels with weighted voting\n`);
        
        // Check if using shared seed phrase
        const usingSharedSeed = !process.env.RIDER_SEED_PHRASE || 
                                !process.env.DRIVER_SEED_PHRASE || 
                                !process.env.APP_SEED_PHRASE;
        if (usingSharedSeed) {
            console.log(`   ⚠️  Note: Using shared SEED_PHRASE for all participants (demo mode)`);
            console.log(`   💡 For production: Set RIDER_SEED_PHRASE, DRIVER_SEED_PHRASE, APP_SEED_PHRASE\n`);
        }

        // Initialize all three participants
        const rider = await initializeParticipant('rider', 'RIDER_SEED_PHRASE');
        const driver = await initializeParticipant('driver', 'DRIVER_SEED_PHRASE');
        const app = await initializeParticipant('app', 'APP_SEED_PHRASE');

        // Store participants
        participants.set('rider', rider);
        participants.set('driver', driver);
        participants.set('app', app);

        console.log(`\n${'='.repeat(60)}`);
        console.log(`📋 GOVERNANCE CONFIGURATION`);
        console.log(`${'='.repeat(60)}`);
        console.log(`   Protocol: ${APP_PROTOCOL}`);
        console.log(`   Quorum Threshold: ${QUORUM_THRESHOLD}%`);
        console.log(`   Challenge Period: ${CHALLENGE_PERIOD / 3600} hours`);
        console.log(`\n   Voting Weights:`);
        console.log(`   • Rider:  ${RIDER_WEIGHT}%`);
        console.log(`   • Driver: ${DRIVER_WEIGHT}%`);
        console.log(`   • App:    ${APP_WEIGHT}%`);
        console.log(`\n   Approval Combinations (≥${QUORUM_THRESHOLD}%):`);
        console.log(`   • Rider + Driver = 80% ✅`);
        console.log(`   • Rider + App = 60% ✅`);
        console.log(`   • Driver + App = 60% ✅`);
        console.log(`${'='.repeat(60)}\n`);

        // Authenticate all participants
        await authenticateParticipant(rider);
        await authenticateParticipant(driver);
        await authenticateParticipant(app);

        // The flow continues automatically once all are authenticated
        
    } catch (error) {
        console.error(`\n❌ Fatal error:`, error);
        process.exit(1);
    }
}

// Run the demo
if (require.main === module) {
    main().catch(console.error);
}
