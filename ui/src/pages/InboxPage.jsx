import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { actionableNotifications, fetchInstances } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { useAuth } from '@/stores/authStore'
import { guidanceForRoles } from '@/lib/roleGuidance'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import RoleWorkBriefing from '@/components/RoleWorkBriefing'
import PendingWorkQueue from '@/components/PendingWorkQueue'
import { Badge } from '@/components/ui/badge'

export default function InboxPage() {
  const { user } = useAuth()
  const instances = useQuery({ queryKey: queryKeys.instances.all(user?.id), queryFn: fetchInstances })

  const inbox = useMemo(
    () => actionableNotifications(instances.data || [], user),
    [instances.data, user],
  )

  const briefs = guidanceForRoles(user?.roles || [])

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="Action inbox"
          description="Role-grouped review queue — open a row to continue at the current server-driven step."
          backTo="/"
          backLabel="Dashboard"
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Action inbox' },
          ]}
          actions={
            <Badge variant={inbox.length ? 'default' : 'secondary'} className="tabular-nums">
              {inbox.length} waiting
            </Badge>
          }
        />

        <RoleWorkBriefing user={user} pendingCount={inbox.length} />

        {briefs.length > 1 && (
          <p className="text-xs text-muted-foreground">
            You hold {briefs.length} roles. Pending work is grouped below so each charge stays
            distinct.
          </p>
        )}

        <PendingWorkQueue
          user={user}
          items={inbox}
          loading={instances.isLoading}
          heading="Pending actions by role"
        />
      </PageFrame>
    </Shell>
  )
}
