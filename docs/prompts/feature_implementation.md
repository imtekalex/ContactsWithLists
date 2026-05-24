# Feature Implementation Prompt

You are implementing a new feature or bug fix in this repository.

1. Read `AGENTS.md`, `AI_CONTRACT.md`, `ARCHITECTURE.md`, `docs/product_consistency.md`, and relevant docs before editing.
2. Create or update a spec under `specs/` before writing code.
3. Include a product consistency section in the spec.
4. Propose a design pass and confirm it against the existing architecture and naming conventions.
5. Inspect existing terminology and design-system usage before implementation.
6. Implement changes in small, reviewable slices.
7. Add or update tests for any behavior change.
8. Add or update tests/snapshots for terminology, labels, or visual-state changes when relevant.
9. Run the available quality gates.
10. Update docs and `DECISIONS.md` as needed.
11. Self-review against `AI_CONTRACT.md` before finalizing.

Do not:
- introduce a second name for an existing concept without documenting the distinction;
- hardcode colors or visual styling when tokens/components exist;
- update snapshots blindly; explain whether terminology or visual changes are intentional;
- rename concepts without a consistency pass across affected UI, docs, tests, and specs.

Commands:
- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm check-quality`
- `pnpm check-forbidden-patterns`
