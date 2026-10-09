import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { currentUser, login as apiLogin, logout as apiLogout } from '@/api/client'
import { DEMO_PASSWORD } from '@/lib/demoUsers'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => currentUser())
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    const sync = () => setUser(currentUser())
    window.addEventListener('amms-auth-changed', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('amms-auth-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setUser(null)
  }, [])

  const switchUser = useCallback(async (username) => {
    setSwitching(true)
    try {
      const data = await apiLogin(username, DEMO_PASSWORD)
      setUser(data.user)
      return data
    } finally {
      setSwitching(false)
    }
  }, [])

  const value = useMemo(
    () => ({ user, login, logout, switchUser, switching, isAuthenticated: !!user }),
    [user, login, logout, switchUser, switching],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
