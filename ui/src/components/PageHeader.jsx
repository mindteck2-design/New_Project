import { Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Enterprise page chrome: optional Back + breadcrumbs + title row.
 * breadcrumbs: [{ label, to? }] — last item is current (no link).
 */
export default function PageHeader({
  title,
  description,
  breadcrumbs = [],
  backTo,
  backLabel = 'Back',
  actions,
  className,
}) {
  const navigate = useNavigate()

  return (
    <div className={cn('mb-5 space-y-3 border-b border-border/70 pb-4', className)}>
      {(backTo || breadcrumbs.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {backTo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => (typeof backTo === 'number' ? navigate(backTo) : navigate(backTo))}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Button>
          )}
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
        </div>
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
