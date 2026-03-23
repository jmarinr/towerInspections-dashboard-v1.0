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

    // Cuando el usuario regresa al tab: getUser() valida con el servidor
    // y refresca el token automáticamente. A diferencia de getSession(),
    // getUser() NO lee el caché — siempre consulta Supabase Auth.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && get().isAuthed) {
        get()._refreshOnFocus()
      }
    })
  },

  // ── Refrescar sesión al volver al tab ────────────────────────────────
  _refreshOnFocus: async () => {
    try {
      // getUser() valida con el servidor + refresca si el token expiró
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) {
        // Sesión verdaderamente expirada → logout limpio
        await supabase.auth.signOut()
        set({ isAuthed: false, user: null, isLoading: false, sessionWarning: false })
      } else {
        // Sesión válida (SDK ya refrescó el token si era necesario)
        set({ sessionWarning: false })
      }
    } catch {
      // Error de red al verificar → no cerrar sesión, solo avisar
      set({ sessionWarning: true })
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
