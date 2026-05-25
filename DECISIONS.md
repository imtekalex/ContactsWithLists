# Architecture Decision Log

## Template

- Date:
- Decision:
- Context:
- Options considered:
- Consequences:
- Follow-up:

## Initial decisions

- Date: 2026-05-25
  Decision: Use pnpm overrides to resolve transitive `postcss` and `esbuild` dependencies to patched versions.
  Context: `pnpm audit` reported vulnerabilities through framework and build-tool dependencies. Direct package updates moved `next`, `recharts`, ESLint, and related tooling to patched/current compatible versions, but `next` still resolved `postcss@8.4.31` and `drizzle-kit` still resolved `esbuild@0.18.20` through `@esbuild-kit` packages.
  Options considered: Accept audit failures, wait for upstream transitive dependency updates, or use narrow package-manager overrides.
  Consequences: CI can enforce the security audit now, with a small dependency-resolution override to revisit later.
  Follow-up: Remove the overrides once upstream packages resolve to patched versions without them.

- Date: 2026-05-25
  Decision: Treat lint and format checks as blocking quality gates.
  Context: Existing lint warnings and formatting drift were cleaned up, so keeping these checks non-blocking would allow the same debt to return.
  Options considered: Keep lint/format advisory only, or fail `pnpm check-quality` when lint or format fails.
  Consequences: CI will fail on new lint warnings, lint errors, or formatting drift.
  Follow-up: Keep broad formatting-only commits separate from behavior changes when possible.

- Date: 2026-05-24
  Decision: Add project-local guardrail documentation and quality wrappers without changing product behavior.
  Context: The repository has no lint, format, or product consistency guardrails and uses local JSON persistence in development.
  Options considered: Create a full CI workflow now versus start with local docs and scripts.
  Consequences: Provides immediate AI guardrails with minimal repo changes and no new production dependencies.
  Follow-up: Add CI automation and explicit lint/format gates when the repo is ready.

- Date: 2026-05-24
  Decision: Add a conservative forbidden-pattern scan and product consistency documentation.
  Context: No automated product consistency checker exists, but terminology and visual conventions must still be enforced.
  Options considered: Add broad automated checks versus keep the scan narrow and document manual review.
  Consequences: The repo gains a light safety net while avoiding noisy or unreliable terminology enforcement.
  Follow-up: Add targeted copy or token checks once a central registry or localization system exists.

- Date: 2026-05-24
  Decision: Do not create a GitHub pull request template because no `.github` directory is present.
  Context: The repo structure does not currently include GitHub workflow metadata.
  Options considered: Create a `.github` directory proactively versus wait for explicit GitHub usage.
  Consequences: Avoids introducing source control metadata without clear ownership.
  Follow-up: Add `pull_request_template.md` if the repo later adopts GitHub workflows.

- Date: 2026-05-24
  Decision: Add a minimal GitHub Actions workflow and PR template to bootstrap CI and review guidance.
  Context: After initial guardrail work, the repository owner accepted adding CI and a PR template to run the quality gates.
  Options considered: Wait for explicit CI adoption versus add a minimal, conservative workflow now.
  Consequences: Enables automated `pnpm check-quality` runs on PRs while remaining conservative (no formatting/lint enforcement added).
  Follow-up: Revisit CI to add lint/format gates and more targeted checks once the team confirms policies.

- Date: 2026-05-24
  Decision: Prefer direct commits over pull requests for now; remove PR template.
  Context: Repository owner requested immediate commits rather than PR-based workflow while guardrails are bootstrapped.
  Options considered: Keep PR template and PR-triggered CI versus remove PR template and rely on push-based CI.
  Consequences: Changes will be committed directly to branches; CI runs on push. Reintroduce PR-based workflow later if desired.
  Follow-up: If the team later decides to require PRs, restore `pull_request` CI triggers and a PR template, and document the review process in `docs/code_review.md`.
