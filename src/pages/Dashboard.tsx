import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Target, Flame, Timer, TrendingUp, ArrowRight, Circle, CheckCircle2 } from 'lucide-react'
import { useTasksStore } from '../stores/tasksStore'
import { useGoalsStore } from '../stores/goalsStore'
import { useHabitsStore } from '../stores/habitsStore'
import { useFocusStore } from '../stores/focusStore'
import { Progress, Badge } from '../components/ui'
import { formatDate, formatTime, todayISO } from '../lib/utils'
import { format, subDays } from 'date-fns'
import { Tooltip, ResponsiveContainer, AreaChart, Area, XAxis } from 'recharts'

function LifeScoreRing({ score }: { score: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border-color)" strokeWidth="8" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute text-center">
        <span className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{score}</span>
        <span className="block text-[11px] text-[var(--text-subtle)] font-medium mt-0.5">Life Score</span>
      </div>
    </div>
  )
}

const TOOLTIP_STYLE = {
  background: 'var(--bg-overlay)',
  border: '1px solid var(--border-color)',
  borderRadius: '12px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  backdropFilter: 'blur(20px)',
  boxShadow: 'var(--shadow-float)',
}

export default function Dashboard() {
  const { tasks } = useTasksStore()
  const { goals } = useGoalsStore()
  const { habits, isCompletedToday } = useHabitsStore()
  const { sessions, todayFocusSeconds } = useFocusStore()

  const today = todayISO()
  const todayTasks = tasks.filter((t) => t.due_date?.startsWith(today) || t.status !== 'done')
  const doneTodayTasks = todayTasks.filter((t) => t.status === 'done')
  const taskScore = todayTasks.length > 0 ? Math.round((doneTodayTasks.length / todayTasks.length) * 100) : 0

  const completedHabits = habits.filter((h) => isCompletedToday(h.id))
  const habitScore = habits.length > 0 ? Math.round((completedHabits.length / habits.length) * 100) : 0

  const focusSecs = todayFocusSeconds()
  const focusScore = Math.min(100, Math.round((focusSecs / 7200) * 100))
  const lifeScore = Math.round(taskScore * 0.4 + habitScore * 0.3 + focusScore * 0.3)

  const weekData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const secs = sessions.filter((s) => s.started_at.startsWith(date)).reduce((sum, s) => sum + s.duration, 0)
    return { day: format(subDays(new Date(), 6 - i), 'EEE'), minutes: Math.round(secs / 60) }
  }), [sessions])

  const upcomingTasks = tasks.filter((t) => t.status !== 'done').slice(0, 5)
  const topGoals = goals.slice(0, 3)

  const STATS = [
    { label: "Today's Tasks", value: `${doneTodayTasks.length}/${todayTasks.length}`, icon: CheckSquare, color: '#6366f1', sub: 'completed' },
    { label: 'Habits Done',   value: `${completedHabits.length}/${habits.length}`,    icon: Flame,        color: '#f59e0b', sub: 'today' },
    { label: 'Focus Time',    value: formatTime(focusSecs),                            icon: Timer,        color: '#06b6d4', sub: 'today' },
    { label: 'Active Goals',  value: goals.length,                                     icon: Target,       color: '#34d399', sub: 'in progress' },
  ]

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label}
            className="card p-4 hover:scale-[1.02] hover:shadow-[var(--shadow-float)] transition-all duration-300 cursor-default">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${color}18` }}>
              <Icon size={17} style={{ color }} />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
            <p className="text-xs text-[var(--text-subtle)] mt-0.5">{label} · {sub}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Life Score */}
        <div className="card p-6 flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Life Score</h2>
            <TrendingUp size={15} className="text-[var(--text-subtle)]" />
          </div>
          <LifeScoreRing score={lifeScore} />
          <div className="w-full space-y-2.5">
            {[
              { label: 'Tasks (40%)',  value: taskScore,  color: '#6366f1' },
              { label: 'Habits (30%)', value: habitScore, color: '#f59e0b' },
              { label: 'Focus (30%)',  value: focusScore, color: '#06b6d4' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[var(--text-subtle)]">{label}</span>
                  <span className="text-[var(--text-muted)] font-medium">{value}%</span>
                </div>
                <Progress value={value} color={color} />
              </div>
            ))}
          </div>
        </div>

        {/* Today's Habits */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Today's Habits</h2>
            <Link to="/habits" className="text-xs text-[var(--accent)] hover:opacity-70 flex items-center gap-1 transition-opacity">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {habits.length === 0 ? (
            <p className="text-[var(--text-subtle)] text-sm text-center py-6">
              No habits yet. <Link to="/habits" className="text-[var(--accent)]">Add one</Link>
            </p>
          ) : (
            <div className="space-y-1.5">
              {habits.slice(0, 6).map((habit) => {
                const done = isCompletedToday(habit.id)
                return (
                  <div key={habit.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-all duration-200">
                    {done
                      ? <CheckCircle2 size={17} style={{ color: habit.color }} />
                      : <Circle size={17} className="text-[var(--text-subtle)]" />}
                    <span className={`text-sm flex-1 ${done ? 'text-[var(--text-subtle)] line-through' : 'text-[var(--text-primary)]'}`}>
                      {habit.title}
                    </span>
                    {habit.streak > 0 && (
                      <span className="text-xs text-orange-400 flex items-center gap-0.5 font-medium">
                        <Flame size={11} /> {habit.streak}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Weekly Focus Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Weekly Focus</h2>
            <span className="text-xs text-[var(--text-subtle)]">{Math.round(focusSecs / 60)}m today</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={weekData}>
              <defs>
                <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="minutes" stroke="#6366f1" fill="url(#focusGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Upcoming Tasks</h2>
            <Link to="/tasks" className="text-xs text-[var(--accent)] hover:opacity-70 flex items-center gap-1 transition-opacity">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-[var(--text-subtle)] text-sm text-center py-6">
              All caught up! <Link to="/tasks" className="text-[var(--accent)]">Add tasks</Link>
            </p>
          ) : (
            <div className="space-y-1.5">
              {upcomingTasks.map((task) => (
                <div key={task.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-all duration-200">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{task.title}</span>
                  {task.due_date && (
                    <span className="text-xs text-[var(--text-subtle)]">{formatDate(task.due_date)}</span>
                  )}
                  <Badge className={`text-xs ${
                    task.status === 'in-progress' ? 'bg-blue-500/10 text-blue-400' : 'bg-[var(--bg-elevated)] text-[var(--text-subtle)]'
                  }`}>{task.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goal Progress */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Goal Progress</h2>
            <Link to="/goals" className="text-xs text-[var(--accent)] hover:opacity-70 flex items-center gap-1 transition-opacity">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {topGoals.length === 0 ? (
            <p className="text-[var(--text-subtle)] text-sm text-center py-6">
              No goals yet. <Link to="/goals" className="text-[var(--accent)]">Create one</Link>
            </p>
          ) : (
            <div className="space-y-4">
              {topGoals.map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: goal.color }} />
                      <span className="text-sm text-[var(--text-primary)]">{goal.title}</span>
                    </div>
                    <span className="text-xs text-[var(--text-subtle)] font-medium">{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} color={goal.color} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
