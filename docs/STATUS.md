# Status

Last checked 2026-11-20 (github-audit pass 02).

## What works

- `npm ci` installs cleanly.
- Most scripts type-check. Per the history they were run against Yellow Clearnet in Nov 2025 to Jan 2026.

## What is broken or unknown

- `tsc --noEmit` fails in `connect_auth_get_balances.ts`: `app_name` is not a known property of the auth request in nitrolite 0.5.1, plus an implicit `any` on the listener argument. The main demo likely needs a small update.
- No script was run in this pass (they need a funded wallet and the live network), so current behaviour against Yellow is unknown.
- `scripts/app_session_two_signers.ts` duplicates `scripts/app_sessions/app_session_two_signers.ts`.
- `scripts/app_sessions/README.md` refers to scripts that are not in the repo (`app_session_three_signers_weighted.ts`, `update_app_session.ts`, `close_app_session.ts` and `get_ledger_balances.ts`).
- The old README listed scripts that do not exist (`create_wallet.ts`, `close_channel.ts`, `get_config.ts` and others). The new README lists only files that are present.
- `tsx` is used but not declared as a dependency.

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
- Copyright holder confirmation: the first three commits (2025-11) are authored as "My CTO". package.json declares ISC but names no author. The new LICENSE says "Steven Zeiler and contributors" until Steven confirms who "My CTO" is.
