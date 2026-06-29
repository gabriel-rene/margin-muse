import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PERSONAS, type PersonaId } from '@/lib/personas'
import { validateMuseOutput } from '@/lib/muse-validation'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  let body: { text?: string; persona?: PersonaId; context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, persona, context } = body

  if (!text || !persona || !PERSONAS[persona]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const personaDef = PERSONAS[persona]
  const userMessage = context
    ? `Document context (do not comment on this, only use it to understand the selected passage):\n\n${context.slice(0, 3000)}\n\n---\n\nSelected passage:\n\n${text}`
    : `Selected passage:\n\n${text}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: personaDef.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const first = message.content[0]
    const raw = first && first.type === 'text' ? first.text.trim() : null
    const question = raw ? validateMuseOutput(raw) : null

    return NextResponse.json({ question, persona })
  } catch {
    // Anthropic call failed (network, auth, rate limit, overload). Surface a
    // clean 500 rather than an opaque unhandled error; the muse pull is a
    // best-effort augmentation, so the client can fail quietly.
    return NextResponse.json({ error: 'Muse unavailable' }, { status: 500 })
  }
}
