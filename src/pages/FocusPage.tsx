import { useEffect, useRef, useState } from 'react'
import { Play, Square, RotateCcw, Timer, Flame, ChevronDown, Coffee, TrendingUp, Zap } from 'lucide-react'
import { useFocusStore } from '../stores/focusStore'
import { useTasksStore } from '../stores/tasksStore'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { formatTime } from '../lib/utils'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'

export default function FocusPage() {
  const { active, elapsed, sessions, start, stop, reset, tick, setTask, selectedTaskId, todayFocusSeconds } = useFocusStore()
  const { tasks } = useTasksStore()
  const { user } = useAuthStore()
  const { focusDuration, breakDuration } = useUIStore()

  const [preset, setPreset] = useState(focusDuration)
  const [isBreak, setIsBreak] = useState(false)
  const [notes, setNotes] = useState('')
  const [taskDropdown, setTaskDropdown] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const PRESETS = [
    { label: `${Math.round(focusDuration / 60)}m`, seconds: focusDuration },
    { label: '45m', seconds: 2700 },
    { label: '1h',  seconds: 3600 },
    { label: 'Free', seconds: 0 },
  ]

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => tick(), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [active])

  useEffect(() => {
    if (!active) return
    if (!isBreak && preset > 0 && elapsed >= preset) {
      handleStop()
      toast.success('Focus session complete! Take a break 🎉')
      setIsBreak(true)
    } else if (isBreak && elapsed >= breakDuration) {
      reset()
      setIsBreak(false)
      toast('Break over! Ready to focus again?', { icon: '⚡' })
    }
  }, [elapsed, preset, active, isBreak, breakDuration])

  const handleStart = () => {
    start(selectedTaskId || undefined)
    toast.success(isBreak ? 'Break started' : 'Focus session started')
  }

  const handleStop = async () => {
    if (!user) return
    if (!isBreak) await stop(user.id, notes || undefined)
    else reset()
    setNotes('')
  }

  const handleReset = () => { reset(); setNotes(''); setIsBreak(false) }

  const todoTasks     = tasks.filter((t) => t.status !== 'done')
  const selectedTask  = tasks.find((t) => t.id === selectedTaskId)
  const todaySecs     = todayFocusSeconds()
  const today         = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter((s) => s.started_at.startsWith(today))

  const focusStreak = (() => {
    let streak = 0
    for (let i = 0; i < 30; i++) {
      const date = format(new Date(Date.now() - i * 86400000), 'yyyy-MM-dd')
      const has  = sessions.some((s) => s.started_at.startsWith(date))
      if (has) streak++
      else if (i > 0) break
    }
    return streak
  })()

  // 7-day bar data
  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const date  = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const label = format(subDays(new Date(), 6 - i), 'EEE')
    const secs  = sessions.filter((s) => s.started_at.startsWith(date)).reduce((sum, s) => sum + s.duration, 0)
    return { label, mins: Math.round(secs / 60), isToday: date === today }
  })
  const maxMins = Math.max(...weekBars.map((b) => b.mins), 1)

  const currentPreset = isBreak ? breakDuration : preset
  const progress = currentPreset > 0 ? Math.min(100, (elapsed / currentPreset) * 100) : 0
  const r = 110
  const circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ
  const ringColor = isBreak ? '#34d399' : active ? '#6366f1' : 'var(--border-color)'

  return (
    <div className="flex flex-col xl:flex-row w-full gap-5">
      {/* Main */}
      <div className="flex-1 min-w-0 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Focus Mode</h1>
          <p className="text-sm text-[var(--text-subtle)] mt-0.5">{Math.round(todaySecs / 60)} minutes focused today</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Today',    value: formatTime(todaySecs),    icon: Timer, color: '#06b6d4' },
            { label: 'Sessions', value: todaySessions.length,     icon: Play,  color: '#6366f1' },
            { label: 'Streak',   value: `${focusStreak}d`,        icon: Flame, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4 text-center hover:scale-[1.02] transition-all duration-200">
              <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon size={15} style={{ color }} />
              </div>
              <p className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
              <p className="text-xs text-[var(--text-subtle)]">{label}</p>
            </div>
          ))}
        </div>

        {/* Timer card */}
        <div className="card p-8 flex flex-col items-center gap-6">
          {isBreak && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/15">
              <Coffee size={13} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Break Time</span>
            </div>
          )}

          {!isBreak && (
            <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-elevated)]">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => { if (!active) setPreset(p.seconds) }}
                  disabled={active}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    preset === p.seconds
                      ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-sm border border-[var(--border-color)]'
                      : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)]'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Ring */}
          <div className="relative">
            <svg width="220" height="220" viewBox="0 0 260 260" className="-rotate-90 w-[180px] h-[180px] sm:w-[220px] sm:h-[220px]">
              <circle cx="130" cy="130" r={r} fill="none" stroke="var(--border-color)" strokeWidth="10" />
              <circle cx="130" cy="130" r={r} fill="none"
                stroke={ringColor} strokeWidth="10"
                strokeDasharray={circ} strokeDashoffset={currentPreset > 0 ? offset : 0}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-[var(--text-primary)] font-mono tracking-tight">
                {currentPreset > 0 && !active ? formatTime(currentPreset) : formatTime(elapsed)}
              </span>
              {active && currentPreset > 0 && (
                <span className="text-sm text-[var(--text-subtle)] mt-1">{formatTime(currentPreset - elapsed)} left</span>
              )}
              {active && (
                <span className={`text-xs mt-1 animate-pulse font-medium ${isBreak ? 'text-emerald-400' : 'text-[var(--accent)]'}`}>
                  ● {isBreak ? 'Break' : 'Focusing'}
                </span>
              )}
            </div>
          </div>

          {/* Task selector */}
          {!isBreak && (
            <div className="relative w-full max-w-xs">
              <button onClick={() => !active && setTaskDropdown(!taskDropdown)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl card text-sm
                           text-[var(--text-subtle)] hover:border-[var(--accent)] transition-all duration-200 disabled:opacity-40"
                disabled={active}>
                <span className="truncate">{selectedTask ? selectedTask.title : 'No task linked (optional)'}</span>
                <ChevronDown size={13} className="text-[var(--text-subtle)] flex-shrink-0 ml-2" />
              </button>
              {taskDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTaskDropdown(false)} />
                  <div className="absolute top-full mt-1 w-full card shadow-[var(--shadow-float)] z-20 max-h-48 overflow-y-auto animate-scale-in">
                    <button onClick={() => { setTask(null); setTaskDropdown(false) }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-subtle)] hover:bg-[var(--bg-elevated)] transition-all">
                      No task
                    </button>
                    {todoTasks.map((t) => (
                      <button key={t.id} onClick={() => { setTask(t.id); setTaskDropdown(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-[var(--bg-elevated)] ${selectedTaskId === t.id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
                        {t.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-5">
            <button onClick={handleReset} disabled={active && elapsed < 5}
              className="w-12 h-12 rounded-full card flex items-center justify-center text-[var(--text-subtle)]
                         hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all duration-200 disabled:opacity-30">
              <RotateCcw size={17} />
            </button>
            {!active ? (
              <button onClick={handleStart}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white
                            hover:scale-105 active:scale-95 transition-all duration-200 shadow-glow ${
                  isBreak
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600'
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                }`}>
                <Play size={26} fill="white" />
              </button>
            ) : (
              <button onClick={handleStop}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600
                           flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all duration-200">
                <Square size={26} fill="white" />
              </button>
            )}
            <div className="w-12 h-12" />
          </div>

          {active && !isBreak && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session notes (optional)..."
              className="input w-full max-w-xs resize-none text-sm"
              rows={2}
            />
          )}
        </div>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Recent Sessions</h2>
            <div className="space-y-1.5">
              {sessions.slice(0, 8).map((session) => {
                const linkedTask = tasks.find((t) => t.id === session.task_id)
                return (
                  <div key={session.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-all duration-200">
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center flex-shrink-0">
                      <Timer size={13} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-primary)] truncate">{linkedTask?.title || 'Free focus'}</p>
                      <p className="text-xs text-[var(--text-subtle)]">{format(new Date(session.started_at), 'MMM d, h:mm a')}</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--accent)]">{formatTime(session.duration)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="hidden xl:flex flex-col w-64 flex-shrink-0 gap-4">
        {/* Today's focus */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Timer size={13} className="text-cyan-400" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Today's Focus</h3>
          </div>
          <div className="text-center py-2">
            <p className="text-3xl font-bold text-cyan-400 tracking-tight">{formatTime(todaySecs)}</p>
            <p className="text-xs text-[var(--text-subtle)] mt-1">of 2h daily goal</p>
          </div>
          <div className="h-1.5 bg-[var(--border-color)] rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (todaySecs / 7200) * 100)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-[var(--bg-elevated)] rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-[var(--accent)]">{todaySessions.length}</p>
              <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">Sessions</p>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-xl p-2.5 text-center">
              <p className="text-base font-bold text-amber-400">{focusStreak}d</p>
              <p className="text-[10px] text-[var(--text-subtle)] mt-0.5">Streak</p>
            </div>
          </div>
        </div>

        {/* Weekly bars */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">This Week</h3>
          </div>
          <div className="flex items-end gap-1 h-20">
            {weekBars.map(({ label, mins, isToday }) => (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'}`}
                  style={{ height: `${Math.max(4, (mins / maxMins) * 100)}%`, minHeight: '4px' }}
                />
                <span className={`text-[9px] font-medium ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text-subtle)]'}`}>{label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-[var(--border-color)]">
            <span className="text-[var(--text-subtle)]">Total this week</span>
            <span className="text-[var(--text-primary)] font-semibold">
              {formatTime(weekBars.reduce((s, b) => s + b.mins * 60, 0))}
            </span>
          </div>
        </div>

        {/* Tips */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-amber-400" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Focus Tips</h3>
          </div>
          <div className="space-y-2">
            {[
              'Close all notifications before starting',
              'Use the 25-min Pomodoro for best results',
              'Link a task to stay on track',
              'Take a real break — step away from screen',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-[var(--text-subtle)] leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* All-time stats */}
        <div className="card p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">All Time</h3>
          {[
            { label: 'Total sessions', value: sessions.length },
            { label: 'Total focus',    value: formatTime(sessions.reduce((s, x) => s + x.duration, 0)) },
            { label: 'Avg session',    value: sessions.length > 0 ? formatTime(Math.round(sessions.reduce((s, x) => s + x.duration, 0) / sessions.length)) : '—' },
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
