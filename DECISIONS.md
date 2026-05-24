# Architecture Decision Log

## Template
- Date:
- Decision:
- Context:
- Options considered:
- Consequences:
- Follow-up:

## Initial decisions
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
