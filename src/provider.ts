import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import type { TTSProvider, TTSOptions, TTSResult } from '@openacp/plugin-sdk'

export interface OpenAITTSConfig {
  endpoint: string
  model: string
  voice: string
  apiKey?: string
  /**
   * Absolute path to a reference WAV file (>5s).
   * When set, the provider uses the Chatterbox-specific
   * POST /audio/speech/upload multipart endpoint instead of the
   * standard /v1/audio/speech endpoint. Required for Chatterbox
   * voice-cloning; leave unset for all other OpenAI-compatible servers.
   */
  voiceFilePath?: string
}

const VOICE_CACHE_TTL_MS = 300_000 // 5 min

export class OpenAITTSProvider implements TTSProvider {
  readonly name = 'openai-compatible'

  private _voiceCache: Buffer | null = null
  private _voiceCacheExpiry = 0

  constructor(private cfg: OpenAITTSConfig) {}

  private get _baseUrl() {
    return this.cfg.endpoint.replace(/\/$/, '')
  }

  private _authHeaders(): Record<string, string> {
    return this.cfg.apiKey
      ? { Authorization: `Bearer ${this.cfg.apiKey}` }
      : {}
  }

  private async _getVoiceBuffer(): Promise<Buffer> {
    if (this._voiceCache && Date.now() < this._voiceCacheExpiry) {
      return this._voiceCache
    }
    this._voiceCache = await readFile(this.cfg.voiceFilePath!)
    this._voiceCacheExpiry = Date.now() + VOICE_CACHE_TTL_MS
    return this._voiceCache
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<TTSResult> {
    if (this.cfg.voiceFilePath) {
      return this._synthesizeUpload(text, options)
    }
    return this._synthesizeStandard(text, options)
  }

  /** Standard OpenAI-compatible POST /v1/audio/speech */
  private async _synthesizeStandard(text: string, options: TTSOptions): Promise<TTSResult> {
    const url = `${this._baseUrl}/v1/audio/speech`
    const body = JSON.stringify({
      model: options.model ?? this.cfg.model,
      input: text,
      voice: options.voice ?? this.cfg.voice,
      response_format: 'mp3',
    })

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this._authHeaders(),
      },
      body,
    })

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '(no body)')
      throw new Error(`TTS request failed (${resp.status}): ${detail}`)
    }

    return {
      audioBuffer: Buffer.from(await resp.arrayBuffer()),
      mimeType: 'audio/mpeg',
    }
  }

  /**
   * Chatterbox voice-cloning path: POST /audio/speech/upload
   * Uses multipart form with a voice_file reference WAV.
   * Required because Chatterbox's /v1/audio/speech ignores the voice
   * field and relies on a server-side default sample that is often <5s.
   */
  private async _synthesizeUpload(text: string, options: TTSOptions): Promise<TTSResult> {
    const url = `${this._baseUrl}/audio/speech/upload`
    const voiceData = await this._getVoiceBuffer()

    const form = new FormData()
    form.append('input', text)
    form.append('model', options.model ?? this.cfg.model)
    form.append('response_format', 'mp3')
    form.append(
      'voice_file',
      new Blob([voiceData.buffer as ArrayBuffer], { type: 'audio/wav' }),
      basename(this.cfg.voiceFilePath!),
    )

    const resp = await fetch(url, {
      method: 'POST',
      headers: this._authHeaders(),
      body: form,
    })

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '(no body)')
      throw new Error(`Chatterbox TTS upload failed (${resp.status}): ${detail}`)
    }

    return {
      audioBuffer: Buffer.from(await resp.arrayBuffer()),
      mimeType: 'audio/mpeg',
    }
  }
}
