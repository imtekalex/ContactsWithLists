# Product Consistency Rules

## Purpose
Prevent AI-assisted changes from creating inconsistent product language or visual design. Make naming and styling decisions explicit instead of accidental.

## Terminology rules
- Use the same name for the same concept everywhere.
- Different names must mean different things.
- Do not use terms like “price,” “fee,” “cost,” “charge,” “rate,” or similar concepts interchangeably unless the domain explicitly defines them.
- Before adding or changing a term, search existing code, UI strings, docs, tests, fixtures, and specs for related terms.
- If changing a term, update all relevant surfaces or document why some surfaces intentionally keep the old term.

## Visual consistency rules
- Use existing design tokens, theme variables, CSS variables, component variants, and shared components.
- Do not hardcode colors, spacing, shadows, radii, typography, or state styles when an existing token or component exists.
- New colors or visual variants require explicit justification and should be documented.
- Color-only meaning is not sufficient for accessibility.

## Copy consistency rules
- Match existing capitalization, punctuation, tone, and button/action-label patterns.
- Error, empty, success, loading, and confirmation states should follow existing product patterns.
- Button labels and action names should be consistent across equivalent flows.

## Required consistency workflow
1. Search for existing terms and UI patterns.
2. Identify the canonical term or pattern.
3. Reuse it unless the spec requires a new distinction.
4. Document any new distinction.
5. Update affected UI, docs, tests, fixtures, and specs.
6. Add or update tests/snapshots where the repo already protects these surfaces.

## Examples
- “price” vs “fee” must either collapse to one canonical term or be documented as separate concepts.
- “Sign in” vs “Log in” must be consistent unless there is a product reason for both.
- “Cancel subscription” vs “End plan” must not describe the same action in the same user journey unless intentionally differentiated.
- Red/yellow/green status colors must use existing status tokens or variants if present.

## Open questions and risks
- The participation flow currently shows `Selected fee rate` while data types use `priceOptions` and `defaultPriceOptionId`.
- The repo does not have a centralized copy registry or localization system.
- Product consistency checks currently rely on manual review and spec discipline.
