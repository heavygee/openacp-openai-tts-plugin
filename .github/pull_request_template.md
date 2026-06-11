<!--
  Thanks for the PR! Please fill out the sections below. Empty / nonsense
  templates may be auto-closed.
-->

## Summary

<!-- One paragraph: what's changing and why. -->

## Linked issue

Fixes #<!-- issue number -->

<!-- If there's no linked issue and this isn't a trivial doc fix, please open
     one first per CONTRIBUTING.md. -->

## How to verify

<!-- Steps a reviewer can run locally. Include exact commands and what they
     should see. -->

- [ ] `npm run build` clean (no TypeScript errors)
- [ ] `npm test` passes (vitest)
- [ ] `npm pack --dry-run` tarball contents look right (no node_modules / .env)
- [ ] Manually exercised against a real server (specify which: Kokoro / Chatterbox / AllTalk / F5-TTS / other)
- [ ] README + CHANGELOG updated when user-facing behaviour changes

## Risk / blast radius

<!-- Who's affected if this misbehaves? Existing users on `npm update`?
     New users only? Just one server type? -->

## Server tested against

<!-- e.g. Kokoro 0.19.0 on http://localhost:8880 with model=kokoro voice=af_bella
     Chatterbox 1.x on http://host.docker.internal:18002 with voiceFilePath set -->
