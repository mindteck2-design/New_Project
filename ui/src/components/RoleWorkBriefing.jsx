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
export default function RoleWorkBriefing({ user, pendingCount = 0 }) {
  const roles = user?.roles || []
  const briefs = guidanceForRoles(roles)
  const primary = primaryRoleGuidance(roles)
  const headline = briefingHeadline(user, pendingCount)

  return (
    <section
      aria-labelledby="role-briefing-heading"
      className="relative overflow-hidden rounded-xl border bg-card"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_280px_at_0%_0%,rgba(15,118,110,0.10),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.9),transparent)]"
      />
      <div className="relative grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr] lg:gap-10">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-normal">
              Your briefing
            </Badge>
            {roles.map((r) => (
              <Badge key={r} variant="outline">
                {ROLE_LABELS[r] || r}
              </Badge>
            ))}
          </div>

          <div>
            <h2
              id="role-briefing-heading"
              className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
            >
              {headline}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {primary?.charge ||
                'Complete steps assigned to your active roles. The workflow engine selects the next node — you only act when the current step requires you.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {pendingCount > 0 ? (
              <Button asChild>
                <Link to="/inbox">
                  <ListChecks className="h-3.5 w-3.5" />
                  Review {pendingCount} pending
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              primary?.primaryWhenClear && (
                <Button asChild>
                  <Link to={primary.primaryWhenClear.to}>
                    {primary.primaryWhenClear.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )
            )}
            <Button asChild variant="outline">
              <Link to="/inbox">Action inbox</Link>
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-3 border-t pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            What you own
          </p>
          {briefs.length === 0 && (
            <p className="text-sm text-muted-foreground">No roles on this session.</p>
          )}
          {briefs.map((b) => (
            <div key={b.code} className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">{b.title}</p>
              <ul className="space-y-1">
                {(b.typicalDuties || []).slice(0, 3).map((duty) => (
                  <li
                    key={duty}
                    className="flex gap-2 text-xs leading-relaxed text-muted-foreground sm:text-[13px]"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/70"
                    />
                    <span>{duty}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
