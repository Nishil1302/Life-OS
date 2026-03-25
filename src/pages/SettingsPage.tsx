import { useState } from 'react'
import { User, Bell, Database, LogOut, Save, Eye, EyeOff, Timer, BarChart2, Monitor, Sun, Moon, Shield, Zap } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useUIStore } from '../stores/uiStore'
import { useTasksStore } from '../stores/tasksStore'
import { useHabitsStore } from '../stores/habitsStore'
import { useFocusStore } from '../stores/focusStore'
import { useWeeklyReportStore } from '../stores/weeklyReportStore'
import { supabase } from '../lib/supabase'
import { Button, Input } from '../components/ui'
import { formatTime } from '../lib/utils'
import toast from 'react-hot-toast'

const SQL_SCHEMA = `-- Run this in your Supabase SQL Editor

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo','in-progress','done')),
  priority text default 'medium' check (priority in ('low','medium','high')),
  due_date timestamptz,
  goal_id uuid,
  recurrence text default 'none' check (recurrence in ('none','daily','weekly','custom')),
  recurrence_days int,
  parent_task_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "Users own tasks" on tasks for all using (auth.uid() = user_id);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  progress int default 0,
  target_value int default 0,
  current_value int default 0,
  target_date date,
  color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table goals enable row level security;
create policy "Users own goals" on goals for all using (auth.uid() = user_id);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  frequency text default 'daily',
  streak int default 0,
  best_streak int default 0,
  color text default '#6366f1',
  goal_id uuid,
  created_at timestamptz default now()
);
alter table habits enable row level security;
create policy "Users own habits" on habits for all using (auth.uid() = user_id);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits on delete cascade not null,
  user_id uuid references auth.users not null,
  date date not null,
  completed_at timestamptz default now(),
  unique(habit_id, date)
);
alter table habit_logs enable row level security;
create policy "Users own habit_logs" on habit_logs for all using (auth.uid() = user_id);

create table if not exists focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  task_id uuid,
  duration int not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  notes text
);
alter table focus_sessions enable row level security;
create policy "Users own focus_sessions" on focus_sessions for all using (auth.uid() = user_id);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text default 'Untitled',
  content text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table notes enable row level security;
create policy "Users own notes" on notes for all using (auth.uid() = user_id);

create table if not exists weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  week_start date not null,
  tasks_completed int default 0,
  habits_consistency int default 0,
  focus_minutes int default 0,
  life_score int default 0,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);
alter table weekly_reports enable row level security;
create policy "Users own weekly_reports" on weekly_reports for all using (auth.uid() = user_id);

alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table focus_sessions;
alter publication supabase_realtime add table goals;`

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-9 h-5 bg-[var(--border-color)] rounded-full peer
                      peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5
                      after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all
                      peer-checked:bg-[var(--accent)] transition-colors duration-200" />
    </label>
  )
}

export default function SettingsPage() {
  const { user, signOut } = useAuthStore()
  const {
    themeMode, setThemeMode,
    notifTaskReminders, notifHabitReminders, notifFocusAlerts, setNotifPref,
    focusDuration, breakDuration, setFocusDuration, setBreakDuration,
  } = useUIStore()
  const { tasks } = useTasksStore()
  const { habits, logs } = useHabitsStore()
  const { sessions } = useFocusStore()
  const { generate: generateReport, reports } = useWeeklyReportStore()

  const [name, setName] = useState(user?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [showSchema, setShowSchema] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
    if (error) toast.error(error.message)
    else {
      useAuthStore.setState((s) => ({ user: s.user ? { ...s.user, full_name: name } : null }))
      toast.success('Profile updated')
    }
    setSaving(false)
  }

  const handleGenerateReport = async () => {
    if (!user) return
    setGeneratingReport(true)
    const report = await generateReport(user.id, { tasks, habits, logs, sessions })
    setGeneratingReport(false)
    if (report) toast.success('Weekly report generated!')
    else toast.error('Failed to generate report')
  }

  const copySchema = () => {
    navigator.clipboard.writeText(SQL_SCHEMA)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('SQL copied!')
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U'

  const latestReport = reports[0]

  return (
    <div className="flex w-full gap-5">
      {/* Main */}
      <div className="flex-1 min-w-0 max-w-2xl space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Settings</h1>
          <p className="text-sm text-[var(--text-subtle)] mt-0.5">Manage your account and preferences</p>
        </div>

        {/* Profile */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <User size={14} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Profile</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center text-white text-lg font-bold shadow-glow-sm">
              {initials}
            </div>
            <div>
              <p className="text-[var(--text-primary)] font-semibold">{user?.full_name || 'User'}</p>
              <p className="text-sm text-[var(--text-subtle)]">{user?.email}</p>
            </div>
          </div>
          <Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />
          <Button onClick={handleSaveProfile} loading={saving} size="sm">
            <Save size={13} /> Save Profile
          </Button>
        </div>

        {/* Appearance */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Monitor size={14} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Appearance</h2>
          </div>
          <div className="flex gap-2">
            {([
              { mode: 'auto',  icon: Monitor, label: 'Auto' },
              { mode: 'light', icon: Sun,     label: 'Light' },
              { mode: 'dark',  icon: Moon,    label: 'Dark' },
            ] as const).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setThemeMode(mode)}
                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border transition-all duration-200 ${
                  themeMode === mode
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--border-color)] text-[var(--text-subtle)] hover:border-[var(--accent)]/40'
                }`}
              >
                <Icon size={17} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
            Auto mode syncs with your system preference and updates automatically.
          </p>
        </div>

        {/* Notifications */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Notifications</h2>
          </div>
          {([
            { key: 'notifTaskReminders' as const,  label: 'Overdue task alerts',    desc: 'Get notified about overdue tasks',      value: notifTaskReminders },
            { key: 'notifHabitReminders' as const, label: 'Missed habit alerts',    desc: 'Daily reminder for unchecked habits',   value: notifHabitReminders },
            { key: 'notifFocusAlerts' as const,    label: 'Focus session alerts',   desc: 'Alert when focus session ends',         value: notifFocusAlerts },
          ]).map(({ key, label, desc, value }) => (
            <div key={key} className="flex items-center justify-between py-0.5">
              <div>
                <p className="text-sm text-[var(--text-primary)] font-medium">{label}</p>
                <p className="text-xs text-[var(--text-subtle)]">{desc}</p>
              </div>
              <Toggle checked={value} onChange={(v) => setNotifPref(key, v)} />
            </div>
          ))}
        </div>

        {/* Focus Settings */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Focus Mode</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-subtle)] block mb-2">
                Focus Duration: <span className="text-[var(--text-primary)]">{formatTime(focusDuration)}</span>
              </label>
              <input type="range" min={300} max={7200} step={300} value={focusDuration}
                onChange={(e) => setFocusDuration(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: 'var(--accent)' }} />
              <div className="flex justify-between text-xs text-[var(--text-subtle)] mt-1">
                <span>5m</span><span>2h</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-subtle)] block mb-2">
                Break Duration: <span className="text-[var(--text-primary)]">{formatTime(breakDuration)}</span>
              </label>
              <input type="range" min={60} max={1800} step={60} value={breakDuration}
                onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: '#34d399' }} />
              <div className="flex justify-between text-xs text-[var(--text-subtle)] mt-1">
                <span>1m</span><span>30m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Report */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Weekly Report</h2>
          </div>
          {latestReport && (
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Tasks Completed',   value: latestReport.tasks_completed },
                { label: 'Habit Consistency', value: `${latestReport.habits_consistency}%` },
                { label: 'Focus Time',        value: `${latestReport.focus_minutes}m` },
                { label: 'Life Score',        value: latestReport.life_score },
              ].map(({ label, value }) => (
                <div key={label} className="card-elevated p-3 rounded-xl">
                  <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{value}</p>
                  <p className="text-xs text-[var(--text-subtle)]">{label}</p>
                </div>
              ))}
            </div>
          )}
          <Button onClick={handleGenerateReport} loading={generatingReport} size="sm" variant="outline">
            <BarChart2 size={13} /> {latestReport ? 'Regenerate Report' : "Generate This Week's Report"}
          </Button>
        </div>

        {/* Database Setup */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Database Setup</h2>
            </div>
            <button
              onClick={() => setShowSchema(!showSchema)}
              className="flex items-center gap-1.5 text-xs text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showSchema ? <EyeOff size={12} /> : <Eye size={12} />}
              {showSchema ? 'Hide' : 'Show'} SQL
            </button>
          </div>
          {showSchema && (
            <div className="relative">
              <pre className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl p-4
                              text-xs text-[var(--text-muted)] overflow-x-auto max-h-56 overflow-y-auto leading-relaxed">
                {SQL_SCHEMA}
              </pre>
              <button
                onClick={copySchema}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-[var(--accent-soft)]
                           text-[var(--accent)] text-xs hover:opacity-80 transition-opacity"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-[var(--text-muted)]">Connected to Supabase</span>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card p-5 border-red-500/15">
          <h2 className="text-sm font-semibold text-red-500 mb-4">Danger Zone</h2>
          <Button variant="danger" onClick={signOut}>
            <LogOut size={14} /> Sign Out
          </Button>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden xl:flex flex-col w-64 flex-shrink-0 gap-4">
        {/* Account preview */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Account</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center text-white text-sm font-bold shadow-glow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-[var(--text-subtle)] truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
            <Shield size={12} className="text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Account secured</span>
          </div>
        </div>

        {/* Theme preview */}
        <div className="card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Current Theme</h3>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
            {themeMode === 'auto' ? <Monitor size={16} className="text-[var(--accent)]" /> :
             themeMode === 'light' ? <Sun size={16} className="text-amber-400" /> :
             <Moon size={16} className="text-indigo-400" />}
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)] capitalize">{themeMode} Mode</p>
              <p className="text-xs text-[var(--text-subtle)]">
                {themeMode === 'auto' ? 'Follows system' : themeMode === 'light' ? 'Always light' : 'Always dark'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick toggles */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-amber-400" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Quick Toggles</h3>
          </div>
          <div className="space-y-3">
            {([
              { key: 'notifTaskReminders' as const,  label: 'Task alerts',  value: notifTaskReminders },
              { key: 'notifHabitReminders' as const, label: 'Habit alerts', value: notifHabitReminders },
              { key: 'notifFocusAlerts' as const,    label: 'Focus alerts', value: notifFocusAlerts },
            ]).map(({ key, label, value }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
                <Toggle checked={value} onChange={(v) => setNotifPref(key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* Focus settings preview */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Timer size={13} className="text-[var(--accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Focus Config</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-subtle)]">Focus duration</span>
              <span className="text-[var(--accent)] font-semibold">{formatTime(focusDuration)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-subtle)]">Break duration</span>
              <span className="text-emerald-400 font-semibold">{formatTime(breakDuration)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-subtle)]">Sessions today</span>
              <span className="text-[var(--text-primary)] font-semibold">
                {sessions.filter((s) => s.started_at.startsWith(new Date().toISOString().split('T')[0])).length}
              </span>
            </div>
          </div>
        </div>

        {/* App stats */}
        <div className="card p-4 space-y-2.5">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Your Data</h3>
          {[
            { label: 'Total tasks',    value: tasks.length },
            { label: 'Active habits',  value: habits.length },
            { label: 'Focus sessions', value: sessions.length },
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
