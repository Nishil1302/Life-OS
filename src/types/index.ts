export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'custom'

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  goal_id?: string
  category_id?: string
  recurrence: RecurrenceType
  recurrence_days?: number
  parent_task_id?: string
  completed_at?: string   // set when status → done, cleared when reset
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  progress: number
  target_value: number
  current_value: number
  target_date?: string
  color: string
  category_id?: string
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  user_id: string
  title: string
  description?: string
  frequency: 'daily' | 'weekly'
  streak: number
  best_streak: number
  color: string
  goal_id?: string
  category_id?: string
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  completed_at: string
  date: string
}

export interface FocusSession {
  id: string
  user_id: string
  task_id?: string
  duration: number
  started_at: string
  ended_at?: string
  notes?: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface LifeScore {
  total: number
  task_score: number
  habit_score: number
  focus_score: number
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  tasks_completed: number
  habits_consistency: number
  focus_minutes: number
  life_score: number
  created_at: string
}
