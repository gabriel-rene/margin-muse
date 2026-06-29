/** Returns the question if valid, or null if it should be rejected. Full validation added in Task 8. */
export function validateMuseOutput(raw: string): string | null {
  if (!raw || raw.toLowerCase() === 'null') return null
  return raw
}
