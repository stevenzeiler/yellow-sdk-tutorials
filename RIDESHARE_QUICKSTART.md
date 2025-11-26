# Ride-Sharing Demo - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This demo shows how to build a trustless ride-sharing payment system using **Yellow application sessions** with quorum-based governance.

### Prerequisites
- Node.js v16+
- 3 Base network wallets with seed phrases
- Basic understanding of TypeScript

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# You can use the same seed phrase for all three in testing
# (but separate wallets in production)
RIDER_SEED_PHRASE="your seed phrase here"
DRIVER_SEED_PHRASE="your seed phrase here"
APP_SEED_PHRASE="your seed phrase here"
```

### Step 3: Run the Demo

```bash
npm run rideshare
```

## 🎯 What Makes This Special

This demo uses **application sessions** instead of simple transfers:

✅ **Quorum Governance**: 60% approval threshold (2 out of 3 parties)  
✅ **Weighted Voting**: Rider 40%, Driver 40%, App 20%  
✅ **No Escrow Address**: Funds locked in multi-party state channel  
✅ **Challenge Period**: 24-hour dispute resolution window  
✅ **Off-Chain State**: Instant updates without blockchain transactions

## 📋 What You'll See

The demo simulates a complete ride-sharing transaction:

```
🌟 YELLOW APPLICATION SESSIONS - RIDE-SHARING DEMO
   Using quorum-based governance for trustless payments
   Multi-party state channels with weighted voting

🔧 Initializing RIDER...
   Wallet address: 0x1234...
   Session key: 0x5678...
   ✅ Connected to Yellow network

🔧 Initializing DRIVER...
   [similar output]

🔧 Initializing APP...
   [similar output]

📋 GOVERNANCE CONFIGURATION
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

🔐 Authenticating all participants...
   ✅ RIDER authenticated
   ✅ DRIVER authenticated
   ✅ APP authenticated

🚕 STARTING RIDE-SHARING SIMULATION

📱 Step 1: CREATING APPLICATION SESSION
   Protocol: rideshare-app-v1
   Quorum threshold: 60%
   
   👥 Participants:
      Rider:  0x1234... (40% weight)
      Driver: 0x5678... (40% weight)
      App:    0x9abc... (20% weight)
   
   💰 Initial Allocations:
      Rider:  10.0 USDC
      Driver: 0 USDC
      App:    0 USDC
   
   📤 Sending application session to Yellow network...

📍 STATE TRANSITION: creating_session → session_created
   ✅ Application session ready with quorum governance
   💰 Rider deposited 10.0 USDC into session

📍 STATE TRANSITION: session_created → ride_booked
   📱 Ride booked! Waiting for driver...

🚗 Step 2: DRIVER PICKUP
   Driver is arriving at pickup location...
   GPS coordinates: [37.7749, -122.4194] (San Francisco)
   ✏️  Driver signing pickup confirmation...
   ✅ Driver confirmed arrival
   🚪 Rider entered vehicle

📍 STATE TRANSITION: ride_booked → pickup_confirmed
   🚗 Driver confirmed pickup!

📍 STATE TRANSITION: pickup_confirmed → ride_in_progress
   🚦 Ride in progress...

🏁 Step 3: RIDE COMPLETION
   🕐 Ride duration: 7 seconds
   📍 Destination reached: [37.7849, -122.4094]
   📏 Distance: 2.3 miles
   ✏️  Driver signing ride completion...
   ✅ Driver marked ride as complete
   ✏️  Rider signing acknowledgment...
   ✅ Rider confirmed arrival

📍 STATE TRANSITION: ride_in_progress → ride_completed
   🏁 Ride completed! Updating allocations with quorum approval...

💸 Step 4: UPDATING ALLOCATIONS WITH QUORUM
   App validating ride completion...
   
   💰 Proposed New Allocations:
      Rider:  0 USDC
      Driver: 10.0 USDC ⬆️
      App:    0 USDC
   
   ✏️  Getting quorum signatures...
      ✅ Rider signed (40% weight)
      ✅ App signed (20% weight)
      ⚖️  Total: 60% (meets quorum threshold)
   
   📤 Sending allocation update to Yellow network...

📍 STATE TRANSITION: ride_completed → allocations_updated
   ✅ Payment successful! Driver received 10.0 USDC
   ⚖️ Quorum validation: RIDER (40%) + APP (20%) = 60% ✓

🎉 RIDE-SHARING DEMO COMPLETED SUCCESSFULLY!

📊 Final Session State:
   Session ID: session-1234567890
   Protocol: rideshare-app-v1
   Quorum: 60%
   Status: Completed ✓
```

## 🎯 Key Features Demonstrated

1. **Application Sessions**: Custom protocol with quorum-based governance
2. **Multi-Party State Channels**: Three independent participants with weighted voting
3. **Quorum Approval**: 60% threshold ensures no single party has full control
4. **Allocation Updates**: Change fund distribution with multi-sig approval
5. **Off-Chain State**: Instant updates without blockchain transactions
6. **Challenge Period**: 24-hour window for dispute resolution

## 🏗️ Architecture Overview

```
        Application Session (rideshare-app-v1)
┌──────────────────────────────────────────────────┐
│  Governance: 60% Quorum, 24h Challenge Period    │
│  ┌─────────────────────────────────────────────┐ │
│  │  Participants with Weighted Voting:         │ │
│  │                                              │ │
│  │  RIDER (40%)      DRIVER (40%)    APP (20%) │ │
│  │  • Creates session  • Signs pickup  • Validates │
│  │  • Deposits 10 USDC • Completes ride • Approves │
│  │  • Approves payment • Receives $     • Mediates │
│  │                                              │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Allocations (updated with quorum approval):     │
│  ┌─────────────────────────────────────────────┐ │
│  │ Initial:  [Rider: 10 USDC, Driver: 0]      │ │
│  │ Final:    [Rider: 0, Driver: 10 USDC]      │ │
│  └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
                       │
          ┌────────────▼─────────────┐
          │   Yellow Network ClearNode│
          │   Off-chain State Updates │
          └──────────────────────────┘
```

## 📖 Understanding the Code

The demo follows this structure:

### Initialization Phase
```typescript
// Create three separate participants
const rider = await initializeParticipant('rider', 'RIDER_SEED_PHRASE');
const driver = await initializeParticipant('driver', 'DRIVER_SEED_PHRASE');
const app = await initializeParticipant('app', 'APP_SEED_PHRASE');
```

### Authentication Phase
```typescript
// Each participant authenticates independently
await authenticateParticipant(rider);
await authenticateParticipant(driver);
await authenticateParticipant(app);
```

### Transaction Flow
```typescript
1. bookRide()           // Rider locks 10 USDC
2. simulatePickup()     // Driver confirms pickup
3. simulateRideCompletion() // Both parties confirm
4. releaseFunds()       // App releases payment to driver
```

## 🔍 Code Walkthrough

### File: `scripts/rideshare_demo.ts`

**Key Components:**

- **RideStatus Enum** (lines 35-44): Tracks ride state
- **Participant Interface** (lines 46-54): Represents each party
- **initializeParticipant()** (lines 64-93): Sets up wallets and connections
- **authenticateParticipant()** (lines 98-118): Handles auth flow
- **State Transitions** (lines 156-180): Manages ride lifecycle
- **Payment Flow** (lines 199-263): Implements escrow and release

## 🛠️ Customization

### Change Ride Fare

```typescript
const RIDE_FARE = '25.00'; // Change from 10.00 to 25.00 USDC
```

### Adjust Timing

```typescript
setTimeout(() => simulatePickup(), 5000); // Wait 5 seconds instead of 2
```

### Add Logging

```typescript
console.log(`💰 Current balance:`, await getRiderBalance());
```

## 🐛 Troubleshooting

### "Environment variable is not set"
- Ensure `.env` file exists in project root
- Check variable names match exactly (RIDER_SEED_PHRASE, etc.)

### Connection timeout
- Verify internet connection
- Check if Yellow network is accessible
- Ensure WebSocket connections aren't blocked by firewall

### Authentication fails
- Verify seed phrases are valid BIP-39 mnemonics
- Ensure wallets have been initialized on Base network
- Check that session expiration times are in the future

## 📚 Next Steps

1. **Read the full tutorial**: [RIDESHARE_TUTORIAL.md](./RIDESHARE_TUTORIAL.md)
2. **Explore the code**: Open `scripts/rideshare_demo.ts`
3. **Modify the demo**: Try changing fare amounts or state logic
4. **Build your own**: Use this as a template for other multi-party apps

## 🔗 Resources

- [Yellow Network Docs](https://yellow.com/docs)
- [ERC-7824 Specification](https://erc7824.org)
- [State Channels Explained](https://statechannels.org)
- [Viem Documentation](https://viem.sh)

## 💡 Use Cases

This pattern can be adapted for:
- ✅ Freelance payment escrow
- ✅ Multi-party contract execution
- ✅ Rental agreements (cars, property)
- ✅ Service marketplaces
- ✅ Gaming tournaments with prize pools
- ✅ Crowdfunding with milestone releases

---

**Built with Yellow State Channels** - Making decentralized applications fast, cheap, and trustless 🟡

