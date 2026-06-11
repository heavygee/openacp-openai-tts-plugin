# Getting help

## I have a question / I'm stuck

Open a [GitHub Issue](https://github.com/heavygee/openacp-openai-tts-plugin/issues/new/choose)
and tag it with `question`. Please include:

- `npm view openacp-openai-tts-plugin version` (or commit SHA if running
  from source)
- the TTS server you're targeting (Kokoro, Chatterbox, AllTalk, ...) and
  its version / port
- the redacted endpoint URL (e.g. `http://host.docker.internal:18002`)
- terminal output of the failing call (any `[openai-tts] ...` log lines)
- what you expected to happen

## I found a bug

Use the [bug report template](https://github.com/heavygee/openacp-openai-tts-plugin/issues/new?template=bug_report.yml).

## I have a feature idea

Use the [feature request template](https://github.com/heavygee/openacp-openai-tts-plugin/issues/new?template=feature_request.yml).
Note we triage hard against scope creep - this plugin is intentionally
focused on OpenAI-compatible `/v1/audio/speech` endpoints + the
Chatterbox upload variant. Whisper-style STT, ElevenLabs proprietary
APIs, audio post-processing, etc. belong in separate plugins.

## I think there's a security issue

**Do not open a public issue.** See [SECURITY.md](SECURITY.md) for the
private reporting channels.

## I want to use this with a different TTS server

If your server implements `POST /v1/audio/speech` with the standard
OpenAI body (`{ model, input, voice, response_format }`), it should
just work - point `endpoint` at it and configure `model` + `voice`. If
your server uses a different request shape, open an issue describing
what you're trying to do; we may add a config flag or recommend a
sibling plugin.

## I want to use this without OpenACP

This package is a plugin for the [OpenACP CLI](https://github.com/Open-ACP/OpenACP)
and depends on `@openacp/plugin-sdk` interfaces. The `OpenAITTSProvider`
class in `src/provider.ts` could be extracted into a standalone library
- if that's useful to you, open an issue and we can discuss.
