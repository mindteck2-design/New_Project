import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRight, Play } from 'lucide-react'
import {
  actionableNotifications,
  fetchInstances,
  fetchWorkflowDefinition,
  fetchWorkflows,
  startInstance,
} from '@/api/client'
import { useAuth } from '@/stores/authStore'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import WorkflowChart from '@/components/WorkflowChart'
import InstanceInsights from '@/components/InstanceInsights'
import RoleAnalytics from '@/components/RoleAnalytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

/** Prompt-required dashboard: current work, definitions, workflow charts, instances. */
export default function WorkflowDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedKey, setSelectedKey] = useState(null)

  const workflows = useQuery({ queryKey: ['workflows'], queryFn: fetchWorkflows })
  const instances = useQuery({ queryKey: ['instances', user?.id], queryFn: fetchInstances })

  const activeKey = selectedKey || workflows.data?.[0]?.key
  const activeWorkflow = (workflows.data || []).find((w) => w.key === activeKey)
  const definition = useQuery({
    queryKey: ['workflow-def', activeKey],
    queryFn: () => fetchWorkflowDefinition(activeKey),
    enabled: !!activeKey,
  })

  const inbox = useMemo(
    () => actionableNotifications(instances.data || [], user),
    [instances.data, user],
  )

  const start = useMutation({
    mutationFn: ({ key }) => startInstance(key, `BK-${Date.now()}`),
    onSuccess: (data) => {
      toast.success('Workflow started — open to continue', {
        action: {
          label: 'Open',
          onClick: () => navigate(`/instances/${data.instanceId}`),
        },
      })
      qc.invalidateQueries({ queryKey: ['instances'] })
      navigate(`/instances/${data.instanceId}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not start workflow'),
  })

  return (
    <Shell>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 animate-soft-in">
        <PageHeader
          title="Workflow dashboard"
          description="Role-curated analytics, actionable steps, and server-driven process charts."
          breadcrumbs={[{ label: 'Dashboard' }]}
          actions={
            activeKey ? (
              <Button
                size="sm"
                disabled={start.isPending}
                onClick={() => start.mutate({ key: activeKey })}
              >
                <Play className="h-3.5 w-3.5" />
                Start {activeWorkflow?.name || activeKey}
              </Button>
            ) : null
          }
        />

        <section id="analytics" className="scroll-mt-4" aria-labelledby="analytics-heading">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 id="analytics-heading" className="text-sm font-semibold tracking-tight">
              Role analytics
            </h2>
          </div>
          <RoleAnalytics />
        </section>

        <Separator />

        {/* Process map — primary visual stage, full width */}
        <section id="process" className="scroll-mt-4" aria-labelledby="process-heading">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="process-heading" className="text-sm font-semibold tracking-tight">
                Process map
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {activeWorkflow
                  ? `${activeWorkflow.name} · ${activeKey} · v${activeWorkflow.version}`
                  : 'Select a workflow definition'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(workflows.data || []).map((w) => (
                <Button
                  key={w.id}
                  type="button"
                  size="sm"
                  variant={activeKey === w.key ? 'default' : 'outline'}
                  className="h-8"
                  onClick={() => setSelectedKey(w.key)}
                >
                  {w.name}
                </Button>
              ))}
            </div>
          </div>
          <WorkflowChart definition={definition.data} className="h-[min(58vh,560px)] min-h-[360px]" />
        </section>

        {/* Work queue + definitions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section id="inbox" className="scroll-mt-4" aria-labelledby="inbox-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 id="inbox-heading" className="text-sm font-semibold tracking-tight">
                  Action inbox
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Steps waiting on your roles — open to continue.
                </p>
              </div>
              <Badge variant={inbox.length ? 'default' : 'secondary'}>{inbox.length}</Badge>
            </div>
            <div className="divide-y rounded-lg border bg-card">
              {inbox.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No steps waiting on {(user?.roles || []).join(', ') || 'your roles'}.
                </p>
              )}
              {inbox.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-between gap-3 rounded-none px-4 py-3 text-left font-normal hover:bg-muted/50"
                  onClick={() => navigate(item.href)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </section>

          <section id="workflows" className="scroll-mt-4" aria-labelledby="defs-heading">
            <div className="mb-3">
              <h2 id="defs-heading" className="text-sm font-semibold tracking-tight">
                Workflow definitions
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Start a seeded process. Selection drives the process map.
              </p>
            </div>
            <ul className="divide-y rounded-lg border bg-card">
              {(workflows.data || []).map((w) => (
                <li
                  key={w.id}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3',
                    activeKey === w.key && 'bg-accent/50',
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start px-0 py-0 text-left font-normal hover:bg-transparent"
                    onClick={() => setSelectedKey(w.key)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{w.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {w.key} · v{w.version}
                      </span>
                    </span>
                  </Button>
                  <Button
                    size="sm"
                    variant={activeKey === w.key ? 'default' : 'outline'}
                    className="h-8 shrink-0"
                    disabled={start.isPending}
                    onClick={() => start.mutate({ key: w.key })}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start
                  </Button>
                </li>
              ))}
              {(workflows.data || []).length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {workflows.isLoading ? 'Loading definitions…' : 'No workflow definitions available.'}
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* Instances — table owns interaction; no outer card wrapper */}
        <section id="instances" className="scroll-mt-4 pb-4" aria-labelledby="instances-heading">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="instances-heading" className="text-sm font-semibold tracking-tight">
                Instances
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Search, filter, chart, and export operational history.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(instances.data || []).slice(0, 3).map((i) => (
                <Button key={i.instanceId} asChild size="sm" variant="outline" className="h-8 max-w-[200px]">
                  <Link to={`/instances/${i.instanceId}`} className="truncate">
                    {i.businessKey || i.instanceId.slice(0, 8)}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
          <InstanceInsights instances={instances.data || []} />
        </section>
      </div>
    </Shell>
  )
}
