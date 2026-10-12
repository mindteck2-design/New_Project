import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bell, ClipboardList, FileStack, Package, Workflow, BarChart3 } from 'lucide-react'
import { actionableNotifications, fetchInstances, fetchWorkflows } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { NAV_LABELS } from '@/lib/navConfig'
import { useAuth } from '@/stores/authStore'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import RoleWorkBriefing from '@/components/RoleWorkBriefing'
import PendingWorkQueue from '@/components/PendingWorkQueue'
import RoleAnalytics from '@/components/RoleAnalytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const QUICK_LINKS = [
  { to: '/inbox', label: NAV_LABELS.inbox, description: 'Stages waiting on your role', icon: Bell },
  { to: '/packages', label: NAV_LABELS.packages, description: 'Aircraft PO/SO · ROUTINE or REPAIR', icon: Package },
  { to: '/instances', label: NAV_LABELS.runs, description: 'Active and completed stage history', icon: ClipboardList },
  { to: '/forms', label: NAV_LABELS.forms, description: 'Reusable checklists and stage forms', icon: FileStack },
  { to: '/workflows', label: NAV_LABELS.workflows, description: 'Configure stages, roles, and transitions', icon: Workflow },
  { to: '/analytics', label: NAV_LABELS.analytics, description: 'Role-curated maintenance KPIs', icon: BarChart3 },
]

/** Overview home — role briefing first, then pending work, then modules. */
export default function WorkflowDashboard() {
  const { user } = useAuth()

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
          title="Your work today"
          description="Pending maintenance stages for your roles — then execute work orders or configure masters."
          breadcrumbs={[{ label: NAV_LABELS.dashboard }]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/inbox">
                  <Bell className="h-3.5 w-3.5" />
                  {NAV_LABELS.inbox}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/packages/new">
                  <Package className="h-3.5 w-3.5" />
                  New work order
                </Link>
              </Button>
            </div>
          }
        />

        <RoleWorkBriefing user={user} pendingCount={inbox.length} />

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
              Workflows
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {(workflows.data || []).length}
            </div>
          </div>
        </div>

        <PendingWorkQueue
          user={user}
          items={inbox}
          loading={instances.isLoading}
          limit={8}
          heading="Do these next"
        />

        {inbox.length > 8 && (
          <div className="-mt-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/inbox">
                View all {inbox.length} pending actions
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        )}

        <section aria-labelledby="modules-heading">
          <h2 id="modules-heading" className="mb-3 text-sm font-semibold tracking-tight">
            Go to
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
      </PageFrame>
    </Shell>
  )
}
