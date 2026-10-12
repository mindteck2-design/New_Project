import { NAV_LABELS } from '@/lib/navConfig'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import RoleAnalytics from '@/components/RoleAnalytics'

export default function AnalyticsPage() {
  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title={NAV_LABELS.analytics}
          description="Maintenance KPIs for your roles — workload, completions, and stages waiting on you."
          backTo="/"
          backLabel={NAV_LABELS.dashboard}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.analytics },
          ]}
        />
        <RoleAnalytics />
      </PageFrame>
    </Shell>
  )
}
