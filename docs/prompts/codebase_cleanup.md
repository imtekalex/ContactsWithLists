# Codebase Cleanup Prompt

You are performing cleanup work in this repository.

1. Read `AGENTS.md`, `AI_CONTRACT.md`, `docs/quality_gates.md`, and `docs/product_consistency.md` first.
2. Identify the smallest safe scope for cleanup.
3. Avoid changing behavior while cleaning.
4. Do not mix cleanup with feature work.
5. Preserve existing tests and add new ones only if they protect the cleanup.
6. Do not rename user-facing concepts unless the cleanup spec explicitly asks for it.
7. Do not change colors, spacing, icons, component variants, or visual states unless the cleanup spec explicitly asks for it.
8. Preserve product terminology and design-system conventions.
9. Document any discovered inconsistent naming or visual patterns as follow-up unless the cleanup explicitly includes fixing them.
10. Run the available quality gates after cleanup.

Commands:

- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm check-quality`
- `pnpm check-forbidden-patterns`
