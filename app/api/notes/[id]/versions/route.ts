import { NextResponse } from 'next/server'
import { getVaultRoot, listVersions, snapshotNote } from '@/lib/vault'

export const runtime = 'nodejs'

interface Params {
  params: { id: string }
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const versions = await listVersions(getVaultRoot(), params.id)
    return NextResponse.json({ versions })
  } catch {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const version = await snapshotNote(getVaultRoot(), params.id)
    return NextResponse.json(version)
  } catch {
    return NextResponse.json({ error: 'Unable to snapshot note' }, { status: 500 })
  }
}
