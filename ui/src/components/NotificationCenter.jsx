import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronRight, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  actionableNotifications,
  fetchInstances,
  fetchNotifications,
  markNotificationRead,
} from '@/api/client'
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
  return `${userId}:${item.id}`
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const seenRef = useRef(new Set())
  const primedRef = useRef(false)

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

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const persisted = useMemo(() => {
    return (notifications.data || [])
      .filter((n) => !n.read)
      .map((n) => ({
        id: n.id,
        instanceId: n.instanceId,
        title: n.title,
        description: n.body || '',
        roleCode: n.targetRole,
        href: n.actionPath || `/instances/${n.instanceId}`,
        persisted: true,
      }))
  }, [notifications.data])

  const derived = useMemo(
    () => actionableNotifications(instances.data || [], user),
    [instances.data, user],
  )

  // Prefer durable notifications; fall back to derived inbox when none yet
  const items = persisted.length > 0 ? persisted : derived
  const unreadCount = persisted.length > 0
    ? persisted.length
    : derived.length

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
        description: `${item.description || 'Action required'} — open to continue`,
        action: {
          label: 'Open',
          onClick: () => {
            if (item.persisted) markRead.mutate(item.id)
            navigate(item.href)
          },
        },
        duration: 7000,
      })
    }
  }, [items, user, navigate, markRead])

  function openItem(item) {
    if (item.persisted) {
      markRead.mutate(item.id)
    }
    navigate(item.href)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Your actions</span>
          <Badge variant="secondary">{unreadCount}</Badge>
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
            onSelect={() => openItem(item)}
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
