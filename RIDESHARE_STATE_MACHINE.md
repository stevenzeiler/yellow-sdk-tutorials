# Ride-Sharing State Machine

## State Transition Diagram

```
                    ┌─────────────────────────────────────┐
                    │         START APPLICATION           │
                    └──────────────┬──────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │         IDLE             │ ◄─────┐
                    │  • No active ride        │       │
                    │  • Waiting for booking   │       │
                    └──────────┬───────────────┘       │
                               │                       │
                    User books ride                    │
                               │                       │
                               ▼                       │
                    ┌──────────────────────────┐      │
                    │       BOOKING            │      │
                    │  • Creating transaction  │      │
                    │  • Locking funds         │      │
                    └──────────┬───────────────┘      │
                               │                       │
                    Funds locked in escrow             │
                               │                       │
                               ▼                       │
                    ┌──────────────────────────┐      │
                    │     RIDE_BOOKED          │      │
                    │  • 10 USDC in escrow     │      │
                    │  • Waiting for driver    │      │
                    └──────────┬───────────────┘      │
                               │                       │
                    Driver confirms pickup             │
                               │                       │
                               ▼                       │
                    ┌──────────────────────────┐      │
                    │   PICKUP_CONFIRMED       │      │
                    │  • Driver at location    │      │
                    │  • Rider entering        │      │
                    └──────────┬───────────────┘      │
                               │                       │
                    Ride starts                        │
                               │                       │
                               ▼                       │
                    ┌──────────────────────────┐      │
                    │   RIDE_IN_PROGRESS       │      │
                    │  • Driver transporting   │      │
                    │  • GPS tracking active   │      │
                    └──────────┬───────────────┘      │
                               │                       │
                    Destination reached                │
                               │                       │
                               ▼                       │
                    ┌──────────────────────────┐      │
                    │   RIDE_COMPLETED         │      │
                    │  • Both parties confirm  │      │
                    │  • Validating completion │      │
                    └──────────┬───────────────┘      │
                               │                       │
                    App releases funds                 │
                               │                       │
                               ▼                       │
                    ┌──────────────────────────┐      │
                    │   FUNDS_RELEASED         │      │
                    │  • Payment to driver     │      │
                    │  • Transaction complete  │      │
                    └──────────┬───────────────┘      │
                               │                       │
                               └───────────────────────┘
```

## State Details

### 1. IDLE
**Description**: System waiting for new ride request

**Participants Active**: All (Rider, Driver, App)

**Actions Available**:
- Rider can initiate booking
- Driver can go online/offline
- App monitors network

**Transitions From**: 
- Application start
- FUNDS_RELEASED (after previous ride)

**Transitions To**: BOOKING

---

### 2. BOOKING
**Description**: Ride request being processed, funds being locked

**Duration**: ~1-2 seconds

**Actions**:
- Rider creates transfer message
- Rider signs transaction with session key
- Funds transferred to app escrow address
- Yellow network validates transaction

**Signatures Required**:
- ✅ Rider session key signature

**Transitions To**: RIDE_BOOKED (on successful escrow)

**Failure Cases**:
- Insufficient balance → Return to IDLE
- Network error → Retry or return to IDLE

---

### 3. RIDE_BOOKED
**Description**: Funds locked, waiting for driver acceptance

**Duration**: Variable (until driver accepts)

**State Data**:
```typescript
{
    rideId: string,
    riderId: address,
    driverId: address,
    fare: "10.00 USDC",
    escrowAddress: address,
    bookingTime: timestamp,
    pickupLocation: GPS
}
```

**Actions**:
- Driver receives notification
- Driver reviews ride details
- App monitors timeout

**Transitions To**: PICKUP_CONFIRMED

**Timeout**: If no driver accepts within N minutes → CANCELLED + Refund

---

### 4. PICKUP_CONFIRMED
**Description**: Driver confirmed arrival at pickup location

**Duration**: ~5-30 seconds (rider entering vehicle)

**Actions**:
- Driver signs pickup confirmation
- GPS coordinates validated
- Rider acknowledges driver presence
- App verifies location proximity

**Signatures Required**:
- ✅ Driver session key signature
- ✅ GPS data signed by driver

**Transitions To**: RIDE_IN_PROGRESS

---

### 5. RIDE_IN_PROGRESS
**Description**: Active ride, driver transporting rider

**Duration**: Variable (length of ride)

**Real-time Data**:
- Current GPS location (driver)
- Route tracking
- ETA updates
- Distance traveled

**Actions**:
- GPS updates every N seconds
- App monitors route
- Rider can track progress
- Emergency buttons active

**Transitions To**: RIDE_COMPLETED

**Special Cases**:
- Emergency stop → DISPUTED
- Route deviation → Warning
- Excessive duration → Review

---

### 6. RIDE_COMPLETED
**Description**: Destination reached, waiting for confirmations

**Duration**: ~5-10 seconds

**Actions**:
- Driver marks as complete
- Driver signs completion
- Rider confirms arrival
- Rider signs acknowledgment
- App validates both signatures

**Signatures Required**:
- ✅ Driver session key signature (completion)
- ✅ Rider session key signature (confirmation)
- ✅ App validation signature

**Data Recorded**:
```typescript
{
    completionTime: timestamp,
    finalLocation: GPS,
    totalDistance: number,
    duration: number,
    driverSignature: signature,
    riderSignature: signature
}
```

**Transitions To**: FUNDS_RELEASED (on multi-sig validation)

**Failure Cases**:
- Rider disputes → DISPUTED state
- Signatures don't match → DISPUTED state

---

### 7. FUNDS_RELEASED
**Description**: Payment released to driver, ride complete

**Duration**: ~1-2 seconds

**Actions**:
- App creates transfer from escrow to driver
- App signs transfer with session key
- Yellow network processes payment
- Driver receives confirmation
- Rider receives receipt

**Signatures Required**:
- ✅ App/Escrow signature (fund release)

**Final State Data**:
```typescript
{
    paymentAmount: "10.00 USDC",
    driverAddress: address,
    paymentTime: timestamp,
    transactionHash: string (if settled on-chain),
    receipt: {
        ride: rideDetails,
        payment: paymentDetails,
        ratings: { driver: number, rider: number }
    }
}
```

**Transitions To**: IDLE (system ready for next ride)

---

## Error States (Not Shown in Main Flow)

### CANCELLED
**Entry Points**:
- From RIDE_BOOKED (no driver found)
- From RIDE_BOOKED (rider cancels)
- From PICKUP_CONFIRMED (driver cancels)

**Actions**:
- Refund rider from escrow
- Cancel fees (if applicable)
- Return to IDLE

### DISPUTED
**Entry Points**:
- From RIDE_COMPLETED (disagreement)
- From RIDE_IN_PROGRESS (emergency)

**Actions**:
- Freeze escrow funds
- Collect evidence (GPS logs, signatures)
- Human or DAO review
- Resolve dispute:
  - Full payment to driver
  - Full refund to rider
  - Partial split

**Resolution**:
- Distribute funds based on ruling
- Return to IDLE

### TIMEOUT
**Entry Points**:
- From RIDE_BOOKED (no pickup after N minutes)
- From PICKUP_CONFIRMED (rider no-show)

**Actions**:
- Auto-cancel ride
- Apply cancellation fees (if policy)
- Refund or partial refund

---

## Multi-Signature Requirements by State

| State | Rider Sig | Driver Sig | App Sig | Purpose |
|-------|-----------|------------|---------|---------|
| BOOKING | ✅ | - | - | Lock funds |
| RIDE_BOOKED | - | - | ✅ | Validate escrow |
| PICKUP_CONFIRMED | - | ✅ | ✅ | Confirm pickup |
| RIDE_IN_PROGRESS | - | ✅ | ✅ | Start ride |
| RIDE_COMPLETED | ✅ | ✅ | - | Both confirm |
| FUNDS_RELEASED | - | - | ✅ | Release payment |

---

## Event Emissions

Each state transition emits events for logging and UI updates:

```typescript
interface StateTransitionEvent {
    previousState: RideStatus,
    newState: RideStatus,
    timestamp: number,
    participant: 'rider' | 'driver' | 'app',
    signatures: string[],
    data: any
}
```

**Example Event**:
```json
{
    "previousState": "PICKUP_CONFIRMED",
    "newState": "RIDE_IN_PROGRESS",
    "timestamp": 1701234567890,
    "participant": "driver",
    "signatures": ["0x123abc...", "0x456def..."],
    "data": {
        "gps": [37.7749, -122.4194],
        "vehicle": "Toyota Prius, Plate ABC123"
    }
}
```

---

## State Persistence

States are persisted in Yellow Network state channels:

```typescript
interface PersistedRideState {
    channelId: string,
    currentState: RideStatus,
    stateHistory: StateTransitionEvent[],
    participants: {
        rider: ParticipantInfo,
        driver: ParticipantInfo,
        app: ParticipantInfo
    },
    escrow: {
        amount: string,
        asset: 'usdc',
        locked: boolean,
        releaseConditions: Condition[]
    },
    metadata: {
        rideId: string,
        bookingTime: number,
        estimatedFare: string,
        route: GPS[]
    }
}
```

---

## State Machine Implementation

In `scripts/rideshare_demo.ts`, the state machine is implemented using:

### State Enum (lines 35-44)
```typescript
enum RideStatus {
    IDLE = 'idle',
    BOOKING = 'booking',
    RIDE_BOOKED = 'ride_booked',
    // ... etc
}
```

### State Transition Function (lines 156-180)
```typescript
async function transitionToState(newStatus: RideStatus): Promise<void> {
    const previousStatus = currentRideStatus;
    currentRideStatus = newStatus;
    console.log(`STATE TRANSITION: ${previousStatus} → ${newStatus}`);
    
    // Execute state-specific logic
    switch (newStatus) {
        case RideStatus.RIDE_BOOKED:
            // Handle booking completion
            break;
        // ... etc
    }
}
```

### Event Handlers
Each participant listens for events and triggers state transitions:
```typescript
participant.client.listen(async (message: RPCResponse) => {
    switch (message.method) {
        case RPCMethod.BalanceUpdate:
            await onBalanceUpdate(participant, message.params);
            break;
        // ... etc
    }
});
```

---

## Testing State Transitions

To test each state transition:

```typescript
// Test IDLE → BOOKING
await bookRide();

// Test BOOKING → RIDE_BOOKED
// (automatic on successful escrow)

// Test RIDE_BOOKED → PICKUP_CONFIRMED
await simulatePickup();

// Test PICKUP_CONFIRMED → RIDE_IN_PROGRESS
// (automatic after pickup confirmation)

// Test RIDE_IN_PROGRESS → RIDE_COMPLETED
await simulateRideCompletion();

// Test RIDE_COMPLETED → FUNDS_RELEASED
await releaseFunds();

// Test FUNDS_RELEASED → IDLE
// (automatic cleanup)
```

---

## Production Enhancements

For production deployment, consider:

1. **Timeout Guards**: Add timers for each state
2. **Retry Logic**: Handle network failures gracefully
3. **State Snapshots**: Periodic state backups
4. **Audit Trail**: Immutable log of all transitions
5. **Rollback Capability**: Revert to previous valid state
6. **Monitoring**: Alert on stuck states
7. **Rate Limiting**: Prevent state spam

---

**State machine ensures**: Atomicity, Consistency, Isolation, and Durability (ACID) for ride transactions 🟡


