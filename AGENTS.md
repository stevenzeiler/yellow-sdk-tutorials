# AGENTS.md

Guidance for AI agents working in this repo. Humans: see README.md.

## What this is

Public tutorial scripts for Yellow Network (Nitrolite / ERC-7824). Teaching material: clarity matters more than cleverness.

## Stack

- Node.js 20+, npm (package-lock.json)
- TypeScript (strict, CommonJS), run with `tsx` via `npx` (tsx is not in package.json)
- `@erc7824/nitrolite` ^0.5.0 (0.5.1 installed), `yellow-ts` ^0.0.10, `viem` ^2, `dotenv`, `yargs`

## Layout

- `connect_auth_get_balances.ts` main demo (`npm start`)
- `scripts/` one example per file; `scripts/app_sessions/` app session tutorial and script
- `lib/auth.ts`, `lib/utils.ts` shared helpers

## Commands

```bash
npm ci
npm start                        # needs SEED_PHRASE in .env and network access
npx tsx scripts/<name>.ts
npx tsc --noEmit                 # currently 2 errors in connect_auth_get_balances.ts
```

`npm test` is a placeholder that fails on purpose. There are no tests. `npm run mnemonic-to-private-key` uses `ts-node`, which is a devDependency.

## Rules

- Add tests with every change where there is logic to test.
- Never commit secrets. Seed phrases, private keys and `.env` stay local. Examples use placeholders only.
- Use Conventional Commits.
- Keep docs/STATUS.md current.
- Keep scripts small and readable, one lesson per script.

## What agents may and may not do

- May: edit code and docs on a branch, open PRs, run `tsc` and read-only scripts.
- May not, without Steven: run scripts that send transactions or use real funds, archive the repo, publish packages, or rewrite git history.
