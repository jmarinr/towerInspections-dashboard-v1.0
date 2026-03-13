import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light',  // 'light' | 'dark'
      toggle: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: next })
        document.documentElement.setAttribute('data-theme', next)
      },
      init: () => {
        const stored = get().theme
        document.documentElement.setAttribute('data-theme', stored)
      },
    }),
    { name: 'pti-theme' }
  )
)
