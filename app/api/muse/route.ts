import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { PERSONAS, type PersonaId } from '@/lib/personas'
import { validateMuseOutput } from '@/lib/muse-validation'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })

// This route is an unauthenticated proxy to a paid API. Bound every input so a
// hostile caller can't run up token cost or DoS the parser with a huge body.
const MAX_BODY_BYTES = 64_000 // selection + a window of context, never a whole doc
const MAX_TEXT_CHARS = 8_000 // the selected passage
const MAX_CONTEXT_CHARS = 3_000 // surrounding context actually sent to the model

export async function POST(req: NextRequest) {
  // Reject oversized bodies before we even parse them.
  const declaredLength = Number(req.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body: { text?: unknown; persona?: unknown; context?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, persona, context } = body

  // Validate types and the persona allow-list, not just truthiness.
  if (
    typeof text !== 'string' ||
    text.trim().length === 0 ||
    text.length > MAX_TEXT_CHARS ||
    typeof persona !== 'string' ||
    !(persona in PERSONAS) ||
    (context !== undefined && typeof context !== 'string')
  ) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const personaDef = PERSONAS[persona as PersonaId]
  const boundedContext =
    typeof context === 'string' ? context.slice(0, MAX_CONTEXT_CHARS) : ''
  const userMessage = boundedContext
    ? `Document context (do not comment on this, only use it to understand the selected passage):\n\n${boundedContext}\n\n---\n\nSelected passage:\n\n${text}\n\n---\n\nRespond in the same language as the selected passage.`
    : `Selected passage:\n\n${text}\n\n---\n\nRespond in the same language as the selected passage.`

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction: personaDef.systemPrompt,
        maxOutputTokens: 1024,
      },
    })

    const raw = (result.text ?? '').trim() || null
    const question = raw ? validateMuseOutput(raw) : null

    return NextResponse.json({ question, persona })
  } catch (err) {
    console.error('[muse] Gemini error:', err)
    return NextResponse.json({ error: 'Muse unavailable' }, { status: 500 })
  }
}
