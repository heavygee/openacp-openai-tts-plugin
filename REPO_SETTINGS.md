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
| Visibility | **private** at bootstrap; flip to **public** before first npm publish (operator decision) |
| npm scope | unscoped (`openacp-openai-tts-plugin`) |

**Why private at bootstrap:** the repo is being hardened (CI, secrets
scanning, governance docs). Flip to public **after** CI is green and
before the first `v1.0.0` tag - npm Trusted Publishing fully tokenless
flow needs the workflow to be visible to npm's OIDC verifier; public
repos also unlock GitHub-hosted secret scanning + push protection
(free tier doesn't include them on private repos).

## Branch protection (`main`)

Status: **deferred until first CI green run** (avoids bootstrap
chicken-and-egg). Once the first run succeeds:

```bash
gh api -X PUT "repos/heavygee/openacp-openai-tts-plugin/branches/main/protection" --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["ci"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "required_conversation_resolution": true
}
EOF
```

- Require a pull request before merging - planned (allow solo direct push during bootstrap)
- Require status checks: **`ci`** (aggregate) - planned
- Require linear history (squash merges only) - planned
- Allow auto-merge - planned (Settings UI flip)
- Automatically delete head branches - planned
- Restrict force pushes - planned

## GitHub Advanced Security

Free private repos have limited surface here. Re-run the runbook below
**after** flipping to public.

| Control | State (private) | State (after public flip) |
|---------|----------------|--------------------------|
| Secret scanning | unavailable on free private | enabled |
| Secret scanning push protection | unavailable on free private | enabled |
| CodeQL default setup | unavailable on free private | enabled (`javascript-typescript`, `actions`) |
| Code Quality (preview) | unavailable | try (`code-quality/setup`); document if 403 |
| Dependabot alerts | enabled | enabled |
| Dependabot security updates | enabled | enabled |
| Dependabot version updates | `.github/dependabot.yml` (npm + github-actions, weekly) | same |
| Private vulnerability reporting | enabled | enabled |
| Dependency graph | on by default | on by default |

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

## Last reviewed

- Bootstrap: 2026-06-11
