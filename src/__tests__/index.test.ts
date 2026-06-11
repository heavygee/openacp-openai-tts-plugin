import { describe, it, expect, vi, beforeEach } from 'vitest'
import plugin from '../index.js'
import { OpenAITTSProvider } from '../provider.js'
import type { PluginContext } from '@openacp/plugin-sdk'

// ---------------------------------------------------------------------------
// Minimal mock helpers
// ---------------------------------------------------------------------------

function makeSpeechService() {
  const providers = new Map<string, unknown>()
  return {
    registerTTSProvider: vi.fn((name: string, p: unknown) => providers.set(name, p)),
    unregisterTTSProvider: vi.fn((name: string) => providers.delete(name)),
    registerSTTProvider: vi.fn(),
    isTTSAvailable: vi.fn(() => true),
    isSTTAvailable: vi.fn(() => false),
    synthesize: vi.fn(),
    transcribe: vi.fn(),
    getProvider: (name: string) => providers.get(name),
  }
}

function makeCtx(cfg: Record<string, unknown> = {}, speechService?: ReturnType<typeof makeSpeechService>): PluginContext {
  const services = new Map<string, unknown>()
  if (speechService) services.set('speech', speechService)

  return {
    pluginName: 'openacp-openai-tts-plugin',
    pluginConfig: cfg,
    instanceRoot: '/tmp/test',
    log: { trace: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn(), child: vi.fn() },
    getService: <T>(name: string) => services.get(name) as T | undefined,
    registerService: vi.fn(),
    registerCommand: vi.fn(),
    registerMiddleware: vi.fn(),
    registerMenuItem: vi.fn(),
    unregisterMenuItem: vi.fn(),
    registerAssistantSection: vi.fn(),
    unregisterAssistantSection: vi.fn(),
    registerEditableFields: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    emitHook: vi.fn(async (_n: string, p: unknown) => p),
    defineHook: vi.fn(),
    sendMessage: vi.fn(),
    notify: vi.fn(),
    getSessionInfo: vi.fn(),
    storage: {} as PluginContext['storage'],
    sessions: {} as PluginContext['sessions'],
    config: {} as PluginContext['config'],
    eventBus: {} as PluginContext['eventBus'],
    core: {},
  } as unknown as PluginContext
}

// ---------------------------------------------------------------------------
// Plugin lifecycle
// ---------------------------------------------------------------------------

describe('plugin.setup', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })

  it('registers the openai-compatible TTS provider', async () => {
    const speechService = makeSpeechService()
    const ctx = makeCtx({ endpoint: 'http://localhost:8880', model: 'kokoro', voice: 'af_bella' }, speechService)
    await plugin.setup!(ctx)
    expect(speechService.registerTTSProvider).toHaveBeenCalledWith(
      'openai-compatible',
      expect.any(OpenAITTSProvider),
    )
  })

  it('throws when speech service is missing', async () => {
    const ctx = makeCtx()
    await expect(plugin.setup!(ctx)).rejects.toThrow('@openacp/speech service not found')
  })

  it('uses defaults when config is empty', async () => {
    const speechService = makeSpeechService()
    const ctx = makeCtx({}, speechService)
    await plugin.setup!(ctx)
    expect(speechService.registerTTSProvider).toHaveBeenCalledWith('openai-compatible', expect.any(OpenAITTSProvider))
  })
})

describe('plugin.teardown', () => {
  it('unregisters the provider on teardown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    const speechService = makeSpeechService()
    const ctx = makeCtx({ endpoint: 'http://localhost:8880' }, speechService)
    await plugin.setup!(ctx)
    await plugin.teardown!()
    expect(speechService.unregisterTTSProvider).toHaveBeenCalledWith('openai-compatible')
  })
})

// ---------------------------------------------------------------------------
// OpenAITTSProvider — standard mode
// ---------------------------------------------------------------------------

describe('OpenAITTSProvider (standard mode)', () => {
  it('POSTs to /v1/audio/speech with correct body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAITTSProvider({ endpoint: 'http://localhost:8880', model: 'kokoro', voice: 'af_bella' })
    const result = await provider.synthesize('Hello world')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8880/v1/audio/speech',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body).toMatchObject({ model: 'kokoro', input: 'Hello world', voice: 'af_bella' })
    expect(result.mimeType).toBe('audio/mpeg')
    expect(result.audioBuffer).toBeInstanceOf(Buffer)
  })

  it('includes Authorization header when apiKey is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAITTSProvider({ endpoint: 'http://localhost:8880', model: 'kokoro', voice: 'af_bella', apiKey: 'sk-test' })
    await provider.synthesize('Hi')

    expect(fetchMock.mock.calls[0][1].headers['Authorization']).toBe('Bearer sk-test')
  })

  it('throws on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'Internal server error' }))

    const provider = new OpenAITTSProvider({ endpoint: 'http://localhost:8880', model: 'kokoro', voice: 'af_bella' })
    await expect(provider.synthesize('oops')).rejects.toThrow('TTS request failed (500)')
  })

  it('options.voice overrides config voice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAITTSProvider({ endpoint: 'http://localhost:8880', model: 'kokoro', voice: 'af_bella' })
    await provider.synthesize('test', { voice: 'bm_george' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.voice).toBe('bm_george')
  })

  it('strips trailing slash from endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAITTSProvider({ endpoint: 'http://localhost:8880/', model: 'kokoro', voice: 'af_bella' })
    await provider.synthesize('test')

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8880/v1/audio/speech')
  })
})

// ---------------------------------------------------------------------------
// OpenAITTSProvider — Chatterbox upload mode
// ---------------------------------------------------------------------------

describe('OpenAITTSProvider (Chatterbox upload mode)', () => {
  it('POSTs to /audio/speech/upload when voiceFilePath is set', async () => {
    vi.mock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue(Buffer.from('fake-wav-data')),
    }))

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })
    vi.stubGlobal('fetch', fetchMock)

    const provider = new OpenAITTSProvider({
      endpoint: 'http://localhost:18002',
      model: 'chatterbox-turbo',
      voice: 'default',
      voiceFilePath: '/voices/xev.wav',
    })

    const result = await provider.synthesize('Hello Chatterbox')
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:18002/audio/speech/upload')
    expect(result.mimeType).toBe('audio/mpeg')
  })
})
