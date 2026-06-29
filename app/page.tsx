'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@/components/Editor'
import MarginRail from '@/components/MarginRail'
import NotesPanel from '@/components/NotesPanel'
import PaperToneSwitch from '@/components/PaperToneSwitch'
import SoundToggle from '@/components/SoundToggle'
import TitleField from '@/components/TitleField'
import VersionsPanel from '@/components/VersionsPanel'
import WorkspaceShell from '@/components/WorkspaceShell'
import { DEFAULT_TONE, PAPER_TONES, type PaperTone } from '@/lib/paper'
import { type PersonaId } from '@/lib/personas'
import { callMuse } from '@/lib/muse-client'
import { initAudio, playMuseArrivalSound } from '@/lib/sound'
import { loadDocument, loadNotes, saveNotes } from '@/lib/storage'
import {
  createNoteClient,
  listNotesClient,
  listVersionsClient,
  readNoteClient,
  saveNoteClient,
  snapshotNoteClient,
} from '@/lib/notes-client'
import { EMPTY_TIPTAP_DOC, type NoteMeta, type NoteRecord, type TiptapDoc, type VersionMeta } from '@/lib/note-types'
import { type MuseNoteData } from '@/lib/types'

export default function Home() {
  const [tone, setTone] = useState<PaperTone>(DEFAULT_TONE)
  const [notes, setNotes] = useState<NoteMeta[]>([])
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [activeNote, setActiveNote] = useState<NoteRecord | null>(null)
  const [museNotes, setMuseNotes] = useState<MuseNoteData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [canImportDraft, setCanImportDraft] = useState(false)
  const marginRailRef = useRef<HTMLElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function refreshNotes() {
    const nextNotes = await listNotesClient()
    setNotes(nextNotes)
    return nextNotes
  }

  async function openNote(id: string) {
    const note = await readNoteClient(id)
    setActiveNote(note)
    setMuseNotes(note.museNotes)
    setVersions(await listVersionsClient(note.id))
  }

  useEffect(() => {
    async function boot() {
      try {
        const nextNotes = await refreshNotes()
        setCanImportDraft(Boolean(loadDocument()) && nextNotes.length === 0)
        if (nextNotes[0]) await openNote(nextNotes[0].id)
        if (!nextNotes[0]) {
          const created = await createNoteClient('Untitled')
          await refreshNotes()
          await openNote(created.id)
        }
      } catch {
        setSaving('error')
      }
    }
    boot()
  }, [])

  useEffect(() => {
    const tokens = PAPER_TONES[tone]
    const root = document.documentElement
    for (const [key, val] of Object.entries(tokens)) root.style.setProperty(key, val)
  }, [tone])

  useEffect(() => {
    saveNotes(museNotes)
  }, [museNotes])

  function queueSave(nextNote: NoteRecord) {
    setActiveNote(nextNote)
    setSaving('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const saved = await saveNoteClient(nextNote.id, {
          title: nextNote.title,
          content: nextNote.content,
          museNotes,
        })
        setActiveNote(saved)
        setSaving('saved')
        await refreshNotes()
      } catch {
        setSaving('error')
      }
    }, 700)
  }

  function handleTitleChange(title: string) {
    if (!activeNote) return
    queueSave({ ...activeNote, title })
  }

  function handleContentChange(content: TiptapDoc) {
    if (!activeNote) return
    queueSave({ ...activeNote, content })
  }

  async function handleCreateNote() {
    const note = await createNoteClient('Untitled')
    await refreshNotes()
    await openNote(note.id)
  }

  async function handleSnapshot() {
    if (!activeNote) return
    await snapshotNoteClient(activeNote.id)
    setVersions(await listVersionsClient(activeNote.id))
  }

  async function handleImportDraft() {
    const draft = loadDocument()
    if (!draft) return
    const note = await createNoteClient('Imported Draft')
    const imported: NoteRecord = {
      ...note,
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: draft.replace(/<[^>]+>/g, '') }] }],
      },
    }
    await saveNoteClient(imported.id, {
      title: imported.title,
      content: imported.content,
      museNotes: loadNotes(),
    })
    setCanImportDraft(false)
    await refreshNotes()
    await openNote(imported.id)
  }

  function handleSoundChange(v: boolean) {
    setSoundEnabled(v)
    if (v && !audioRef.current) audioRef.current = initAudio()
  }

  const handleMusePick = useCallback(
    async (persona: PersonaId, selectedText: string, contextText: string, anchorViewportTop: number) => {
      if (loading) return
      setLoading(true)
      const railTop = marginRailRef.current?.getBoundingClientRect().top ?? 0
      const anchorTop = Math.max(0, anchorViewportTop - railTop)
      try {
        const result = await callMuse({ text: selectedText, persona, context: contextText })
        if (result.question) {
          setMuseNotes((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              persona,
              question: result.question!,
              anchorTop,
              createdAt: Date.now(),
            },
          ])
          if (soundEnabled && audioRef.current) playMuseArrivalSound(audioRef.current)
        }
      } finally {
        setLoading(false)
      }
    },
    [loading, soundEnabled]
  )

  function dismissNote(id: string) {
    setMuseNotes((prev) => prev.filter((n) => n.id !== id))
  }

  function clearAllNotes() {
    setMuseNotes([])
  }

  const paper = (
    <>
      <div className="paper-header">
        <TitleField title={activeNote?.title ?? ''} onChange={handleTitleChange} />
        <div className="save-state" aria-live="polite">
          {saving === 'saving' ? 'saving...' : saving === 'error' ? 'not saved' : activeNote ? `saved ${new Date(activeNote.updated).toLocaleTimeString()}` : ''}
        </div>
      </div>
      <div className="paper-body">
        <Editor
          contentKey={activeNote?.id ?? null}
          content={activeNote?.content ?? EMPTY_TIPTAP_DOC}
          onContentChange={handleContentChange}
          onMusePick={handleMusePick}
          loading={loading}
          soundEnabled={soundEnabled}
          audioCtx={audioRef.current}
        />
        <MarginRail
          notes={museNotes}
          onDismiss={dismissNote}
          railRef={marginRailRef}
          onClearAll={museNotes.length > 1 ? clearAllNotes : undefined}
        />
      </div>
    </>
  )

  return (
    <WorkspaceShell
      notesPanel={
        <NotesPanel
          notes={notes}
          activeNoteId={activeNote?.id ?? null}
          onSelect={openNote}
          onCreate={handleCreateNote}
          onImportDraft={canImportDraft ? handleImportDraft : undefined}
        />
      }
      versionsPanel={
        <VersionsPanel versions={versions} onSnapshot={handleSnapshot} disabled={!activeNote} />
      }
      paper={paper}
      controls={
        <>
          <PaperToneSwitch tone={tone} onChange={setTone} />
          <SoundToggle enabled={soundEnabled} onChange={handleSoundChange} />
        </>
      }
    />
  )
}
