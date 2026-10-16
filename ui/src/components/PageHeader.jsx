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
    <div className={cn('space-y-2 border-b border-border/70 pb-3', className)}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          {title && (
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
          )}
          {description && (
            <p className="max-w-3xl text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
