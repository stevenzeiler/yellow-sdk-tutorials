# Yellow SDK Tutorial - Example Scripts for Developers

A TypeScript demo application showing how to connect to the Yellow network, authenticate using wallet signatures, and receive real-time balance updates using Nitrolite (ERC-7824).

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with your seed phrase
echo 'SEED_PHRASE="your seed phrase here"' > .env

# 3. Run the demo
npm start
```

## 📜 Example Scripts

The `./scripts` directory contains example scripts demonstrating various Nitrolite operations:

### Wallet Management

| Script | Description |
|--------|-------------|
| [`create_wallet.ts`](./scripts/create_wallet.ts) | Generate a new wallet with a 12-word seed phrase, private key, and Ethereum address |
| [`mnemonic_to_private_key.ts`](./scripts/mnemonic_to_private_key.ts) | Convert a mnemonic seed phrase to its corresponding private key |

### Channel Operations

| Script | Description |
|--------|-------------|
| [`create_channel.ts`](./scripts/create_channel.ts) | Create a USDC payment channel on Base with full on-chain execution via NitroliteClient |
| [`create_channel_demo.ts`](./scripts/create_channel_demo.ts) | Demonstration of creating a channel with on-chain transaction using the Nitrolite SDK |
| [`create_channel_demo_live.ts`](./scripts/create_channel_demo_live.ts) | Live demo variant of channel creation with on-chain execution |
| [`close_channel.ts`](./scripts/close_channel.ts) | Close an existing payment channel given its channel ID |
| [`list_account_channels.ts`](./scripts/list_account_channels.ts) | List all open channels for your account using NitroliteClient |
| [`resize_channel.ts`](./scripts/resize_channel.ts) | Resize a channel to add/remove funds between custody and channel (event-driven style) |
| [`resize_channel_inline.ts`](./scripts/resize_channel_inline.ts) | Resize a channel using async/await inline style (cleaner alternative) |
| [`resize_to_unified_ledger.ts`](./scripts/resize_to_unified_ledger.ts) | Move funds from channel to the Yellow unified ledger balance |

### Balance & Deposit Operations

| Script | Description |
|--------|-------------|
| [`deposit_to_custody.ts`](./scripts/deposit_to_custody.ts) | Deposit USDC to the custody contract on Base network |
| [`fund_channel.ts`](./scripts/fund_channel.ts) | Fund a channel by depositing to custody and checking ledger balances |
| [`get_custody_balance.ts`](./scripts/get_custody_balance.ts) | Fetch your on-chain custody balance for USDC on Base |
| [`get_ledger_balances.ts`](./scripts/get_ledger_balances.ts) | Fetch your Yellow ledger balances after authenticating |
| [`deposit_resize_allocate.ts`](./scripts/deposit_resize_allocate.ts) | Complete workflow: deposit → create channel → allocate → transfer → deallocate → withdraw |

### App Sessions

| Script | Description |
|--------|-------------|
| [`app_session_two_signers.ts`](./scripts/app_sessions/app_session_two_signers.ts) | Complete 2-party app session flow with equal voting (50/50, 100% quorum) |
| [`app_session_three_signers_weighted.ts`](./scripts/app_sessions/app_session_three_signers_weighted.ts) | 3-party weighted voting session (founder 50%, investors 30%/20%, 60% quorum) |
| [`update_app_session.ts`](./scripts/update_app_session.ts) | Update an existing app session's state with new allocations |
| [`close_app_session.ts`](./scripts/close_app_session.ts) | Close an app session given the session ID |

📚 **[Read the complete App Sessions Tutorial →](./scripts/app_sessions/README.md)**

### Transfers

| Script | Description |
|--------|-------------|
| [`connect_wallet_and_tip.ts`](./scripts/connect_wallet_and_tip.ts) | Connect to Yellow and send a transfer (tip) to another address |

### Configuration

| Script | Description |
|--------|-------------|
| [`get_config.ts`](./scripts/get_config.ts) | Fetch Yellow network configuration including custody contract addresses |

### Running Scripts

All scripts can be run using tsx:

```bash
# Run any script
npx tsx scripts/<script_name>.ts

# Examples:
npx tsx scripts/create_wallet.ts
npx tsx scripts/get_ledger_balances.ts
npx tsx scripts/deposit_to_custody.ts --amount 1.0
npx tsx scripts/resize_channel.ts --channel-id 0x123... --allocate 0.5
npx tsx scripts/close_app_session.ts --session-id 0x456...
```

## 🎯 What This Demo Does

This tutorial demonstrates the complete authentication flow for Nitrolite state channels:

1. **Wallet Setup**: Derives a wallet from a seed phrase using viem
2. **Session Key Generation**: Creates a temporary session key for secure communication
3. **WebSocket Connection**: Connects to the Yellow clearnet endpoint
4. **Authentication Flow**: 
   - Sends authentication request with session key
   - Receives challenge from server
   - Signs challenge with EIP-712 signature
   - Completes verification and receives authentication
5. **Real-time Updates**: Listens for balance updates, channel updates, and asset information

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- A **seed phrase** (12 or 24-word mnemonic) for a Base network wallet
- Basic understanding of TypeScript and async/await

## 🚀 Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
SEED_PHRASE="your twelve or twenty four word seed phrase goes here"
```

⚠️ **Security Warning**: Never commit your `.env` file or share your seed phrase. Add `.env` to your `.gitignore`.

### 3. Verify TypeScript Configuration

The project includes a `tsconfig.json` with proper settings for Node.js and TypeScript compilation.

## 📦 Dependencies

- **@erc7824/nitrolite** (^0.4.0) - Core Nitrolite protocol implementation
- **yellow-ts** (^0.0.3) - WebSocket client for Yellow network communication
- **viem** (^2.39.2) - Ethereum wallet and cryptography utilities
- **dotenv** (^17.2.3) - Environment variable management

## 📁 Project Structure

```
nitrolite-tutorial/
├── connect_auth_get_balances.ts  # Main demo program
├── lib/
│   └── utils.ts                  # Helper functions (session key generation)
├── .env                          # Environment variables (create this)
├── .gitignore                    # Git ignore rules
├── package.json                  # Project dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🏃 Running the Demo

### Option 1: Using npm script (recommended)

```bash
npm start
```

### Option 2: Using tsx directly

```bash
npx tsx connect_auth_get_balances.ts
```

### Option 3: Watch mode (auto-restart on file changes)

```bash
npm run dev
```

### Expected Output

```
Wallet address: 0x1234...5678
Yellow connected
Session signer [Object]
Auth message created {"method":"auth_request",...}
Current block number: 12345678
Auth Challenge {...}
Auth verify {"success":true}
Balances {...}
Channels {...}
```

## 📚 Code Walkthrough

### 1. Wallet Derivation (`lines 28-42`)

```typescript
const account = mnemonicToAccount(seedPhrase);
const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(),
})
```

Converts your seed phrase into a wallet account using viem's BIP-39 implementation.

### 2. Session Key Generation (`line 43`)

```typescript
const sessionKey = generateSessionKey();
```

Creates a temporary keypair for this session. This allows the server to verify your requests without requiring you to sign every single message with your main wallet.

**Why Session Keys?**
- Reduces signing overhead
- Improves UX (fewer wallet popups)
- Enhanced security (temporary credentials)

### 3. Authentication Request (`lines 59-68`)

```typescript
const authMessage = await createAuthRequestMessage({
    address: account.address,
    session_key: sessionKey.address,
    app_name: APP_NAME,
    allowances: [],
    expire: sessionExpireTimestamp,
    scope: AUTH_SCOPE,
    application: account.address,
});
```

Creates a structured authentication request with:
- Your wallet address
- Temporary session key address
- Application name and scope
- Expiration time (1 hour in this demo)
- RPC allowances (permissions)

### 4. WebSocket Message Handling (`lines 72-118`)

The `yellow.listen()` callback handles different message types asynchronously:

#### AuthChallenge (`lines 76-93`)

When the server challenges your authentication:
1. Receive the challenge nonce
2. Create EIP-712 signature with your main wallet
3. Send verification message back

```typescript
if (response.method === RPCMethod.AuthChallenge) {
    const eip712Signer = createEIP712AuthMessageSigner(
        walletClient, 
        authParams, 
        { name: APP_NAME }
    );
    const authVerifyMessage = await createAuthVerifyMessage(
        eip712Signer, 
        response
    );
    await yellow.sendMessage(authVerifyMessage);
}
```

#### Balance Updates (`lines 114-116`)

Real-time balance updates pushed from the server:

```typescript
if (response.method === RPCMethod.BalanceUpdate) {
    console.log(`Balances`, response.params);
}
```

### 5. Message Types Reference

The demo handles several RPC message types:

| Message Type | Direction | Description |
|--------------|-----------|-------------|
| `AuthChallenge` | Server → Client | Challenge nonce for authentication |
| `AuthVerify` | Server → Client | Authentication success confirmation |
| `Assets` | Server → Client | Available asset information |
| `BalanceUpdate` | Server → Client | Real-time balance changes |
| `ChannelsUpdate` | Server → Client | Channel state updates |
| `Error` | Server → Client | Error notifications |

## 🔄 Authentication Flow Diagram

```
┌─────────────┐                    ┌──────────────┐
│   Client    │                    │    Yellow    │
│  (Your App) │                    │    Server    │
└──────┬──────┘                    └──────┬───────┘
       │                                  │
       │  1. Connect WebSocket            │
       ├─────────────────────────────────>│
       │                                  │
       │  2. Send Auth Request            │
       │     (with session key)           │
       ├─────────────────────────────────>│
       │                                  │
       │  3. Receive Auth Challenge       │
       │     (nonce to sign)              │
       │<─────────────────────────────────┤
       │                                  │
       │  4. Sign with EIP-712            │
       │     (using main wallet)          │
       │                                  │
       │  5. Send Auth Verify             │
       │     (signed challenge)           │
       ├─────────────────────────────────>│
       │                                  │
       │  6. Receive Auth Success         │
       │     (JWT token)                  │
       │<─────────────────────────────────┤
       │                                  │
       │  7. Real-time Updates            │
       │     (balances, channels, etc)    │
       │<═════════════════════════════════│
       │                                  │
```

## 🔑 Key Concepts

### EIP-712 Signatures

Nitrolite uses [EIP-712](https://eips.ethereum.org/EIPS/eip-712) for structured data signing. This provides:
- Human-readable signature requests
- Type safety
- Domain separation (prevents replay attacks)

### State Channels

Nitrolite implements state channels for:
- **Instant transactions** (no waiting for blocks)
- **Low costs** (minimal on-chain transactions)
- **High throughput** (thousands of transactions per second)
- **Privacy** (off-chain state)

### Yellow Network

Yellow is the WebSocket gateway for Nitrolite, providing:
- Real-time communication
- Automatic reconnection
- Message queuing
- Load balancing

## 🛠️ Utility Functions

### `generateSessionKey()` (`lib/utils.ts`)

```typescript
export const generateSessionKey = (): SessionKey => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    return { privateKey, address: account.address };
};
```

Generates a fresh ECDSA keypair for session authentication.

## ⚙️ Configuration Options

You can customize several parameters in `connect_auth_get_balances.ts`:

### Session Duration
```typescript
const SESSION_DURATION = 3600; // 1 hour in seconds
```
- Adjust based on your security requirements
- Shorter = more secure, but requires re-authentication
- Longer = better UX, but higher risk if compromised

### Auth Scope
```typescript
const AUTH_SCOPE = 'test.app';
```
- Identifies your application
- Used for domain separation in EIP-712 signatures
- Should be unique to your app

### App Name
```typescript
const APP_NAME = 'Test app';
```
- Displayed in wallet signature prompts
- Helps users identify what they're signing

### Chain Configuration
```typescript
chain: base,  // Can be changed to other supported chains
```
- Current: Base (Ethereum L2)
- Other options depend on Nitrolite deployment

## 🔐 Security Best Practices

1. **Never hardcode seed phrases** - Always use environment variables
2. **Use session keys** - Don't sign every message with your main wallet
3. **Set appropriate expiration times** - Session keys should expire after reasonable periods
4. **Validate all incoming messages** - Parse and verify message types
5. **Handle errors gracefully** - Implement proper error handling for network issues

## 🐛 Troubleshooting

### "SEED_PHRASE environment variable is not set"
- Ensure `.env` file exists in the project root
- Verify the variable name is exactly `SEED_PHRASE`
- Check that dotenv is being loaded with `config()`

### Connection Errors
- Verify internet connectivity
- Check if Yellow network is accessible
- Ensure no firewall blocking WebSocket connections

### Authentication Failures
- Verify your seed phrase is valid
- Check that the wallet has been used on Base network
- Ensure session expiration time is in the future

## 📖 Additional Resources

- [Nitrolite Documentation](https://erc7824.org/)
- [ERC-7824 Specification](https://eips.ethereum.org/EIPS/eip-7824)
- [Viem Documentation](https://viem.sh/)
- [Base Network](https://base.org/)

## 🎓 Next Steps

1. **Channel Creation**: Extend the demo to create payment channels
2. **Deposits**: Add functionality to deposit funds
3. **State Updates**: Implement channel state updates
4. **Balance Tracking**: Build a UI to display real-time balances
5. **Multi-channel Management**: Handle multiple channels simultaneously

## 📝 License

ISC

## 🤝 Contributing

This is a tutorial project. Feel free to fork and experiment!

---

**Built with Nitrolite (ERC-7824)** - Bringing instant, low-cost transactions to Ethereum L2s

