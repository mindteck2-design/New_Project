import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import {
  actionableNotifications,
  fetchInstances,
  fetchNotifications,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import AppSidebar from '@/components/AppSidebar'
import NotificationCenter from '@/components/NotificationCenter'
import RoleUserSwitcher from '@/components/RoleUserSwitcher'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STORAGE_KEY = 'amms.sidebar.collapsed'

/**
 * App chrome: persistent sidebar rail + fluid main stage.
 * Pages own titles/breadcrumbs via PageHeader.
 */
export default function Shell({ children }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const instances = useQuery({
    queryKey: queryKeys.instances.all(user?.id),
    queryFn: fetchInstances,
    enabled: !!user,
    refetchInterval: 8000,
  })
  const notifications = useQuery({
    queryKey: queryKeys.notifications.all(user?.id),
    queryFn: fetchNotifications,
    enabled: !!user,
    refetchInterval: 8000,
  })

  const unreadCount = useMemo(() => {
    const persisted = (notifications.data || []).filter((n) => !n.read)
    if (persisted.length > 0) return persisted.length
    return actionableNotifications(instances.data || [], user).length
  }, [notifications.data, instances.data, user])

  const initials = (user?.displayName || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex h-svh min-h-0 overflow-hidden bg-background">
      {/* Desktop / tablet sidebar — always visible from md */}
      <div className="hidden h-full shrink-0 md:flex">
        <AppSidebar
          unreadCount={unreadCount}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
        />
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 sm:max-w-[18rem]">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>AMMS primary navigation</SheetDescription>
          </SheetHeader>
          <AppSidebar
            className="w-full border-r-0"
            unreadCount={unreadCount}
            collapsed={false}
            showCollapseToggle={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 md:hidden"
              aria-label="Open sidebar"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0 md:hidden">
              <div className="truncate text-sm font-semibold">AMMS</div>
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm font-medium text-muted-foreground">
                Overhaul Division · Dynamic Workflow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <div className="hidden md:block">
                <RoleUserSwitcher compact />
              </div>
            )}
            <NotificationCenter />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 rounded-full px-1.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[140px] truncate text-sm font-medium lg:inline">
                    {user?.displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="font-medium">{user?.displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user?.username}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {import.meta.env.DEV && (
                  <>
                    <div className="px-2 py-2 md:hidden">
                      <RoleUserSwitcher />
                    </div>
                    <DropdownMenuSeparator className="md:hidden" />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/change-password">
                    <KeyRound className="h-4 w-4" />
                    Change password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    logout()
                    window.location.href = '/login'
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          key={location.pathname}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 lg:px-8"
        >
          {children}
        </main>

        <footer className="flex h-9 shrink-0 items-center justify-end border-t border-border bg-card px-4 text-[10px] sm:px-6">
          <span className="text-muted-foreground">AS 9110 C–aligned audit trail</span>
        </footer>
      </div>
    </div>
  )
}
