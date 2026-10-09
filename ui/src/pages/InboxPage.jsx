import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { actionableNotifications, fetchInstances } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useAuth } from '@/stores/authStore'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function InboxPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const instances = useQuery({ queryKey: queryKeys.instances.all(user?.id), queryFn: fetchInstances })

  const inbox = useMemo(
    () => actionableNotifications(instances.data || [], user),
    [instances.data, user],
  )

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="Action inbox"
          description="Steps waiting on your roles. Open an item to continue the workflow at the current node."
          backTo="/"
          backLabel="Dashboard"
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Action inbox' },
          ]}
          actions={<Badge variant={inbox.length ? 'default' : 'secondary'}>{inbox.length} waiting</Badge>}
        />

        <div className="divide-y rounded-lg border bg-card">
          {instances.isLoading && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading inbox…</p>
          )}
          {!instances.isLoading && inbox.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No steps waiting on {(user?.roles || []).join(', ') || 'your roles'}.
            </p>
          )}
          {inbox.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              className="h-auto w-full justify-between gap-3 rounded-none px-4 py-3.5 text-left font-normal hover:bg-muted/50"
              onClick={() => navigate(item.href)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          ))}
        </div>
      </PageFrame>
    </Shell>
  )
}
