import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import {
  actionableNotifications,
  fetchInstances,
  fetchNotifications,
} from '@/api/client'
import AppSidebar from '@/components/AppSidebar'
import NotificationCenter from '@/components/NotificationCenter'
import RoleUserSwitcher from '@/components/RoleUserSwitcher'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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

export default function Shell({ children, title, subtitle }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const instances = useQuery({
    queryKey: ['instances', user?.id],
    queryFn: fetchInstances,
    enabled: !!user,
    refetchInterval: 8000,
  })
  const notifications = useQuery({
    queryKey: ['notifications', user?.id],
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
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <AppSidebar unreadCount={unreadCount} />
      </div>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>AMMS primary navigation</SheetDescription>
          </SheetHeader>
          <AppSidebar unreadCount={unreadCount} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border/80 bg-card/80 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open sidebar"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div className="min-w-0 lg:hidden">
                <div className="truncate text-sm font-semibold">AMMS</div>
                <div className="text-[11px] text-muted-foreground">Workflow Engine</div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:block">
                <RoleUserSwitcher compact />
              </div>
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 gap-2 rounded-full px-1.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
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
                  <div className="px-2 py-2 md:hidden">
                    <RoleUserSwitcher />
                  </div>
                  <DropdownMenuSeparator className="md:hidden" />
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
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && (
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              )}
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          <div key={location.pathname}>{children}</div>
        </main>

        <footer className="border-t border-border/80 bg-card/60">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <p className="hal-watermark">Property of HAL — Restricted</p>
            <p className="text-[11px] text-muted-foreground">AS 9110 C–aligned audit trail</p>
          </div>
          <Separator />
        </footer>
      </div>
    </div>
  )
}
