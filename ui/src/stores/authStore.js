import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { api, bindAuthInterceptors } from '@/api/http'
import { DEMO_PASSWORD } from '@/lib/demoUsers'

/**
 * Global auth state (Zustand). Token + user persist across reloads.
 * Server data stays in TanStack Query — this store is client session only.
 */
export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      switching: false,

      async login(username, password) {
        const { data } = await api.post('/auth/login', { username, password })
        set({ token: data.token, user: data.user })
        return data
      },

      logout() {
        set({ token: null, user: null, switching: false })
      },

      async switchUser(username) {
        set({ switching: true })
        try {
          const { data } = await api.post('/auth/login', {
            username,
            password: DEMO_PASSWORD,
          })
          set({ token: data.token, user: data.user })
          return data
        } finally {
          set({ switching: false })
        }
      },
    }),
    {
      name: 'amms.auth.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    },
  ),
)

bindAuthInterceptors({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().logout(),
})

/** Selector-friendly auth hook (same surface as former AuthContext). */
export function useAuth() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const switching = useAuthStore((s) => s.switching)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const switchUser = useAuthStore((s) => s.switchUser)
  return {
    token,
    user,
    switching,
    login,
    logout,
    switchUser,
    isAuthenticated: Boolean(token && user),
  }
}
