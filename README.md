# yellow-sdk-tutorials

Runnable TypeScript example scripts that teach developers to connect to Yellow Network, authenticate with a wallet, fund channels and use app sessions, built on Nitrolite (ERC-7824) and the [`yellow-ts`](https://github.com/stevenzeiler/yellow-ts) client.

**Status:** dormant since 2026-01 (first commit 2025-11-20, last 2026-01-23). The scripts target `@erc7824/nitrolite` 0.5.x and Base mainnet. They have not been re-run since, and Yellow's APIs may have moved on.

## Install

Node.js 20 or newer and npm.

```bash
npm install
```

## Config

Create a `.env` file in the repo root (it is gitignored). Env var names:

| Name | Used by |
|---|---|
| `SEED_PHRASE` | Most scripts, directly or through `lib/auth.ts`. A 12 or 24 word mnemonic for a Base wallet. In `scripts/app_session_two_signers.ts` it is the first signer |
| `WALLET_1_SEED_PHRASE` | `scripts/app_sessions/app_session_two_signers.ts` (first signer) |
| `WALLET_2_SEED_PHRASE` | Both app session scripts (second signer) |

```bash
SEED_PHRASE="..."   # your own wallet; never commit it
```

Use a throwaway wallet with small amounts. These scripts send real transactions on Base.

## Run

```bash
npm start                                  # connect, authenticate, print balances
npx tsx scripts/<script>.ts [flags]        # any example script
```

`npm run dev` runs the same demo in watch mode.

## Scripts

| Script | What it shows |
|---|---|
| `connect_auth_get_balances.ts` | Main demo: connect, authenticate by wallet signature (EIP-712), print live balances and channels |
| `scripts/mnemonic_to_private_key.ts` | Convert a mnemonic to a private key |
| `scripts/list_account_channels.ts` | List your open channels |
| `scripts/deposit_to_custody.ts` | Deposit USDC to the custody contract (`--amount`) |
| `scripts/create_channel.ts` | Create a USDC channel on Base on-chain |
| `scripts/resize_channel.ts` | Resize a channel, event-driven style |
| `scripts/resize_channel_inline.ts` | Resize a channel, async/await style |
| `scripts/connect_wallet_and_tip.ts` | Connect and send a transfer (tip) |
| `scripts/app_sessions/app_session_two_signers.ts` | Two-party app session. Full guide in [scripts/app_sessions/README.md](scripts/app_sessions/README.md) |
| `scripts/app_session_two_signers.ts` | An older copy of the same example |

Helpers live in `lib/` (`auth.ts` for the connect and auth flow, `utils.ts` for session keys and contract addresses).

## How authentication works

1. Derive a wallet from your seed phrase (viem).
2. Generate a temporary session key.
3. Connect to the Yellow Clearnet websocket (through `yellow-ts`) and send an auth request naming the session key.
4. Receive a challenge, sign it with the main wallet (EIP-712), send the verify message.
5. Once authenticated, the server pushes balance, channel and asset updates.

The session key means the main wallet signs once, not for every message.

## Checked

On 2026-11-20, `npm ci` worked and `tsc --noEmit` reported two errors, both in `connect_auth_get_balances.ts`: `app_name` is not accepted by the installed nitrolite 0.5.1 auth request type, and an implicit `any` on a listener argument. No script was run (they need a funded wallet and the live network).

More notes: [docs/STATUS.md](docs/STATUS.md). Agents: [AGENTS.md](AGENTS.md).

## License

ISC, see [LICENSE](LICENSE).
