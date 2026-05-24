# AI Coding Contract

## Correctness hierarchy

1. Existing public behavior and tests.
2. Explicit feature spec in `specs/`.
3. Architecture boundaries in `ARCHITECTURE.md`.
4. Product terminology and design-system conventions.
5. Existing code conventions.
6. Simplicity.

## Source-of-truth rules

- Fix systems, not symptoms.
- Behavior changes must be expressed as reusable rules, not isolated exceptions.
- Domain rules live in domain models/services, not presentation code.
- Validation belongs at system boundaries and domain/service layers.
- UI renders state and invokes actions; it must not own core business decisions.
- User-facing terminology must be consistent across the app unless a documented product/domain distinction exists.
- Visual styling must reuse existing design tokens, theme variables, CSS conventions, component variants, and documented patterns.
- Do not introduce one-off labels, colors, statuses, icons, or copy patterns when an existing product convention exists.
- Rename or terminology changes must include a consistency pass across affected UI, docs, tests, fixtures, specs, and API-facing labels where applicable.
- New behavior requires tests at the lowest meaningful level.
- User-facing label, status, or copy changes require tests or snapshots when the repo already protects those surfaces or when terminology is business-critical.
- Passing tests is necessary but not sufficient.
- Every non-obvious tradeoff gets a `DECISIONS.md` entry.
- Public API changes, migrations, auth/security changes, dependency additions, product terminology changes, design-token changes, and shared UI convention changes require explicit mention in the plan.
- Prefer boring, maintainable solutions over clever abstractions.

## Checklist before completion

- I inspected existing code and patterns before editing.
- I inspected existing terminology, labels, colors, components, and design tokens before changing user-facing surfaces.
- I kept the change scoped to the requested work.
- I placed business rules in the appropriate domain/service layer.
- I avoided duplicated logic.
- I preserved product terminology and visual consistency.
- I documented any intentional terminology or visual changes.
- I added or updated relevant tests.
- I ran the relevant quality gates.
- I documented any skipped gates and why.
- I updated specs/docs/DECISIONS.md when required.
- I self-reviewed for architecture, correctness, consistency, security, and maintainability.
