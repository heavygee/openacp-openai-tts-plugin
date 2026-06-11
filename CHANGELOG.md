# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Repository hardening pass: CI gates (`tsc` + `vitest` + gitleaks
  `secret-scan` + Semgrep `owasp-sast` + aggregate `ci`), Dependabot
  weekly updates (npm + github-actions), label sync, issue templates,
  PR template, `FUNDING.yml`, release-please automation, npm Trusted
  Publishing release workflow, governance docs (CONTRIBUTING,
  SECURITY, CODE_OF_CONDUCT, SUPPORT, AGENTS), `.editorconfig`,
  Husky pre-commit + gitleaks-staged hook for free-private fallback.

## [1.0.0] - 2026-06-11

### Added
- Initial release. OpenACP plugin exposing the `openai-compatible` TTS
  provider name. Standard mode targets `POST /v1/audio/speech` for
  Kokoro / AllTalk / F5-TTS / StyleTTS2 / any conformant server.
- Optional Chatterbox voice-cloning mode: when `voiceFilePath` points
  at a >5s WAV, the provider switches to `POST /audio/speech/upload`
  and sends the reference WAV multipart on every synthesis call.
  In-memory voice buffer cache with 5-minute TTL.
- Bearer-token auth via the optional `apiKey` config field.
- Interactive `install` and `configure` flows asking for endpoint,
  model, voice, API key, and voice file path.
- vitest coverage for the plugin contract (registers + unregisters the
  provider, surfaces missing speech service, applies defaults).
