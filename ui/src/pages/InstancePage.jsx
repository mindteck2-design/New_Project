import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchAudit, fetchInstance, transition } from '../api/client'
import Shell from '../components/Shell'
import DecisionNode from '../components/DecisionNode'
import DynamicForm from '../components/DynamicForm'

export default function InstancePage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const instance = useQuery({ queryKey: ['instance', id], queryFn: () => fetchInstance(id) })
  const audit = useQuery({ queryKey: ['audit', id], queryFn: () => fetchAudit(id) })

  const mutate = useMutation({
    mutationFn: (body) => transition(id, body),
    onSuccess: () => {
      toast.success('Step recorded')
      qc.invalidateQueries({ queryKey: ['instance', id] })
      qc.invalidateQueries({ queryKey: ['audit', id] })
      qc.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Transition failed'),
  })

  const data = instance.data
  const node = data?.currentNode

  return (
    <Shell title={data?.workflowName || 'Instance'}>
      <div className="mb-4">
        <Link to="/" className="text-sm text-[var(--accent)]">← Dashboard</Link>
      </div>

      {instance.isLoading && <p>Loading instance…</p>}
      {instance.isError && <p className="text-[var(--danger)]">Could not load instance.</p>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex justify-between gap-3 mb-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--steel)]/60">Current step</div>
                <h2 className="text-xl font-semibold text-[var(--steel)]">{node?.label}</h2>
                <div className="text-sm text-[var(--steel)]/70">
                  {node?.type} · role {node?.roleCode || 'any'} · {data.status}
                </div>
              </div>
              <div className="text-xs text-right text-[var(--steel)]/60">
                <div>{data.businessKey}</div>
                <div className="font-mono">{data.instanceId}</div>
              </div>
            </div>

            {data.status === 'COMPLETED' && (
              <p className="text-[var(--ok)] font-medium">Workflow completed.</p>
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
              <p className="text-[var(--accent-2)] text-sm">
                Your role cannot act on this step. Sign in as {node?.roleCode} or admin.
              </p>
            )}
          </section>

          <section className="border border-[var(--line)] bg-white/70 p-5">
            <h3 className="font-semibold mb-3 text-[var(--steel)]">Audit trail</h3>
            {audit.isLoading && <p className="text-sm">Loading…</p>}
            <ol className="space-y-2 text-sm">
              {(audit.data || []).map((a) => (
                <li key={a.id} className="border-l-2 border-[var(--accent)] pl-3">
                  <div className="font-medium">{a.action}</div>
                  <div className="text-xs text-[var(--steel)]/70">
                    {a.fromNode} → {a.toNode}
                  </div>
                  <div className="text-xs text-[var(--steel)]/60">
                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}
                    {a.signaturePlaceholder ? ` · sig: ${a.signaturePlaceholder}` : ''}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </Shell>
  )
}
