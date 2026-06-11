import type { OpenACPPlugin, PluginContext, InstallContext } from '@openacp/plugin-sdk'
import type { SpeechServiceInterface } from '@openacp/plugin-sdk'
import { OpenAITTSProvider, type OpenAITTSConfig } from './provider.js'

const PROVIDER_NAME = 'openai-compatible'

const DEFAULTS = {
  endpoint: 'http://localhost:8880',
  model: 'kokoro',
  voice: 'af_bella',
} as const

// Module-level ref so teardown can unregister without ctx
let _speechService: SpeechServiceInterface | null = null

function loadConfig(pluginConfig: Record<string, unknown>): OpenAITTSConfig {
  return {
    endpoint: (pluginConfig.endpoint as string) || DEFAULTS.endpoint,
    model: (pluginConfig.model as string) || DEFAULTS.model,
    voice: (pluginConfig.voice as string) || DEFAULTS.voice,
    apiKey: (pluginConfig.apiKey as string | undefined) || undefined,
    voiceFilePath: (pluginConfig.voiceFilePath as string | undefined) || undefined,
  }
}

const plugin: OpenACPPlugin = {
  name: 'openacp-openai-tts-plugin',
  version: '1.0.0',
  description: 'TTS via any OpenAI-compatible /v1/audio/speech endpoint (Kokoro, Chatterbox, AllTalk, F5-TTS, etc.)',
  essential: false,
  permissions: ['services:use'],
  pluginDependencies: { '@openacp/speech': '>=1.0.0' },

  async install(ctx: InstallContext) {
    const endpoint = await ctx.terminal.text({
      message: 'Server URL (e.g. http://localhost:8880 for Kokoro, :18002 for Chatterbox):',
      defaultValue: DEFAULTS.endpoint,
    })
    const model = await ctx.terminal.text({
      message: 'Model name:',
      defaultValue: DEFAULTS.model,
    })
    const voice = await ctx.terminal.text({
      message: 'Voice name (used by standard /v1/audio/speech endpoint):',
      defaultValue: DEFAULTS.voice,
    })
    const apiKey = await ctx.terminal.text({
      message: 'API key (leave blank if not required):',
      defaultValue: '',
    })
    const voiceFilePath = await ctx.terminal.text({
      message: 'Path to reference WAV for Chatterbox voice-cloning (leave blank for standard mode):',
      defaultValue: '',
    })

    await ctx.settings.set('endpoint', endpoint.trim() || DEFAULTS.endpoint)
    await ctx.settings.set('model', model.trim() || DEFAULTS.model)
    await ctx.settings.set('voice', voice.trim() || DEFAULTS.voice)
    if (apiKey.trim()) await ctx.settings.set('apiKey', apiKey.trim())
    if (voiceFilePath.trim()) await ctx.settings.set('voiceFilePath', voiceFilePath.trim())

    ctx.terminal.log.success('OpenAI-compatible TTS plugin configured')
  },

  async configure(ctx: InstallContext) {
    const current = await ctx.settings.getAll()

    const endpoint = await ctx.terminal.text({
      message: `Server URL (current: ${current.endpoint ?? DEFAULTS.endpoint}):`,
      defaultValue: (current.endpoint as string) || DEFAULTS.endpoint,
    })
    const model = await ctx.terminal.text({
      message: `Model (current: ${current.model ?? DEFAULTS.model}):`,
      defaultValue: (current.model as string) || DEFAULTS.model,
    })
    const voice = await ctx.terminal.text({
      message: `Voice (current: ${current.voice ?? DEFAULTS.voice}):`,
      defaultValue: (current.voice as string) || DEFAULTS.voice,
    })
    const apiKey = await ctx.terminal.text({
      message: `API key (current: ${current.apiKey ? '***' : 'not set'}):`,
      defaultValue: '',
    })
    const voiceFilePath = await ctx.terminal.text({
      message: `Chatterbox voice WAV path (current: ${current.voiceFilePath ?? 'not set'}):`,
      defaultValue: (current.voiceFilePath as string) || '',
    })

    await ctx.settings.set('endpoint', endpoint.trim() || DEFAULTS.endpoint)
    await ctx.settings.set('model', model.trim() || DEFAULTS.model)
    await ctx.settings.set('voice', voice.trim() || DEFAULTS.voice)
    if (apiKey.trim()) await ctx.settings.set('apiKey', apiKey.trim())
    if (voiceFilePath.trim()) await ctx.settings.set('voiceFilePath', voiceFilePath.trim())

    ctx.terminal.log.success('Configuration updated')
  },

  async setup(ctx: PluginContext) {
    const cfg = loadConfig((ctx.pluginConfig ?? {}) as Record<string, unknown>)
    const mode = cfg.voiceFilePath ? 'chatterbox-upload' : 'standard'
    console.log(`[openai-tts] setup — endpoint: ${cfg.endpoint}, mode: ${mode}`)

    // Non-fatal health check
    try {
      const res = await fetch(`${cfg.endpoint}/health`, { signal: AbortSignal.timeout(4000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      ctx.log.info(`[openai-tts] server reachable at ${cfg.endpoint} (mode: ${mode})`)
    } catch (err) {
      console.warn(`[openai-tts] server unreachable at ${cfg.endpoint}: ${(err as Error).message}`)
    }

    const speechService = ctx.getService<SpeechServiceInterface>('speech')
    if (!speechService) {
      console.error('[openai-tts] @openacp/speech service not found')
      throw new Error('[openai-tts] @openacp/speech service not found')
    }

    _speechService = speechService
    speechService.registerTTSProvider(PROVIDER_NAME, new OpenAITTSProvider(cfg))
    ctx.log.info(`[openai-tts] TTS provider registered (${PROVIDER_NAME})`)
  },

  async teardown() {
    _speechService?.unregisterTTSProvider(PROVIDER_NAME)
    _speechService = null
  },
}

export default plugin
