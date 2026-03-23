import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import { LOG } from '../lib/logEvent'

export const useAuthStore = create((set, get) => ({
  isAuthed:       false,
  user:           null,   // { id, email, full_name, role, company_id, canWrite }
  isLoading:      true,   // true mientras verifica sesión al arrancar
  sessionWarning: false,  // true cuando hay problema de conectividad

  // ── Inicializar — llamar una vez al montar App ────────────────────────────
  init: async () => {
    // 1. Verificar sesión existente
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get()._loadProfile(session.user.id)
    } else {
      set({ isLoading: false })
    }

    // 2. Escuchar cambios de sesión (refresh, logout externo)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const wasAuthed = get().isAuthed
        await get()._loadProfile(session.user.id, !wasAuthed)
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refrescado automáticamente — limpiar warning si había
        set({ sessionWarning: false })
      } else if (event === 'SIGNED_OUT') {
        set({ isAuthed: false, user: null, isLoading: false, sessionWarning: false })
      }
    })

    // 3. Vigilar cuando el tab vuelve a ser visible (fix: Chrome suspende auto-refresh en background)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && get().isAuthed) {
        get()._refreshOnFocus()
      }
    })
  },

  // ── Verificar / refrescar sesión al volver al tab ─────────────────────────
  _refreshOnFocus: async () => {
    try {
      const { data, error } = await supabase.auth.getSession()

      // Sin sesión activa → cerrar sesión limpiamente
      if (error || !data?.session) {
        set({ isAuthed: false, user: null, isLoading: false, sessionWarning: false })
        return
      }

      // Si el token expira pronto (< 5 minutos) → forzar refresh
      const expiresAt = data.session.expires_at  // epoch seconds
      const nowSec    = Math.floor(Date.now() / 1000)
      if (expiresAt && (expiresAt - nowSec) < 300) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshData?.session) {
          await supabase.auth.signOut()
          set({ isAuthed: false, user: null, isLoading: false, sessionWarning: false })
        } else {
          set({ sessionWarning: false })
        }
      }
      // Token válido → no hacer nada (no queremos llamadas extra a app_users en cada focus)
    } catch {
      // Error de red al verificar — NO cerrar sesión, solo mostrar aviso
      set({ sessionWarning: true })
    }
  },

  // ── Cargar perfil desde app_users ────────────────────────────────────────
  _loadProfile: async (authId, isRealLogin = false) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, email, full_name, role, company_id, active, companies(name, org_code)')
        .eq('id', authId)
        .single()

      if (error) {
        // Distinguir "usuario no existe" (PGRST116) de error de red/timeout
        const isNotFound = error.code === 'PGRST116' || error.details?.includes('0 rows')
        if (isNotFound) {
          await supabase.auth.signOut()
          set({ isAuthed: false, user: null, isLoading: false })
        } else {
          // Error de red → no cerrar sesión, solo marcar warning
          set({ isLoading: false, sessionWarning: true })
        }
        return
      }

      if (!data) {
        await supabase.auth.signOut()
        set({ isAuthed: false, user: null, isLoading: false })
        return
      }

      if (!data.active) {
        await supabase.auth.signOut()
        set({ isAuthed: false, user: null, isLoading: false })
        return
      }

      // Solo admin y supervisor pueden entrar al dashboard
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
          canWrite:   ['admin', 'supervisor'].includes(data.role),
        },
      })

      if (isRealLogin) {
        LOG.authLogin(data.email, data.role, data.company_id)
      }

    } catch {
      // Excepción inesperada → NO cerrar sesión, avisar
      set({ isLoading: false, sessionWarning: true })
    }
  },

  // ── Login ────────────────────────────────────────────────────────────────
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

  // ── Logout ───────────────────────────────────────────────────────────────
  logout: async () => {
    const user = get().user
    if (user) LOG.authLogout(user.email, user.role)
    await supabase.auth.signOut()
    set({ isAuthed: false, user: null, sessionWarning: false })
  },

  // ── Helpers de permiso ────────────────────────────────────────────────────
  isAdmin:      () => get().user?.role === 'admin',
  isSupervisor: () => get().user?.role === 'supervisor',
}))
