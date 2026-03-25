import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Goal } from '../types'

interface GoalsState {
  goals: Goal[]
  loading: boolean
  fetch: (userId: string) => Promise<void>
  add: (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at'>) => Promise<Goal | null>
  update: (id: string, updates: Partial<Goal>) => Promise<void>
  remove: (id: string) => Promise<void>
  recalcProgress: (goalId: string) => Promise<void>
  subscribeRealtime: (userId: string) => () => void
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    set({ goals: data || [], loading: false })
  },

  add: async (goal) => {
    const { data, error } = await supabase.from('goals').insert(goal).select().single()
    if (error) { console.error('[goalsStore.add] INSERT error:', error.message, error.details, error.hint); return null }
    if (!data) { console.error('[goalsStore.add] INSERT returned no data'); return null }
    set({ goals: [data, ...get().goals] })
    return data
  },

  update: async (id, updates) => {
    const { data } = await supabase
      .from('goals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) set({ goals: get().goals.map((g) => (g.id === id ? data : g)) })
  },

  remove: async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    set({ goals: get().goals.filter((g) => g.id !== id) })
  },

  // Recomputes current_value and progress from tasks + habit_logs, then persists
  recalcProgress: async (goalId) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal) return

    const [tasksRes, habitsRes] = await Promise.all([
      supabase.from('tasks').select('id, status').eq('goal_id', goalId),
      supabase.from('habits').select('id').eq('goal_id', goalId),
    ])

    const doneTasks = (tasksRes.data || []).filter((t) => t.status === 'done').length
    const totalTasks = (tasksRes.data || []).length

    // Count habit completions today for habits linked to this goal
    const habitIds = (habitsRes.data || []).map((h) => h.id)
    let doneHabitsToday = 0
    if (habitIds.length > 0) {
      const today = new Date().toISOString().split('T')[0]
      const { data: logs } = await supabase
        .from('habit_logs')
        .select('id')
        .in('habit_id', habitIds)
        .eq('date', today)
      doneHabitsToday = (logs || []).length
    }

    const currentValue = doneTasks + doneHabitsToday
    const targetValue = goal.target_value > 0 ? goal.target_value : totalTasks + habitIds.length || 1
    const progress = Math.min(100, Math.round((currentValue / targetValue) * 100))

    await supabase
      .from('goals')
      .update({ current_value: currentValue, progress, updated_at: new Date().toISOString() })
      .eq('id', goalId)

    set({
      goals: get().goals.map((g) =>
        g.id === goalId ? { ...g, current_value: currentValue, progress } : g
      ),
    })
  },

  subscribeRealtime: (userId) => {
    const channel = supabase
      .channel(`goals:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload
          if (eventType === 'INSERT') {
            // Guard: add() already pushed the row optimistically — skip if already present
            const incoming = newRow as Goal
            if (get().goals.some((g) => g.id === incoming.id)) return
            set({ goals: [incoming, ...get().goals] })
          } else if (eventType === 'UPDATE') {
            set({ goals: get().goals.map((g) => (g.id === (newRow as Goal).id ? (newRow as Goal) : g)) })
          } else if (eventType === 'DELETE') {
            set({ goals: get().goals.filter((g) => g.id !== (oldRow as Goal).id) })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  },
}))
