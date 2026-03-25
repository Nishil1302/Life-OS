import { useState } from 'react'
import { Zap, X } from 'lucide-react'
import { useTasksStore } from '../stores/tasksStore'
import { useAuthStore } from '../stores/authStore'
import { parseNaturalInput } from '../lib/utils'
import toast from 'react-hot-toast'

interface Props { onClose: () => void }

export default function QuickAdd({ onClose }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const { add } = useTasksStore()
  const { user } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !user) return
    setLoading(true)
    const { title, due_date } = parseNaturalInput(input.trim())
    const result = await add({
      user_id: user.id,
      title,
      status: 'todo',
      priority: 'medium',
      due_date,
      recurrence: 'none',
    })
    setLoading(false)
    if (result) {
      toast.success('Task created!')
      onClose()
    } else {
      toast.error('Failed to create task')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg card shadow-card animate-slide-up">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Quick Add Task</p>
              <p className="text-xs text-gray-500">Try: "Study DSA tomorrow 5pm"</p>
            </div>
            <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What do you need to do?"
              className="input text-base py-3"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-600">Supports: "tomorrow", "today", "5pm", "3:30pm"</p>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="btn-primary text-sm"
              >
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
