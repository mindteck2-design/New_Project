import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchInstances } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
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
          title="Instances"
          description="Search, filter, chart, and export operational workflow history."
          backTo="/"
          backLabel="Dashboard"
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Instances' },
          ]}
          actions={
            <Button asChild size="sm" variant="outline">
              <Link to="/workflows">Start workflow</Link>
            </Button>
          }
        />

        {instances.isLoading && (
          <p className="text-sm text-muted-foreground">Loading instances…</p>
        )}
        {instances.isError && (
          <p className="text-sm text-destructive">Could not load instances.</p>
        )}
        {!instances.isLoading && !instances.isError && (
          <InstanceInsights instances={rows} />
        )}
      </PageFrame>
    </Shell>
  )
}
