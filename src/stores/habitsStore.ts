import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Habit, HabitLog } from '../types'
import { todayISO } from '../lib/utils'

interface HabitsState {
  habits: Habit[]
  logs: HabitLog[]
  loading: boolean
  fetch: (userId: string) => Promise<void>
  add: (habit: Omit<Habit, 'id' | 'created_at' | 'streak' | 'best_streak'>) => Promise<void>
  update: (id: string, updates: Partial<Habit>) => Promise<void>
  remove: (id: string) => Promise<void>
  toggleToday: (habitId: string, userId: string) => Promise<void>
  isCompletedToday: (habitId: string) => boolean
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  logs: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true })
    const [habitsRes, logsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).order('created_at'),
      supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]),
    ])
    set({ habits: habitsRes.data || [], logs: logsRes.data || [], loading: false })
  },

  add: async (habit) => {
    const { data } = await supabase
      .from('habits')
      .insert({ ...habit, streak: 0, best_streak: 0 })
      .select()
      .single()
    if (data) set({ habits: [...get().habits, data] })
  },

  update: async (id, updates) => {
    const { data } = await supabase.from('habits').update(updates).eq('id', id).select().single()
    if (data) set({ habits: get().habits.map((h) => (h.id === id ? data : h)) })
  },

  remove: async (id) => {
    await supabase.from('habits').delete().eq('id', id)
    set({ habits: get().habits.filter((h) => h.id !== id) })
  },

  toggleToday: async (habitId, userId) => {
    const today = todayISO()
    const existing = get().logs.find((l) => l.habit_id === habitId && l.date === today)
    const habit = get().habits.find((h) => h.id === habitId)

    if (existing) {
      // Optimistic remove
      set({ logs: get().logs.filter((l) => l.id !== existing.id) })
      await supabase.from('habit_logs').delete().eq('id', existing.id)

      if (habit) {
        const newStreak = Math.max(0, habit.streak - 1)
        await supabase.from('habits').update({ streak: newStreak }).eq('id', habitId)
        set({ habits: get().habits.map((h) => h.id === habitId ? { ...h, streak: newStreak } : h) })
      }
    } else {
      const { data } = await supabase
        .from('habit_logs')
        .insert({ habit_id: habitId, user_id: userId, date: today, completed_at: new Date().toISOString() })
        .select()
        .single()

      if (data) {
        // Optimistic add
        set({ logs: [...get().logs, data] })

        if (habit) {
          const newStreak = habit.streak + 1
          const newBest = Math.max(newStreak, habit.best_streak)
          await supabase.from('habits').update({ streak: newStreak, best_streak: newBest }).eq('id', habitId)
          set({ habits: get().habits.map((h) => h.id === habitId ? { ...h, streak: newStreak, best_streak: newBest } : h) })
        }
      }
    }

    // Sync goal progress if this habit is linked to a goal
    if (habit?.goal_id) {
      const { useGoalsStore } = await import('./goalsStore')
      await useGoalsStore.getState().recalcProgress(habit.goal_id)
    }
  },

  isCompletedToday: (habitId) => {
    const today = todayISO()
    return get().logs.some((l) => l.habit_id === habitId && l.date === today)
  },
}))
