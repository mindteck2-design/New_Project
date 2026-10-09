import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  FileStack,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Package,
  Play,
  Workflow,
} from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ROLE_LABELS } from '@/lib/demoUsers'

const STORAGE_KEY = 'amms.sidebar.collapsed'

const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        to: '/',
        label: 'Dashboard',
        icon: LayoutDashboard,
        match: (pathname) => pathname === '/',
      },
      {
        id: 'analytics',
        to: '/analytics',
        label: 'Analytics',
        icon: BarChart3,
        match: (pathname) => pathname.startsWith('/analytics'),
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'inbox',
        to: '/inbox',
        label: 'Action inbox',
        icon: Bell,
        badge: true,
        match: (pathname) => pathname.startsWith('/inbox'),
      },
      {
        id: 'packages',
        to: '/packages',
        label: 'Work packages',
        icon: Package,
        match: (pathname) => pathname === '/packages' || pathname.startsWith('/packages/'),
      },
      {
        id: 'workflows',
        to: '/workflows',
        label: 'Workflows',
        icon: Play,
        match: (pathname) => pathname === '/workflows' || pathname.startsWith('/workflows/'),
      },
      {
        id: 'process',
        to: '/process',
        label: 'Process map',
        icon: GitBranch,
        match: (pathname) => pathname.startsWith('/process'),
      },
      {
        id: 'instances',
        to: '/instances',
        label: 'Instances',
        icon: ClipboardList,
        match: (pathname) => pathname.startsWith('/instances'),
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      {
        id: 'master-forms',
        to: '/forms',
        label: 'Master forms',
        icon: FileStack,
        match: (pathname) => pathname === '/forms' || pathname.startsWith('/forms/'),
      },
    ],
  },
]

function NavItem({ item, collapsed, active, unreadCount, onNavigate }) {
  const Icon = item.icon
  const showBadge = item.badge && unreadCount > 0

  const content = (
    <Button
      asChild
      variant={active ? 'secondary' : 'ghost'}
      className={cn(
        'h-9 w-full gap-2.5 px-2.5 font-normal',
        collapsed ? 'justify-center px-0' : 'justify-start',
        active && 'bg-accent text-accent-foreground',
      )}
    >
      <Link to={item.to} onClick={() => onNavigate?.()} aria-current={active ? 'page' : undefined}>
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left text-sm">{item.label}</span>
            {showBadge && (
              <Badge className="h-5 min-w-5 justify-center px-1 text-[10px]">{unreadCount}</Badge>
            )}
          </>
        )}
        {collapsed && showBadge && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        )}
      </Link>
    </Button>
  )

  if (!collapsed) return <div className="relative">{content}</div>

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div className="relative">{content}</div>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        {item.label}
        {showBadge && <Badge className="h-5 px-1.5 text-[10px]">{unreadCount}</Badge>}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Persistent app navigation rail — React Router links (no hash scrolling).
 */
export default function AppSidebar({
  className,
  onNavigate,
  unreadCount = 0,
  collapsed: collapsedProp,
  onCollapsedChange,
  showCollapseToggle = true,
}) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const roles = user?.roles || []

  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  const controlled = typeof collapsedProp === 'boolean'
  const collapsed = controlled ? collapsedProp : internalCollapsed

  function setCollapsed(next) {
    if (!controlled) {
      setInternalCollapsed(next)
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
    }
    onCollapsedChange?.(next)
  }

  const initials = (user?.displayName || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-card transition-[width] duration-200 ease-out',
          collapsed ? 'w-[4.25rem]' : 'w-64',
          className,
        )}
        data-collapsed={collapsed || undefined}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-border',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-4',
          )}
        >
          <Link
            to="/"
            onClick={() => onNavigate?.()}
            className={cn(
              'flex min-w-0 items-center no-underline',
              collapsed ? 'justify-center' : 'gap-2.5',
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Workflow className="h-4 w-4" />
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold leading-none tracking-tight text-foreground">
                  AMMS
                </div>
                <div className="mt-1 truncate text-[10px] text-muted-foreground">
                  Workflow Engine
                </div>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.id} className={cn(gi > 0 && 'mt-4')}>
              {!collapsed ? (
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              ) : (
                gi > 0 && <Separator className="mx-auto mb-3 w-6" />
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    collapsed={collapsed}
                    active={item.match(location.pathname)}
                    unreadCount={unreadCount}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-border">
          {!collapsed && roles.length > 0 && (
            <div className="px-3 pt-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Active roles
              </p>
              <div className="flex flex-wrap gap-1">
                {roles.slice(0, 4).map((r) => (
                  <Badge key={r} variant="outline" className="text-[10px] font-normal">
                    {ROLE_LABELS[r] || r}
                  </Badge>
                ))}
                {roles.length > 4 && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    +{roles.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className={cn('flex items-center gap-2 p-2', collapsed && 'flex-col')}>
            {!collapsed ? (
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{user?.displayName}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{user?.username}</div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="Sign out"
                      onClick={() => {
                        logout()
                        window.location.href = '/login'
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Sign out</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    aria-label="Sign out"
                    onClick={() => {
                      logout()
                      window.location.href = '/login'
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            )}

            {showCollapseToggle && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8 shrink-0', collapsed && 'h-9 w-9')}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    {collapsed ? (
                      <ChevronsRight className="h-4 w-4" />
                    ) : (
                      <ChevronsLeft className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {collapsed ? 'Expand' : 'Collapse'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

        </div>
      </aside>
    </TooltipProvider>
  )
}
