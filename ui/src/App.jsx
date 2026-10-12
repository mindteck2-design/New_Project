import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
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

/** Legacy /process routes → Workflow Master (chart lives on definition detail). */
function ProcessMapRedirect() {
  const { key } = useParams()
  return <Navigate to={key ? `/workflows/${key}` : '/workflows'} replace />
}

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
