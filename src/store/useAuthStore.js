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

  // _refreshOnFocus eliminado intencionalmente.
  // 
  // El SDK de Supabase JS v2 con autoRefreshToken:true maneja el refresh
  // del token automáticamente. Llamar getUser() o getSession() desde
  // visibilitychange adquiere el lock interno del SDK. Si el usuario
  // hace click en Guardar mientras ese lock está ocupado, el save espera
  // el lock indefinidamente → timeout → "Guardando..." sin ejecutar nada.
  //
  // El ciclo correcto es:
  //   - Token válido → SDK lo usa directamente
  //   - Token expirado → SDK detecta 401 → llama refreshSession() → reintenta
  //   - Refresh token expirado → onAuthStateChange(SIGNED_OUT) → logout limpio
  //
  // No necesitamos hacer nada manualmente en visibilitychange.

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
