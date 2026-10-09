import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  ClipboardList,
  LayoutDashboard,
  Shield,
  Workflow,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ROLE_LABELS } from '@/lib/demoUsers'

const NAV = [
  {
    to: '/',
    label: 'Workflow dashboard',
    description: 'Inbox, charts, instances',
    icon: LayoutDashboard,
    match: (path) => path === '/',
  },
  {
    to: '/#analytics',
    label: 'Role analytics',
    description: 'KPIs curated for your role',
    icon: BarChart3,
    match: () => false,
  },
  {
    to: '/#inbox',
    label: 'Action inbox',
    description: 'Steps waiting on you',
    icon: Bell,
    match: () => false,
  },
  {
    to: '/#workflows',
    label: 'Definitions',
    description: 'Start seeded processes',
    icon: ClipboardList,
    match: () => false,
  },
]

export default function AppSidebar({ className, onNavigate, unreadCount = 0 }) {
  const location = useLocation()
  const { user } = useAuth()
  const roles = user?.roles || []

  function handleNav(to) {
    onNavigate?.()
    if (to.includes('#')) {
      const hash = to.split('#')[1]
      // Allow route change to land, then scroll
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 50)
    }
  }

  return (
    <aside
      className={cn(
        'flex h-full w-64 flex-col border-r border-border/80 bg-card/95 backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Workflow className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-semibold tracking-tight">AMMS</div>
          <div className="text-[11px] text-muted-foreground">Workflow Engine</div>
        </div>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Navigate
        </p>
        {NAV.map((item) => {
          const Icon = item.icon
          const active = item.match(location.pathname)
          return (
            <Button
              key={item.to}
              asChild
              variant={active ? 'secondary' : 'ghost'}
              className={cn(
                'h-auto w-full justify-start gap-3 px-3 py-2.5 text-left font-normal',
                active && 'bg-accent text-accent-foreground',
              )}
            >
              <Link to={item.to.startsWith('/#') ? '/' : item.to} onClick={() => handleNav(item.to)}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="block text-sm font-medium">{item.label}</span>
                    {item.to.includes('inbox') && unreadCount > 0 && (
                      <Badge className="h-5 px-1.5 text-[10px]">{unreadCount}</Badge>
                    )}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">{item.description}</span>
                </span>
              </Link>
            </Button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t p-4">
        <div className="flex items-start gap-2 rounded-xl border bg-muted/30 p-3">
          <Shield className="mt-0.5 h-4 w-4 text-primary" />
          <div className="min-w-0">
            <div className="text-xs font-medium">Active roles</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {roles.length === 0 && (
                <span className="text-[11px] text-muted-foreground">No roles</span>
              )}
              {roles.map((r) => (
                <Badge key={r} variant="outline" className="text-[10px]">
                  {ROLE_LABELS[r] || r}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground hal-watermark">
          Property of HAL
        </p>
      </div>
    </aside>
  )
}
