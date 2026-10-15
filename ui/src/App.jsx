import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/stores/authStore'
import { getUserRoles, hasRole } from '@/lib/roles'
import LoginPage from '@/pages/LoginPage'
import WorkflowDashboard from '@/pages/WorkflowDashboard'
import AnalyticsPage from '@/pages/AnalyticsPage'
import InboxPage from '@/pages/InboxPage'
import WorkflowsPage from '@/pages/WorkflowsPage'
import InstancesPage from '@/pages/InstancesPage'
import InstancePage from '@/pages/InstancePage'
import FormsPage from '@/pages/FormsPage'
import WorkflowDetailPage from '@/pages/WorkflowDetailPage'
import WorkflowBuilderPage from '@/pages/WorkflowBuilderPage'
import PackagesPage from '@/pages/PackagesPage'
import UsersPage from '@/pages/UsersPage'
import ChangePasswordPage from '@/pages/ChangePasswordPage'

/** Legacy /process routes → Workflow Master (chart lives on definition detail). */
function ProcessMapRedirect() {
  const { key } = useParams()
  return <Navigate to={key ? `/workflows/${key}` : '/workflows'} replace />
}

function RequireAuth({ children }) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return children
}

function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (!hasRole(getUserRoles(user), 'ADMIN')) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  const { token, refreshUser } = useAuth()

  useEffect(() => {
    if (!token) return

    refreshUser().catch(() => {
      toast.error('Could not refresh account permissions. Please retry or sign in again.')
    })
  }, [refreshUser, token])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/change-password"
        element={
          <RequireAuth>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />

      <Route
        path="/"
        element={
          <RequireAuth>
            <WorkflowDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/analytics"
        element={
          <RequireAuth>
            <AnalyticsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/inbox"
        element={
          <RequireAuth>
            <InboxPage />
          </RequireAuth>
        }
      />
      <Route
        path="/workflows"
        element={
          <RequireAuth>
            <WorkflowsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/workflows/new"
        element={
          <RequireAuth>
            <WorkflowBuilderPage />
          </RequireAuth>
        }
      />
      <Route
        path="/workflows/:key"
        element={
          <RequireAuth>
            <WorkflowDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/workflows/:key/forms/:formKey"
        element={
          <RequireAuth>
            <FormsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/process"
        element={
          <RequireAuth>
            <ProcessMapRedirect />
          </RequireAuth>
        }
      />
      <Route
        path="/process/:key"
        element={
          <RequireAuth>
            <ProcessMapRedirect />
          </RequireAuth>
        }
      />
      <Route
        path="/instances"
        element={
          <RequireAuth>
            <InstancesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/instances/:id"
        element={
          <RequireAuth>
            <InstancePage />
          </RequireAuth>
        }
      />
      <Route
        path="/forms"
        element={
          <RequireAuth>
            <FormsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/forms/:formKey"
        element={
          <RequireAuth>
            <FormsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/users"
        element={
          <RequireAuth>
            <RequireAdmin>
              <UsersPage />
            </RequireAdmin>
          </RequireAuth>
        }
      />
      <Route
        path="/packages"
        element={
          <RequireAuth>
            <PackagesPage mode="list" />
          </RequireAuth>
        }
      />
      <Route
        path="/packages/new"
        element={
          <RequireAuth>
            <PackagesPage mode="new" />
          </RequireAuth>
        }
      />
      <Route
        path="/packages/:id"
        element={
          <RequireAuth>
            <PackagesPage mode="detail" />
          </RequireAuth>
        }
      />
      <Route
        path="/packages/:id/report"
        element={
          <RequireAuth>
            <PackagesPage mode="report" />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
