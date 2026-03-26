import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Flame, CheckCircle2, Circle, Trophy, TrendingUp, Tag } from 'lucide-react'
import { useHabitsStore } from '../stores/habitsStore'
import { useGoalsStore } from '../stores/goalsStore'
import { useCategoriesStore } from '../stores/categoriesStore'
import { useAuthStore } from '../stores/authStore'
import { Button, Modal, Input, Textarea, Select, Empty, Spinner } from '../components/ui'
import CategoryPicker, { CategoryBadge } from '../components/ui/CategoryPicker'
import { generateColor } from '../lib/utils'
import { format, subDays } from 'date-fns'
import type { Habit } from '../types'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316']
const FREQ_OPTIONS = [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]

interface HabitForm {
  title: string; description: string; frequency: 'daily' | 'weekly'
  color: string; goal_id: string; category_id: string
}
const EMPTY: HabitForm = { title: '', description: '', frequency: 'daily', color: '#6366f1', goal_id: '', category_id: '' }

function HabitHeatmap({ habitId, logs, color }: { habitId: string; logs: { habit_id: string; date: string }[]; color: string }) {
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd')
    const done = logs.some((l) => l.habit_id === habitId && l.date === date)
    return { date, done }
  })
  return (
    <div className="flex gap-0.5 flex-wrap mt-2">
      {days.map(({ date, done }) => (
        <div key={date} title={date}
          className="w-3 h-3 rounded-sm transition-all"
          style={{ backgroundColor: done ? color : 'var(--border-color)', opacity: done ? 1 : 0.5 }} />
      ))}
    </div>
  )
}

export default function HabitsPage() {
  const { habits, logs, loading, add, update, remove, toggleToday, isCompletedToday } = useHabitsStore()
  const { goals } = useGoalsStore()
  const { categories } = useCategoriesStore()
  const { user } = useAuthStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [form, setForm] = useState<HabitForm>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('')

  const completedToday = habits.filter((h) => isCompletedToday(h.id)).length
  const completionPct = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0

  const filtered = useMemo(() =>
    filterCategory ? habits.filter((h) => h.category_id === filterCategory) : habits,
    [habits, filterCategory]
  )

  const topStreaks = useMemo(() =>
    [...habits].sort((a, b) => b.streak - a.streak).slice(0, 5),
    [habits]
  )

  const goalOptions = [
    { value: '', label: 'No Goal' },
    ...goals.map((g) => ({ value: g.id, label: g.title })),
  ]

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, color: generateColor() }); setModalOpen(true) }
  const openEdit = (habit: Habit) => {
    setEditing(habit)
    setForm({
      title: habit.title,
      description: habit.description || '',
      frequency: habit.frequency,
      color: habit.color,
      goal_id: habit.goal_id || '',
      category_id: habit.category_id || '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !user) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      title: form.title.trim(),
      description: form.description || undefined,
      frequency: form.frequency,
      color: form.color,
      goal_id: form.goal_id || undefined,
      category_id: form.category_id || undefined,
    }
    if (editing) {
      await update(editing.id, payload)
      toast.success('Habit updated')
    } else {
      const ok = await add(payload)
      if (!ok) { setSaving(false); toast.error('Failed to create habit — check console for details'); return }
      toast.success('Habit created')
    }
    setSaving(false)
    setModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    await remove(id)
    toast.success('Habit deleted')
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Habits</h1>
            <p className="text-sm text-[var(--text-subtle)] mt-0.5">{completedToday}/{habits.length} done today</p>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> New Habit</Button>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                !filterCategory
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(filterCategory === cat.id ? '' : cat.id)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
                style={
                  filterCategory === cat.id
                    ? { backgroundColor: `${cat.color}22`, color: cat.color, borderColor: `${cat.color}55` }
                    : { color: 'var(--text-subtle)', borderColor: 'transparent' }
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Today's progress bar */}
        {habits.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">Today's Progress</span>
              <span className="text-sm font-bold text-indigo-400">{completionPct}%</span>
            </div>
            <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : habits.length === 0 ? (
          <Empty icon={<Flame />} title="No habits yet" description="Build consistency with daily habits" action={<Button onClick={openCreate} size="sm"><Plus size={14} /> Add Habit</Button>} />
        ) : (
          <div className="space-y-3">
            {filtered.map((habit) => {
              const done = isCompletedToday(habit.id)
              const linkedGoal = goals.find((g) => g.id === habit.goal_id)
              return (
                <div key={habit.id} className={`card p-4 transition-all group hover:border-indigo-500/20 ${done ? 'opacity-80' : ''}`}>
                  <div className="flex items-start gap-4">
                    <button onClick={() => user && toggleToday(habit.id, user.id)} className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110">
                      {done
                        ? <CheckCircle2 size={24} style={{ color: habit.color }} />
                        : <Circle size={24} className="text-[var(--text-subtle)] hover:text-[var(--text-muted)]" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${done ? 'line-through text-[var(--text-subtle)]' : 'text-[var(--text-primary)]'}`}>{habit.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${habit.color}20`, color: habit.color }}>{habit.frequency}</span>
                        {linkedGoal && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${linkedGoal.color}20`, color: linkedGoal.color }}>
                            {linkedGoal.title}
                          </span>
                        )}
                        <CategoryBadge categoryId={habit.category_id} />
                      </div>
                      {habit.description && <p className="text-xs text-[var(--text-subtle)] mt-0.5">{habit.description}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-orange-400">
                          <Flame size={12} /> {habit.streak} day streak
                        </span>
                        <span className="flex items-center gap-1 text-xs text-yellow-500">
                          <Trophy size={12} /> Best: {habit.best_streak}
                        </span>
                      </div>
                      <HabitHeatmap habitId={habit.id} logs={logs} color={habit.color} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(habit)} className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(habit.id)} className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-red-500 hover:bg-red-500/5 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="hidden lg:block w-64 flex-shrink-0 space-y-4 lg:sticky top-20">
        {/* Today summary */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Today</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">Completion</span>
              <span className="font-semibold text-indigo-400">{completionPct}%</span>
            </div>
            <div className="h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-xl bg-[var(--bg-elevated)]">
              <p className="text-xl font-bold text-green-500">{completedToday}</p>
              <p className="text-xs text-[var(--text-subtle)]">Done</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-[var(--bg-elevated)]">
              <p className="text-xl font-bold text-[var(--text-muted)]">{habits.length - completedToday}</p>
              <p className="text-xs text-[var(--text-subtle)]">Remaining</p>
            </div>
          </div>
        </div>

        {/* Streak leaderboard */}
        {topStreaks.length > 0 && (
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-orange-400" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">Top Streaks</span>
            </div>
            {topStreaks.map((h, i) => (
              <div key={h.id} className="flex items-center gap-2">
                <span className={`text-xs font-bold w-4 ${i === 0 ? 'text-yellow-400' : 'text-[var(--text-subtle)]'}`}>
                  {i + 1}
                </span>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} />
                <span className="text-xs text-[var(--text-muted)] flex-1 truncate">{h.title}</span>
                <span className="text-xs font-semibold text-orange-400 flex items-center gap-0.5">
                  <Flame size={10} /> {h.streak}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Category breakdown */}
        {categories.length > 0 && (
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Tag size={13} className="text-[var(--text-subtle)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">By Category</span>
            </div>
            {categories.map((cat) => {
              const count = habits.filter((h) => h.category_id === cat.id).length
              if (count === 0) return null
              const doneCount = habits.filter((h) => h.category_id === cat.id && isCompletedToday(h.id)).length
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: cat.color }}>{cat.name}</span>
                    <span className="text-[var(--text-subtle)]">{doneCount}/{count}</span>
                  </div>
                  <div className="h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${count > 0 ? (doneCount / count) * 100 : 0}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Button onClick={openCreate} className="w-full"><Plus size={14} /> New Habit</Button>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Habit' : 'New Habit'}>
        <div className="space-y-4">
          <Input label="Habit Name" placeholder="e.g. Morning meditation" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description (optional)" placeholder="Why is this habit important?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <Select label="Frequency" options={FREQ_OPTIONS} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as 'daily' | 'weekly' })} />
          <Select label="Assign to Goal" options={goalOptions} value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })} />
          <CategoryPicker value={form.category_id} onChange={(id) => setForm({ ...form, category_id: id })} />
          <div>
            <label className="text-sm font-medium text-[var(--text-muted)] block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-card)] scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Save Changes' : 'Create Habit'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
