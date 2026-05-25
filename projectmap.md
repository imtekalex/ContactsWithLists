# Project Map

## What the system does

A local-first contact manager with reusable lists, custom fields, events, and payment tracking built on Next.js, React, and TypeScript.

## Core features

- Contacts, groups, and reusable lists
- Custom fields and dynamic filters
- Event participation and payment history
- Local JSON persistence via a Next.js API route
- CSV export and print support

## Core domains/modules

- `lib/` - domain logic, data types, business rules, payment calculations, and persistence helpers
- `app/api/contacts-store/route.ts` - local storage API route
- `components/` - feature UI, dialogs, and page controllers
- `components/ui/` - shared UI primitives and component variants
- `hooks/` - reusable React hooks
- `data/` - seed data and local runtime persistence
- `styles/` - global CSS and Tailwind utilities
- `docs/` - guardrail docs and prompt templates
- `specs/` - feature/bug spec definitions
- `scripts/` - repo-local quality wrappers and checks

## Ownership of major rules

- Contact and list business rules: `lib/contacts-data.ts`
- Event/payment logic: `lib/payments.ts`
- Persistence and API integration: `lib/contacts-store.ts`, `app/api/contacts-store/route.ts`
- Shared UI style: `components/ui/`, `styles/`, and Tailwind token usage
- Product terminology and copy consistency: `docs/product_consistency.md` and `specs/`

## Ownership of terminology and visual conventions

- Terminology: `docs/product_consistency.md`, `specs/`, and `AI_CONTRACT.md`
- Visual styling: `components/ui/` component variants and `styles/`
- User-facing copy: component markup in `components/` and `app/`
- Labels/statuses: feature components and `lib/` domain labels

## High-level data flow

- UI reads domain state from `lib/` and persisted JSON.
- User actions update domain state through `lib/` helpers or API calls.
- API route persists changes to `data/local/`.
- UI reflects computed state and balances from `lib/payments.ts`.

## Where to implement common change types

- Business rules: `lib/`
- Data model changes: `data/`, `lib/`, and API route
- Persistence changes: `app/api/contacts-store/route.ts`
- UI behavior only: `components/` and `app/`
- Shared primitives: `components/ui/`
- Product terminology/copy: `docs/product_consistency.md`, `specs/`, and `components/`

## Naming, copy, and visual consistency

- Inspect `docs/product_consistency.md` before changing terminology or styling.
- Search existing UI strings and types for canonical terms such as `price`, `fee`, `amount owed`, `payment`, and `status`.
- Reuse established button labels, error language, and token-based styles.
- Avoid one-off colors, icons, and label variants without documented justification.

## Run the project

- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm test`

## Run quality gates

- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm check-quality`
- `pnpm check-forbidden-patterns`
- `pnpm audit`

## Files/folders to avoid mass-editing

- `node_modules/`
- `.next/`
- `data/local/`
- `pnpm-lock.yaml` except for deliberate dependency changes
- `public/fonts/` except asset/license updates
- `next-env.d.ts`, `tsconfig.tsbuildinfo`

## Files/folders to inspect before changing terminology or shared UI styles

- `components/ui/`
- `lib/contacts-data.ts`
- `lib/payments.ts`
- `app/page.tsx`
- `components/participation-section.tsx`
- `components/*` for labels and button patterns
- `docs/product_consistency.md`
- `specs/`
