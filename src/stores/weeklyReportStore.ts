import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { format, startOfWeek } from 'date-fns'
import type { WeeklyReport } from '../types'

interface WeeklyReportState {
  reports: WeeklyReport[]
  loading: boolean
  fetch: (userId: string) => Promise<void>
  generate: (userId: string, data: {
    tasks: { status: string; due_date?: string }[]
    habits: { id: string }[]
    logs: { habit_id: string; date: string }[]
    sessions: { duration: number; started_at: string }[]
  }) => Promise<WeeklyReport | null>
}

export const useWeeklyReportStore = create<WeeklyReportState>((set, get) => ({
  reports: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(12)
    set({ reports: data || [], loading: false })
  },

  generate: async (userId, { tasks, habits, logs, sessions }) => {
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    // Check if report for this week already exists
    const existing = get().reports.find((r) => r.week_start === weekStart)

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      return format(d, 'yyyy-MM-dd')
    })

    const tasksCompleted = tasks.filter(
      (t) => t.status === 'done' && t.due_date && weekDates.some((d) => t.due_date!.startsWith(d))
    ).length

    const habitDays = weekDates.filter((date) =>
      habits.length > 0 && logs.filter((l) => l.date === date).length > 0
    ).length
    const habitsConsistency = habits.length > 0
      ? Math.round((habitDays / 7) * 100)
      : 0

    const focusMinutes = Math.round(
      sessions
        .filter((s) => weekDates.some((d) => s.started_at.startsWith(d)))
        .reduce((sum, s) => sum + s.duration, 0) / 60
    )

    const lifeScore = Math.round(
      Math.min(100, tasksCompleted * 5) * 0.4 +
      habitsConsistency * 0.3 +
      Math.min(100, (focusMinutes / (7 * 120)) * 100) * 0.3
    )

    const payload = {
      user_id: userId,
      week_start: weekStart,
      tasks_completed: tasksCompleted,
      habits_consistency: habitsConsistency,
      focus_minutes: focusMinutes,
      life_score: lifeScore,
    }

    let result: WeeklyReport | null = null

    if (existing) {
      const { data } = await supabase
        .from('weekly_reports')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single()
      result = data
      if (data) set({ reports: get().reports.map((r) => r.id === existing.id ? data : r) })
    } else {
      const { data } = await supabase
        .from('weekly_reports')
        .insert(payload)
        .select()
        .single()
      result = data
      if (data) set({ reports: [data, ...get().reports] })
    }

    return result
  },
}))
