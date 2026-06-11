# openacp-openai-tts-plugin

OpenACP plugin — TTS via any OpenAI-compatible `/v1/audio/speech` endpoint.

Works out of the box with **Kokoro**, **AllTalk**, **F5-TTS**, **StyleTTS2**, and any other server that implements the OpenAI audio speech API. Includes an optional **Chatterbox voice-cloning mode** that uses the `/audio/speech/upload` multipart endpoint for servers that need a reference WAV.

---

## Install

```bash
openacp plugin install openacp-openai-tts-plugin
```

## Configure

During install you will be prompted for:

- **Server URL** - base URL of your TTS server (default: `http://localhost:8880` for Kokoro)
- **Model** - model name to pass to the server (default: `kokoro`)
- **Voice** - voice identifier (default: `af_bella`); used by the standard `/v1/audio/speech` endpoint
- **API key** - optional; sent as `Authorization: Bearer <key>` if provided
- **Voice file path** - optional; absolute path to a reference WAV >5s; enables Chatterbox mode (see below)

Reconfigure at any time:

```bash
openacp plugin configure openacp-openai-tts-plugin
```

Then point `@openacp/speech` at this provider:

```json
// plugins/data/@openacp/speech/settings.json
{ "ttsProvider": "openai-compatible" }
```

---

## Server quick-reference

Popular local TTS servers and their default ports:

- **Kokoro** - `http://localhost:8880` - model: `kokoro`, voices: `af_bella`, `bm_george`, etc.
- **AllTalk** - `http://localhost:7851` - model: depends on loaded model
- **F5-TTS** - `http://localhost:7860` - model: `F5-TTS`
- **Chatterbox** - `http://localhost:18002` - model: `chatterbox-turbo` (see Chatterbox mode below)

---

## Chatterbox mode

Chatterbox's standard `/v1/audio/speech` endpoint ignores the `voice` field and uses a server-side configured sample — which is often <5s on a default install, causing a `"Audio prompt must be longer than 5 seconds!"` error.

Set `voiceFilePath` to an absolute path pointing at a WAV file longer than 5 seconds. The plugin will switch to the `/audio/speech/upload` multipart endpoint, sending your reference WAV on every request for voice cloning.

When running OpenACP in Docker, mount your voices directory and use the container path:

```yaml
# compose.yml
services:
  openacp:
    ...
    volumes:
      - /path/to/voices:/voices:ro
    extra_hosts:
      - host.docker.internal:host-gateway
```

Then set:
- endpoint: `http://host.docker.internal:18002`
- voiceFilePath: `/voices/your-voice.wav`

---

## Paralinguistic tags (Chatterbox)

Embed these directly in text for expressive output:

`[laugh]` `[chuckle]` `[cough]` `[sigh]` `[gasp]` `[clear throat]`

---

## License

MIT
