import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Task, TaskStatus, TaskPriority } from '../types'
import { addDays, addWeeks, startOfWeek, format } from 'date-fns'

interface TasksState {
  tasks: Task[]
  loading: boolean
  fetch: (userId: string) => Promise<void>
  add: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task | null>
  update: (id: string, updates: Partial<Task>) => Promise<void>
  remove: (id: string) => Promise<void>
  setStatus: (task: Task, status: TaskStatus) => Promise<void>
  toggleStatus: (task: Task) => Promise<void>
  subscribeRealtime: (userId: string) => () => void
}

/**
 * Given a task's stored status + completed_at + recurrence, return the
 * *effective* status the task should have right now.
 *
 * Rules:
 *  - recurrence === 'none'   → status is permanent, never auto-reset
 *  - recurrence === 'daily'  → done only if completed_at is today
 *  - recurrence === 'weekly' → done only if completed_at is in the current Mon–Sun week
 *  - recurrence === 'custom' → done only if completed_at + recurrence_days > now
 *
 * If the window has passed, effective status becomes 'todo' and we patch the DB.
 */
function resolveEffectiveStatus(task: Task): TaskStatus {
  if (task.status !== 'done' || task.recurrence === 'none' || !task.completed_at) {
    return task.status
  }

  const completedAt = new Date(task.completed_at)
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')
  const completedStr = format(completedAt, 'yyyy-MM-dd')

  if (task.recurrence === 'daily') {
    return completedStr === todayStr ? 'done' : 'todo'
  }

  if (task.recurrence === 'weekly') {
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const completedWeekStart = format(startOfWeek(completedAt, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    return completedWeekStart === weekStart ? 'done' : 'todo'
  }

  if (task.recurrence === 'custom') {
    const days = task.recurrence_days ?? 1
    const resetAt = addDays(completedAt, days)
    return now < resetAt ? 'done' : 'todo'
  }

  return task.status
}

/**
 * Apply resolveEffectiveStatus to a list of tasks.
 * For any task whose effective status differs from stored status,
 * patch the DB asynchronously (fire-and-forget) so it stays in sync.
 */
function applyRecurrenceReset(tasks: Task[]): Task[] {
  return tasks.map((task) => {
    const effective = resolveEffectiveStatus(task)
    if (effective !== task.status) {
      // Patch DB without blocking render
      supabase
        .from('tasks')
        .update({ status: effective, completed_at: null, updated_at: new Date().toISOString() })
        .eq('id', task.id)
        .then(() => {})
      return { ...task, status: effective, completed_at: undefined }
    }
    return task
  })
}

async function spawnNextRecurrence(task: Task) {
  if (task.recurrence === 'none' || !task.due_date) return
  const base = new Date(task.due_date)
  let next: Date
  if (task.recurrence === 'daily') next = addDays(base, 1)
  else if (task.recurrence === 'weekly') next = addWeeks(base, 1)
  else next = addDays(base, task.recurrence_days ?? 1)

  const nextDateStr = format(next, 'yyyy-MM-dd')
  const { data: existing } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', task.user_id)
    .eq('parent_task_id', task.id)
    .gte('due_date', nextDateStr)
    .limit(1)

  if (existing && existing.length > 0) return

  await supabase.from('tasks').insert({
    user_id: task.user_id,
    title: task.title,
    description: task.description,
    status: 'todo',
    priority: task.priority,
    due_date: next.toISOString(),
    goal_id: task.goal_id,
    category_id: task.category_id,
    recurrence: task.recurrence,
    recurrence_days: task.recurrence_days,
    parent_task_id: task.id,
  })
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    // Apply recurrence reset logic on fetch — no UI-side timers needed
    const resolved = applyRecurrenceReset(data || [])
    set({ tasks: resolved, loading: false })
  },

  add: async (task) => {
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    if (error || !data) return null
    set({ tasks: [data, ...get().tasks] })
    return data
  },

  update: async (id, updates) => {
    const { data } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) set({ tasks: get().tasks.map((t) => (t.id === id ? data : t)) })
  },

  remove: async (id) => {
    await supabase.from('tasks').delete().eq('id', id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },

  setStatus: async (task, status) => {
    if (task.status === status) return

    const now = new Date().toISOString()
    const dbUpdate: Partial<Task> & { updated_at: string } = {
      status,
      updated_at: now,
      // Set completed_at when marking done, clear it when un-doing
      completed_at: status === 'done' ? now : undefined,
    }

    // Optimistic update
    set({
      tasks: get().tasks.map((t) =>
        t.id === task.id ? { ...t, status, completed_at: dbUpdate.completed_at } : t
      ),
    })

    await supabase.from('tasks').update(dbUpdate).eq('id', task.id)

    // For recurring tasks marked done: spawn next instance
    if (status === 'done' && task.recurrence !== 'none') {
      await spawnNextRecurrence(task)
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', task.user_id)
        .order('created_at', { ascending: false })
      if (data) set({ tasks: applyRecurrenceReset(data) })
    }

    if (task.goal_id) {
      const { useGoalsStore } = await import('./goalsStore')
      await useGoalsStore.getState().recalcProgress(task.goal_id)
    }
  },

  toggleStatus: async (task) => {
    const next: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    await get().setStatus(task, next)
  },

  subscribeRealtime: (userId) => {
    const channel = supabase
      .channel(`tasks:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload
          if (eventType === 'INSERT') {
            const exists = get().tasks.find((t) => t.id === (newRow as Task).id)
            if (!exists) {
              const [resolved] = applyRecurrenceReset([newRow as Task])
              set({ tasks: [resolved, ...get().tasks] })
            }
          } else if (eventType === 'UPDATE') {
            const [resolved] = applyRecurrenceReset([newRow as Task])
            set({ tasks: get().tasks.map((t) => t.id === resolved.id ? resolved : t) })
          } else if (eventType === 'DELETE') {
            set({ tasks: get().tasks.filter((t) => t.id !== (oldRow as Task).id) })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}))

export type { TaskStatus, TaskPriority }
