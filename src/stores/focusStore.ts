import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { FocusSession } from '../types'

interface FocusState {
  sessions: FocusSession[]
  active: boolean
  elapsed: number
  startedAt: Date | null
  selectedTaskId: string | null
  loading: boolean
  fetch: (userId: string) => Promise<void>
  start: (taskId?: string) => void
  stop: (userId: string, notes?: string) => Promise<void>
  reset: () => void
  tick: () => void
  setTask: (taskId: string | null) => void
  todayFocusSeconds: () => number
}

export const useFocusStore = create<FocusState>((set, get) => ({
  sessions: [],
  active: false,
  elapsed: 0,
  startedAt: null,
  selectedTaskId: null,
  loading: false,

  fetch: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(100)
    set({ sessions: data || [], loading: false })
  },

  start: (taskId) => {
    set({ active: true, startedAt: new Date(), elapsed: 0, selectedTaskId: taskId || null })
  },

  stop: async (userId, notes) => {
    const { startedAt, elapsed, selectedTaskId } = get()
    if (!startedAt || elapsed < 10) {
      set({ active: false, elapsed: 0, startedAt: null })
      return
    }
    const session = {
      user_id: userId,
      task_id: selectedTaskId || undefined,
      duration: elapsed,
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
      notes: notes || undefined,
    }
    const { data } = await supabase.from('focus_sessions').insert(session).select().single()
    if (data) set({ sessions: [data, ...get().sessions] })
    set({ active: false, elapsed: 0, startedAt: null })
  },

  reset: () => set({ active: false, elapsed: 0, startedAt: null }),

  tick: () => set((s) => ({ elapsed: s.elapsed + 1 })),

  setTask: (taskId) => set({ selectedTaskId: taskId }),

  todayFocusSeconds: () => {
    const today = new Date().toISOString().split('T')[0]
    return get().sessions
      .filter((s) => s.started_at.startsWith(today))
      .reduce((sum, s) => sum + s.duration, 0)
  },
}))
