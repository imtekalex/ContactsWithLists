# Code Review Checklist

## Scope and intent

- Is the change small and focused?
- Does it match the relevant spec in `specs/`?
- Does it avoid unrelated cleanup?

## Architecture boundary violations

- Does the change respect `ARCHITECTURE.md`?
- Is business logic kept in `lib/` or API boundary code?
- Is presentation logic limited to `components/` and `app/`?

## Duplicate logic

- Does this reuse existing helpers?
- Is there duplicated behavior that should be refactored into `lib/`?

## Error handling and validation

- Are inputs validated at system boundaries?
- Are failure paths handled cleanly?
- Does the change avoid hardcoded values unless explicit compatibility handling?

## Security and secrets

- Are secrets or private keys absent from source?
- Are new dependencies or runtime integrations documented?
- Is local persistence behavior understood and preserved?

## Type safety

- Does the change compile with TypeScript?
- Were types updated alongside model or data changes?

## Tests

- Are behavior changes covered by tests?
- Does the test plan validate the new behavior and edge cases?

## Accessibility

- Does UI work with keyboard and screen readers where applicable?
- Are visible labels and controls descriptive?

## Performance-sensitive paths

- Are expensive operations avoided in render loops?
- Is memoization or caching used where appropriate?

## Documentation

- Are docs updated for new or changed behavior?
- Is `DECISIONS.md` updated for any tradeoffs?

## Backward compatibility

- Does this preserve existing public behavior?
- Are data migrations or persistence changes documented?

## Product consistency

- Are user-facing names, labels, statuses, and messages consistent with existing app terminology?
- Does the change avoid using multiple words for the same concept, such as “price” in one place and “fee” elsewhere, unless the distinction is intentional and documented?
- If similar terms are used, is the semantic distinction clear in the spec, domain model, UI, docs, and tests?
- Are colors, spacing, icons, and visual states using the existing design system, theme tokens, CSS variables, or component variants?
- Are there any one-off colors, hardcoded visual values, or duplicated style patterns that should use tokens/components?
- Were all affected screens/components updated when a concept was renamed?
- Were docs, tests, snapshots, fixtures, seed data, analytics/event labels, and API-facing labels checked where relevant?
- Do tests or snapshots cover important terminology, labels, or visual-state expectations where appropriate?

## Direct-commit policy

- This repository currently uses direct commits rather than a PR-first workflow. Before pushing changes, run the full local quality gates:
  - `pnpm build`
  - `pnpm test`
  - `pnpm exec tsc --noEmit`
  - `pnpm check-forbidden-patterns`
- Keep changes small and self-contained; document any non-trivial work in `specs/` and `DECISIONS.md`.
- If the team decides to require PRs later, update this guide and restore PR-based CI triggers.
