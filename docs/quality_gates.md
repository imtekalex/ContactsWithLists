# Quality Gates

## Install

- `pnpm install`

## Build

- `pnpm build`

## Test

- `pnpm test`

## Typecheck

- `pnpm exec tsc --noEmit`

## Format/check

- `pnpm lint`
- `pnpm format`
- Lint and format are blocking inside `pnpm check-quality`.

## Security / audit

- `pnpm audit`

## Forbidden-pattern scan

- `pnpm check-forbidden-patterns`

## Product consistency

- No automated product consistency checker exists today.
- Manual review is required for terminology, labels, colors, and shared UI state changes.
- See `docs/product_consistency.md` for review rules.

## Quality wrapper

- `pnpm check-quality`

## CI

- GitHub Actions runs `.github/workflows/check_quality.yml` on pushes to `main`/`master` and by manual dispatch.
- CI installs dependencies with `pnpm install --frozen-lockfile` and runs `pnpm check-quality`.

## What to do when a gate is missing

- Document the missing gate in `docs/quality_gates.md`.
- Prefer adding a repo-local wrapper or docs entry instead of inventing a new command.

## What to do when a gate fails

1. Read the failure output.
2. Fix the underlying issue or document why the gate cannot be satisfied.
3. Rerun the failed gate.
4. Do not mark the task done until all required gates pass.

## What to do when terminology or styling cannot be automatically checked

- Note that product consistency changes require manual review.
- Compare changed labels and copy against existing usage.
- Verify renamed concepts are updated across affected surfaces.
- Verify colors/styles use tokens or existing components.
- Document semantic differences between similar terms.
- Update snapshots or tests intentionally, not blindly.
