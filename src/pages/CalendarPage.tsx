import { useState } from 'react'
import { ChevronLeft, ChevronRight, Timer, Circle, CheckCircle2, Plus, CalendarDays, TrendingUp } from 'lucide-react'
import { useTasksStore } from '../stores/tasksStore'
import { useFocusStore } from '../stores/focusStore'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths, parseISO, isAfter, startOfDay } from 'date-fns'
import { formatTime } from '../lib/utils'
import { useUIStore } from '../stores/uiStore'

type FilterType = 'all' | 'tasks' | 'focus'

export default function CalendarPage() {
  const { tasks } = useTasksStore()
  const { sessions } = useFocusStore()
  const { setQuickAdd } = useUIStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filter, setFilter] = useState<FilterType>('all')

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad = monthStart.getDay()
  const paddedDays = [...Array(startPad).fill(null), ...days]

  const getTasksForDay = (date: Date) =>
    tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), date))

  const getSessionsForDay = (date: Date) =>
    sessions.filter((s) => isSameDay(parseISO(s.started_at), date))

  const selectedTasks = getTasksForDay(selectedDate)
  const selectedSessions = getSessionsForDay(selectedDate)
  const selectedFocusSecs = selectedSessions.reduce((sum, s) => sum + s.duration, 0)

  // Upcoming: next 5 tasks with due dates in the future
  const upcoming = tasks
    .filter((t) => t.due_date && isAfter(parseISO(t.due_date), startOfDay(new Date())) && t.status !== 'done')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5)

  const todayTasks = getTasksForDay(new Date())
  const todaySessions = getSessionsForDay(new Date())
  const todayFocusSecs = todaySessions.reduce((sum, s) => sum + s.duration, 0)
  const todayDone = todayTasks.filter((t) => t.status === 'done').length

  return (
    <div className="flex w-full gap-6">
      {/* Main */}
      <div className="flex-1 min-w-0 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Calendar</h1>
          <p className="text-sm text-[var(--text-subtle)] mt-0.5">Tasks and focus sessions by date</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{format(currentMonth, 'MMMM yyyy')}</h2>
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setCurrentMonth(new Date())}
                  className="px-3 h-8 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  Today
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs text-[var(--text-subtle)] font-medium py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {paddedDays.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />
                const dayTasks = getTasksForDay(day)
                const daySessions = getSessionsForDay(day)
                const isSelected = isSameDay(day, selectedDate)
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const today = isToday(day)

                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(day)}
                    className={`relative p-1.5 rounded-xl min-h-[52px] flex flex-col items-center transition-all border ${
                      isSelected ? 'bg-indigo-500/20 border-indigo-500/30' :
                      today ? 'bg-black/5 dark:bg-white/5 border-[var(--border-color)]' :
                      'hover:bg-black/5 dark:hover:bg-white/5 border-transparent'
                    } ${!isCurrentMonth ? 'opacity-30' : ''}`}>
                    <span className={`text-xs font-medium mb-1 ${today ? 'text-indigo-400' : 'text-[var(--text-muted)]'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${t.status === 'done' ? 'bg-green-500' : 'bg-indigo-400'}`} />
                      ))}
                      {daySessions.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border-color)]">
              {[
                { color: 'bg-indigo-400', label: 'Pending task' },
                { color: 'bg-green-500', label: 'Done task' },
                { color: 'bg-cyan-400', label: 'Focus session' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-[var(--text-subtle)]">
                  <div className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Day Detail */}
          <div className="card p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{format(selectedDate, 'EEEE')}</h2>
              <p className="text-xs text-[var(--text-subtle)]">{format(selectedDate, 'MMMM d, yyyy')}</p>
            </div>

            <div className="flex gap-1">
              {(['all', 'tasks', 'focus'] as FilterType[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all capitalize ${
                    filter === f ? 'bg-indigo-500/20 text-indigo-400' : 'text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}>
                  {f}
                </button>
              ))}
            </div>

            {(filter === 'all' || filter === 'focus') && selectedSessions.length > 0 && (
              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Timer size={14} className="text-cyan-400" />
                  <span className="text-xs font-medium text-cyan-400">Focus: {formatTime(selectedFocusSecs)}</span>
                </div>
                {selectedSessions.map((s) => (
                  <div key={s.id} className="text-xs text-[var(--text-muted)] flex justify-between py-0.5">
                    <span>{format(parseISO(s.started_at), 'h:mm a')}</span>
                    <span>{formatTime(s.duration)}</span>
                  </div>
                ))}
              </div>
            )}

            {(filter === 'all' || filter === 'tasks') && (
              <div className="flex-1 overflow-y-auto">
                {selectedTasks.length === 0 ? (
                  <p className="text-xs text-[var(--text-subtle)] text-center py-4">No tasks for this day</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--bg-elevated)]">
                        {task.status === 'done'
                          ? <CheckCircle2 size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                          : <Circle size={15} className="text-[var(--text-subtle)] flex-shrink-0 mt-0.5" />}
                        <div>
                          <p className={`text-xs font-medium ${task.status === 'done' ? 'line-through text-[var(--text-subtle)]' : 'text-[var(--text-primary)]'}`}>{task.title}</p>
                          {task.due_date && <p className="text-xs text-[var(--text-subtle)]">{format(parseISO(task.due_date), 'h:mm a')}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedTasks.length === 0 && selectedSessions.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-[var(--text-subtle)] text-center">Nothing scheduled for this day</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden xl:flex flex-col w-72 flex-shrink-0 gap-4">
        {/* Today Summary */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-indigo-400" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Today's Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-indigo-400">{todayDone}/{todayTasks.length}</p>
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">Tasks done</p>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-cyan-400">{formatTime(todayFocusSecs)}</p>
              <p className="text-xs text-[var(--text-subtle)] mt-0.5">Focus time</p>
            </div>
          </div>
          {todayTasks.length > 0 && (
            <div className="space-y-1.5">
              {todayTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  {t.status === 'done'
                    ? <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                    : <Circle size={12} className="text-[var(--text-subtle)] flex-shrink-0" />}
                  <span className={`text-xs truncate ${t.status === 'done' ? 'line-through text-[var(--text-subtle)]' : 'text-[var(--text-muted)]'}`}>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-purple-400" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Upcoming</h3>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-[var(--text-subtle)] text-center py-3">No upcoming tasks</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((t) => {
                const due = parseISO(t.due_date!)
                const isThisWeek = isAfter(due, new Date()) && due.getTime() - Date.now() < 7 * 86400000
                return (
                  <div key={t.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--bg-elevated)]">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      t.priority === 'high' ? 'bg-red-400' : t.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text-primary)] truncate">{t.title}</p>
                      <p className={`text-xs mt-0.5 ${isThisWeek ? 'text-yellow-400' : 'text-[var(--text-subtle)]'}`}>
                        {format(due, 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Add */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Quick Actions</h3>
          <button
            onClick={() => setQuickAdd(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/20 transition-all"
          >
            <Plus size={13} /> Add task with due date
          </button>
          <div className="pt-1 border-t border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
              Tip: Click any day on the calendar to see its tasks and focus sessions.
            </p>
          </div>
        </div>

        {/* Month Stats */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">This Month</h3>
          {(() => {
            const monthTasks = tasks.filter((t) => t.due_date && isSameMonth(parseISO(t.due_date), currentMonth))
            const monthDone = monthTasks.filter((t) => t.status === 'done').length
            const monthSessions = sessions.filter((s) => isSameMonth(parseISO(s.started_at), currentMonth))
            const monthFocusSecs = monthSessions.reduce((sum, s) => sum + s.duration, 0)
            const pct = monthTasks.length > 0 ? Math.round((monthDone / monthTasks.length) * 100) : 0
            return (
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-subtle)]">Task completion</span>
                  <span className="text-[var(--text-primary)] font-medium">{pct}%</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs pt-1">
                  <span className="text-[var(--text-subtle)]">Focus sessions</span>
                  <span className="text-cyan-400 font-medium">{monthSessions.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-subtle)]">Total focus time</span>
                  <span className="text-cyan-400 font-medium">{formatTime(monthFocusSecs)}</span>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
