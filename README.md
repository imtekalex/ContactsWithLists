# Contacts With Lists

Vibe coded local-first contacts manager for keeping people, groups, and reusable contact lists in one calm workspace. The app currently runs as a Next.js client app with seeded demo data, so it is ready for UI and workflow development without a backend.

## What It Does

- Manage contacts with names, companies, titles, email addresses, phone numbers, address details, notes, tags, and starred status.
- Organize contacts into color-coded groups.
- Build manual lists or dynamic lists based on starred contacts, groups, text search, or custom-field criteria.
- Add and manage custom fields for all contacts or selected groups.
- Search, filter, multi-select, print contacts, copy email lists, export CSV, and restore contacts from trash.
- Track event participation, recurring event series, payment history, and outstanding balances.
- Review simple analytics and recent activity from the seeded local data.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI / shadcn-style components
- lucide-react icons
- Geist Sans and Geist Mono, vendored locally
- pnpm

## Getting Started In VS Code

Open this folder in VS Code:

```powershell
code .
```

Install dependencies:

```powershell
pnpm install
```

Start the local preview:

```powershell
pnpm dev
```

Then open:

```text
http://localhost:3000
```

In VS Code you can keep the dev server running in the integrated terminal while editing files. Next.js will hot-reload most changes automatically in the browser.

## Available Scripts

```powershell
pnpm dev
pnpm build
pnpm start
pnpm test
```

Linting is not configured in this import yet. `pnpm test` runs the Vitest unit tests.

## Project Structure

- `app/` - Next.js app routes and global layout.
- `components/` - Feature components, dialogs, managers, and shared UI components.
- `components/ui/` - Reusable shadcn-style primitives.
- `hooks/` - Shared React hooks.
- `lib/contacts-data.ts` - Contact, group, list, custom-field types plus seed data and query helpers.
- `lib/payments.ts` - Payment and event balance calculations.
- `lib/contacts-store.ts` - Shared contact-state shape plus client load/save helpers.
- `app/api/contacts-store/route.ts` - File persistence API that reads sample data from `data/` and writes local changes to `data/local/`.
- `data/` - Tracked sample JSON collection files.
- `data/local/` - Ignored local JSON collection files created while running the app.
- `public/` - Icons and placeholder assets.
- `public/fonts/geist/` - Local Geist font files and license.
- `app/globals.css` - Global styling and design tokens.

## Fonts

This app uses Geist Sans and Geist Mono. The font files are vendored in `public/fonts/geist/` so the app can build and run without fetching fonts from Google or another CDN.

Geist is created by Vercel in collaboration with Basement Studio and is licensed under the SIL Open Font License 1.1. See `public/fonts/geist/LICENSE.txt` for the bundled license text.

## Data Notes

The app starts from the tracked sample JSON files in `data/`, then persists edits to ignored local copies in `data/local/` through the local Next.js API route in `app/api/contacts-store/route.ts`. Contacts, deleted contacts, groups, activity, custom fields, lists, event series, event occurrences, participations, payments, and print preferences survive page refreshes and are stored as normal JSON files in this project folder.

The local data files are created automatically the first time the app runs. `data/local/` is ignored by Git, so everyone can keep personal changes without accidentally committing them, while the repository still carries stable sample data in `data/`.

This file-backed storage is intended for local development and personal desktop use with `pnpm dev` or `pnpm start`; a static deployment would need a different persistence layer.

CSV export is available from Settings; CSV import is visible but disabled.

## Moving Into Git

This folder is already a Git working tree on `main` with an `origin` remote. For the first import, keep source files and the lockfile tracked, but leave generated folders such as `node_modules/`, `.next/`, and TypeScript build cache files untracked.

Suggested first commit:

```powershell
git status
git add .gitignore README.md app components hooks lib public data components.json next-env.d.ts next.config.mjs package.json pnpm-lock.yaml postcss.config.mjs tsconfig.json
git commit -m "Add contacts with lists app"
git push
```

test