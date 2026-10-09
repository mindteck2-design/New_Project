import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { fetchAudit, fetchInstance, fetchWorkflowDefinition, transition } from '@/api/client'
import Shell from '@/components/Shell'
import DecisionNode from '@/components/DecisionNode'
import DynamicForm from '@/components/DynamicForm'
import WorkflowChart from '@/components/WorkflowChart'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function InstancePage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const instance = useQuery({ queryKey: ['instance', id], queryFn: () => fetchInstance(id) })
  const audit = useQuery({ queryKey: ['audit', id], queryFn: () => fetchAudit(id) })
  const definition = useQuery({
    queryKey: ['workflow-def', instance.data?.workflowKey],
    queryFn: () => fetchWorkflowDefinition(instance.data.workflowKey),
    enabled: !!instance.data?.workflowKey,
  })

  const mutate = useMutation({
    mutationFn: (body) => transition(id, body),
    onSuccess: (data) => {
      toast.success(data.status === 'COMPLETED' ? 'Workflow completed' : 'Step recorded', {
        description: data.currentNode?.label,
        action:
          data.status === 'RUNNING'
            ? {
                label: 'Stay',
                onClick: () => {},
              }
            : undefined,
      })
      qc.invalidateQueries({ queryKey: ['instance', id] })
      qc.invalidateQueries({ queryKey: ['audit', id] })
      qc.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Transition failed'),
  })

  const data = instance.data
  const node = data?.currentNode

  return (
    <Shell
      title={data?.workflowName || 'Instance'}
      subtitle={data ? `${data.businessKey || data.instanceId} · ${data.status}` : 'Loading…'}
    >
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </Button>

      {instance.isLoading && <p className="text-sm text-muted-foreground">Loading instance…</p>}
      {instance.isError && <p className="text-sm text-destructive">Could not load instance.</p>}

      {data && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardDescription>Current step</CardDescription>
                  <CardTitle className="mt-1 text-xl">{node?.label}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="secondary">{node?.type}</Badge>
                    {node?.roleCode && <Badge>{node.roleCode}</Badge>}
                    <Badge variant={data.status === 'COMPLETED' ? 'success' : 'warning'}>{data.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {data.status === 'COMPLETED' && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Workflow completed. Review the audit trail for the full chain of custody.
                  </p>
                )}

                {data.status === 'RUNNING' && node?.type === 'DECISION' && (
                  <DecisionNode
                    actions={data.allowedActions}
                    disabled={mutate.isPending || (data.allowedActions || []).length === 0}
                    onDecide={(value) =>
                      mutate.mutate({
                        action: 'DECISION',
                        decisionValue: value,
                        signaturePlaceholder: 'ack',
                      })
                    }
                  />
                )}

                {data.status === 'RUNNING' && node?.type === 'TASK' && (
                  <DynamicForm
                    formKey={node.formKey}
                    disabled={mutate.isPending || (data.allowedActions || []).length === 0}
                    onSubmit={({ formPayload, signaturePlaceholder }) =>
                      mutate.mutate({
                        action: 'COMPLETE',
                        formPayload,
                        notes: formPayload.notes || formPayload.observations,
                        signaturePlaceholder,
                      })
                    }
                  />
                )}

                {data.status === 'RUNNING' && (data.allowedActions || []).length === 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Your current role cannot act here. Use the role/user switcher and select{' '}
                      <strong>{node?.roleCode}</strong> (or admin), then return — or open the matching
                      notification after switching.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live workflow chart</CardTitle>
                <CardDescription>Current node highlighted on the XY graph.</CardDescription>
              </CardHeader>
              <CardContent>
                <WorkflowChart definition={definition.data} currentNodeKey={node?.key} />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Audit trail</CardTitle>
              <CardDescription>Immutable Pass / Fail / Complete history.</CardDescription>
            </CardHeader>
            <CardContent>
              {audit.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
              <ol className="space-y-3">
                {(audit.data || []).map((a) => (
                  <li key={a.id} className="relative border-l-2 border-primary/40 pl-4">
                    <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <div className="text-sm font-medium">{a.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.fromNode} → {a.toNode}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                      {a.signaturePlaceholder ? ` · sig: ${a.signaturePlaceholder}` : ''}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </Shell>
  )
}
