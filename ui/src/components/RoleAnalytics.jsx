import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { fetchRoleAnalytics } from '@/api/client'
import { useAuth } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/lib/demoUsers'

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

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Role analytics
          </CardTitle>
          <CardDescription>
            Curated KPIs for {(roles[0] && (ROLE_LABELS[roles[0]] || roles[0])) || 'your roles'}.
          </CardDescription>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {roles.map((r) => (
            <Badge key={r} variant="secondary">
              {ROLE_LABELS[r] || r}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {analytics.isLoading && (
          <p className="text-sm text-muted-foreground">Loading role metrics…</p>
        )}
        {analytics.isError && (
          <p className="text-sm text-destructive">Could not load analytics.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.metrics || []).map((m) => (
            <Card key={m.key} className="border-dashed">
              <CardContent className="space-y-1 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{m.label}</div>
                <div className="text-2xl font-semibold tabular-nums">{m.value}</div>
                {m.hint && <p className="text-xs text-muted-foreground">{m.hint}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
