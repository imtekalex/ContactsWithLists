# Codex Agent Workflow

Before any non-trivial change, read these files first:
1. `AI_CONTRACT.md`
2. `ARCHITECTURE.md`
3. `projectmap.md`
4. `docs/quality_gates.md`
5. `docs/product_consistency.md`
6. The relevant spec under `specs/`

Non-trivial change definition:
- Any change touching business logic, data models, APIs, auth/security, payments, persistence, infrastructure, performance, user-facing terminology or copy, design tokens/colors, shared UI components, or more than one module.

Required workflow:
1. Inspect existing code, patterns, and product conventions before editing.
2. Inspect existing terminology, labels, colors, design tokens, and UI conventions before changing user-facing surfaces.
3. State the plan before editing.
4. Keep changes small and scoped.
5. Prefer domain/model/service changes over UI/controller hacks.
6. Reuse existing product language and design-system conventions.
7. Add or update tests for behavior changes and user-facing terminology changes when relevant.
8. Run relevant gates.
9. Update docs and `DECISIONS.md` when architecture, product terminology, visual conventions, or tradeoffs change.
10. Self-review against `AI_CONTRACT.md` before the final response.

Exact repo commands:
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm check-quality`
- `pnpm check-forbidden-patterns`
- `pnpm audit --summary`

Forbidden behaviors:
- no one-off hardcoded fixes for specific values unless explicitly documented as compatibility handling;
- no duplicated logic when an existing abstraction exists;
- no business rules in UI components if a domain/service layer exists;
- no broad rewrites without a spec;
- no silent dependency additions;
- no unrelated cleanup mixed into feature work;
- no introducing multiple names for the same concept without a documented semantic distinction;
- no one-off colors, icons, statuses, labels, or UI states when an existing convention or token exists;
- no renaming user-facing concepts in only one part of the app.

Keep this file short. Link to deeper docs rather than duplicating everything.

Direct-commit policy:
- This repository currently prefers direct commits to `main`/`master` rather than a PR-first workflow.
- Run `pnpm check-quality` locally before pushing; CI runs the same checks on push.
- If you need to re-enable PR-based reviews, restore `pull_request` triggers and add a PR template in `.github/`.
