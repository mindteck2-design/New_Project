import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { login } from '../api/client'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Passw0rd!')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await login(username, password)
      toast.success('Signed in')
      navigate('/')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="font-[family-name:var(--font-display)] text-5xl text-[var(--steel)] animate-[fadeIn_0.6s_ease]">
            AMMS
          </div>
          <p className="mt-2 text-[var(--steel)]/80">
            Overhaul Division workflow control — role-gated steps, decisions, and audit.
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="bg-[var(--panel)] border border-[var(--line)] p-6 shadow-sm space-y-4"
        >
          <label className="block text-sm">
            <span className="font-medium">Username</span>
            <input
              className="mt-1 w-full border border-[var(--line)] px-3 py-2 bg-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              className="mt-1 w-full border border-[var(--line)] px-3 py-2 bg-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent)] text-white py-2.5 font-medium disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-xs text-[var(--steel)]/70">
            Dev users: admin / inspection.user / progress.user / shop.user — password Passw0rd!
          </p>
        </form>
        <p className="hal-banner text-center mt-6">Property of HAL — Restricted</p>
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: none; } }`}</style>
    </div>
  )
}
