import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Check, Tag } from 'lucide-react'
import { useCategoriesStore } from '../../stores/categoriesStore'
import { useAuthStore } from '../../stores/authStore'
import type { Category } from '../../types'

const SWATCH_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#f97316',
  '#84cc16', '#14b8a6',
]

interface Props {
  value: string
  onChange: (id: string) => void
}

export function CategoryBadge({ categoryId }: { categoryId?: string }) {
  const { categories } = useCategoriesStore()
  const cat = categories.find((c) => c.id === categoryId)
  if (!cat) return null
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}44` }}
    >
      <Tag size={9} />
      {cat.name}
    </span>
  )
}

export default function CategoryPicker({ value, onChange }: Props) {
  const { categories, add } = useCategoriesStore()
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(SWATCH_COLORS[0])
  const [saving, setSaving] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const triggerRef = useRef<HTMLButtonElement>(null)

  // Measure trigger position and set dropdown coords
  const measureAndOpen = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownMaxH = 280

    if (spaceBelow >= Math.min(dropdownMaxH, 160) || spaceBelow >= spaceAbove) {
      // Open below
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(dropdownMaxH, spaceBelow - 8),
        zIndex: 9999,
      })
    } else {
      // Open above
      setDropdownStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(dropdownMaxH, spaceAbove - 8),
        zIndex: 9999,
      })
    }
    setOpen(true)
  }, [])

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | Event) => {
      if (e instanceof MouseEvent && triggerRef.current?.contains(e.target as Node)) return
      setOpen(false)
      setCreating(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [open])

  const selected = categories.find((c) => c.id === value)

  const handleCreate = async () => {
    if (!newName.trim() || !user) return
    setSaving(true)
    const cat = await add(newName, newColor, user.id)
    setSaving(false)
    if (cat) {
      onChange(cat.id)
      setNewName('')
      setNewColor(SWATCH_COLORS[0])
      setCreating(false)
      setOpen(false)
    }
  }

  const dropdown = open ? (
    <div
      style={dropdownStyle}
      className="card shadow-card overflow-y-auto animate-fade-in"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* None */}
      <button
        onClick={() => { onChange(''); setOpen(false) }}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--text-subtle)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
      >
        <span className="w-3 h-3 rounded-full border border-[var(--border-color)] flex-shrink-0" />
        No category
        {!value && <Check size={13} className="ml-auto text-indigo-400" />}
      </button>

      {/* Existing */}
      {categories.map((cat: Category) => (
        <button
          key={cat.id}
          onClick={() => { onChange(cat.id); setOpen(false) }}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all"
        >
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
          <span style={{ color: cat.color }}>{cat.name}</span>
          {value === cat.id && <Check size={13} className="ml-auto text-indigo-400" />}
        </button>
      ))}

      {/* Create new */}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-indigo-400 hover:bg-indigo-500/5 transition-all border-t border-[var(--border-color)]"
        >
          <Plus size={13} /> New category
        </button>
      ) : (
        <div className="p-3 border-t border-[var(--border-color)] space-y-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="Category name"
            className="input text-sm py-1.5"
          />
          <div className="flex gap-1.5 flex-wrap">
            {SWATCH_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full transition-all hover:scale-110 flex-shrink-0"
                style={{
                  backgroundColor: c,
                  outline: newColor === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="flex-1 py-1.5 rounded-lg text-xs text-[var(--text-subtle)] hover:text-[var(--text-muted)] border border-[var(--border-color)] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || saving}
              className="flex-1 py-1.5 rounded-lg text-xs text-white bg-indigo-500 hover:bg-indigo-400 transition-all disabled:opacity-50"
            >
              {saving ? '…' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null

  return (
    <div className="relative">
      <label className="text-sm font-medium text-[var(--text-muted)] block mb-1.5">Category</label>
      <button
        ref={triggerRef}
        type="button"
        onClick={open ? () => { setOpen(false); setCreating(false) } : measureAndOpen}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-sm text-[var(--text-muted)] hover:border-indigo-500/40 transition-all text-left"
      >
        {selected ? (
          <>
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selected.color }} />
            <span style={{ color: selected.color }}>{selected.name}</span>
          </>
        ) : (
          <>
            <Tag size={13} className="text-[var(--text-subtle)]" />
            <span className="text-[var(--text-subtle)]">No category</span>
          </>
        )}
      </button>

      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  )
}
