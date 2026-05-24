# Architecture Overview

## High-level purpose

A local-first contact and list manager built with Next.js, React, TypeScript, Tailwind CSS, and client-side JSON persistence for development.

## Runtime architecture

- Browser: React UI renders with Next.js App Router.
- Server: Next.js local API route at `app/api/contacts-store/route.ts` handles JSON persistence during development.
- Persistence: tracked sample data in `data/`; runtime edits are stored in ignored `data/local/` JSON files.

## Directory and module responsibilities

- `app/` - Next.js route files, page entrypoints, layout, and global styling.
- `components/` - Page and feature UI components, dialogs, and interaction controllers.
- `components/ui/` - Shared UI primitives and design tokens via component variants.
- `hooks/` - Shared React hooks.
- `lib/` - Domain logic, data types, payment calculations, persistence helpers, and business rules.
- `app/api/contacts-store/route.ts` - Local persistence API that reads and writes JSON.
- `data/` - Seed data and tracked JSON collections.
- `data/local/` - Ignored local runtime persistence files.
- `public/` - Static assets and vendored fonts.
- `styles/` - Global CSS and Tailwind configuration.
- `docs/` - Guardrail docs and prompt templates.
- `specs/` - Future feature and bug-fix specifications.
- `scripts/` - Repo-local quality wrappers and checks.

## Core domains and owners

- Contacts, groups, lists, and custom fields: `lib/contacts-data.ts`
- Event participation and payments: `lib/payments.ts`, `components/participation-section.tsx`
- Persistence and data loading: `lib/contacts-store.ts`, `app/api/contacts-store/route.ts`
- UI and navigation: `app/`, `components/`
- Shared design and styling: `components/ui/`, `styles/`, `app/globals.css`

## Data flow

1. UI renders state and user interactions from components and hooks.
2. Components call domain helpers or API helpers in `lib/`.
3. API route reads and writes JSON files in `data/local/`.
4. Domain logic in `lib/` computes balances, labels, and business rules.

## Where logic belongs

- Business rules belong in `lib/` and API boundary code.
- Presentation state belongs in `components/` and `app/`.
- Shared UI styling belongs in `components/ui/`, `styles/`, and existing Tailwind tokens.
- User-facing copy and labels live in component markup and should be validated against `docs/product_consistency.md`.

## Validation and consistency

- Validation belongs at system boundaries and domain/service layers.
- User-facing terminology should be checked in `docs/product_consistency.md` and `specs/`.
- Visual styling should reuse component variants and design tokens rather than one-off hardcoded values.
- Product terminology and copy should be reviewed through docs and code review when no automated checker exists.

## Testing strategy

- Use `pnpm test` for existing Vitest tests.
- Use `pnpm exec tsc --noEmit` for type checking.
- Use `pnpm check-quality` for build/test/typecheck/forbidden-patterns.
- Manual review is required for product consistency because no dedicated copy registry or localization system exists.

## Product consistency review points

- Shared UI components: `components/ui/`
- Typography and spacing: component classes and Tailwind tokens
- Statuses and labels: component markup across `components/` and `app/`
- Color and variant usage: `Button` variants, CSS utility classes, and theme tokens
- Terminology: search for terms like `price`, `fee`, `amount`, `payment`, `status`, `register`, `attend`

## Known ambiguous boundaries and risks

- `price` vs `fee` terminology is already mixed in event participation flows.
- No lint or format gate is configured in the repo.
- No `.github` CI workflow is present.
- Product consistency checks are primarily manual today.
- `data/local/` is development-only persistence and not a production storage architecture.

## Known product consistency risks

- The participation UI uses `Selected fee rate` while data types and seed data use `priceOptions` and `defaultPriceOptionId`.
- `amount owed` and pricing labels may be semantically related but are not centrally defined.
- Shared design tokens may be underused in ad hoc utility-class markup.
- These should be validated before any terminology or styling change.
