import { useState, useMemo } from 'react'
import { Brain, Sparkles, TrendingUp, AlertCircle, CheckCircle, RefreshCw, Lightbulb, Wand2, Plus, Loader2, Target, Flame, Timer } from 'lucide-react'
import { useTasksStore } from '../stores/tasksStore'
import { useHabitsStore } from '../stores/habitsStore'
import { useFocusStore } from '../stores/focusStore'
import { useNotesStore } from '../stores/notesStore'
import { useGoalsStore } from '../stores/goalsStore'
import { useAuthStore } from '../stores/authStore'
import { formatTime, todayISO } from '../lib/utils'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'

interface Insight { type: 'success' | 'warning' | 'tip' | 'info'; title: string; body: string }

function generateInsights(data: {
  tasks: ReturnType<typeof useTasksStore.getState>['tasks']
  habits: ReturnType<typeof useHabitsStore.getState>['habits']
  logs: ReturnType<typeof useHabitsStore.getState>['logs']
  sessions: ReturnType<typeof useFocusStore.getState>['sessions']
  notes: ReturnType<typeof useNotesStore.getState>['notes']
  userName?: string
}): { summary: string; insights: Insight[]; score: number } {
  const { tasks, habits, logs, sessions, notes, userName } = data
  const today = todayISO()
  const insights: Insight[] = []

  const totalTasks = tasks.length
  const doneTasks  = tasks.filter((t) => t.status === 'done').length
  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done')
  const taskRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  if (taskRate >= 70) insights.push({ type: 'success', title: 'Strong task completion', body: `You've completed ${taskRate}% of your tasks. Keep this momentum going!` })
  else if (taskRate < 30 && totalTasks > 0) insights.push({ type: 'warning', title: 'Task backlog building up', body: `Only ${taskRate}% of tasks are done. Consider breaking large tasks into smaller steps.` })

  if (overdueTasks.length > 0) insights.push({ type: 'warning', title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`, body: `"${overdueTasks[0].title}"${overdueTasks.length > 1 ? ` and ${overdueTasks.length - 1} more` : ''} passed their due date.` })

  const highPriority = tasks.filter((t) => t.priority === 'high' && t.status !== 'done')
  if (highPriority.length > 0) insights.push({ type: 'tip', title: 'High-priority tasks need attention', body: `You have ${highPriority.length} high-priority task${highPriority.length > 1 ? 's' : ''} pending. Focus on "${highPriority[0].title}" first.` })

  const todayLogs = logs.filter((l) => l.date === today)
  const habitRate = habits.length > 0 ? Math.round((todayLogs.length / habits.length) * 100) : 0
  const topStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0)

  if (habitRate === 100 && habits.length > 0) insights.push({ type: 'success', title: 'Perfect habit day!', body: `All ${habits.length} habits completed today.` })
  else if (habitRate < 50 && habits.length > 0) insights.push({ type: 'tip', title: 'Habit check-in needed', body: `Only ${habitRate}% of habits done today. Even one more improves your Life Score.` })

  if (topStreak >= 7) insights.push({ type: 'success', title: `${topStreak}-day streak!`, body: `Your longest habit streak is ${topStreak} days. Consistency is your superpower.` })

  const todaySecs = sessions.filter((s) => s.started_at.startsWith(today)).reduce((sum, s) => sum + s.duration, 0)
  const weekSecs  = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
    return sessions.filter((s) => s.started_at.startsWith(date)).reduce((sum, s) => sum + s.duration, 0)
  })
  const avgDailySecs = Math.round(weekSecs.reduce((a, b) => a + b, 0) / 7)

  if (todaySecs >= 7200) insights.push({ type: 'success', title: 'Deep work goal achieved!', body: `${formatTime(todaySecs)} of focus today — you've hit your 2-hour goal.` })
  else if (todaySecs === 0) insights.push({ type: 'tip', title: 'No focus sessions today', body: 'Start a 25-minute Pomodoro to build momentum.' })
  else insights.push({ type: 'info', title: `${formatTime(todaySecs)} focused today`, body: `${formatTime(7200 - todaySecs)} more to hit your daily goal.` })

  if (avgDailySecs > 3600) insights.push({ type: 'success', title: 'Consistent deep worker', body: `Your 7-day average is ${formatTime(avgDailySecs)}/day.` })
  if (notes.length > 0) insights.push({ type: 'info', title: 'Knowledge base growing', body: `You have ${notes.length} notes. Latest: "${notes[0].title}".` })

  const morningFocus   = sessions.filter((s) => new Date(s.started_at).getHours() < 12).length
  const afternoonFocus = sessions.filter((s) => { const h = new Date(s.started_at).getHours(); return h >= 12 && h < 17 }).length
  const eveningFocus   = sessions.filter((s) => new Date(s.started_at).getHours() >= 17).length
  const peakTime = morningFocus >= afternoonFocus && morningFocus >= eveningFocus ? 'morning' : afternoonFocus >= eveningFocus ? 'afternoon' : 'evening'
  if (sessions.length >= 5) insights.push({ type: 'tip', title: `You're a ${peakTime} person`, body: `Most focus sessions happen in the ${peakTime}. Schedule hard tasks then.` })

  const score = Math.round(taskRate * 0.4 + habitRate * 0.3 + Math.min(100, (todaySecs / 7200) * 100) * 0.3)
  const summary = totalTasks === 0 && habits.length === 0 && sessions.length === 0
    ? `Welcome${userName ? `, ${userName.split(' ')[0]}` : ''}! Start by adding tasks, habits, and focus sessions to get personalized insights.`
    : `${userName ? `${userName.split(' ')[0]}, you're` : "You're"} at ${score}/100 today. ${
        score >= 70 ? 'Excellent work — keep this energy!' :
        score >= 40 ? 'Good progress. A few more habits and focus sessions will push you higher.' :
        'Today is a fresh start. Complete one task and one habit to build momentum.'
      }`

  return { summary, insights: insights.slice(0, 6), score }
}

function breakdownGoalIntoTasks(goalTitle: string): string[] {
  const title = goalTitle.toLowerCase()
  if (title.includes('learn') || title.includes('study')) {
    const subject = goalTitle.replace(/learn|study/gi, '').trim() || 'the subject'
    return [`Research fundamentals of ${subject}`, `Find top 3 resources for ${subject}`, `Complete beginner exercises for ${subject}`, `Build a small project using ${subject}`, `Review and document key learnings`]
  }
  if (title.includes('fitness') || title.includes('workout') || title.includes('exercise')) {
    return ['Set up weekly workout schedule', 'Complete 3 cardio sessions this week', 'Complete 2 strength training sessions', 'Track nutrition for 7 days', 'Measure progress and adjust plan']
  }
  if (title.includes('read') || title.includes('book')) {
    return ['Choose and acquire the book', 'Read first 50 pages', 'Take notes on key concepts', 'Read remaining chapters', 'Write a summary of key takeaways']
  }
  if (title.includes('launch') || title.includes('build') || title.includes('create') || title.includes('develop')) {
    const thing = goalTitle.replace(/launch|build|create|develop/gi, '').trim() || 'the project'
    return [`Define requirements for ${thing}`, `Create wireframe or outline for ${thing}`, `Build MVP of ${thing}`, `Test and gather feedback on ${thing}`, `Launch and share ${thing}`]
  }
  return [`Research and plan: ${goalTitle}`, `Complete first milestone for: ${goalTitle}`, `Complete second milestone for: ${goalTitle}`, `Review progress on: ${goalTitle}`, `Finalize and complete: ${goalTitle}`]
}

const ICON_MAP  = { success: CheckCircle, warning: AlertCircle, tip: Lightbulb, info: TrendingUp }
const COLOR_MAP = {
  success: 'text-emerald-500 bg-emerald-500/8 border-emerald-500/15',
  warning: 'text-amber-500 bg-amber-500/8 border-amber-500/15',
  tip:     'text-[var(--accent)] bg-[var(--accent-soft)] border-[var(--accent)]/20',
  info:    'text-cyan-400 bg-cyan-500/8 border-cyan-500/15',
}

export default function AICoachPage() {
  const { tasks, add: addTask } = useTasksStore()
  const { habits, logs } = useHabitsStore()
  const { sessions } = useFocusStore()
  const { notes } = useNotesStore()
  const { goals } = useGoalsStore()
  const { user } = useAuthStore()
  const [refreshKey, setRefreshKey] = useState(0)
  const [breakdownGoalId, setBreakdownGoalId] = useState('')
  const [breakdownTasks, setBreakdownTasks] = useState<string[]>([])
  const [savingBreakdown, setSavingBreakdown] = useState(false)
  const [breakdownGenerated, setBreakdownGenerated] = useState(false)

  const { summary, insights, score } = useMemo(() => generateInsights({
    tasks, habits, logs, sessions, notes, userName: user?.full_name
  }), [tasks, habits, logs, sessions, notes, user, refreshKey])

  const today = todayISO()
  const todayTasks   = tasks.filter((t) => t.due_date?.startsWith(today))
  const doneTodayTasks = todayTasks.filter((t) => t.status === 'done')
  const todayHabits  = habits.filter((h) => logs.some((l) => l.habit_id === h.id && l.date === today))
  const todaySecs    = sessions.filter((s) => s.started_at.startsWith(today)).reduce((sum, s) => sum + s.duration, 0)

  const handleGenerateBreakdown = () => {
    const goal = goals.find((g) => g.id === breakdownGoalId)
    if (!goal) return
    setBreakdownTasks(breakdownGoalIntoTasks(goal.title))
    setBreakdownGenerated(true)
  }

  const handleSaveBreakdown = async () => {
    if (!user || breakdownTasks.length === 0) return
    setSavingBreakdown(true)
    await Promise.all(breakdownTasks.map((title) =>
      addTask({ user_id: user.id, title, status: 'todo', priority: 'medium', goal_id: breakdownGoalId || undefined, recurrence: 'none' })
    ))
    setSavingBreakdown(false)
    setBreakdownTasks([])
    setBreakdownGenerated(false)
    setBreakdownGoalId('')
    toast.success(`${breakdownTasks.length} tasks created!`)
  }

  // Weekly score data
  const weekScores = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const dayLabel = format(subDays(new Date(), 6 - i), 'EEE')
    const dayTasks  = tasks.filter((t) => t.due_date?.startsWith(date) && t.status === 'done').length
    const dayHabits = logs.filter((l) => l.date === date).length
    const daySecs   = sessions.filter((s) => s.started_at.startsWith(date)).reduce((sum, s) => sum + s.duration, 0)
    const dayScore  = Math.min(100, dayTasks * 10 + dayHabits * 10 + Math.round(daySecs / 72))
    return { label: dayLabel, score: dayScore, isToday: date === today }
  })

  return (
    <div className="flex flex-col xl:flex-row w-full gap-5">
      {/* Main */}
      <div className="flex-1 min-w-0 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">AI Coach</h1>
            <p className="text-sm text-[var(--text-subtle)] mt-0.5">Personalized insights from your data</p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl card text-sm text-[var(--text-subtle)]
                       hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all duration-200"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Summary card */}
        <div className="card p-5 bg-gradient-to-br from-indigo-500/8 to-purple-500/5 border-indigo-500/15">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center flex-shrink-0 shadow-glow">
              <Brain size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Daily Summary</h2>
                <span className="flex items-center gap-1 text-xs text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-full">
                  <Sparkles size={9} /> AI
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{summary}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{score}</p>
              <p className="text-xs text-[var(--text-subtle)]">/ 100</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Tasks Done',  value: `${doneTodayTasks.length}/${todayTasks.length}`, icon: Target, color: '#6366f1' },
            { label: 'Habits Done', value: `${todayHabits.length}/${habits.length}`,        icon: Flame,  color: '#f59e0b' },
            { label: 'Focus Time',  value: formatTime(todaySecs),                           icon: Timer,  color: '#06b6d4' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 text-center hover:scale-[1.02] transition-all duration-200">
              <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <p className="text-lg font-bold tracking-tight" style={{ color }}>{value}</p>
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* AI Task Breakdown */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wand2 size={15} className="text-purple-400" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Task Breakdown</h2>
            <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/15">Beta</span>
          </div>
          <p className="text-xs text-[var(--text-subtle)] mb-4">Select a goal and let AI break it down into actionable tasks.</p>
          <div className="flex gap-2 mb-4">
            <select
              value={breakdownGoalId}
              onChange={(e) => { setBreakdownGoalId(e.target.value); setBreakdownGenerated(false); setBreakdownTasks([]) }}
              className="input flex-1 text-sm"
            >
              <option value="" className="bg-white text-black dark:bg-[#1c1c1e] dark:text-white">Select a goal…</option>
              {goals.map((g) => <option key={g.id} value={g.id} className="bg-white text-black dark:bg-[#1c1c1e] dark:text-white">{g.title}</option>)}
            </select>
            <button
              onClick={handleGenerateBreakdown}
              disabled={!breakdownGoalId}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500/15 to-indigo-500/15
                         border border-purple-500/20 text-purple-400 text-sm font-medium
                         hover:from-purple-500/25 hover:to-indigo-500/25 transition-all duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Wand2 size={13} /> Generate
            </button>
          </div>
          {breakdownGenerated && breakdownTasks.length > 0 && (
            <div className="space-y-2">
              {breakdownTasks.map((task, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                  <input
                    value={task}
                    onChange={(e) => setBreakdownTasks((prev) => prev.map((t, j) => j === i ? e.target.value : t))}
                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none"
                  />
                </div>
              ))}
              <button
                onClick={handleSaveBreakdown}
                disabled={savingBreakdown}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl
                           bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium
                           hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-60"
              >
                {savingBreakdown ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                {savingBreakdown ? 'Creating tasks…' : `Save ${breakdownTasks.length} tasks`}
              </button>
            </div>
          )}
        </div>

        {/* Insights */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Insights & Recommendations</h2>
          {insights.length === 0 ? (
            <div className="card p-10 text-center">
              <Brain size={28} className="text-[var(--text-subtle)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--text-muted)] text-sm">Add tasks, habits, and focus sessions to get personalized insights.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {insights.map((insight, i) => {
                const Icon = ICON_MAP[insight.type]
                return (
                  <div key={i} className={`card p-4 border ${COLOR_MAP[insight.type]} hover:scale-[1.01] transition-all duration-200`}>
                    <div className="flex items-start gap-3">
                      <Icon size={16} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{insight.title}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">{insight.body}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden xl:flex flex-col w-64 flex-shrink-0 gap-4">
        {/* Productivity Score */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Today's Score</h3>
          <div className="flex items-center justify-center py-2">
            <div className="relative w-24 h-24">
              <svg width="96" height="96" className="-rotate-90">
                <circle cx="48" cy="48" r="38" fill="none" stroke="var(--border-color)" strokeWidth="6" />
                <circle cx="48" cy="48" r="38" fill="none"
                  stroke={score >= 70 ? '#34d399' : score >= 40 ? '#fbbf24' : '#f87171'}
                  strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - score / 100)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-[var(--text-primary)]">{score}</span>
                <span className="text-[10px] text-[var(--text-subtle)]">/ 100</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-subtle)] text-center leading-relaxed">
            {score >= 70 ? '🔥 Excellent day!' : score >= 40 ? '📈 Good progress' : '💪 Keep going!'}
          </p>
        </div>

        {/* Focus on */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">You Should Focus On</h3>
          <div className="space-y-2">
            {insights.filter((i) => i.type === 'tip' || i.type === 'warning').slice(0, 3).map((insight, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--bg-elevated)]">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${insight.type === 'warning' ? 'bg-amber-400' : 'bg-[var(--accent)]'}`} />
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{insight.title}</p>
              </div>
            ))}
            {insights.filter((i) => i.type === 'tip' || i.type === 'warning').length === 0 && (
              <p className="text-xs text-[var(--text-subtle)] text-center py-2">All good! No urgent items.</p>
            )}
          </div>
        </div>

        {/* Weekly glance */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">This Week</h3>
          <div className="flex items-end gap-1 h-16">
            {weekScores.map(({ label, score: s, isToday }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-md transition-all duration-500 ${isToday ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}`}
                  style={{ height: `${Math.max(4, s)}%`, minHeight: '4px' }}
                />
                <span className={`text-[9px] font-medium ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text-subtle)]'}`}>{label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-[var(--border-color)]">
            <span className="text-[var(--text-subtle)]">Avg score</span>
            <span className="text-[var(--text-primary)] font-medium">
              {Math.round(weekScores.reduce((s, d) => s + d.score, 0) / 7)}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="card p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Quick Stats</h3>
          {[
            { label: 'Total tasks',    value: tasks.length },
            { label: 'Done tasks',     value: tasks.filter((t) => t.status === 'done').length },
            { label: 'Active habits',  value: habits.length },
            { label: 'Focus sessions', value: sessions.length },
            { label: 'Notes',          value: notes.length },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-[var(--text-subtle)]">{label}</span>
              <span className="text-[var(--text-primary)] font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
