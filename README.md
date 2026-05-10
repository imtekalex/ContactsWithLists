# Contacts With Lists

Vibe coded local-first contacts manager for keeping people, groups, and reusable contact lists in one calm workspace. The app currently runs as a Next.js client app with seeded demo data, so it is ready for UI and workflow development without a backend.

## What It Does

- Manage contacts with names, companies, titles, email addresses, phone numbers, address details, notes, tags, and starred status.
- Organize contacts into color-coded groups.
- Build manual lists or dynamic lists based on starred contacts, groups, text search, or custom-field criteria.
- Add and manage custom fields for all contacts or selected groups.
- Search, filter, multi-select, print contacts, copy email lists, export CSV, and restore contacts from trash.
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
```

Linting is not configured in this import yet.

## Project Structure

- `app/` - Next.js app routes and global layout.
- `components/` - Feature components, dialogs, managers, and shared UI components.
- `components/ui/` - Reusable shadcn-style primitives.
- `hooks/` - Shared React hooks.
- `lib/contacts-data.ts` - Contact, group, list, custom-field types plus seed data and query helpers.
- `lib/contacts-store.ts` - Shared contact-state shape plus client load/save helpers.
- `app/api/contacts-store/route.ts` - Local file persistence API for `data/contacts.json`.
- `data/` - Local JSON data file location.
- `public/` - Icons and placeholder assets.
- `public/fonts/geist/` - Local Geist font files and license.
- `app/globals.css` - Global styling and design tokens.

## Fonts

This app uses Geist Sans and Geist Mono. The font files are vendored in `public/fonts/geist/` so the app can build and run without fetching fonts from Google or another CDN.

Geist is created by Vercel in collaboration with Basement Studio and is licensed under the SIL Open Font License 1.1. See `public/fonts/geist/LICENSE.txt` for the bundled license text.

## Data Notes

The app starts from the seed data in `lib/contacts-data.ts`, then persists edits to `data/contacts.json` through the local Next.js API route in `app/api/contacts-store/route.ts`. Contacts, deleted contacts, groups, activity, custom fields, and lists survive page refreshes and are stored in a normal JSON file in this project folder.

The data file is created automatically the first time the app runs. This file-backed storage is intended for local development and personal desktop use with `pnpm dev` or `pnpm start`; a static deployment would need a different persistence layer.

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
