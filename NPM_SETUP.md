# NPM_SETUP.md

How to wire `heavygee/openacp-openai-tts-plugin` for `v*` tag -> npm publish.

`.github/workflows/release.yml` runs on tag `v*`, verifies
`package.json.version` matches the tag, then runs
`npm publish --provenance --access public` inside a GitHub Environment
called `npm`.

**Primary path: Trusted Publishing (OIDC)** - no long-lived token,
GitHub Actions proves identity to npm at publish time. This is what
the workflow uses by default and what npm explicitly recommends for
CI/CD. The legacy token path is documented as a breakglass fallback
at the bottom (Appendix A).

## Tagging is automated - don't run `npm version` by hand

`release-please` (see `.github/workflows/release-please.yml`) consumes
conventional commits on `main` and maintains a draft
`chore(main): release X.Y.Z` PR with the version bump + changelog.
Merge that PR when you want to ship. release-please then tags `vX.Y.Z`,
which fires the workflow described in the rest of this doc. The only
time you tag by hand is hotfix-on-a-broken-release-please.

## Pre-flight checks (do these first)

| Check | Command | Pass condition |
|---|---|---|
| Tree is clean | `git status` | `nothing to commit` |
| CI is green on `main` | `gh run list -L 1 -w ci` | `success` |
| Local build works | `npm run build && npm test` | both exit 0 |
| Dry-run pack looks right | `npm pack --dry-run` | only files listed in `package.json#files` |
| Version was bumped | `node -p "require('./package.json').version"` | matches the tag you're about to push |

## Step 1 - Create the `npm` environment on GitHub

The workflow targets `environment: name: npm`. If the environment is
absent, the job hangs or fails. Create it once:

```bash
OWNER=heavygee REPO=openacp-openai-tts-plugin
gh api -X PUT "repos/$OWNER/$REPO/environments/npm" --input - <<'EOF'
{
  "wait_timer": 0,
  "reviewers": [],
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
EOF

gh api -X POST "repos/$OWNER/$REPO/environments/npm/deployment-branch-policies" \
  -f name='v*' -f type='tag'
```

Only refs matching `v*` can deploy to `npm`. A random branch push can
never trigger a publish even if the workflow trigger were bypassed.

**Optional manual gate:** add yourself as a required reviewer so every
publish needs a one-click approval in the Actions UI:

```bash
USER_ID=$(gh api users/heavygee --jq .id)
gh api -X PUT "repos/$OWNER/$REPO/environments/npm" --input - <<EOF
{
  "wait_timer": 0,
  "reviewers": [{"type": "User", "id": $USER_ID}],
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
EOF
```

## Step 2 - Configure npm Trusted Publisher

This is the single security-critical step. Once configured, npm only
accepts publishes that come from this exact GitHub repo + workflow +
environment combo, regardless of which tokens may exist on the account.

**First-publish chicken-and-egg:** npm's trusted-publisher form only
appears once the package exists. For a brand-new unpublished package
(this is one), do the first publish with a short-lived granular token
(Appendix A), then configure Trusted Publishing on the package page,
then strip the token. After that all subsequent publishes are
tokenless.

After the first publish exists at
<https://www.npmjs.com/package/openacp-openai-tts-plugin>:

1. Sign in to <https://www.npmjs.com>.
2. Browse to <https://www.npmjs.com/package/openacp-openai-tts-plugin/access> ->
   **Trusted Publishers** -> **Add Trusted Publisher** -> **GitHub Actions**.
3. Fill in:

   | Field | Value |
   |---|---|
   | Organization or user | `heavygee` |
   | Repository | `openacp-openai-tts-plugin` |
   | Workflow filename | `release.yml` |
   | Environment | `npm` |

4. Save. No token is generated or copied - npm just records the OIDC
   issuer it will accept.

## Step 3 - Verify the workflow is OIDC-ready

`.github/workflows/release.yml` should have:

- `permissions.id-token: write` (lets the runner mint an OIDC token)
- `actions/setup-node` with `node-version: "22"` and `registry-url: https://registry.npmjs.org/`
- An explicit `npm install -g npm@latest` step before `npm publish`
- `npm publish --provenance --access public` with **no** `NODE_AUTH_TOKEN`

### npm CLI version requirement (the gotcha)

Tokenless OIDC publishing requires **npm CLI >= 11.5.1**. Older npm
versions sign the provenance attestation (which uses the OIDC token
directly via sigstore) but then still demand a bearer token for the
actual `PUT /package` request, and 404 without one.

`actions/setup-node@v6` with `node-version: "22"` ships npm 10.x, which
will fail. The reliable recipe is to always force `npm install -g
npm@latest` as a workflow step before any publish.

## Step 4 - Confirm `package.json#repository.url`

Provenance attestation verifies the package came from this exact repo.
The `repository.url` in `package.json` is the source of truth:

```json
"repository": { "type": "git", "url": "https://github.com/heavygee/openacp-openai-tts-plugin" }
```

If you ever rename the GitHub repo or fork it, update `repository.url`
**before** the next tag or `--provenance` will fail.

## Step 5 - First release (one-time bootstrap)

Because npm Trusted Publishing requires the package to already exist
on npm, the very first publish must use a granular token. After that,
subsequent publishes go through OIDC.

1. Generate a granular token (Appendix A). Set scope `All packages`
   (so the first publish can register the name) and **Bypass 2FA when
   publishing this package** = YES.
2. Add it as `NPM_TOKEN` in the `npm` GitHub environment:
   ```bash
   gh secret set NPM_TOKEN --repo "heavygee/openacp-openai-tts-plugin" --env npm --body "npm_xxx"
   ```
3. Temporarily edit `release.yml`'s publish step to include the
   `NODE_AUTH_TOKEN` env (see Appendix A snippet).
4. Tag `v1.0.0`:
   ```bash
   git tag -a v1.0.0 -m "v1.0.0"
   git push origin v1.0.0
   ```
5. Watch `gh run watch`. After it succeeds, visit npm and configure
   Trusted Publisher (Step 2 above).
6. Revoke the token:
   ```bash
   gh secret delete NPM_TOKEN --repo "heavygee/openacp-openai-tts-plugin" --env npm
   ```
   And revoke it on <https://www.npmjs.com/settings/~/tokens>.
7. Revert `release.yml` to the OIDC-only shape (no `NODE_AUTH_TOKEN`).

From release `v1.0.1` onward, the chain is automatic: merge release-please's
PR -> tag pushed -> publish -> GitHub Release.

## Step 6 - Verify the publish

```bash
npm view openacp-openai-tts-plugin                        # latest dist-tag matches
npm view openacp-openai-tts-plugin dist.attestations      # provenance present
gh release view "v$(npm view openacp-openai-tts-plugin version)" --repo heavygee/openacp-openai-tts-plugin
```

The npm page should show a green "Provenance" badge linking back to
the GitHub Actions run.

## Things that go wrong

| Symptom | Cause | Fix |
|---|---|---|
| `Error: Trusted Publisher not configured` | npm-side Trusted Publisher missing or pointing at wrong workflow/env | Re-do Step 2; verify workflow filename + environment name match exactly |
| `npm error code EOTP` | Workflow is using the legacy token path AND the token doesn't bypass 2FA | Remove `NODE_AUTH_TOKEN` from `release.yml`; Trusted Publishing doesn't use tokens at all |
| `npm error code E403 - 403 Forbidden` | Trusted Publisher exists but env name in workflow doesn't match the npm-side configuration | Align `environment: name:` in `release.yml` with the npm Trusted Publisher form |
| `tag v0.1.x does not match package.json 0.1.y` | Forgot to bump `package.json` before tagging | Delete tag (`git tag -d v0.1.x && git push --delete origin v0.1.x`), bump, retag |
| `npm error provenance: failed to verify` | Renamed repo, or pushed from a fork, or `repository.url` drifted | Realign `package.json#repository.url` with the actual remote |
| Workflow stuck on "Waiting for review" | Required reviewer configured in env, no approver online | Approve via Actions UI, or remove the reviewer requirement |
| `npm error 404 Not Found` on first publish | `NPM_TOKEN` missing the `bypass_2fa` flag, or token lacks `All packages` scope | Regenerate the granular token with both flags set |

---

## Appendix A - Legacy token path (breakglass / first-ever publish)

Use this only if Trusted Publishing isn't yet configured (e.g. the
package doesn't exist on npm yet) or as a fallback if OIDC ever fails.

### Generate a token

1. <https://www.npmjs.com/settings/~/tokens> -> **Generate New Token ->
   Granular Access Token**.
2. Fill in:

   | Field | Value |
   |---|---|
   | Token name | `openacp-openai-tts-plugin-bootstrap` |
   | Expiration | 7 days (short - this is one-shot) |
   | Allowed IP ranges | leave blank |
   | Permissions -> Packages and scopes | `Read and write` |
   | Packages and scopes | `All packages` (since the package doesn't exist yet) |
   | **Bypass 2FA when publishing this package** | **YES** (CI cannot enter an OTP) |

3. Copy the token.

### Wire it up

```bash
gh secret set NPM_TOKEN --repo "heavygee/openacp-openai-tts-plugin" --env npm --body "npm_xxx"
```

### Restore the workflow temporarily

Replace the publish step in `release.yml` with:

```yaml
- name: Publish to npm with provenance
  run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Then revert

After the publish succeeds, **revoke the token immediately**, remove
the secret, and restore the OIDC-only version of `release.yml`.
Long-lived tokens are a liability; minimise the window they're alive.

## Last reviewed

- 2026-06-17 - v1.0.1 bootstrap complete; Trusted Publisher configured; OIDC-only `release.yml`
