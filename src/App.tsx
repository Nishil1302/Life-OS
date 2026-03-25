import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './stores/authStore'
import { useTasksStore } from './stores/tasksStore'
import { useGoalsStore } from './stores/goalsStore'
import { useHabitsStore } from './stores/habitsStore'
import { useFocusStore } from './stores/focusStore'
import { useNotesStore } from './stores/notesStore'
import { useWeeklyReportStore } from './stores/weeklyReportStore'
import { useCategoriesStore } from './stores/categoriesStore'
import { supabase } from './lib/supabase'
import Layout from './components/layout/Layout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import GoalsPage from './pages/GoalsPage'
import HabitsPage from './pages/HabitsPage'
import FocusPage from './pages/FocusPage'
import NotesPage from './pages/NotesPage'
import AICoachPage from './pages/AICoachPage'
import CalendarPage from './pages/CalendarPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'

// Handles the redirect back from Google OAuth
function OAuthCallback() {
  const navigate = useNavigate()
  const { init } = useAuthStore()

  useEffect(() => {
    // Supabase automatically exchanges the code in the URL hash/query for a session.
    // We just need to wait for the session to be established then redirect.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        init().then(() => navigate('/', { replace: true }))
      } else {
        // Exchange code for session (PKCE flow)
        supabase.auth.exchangeCodeForSession(window.location.href).then(() => {
          init().then(() => navigate('/', { replace: true }))
        })
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">L</span>
        </div>
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-subtle)]">Signing you in…</p>
      </div>
    </div>
  )
}

function ProtectedRoutes() {
  const { user } = useAuthStore()
  const { fetch: fetchTasks, subscribeRealtime: subscribeTasks } = useTasksStore()
  const { fetch: fetchGoals, subscribeRealtime: subscribeGoals } = useGoalsStore()
  const { fetch: fetchHabits } = useHabitsStore()
  const { fetch: fetchFocus } = useFocusStore()
  const { fetch: fetchNotes, subscribeRealtime } = useNotesStore()
  const { fetch: fetchReports } = useWeeklyReportStore()
  const { fetch: fetchCategories, subscribeRealtime: subscribeCategories } = useCategoriesStore()

  useEffect(() => {
    if (!user) return
    fetchTasks(user.id)
    fetchGoals(user.id)
    fetchHabits(user.id)
    fetchFocus(user.id)
    fetchNotes(user.id)
    fetchReports(user.id)
    fetchCategories(user.id)
    const unsubNotes = subscribeRealtime(user.id)
    const unsubGoals = subscribeGoals(user.id)
    const unsubTasks = subscribeTasks(user.id)
    const unsubCategories = subscribeCategories(user.id)
    return () => { unsubNotes(); unsubGoals(); unsubTasks(); unsubCategories() }
  }, [user?.id])

  if (!user) return <Navigate to="/auth" replace />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="habits" element={<HabitsPage />} />
        <Route path="focus" element={<FocusPage />} />
        <Route path="notes" element={<NotesPage />} />
        <Route path="ai-coach" element={<AICoachPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

function AuthRoute() {
  const { user } = useAuthStore()
  if (user) return <Navigate to="/" replace />
  return <AuthPage />
}

export default function App() {
  const { init, loading } = useAuthStore()

  useEffect(() => { init() }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/auth" element={<AuthRoute />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </BrowserRouter>
  )
}
