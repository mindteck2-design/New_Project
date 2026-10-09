import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import RoleAnalytics from '@/components/RoleAnalytics'

export default function AnalyticsPage() {
  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="Role analytics"
          description="KPIs curated for your active roles — workload, completions, and waiting steps."
          backTo="/"
          backLabel="Dashboard"
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Analytics' },
          ]}
        />
        <RoleAnalytics />
      </PageFrame>
    </Shell>
  )
}
