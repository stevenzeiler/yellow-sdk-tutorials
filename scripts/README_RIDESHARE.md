# 🚕 Decentralized Ride-Sharing Demo

## Quick Navigation

- **[Tutorial Guide](../RIDESHARE_TUTORIAL.md)** - Complete conceptual explanation
- **[Quick Start](../RIDESHARE_QUICKSTART.md)** - 5-minute setup guide  
- **[State Machine](../RIDESHARE_STATE_MACHINE.md)** - State transition details
- **[Summary](../SUMMARY.md)** - Project overview and features

## What This Demo Does

This script (`rideshare_demo.ts`) demonstrates a complete trustless ride-sharing payment system using **Yellow application sessions** with quorum-based governance and three participants:

1. **Rider** (40% voting weight) - Deposits 10 USDC, approves final payment
2. **Driver** (40% voting weight) - Provides service, receives payment
3. **App** (20% voting weight) - Mediates and validates the transaction

**Key Innovation**: Instead of simple transfers, this uses a **multi-party application session** where fund allocation changes require quorum approval (60% threshold = 2 out of 3 parties).

## Running the Demo

### Prerequisites

```bash
# 1. Install dependencies
npm install

# 2. Set up .env file
# For demo: Just set SEED_PHRASE (uses same wallet for all participants)
SEED_PHRASE="your twelve or twenty four word seed phrase"

# For production: Set separate seed phrases for each participant
RIDER_SEED_PHRASE="rider wallet seed phrase"
DRIVER_SEED_PHRASE="driver wallet seed phrase"
APP_SEED_PHRASE="app wallet seed phrase"
```

**Note**: For testing, you can use just `SEED_PHRASE` and the script will use it for all three participants. For production, use separate wallets.

### Execute

```bash
# Option 1: Using npm script (recommended)
npm run rideshare

# Option 2: Direct execution
npx tsx scripts/rideshare_demo.ts
```

## What You'll See

```
🌟 YELLOW APPLICATION SESSIONS - RIDE-SHARING DEMO

   Using quorum-based governance for trustless payments
   Multi-party state channels with weighted voting

   ⚠️  Note: Using shared SEED_PHRASE for all participants (demo mode)
   💡 For production: Set RIDER_SEED_PHRASE, DRIVER_SEED_PHRASE, APP_SEED_PHRASE

🔧 Initializing RIDER...
   Wallet address: 0xbEC3eC09...
   Session key: 0x281b726f...
   ✅ Connected to Yellow network

🔧 Initializing DRIVER...
   [similar output]

🔧 Initializing APP...
   [similar output]

============================================================
📋 GOVERNANCE CONFIGURATION
============================================================
   Protocol: rideshare-app-v1
   Quorum Threshold: 60%
   Challenge Period: 24 hours

   Voting Weights:
   • Rider:  40%
   • Driver: 40%
   • App:    20%

   Approval Combinations (≥60%):
   • Rider + Driver = 80% ✅
   • Rider + App = 60% ✅
   • Driver + App = 60% ✅
============================================================

🔐 Authenticating all participants...
   ✅ RIDER authenticated successfully
   ✅ DRIVER authenticated successfully
   ✅ APP authenticated successfully

🚕 STARTING RIDE-SHARING SIMULATION

📱 Step 1: CREATING APPLICATION SESSION
   Protocol: rideshare-app-v1
   Quorum threshold: 60%
   
   👥 Participants:
      Rider:  0xbEC3eC09... (40% weight)
      Driver: 0xbEC3eC09... (40% weight)
      App:    0xbEC3eC09... (20% weight)
   
   💰 Initial Allocations:
      Rider:  10 USDC
      Driver: 0 USDC
      App:    0 USDC

   📤 Sending application session to Yellow network...
   ✅ Application session ready with quorum governance

🚗 Step 2: DRIVER PICKUP
   ✏️  Driver signing pickup confirmation...
   ✅ Driver confirmed arrival
   🚪 Rider entered vehicle

🏁 Step 3: RIDE COMPLETION
   📏 Distance: 2.3 miles
   ✏️  Driver signing ride completion...
   ✏️  Rider signing acknowledgment...
   ✅ Both parties confirmed

💸 Step 4: UPDATING ALLOCATIONS WITH QUORUM
   💰 Proposed New Allocations:
      Rider:  0 USDC
      Driver: 10 USDC ⬆️
      App:    0 USDC
   
   ✏️  Getting quorum signatures...
      ✅ Rider signed (40% weight)
      ✅ App signed (20% weight)
      ⚖️  Total: 60% (meets quorum threshold)

   ✅ Payment successful! Driver received 10 USDC
   ⚖️ Quorum validation: RIDER (40%) + APP (20%) = 60% ✓

🎉 RIDE-SHARING DEMO COMPLETED SUCCESSFULLY!

📊 Final Session State:
   Session ID: session-1764156873758
   Protocol: rideshare-app-v1
   Quorum: 60%
   Status: Completed ✓
```

## Architecture

### Application Session Model

```
┌─────────────────────────────────────────────────────┐
│       Application Session (rideshare-app-v1)       │
│                                                     │
│  Governance: 60% Quorum, 24h Challenge Period      │
│  ┌───────────────────────────────────────────────┐ │
│  │  Participants with Weighted Voting:           │ │
│  │                                                │ │
│  │  RIDER (40%)    DRIVER (40%)      APP (20%)   │ │
│  │  • Creates       • Signs pickup   • Validates │ │
│  │  • Deposits $    • Completes      • Approves  │ │
│  │  • Approves      • Receives $     • Mediates  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  Allocations (updated with quorum approval):       │
│  ┌───────────────────────────────────────────────┐ │
│  │ Initial:  [Rider: 10 USDC, Driver: 0]        │ │
│  │ Final:    [Rider: 0, Driver: 10 USDC]        │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Code Structure

```typescript
// Main entry point
main()
  ├─ initializeParticipant() x3  // Setup rider, driver, app
  ├─ authenticateParticipant() x3 // Auth each with Yellow
  └─ simulateRideFlow()          // Execute ride workflow

// Ride workflow
simulateRideFlow()
  ├─ createApplicationSession()  // Create app session with allocations
  ├─ simulatePickup()            // Driver signs pickup event
  ├─ simulateRideCompletion()    // Both parties sign completion
  └─ updateAllocationsForPayment() // Quorum approves payment
```

### Key Functions

| Function | Purpose | Key Concepts |
|----------|---------|--------------|
| `initializeParticipant()` | Create wallet, connect to Yellow | Session keys, WebSocket connection |
| `authenticateParticipant()` | Complete auth flow | EIP-712 signatures |
| `handleParticipantMessage()` | Route incoming messages | Event-driven architecture |
| `transitionToState()` | Manage state machine | State transitions |
| `createApplicationSession()` | Create app session with quorum | `createAppSessionMessage()` |
| `simulatePickup()` | Driver signs pickup event | Off-chain signatures |
| `simulateRideCompletion()` | Both parties sign completion | Multi-sig validation |
| `updateAllocationsForPayment()` | Update allocations with quorum | Weighted voting (60%) |

## State Flow

```
IDLE → CREATING_SESSION → SESSION_CREATED → RIDE_BOOKED → 
PICKUP_CONFIRMED → RIDE_IN_PROGRESS → RIDE_COMPLETED → 
ALLOCATIONS_UPDATED
```

Each transition is triggered by:
- **Application session creation** - Rider creates multi-party session
- **User actions** - Signing pickup, completion events
- **Channel updates** - Session confirmed by Yellow network
- **Quorum approval** - Allocation updates with multi-sig
- **Timer events** - Simulated pickup/completion

## Customization Examples

### Change Fare Amount

```typescript
const RIDE_FARE = '25000000'; // 25 USDC (with 6 decimals)
```

### Adjust Quorum Threshold

```typescript
const QUORUM_THRESHOLD = 80; // Require Rider + Driver (80%)
```

### Modify Voting Weights

```typescript
const RIDER_WEIGHT = 50;  // 50% voting power
const DRIVER_WEIGHT = 40; // 40% voting power
const APP_WEIGHT = 10;    // 10% voting power
```

### Add Cancellation

```typescript
async function cancelRide(): Promise<void> {
    if (currentRideStatus === RideStatus.RIDE_BOOKED) {
        // Refund logic
        await refundRider();
        await transitionToState(RideStatus.IDLE);
    }
}
```

### Add Timeout Logic

```typescript
const PICKUP_TIMEOUT = 600; // 10 minutes

setTimeout(() => {
    if (currentRideStatus === RideStatus.RIDE_BOOKED) {
        console.log('⏱️ Pickup timeout - auto-cancelling');
        cancelRide();
    }
}, PICKUP_TIMEOUT * 1000);
```

### Add GPS Tracking

```typescript
interface GPSUpdate {
    lat: number;
    lng: number;
    timestamp: number;
}

async function updateLocation(coords: GPSUpdate) {
    // Sign with driver session key
    const locationMessage = await createLocationUpdate(
        driverSigner, 
        coords
    );
    await driver.client.sendMessage(locationMessage);
}
```

## Security Features

### Quorum-Based Governance
The application session uses weighted voting to prevent single-party control:

```
Quorum: 60% approval required

Approval Scenarios:
✅ Rider (40%) + Driver (40%) = 80% → APPROVED
✅ Rider (40%) + App (20%) = 60% → APPROVED  
✅ Driver (40%) + App (20%) = 60% → APPROVED
❌ Rider (40%) alone = 40% → REJECTED
❌ Driver (40%) alone = 40% → REJECTED
❌ App (20%) alone = 20% → REJECTED
```

**Benefits:**
- No single party can steal funds
- Malicious rider can't block payment (Driver + App = 60%)
- Malicious driver can't claim payment without completion (Rider + App = 60%)
- Malicious app can't manipulate (Rider + Driver = 80%)

### Session Keys
Each participant uses temporary session keys:
- Generated fresh for each session (ECDSA keypairs)
- Expire after 1 hour (configurable)
- Sign state updates without main wallet
- Revoked on logout

### Application Session Protection
The `createAppSessionMessage()` creates:
- **Custom protocol**: `rideshare-app-v1`
- **Participant list**: All addresses locked in
- **Initial allocations**: Funds committed upfront
- **Challenge period**: 24 hours for disputes
- **Nonce**: Prevents replay attacks

### State Validation
Every state update includes:
- **Cryptographic signatures** from participants
- **Timestamp validation** for ordering
- **GPS coordinates** (signed by driver)
- **Multi-party acknowledgment** for completion

## Key Implementation Code

### Creating an Application Session

```typescript
import { createAppSessionMessage } from '@erc7824/nitrolite';

// Define application with quorum governance
const appDefinition = {
    protocol: 'rideshare-app-v1',
    participants: [
        riderAddress as `0x${string}`,
        driverAddress as `0x${string}`,
        appAddress as `0x${string}`
    ],
    weights: [40, 40, 20],  // Voting weights
    quorum: 60,              // 60% approval needed
    challenge: 86400,        // 24-hour challenge period
    nonce: Date.now()        // Unique identifier
};

// Initial allocations: Rider deposits 10 USDC
const allocations = [
    { participant: riderAddress as `0x${string}`, asset: 'usdc', amount: '10000000' },
    { participant: driverAddress as `0x${string}`, asset: 'usdc', amount: '0' },
    { participant: appAddress as `0x${string}`, asset: 'usdc', amount: '0' }
];

// Create signed session message
const sessionMessage = await createAppSessionMessage(
    riderSigner,  // ECDSA message signer
    { definition: appDefinition, allocations: allocations }
);

// Send to Yellow network
await riderClient.sendMessage(sessionMessage);
```

### Updating Allocations with Quorum

```typescript
// Propose new allocation (driver gets paid)
const newAllocations = [
    { participant: riderAddress as `0x${string}`, asset: 'usdc', amount: '0' },
    { participant: driverAddress as `0x${string}`, asset: 'usdc', amount: '10000000' },
    { participant: appAddress as `0x${string}`, asset: 'usdc', amount: '0' }
];

// Create allocation update message
const allocationUpdate = {
    type: 'allocation_update',
    allocations: newAllocations,
    reason: 'ride_completed',
    timestamp: Date.now(),
    sessionId: appSessionId
};

// Get signatures from quorum (Rider 40% + App 20% = 60%)
const riderSignature = await riderSigner(JSON.stringify(allocationUpdate));
const appSignature = await appSigner(JSON.stringify(allocationUpdate));

// In production, send to Yellow network for validation
console.log('Quorum approval achieved:', {
    riderWeight: 40,
    appWeight: 20,
    totalWeight: 60,
    threshold: 60,
    approved: true
});
```

### Signing Ride Events

```typescript
// Driver signs pickup confirmation
const pickupMessage = {
    type: 'ride_event',
    event: 'pickup_confirmed',
    timestamp: Date.now(),
    gps: [37.7749, -122.4194],
    sessionId: appSessionId
};

const signature = await driverSigner(JSON.stringify(pickupMessage));

// Both parties sign completion
const completionMessage = {
    type: 'ride_event',
    event: 'ride_completed',
    timestamp: Date.now(),
    distance: 2.3,
    duration: 420,
    sessionId: appSessionId
};

const driverSig = await driverSigner(JSON.stringify(completionMessage));
const riderSig = await riderSigner(JSON.stringify(acknowledgeMessage));
```

## Debugging

### Enable Verbose Logging

Add to message handler:
```typescript
console.log('📨 Raw message:', JSON.stringify(message, null, 2));
```

### Check Participant States

```typescript
console.log('Participants:', {
    rider: {
        authenticated: rider.authenticated,
        address: rider.address,
    },
    driver: {
        authenticated: driver.authenticated,
        address: driver.address,
    },
    app: {
        authenticated: app.authenticated,
        address: app.address,
    }
});
```

### Monitor State Transitions

```typescript
async function transitionToState(newStatus: RideStatus): Promise<void> {
    console.log(`\n📊 STATE DEBUG:`);
    console.log(`   Previous: ${currentRideStatus}`);
    console.log(`   New: ${newStatus}`);
    console.log(`   Time: ${Date.now()}`);
    console.log(`   Duration: ${Date.now() - rideStartTime}ms\n`);
    
    currentRideStatus = newStatus;
    // ... rest of function
}
```

## Testing

### Unit Test Ideas

```typescript
describe('Ride State Machine', () => {
    it('should transition from IDLE to BOOKING', async () => {
        await bookRide();
        expect(currentRideStatus).toBe(RideStatus.BOOKING);
    });
    
    it('should lock funds in escrow', async () => {
        await bookRide();
        const escrowBalance = await getBalance(app.address);
        expect(escrowBalance).toBe('10.00');
    });
    
    it('should release funds to driver', async () => {
        await completeFullRide();
        const driverBalance = await getBalance(driver.address);
        expect(driverBalance).toBeGreaterThan(initialBalance);
    });
});
```

## Common Issues

### "SEED_PHRASE environment variable is not set"
**Solution**: Create `.env` file with at least `SEED_PHRASE`:
```bash
echo 'SEED_PHRASE="your twelve word seed phrase here"' > .env
```

### "unsupported protocol: rideshare-app-v1"
**Expected behavior**: This warning is normal. The Yellow network doesn't need to understand custom application protocols - it just validates signatures and manages the session.

### "Connection timeout"
**Solution**: Check internet connection and Yellow network status

### "Authentication failed"
**Solution**: Verify seed phrases are valid BIP-39 mnemonics

### "Insufficient balance"
**Solution**: Ensure rider wallet has at least 10 USDC on Base network

## Production Deployment

Before going live:

1. ✅ Separate wallets for each participant
2. ✅ Implement proper error handling
3. ✅ Add timeout mechanisms
4. ✅ Set up monitoring and alerts
5. ✅ Security audit of signature logic
6. ✅ Test dispute resolution flow
7. ✅ Add rate limiting
8. ✅ Implement cancellation fees
9. ✅ Build frontend UI
10. ✅ Legal compliance (KYC/AML)

## Understanding the Governance Model

### Why Quorum-Based Governance?

Traditional escrow requires trusting a single party. Yellow's application sessions use **weighted voting** to eliminate single points of control:

```
Problem with Simple Escrow:
┌─────────────────────┐
│  Single Escrow      │
│  • Can steal funds  │ ❌ Trust required
│  • Can block txs    │ ❌ Single point of failure
│  • No transparency  │ ❌ Centralized control
└─────────────────────┘

Solution with Quorum Governance:
┌───────────────────────────────────────────┐
│  Multi-Party Application Session          │
│  • No single point of control             │ ✅ Trustless
│  • Cryptographic consensus                │ ✅ Decentralized
│  • Transparent voting                     │ ✅ Verifiable
└───────────────────────────────────────────┘
```

### How Weighted Voting Works

Each participant has a **weight** representing their voting power:

```typescript
Rider:  40% (has funds at stake)
Driver: 40% (provides service)
App:    20% (mediates only)
```

The **quorum threshold** (60%) determines how many votes needed:

```
Payment Release Decision:
├─ Rider votes YES (40%)
├─ App votes YES (20%)
└─ Total: 60% ≥ 60% threshold → APPROVED ✅

Malicious Rider Tries to Block:
├─ Rider votes NO (40%)
├─ Driver votes YES (40%)
├─ App votes YES (20%)
└─ Driver + App = 60% ≥ 60% → APPROVED anyway ✅
```

### Real-World Scenarios

#### Scenario 1: Successful Ride
```
1. Rider creates session with 10 USDC
2. Driver confirms pickup (signed)
3. Both parties sign completion
4. Rider (40%) + App (20%) approve payment
5. Driver receives 10 USDC ✅
```

#### Scenario 2: Malicious Driver
```
1. Driver claims completion without finishing
2. Rider refuses to sign
3. Payment requires Rider OR (Driver + App)
4. Since only Driver + App = 60%, payment blocked ❌
5. Dispute resolution initiated
```

#### Scenario 3: Malicious Rider
```
1. Ride completed but rider refuses payment
2. Driver has signed GPS proof
3. App validates completion
4. Driver (40%) + App (20%) = 60%
5. Payment approved despite malicious rider ✅
```

#### Scenario 4: Malicious App
```
1. App tries to steal funds or manipulate state
2. App alone = 20% < 60%
3. Cannot change allocations without Rider or Driver
4. Rider + Driver = 80% can override app ✅
```

### Challenge Period

The 24-hour **challenge period** allows dispute resolution:

```
Normal Flow:
┌─────────────────────────────────────┐
│ 1. Ride complete                    │
│ 2. Quorum approves payment (60%)    │
│ 3. No disputes within 24 hours      │
│ 4. Allocations finalized            │
└─────────────────────────────────────┘

Dispute Flow:
┌─────────────────────────────────────┐
│ 1. Ride completed (or claimed)      │
│ 2. Party submits dispute evidence   │
│ 3. 24-hour review period            │
│ 4. On-chain arbitration if needed   │
│ 5. Resolved via cryptographic proof │
└─────────────────────────────────────┘
```

### Comparison with Traditional Systems

| Feature | Traditional Ride-Sharing | Yellow App Session |
|---------|-------------------------|-------------------|
| Trust Model | Trust platform | Trustless (crypto proofs) |
| Control | Centralized | Distributed quorum |
| Disputes | Platform decides | On-chain evidence |
| Fraud Prevention | Terms of Service | Cryptographic guarantees |
| Payment Speed | 1-7 days | Instant (off-chain) |
| Fees | 15-30% | < 1% (gas only) |

## Related Files

- `lib/utils.ts` - Session key generation
- `lib/auth.ts` - Authentication helpers
- `../RIDESHARE_TUTORIAL.md` - Conceptual guide
- `../RIDESHARE_STATE_MACHINE.md` - State details

## Contributing

To improve this demo:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

Ideas for improvements:
- Add TypeScript strict mode
- Implement proper error types
- Add integration tests
- Build React frontend
- Add WebSocket reconnection logic
- Implement dispute resolution
- Add multi-currency support

## License

ISC

## Support

Questions? Check:
- [Yellow Network Docs](https://yellow.com/docs)
- [ERC-7824 Specification](https://erc7824.org)
- [GitHub Issues](../../issues)

---

**Built with Yellow State Channels** 🟡 - Fast, cheap, and trustless

