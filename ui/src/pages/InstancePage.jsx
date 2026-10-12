import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldAlert } from 'lucide-react'
import { fetchAudit, fetchInstance, fetchWorkflowDefinition, transition } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import DecisionNode from '@/components/DecisionNode'
import DynamicForm from '@/components/DynamicForm'
import WorkflowChart from '@/components/WorkflowChart'
import DocumentPanel from '@/components/DocumentPanel'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { formatDateTime } from '@/lib/dateTime'

export default function InstancePage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const instance = useQuery({ queryKey: queryKeys.instances.detail(id), queryFn: () => fetchInstance(id) })
  const audit = useQuery({ queryKey: queryKeys.instances.audit(id), queryFn: () => fetchAudit(id) })
  const definition = useQuery({
    queryKey: queryKeys.workflows.detail(instance.data?.workflowKey),
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
      qc.invalidateQueries({ queryKey: queryKeys.instances.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.instances.audit(id) })
      qc.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Transition failed'),
  })

  const data = instance.data
  const node = data?.currentNode
  const shortId = data?.businessKey || (id ? id.slice(0, 8) : '…')

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title={data?.workflowName || 'Instance'}
          description={
            data
              ? `${shortId} · ${data.status}${node?.label ? ` · ${node.label}` : ''}`
              : instance.isLoading
                ? 'Loading instance…'
                : 'Instance unavailable'
          }
          backTo="/instances"
          backLabel="Instances"
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Instances', to: '/instances' },
            {
              label: data?.workflowName || 'Workflow',
              to: data?.workflowKey ? `/process/${data.workflowKey}` : '/process',
            },
            { label: shortId },
          ]}
          actions={
            data ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{node?.type || '—'}</Badge>
                {node?.roleCode && <Badge>{node.roleCode}</Badge>}
                <Badge variant={data.status === 'COMPLETED' ? 'success' : 'warning'}>
                  {data.status}
                </Badge>
              </div>
            ) : null
          }
        />

        {instance.isLoading && (
          <p className="text-sm text-muted-foreground">Loading instance…</p>
        )}
        {instance.isError && (
          <p className="text-sm text-destructive">Could not load instance.</p>
        )}

        {data && (
          <>
            {/* Primary work + context rail */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.75fr)]">
              <section aria-labelledby="step-heading" className="min-w-0">
                <div className="mb-3">
                  <h2 id="step-heading" className="text-sm font-semibold tracking-tight">
                    Current step
                  </h2>
                  <p className="mt-0.5 text-base font-medium text-foreground">{node?.label}</p>
                </div>

                <div className="rounded-lg border bg-card p-4 sm:p-5">
                  {data.status === 'COMPLETED' && (
                    <Alert variant="success">
                      <AlertDescription>
                        Workflow completed. Review the audit trail for the full chain of custody.
                      </AlertDescription>
                    </Alert>
                  )}

                  {data.status === 'RUNNING' && node?.type === 'DECISION' && (
                    <DecisionNode
                      actions={data.allowedActions}
                      disabled={mutate.isPending || (data.allowedActions || []).length === 0}
                      onDecide={(value, signaturePlaceholder) =>
                        mutate.mutate({
                          action: 'DECISION',
                          decisionValue: value,
                          signaturePlaceholder: signaturePlaceholder || 'ack',
                        })
                      }
                    />
                  )}

                  {data.status === 'RUNNING' && node?.type === 'TASK' && (
                    <DynamicForm
                      formKey={node.formKey}
                      instanceId={id}
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
                    <Alert variant="warning">
                      <ShieldAlert className="h-4 w-4" />
                      <AlertDescription>
                        Your current role cannot act here. Use the role/user switcher and select{' '}
                        <strong>{node?.roleCode}</strong> (or admin), then return — or open the
                        matching notification after switching.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </section>

              <aside className="flex min-w-0 flex-col gap-6">
                <DocumentPanel instanceId={id} />

                <section aria-labelledby="audit-heading">
                  <div className="mb-3">
                    <h2 id="audit-heading" className="text-sm font-semibold tracking-tight">
                      Audit trail
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      Immutable Pass / Fail / Complete history.
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    {audit.isLoading && (
                      <p className="text-sm text-muted-foreground">Loading…</p>
                    )}
                    {!audit.isLoading && (audit.data || []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No transitions yet.</p>
                    )}
                    <ol className="space-y-3">
                      {(audit.data || []).map((a) => (
                        <li key={a.id} className="relative border-l-2 border-primary/40 pl-4">
                          <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                          <div className="text-sm font-medium">{a.action}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.fromNode} → {a.toNode}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {a.createdAt ? formatDateTime(a.createdAt) : ''}
                            {a.signaturePlaceholder ? ` · sig: ${a.signaturePlaceholder}` : ''}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </section>
              </aside>
            </div>

            <Separator />

            <section aria-labelledby="chart-heading">
              <div className="mb-3">
                <h2 id="chart-heading" className="text-sm font-semibold tracking-tight">
                  Live workflow chart
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Current node highlighted on the process graph.
                </p>
              </div>
              <WorkflowChart
                definition={definition.data}
                currentNodeKey={node?.key}
                className="h-[min(52vh,520px)] min-h-[360px]"
              />
            </section>
          </>
        )}
      </PageFrame>
    </Shell>
  )
}
