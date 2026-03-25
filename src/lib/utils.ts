import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns'

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function getGreeting(name?: string): string {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${greeting}, ${name.split(' ')[0]}` : greeting
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function generateColor(): string {
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  return colors[Math.floor(Math.random() * colors.length)]
}

export function parseNaturalInput(input: string): { title: string; due_date?: string } {
  const tomorrow = /\btomorrow\b/i
  const today = /\btoday\b/i
  const timeMatch = input.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i)

  let due_date: string | undefined
  let title = input

  if (tomorrow.test(input)) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const mins = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const period = timeMatch[3]?.toLowerCase()
      if (period === 'pm' && hours < 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      d.setHours(hours, mins, 0, 0)
    }
    due_date = d.toISOString()
    title = input.replace(tomorrow, '').replace(timeMatch?.[0] || '', '').trim()
  } else if (today.test(input)) {
    const d = new Date()
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const mins = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const period = timeMatch[3]?.toLowerCase()
      if (period === 'pm' && hours < 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      d.setHours(hours, mins, 0, 0)
    }
    due_date = d.toISOString()
    title = input.replace(today, '').replace(timeMatch?.[0] || '', '').trim()
  }

  return { title: title || input, due_date }
}
