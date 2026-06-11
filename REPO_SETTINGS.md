# Repository settings (canonical record)

Snapshot of which GitHub controls are enabled on
`heavygee/openacp-openai-tts-plugin`. Update this file whenever the
settings change so the repo's hardening state is auditable from the
code itself.

## Identity

| | |
|---|---|
| Owner | `heavygee` |
| `gh` CLI | `gh` (heavygee account) |
| Visibility | **public** (flipped 2026-06-11 before first publish) |
| npm scope | unscoped (`openacp-openai-tts-plugin`) |

**Why public:** the package is published to npm with `--provenance`
and the source mirror is the npm dist-tag's source of truth. Public
also unlocks GitHub-hosted secret scanning + push protection,
CodeQL default setup, branch protection requiring `ci`, and private
vulnerability reporting - all of which are free for public repos.

## Branch protection (`main`)

Applied 2026-06-11 after first CI green run.

| Control | State |
|---------|-------|
| Required status checks (strict) | `ci` (aggregate) |
| `enforce_admins` | false (admin can bypass for emergency direct push) |
| Required pull request reviews | none (solo project) |
| Required linear history | true (squash merges only) |
| Required conversation resolution | true |
| Allow force pushes | false |
| Allow deletions | false |
| Allow auto-merge | true (`gh pr merge --auto --squash` queues until `ci` green) |
| Automatically delete head branches | true |
| Squash commit title / message | `PR_TITLE` / `PR_BODY` |

## GitHub Advanced Security (free for public)

Applied 2026-06-11 after public flip.

| Control | State |
|---------|-------|
| Secret scanning | enabled |
| Secret scanning push protection | enabled |
| Secret scanning non-provider patterns | API silently disables on PATCH; enable manually via Settings -> Code security if/when needed |
| Secret scanning validity checks | same |
| CodeQL default setup | configured (`actions` + `javascript-typescript`) |
| Code Quality (preview) | API returns 404 "not available for this repository" - GitHub is still rolling Code Quality out; revisit after the public preview opens to all repos |
| Dependabot alerts | enabled |
| Dependabot security updates | enabled |
| Dependabot version updates | `.github/dependabot.yml` (npm + github-actions, weekly; major bumps for `typescript`/`vitest`/`@types/node` ignored) |
| Private vulnerability reporting | enabled |
| Dependency graph | on by default |

## In-repo CI gates

`.github/workflows/ci.yml` runs:

| Job | Tool | Blocks merge |
|-----|------|---|
| `build` | `npm ci && npm run build && npm pack --dry-run` | yes |
| `test` | `npm ci && npm test` (vitest) | yes |
| `secret-scan` | gitleaks (action; full history scan) | yes |
| `owasp-sast` | Semgrep (`p/owasp-top-ten`, `p/typescript`, `p/javascript`, `p/secrets`, `security/semgrep/`) | yes |
| `ci` (aggregate) | sum of above | yes - required for merge once branch protection lands |
| `merge-on-green` | squash-merges PRs labelled `automerge` once `ci` is green | n/a (PRs only) |

## Local secret-scan fallback

Free-private and pre-public-flip we can't lean on GitHub's push
protection. The repo ships a Husky pre-commit hook that runs
`scripts/gitleaks-staged.sh` against the staged diff (gitleaks binary
preferred, Docker `zricethezav/gitleaks:v8.30.1` fallback, fail-closed
if neither is available).

Operator: `npm install` enables it via the `prepare` lifecycle. Hook
location: `.husky/pre-commit`.

CI still runs the full-history `secret-scan` job - hooks can be
bypassed with `--no-verify` and Dependabot pushes don't run them.

## Release path

`.github/workflows/release-please.yml` watches `main` for conventional
commits, opens a `chore(main): release X.Y.Z` PR with the bumped
`package.json` + auto-generated `CHANGELOG.md` entry. Merging that PR
tags `vX.Y.Z`, which fires `release.yml`:

1. Verify tag matches `package.json` version.
2. `npm publish --provenance --access public` (Trusted Publishing /
   OIDC after first publish; granular token for the bootstrap publish).
3. Cut a GitHub Release with the matching `CHANGELOG.md` section.

**Environment `npm`** - first-publish bootstrap uses `NPM_TOKEN`
(short-lived granular, `bypass_2fa: true`); subsequent publishes are
tokenless via OIDC. See [`NPM_SETUP.md`](NPM_SETUP.md) for the full
wiring procedure.

## Pages / docs site

Not enabled. README is the docs surface.

## Sponsorship

`.github/FUNDING.yml` -> `github: [heavygee]`. **Operator step:** enable
Sponsorships in Settings -> General -> Features for the sidebar button
to appear (no REST API path documented as of 2026-06).

## Social preview

Placeholder. Operator to commission / generate a 1280x640 PNG (=< 1MB),
commit as `.github/social-preview.png`, and upload via Settings ->
General -> Social preview.

## Apply Tier H controls via `gh` (after public flip)

```bash
OWNER=heavygee REPO=openacp-openai-tts-plugin

# Always-available
gh api -X PUT "repos/$OWNER/$REPO/vulnerability-alerts"
gh api -X PUT "repos/$OWNER/$REPO/automated-security-fixes"
gh api -X PUT "repos/$OWNER/$REPO/private-vulnerability-reporting"

# Public-only (or paid private)
gh api -X PATCH "repos/$OWNER/$REPO" --input - <<'EOF'
{"security_and_analysis":{
  "secret_scanning":{"status":"enabled"},
  "secret_scanning_push_protection":{"status":"enabled"},
  "dependabot_security_updates":{"status":"enabled"}
}}
EOF

# CodeQL default setup - probe languages first; this is a TS-only repo
gh api -X PATCH "repos/$OWNER/$REPO/code-scanning/default-setup" \
  -f state=configured \
  -f 'languages[]=actions' \
  -f 'languages[]=javascript-typescript'

# Code Quality (public preview) - try, document if 403
gh api -X PATCH "repos/$OWNER/$REPO/code-quality/setup" \
  -f state=configured \
  -f 'languages[]=javascript-typescript' \
  || echo "code quality not available on this plan/visibility"

# Allow GitHub Actions to create / approve PRs (release-please needs it)
gh api -X PUT "repos/$OWNER/$REPO/actions/permissions/workflow" \
  -F default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=true
```

## Defense-in-depth (CI-side gates, in addition to GitHub UI)

The CI-side gates are kept even when GitHub-hosted scanning is enabled,
so the contracts are version-controlled and reviewed in PRs:

- **`secret-scan` job in `ci.yml`** (gitleaks Docker, PR-diff-aware)
  catches anything that would slip past push protection's pattern set.
- **Husky `pre-commit` hook** (`scripts/gitleaks-staged.sh`) covers the
  local staged-content path before the commit even leaves the
  workstation. Hooks can be skipped with `--no-verify`; the CI job is
  the safety net.
- **`owasp-sast` job** (Semgrep + project rules in
  `security/semgrep/`) blocks merges on OWASP Top 10 + TS/JS patterns
  that CodeQL doesn't cover.
- **`merge-on-green` label-driven job** mimics native `--auto` for
  contributors who don't have permission to enable native auto-merge.

## Last reviewed

- 2026-06-11 - public flip + Tier H + branch protection + npm env applied
