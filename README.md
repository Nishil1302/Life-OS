# LifeOS — FocusForge

A production-ready productivity SaaS built with React, TypeScript, Tailwind CSS, Supabase, and Zustand.

## Features

- **Dashboard** — Life Score, habits, tasks, goals, weekly focus chart
- **Tasks** — Create/edit/delete, priority, status, due date, goal linking
- **Goals** — Progress tracking, color coding, linked tasks
- **Habits** — Daily check-in, streaks, 30-day heatmap, Life Score impact
- **Focus Mode** — Pomodoro timer, SVG ring, session history, task linking
- **Notes** — Auto-save, realtime sync via Supabase
- **AI Coach** — Real insights from your data (tasks, habits, focus, notes)
- **Calendar** — Tasks and focus sessions by date
- **Analytics** — 14-day charts, pie charts, habit streaks
- **Quick Add** — Natural language: "Study DSA tomorrow 5pm"

## Setup

### 1. Clone and install

```bash
npm install --include=dev
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 3. Configure environment

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the database schema

In your Supabase project → SQL Editor, run the SQL from **Settings → Database Setup → Show SQL** inside the app, or paste this:

```sql
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  status text default 'todo' check (status in ('todo','in-progress','done')),
  priority text default 'medium' check (priority in ('low','medium','high')),
  due_date timestamptz,
  goal_id uuid,
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

alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table focus_sessions;
```

### 5. Run the app

```bash
npm run dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v3 (custom design system) |
| State | Zustand |
| Backend | Supabase (Auth + PostgreSQL + Realtime) |
| Routing | React Router DOM v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Dates | date-fns |

## Life Score Formula

```
Life Score = Tasks (40%) + Habits (30%) + Focus (30%)
```

- Tasks: % of today's tasks completed
- Habits: % of habits checked in today
- Focus: % of 2-hour daily goal reached
