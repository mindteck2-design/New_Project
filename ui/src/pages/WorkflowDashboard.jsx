import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bell, ClipboardList, GitBranch, Play, BarChart3 } from 'lucide-react'
import { actionableNotifications, fetchInstances, fetchWorkflows } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useAuth } from '@/stores/authStore'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import RoleAnalytics from '@/components/RoleAnalytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const QUICK_LINKS = [
  { to: '/inbox', label: 'Action inbox', description: 'Steps waiting on your roles', icon: Bell },
  { to: '/workflows', label: 'Workflows', description: 'Definitions and start actions', icon: Play },
  { to: '/process', label: 'Process map', description: 'XY graph for seeded charts', icon: GitBranch },
  { to: '/instances', label: 'Instances', description: 'Table, filters, Excel export', icon: ClipboardList },
  { to: '/analytics', label: 'Analytics', description: 'Role-curated KPIs', icon: BarChart3 },
]

/** Overview home — links into dedicated activity routes (not a single mega-page). */
export default function WorkflowDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const workflows = useQuery({ queryKey: queryKeys.workflows.all, queryFn: fetchWorkflows })
  const instances = useQuery({ queryKey: queryKeys.instances.all(user?.id), queryFn: fetchInstances })

  const inbox = useMemo(
    () => actionableNotifications(instances.data || [], user),
    [instances.data, user],
  )

  const running = (instances.data || []).filter((i) => i.status === 'RUNNING').length
  const completed = (instances.data || []).filter((i) => i.status === 'COMPLETED').length

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="Workflow dashboard"
          description="Operational overview. Open a module from the sidebar or cards below."
          breadcrumbs={[{ label: 'Dashboard' }]}
          actions={
            <Button asChild size="sm">
              <Link to="/workflows">
                <Play className="h-3.5 w-3.5" />
                Start workflow
              </Link>
            </Button>
          }
        />

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
          <div className="bg-card px-4 py-3.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Waiting on you
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{inbox.length}</div>
          </div>
          <div className="bg-card px-4 py-3.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Running
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{running}</div>
          </div>
          <div className="bg-card px-4 py-3.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Completed
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{completed}</div>
          </div>
          <div className="bg-card px-4 py-3.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Definitions
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {(workflows.data || []).length}
            </div>
          </div>
        </div>

        <section aria-labelledby="modules-heading">
          <h2 id="modules-heading" className="mb-3 text-sm font-semibold tracking-tight">
            Modules
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.to}
                  asChild
                  variant="outline"
                  className="h-auto justify-start gap-3 px-4 py-4 text-left font-normal"
                >
                  <Link to={item.to}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="block text-sm font-medium text-foreground">{item.label}</span>
                        {item.to === '/inbox' && inbox.length > 0 && (
                          <Badge className="h-5 px-1.5 text-[10px]">{inbox.length}</Badge>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </Button>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="dash-analytics-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="dash-analytics-heading" className="text-sm font-semibold tracking-tight">
              Role analytics snapshot
            </h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/analytics">View full analytics</Link>
            </Button>
          </div>
          <RoleAnalytics />
        </section>

        <section aria-labelledby="recent-heading">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="recent-heading" className="text-sm font-semibold tracking-tight">
              Recent actions
            </h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/inbox">Open inbox</Link>
            </Button>
          </div>
          <div className="divide-y rounded-lg border bg-card">
            {inbox.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No steps waiting — start a workflow or switch role.
              </p>
            )}
            {inbox.slice(0, 5).map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-between gap-3 rounded-none px-4 py-3 text-left font-normal"
                onClick={() => navigate(item.href)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </section>
      </PageFrame>
    </Shell>
  )
}
