import { useEffect, useRef, useState, useMemo } from 'react'
import { Search, CheckSquare, Repeat, Target, Plus, ArrowRight } from 'lucide-react'
import { useTasksStore } from '../stores/tasksStore'
import { useHabitsStore } from '../stores/habitsStore'
import { useGoalsStore } from '../stores/goalsStore'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { parseNaturalInput } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function CommandBar() {
  const { setCommandBar } = useUIStore()
  const { tasks, add: addTask } = useTasksStore()
  const { habits, add: addHabit } = useHabitsStore()
  const { goals } = useGoalsStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'search' | 'add-task' | 'add-habit'>('search')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [mode])

  type ResultType = 'task' | 'habit' | 'goal'
  interface Result { type: ResultType; id: string; label: string; sub: string; href: string }

  const results = useMemo((): Result[] => {
    if (!query.trim() || mode !== 'search') return []
    const q = query.toLowerCase()
    const taskResults: Result[] = tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 4)
      .map((t) => ({ type: 'task', id: t.id, label: t.title, sub: t.status, href: '/tasks' }))
    const habitResults: Result[] = habits
      .filter((h) => h.title.toLowerCase().includes(q))
      .slice(0, 3)
      .map((h) => ({ type: 'habit', id: h.id, label: h.title, sub: `${h.streak}d streak`, href: '/habits' }))
    const goalResults: Result[] = goals
      .filter((g) => g.title.toLowerCase().includes(q))
      .slice(0, 2)
      .map((g) => ({ type: 'goal', id: g.id, label: g.title, sub: `${g.progress}%`, href: '/goals' }))
    return [...taskResults, ...habitResults, ...goalResults]
  }, [query, tasks, habits, goals, mode])

  const handleAddTask = async () => {
    if (!query.trim() || !user) return
    setLoading(true)
    const { title, due_date } = parseNaturalInput(query.trim())
    const result = await addTask({
      user_id: user.id, title, status: 'todo', priority: 'medium',
      due_date, recurrence: 'none',
    })
    setLoading(false)
    if (result) { toast.success('Task created!'); setCommandBar(false) }
  }

  const handleAddHabit = async () => {
    if (!query.trim() || !user) return
    setLoading(true)
    await addHabit({
      user_id: user.id, title: query.trim(),
      frequency: 'daily', color: '#6366f1',
    })
    setLoading(false)
    toast.success('Habit created!')
    setCommandBar(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setCommandBar(false)
    if (e.key === 'Enter') {
      if (mode === 'add-task') handleAddTask()
      else if (mode === 'add-habit') handleAddHabit()
    }
  }

  const ICON = { task: CheckSquare, habit: Repeat, goal: Target }
  const COLOR = { task: '#6366f1', habit: '#f59e0b', goal: '#10b981' }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCommandBar(false)} />
      <div className="relative w-full max-w-xl card shadow-card animate-slide-up overflow-hidden">
        {/* Mode tabs */}
        <div className="flex border-b border-[var(--border-color)]">
          {(['search', 'add-task', 'add-habit'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setQuery('') }}
              className={`flex-1 py-2.5 text-xs font-medium transition-all ${
                mode === m
                  ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5'
                  : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)]'
              }`}
            >
              {m === 'search' ? '🔍 Search' : m === 'add-task' ? '✅ Add Task' : '🔁 Add Habit'}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-color)]">
          <Search size={16} className="text-[var(--text-subtle)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              mode === 'search' ? 'Search tasks, habits, goals…' :
              mode === 'add-task' ? 'Task title (e.g. "Study DSA tomorrow 5pm")' :
              'Habit name (e.g. "Morning run")'
            }
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-subtle)] text-sm outline-none"
          />
          {query && (
            <kbd className="text-xs text-[var(--text-subtle)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
              ↵
            </kbd>
          )}
        </div>

        {/* Results / Actions */}
        <div className="max-h-72 overflow-y-auto">
          {mode === 'search' && results.length === 0 && query && (
            <p className="text-center text-sm text-[var(--text-subtle)] py-8">No results for "{query}"</p>
          )}
          {mode === 'search' && results.length === 0 && !query && (
            <div className="px-4 py-4 space-y-1">
              {[
                { label: 'Go to Tasks', href: '/tasks', icon: CheckSquare },
                { label: 'Go to Habits', href: '/habits', icon: Repeat },
                { label: 'Go to Goals', href: '/goals', icon: Target },
              ].map(({ label, href, icon: Icon }) => (
                <button
                  key={href}
                  onClick={() => { navigate(href); setCommandBar(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <Icon size={15} className="text-[var(--text-subtle)]" />
                  {label}
                  <ArrowRight size={13} className="ml-auto text-[var(--text-subtle)]" />
                </button>
              ))}
            </div>
          )}
          {mode === 'search' && results.map((r) => {
            const Icon = ICON[r.type]
            return (
              <button
                key={r.id}
                onClick={() => { navigate(r.href); setCommandBar(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-all border-b border-[var(--border-color)] last:border-0"
              >
                <Icon size={15} style={{ color: COLOR[r.type] }} className="flex-shrink-0" />
                <span className="flex-1 text-left text-[var(--text-primary)] truncate">{r.label}</span>
                <span className="text-xs text-[var(--text-subtle)]">{r.sub}</span>
              </button>
            )
          })}

          {(mode === 'add-task' || mode === 'add-habit') && query && (
            <button
              onClick={mode === 'add-task' ? handleAddTask : handleAddHabit}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-4 text-sm text-indigo-400 hover:bg-indigo-500/5 transition-all"
            >
              <Plus size={16} />
              {loading ? 'Creating…' : `Create ${mode === 'add-task' ? 'task' : 'habit'}: "${query}"`}
            </button>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[var(--border-color)] flex items-center gap-4">
          <span className="text-xs text-[var(--text-subtle)]">
            <kbd className="bg-[var(--bg-elevated)] px-1 rounded border border-[var(--border-color)]">Esc</kbd> close
          </span>
          <span className="text-xs text-[var(--text-subtle)]">
            <kbd className="bg-[var(--bg-elevated)] px-1 rounded border border-[var(--border-color)]">↵</kbd> confirm
          </span>
          <span className="text-xs text-[var(--text-subtle)] ml-auto">⌘K to open</span>
        </div>
      </div>
    </div>
  )
}
