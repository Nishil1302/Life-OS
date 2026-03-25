import { create } from 'zustand'
import { todayISO } from '../lib/utils'

export interface AppNotification {
  id: string
  type: 'missed_habit' | 'pending_task' | 'streak_risk' | 'info'
  title: string
  body: string
  read: boolean
  createdAt: string
}

interface NotificationsState {
  notifications: AppNotification[]
  generate: (data: {
    tasks: { id: string; title: string; due_date?: string; status: string }[]
    habits: { id: string; title: string; streak: number }[]
    logs: { habit_id: string; date: string }[]
  }) => void
  markRead: (id: string) => void
  markAllRead: () => void
  unreadCount: () => number
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],

  generate: ({ tasks, habits, logs }) => {
    const today = todayISO()
    const now = new Date().toISOString()
    const existing = get().notifications
    const existingIds = new Set(existing.map((n) => n.id))
    const fresh: AppNotification[] = []

    // Missed habits (not completed today)
    habits.forEach((h) => {
      const done = logs.some((l) => l.habit_id === h.id && l.date === today)
      if (!done) {
        const id = `missed-habit-${h.id}-${today}`
        if (!existingIds.has(id)) {
          fresh.push({
            id,
            type: 'missed_habit',
            title: 'Habit not done yet',
            body: `"${h.title}" hasn't been checked in today.`,
            read: false,
            createdAt: now,
          })
        }
      }
    })

    // Streak at risk (habit has streak > 0 but not done today)
    habits.forEach((h) => {
      if (h.streak > 0) {
        const done = logs.some((l) => l.habit_id === h.id && l.date === today)
        if (!done) {
          const id = `streak-risk-${h.id}-${today}`
          if (!existingIds.has(id)) {
            fresh.push({
              id,
              type: 'streak_risk',
              title: `${h.streak}-day streak at risk!`,
              body: `Complete "${h.title}" today to keep your streak alive.`,
              read: false,
              createdAt: now,
            })
          }
        }
      }
    })

    // Overdue tasks
    tasks.forEach((t) => {
      if (t.due_date && t.status !== 'done') {
        const due = t.due_date.split('T')[0]
        if (due < today) {
          const id = `overdue-task-${t.id}`
          if (!existingIds.has(id)) {
            fresh.push({
              id,
              type: 'pending_task',
              title: 'Overdue task',
              body: `"${t.title}" was due on ${due}.`,
              read: false,
              createdAt: now,
            })
          }
        }
      }
    })

    if (fresh.length > 0) {
      set({ notifications: [...fresh, ...existing].slice(0, 30) })
    }
  },

  markRead: (id) =>
    set({ notifications: get().notifications.map((n) => n.id === id ? { ...n, read: true } : n) }),

  markAllRead: () =>
    set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) }),

  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}))
