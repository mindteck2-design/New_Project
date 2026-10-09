import { Link, useLocation } from 'react-router-dom'
import { LogOut, Workflow } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import NotificationCenter from '@/components/NotificationCenter'
import RoleUserSwitcher from '@/components/RoleUserSwitcher'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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
  const initials = (user?.displayName || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" className="group flex items-center gap-2.5 no-underline">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105">
                <Workflow className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold tracking-tight text-foreground">AMMS</div>
                <div className="text-[11px] text-muted-foreground">Workflow Engine</div>
              </div>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                to="/"
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  location.pathname === '/'
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Dashboard
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden lg:block">
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
                <div className="px-2 py-2 lg:hidden">
                  <RoleUserSwitcher />
                </div>
                <DropdownMenuSeparator className="lg:hidden" />
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
            {title && <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>}
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
  )
}
