import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, ChevronRight, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { actionableNotifications, fetchInstances } from '@/api/client'
import { useAuth } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ROLE_LABELS } from '@/lib/demoUsers'

function noteKey(userId, item) {
  return `${userId}:${item.instanceId}:${item.title}`
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const seenRef = useRef(new Set())
  const primedRef = useRef(false)

  const { data: instances = [] } = useQuery({
    queryKey: ['instances', user?.id],
    queryFn: fetchInstances,
    enabled: !!user,
    refetchInterval: 8000,
  })

  const items = useMemo(() => actionableNotifications(instances, user), [instances, user])

  useEffect(() => {
    primedRef.current = false
    seenRef.current = new Set()
  }, [user?.id])

  useEffect(() => {
    if (!user) return

    if (!primedRef.current) {
      items.forEach((item) => seenRef.current.add(noteKey(user.id, item)))
      primedRef.current = true
      return
    }

    for (const item of items) {
      const key = noteKey(user.id, item)
      if (seenRef.current.has(key)) continue
      seenRef.current.add(key)
      toast.message(item.title, {
        description: `${item.description} — click to open your action`,
        action: {
          label: 'Open',
          onClick: () => navigate(item.href),
        },
        onClick: () => navigate(item.href),
        duration: 7000,
      })
    }
  }, [items, user, navigate])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {items.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground animate-pulse">
              {items.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Your actions</span>
          <Badge variant="secondary">{items.length}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing waiting on your role right now.
          </div>
        )}
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="flex cursor-pointer flex-col items-stretch gap-1 py-3"
            onSelect={() => navigate(item.href)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <ClipboardCheck className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium leading-snug">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                  {item.roleCode && (
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      Requires {ROLE_LABELS[item.roleCode] || item.roleCode}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
