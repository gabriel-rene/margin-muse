import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PERSONAS, type PersonaId } from '@/lib/personas'
import { validateMuseOutput } from '@/lib/muse-validation'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { text, persona, context } = body as {
    text: string
    persona: PersonaId
    context?: string
  }

  if (!text || !persona || !PERSONAS[persona]) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const personaDef = PERSONAS[persona]
  const userMessage = context
    ? `Document context (do not comment on this, only use it to understand the selected passage):\n\n${context.slice(0, 3000)}\n\n---\n\nSelected passage:\n\n${text}`
    : `Selected passage:\n\n${text}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: personaDef.systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : null
  const question = raw ? validateMuseOutput(raw) : null

  return NextResponse.json({ question, persona })
}
