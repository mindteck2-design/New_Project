import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchInstances, fetchWorkflows, startInstance } from '../api/client'
import Shell from '../components/Shell'

export default function DashboardPage() {
  const qc = useQueryClient()
  const workflows = useQuery({ queryKey: ['workflows'], queryFn: fetchWorkflows })
  const instances = useQuery({ queryKey: ['instances'], queryFn: fetchInstances })

  const start = useMutation({
    mutationFn: ({ key }) => startInstance(key, `BK-${Date.now()}`),
    onSuccess: (data) => {
      toast.success('Workflow started')
      qc.invalidateQueries({ queryKey: ['instances'] })
      window.location.href = `/instances/${data.instanceId}`
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not start workflow'),
  })

  return (
    <Shell title="Workflow dashboard">
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--steel)] mb-2">Available definitions</h2>
        <p className="text-sm text-[var(--steel)]/75 mb-4">
          Server-driven definitions from procedure charts. UI never chooses the next node.
        </p>
        {workflows.isLoading && <p>Loading workflows…</p>}
        {workflows.isError && <p className="text-[var(--danger)]">Failed to load workflows.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {(workflows.data || []).map((w) => (
            <div key={w.id} className="border border-[var(--line)] bg-[var(--panel)] p-4 flex justify-between gap-3">
              <div>
                <div className="font-semibold">{w.name}</div>
                <div className="text-xs text-[var(--steel)]/70">{w.key} · v{w.version}</div>
              </div>
              <button
                type="button"
                className="self-start bg-[var(--accent)] text-white px-3 py-1.5 text-sm"
                disabled={start.isPending}
                onClick={() => start.mutate({ key: w.key })}
              >
                Start
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--steel)] mb-2">Instances</h2>
        {instances.isLoading && <p>Loading instances…</p>}
        {instances.isError && <p className="text-[var(--danger)]">Failed to load instances.</p>}
        {!instances.isLoading && (instances.data || []).length === 0 && (
          <p className="text-sm text-[var(--steel)]/70">No instances yet. Start a workflow above.</p>
        )}
        <ul className="space-y-2">
          {(instances.data || []).map((i) => (
            <li key={i.instanceId}>
              <Link
                to={`/instances/${i.instanceId}`}
                className="block border border-[var(--line)] bg-white/70 px-4 py-3 no-underline text-[var(--ink)] hover:border-[var(--accent)] transition-colors"
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="font-medium">{i.workflowName}</div>
                    <div className="text-xs text-[var(--steel)]/70">
                      {i.businessKey || i.instanceId} · now at {i.currentNode?.label}
                    </div>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-[var(--steel)]">{i.status}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  )
}
