import { type NoteMeta, type NoteRecord, type SaveNoteInput, type VersionMeta } from '@/lib/note-types'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`Notes API error: ${res.status}`)
  return res.json()
}

export async function listNotesClient(): Promise<NoteMeta[]> {
  const result = await api<{ notes: NoteMeta[] }>('/api/notes')
  return result.notes
}

export async function createNoteClient(title?: string): Promise<NoteRecord> {
  return api<NoteRecord>('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
}

export async function readNoteClient(id: string): Promise<NoteRecord> {
  return api<NoteRecord>(`/api/notes/${encodeURIComponent(id)}`)
}

export async function saveNoteClient(id: string, input: SaveNoteInput): Promise<NoteRecord> {
  return api<NoteRecord>(`/api/notes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export async function listVersionsClient(id: string): Promise<VersionMeta[]> {
  const result = await api<{ versions: VersionMeta[] }>(
    `/api/notes/${encodeURIComponent(id)}/versions`
  )
  return result.versions
}

export async function snapshotNoteClient(id: string): Promise<VersionMeta> {
  return api<VersionMeta>(`/api/notes/${encodeURIComponent(id)}/versions`, {
    method: 'POST',
  })
}
