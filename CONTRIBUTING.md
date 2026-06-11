# Contributing to openacp-openai-tts-plugin

Bugfixes, new server defaults, doc improvements - all welcome. This is a
small focused plugin and the contribution overhead should match that.

## Issue-first workflow

**No ticket, no workee.** Bugs and feature requests both need a GitHub
Issue *before* implementation work starts, so we can agree on scope and
avoid duplicate effort. Exceptions: one-line typo / doc fixes, or fixes
you've already coordinated with a maintainer.

1. Search [existing issues](https://github.com/heavygee/openacp-openai-tts-plugin/issues)
   to avoid duplicates.
2. Open a new issue using the bug-report or feature-request template.
3. Wait for `accepted` / `help wanted` / a maintainer reply before
   investing significant time.

## Local setup

```bash
git clone https://github.com/heavygee/openacp-openai-tts-plugin.git
cd openacp-openai-tts-plugin
npm install

npm run build      # compiles src/ -> dist/
npm test           # vitest unit tests
npm run dev        # tsc --watch for iterating
```

You need **Node 20+** and **npm 10+**. The plugin loads inside an
OpenACP CLI host (`@openacp/cli >= 2026.518.2`); to test against a real
server you also need an OpenAI-compatible TTS endpoint reachable from
your machine (Kokoro, Chatterbox, AllTalk, F5-TTS, etc.).

## Pull request checklist

- [ ] Linked to an open issue (`Fixes #N`) unless it's a trivial doc fix
- [ ] Conventional commit title (see below)
- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm test` passes (vitest)
- [ ] Manual smoke check against at least one real server when changing
  `provider.ts` (Kokoro is easiest: `docker run -p 8880:8880 ...`)
- [ ] README updated when user-facing behaviour changes (new config key,
  new server default, new endpoint shape)
- [ ] CHANGELOG entry added under `## [Unreleased]` for non-trivial
  user-visible changes (release-please will format/move it on release)

CI runs the same checks (tsc + vitest + gitleaks + semgrep). PRs can't
merge to `main` until the aggregate `ci` job is green.

To run the Semgrep OWASP gate locally before pushing (recommended for
larger changes):

```bash
bash scripts/owasp-gate.sh   # uses Docker pinned image if available, falls back to local semgrep
```

## Conventional commits

PR titles and merge commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Piper server default port
fix: handle 401 from Bearer-protected endpoints without crashing
docs: document Chatterbox voice-file path requirement
chore: bump @openacp/plugin-sdk
ci: add Semgrep TypeScript pack
refactor: extract Chatterbox upload into separate method
test: add fixture for empty-text input
```

Breaking changes get a `!` suffix or a `BREAKING CHANGE:` footer.
release-please reads these to generate `CHANGELOG.md` and the next
version bump.

## Style notes

- **TypeScript strict** - no `any`, no `// @ts-ignore`. The type imports
  from `@openacp/plugin-sdk` are the source of truth; if a contract
  changes upstream, update the SDK pin in `devDependencies` rather than
  reaching for `as any`.
- **Don't log secrets.** API keys, bearer tokens, and the resolved
  `Authorization` header must never be `console.log`'d. The semgrep
  rule `log-jwt-or-token` enforces this; if you need to surface auth
  state, log truncated last-4 chars at most.
- **Network errors** must not crash the plugin host. The `setup()`
  health check is intentionally non-fatal (server may be cold-starting).
  Real failures during `synthesize()` should throw with the upstream
  status code + body for the host to surface.
- **No new runtime dependencies** without an issue / PR explaining why.
  Currently zero runtime npm deps; that's a feature.

## Cutting a release

**Releases are automated** via [release-please](https://github.com/googleapis/release-please).
You don't run `npm version` or `git tag` by hand.

How it works:

1. Land changes on `main` using [conventional commits](https://www.conventionalcommits.org/)
   (PR titles, since we squash-merge: `fix: ...`, `feat: ...`, `feat!: ...` for breaking).
2. release-please opens (or updates) a draft `chore(main): release X.Y.Z` PR
   with the bumped `package.json` and an auto-generated `CHANGELOG.md` entry.
3. Merge that release PR when you're ready to ship.
4. release-please tags `vX.Y.Z` and creates the GitHub Release.
5. The tag-triggered `release.yml` (OIDC trusted publishing) takes it
   from there - publishes to npm with provenance.

See [`NPM_SETUP.md`](NPM_SETUP.md) for the npm Trusted Publishing wiring
(one-time setup).

If you ever need to release manually (release-please is broken, urgent
hotfix): bump `package.json`, append a dated `CHANGELOG.md` entry, push
`vX.Y.Z` and the tag-triggered workflow still works.

## Reporting security issues

Please **don't** open public issues for security problems. See
[SECURITY.md](SECURITY.md) for the private reporting channel.

## Where to find help

- Real-time: open an [issue](https://github.com/heavygee/openacp-openai-tts-plugin/issues)
  with the `question` label
- Async: see [SUPPORT.md](SUPPORT.md)

## Code of conduct

By participating you agree to our [Code of Conduct](CODE_OF_CONDUCT.md).
