import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Settings, User, Command } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useNotificationsStore } from '../../stores/notificationsStore'
import { useUIStore } from '../../stores/uiStore'
import { getGreeting } from '../../lib/utils'
import { useNavigate } from 'react-router-dom'

const TYPE_COLOR: Record<string, string> = {
  missed_habit: 'bg-amber-400',
  streak_risk:  'bg-orange-400',
  pending_task: 'bg-red-400',
  info:         'bg-indigo-400',
}

export default function Navbar() {
  const { user, signOut } = useAuthStore()
  const { notifications, markRead, markAllRead, unreadCount } = useNotificationsStore()
  const { setCommandBar } = useUIStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen]       = useState(false)
  const navigate   = useNavigate()
  const notifRef   = useRef<HTMLDivElement>(null)
  const dropRef    = useRef<HTMLDivElement>(null)
  const count      = unreadCount()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (dropRef.current  && !dropRef.current.contains(e.target as Node))  setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <header className="navbar fixed top-0 left-60 right-0 h-14 flex items-center justify-between px-6 z-30 transition-all duration-300">
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{getGreeting(user?.full_name)}</p>
        <p className="text-xs text-[var(--text-subtle)]">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Command bar */}
        <button
          onClick={() => setCommandBar(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl card text-xs
                     text-[var(--text-subtle)] hover:text-[var(--text-muted)]
                     hover:border-[var(--accent)] transition-all duration-200"
        >
          <Command size={12} />
          <span>Search</span>
          <kbd className="bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded-lg text-[10px] font-medium">⌘K</kbd>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative w-9 h-9 rounded-xl card flex items-center justify-center
                       text-[var(--text-subtle)] hover:text-[var(--text-primary)]
                       hover:border-[var(--accent)] transition-all duration-200"
          >
            <Bell size={15} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full
                               text-white text-[9px] font-bold flex items-center justify-center shadow-glow-sm">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 card shadow-[var(--shadow-float)] z-50 animate-scale-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Notifications {count > 0 && <span className="text-[var(--accent)]">({count})</span>}
                </span>
                {count > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[var(--accent)] hover:opacity-70 transition-opacity">
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--text-subtle)]">You're all caught up 🎉</div>
              ) : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-[var(--border-color)]">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`px-4 py-3 flex gap-3 items-start cursor-pointer
                                  hover:bg-[var(--bg-elevated)] transition-all duration-150
                                  ${n.read ? 'opacity-40' : ''}`}
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${TYPE_COLOR[n.type] ?? 'bg-indigo-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{n.title}</p>
                        <p className="text-xs text-[var(--text-subtle)] mt-0.5 leading-relaxed">{n.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl card
                       hover:border-[var(--accent)] transition-all duration-200"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center text-white text-xs font-bold shadow-glow-sm">
              {initials}
            </div>
            <span className="text-sm text-[var(--text-muted)] hidden sm:block font-medium">
              {user?.full_name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown size={13} className="text-[var(--text-subtle)]" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 card shadow-[var(--shadow-float)] z-50 py-1.5 animate-scale-in">
              <button
                onClick={() => { navigate('/settings'); setDropdownOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)]
                           hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all duration-150"
              >
                <Settings size={14} /> Settings
              </button>
              <button
                onClick={() => { navigate('/settings'); setDropdownOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-muted)]
                           hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all duration-150"
              >
                <User size={14} /> Profile
              </button>
              <div className="border-t border-[var(--border-color)] my-1" />
              <button
                onClick={() => { signOut(); setDropdownOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500
                           hover:bg-red-500/5 transition-all duration-150"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
