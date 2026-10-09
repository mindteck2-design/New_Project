import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'
import WorkflowDashboard from '@/pages/WorkflowDashboard'
import AnalyticsPage from '@/pages/AnalyticsPage'
import InboxPage from '@/pages/InboxPage'
import WorkflowsPage from '@/pages/WorkflowsPage'
import ProcessMapPage from '@/pages/ProcessMapPage'
import InstancesPage from '@/pages/InstancesPage'
import InstancePage from '@/pages/InstancePage'
import FormsPage from '@/pages/FormsPage'

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

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
        path="/process"
        element={
          <RequireAuth>
            <ProcessMapPage />
          </RequireAuth>
        }
      />
      <Route
        path="/process/:key"
        element={
          <RequireAuth>
            <ProcessMapPage />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
