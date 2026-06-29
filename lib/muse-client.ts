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

export async function callMuse(params: MuseRequest): Promise<MuseResponse> {
  const res = await fetch('/api/muse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw new Error(`Muse API error: ${res.status}`)
  return res.json()
}
