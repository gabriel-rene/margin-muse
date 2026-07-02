import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  generateMuseQuestion,
  getMuseProviderConfig,
  stripReasoning,
} from '@/lib/muse-provider'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getMuseProviderConfig', () => {
  it('defaults to gemini', () => {
    expect(getMuseProviderConfig({})).toEqual({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      baseUrl: '',
    })
  })

  it('selects ollama with its default endpoint and model', () => {
    expect(getMuseProviderConfig({ MUSE_PROVIDER: 'ollama' })).toEqual({
      provider: 'ollama',
      model: 'llama3.2',
      baseUrl: 'http://localhost:11434',
    })
  })

  it('selects lmstudio with its default endpoint', () => {
    expect(getMuseProviderConfig({ MUSE_PROVIDER: 'lmstudio' })).toEqual({
      provider: 'lmstudio',
      model: 'local-model',
      baseUrl: 'http://localhost:1234',
    })
  })

  it('honors model and URL overrides and strips trailing slashes', () => {
    const config = getMuseProviderConfig({
      MUSE_PROVIDER: 'ollama',
      MUSE_MODEL: 'qwen3:8b',
      MUSE_LOCAL_URL: 'http://192.168.1.20:11434/',
    })
    expect(config.model).toBe('qwen3:8b')
    expect(config.baseUrl).toBe('http://192.168.1.20:11434')
  })

  it('falls back to gemini on unknown provider values', () => {
    expect(getMuseProviderConfig({ MUSE_PROVIDER: 'closedai' }).provider).toBe('gemini')
  })
})

describe('local generation (OpenAI-compatible)', () => {
  const config = {
    provider: 'ollama' as const,
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
  }

  it('sends system + user messages and returns the answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: 'What backs this claim?' } }] }),
        { status: 200 }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const question = await generateMuseQuestion(config, 'persona prompt', 'the passage')
    expect(question).toBe('What backs this claim?')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:11434/v1/chat/completions')
    const body = JSON.parse(init.body)
    expect(body.model).toBe('llama3.2')
    expect(body.messages).toEqual([
      { role: 'system', content: 'persona prompt' },
      { role: 'user', content: 'the passage' },
    ])
  })

  it('strips <think> reasoning blocks from local model output', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              { message: { content: '<think>the writer seems…</think>\nIs this the real stake?' } },
            ],
          }),
          { status: 200 }
        )
      )
    )
    const question = await generateMuseQuestion(config, 'p', 'u')
    expect(question).toBe('Is this the real stake?')
  })

  it('returns null for empty output and throws on server errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 })
      )
    )
    expect(await generateMuseQuestion(config, 'p', 'u')).toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('model not found', { status: 404 })))
    await expect(generateMuseQuestion(config, 'p', 'u')).rejects.toThrow('ollama responded 404')
  })
})

describe('stripReasoning', () => {
  it('removes think blocks and leaves plain output alone', () => {
    expect(stripReasoning('<think>a\nb</think>answer')).toBe('answer')
    expect(stripReasoning('just a question?')).toBe('just a question?')
  })
})
