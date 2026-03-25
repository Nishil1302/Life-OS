import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'auto' | 'light' | 'dark'

interface UIState {
  darkMode: boolean
  themeMode: ThemeMode
  sidebarOpen: boolean
  quickAddOpen: boolean
  commandBarOpen: boolean
  notifTaskReminders: boolean
  notifHabitReminders: boolean
  notifFocusAlerts: boolean
  focusDuration: number      // seconds, default 1500
  breakDuration: number      // seconds, default 300
  toggleDarkMode: () => void
  setThemeMode: (mode: ThemeMode) => void
  toggleSidebar: () => void
  setQuickAdd: (open: boolean) => void
  setCommandBar: (open: boolean) => void
  setNotifPref: (key: 'notifTaskReminders' | 'notifHabitReminders' | 'notifFocusAlerts', val: boolean) => void
  setFocusDuration: (s: number) => void
  setBreakDuration: (s: number) => void
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
}

function resolveTheme(mode: ThemeMode): boolean {
  if (mode === 'auto') return window.matchMedia('(prefers-color-scheme: dark)').matches
  return mode === 'dark'
}

const stored = localStorage.getItem('lifeos-ui')
const parsed = stored ? JSON.parse(stored)?.state : null
const initialMode: ThemeMode = parsed?.themeMode ?? 'dark'
const initialDark = resolveTheme(initialMode)
applyTheme(initialDark)

// Listen for system theme changes when in auto mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const state = useUIStore.getState()
  if (state.themeMode === 'auto') {
    applyTheme(e.matches)
    useUIStore.setState({ darkMode: e.matches })
  }
})

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      darkMode: initialDark,
      themeMode: initialMode,
      sidebarOpen: true,
      quickAddOpen: false,
      commandBarOpen: false,
      notifTaskReminders: true,
      notifHabitReminders: true,
      notifFocusAlerts: true,
      focusDuration: 1500,
      breakDuration: 300,

      toggleDarkMode: () => {
        const next = !get().darkMode
        const mode: ThemeMode = next ? 'dark' : 'light'
        set({ darkMode: next, themeMode: mode })
        applyTheme(next)
      },

      setThemeMode: (mode) => {
        const dark = resolveTheme(mode)
        set({ themeMode: mode, darkMode: dark })
        applyTheme(dark)
      },

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setQuickAdd: (open) => set({ quickAddOpen: open }),
      setCommandBar: (open) => set({ commandBarOpen: open }),
      setNotifPref: (key, val) => set({ [key]: val }),
      setFocusDuration: (s) => set({ focusDuration: s }),
      setBreakDuration: (s) => set({ breakDuration: s }),
    }),
    { name: 'lifeos-ui' }
  )
)
