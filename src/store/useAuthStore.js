import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const SUPERVISOR_USER = '111111'
const SUPERVISOR_PASS = '111111'

export const useAuthStore = create(
  persist(
    (set) => ({
      isAuthed: false,
      user: null,
      login: async ({ username, password }) => {
        // Demo temporal: supervisor 111111 / 111111
        const ok = String(username).trim() === SUPERVISOR_USER && String(password) === SUPERVISOR_PASS
        if (!ok) return { ok: false, message: 'Credenciales inválidas' }
        set({ isAuthed: true, user: { role: 'supervisor', username: SUPERVISOR_USER } })
        return { ok: true }
      },
      logout: () => set({ isAuthed: false, user: null }),
    }),
    { name: 'pti_admin_auth_v1' },
  ),
)
