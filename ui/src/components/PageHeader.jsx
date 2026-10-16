import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Enterprise page chrome: breadcrumbs + title row.
 * breadcrumbs: [{ label, to? }] — last item is current (no link).
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  className,
}) {
  return (
    <div className={cn('mb-5 space-y-3 border-b border-border/70 pb-4', className)}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, idx) => {
            const last = idx === breadcrumbs.length - 1
            return (
              <Fragment key={`${crumb.label}-${idx}`}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                {last || !crumb.to ? (
                  <span
                    className={cn(
                      'truncate',
                      last ? 'font-medium text-foreground' : 'text-muted-foreground',
                    )}
                    aria-current={last ? 'page' : undefined}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="truncate text-muted-foreground no-underline transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </Fragment>
            )
          })}
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          {title && (
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          )}
          {description && (
            <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
