# Building a Decentralized Ride-Sharing App with Yellow State Channels

## Overview

This tutorial demonstrates how to build a trustless ride-sharing payment system using Yellow **application sessions**. The app creates a multi-party state channel with quorum-based governance for three participants:

- **Rider**: The passenger who initiates and pays for the ride
- **Driver**: The service provider who completes the ride
- **App**: The platform that mediates the transaction

## The Problem We're Solving

Traditional ride-sharing apps require:
1. Users to trust a centralized platform with their funds
2. High transaction fees for on-chain settlements
3. Slow confirmation times for payments
4. Platform control over dispute resolution

## The Yellow Application Session Solution

Application sessions allow us to:
- **Create multi-party state channels** with defined governance
- **Lock funds with quorum rules** that require consensus
- **Update state off-chain** as the ride progresses with instant finality
- **Release funds based on multi-sig approval** without on-chain transactions
- **Minimize gas costs** by settling only the final state if needed

## Architecture

### Multi-Party Application Session

Our ride-sharing app uses a **3-party application session** with quorum-based governance:

1. **Rider** (Weight: 40%) - Deposits fare into the application session
2. **Driver** (Weight: 40%) - Receives payment upon ride completion
3. **App** (Weight: 20%) - Mediates and validates state transitions

**Quorum Threshold: 60%** - Requires at least 2 out of 3 participants to approve state changes

### Application Definition

```typescript
const appDefinition = {
    protocol: 'rideshare-app-v1',
    participants: [riderAddress, driverAddress, appAddress],
    weights: [40, 40, 20],  // Rider: 40%, Driver: 40%, App: 20%
    quorum: 60,              // Need 60% approval (2 out of 3)
    challenge: 86400,        // 24-hour challenge period
    nonce: Date.now()        // Unique session identifier
};
```

### State Transition Flow

```
1. SESSION CREATION
   Rider creates application session with initial allocations
   Initial state: Rider has 10 USDC in session
   Status: "ride_booked"
   
2. PICKUP CONFIRMATION
   Driver signs pickup acknowledgment
   App validates location
   Status: "ride_in_progress"
   
3. RIDE COMPLETION
   Driver signs completion
   Rider signs confirmation
   Status: "ride_completed"
   
4. FUND ALLOCATION UPDATE
   App proposes new allocation: Driver gets 10 USDC
   Quorum validates (2/3 signatures)
   Funds reallocated to driver within session
   Session can close or remain open
```

## Key Concepts

### Application Sessions

Instead of simple payment channels, **application sessions** provide:
- **Custom protocols**: Define your own business logic (e.g., "rideshare-app-v1")
- **Multi-party support**: More than 2 participants with different roles
- **Weighted voting**: Participants have different voting power
- **Quorum thresholds**: Define how many votes needed for decisions
- **State persistence**: Off-chain state that all parties agree upon

### Quorum-Based Governance

The quorum system enables trustless multi-party coordination:

```
Example: Quorum = 60%, Weights = [40, 40, 20]

Rider (40%) + Driver (40%) = 80% ✅ APPROVED
Rider (40%) + App (20%) = 60% ✅ APPROVED
Driver (40%) + App (20%) = 60% ✅ APPROVED
Rider (40%) alone = 40% ❌ REJECTED
Driver (40%) alone = 40% ❌ REJECTED
App (20%) alone = 20% ❌ REJECTED
```

This ensures no single party can unilaterally change the state.

### Session Allocations

Allocations define who owns what within the application session:

```typescript
// Initial allocation (rider deposits 10 USDC)
const initialAllocations = [
    { participant: riderAddress, asset: 'usdc', amount: '10000000' },  // 10 USDC
    { participant: driverAddress, asset: 'usdc', amount: '0' },
    { participant: appAddress, asset: 'usdc', amount: '0' }
];

// Final allocation (after successful ride)
const finalAllocations = [
    { participant: riderAddress, asset: 'usdc', amount: '0' },
    { participant: driverAddress, asset: 'usdc', amount: '10000000' },  // 10 USDC
    { participant: appAddress, asset: 'usdc', amount: '0' }
];
```

### Session Keys

Each participant generates a temporary **session key** for signing state updates:
- Derived from a master wallet via EIP-712 signature
- Limited lifetime (e.g., 1 hour)
- Used for fast, off-chain signatures
- Can be revoked without compromising main wallet

## Implementation Details

### 1. Environment Setup

Each participant needs:
- A unique seed phrase (wallet)
- Connection to Yellow network
- Session key generation
- Authentication with Yellow broker

```typescript
// Example for one participant
const seedPhrase = process.env.RIDER_SEED_PHRASE;
const account = mnemonicToAccount(seedPhrase);
const sessionKey = generateSessionKey();
```

### 2. Authentication Flow

For each participant:
1. Generate session key
2. Create auth request with scope and allowances
3. Handle auth challenge
4. Sign with EIP-712 signature
5. Receive auth verification

```typescript
const authMessage = await createAuthRequestMessage({
    address: account.address,
    session_key: sessionKey.address,
    app_name: 'YellowRide',
    scope: 'rideshare.app',
    expire: sessionExpireTimestamp,
    application: appAddress,
});
```

### 3. Create Application Session

When a ride is booked, create a multi-party application session:

```typescript
import { createAppSessionMessage } from '@erc7824/nitrolite';

// Define the rideshare application protocol
const appDefinition = {
    protocol: 'rideshare-app-v1',
    participants: [riderAddress, driverAddress, appAddress],
    weights: [40, 40, 20],
    quorum: 60,
    challenge: 86400,  // 24-hour challenge period
    nonce: Date.now()
};

// Initial allocations: Rider deposits 10 USDC
const allocations = [
    { participant: riderAddress, asset: 'usdc', amount: '10000000' },
    { participant: driverAddress, asset: 'usdc', amount: '0' },
    { participant: appAddress, asset: 'usdc', amount: '0' }
];

// Create and sign the session message
const sessionMessage = await createAppSessionMessage(
    riderSigner,
    [{ definition: appDefinition, allocations }]
);

// Send to Yellow network
await riderClient.sendMessage(sessionMessage);
```

### 4. State Updates During Ride

Each state transition is a signed message within the application session:

**Pickup confirmation:**
```typescript
// Driver signs pickup event
const pickupMessage = {
    type: 'ride_event',
    event: 'pickup_confirmed',
    timestamp: Date.now(),
    gps: [37.7749, -122.4194]
};

const signature = await driverSigner(JSON.stringify(pickupMessage));

// Send through app session
await driverClient.sendMessage({
    ...pickupMessage,
    signature,
    participant: driverAddress
});
```

**Ride completion:**
```typescript
// Driver signs completion
const completionMessage = {
    type: 'ride_event',
    event: 'ride_completed',
    timestamp: Date.now(),
    distance: 2.3,
    duration: 420  // 7 minutes
};

const driverSig = await driverSigner(JSON.stringify(completionMessage));

// Rider acknowledges
const acknowledgeMessage = {
    type: 'ride_event',
    event: 'completion_acknowledged',
    timestamp: Date.now()
};

const riderSig = await riderSigner(JSON.stringify(acknowledgeMessage));
```

### 5. Update Allocations with Quorum

Upon successful completion, update allocations to pay the driver:

```typescript
// Propose new allocation (driver gets paid)
const newAllocations = [
    { participant: riderAddress, asset: 'usdc', amount: '0' },
    { participant: driverAddress, asset: 'usdc', amount: '10000000' },
    { participant: appAddress, asset: 'usdc', amount: '0' }
];

// Create allocation update message
const allocationUpdate = {
    type: 'allocation_update',
    allocations: newAllocations,
    reason: 'ride_completed',
    timestamp: Date.now()
};

// Get signatures from quorum (Rider + App = 60%)
const riderSignature = await riderSigner(JSON.stringify(allocationUpdate));
const appSignature = await appSigner(JSON.stringify(allocationUpdate));

// Send update with quorum signatures
const updateMessage = {
    ...allocationUpdate,
    signatures: [
        { participant: riderAddress, signature: riderSignature },
        { participant: appAddress, signature: appSignature }
    ]
};

await riderClient.sendMessage(updateMessage);
```

## Security Considerations

### Quorum Protection

The quorum system protects against:
- **Malicious rider**: Can't refuse payment (Driver + App = 60%)
- **Malicious driver**: Can't steal funds (Rider + App = 60%)
- **Malicious app**: Can't manipulate funds (Rider + Driver = 80%)

### Challenge Period

The 24-hour challenge period allows:
1. **Dispute resolution**: Submit evidence if disagreement
2. **On-chain fallback**: Move to blockchain if needed
3. **Fraud prevention**: Time to review unusual activity

### State Validation

Every state transition includes:
- **Signature verification**: Cryptographic proof of participant consent
- **Nonce checking**: Prevents replay attacks
- **Timestamp validation**: Ensures temporal ordering
- **Quorum verification**: Validates sufficient approval

## Benefits Over Traditional Systems

| Feature | Traditional | Yellow App Sessions |
|---------|------------|---------------------|
| Payment Speed | 2-5 business days | Instant (off-chain) |
| Transaction Fees | 15-30% | < 1% (only final settlement if needed) |
| Trust Model | Centralized platform | Quorum-based cryptographic proof |
| Dispute Resolution | Platform decides | On-chain evidence + challenge period |
| Privacy | Full data to platform | Minimal disclosure |
| Governance | Platform control | Multi-party consensus |

## Advanced Features

### Dynamic Quorum Adjustment

For different ride phases:
```typescript
// Booking phase: Only rider needs to approve
quorum: 40

// In-progress: Rider + Driver consensus
quorum: 60

// Completion: All three must agree
quorum: 100
```

### Multi-Hop Rides

Keep session open for:
- Multiple rides with same driver
- Subscription-based services
- Fleet management across multiple drivers
- Monthly settlement

### Tipping and Bonuses

Update allocations mid-ride:
```typescript
// Rider tips driver 2 USDC
const tipAllocations = [
    { participant: riderAddress, asset: 'usdc', amount: '8000000' },  // 8 USDC
    { participant: driverAddress, asset: 'usdc', amount: '2000000' }, // 2 USDC tip
    { participant: appAddress, asset: 'usdc', amount: '0' }
];
```

## Running the Demo

The demo script simulates all three parties on one machine using different seed phrases:

```bash
# Set environment variables
export RIDER_SEED_PHRASE="<rider_mnemonic>"
export DRIVER_SEED_PHRASE="<driver_mnemonic>"
export APP_SEED_PHRASE="<app_mnemonic>"

# Run the simulation
npm run rideshare
```

## Code Walkthrough

The implementation `scripts/rideshare_demo.ts` demonstrates:

1. **Setup Phase**: Initialize 3 Yellow clients (rider, driver, app)
2. **Auth Phase**: Authenticate each participant with their session keys
3. **Session Creation**: Create application session with quorum rules
4. **Pickup Phase**: Driver signs pickup, update session state
5. **Completion Phase**: Both parties sign completion
6. **Allocation Update**: Quorum approves payment to driver

## Next Steps

To build a production system:

1. **Add GPS verification**: Integrate location oracles into app session
2. **Implement challenge period**: Handle disputes during 24-hour window
3. **Build UI**: Mobile apps for riders and drivers
4. **Add reputation**: On-chain or off-chain rating system
5. **Scale to fleets**: Manage multiple concurrent sessions
6. **Optimize gas**: Batch final settlements, use L2s

## Conclusion

Yellow application sessions enable:
- ✅ Instant, trustless payments
- ✅ Minimal transaction costs
- ✅ Privacy-preserving interactions
- ✅ Cryptographic security guarantees
- ✅ Multi-party governance without central authority
- ✅ Flexible quorum-based decision making

This paradigm can extend beyond ride-sharing to any multi-party transaction requiring escrow, conditional releases, or collaborative decision-making.

## Resources

- [Yellow Network Documentation](https://yellow.com/docs)
- [ERC-7824 Nitrolite Specification](https://erc7824.org)
- [State Channel Explainer](https://statechannels.org)
- [Multi-Party Computation](https://en.wikipedia.org/wiki/Secure_multi-party_computation)
