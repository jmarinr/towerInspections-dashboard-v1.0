import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import { LOG } from '../lib/logEvent'

export const useAuthStore = create((set, get) => ({
  isAuthed:    false,
  user:        null,   // { id, email, full_name, role, company_id, canWrite }
  isLoading:   true,   // true mientras verifica sesión al arrancar

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
        // Solo registrar log en login real, no en token refresh automático
        const wasAuthed = get().isAuthed
        await get()._loadProfile(session.user.id, !wasAuthed)
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refrescado automáticamente — no hacer nada, la sesión sigue activa
        // No desmontar componentes, no cambiar isAuthed
      } else if (event === 'SIGNED_OUT') {
        set({ isAuthed: false, user: null, isLoading: false })
      }
    })
  },

  // ── Cargar perfil desde app_users ────────────────────────────────────────
  _loadProfile: async (authId, isRealLogin = false) => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, email, full_name, role, company_id, active, companies(name, org_code)')
        .eq('id', authId)
        .single()

      if (error || !data) {
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
        isAuthed: true,
        isLoading: false,
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

      // Registrar log solo en login real, no en refresh silencioso de sesión
      if (isRealLogin) {
        LOG.authLogin(data.email, data.role, data.company_id)
      }

    } catch {
      set({ isAuthed: false, user: null, isLoading: false })
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
    // Login exitoso — _loadProfile se dispara vía onAuthStateChange
    return { ok: true }
  },

  // ── Logout ───────────────────────────────────────────────────────────────
  logout: async () => {
    const user = get().user
    if (user) LOG.authLogout(user.email, user.role)
    await supabase.auth.signOut()
    set({ isAuthed: false, user: null })
  },

  // ── Helpers de permiso ────────────────────────────────────────────────────
  isAdmin:      () => get().user?.role === 'admin',
  isSupervisor: () => get().user?.role === 'supervisor',
}))
