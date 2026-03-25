import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Category } from '../types'

interface CategoriesState {
  categories: Category[]
  loading: boolean
  fetch: (userId: string) => Promise<void>
  add: (name: string, color: string, userId: string) => Promise<Category | null>
  update: (id: string, updates: Partial<Pick<Category, 'name' | 'color'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  subscribeRealtime: (userId: string) => () => void
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,

  fetch: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    set({ categories: data || [], loading: false })
  },

  add: async (name, color, userId) => {
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim(), color, user_id: userId })
      .select()
      .single()
    if (error || !data) return null
    set({ categories: [...get().categories, data] })
    return data
  },

  update: async (id, updates) => {
    const { data } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) set({ categories: get().categories.map((c) => (c.id === id ? data : c)) })
  },

  remove: async (id) => {
    await supabase.from('categories').delete().eq('id', id)
    set({ categories: get().categories.filter((c) => c.id !== id) })
  },

  subscribeRealtime: (userId) => {
    const channel = supabase
      .channel(`categories:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload
          if (eventType === 'INSERT') {
            const exists = get().categories.find((c) => c.id === (newRow as Category).id)
            if (!exists) set({ categories: [...get().categories, newRow as Category] })
          } else if (eventType === 'UPDATE') {
            set({ categories: get().categories.map((c) => c.id === (newRow as Category).id ? (newRow as Category) : c) })
          } else if (eventType === 'DELETE') {
            set({ categories: get().categories.filter((c) => c.id !== (oldRow as Category).id) })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}))
