import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, Clock, Flag, RefreshCw, Circle, Loader, CheckCircle2, AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import { useTasksStore } from '../stores/tasksStore'
import { useGoalsStore } from '../stores/goalsStore'
import { useCategoriesStore } from '../stores/categoriesStore'
import { useAuthStore } from '../stores/authStore'
import { Button, Modal, Input, Select, Textarea, Empty, Spinner } from '../components/ui'
import CategoryPicker, { CategoryBadge } from '../components/ui/CategoryPicker'
import { formatDate, todayISO } from '../lib/utils'
import type { Task, TaskStatus, TaskPriority, RecurrenceType } from '../types'
import toast from 'react-hot-toast'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'No recurrence' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom (every N days)' },
]
const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#10b981', medium: '#f59e0b', high: '#ef4444',
}

const STATUS_COLUMNS: { status: TaskStatus; label: string; icon: React.ReactNode; headerCls: string }[] = [
  {
    status: 'todo',
    label: 'To Do',
    icon: <Circle size={13} />,
    headerCls: 'text-[var(--text-subtle)] border-[var(--border-color)] bg-[var(--bg-elevated)]',
  },
  {
    status: 'in-progress',
    label: 'In Progress',
    icon: <Loader size={13} />,
    headerCls: 'text-blue-400 border-blue-500/30 bg-blue-500/5',
  },
  {
    status: 'done',
    label: 'Done',
    icon: <CheckCircle2 size={13} />,
    headerCls: 'text-green-500 border-green-500/30 bg-green-500/5',
  },
]

interface TaskForm {
  title: string; description: string; status: TaskStatus; priority: TaskPriority
  due_date: string; goal_id: string; category_id: string
  recurrence: RecurrenceType; recurrence_days: string
}
const EMPTY_FORM: TaskForm = {
  title: '', description: '', status: 'todo', priority: 'medium',
  due_date: '', goal_id: '', category_id: '', recurrence: 'none', recurrence_days: '2',
}

export default function TasksPage() {
  const { tasks, loading, add, update, remove, setStatus } = useTasksStore()
  const { goals } = useGoalsStore()
  const { categories } = useCategoriesStore()
  const { user } = useAuthStore()

  const [filterCategory, setFilterCategory] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const today = todayISO()

  const filtered = useMemo(() =>
    filterCategory ? tasks.filter((t) => t.category_id === filterCategory) : tasks,
    [tasks, filterCategory]
  )

  const grouped = useMemo(() => ({
    'todo':        filtered.filter((t) => t.status === 'todo'),
    'in-progress': filtered.filter((t) => t.status === 'in-progress'),
    'done':        filtered.filter((t) => t.status === 'done'),
  }), [filtered])

  // Right panel stats
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length
    const overdue = tasks.filter((t) => t.due_date && t.due_date.split('T')[0] < today && t.status !== 'done').length
    const high = tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, inProgress, overdue, high, completionRate }
  }, [tasks, today])

  const openCreate = (defaultStatus: TaskStatus = 'todo') => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, status: defaultStatus })
    setModalOpen(true)
  }
  const openEdit = (task: Task) => {
    setEditing(task)
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ? task.due_date.slice(0, 16) : '',
      goal_id: task.goal_id || '',
      category_id: task.category_id || '',
      recurrence: task.recurrence ?? 'none',
      recurrence_days: String(task.recurrence_days ?? 2),
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
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || undefined,
      goal_id: form.goal_id || undefined,
      category_id: form.category_id || undefined,
      recurrence: form.recurrence,
      recurrence_days: form.recurrence === 'custom' ? parseInt(form.recurrence_days) || 2 : undefined,
    }
    if (editing) {
      await update(editing.id, payload)
      const { recalcProgress } = (await import('../stores/goalsStore')).useGoalsStore.getState()
      if (editing.goal_id && editing.goal_id !== payload.goal_id) await recalcProgress(editing.goal_id)
      if (payload.goal_id) await recalcProgress(payload.goal_id)
      toast.success('Task updated')
    } else {
      const result = await add(payload)
      if (result?.goal_id) {
        const { recalcProgress } = (await import('../stores/goalsStore')).useGoalsStore.getState()
        await recalcProgress(result.goal_id)
      }
      toast.success('Task created')
    }
    setSaving(false)
    setModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    const task = tasks.find((t) => t.id === id)
    await remove(id)
    if (task?.goal_id) {
      const { recalcProgress } = (await import('../stores/goalsStore')).useGoalsStore.getState()
      await recalcProgress(task.goal_id)
    }
    toast.success('Task deleted')
  }

  const goalOptions = [
    { value: '', label: 'No Goal' },
    ...goals.map((g) => ({ value: g.id, label: g.title })),
  ]

  return (
    <div className="flex gap-6 items-start">
      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Tasks</h1>
            <p className="text-sm text-[var(--text-subtle)] mt-0.5">
              {stats.total - stats.done} remaining · {stats.done} done
            </p>
          </div>
          <Button onClick={() => openCreate()}><Plus size={16} /> New Task</Button>
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
                <span className="ml-1.5 text-xs opacity-60">
                  {tasks.filter((t) => t.category_id === cat.id).length}
                </span>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : tasks.length === 0 ? (
          <Empty
            icon={<CheckCircle2 />}
            title="No tasks yet"
            description="Create your first task to get started"
            action={<Button onClick={() => openCreate()} size="sm"><Plus size={14} /> Add Task</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {STATUS_COLUMNS.map(({ status, label, icon, headerCls }) => {
              const col = grouped[status]
              return (
                <div key={status} className="space-y-2">
                  {/* Column header */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${headerCls}`}>
                    <div className="flex items-center gap-2">
                      {icon}
                      <span className="text-sm font-semibold">{label}</span>
                      <span className="text-xs opacity-60 bg-[var(--bg-card)] px-1.5 py-0.5 rounded-full">{col.length}</span>
                    </div>
                    <button
                      onClick={() => openCreate(status)}
                      className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 min-h-[60px]">
                    {col.length === 0 && (
                      <div className="text-center py-6 text-xs text-[var(--text-subtle)] border border-dashed border-[var(--border-color)] rounded-xl">
                        No tasks
                      </div>
                    )}
                    {col.map((task) => {
                      const linkedGoal = goals.find((g) => g.id === task.goal_id)
                      const isOverdue = task.due_date && task.due_date.split('T')[0] < today && task.status !== 'done'
                      return (
                        <div
                          key={task.id}
                          className={`card p-3.5 transition-all group ${
                            task.status === 'done' ? 'opacity-55' : 'hover:border-indigo-500/20'
                          } ${isOverdue ? 'border-red-500/20' : ''}`}
                        >
                          <p className={`text-sm font-medium mb-1.5 ${
                            task.status === 'done' ? 'line-through text-[var(--text-subtle)]' : 'text-[var(--text-primary)]'
                          }`}>
                            {task.title}
                          </p>

                          {task.description && (
                            <p className="text-xs text-[var(--text-subtle)] mb-2 line-clamp-2">{task.description}</p>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                            {/* Priority */}
                            <span
                              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
                              style={{ backgroundColor: `${PRIORITY_COLORS[task.priority]}18`, color: PRIORITY_COLORS[task.priority] }}
                            >
                              <Flag size={9} /> {task.priority}
                            </span>

                            {/* Due date */}
                            {task.due_date && (
                              <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-[var(--text-subtle)]'}`}>
                                <Clock size={9} /> {formatDate(task.due_date)}
                                {isOverdue && <AlertTriangle size={9} />}
                              </span>
                            )}

                            {/* Recurrence */}
                            {task.recurrence && task.recurrence !== 'none' && (
                              <span className="flex items-center gap-1 text-xs text-cyan-400">
                                <RefreshCw size={9} />
                                {task.recurrence === 'custom' ? `${task.recurrence_days}d` : task.recurrence}
                              </span>
                            )}

                            {linkedGoal && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${linkedGoal.color}20`, color: linkedGoal.color }}>
                                {linkedGoal.title}
                              </span>
                            )}
                            <CategoryBadge categoryId={task.category_id} />
                          </div>

                          {/* Status buttons + actions */}
                          <div className="flex items-center gap-1 border-t border-[var(--border-color)] pt-2">
                            {STATUS_COLUMNS.map((c) => (
                              <button
                                key={c.status}
                                onClick={() => setStatus(task, c.status)}
                                className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                                  task.status === c.status
                                    ? c.status === 'todo'
                                      ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-color)]'
                                      : c.status === 'in-progress'
                                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                      : 'bg-green-500/15 text-green-500 border border-green-500/30'
                                    : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                              >
                                {c.label}
                              </button>
                            ))}
                            <div className="flex gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => openEdit(task)} className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => handleDelete(task.id)} className="p-1 rounded-lg text-[var(--text-subtle)] hover:text-red-500 hover:bg-red-500/5 transition-all">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div className="w-64 flex-shrink-0 space-y-4 sticky top-20">
        {/* Completion rate */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Overview</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">Completion</span>
              <span className="font-semibold text-indigo-400">{stats.completionRate}%</span>
            </div>
            <div className="h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: 'Todo', value: stats.total - stats.done - stats.inProgress, color: 'text-[var(--text-muted)]' },
              { label: 'Active', value: stats.inProgress, color: 'text-blue-400' },
              { label: 'Done', value: stats.done, color: 'text-green-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center p-2 rounded-xl bg-[var(--bg-elevated)]">
                <p className={`text-lg font-bold ${color}`}>{value}</p>
                <p className="text-xs text-[var(--text-subtle)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {(stats.overdue > 0 || stats.high > 0) && (
          <div className="card p-4 space-y-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">Alerts</span>
            {stats.overdue > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/8 border border-red-500/20">
                <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-400">{stats.overdue} overdue task{stats.overdue > 1 ? 's' : ''}</span>
              </div>
            )}
            {stats.high > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/8 border border-orange-500/20">
                <Flag size={13} className="text-orange-400 flex-shrink-0" />
                <span className="text-xs text-orange-400">{stats.high} high-priority pending</span>
              </div>
            )}
          </div>
        )}

        {/* Quick add */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Quick Add</span>
          </div>
          {STATUS_COLUMNS.map(({ status, label, headerCls }) => (
            <button
              key={status}
              onClick={() => openCreate(status)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all hover:opacity-80 ${headerCls}`}
            >
              <Plus size={12} /> Add to {label}
            </button>
          ))}
        </div>

        {/* Category breakdown */}
        {categories.length > 0 && (
          <div className="card p-4 space-y-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">By Category</span>
            {categories.map((cat) => {
              const count = tasks.filter((t) => t.category_id === cat.id).length
              const doneCount = tasks.filter((t) => t.category_id === cat.id && t.status === 'done').length
              if (count === 0) return null
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: cat.color }}>{cat.name}</span>
                    <span className="text-[var(--text-subtle)]">{doneCount}/{count}</span>
                  </div>
                  <div className="h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${count > 0 ? (doneCount / count) * 100 : 0}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Task' : 'New Task'}>
        <div className="space-y-4">
          <Input label="Title" placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Textarea label="Description (optional)" placeholder="Add details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Status" options={STATUS_OPTIONS} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })} />
            <Select label="Priority" options={PRIORITY_OPTIONS} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} />
          </div>
          <Input label="Due Date & Time" type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Select label="Recurrence" options={RECURRENCE_OPTIONS} value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as RecurrenceType })} />
          {form.recurrence === 'custom' && (
            <Input label="Repeat every N days" type="number" min="1" value={form.recurrence_days} onChange={(e) => setForm({ ...form, recurrence_days: e.target.value })} />
          )}
          <Select label="Link to Goal" options={goalOptions} value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })} />
          <CategoryPicker value={form.category_id} onChange={(id) => setForm({ ...form, category_id: id })} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editing ? 'Save Changes' : 'Create Task'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
