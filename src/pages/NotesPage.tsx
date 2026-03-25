import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Trash2, FileText, Search, Clock } from 'lucide-react'
import { useNotesStore } from '../stores/notesStore'
import { useAuthStore } from '../stores/authStore'
import { Empty, Spinner } from '../components/ui'
import { format } from 'date-fns'
import type { Note } from '../types'
import toast from 'react-hot-toast'

export default function NotesPage() {
  const { notes, loading, add, update, remove } = useNotesStore()
  const { user } = useAuthStore()
  const [selected, setSelected] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isNew = useRef(false)

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  )

  const autoSave = useCallback(async (noteId: string, t: string, c: string) => {
    setSaving(true)
    await update(noteId, { title: t || 'Untitled', content: c })
    setSaving(false)
  }, [update])

  useEffect(() => {
    if (!selected || isNew.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(selected.id, title, content), 800)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [title, content])

  const selectNote = (note: Note) => {
    isNew.current = false
    setSelected(note)
    setTitle(note.title)
    setContent(note.content)
  }

  const createNote = async () => {
    if (!user) return
    isNew.current = true
    const note = await add({ user_id: user.id, title: 'Untitled', content: '' })
    if (note) {
      setSelected(note)
      setTitle('')
      setContent('')
      isNew.current = false
      toast.success('Note created')
    }
  }

  const handleDelete = async (id: string) => {
    await remove(id)
    if (selected?.id === id) { setSelected(null); setTitle(''); setContent('') }
    toast.success('Note deleted')
  }

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (selected) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => autoSave(selected.id, val, content), 800)
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes..." className="input pl-8 text-sm py-2" />
            </div>
            <button onClick={createNote} className="btn-primary px-3 py-2 rounded-xl flex-shrink-0">
              <Plus size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <Empty icon={<FileText />} title="No notes" description={search ? 'No results' : 'Create your first note'} />
            ) : (
              filtered.map((note) => (
                <div key={note.id}
                  onClick={() => selectNote(note)}
                  className={`p-3 rounded-xl cursor-pointer transition-all group relative border ${
                    selected?.id === note.id
                      ? 'bg-indigo-500/10 border-indigo-500/20'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                  }`}>
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{note.title || 'Untitled'}</p>
                  <p className="text-xs text-[var(--text-subtle)] truncate mt-0.5">{note.content || 'No content'}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-[var(--text-subtle)] flex items-center gap-1">
                      <Clock size={10} /> {format(new Date(note.updated_at), 'MMM d')}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-red-500 transition-all p-0.5 rounded">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-color)]">
                <input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note title..."
                  className="text-lg font-semibold text-[var(--text-primary)] bg-transparent outline-none flex-1 placeholder-[var(--text-subtle)]"
                />
                <div className="flex items-center gap-3">
                  {saving && <span className="text-xs text-[var(--text-subtle)] animate-pulse">Saving...</span>}
                  {!saving && <span className="text-xs text-[var(--text-subtle)]">Auto-saved</span>}
                  <button onClick={() => handleDelete(selected.id)} className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-red-500 hover:bg-red-500/5 transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing..."
                className="flex-1 bg-transparent text-[var(--text-primary)] text-sm leading-relaxed p-6 outline-none resize-none placeholder-[var(--text-subtle)]"
              />
              <div className="px-6 py-2 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-subtle)]">{content.split(/\s+/).filter(Boolean).length} words · {content.length} chars</span>
                <span className="text-xs text-[var(--text-subtle)]">Updated {format(new Date(selected.updated_at), 'MMM d, h:mm a')}</span>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
              <FileText size={40} className="text-[var(--text-subtle)]" />
              <div>
                <p className="text-[var(--text-muted)] font-medium">Select a note or create one</p>
                <p className="text-[var(--text-subtle)] text-sm mt-1">Notes auto-save as you type</p>
              </div>
              <button onClick={createNote} className="btn-primary text-sm flex items-center gap-2 px-4 py-2 rounded-xl">
                <Plus size={15} /> New Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
