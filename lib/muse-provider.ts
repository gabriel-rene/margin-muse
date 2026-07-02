import { GoogleGenAI } from '@google/genai'

/**
 * Server-side muse backends. `gemini` calls the hosted Gemini API;
 * `ollama` and `lmstudio` talk to a local server through the
 * OpenAI-compatible /v1/chat/completions endpoint both expose, so no
 * provider SDK is needed and nothing ever leaves the machine.
 */
export type MuseProviderId = 'gemini' | 'ollama' | 'lmstudio'

export interface MuseProviderConfig {
  provider: MuseProviderId
  model: string
  /** Base URL of the local server (ollama/lmstudio only). */
  baseUrl: string
}

const PROVIDER_DEFAULTS: Record<MuseProviderId, { model: string; baseUrl: string }> = {
  gemini: { model: 'gemini-2.5-flash', baseUrl: '' },
  // Ollama needs a real model tag (`ollama pull llama3.2`).
  ollama: { model: 'llama3.2', baseUrl: 'http://localhost:11434' },
  // LM Studio serves whatever model is loaded in the UI; the name is advisory.
  lmstudio: { model: 'local-model', baseUrl: 'http://localhost:1234' },
}

// Local models on modest hardware can take a while to first token.
const LOCAL_TIMEOUT_MS = 60_000

export function getMuseProviderConfig(env: NodeJS.ProcessEnv = process.env): MuseProviderConfig {
  const raw = (env.MUSE_PROVIDER ?? 'gemini').toLowerCase().trim()
  const provider: MuseProviderId = raw === 'ollama' || raw === 'lmstudio' ? raw : 'gemini'
  const defaults = PROVIDER_DEFAULTS[provider]
  return {
    provider,
    model: env.MUSE_MODEL?.trim() || defaults.model,
    baseUrl: (env.MUSE_LOCAL_URL?.trim() || defaults.baseUrl).replace(/\/+$/, ''),
  }
}

async function generateWithGemini(
  config: MuseProviderConfig,
  systemPrompt: string,
  userMessage: string,
  apiKey: string
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey })
  const result = await ai.models.generateContent({
    model: config.model,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1024,
      // The muse asks one short question; reasoning would only eat the
      // output budget (and on 2.5 Flash it can consume all of it,
      // returning empty text).
      thinkingConfig: { thinkingBudget: 0 },
    },
  })
  return (result.text ?? '').trim() || null
}

async function generateWithLocal(
  config: MuseProviderConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(LOCAL_TIMEOUT_MS),
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 512,
      stream: false,
    }),
  })
  if (!res.ok) {
    throw new Error(`${config.provider} responded ${res.status}`)
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content ?? ''
  return stripReasoning(content).trim() || null
}

/**
 * Local reasoning models (deepseek-r1, qwen3, …) emit <think>…</think>
 * blocks before the answer. The muse only wants the answer.
 */
export function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '')
}

export async function generateMuseQuestion(
  config: MuseProviderConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string | null> {
  if (config.provider === 'gemini') {
    return generateWithGemini(config, systemPrompt, userMessage, process.env.GEMINI_API_KEY ?? '')
  }
  return generateWithLocal(config, systemPrompt, userMessage)
}
