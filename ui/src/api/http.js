import axios from 'axios'
import { env } from '@/config/env'

/**
 * Shared Axios instance for TanStack Query + imperative calls.
 * Auth binding is attached once from `stores/authStore` (avoids circular imports).
 */
export const api = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeoutMs,
  headers: {
    Accept: 'application/json',
  },
})

let authBound = false

export function bindAuthInterceptors({ getToken, onUnauthorized }) {
  if (authBound) return
  authBound = true

  api.interceptors.request.use((config) => {
    const token = getToken?.()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const url = error.config?.url || ''
        if (getToken?.() && !url.includes('/auth/login')) {
          onUnauthorized?.()
        }
      }
      return Promise.reject(error)
    },
  )
}
