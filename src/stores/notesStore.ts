import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Note } from '../types'

interface NotesState {
  notes: Note[]
  loading: boolean
  fetch: (userId: string) => Promise<void>
  add: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => Promise<Note | null>
  update: (id: string, updates: Partial<Note>) => Promise<void>
  remove: (id: string) => Promise<void>
  subscribeRealtime: (userId: string) => () => void
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    set({ notes: data || [], loading: false })
  },

  add: async (note) => {
    const { data, error } = await supabase.from('notes').insert(note).select().single()
    if (error || !data) return null
    set({ notes: [data, ...get().notes] })
    return data
  },

  update: async (id, updates) => {
    const { data } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) set({ notes: get().notes.map((n) => (n.id === id ? data : n)) })
  },

  remove: async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    set({ notes: get().notes.filter((n) => n.id !== id) })
  },

  subscribeRealtime: (userId) => {
    const channel = supabase
      .channel('notes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const exists = get().notes.find((n) => n.id === payload.new.id)
            if (!exists) set({ notes: [payload.new as Note, ...get().notes] })
          } else if (payload.eventType === 'UPDATE') {
            set({ notes: get().notes.map((n) => n.id === payload.new.id ? payload.new as Note : n) })
          } else if (payload.eventType === 'DELETE') {
            set({ notes: get().notes.filter((n) => n.id !== payload.old.id) })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}))
