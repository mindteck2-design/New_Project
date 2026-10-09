import { Link } from 'react-router-dom'
import { currentUser, logout } from '../api/client'

export default function Shell({ children, title }) {
  const user = currentUser()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--panel)] backdrop-blur px-5 py-3 flex items-center justify-between gap-4">
        <div>
          <Link to="/" className="no-underline text-[var(--ink)]">
            <div className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--steel)]">
              AMMS
            </div>
            <div className="text-sm text-[var(--steel)]/80">Dynamic Workflow Engine</div>
          </Link>
        </div>
        <div className="text-right text-sm">
          {user && (
            <>
              <div className="font-medium">{user.displayName}</div>
              <div className="text-[var(--steel)]/70">{(user.roles || []).join(' · ')}</div>
              <button
                type="button"
                className="mt-1 text-[var(--accent)] underline"
                onClick={() => {
                  logout()
                  window.location.href = '/login'
                }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </header>
      <main className="flex-1 px-5 py-6 max-w-6xl w-full mx-auto">
        {title && (
          <h1 className="font-[family-name:var(--font-display)] text-3xl mb-4 text-[var(--steel)]">
            {title}
          </h1>
        )}
        {children}
      </main>
      <footer className="hal-banner text-center py-3 border-t border-[var(--line)] bg-[var(--panel)]">
        Property of HAL — Restricted · AS 9110 C–aligned audit trail
      </footer>
    </div>
  )
}
