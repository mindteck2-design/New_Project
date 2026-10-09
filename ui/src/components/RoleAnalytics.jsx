import { useQuery } from '@tanstack/react-query'
import { fetchRoleAnalytics } from '@/api/client'
import { useAuth } from '@/stores/authStore'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/lib/demoUsers'

/** Flat KPI strip — no nested cards. */
export default function RoleAnalytics() {
  const { user } = useAuth()
  const analytics = useQuery({
    queryKey: ['analytics-me', user?.id],
    queryFn: fetchRoleAnalytics,
    enabled: !!user,
    refetchInterval: 15000,
  })

  const data = analytics.data
  const roles = data?.roles || user?.roles || []
  const metrics = data?.metrics || []

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {roles.map((r) => (
          <Badge key={r} variant="secondary" className="font-normal">
            {ROLE_LABELS[r] || r}
          </Badge>
        ))}
        {analytics.isLoading && (
          <span className="text-xs text-muted-foreground">Loading metrics…</span>
        )}
        {analytics.isError && (
          <span className="text-xs text-destructive">Could not load analytics.</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-6">
        {metrics.length === 0 && !analytics.isLoading && (
          <div className="col-span-full bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            No role metrics for the current session.
          </div>
        )}
        {metrics.map((m) => (
          <div key={m.key} className="bg-card px-4 py-3.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {m.label}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{m.value}</div>
            {m.hint && <p className="mt-0.5 text-xs text-muted-foreground">{m.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
