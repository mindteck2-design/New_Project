import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Play } from 'lucide-react'
import { fetchWorkflowDefinition, fetchWorkflows, startInstance } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import WorkflowChart from '@/components/WorkflowChart'
import { Button } from '@/components/ui/button'

export default function ProcessMapPage() {
  const { key: routeKey } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const workflows = useQuery({ queryKey: queryKeys.workflows.all, queryFn: fetchWorkflows })
  const activeKey = routeKey || workflows.data?.[0]?.key
  const activeWorkflow = (workflows.data || []).find((w) => w.key === activeKey)

  useEffect(() => {
    if (!routeKey && workflows.data?.[0]?.key) {
      navigate(`/process/${workflows.data[0].key}`, { replace: true })
    }
  }, [routeKey, workflows.data, navigate])

  const definition = useQuery({
    queryKey: queryKeys.workflows.detail(activeKey),
    queryFn: () => fetchWorkflowDefinition(activeKey),
    enabled: !!activeKey,
  })

  const start = useMutation({
    mutationFn: ({ key }) => startInstance(key, `BK-${Date.now()}`),
    onSuccess: (data) => {
      toast.success('Workflow started')
      qc.invalidateQueries({ queryKey: ['instances'] })
      navigate(`/instances/${data.instanceId}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not start workflow'),
  })

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title={activeWorkflow?.name || 'Process map'}
          description={
            activeKey
              ? `Server-driven XY graph for ${activeKey}${activeWorkflow ? ` · v${activeWorkflow.version}` : ''}.`
              : 'Select a workflow definition to view its process chart.'
          }
          backTo="/workflows"
          backLabel="Workflows"
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Workflows', to: '/workflows' },
            { label: activeWorkflow?.name || activeKey || 'Process map' },
          ]}
          actions={
            activeKey ? (
              <Button size="sm" disabled={start.isPending} onClick={() => start.mutate({ key: activeKey })}>
                <Play className="h-3.5 w-3.5" />
                Start instance
              </Button>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2">
          {(workflows.data || []).map((w) => (
            <Button
              key={w.id}
              asChild
              size="sm"
              variant={activeKey === w.key ? 'default' : 'outline'}
              className="h-8"
            >
              <Link to={`/process/${w.key}`}>{w.name}</Link>
            </Button>
          ))}
        </div>

        <WorkflowChart
          definition={definition.data}
          className="h-[min(68vh,640px)] min-h-[400px]"
        />
      </PageFrame>
    </Shell>
  )
}
