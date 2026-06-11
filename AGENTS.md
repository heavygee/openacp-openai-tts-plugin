# AGENTS.md

Guidance for AI coding assistants working on this repo.

## Issue-first workflow (mandatory)

**No ticket, no workee.** Bugs and feature work require a tracked
GitHub Issue *before* you start writing code.

1. Check [open issues](https://github.com/heavygee/openacp-openai-tts-plugin/issues) for
   an existing match. If one exists and is unassigned, claim it via a
   comment before starting work.
2. If no issue exists, open one using the appropriate template and wait
   for triage / `accepted` / `help wanted` before investing significant
   time.
3. Branch from `main` with the issue number in the name:
   `fix/123-short-slug` / `feat/124-short-slug`.
4. Reference the issue in your PR description with `Fixes #N`.

**Exceptions:**

- one-line typo / doc fix
- declared hotfix mode by a maintainer
- security fix coordinated via private SECURITY.md channels (no public
  issue until disclosure)

## Repository shape

```
src/index.ts              OpenACPPlugin entrypoint - install/configure/setup/teardown
src/provider.ts           OpenAITTSProvider class - standard + Chatterbox-upload paths
src/__tests__/            vitest unit tests against the plugin contract
dist/                     compiled output (gitignored, shipped on npm)
.github/                  CI, issue templates, dependabot, release workflows
security/semgrep/         project-specific Semgrep rules (auth header / token logging)
scripts/                  owasp-gate.sh, gitleaks-staged.sh
```

## What you can change without asking

- Bug fixes inside `src/` that are covered by an issue.
- New unit tests in `src/__tests__/`.
- Doc edits (`README.md`, `CONTRIBUTING.md`, `docs/`).
- New TTS-server defaults / port docs in the README.
- CI tuning that doesn't loosen security gates.

## What needs operator approval

- Adding **runtime** dependencies (currently zero). The Chatterbox
  upload path uses Node 20's built-in `fetch` + `FormData` and `Blob` -
  please don't pull in `node-fetch` / `form-data` shims.
- Renaming / removing existing config keys (`endpoint`, `model`,
  `voice`, `apiKey`, `voiceFilePath`) - back-compat breaks for users
  who already ran `openacp plugin install`.
- Touching `.github/workflows/release.yml` (it has the npm OIDC
  publish; the operator-side env wiring lives in `NPM_SETUP.md`).
- Switching the licence.
- Major architectural changes (e.g. moving auth into a separate
  module, supporting non-OpenAI body shapes, adding STT support).
- Bumping the `peerDependencies['@openacp/cli']` floor - that drops
  support for older OpenACP releases for everyone.

## Local verification before opening a PR

```bash
npm install
npm run build                     # tsc; must succeed
npm test                          # vitest; all green
npm pack --dry-run                # tarball contents look right (no node_modules / .env)
bash scripts/owasp-gate.sh        # local semgrep mirror of CI gate (optional)
```

CI runs the same checks (`build`, `test`, `secret-scan` via gitleaks,
`owasp-sast` via semgrep, aggregate `ci`). PRs can't merge until the
aggregate `ci` job is green.

## Conventional commits

PR titles use [Conventional Commits](https://www.conventionalcommits.org/).
See CONTRIBUTING.md for examples. Release notes are generated from these
by release-please.

## Style anchors

- **TypeScript strict.** No `any`, no `// @ts-ignore`. If a contract
  needs widening, update the type imports from `@openacp/plugin-sdk`.
- **No secret logging.** API keys / bearer headers / `Authorization`
  values never reach `console.log` or `ctx.log.*`. The semgrep rule
  `log-jwt-or-token` enforces this.
- **Health check is non-fatal** in `setup()`. Cold-starting servers are
  expected. Real failures must surface during `synthesize()`.
- **No back-compat shims.** OpenACP plugin protocol is a moving target;
  pin the SDK version explicitly and bump intentionally instead of
  defending against old SDK shapes.

## Where the brand canon lives

- README has the user-facing pitch + supported-server table.
- This file has the agent-facing rules.
- CONTRIBUTING has the human-contributor flow.
- SECURITY has the disclosure path.

Update all four when the relevant area changes. Don't put rules in one
that should live in another.
