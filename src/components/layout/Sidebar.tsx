import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Target, Repeat, Calendar,
  BarChart2, FileText, Brain, Timer, Settings, Moon, Sun, Plus, Zap, X
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks' },
  { to: '/goals',     icon: Target,          label: 'Goals' },
  { to: '/habits',    icon: Repeat,          label: 'Habits' },
  { to: '/calendar',  icon: Calendar,        label: 'Calendar' },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/notes',     icon: FileText,        label: 'Notes' },
  { to: '/ai-coach',  icon: Brain,           label: 'AI Coach' },
  { to: '/focus',     icon: Timer,           label: 'Focus Mode' },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const { darkMode, toggleDarkMode, setQuickAdd, sidebarOpen, toggleSidebar } = useUIStore()
  const navigate = useNavigate()

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={cn(
        'sidebar fixed left-0 top-0 h-screen w-60 flex flex-col z-40 transition-transform duration-300',
        'md:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow flex-shrink-0">
              <Zap size={17} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm leading-tight tracking-tight">LifeOS</p>
              <p className="text-[10px] text-[var(--accent)] font-medium tracking-widest uppercase">FocusForge</p>
            </div>
          </div>
        </div>

        {/* Quick Add */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => { setQuickAdd(true); if (sidebarOpen) toggleSidebar() }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                       bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium
                       hover:opacity-90 active:scale-95 transition-all duration-200 shadow-glow-sm"
          >
            <Plus size={15} />
            Quick Add
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => { if (sidebarOpen) toggleSidebar() }}
              className={({ isActive }) => cn('nav-item', isActive && 'active')}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-3 pb-4 pt-2 border-t border-[var(--border-color)] space-y-0.5">
          <NavLink
            to="/settings"
            onClick={() => { if (sidebarOpen) toggleSidebar() }}
            className={({ isActive }) => cn('nav-item', isActive && 'active')}
          >
            <Settings size={17} className="flex-shrink-0" />
            Settings
          </NavLink>

          <button onClick={toggleDarkMode} className="nav-item w-full text-left">
            {darkMode
              ? <Sun size={17} className="flex-shrink-0" />
              : <Moon size={17} className="flex-shrink-0" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* Mobile close */}
          <button onClick={toggleSidebar} className="nav-item w-full text-left md:hidden">
            <X size={17} className="flex-shrink-0" />
            Close Menu
          </button>

          {/* User */}
          <div
            onClick={() => { navigate('/settings'); if (sidebarOpen) toggleSidebar() }}
            className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl cursor-pointer
                       hover:bg-[var(--bg-elevated)] transition-all duration-200 group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-glow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate leading-tight">
                {user?.full_name || 'User'}
              </p>
              <p className="text-xs text-[var(--text-subtle)] truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
