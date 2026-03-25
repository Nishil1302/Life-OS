import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Target, CheckSquare, Repeat, TrendingUp, Tag } from 'lucide-react'
import { useGoalsStore } from '../stores/goalsStore'
import { useTasksStore } from '../stores/tasksStore'
import { useHabitsStore } from '../stores/habitsStore'
import { useCategoriesStore } from '../stores/categoriesStore'
import { useAuthStore } from '../stores/authStore'
import { Button, Modal, Input, Textarea, Progress, Empty, Spinner } from '../components/ui'
import CategoryPicker, { CategoryBadge } from '../components/ui/CategoryPicker'
import { generateColor, formatDate } from '../lib/utils'
import type { Goal } from '../types'
import toast from 'react-hot-toast'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316']

interface GoalForm {
  title: string; description: string; target_date: string
  color: string; target_value: string; category_id: string
}
const EMPTY: GoalForm = { title: '', description: '', target_date: '', color: '#6366f1', target_value: '', category_id: '' }

export default function GoalsPage() {
  const { goals, loading, add, update, remove } = useGoalsStore()
  const { tasks } = useTasksStore()
  const { habits } = useHabitsStore()
  const { categories } = useCategoriesStore()
  const { user } = useAuthStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [form, setForm] = useState<GoalForm>(EMPTY)
  const [saving, setSaving] = useState(false)

  const stats = useMemo(() => {
    const avgProgress = goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
      : 0
    const completed = goals.filter((g) => g.progress >= 100).length
    const active = goals.filter((g) => g.progress < 100).length
    return { avgProgress, completed, active }
  }, [goals])

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, color: generateColor() }); setModalOpen(true) }
  const openEdit = (goal: Goal) => {
    setEditing(goal)
    setForm({
      title: goal.title,
      description: goal.description || '',
      target_date: goal.target_date?.slice(0, 10) || '',
      color: goal.color,
      target_value: goal.target_value > 0 ? String(goal.target_value) : '',
      category_id: goal.category_id || '',
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
      target_date: form.target_date || undefined,
      color: form.color,
      target_value: parseInt(form.target_value) || 0,
      current_value: editing?.current_value ?? 0,
      progress: editing?.progress ?? 0,
      category_id: form.category_id || undefined,
    }
    if (editing) {
      await update(editing.id, payload)
      toast.success('Goal updated')
    } else {
      const result = await add(payload)
      if (!result) { setSaving(false); toast.error('Failed to create goal — check console for details'); return }
      toast.success('Goal created')
    }
    setSaving(false)
    setModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    await remove(id)
    toast.success('Goal deleted')
  }

  return (
    <div className="flex gap-6 items-start">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Goals</h1>
            <p className="text-sm text-[var(--text-subtle)] mt-0.5">{goals.length} active goals</p>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> New Goal</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : goals.length === 0 ? (
          <Empty icon={<Target />} title="No goals yet" description="Set your first goal and start tracking progress" action={<Button onClick={openCreate} size="sm"><Plus size={14} /> Add Goal</Button>} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const goalTasks = tasks.filter((t) => t.goal_id === goal.id)
              const doneTasks = goalTasks.filter((t) => t.status === 'done')
              const goalHabits = habits.filter((h) => h.goal_id === goal.id)
              return (
                <div key={goal.id} className="card p-5 hover:border-indigo-500/20 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${goal.color}20` }}>
                        <Target size={20} style={{ color: goal.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{goal.title}</h3>
                        {goal.target_date && <p className="text-xs text-[var(--text-subtle)]">Due {formatDate(goal.target_date)}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(goal)} className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(goal.id)} className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-red-500 hover:bg-red-500/5 transition-all"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {goal.description && <p className="text-xs text-[var(--text-subtle)] mb-3">{goal.description}</p>}

                  {goal.category_id && (
                    <div className="mb-3"><CategoryBadge categoryId={goal.category_id} /></div>
                  )}

                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[var(--text-muted)]">Progress</span>
                      <span className="font-medium" style={{ color: goal.color }}>
                        {goal.current_value}/{goal.target_value > 0 ? goal.target_value : '?'} · {goal.progress}%
                      </span>
                    </div>
                    <Progress value={goal.progress} color={goal.color} />
                  </div>

                  {(goalTasks.length > 0 || goalHabits.length > 0) && (
                    <div className="flex items-center gap-4 text-xs text-[var(--text-subtle)] border-t border-[var(--border-color)] pt-3">
                      {goalTasks.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckSquare size={13} /> {doneTasks.length}/{goalTasks.length} tasks
                        </span>
                      )}
                      {goalHabits.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Repeat size={13} /> {goalHabits.length} habit{goalHabits.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="w-64 flex-shrink-0 space-y-4 sticky top-20">
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Summary</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">Avg progress</span>
              <span className="font-semibold text-indigo-400">{stats.avgProgress}%</span>
            </div>
            <div className="h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500" style={{ width: `${stats.avgProgress}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            {[
              { label: 'Active', value: stats.active, color: 'text-indigo-400' },
              { label: 'Done', value: stats.completed, color: 'text-green-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-2 rounded-xl bg-[var(--bg-elevated)]">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-[var(--text-subtle)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Top goals by progress */}
        {goals.length > 0 && (
          <div className="card p-4 space-y-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Progress</span>
            {[...goals].sort((a, b) => b.progress - a.progress).slice(0, 5).map((g) => (
              <div key={g.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)] truncate max-w-[140px]">{g.title}</span>
                  <span style={{ color: g.color }}>{g.progress}%</span>
                </div>
                <Progress value={g.progress} color={g.color} />
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
              const count = goals.filter((g) => g.category_id === cat.id).length
              if (count === 0) return null
              return (
                <div key={cat.id} className="flex items-center justify-between text-xs">
                  <span style={{ color: cat.color }}>{cat.name}</span>
                  <span className="text-[var(--text-subtle)]">{count} goal{count > 1 ? 's' : ''}</span>
                </div>
              )
            })}
          </div>
        )}

        <Button onClick={openCreate} className="w-full"><Plus size={14} /> New Goal</Button>
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Goal' : 'New Goal'}>
        <div className="space-y-4">
          <Input label="Goal Title" placeholder="e.g. Learn TypeScript" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description (optional)" placeholder="What does success look like?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <Input label="Target (tasks + habits to complete)" type="number" placeholder="e.g. 10" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />
          <Input label="Target Date" type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
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
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Save Changes' : 'Create Goal'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
