/**
 * Compatibility re-exports — global auth lives in Zustand (`stores/authStore`).
 * Prefer `import { useAuth } from '@/stores/authStore'`.
 */
export { useAuth, useAuthStore } from '@/stores/authStore'

/** No-op provider kept so older trees that wrap AuthProvider still compile. */
export function AuthProvider({ children }) {
  return children
}
