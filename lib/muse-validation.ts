const REPLACEMENT_SIGNALS = [
  /\btry:/i,
  /\bconsider writing:/i,
  /\byou could (say|write|phrase|put it as)\b.*"/i,
  /\bsomething like\b.*"/i,
]

function countSentences(text: string): number {
  // Split on sentence-ending punctuation followed by whitespace or end of string
  const matches = text.match(/[.!?]+(\s|$)/g)
  return matches ? matches.length : 1
}

/** Returns the trimmed question if valid, null if it should be rejected. */
export function validateMuseOutput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.toLowerCase() === 'null') return null

  for (const pattern of REPLACEMENT_SIGNALS) {
    if (pattern.test(trimmed)) return null
  }

  if (countSentences(trimmed) > 2) return null

  return trimmed
}
