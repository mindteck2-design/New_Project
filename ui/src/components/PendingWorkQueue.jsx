import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  groupPendingByRole,
  primaryRoleGuidance,
  reasonForPendingItem,
} from '@/lib/roleGuidance'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

/**
 * Role-grouped review queue — each row states why it is waiting on the user.
 */
export default function PendingWorkQueue({
  user,
  items = [],
  loading = false,
  limit,
  showEmptyGuidance = true,
  heading = 'Pending on your roles',
}) {
  const navigate = useNavigate()
  const visible = typeof limit === 'number' ? items.slice(0, limit) : items
  const groups = groupPendingByRole(visible)
  const primary = primaryRoleGuidance(user?.roles || [])

  return (
    <section aria-labelledby="pending-queue-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="pending-queue-heading" className="text-sm font-semibold tracking-tight">
            {heading}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Only steps whose current node requires your role appear here.
          </p>
        </div>
        <Badge variant={items.length ? 'default' : 'secondary'} className="tabular-nums">
          {items.length} waiting
        </Badge>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {loading && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground" role="status">
            Loading your pending steps…
          </p>
        )}

        {!loading && items.length === 0 && showEmptyGuidance && (
          <div className="space-y-3 px-5 py-8 text-center sm:px-8">
            <p className="text-sm font-medium text-foreground">Queue clear</p>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-foreground">
              {primary?.whenClear ||
                'No running instances currently require your roles. Start a workflow or switch user if you expected work.'}
            </p>
            {primary?.primaryWhenClear && (
              <Button asChild size="sm" variant="outline">
                <Link to={primary.primaryWhenClear.to}>{primary.primaryWhenClear.label}</Link>
              </Button>
            )}
          </div>
        )}

        {!loading &&
          groups.map((group) => (
            <div key={group.code} className="border-b last:border-b-0">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                    {group.label}
                  </p>
                  {group.guidance?.charge && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {group.guidance.charge}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="tabular-nums">
                  {group.items.length}
                </Badge>
              </div>
              <div className="divide-y">
                {group.items.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-between gap-3 rounded-none px-4 py-3.5 text-left font-normal hover:bg-muted/50"
                    onClick={() => navigate(item.href)}
                  >
                    <span className="min-w-0 space-y-0.5">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                      <span className="block text-[11px] text-primary/90">
                        {reasonForPendingItem(item)}
                        {item.type ? ` · ${item.type}` : ''}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          ))}
      </div>
    </section>
  )
}
