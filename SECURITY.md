# Security policy

## Supported versions

`openacp-openai-tts-plugin` releases follow semver. Security fixes land in
the latest minor of the current major. Older majors get patches only for
critical issues actively exploited in the wild.

| Version | Supported |
|---------|-----------|
| `1.x`   | Yes (current) |

## Reporting a vulnerability

**Please do not file public GitHub issues for security problems.**

Use one of these private channels:

1. **GitHub Security Advisories** (preferred):
   [Report a vulnerability](https://github.com/heavygee/openacp-openai-tts-plugin/security/advisories/new)
   - keeps disclosure private until a fix is ready.
2. **Email:** `openacp-tts-security@heavygee.com`

Please include:

- the version (`npm view openacp-openai-tts-plugin version` or commit SHA)
- a minimal reproduction (plugin config, target server type + version,
  redacted endpoint URL)
- your assessment of impact and any suggested mitigation

We aim to acknowledge within 5 working days and to publish a fix within
30 days for confirmed issues. We will keep you updated and credit you
(or keep you anonymous) in the advisory at your preference.

## Threat model - what is in / out of scope

**In scope:**

- The TypeScript source in `src/` (provider + plugin entrypoint).
- The published npm tarball under `dist/`.
- The CI / release workflows in `.github/`.
- The Chatterbox voice-cloning upload path - reference WAV handling.

**Out of scope:**

- The upstream [OpenACP CLI](https://github.com/Open-ACP/OpenACP) and
  `@openacp/plugin-sdk` itself. Report platform issues to that project.
- The TTS server you point the plugin at (Kokoro, Chatterbox, AllTalk,
  F5-TTS, etc.). Server-side vulnerabilities belong with the upstream
  TTS project.
- Misconfiguration of the operator's environment (world-readable
  plugin settings, leaked API key in shell history, etc).

## Common-sense hygiene

- The `apiKey` setting is stored in the OpenACP plugin settings store
  (typically under `~/.openacp/`). It is sent as
  `Authorization: Bearer <key>` to your TTS endpoint. Treat that file
  like any other credential.
- If your TTS server is reachable on a public network, prefer requiring
  an API key on the server side and configure it here rather than
  exposing the endpoint anonymously.
- Reference voice WAVs (`voiceFilePath`) are read from disk on every
  Chatterbox-mode synthesis call. Don't point this at a path you don't
  own (e.g. an attacker-writable location).
- `--provenance` attestations on every npm publish let you verify the
  package came from the GitHub workflow in this repo:
  ```
  npm view openacp-openai-tts-plugin dist.attestations
  ```

## Past advisories

None yet. This section will populate as advisories are published.
