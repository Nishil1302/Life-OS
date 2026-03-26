import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import QuickAdd from '../QuickAdd'
import CommandBar from '../CommandBar'
import { useUIStore } from '../../stores/uiStore'
import { useTasksStore } from '../../stores/tasksStore'
import { useHabitsStore } from '../../stores/habitsStore'
import { useNotificationsStore } from '../../stores/notificationsStore'

export default function Layout() {
  const { quickAddOpen, setQuickAdd, commandBarOpen, setCommandBar } = useUIStore()
  const { tasks } = useTasksStore()
  const { habits, logs } = useHabitsStore()
  const { generate } = useNotificationsStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandBar(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandBar])

  useEffect(() => {
    if (tasks.length > 0 || habits.length > 0) generate({ tasks, habits, logs })
  }, [tasks, habits, logs])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300 overflow-x-hidden">
      <Sidebar />
      <Navbar />
      <main className="md:ml-60 pt-14 min-h-screen">
        <div className="p-4 md:p-6 animate-fade-in max-w-full">
          <Outlet />
        </div>
      </main>
      {quickAddOpen  && <QuickAdd onClose={() => setQuickAdd(false)} />}
      {commandBarOpen && <CommandBar />}
    </div>
  )
}
