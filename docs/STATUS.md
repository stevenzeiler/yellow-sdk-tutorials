# Status

Last checked 2026-11-20 (github-audit pass 02).

## What works

- `npm ci` installs cleanly.
- Most scripts type-check. Per the history they were run against Yellow Clearnet in Nov 2025 to Jan 2026.

## What is broken or unknown

- `tsc --noEmit` fails in `connect_auth_get_balances.ts`: `app_name` is not a known property of the auth request in nitrolite 0.5.1, plus an implicit `any` on the listener argument. The main demo likely needs a small update.
- No script was run in this pass (they need a funded wallet and the live network), so current behaviour against Yellow is unknown.
- `scripts/app_session_two_signers.ts` duplicates `scripts/app_sessions/app_session_two_signers.ts`.
- `scripts/app_sessions/README.md` may still mention scripts that are not in the repo (for example a three-signer example). Not checked line by line.
- The old README listed scripts that do not exist (`create_wallet.ts`, `close_channel.ts`, `get_config.ts` and others). The new README lists only files that are present.
- `tsx` is used but not declared as a dependency.
- Rideshare demo and the `v0.5.0-upgrade` branch exist upstream of main only as history.

## What's next

Fix the two type errors, declare `tsx`, remove or merge the duplicate script, then re-run each script on a testnet or with a small balance and record results here.

## Not yet from the standard

- CONTRIBUTING.md, SECURITY.md
- `.editorconfig`
- `.github` issue and PR templates
- Dependabot config
- `ci.yml` with gitleaks (and `tsc`)
- CloudEvents catalog
- Product ONE-PAGER
- Copyright holder confirmation: early commits are authored as "My CTO"; the new ISC LICENSE names Steven Zeiler (2025), which package.json declared.
