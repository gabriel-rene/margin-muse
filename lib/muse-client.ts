import { type PersonaId } from '@/lib/personas'

export interface MuseRequest {
  text: string
  persona: PersonaId
  context?: string
}

export interface MuseResponse {
  question: string | null
  persona: PersonaId
}

// Mirror the server bounds (app/api/muse/route.ts) so an oversized selection
// is trimmed here instead of bouncing off the API with a 400.
const MAX_TEXT_CHARS = 8_000
const MAX_CONTEXT_CHARS = 3_000

export async function callMuse(params: MuseRequest): Promise<MuseResponse> {
  const res = await fetch('/api/muse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      text: params.text.slice(0, MAX_TEXT_CHARS),
      context: params.context?.slice(0, MAX_CONTEXT_CHARS),
    }),
  })
  if (!res.ok) throw new Error(`Muse API error: ${res.status}`)
  return res.json()
}
