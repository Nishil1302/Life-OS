import { useMemo } from 'react'
import { useTasksStore } from '../stores/tasksStore'
import { useHabitsStore } from '../stores/habitsStore'
import { useFocusStore } from '../stores/focusStore'
import { format, subDays } from 'date-fns'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'

const TOOLTIP_STYLE = {
  background: 'var(--bg-overlay)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  backdropFilter: 'blur(20px)',
  boxShadow: 'var(--shadow-float)',
}
const TICK = { fill: 'var(--text-subtle)', fontSize: 11 }
const GRID = { strokeDasharray: '3 3', stroke: 'var(--border-color)' }

export default function AnalyticsPage() {
  const { tasks } = useTasksStore()
  const { habits, logs } = useHabitsStore()
  const { sessions } = useFocusStore()

  const focusTrend = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const secs = sessions.filter((s) => s.started_at.startsWith(date)).reduce((sum, s) => sum + s.duration, 0)
    return { day: format(subDays(new Date(), 13 - i), 'MMM d'), minutes: Math.round(secs / 60) }
  }), [sessions])

  const taskTrend = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const due  = tasks.filter((t) => t.due_date?.startsWith(date))
    const done = due.filter((t) => t.status === 'done')
    return { day: format(subDays(new Date(), 13 - i), 'MMM d'), rate: due.length > 0 ? Math.round((done.length / due.length) * 100) : 0 }
  }), [tasks])

  const habitTrend = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const date = format(subDays(new Date(), 13 - i), 'yyyy-MM-dd')
    const done = logs.filter((l) => l.date === date).length
    return { day: format(subDays(new Date(), 13 - i), 'MMM d'), rate: habits.length > 0 ? Math.round((done / habits.length) * 100) : 0 }
  }), [habits, logs])

  const taskStatus = useMemo(() => [
    { name: 'To Do',       value: tasks.filter((t) => t.status === 'todo').length,        color: '#6b7280' },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'in-progress').length, color: '#6366f1' },
    { name: 'Done',        value: tasks.filter((t) => t.status === 'done').length,        color: '#34d399' },
  ].filter((d) => d.value > 0), [tasks])

  const priorityData = useMemo(() => [
    { name: 'High',   value: tasks.filter((t) => t.priority === 'high').length,   color: '#f87171' },
    { name: 'Medium', value: tasks.filter((t) => t.priority === 'medium').length, color: '#fbbf24' },
    { name: 'Low',    value: tasks.filter((t) => t.priority === 'low').length,    color: '#34d399' },
  ].filter((d) => d.value > 0), [tasks])

  const totalFocusHours = +(sessions.reduce((sum, s) => sum + s.duration, 0) / 3600).toFixed(1)
  const avgDailyFocus   = Math.round(focusTrend.reduce((s, d) => s + d.minutes, 0) / 14)
  const overallTaskRate = tasks.length > 0 ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0
  const avgHabitRate    = Math.round(habitTrend.reduce((s, d) => s + d.rate, 0) / 14)

  const STATS = [
    { label: 'Total Focus Hours', value: `${totalFocusHours}h`, sub: 'all time',     color: '#06b6d4' },
    { label: 'Avg Daily Focus',   value: `${avgDailyFocus}m`,   sub: 'last 14 days', color: '#6366f1' },
    { label: 'Task Completion',   value: `${overallTaskRate}%`, sub: 'overall rate', color: '#34d399' },
    { label: 'Habit Consistency', value: `${avgHabitRate}%`,    sub: 'last 14 days', color: '#fbbf24' },
  ]

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Analytics</h1>
        <p className="text-sm text-[var(--text-subtle)] mt-0.5">Your productivity patterns over time</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(({ label, value, sub, color }) => (
          <div key={label} className="card p-4 hover:scale-[1.02] hover:shadow-[var(--shadow-float)] transition-all duration-300">
            <p className="text-2xl font-bold tracking-tight" style={{ color }}>{value}</p>
            <p className="text-sm text-[var(--text-primary)] mt-0.5 font-medium">{label}</p>
            <p className="text-xs text-[var(--text-subtle)]">{sub}</p>
          </div>
        ))}
      </div>

      {/* Focus trend */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Focus Time — Last 14 Days</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={focusTrend}>
            <defs>
              <linearGradient id="focusGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="day" tick={TICK} axisLine={false} tickLine={false} interval={1} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} unit="m" />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} min`, 'Focus']} />
            <Area type="monotone" dataKey="minutes" stroke="#06b6d4" fill="url(#focusGrad2)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Task Completion Rate</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={taskTrend}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" tick={TICK} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Completion']} />
              <Bar dataKey="rate" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Habit Success Rate</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={habitTrend}>
              <defs>
                <linearGradient id="habitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#fbbf24" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="day" tick={TICK} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={TICK} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Habits']} />
              <Area type="monotone" dataKey="rate" stroke="#fbbf24" fill="url(#habitGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Task Status Breakdown</h2>
          {taskStatus.length === 0 ? (
            <p className="text-[var(--text-subtle)] text-sm text-center py-8">No tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={taskStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                  {taskStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Task Priority Distribution</h2>
          {priorityData.length === 0 ? (
            <p className="text-[var(--text-subtle)] text-sm text-center py-8">No tasks yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {habits.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Habit Streaks</h2>
          <div className="space-y-3">
            {[...habits].sort((a, b) => b.streak - a.streak).map((habit) => (
              <div key={habit.id} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: habit.color }} />
                <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{habit.title}</span>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (habit.streak / Math.max(habit.best_streak, 1)) * 100)}%`, backgroundColor: habit.color }} />
                  </div>
                  <span className="text-xs text-[var(--text-subtle)] w-20 text-right">{habit.streak}d / {habit.best_streak}d best</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
