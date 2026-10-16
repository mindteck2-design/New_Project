import { Link } from 'react-router-dom'
import { ArrowRight, ListChecks } from 'lucide-react'
import {
  briefingHeadline,
  guidanceForRoles,
  primaryRoleGuidance,
} from '@/lib/roleGuidance'
import { ROLE_LABELS } from '@/lib/demoUsers'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Post-login curated briefing — tells the operator what their roles own
 * and what to do next without searching the app.
 */
export default function RoleWorkBriefing({
  user,
  pendingCount = 0,
  showResponsibilities = true,
}) {
  const roles = user?.roles || []
  const briefs = guidanceForRoles(roles)
  const primary = primaryRoleGuidance(roles)
  const headline = briefingHeadline(user, pendingCount)

  return (
    <section
      aria-labelledby="role-briefing-heading"
      className="overflow-hidden rounded-lg border bg-card"
    >
      <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="font-normal">Today</Badge>
            {roles.map((role) => (
              <Badge key={role} variant="outline" className="font-normal">
                {ROLE_LABELS[role] || role}
              </Badge>
            ))}
          </div>
          <h2 id="role-briefing-heading" className="text-base font-semibold tracking-tight text-foreground">
            {headline}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {primary?.charge ||
              'Complete steps assigned to your active roles. The workflow engine selects the next node — you only act when the current step requires you.'}
          </p>
        </div>
        {pendingCount > 0 ? (
          <Button asChild size="sm" className="shrink-0">
            <Link to="/inbox">
              <ListChecks className="h-3.5 w-3.5" />
              Review {pendingCount} pending
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : primary?.primaryWhenClear ? (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to={primary.primaryWhenClear.to}>
              {primary.primaryWhenClear.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </div>

      {showResponsibilities && (
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Role responsibilities
            </h3>
            {briefs.length > 0 && (
              <span className="text-[11px] text-muted-foreground">{briefs.length} assigned</span>
            )}
          </div>
          {briefs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No roles on this session.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {briefs.map((brief) => (
                <div key={brief.code} className="rounded-md border bg-background/70 px-3 py-2">
                  <p className="mb-1 text-xs font-medium text-foreground">{brief.title}</p>
                  <ul className="space-y-1">
                    {(brief.typicalDuties || []).slice(0, 3).map((duty) => (
                      <li key={duty} className="flex gap-1.5 text-xs leading-snug text-muted-foreground">
                        <span aria-hidden className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                        <span>{duty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
