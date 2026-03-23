import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import { LOG } from '../lib/logEvent'

export const useAuthStore = create((set, get) => ({
  isAuthed:       false,
  user:           null,
  isLoading:      true,
  sessionWarning: false,

  // ── Inicializar — llamar una vez al montar App ─────────────────────────
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get()._loadProfile(session.user.id)
    } else {
      set({ isLoading: false })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const wasAuthed = get().isAuthed
        await get()._loadProfile(session.user.id, !wasAuthed)
      } else if (event === 'TOKEN_REFRESHED') {
        set({ sessionWarning: false })
      } else if (event === 'SIGNED_OUT') {
        set({ isAuthed: false, user: null, isLoading: false, sessionWarning: false })
      }
    })

    // Nota: el listener de visibilitychange está en Shell.jsx (con cleanup correcto).
    // No registrar aquí para evitar llamadas duplicadas a _refreshOnFocus.
  },

  // ── Refrescar sesión al volver al tab ────────────────────────────────
  _refreshOnFocus: async () => {
    // getUser() va al servidor — necesita timeout para no colgarse si la red
    // está lenta al volver al tab (exactamente el escenario que queremos proteger).
    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
    ])

    try {
      const { data, error } = await withTimeout(supabase.auth.getUser(), 5000)
      if (error || !data?.user) {
        // Sesión verdaderamente expirada → logout limpio
        await supabase.auth.signOut()
        set({ isAuthed: false, user: null, isLoading: false, sessionWarning: false })
      } else {
        // Sesión válida (SDK ya refrescó el token si era necesario)
        set({ sessionWarning: false })
      }
    } catch (e) {
      if (e?.message === 'timeout') {
        // Red lenta al volver al tab — no cerrar sesión, el usuario puede seguir trabajando
        // El auto-refresh del SDK intentará refrescar el token en background
        set({ sessionWarning: false })
      } else {
        // Error de red real → avisar sin cerrar sesión
        set({ sessionWarning: true })
      }
    }
  },

  // ── Cargar perfil desde app_users ────────────────────────────────────
  _loadProfile: async (authId, isRealLogin = false) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, email, full_name, role, company_id, active, companies(name, org_code)')
        .eq('id', authId)
        .single()

      if (error) {
        // PGRST116 = 0 rows → usuario no existe en app_users → logout
        const isNotFound = error.code === 'PGRST116' || error.details?.includes('0 rows')
        if (isNotFound) {
          await supabase.auth.signOut()
          set({ isAuthed: false, user: null, isLoading: false })
        } else {
          // Error de red → NO cerrar sesión
          set({ isLoading: false, sessionWarning: true })
        }
        return
      }

      if (!data?.active) {
        await supabase.auth.signOut()
        set({ isAuthed: false, user: null, isLoading: false })
        return
      }

      if (!['admin', 'supervisor'].includes(data.role)) {
        await supabase.auth.signOut()
        set({ isAuthed: false, user: null, isLoading: false })
        return
      }

      set({
        isAuthed:       true,
        isLoading:      false,
        sessionWarning: false,
        user: {
          id:         data.id,
          email:      data.email,
          name:       data.full_name,
          role:       data.role,
          company_id: data.company_id,
          company:    data.companies,
          canWrite:   true,
        },
      })

      if (isRealLogin) LOG.authLogin(data.email, data.role, data.company_id)

    } catch {
      set({ isLoading: false, sessionWarning: true })
    }
  },

  login: async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message?.includes('Invalid login')
        ? 'Correo o contraseña incorrectos'
        : error.message || 'Error al iniciar sesión'
      LOG.authLoginFailed(email)
      return { ok: false, message: msg }
    }
    return { ok: true }
  },

  logout: async () => {
    const user = get().user
    if (user) LOG.authLogout(user.email, user.role)
    await supabase.auth.signOut()
    set({ isAuthed: false, user: null, sessionWarning: false })
  },

  isAdmin:      () => get().user?.role === 'admin',
  isSupervisor: () => get().user?.role === 'supervisor',
}))
