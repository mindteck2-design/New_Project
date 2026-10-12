import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'
import { fetchInstances } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { NAV_LABELS } from '@/lib/navConfig'
import { useAuth } from '@/stores/authStore'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import InstanceInsights from '@/components/InstanceInsights'
import { Button } from '@/components/ui/button'

export default function InstancesPage() {
  const { user } = useAuth()
  const instances = useQuery({ queryKey: queryKeys.instances.all(user?.id), queryFn: fetchInstances })
  const rows = instances.data || []

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title={NAV_LABELS.runs}
          description="Track active and completed maintenance stage executions — filter, chart, and export history."
          backTo="/"
          backLabel={NAV_LABELS.dashboard}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.runs },
          ]}
          actions={
            <Button asChild size="sm" variant="outline">
              <Link to="/packages">
                <Package className="h-3.5 w-3.5" />
                {NAV_LABELS.packages}
              </Link>
            </Button>
          }
        />

        {instances.isLoading && (
          <p className="text-sm text-muted-foreground">Loading maintenance runs…</p>
        )}
        {instances.isError && (
          <p className="text-sm text-destructive">Could not load maintenance runs.</p>
        )}
        {!instances.isLoading && !instances.isError && (
          <InstanceInsights instances={rows} />
        )}
      </PageFrame>
    </Shell>
  )
}
