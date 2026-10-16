import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, ChevronRight, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  actionableNotifications,
  fetchInstances,
  fetchNotifications,
  markNotificationRead,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
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
  const queryClient = useQueryClient()
  const seenRef = useRef(new Set())
  const primedRef = useRef(false)

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
      }))
  }, [notifications.data])

  const derived = useMemo(
    () => actionableNotifications(instances.data || [], user),
    [instances.data, user],
  )

  const hasPersistedNotifications = (notifications.data || []).length > 0
  const items = hasPersistedNotifications ? persisted : derived
  const unreadCount = hasPersistedNotifications ? persisted.length : derived.length

  const markAllRead = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        persisted.map((notification) => markNotificationRead(notification.id)),
      )
      return results.map((result, index) => ({
        id: persisted[index].id,
        success: result.status === 'fulfilled',
      }))
    },
    onSuccess: (results) => {
      const successfulIds = new Set(
        results.filter((result) => result.success).map((result) => result.id),
      )
      const queryKey = queryKeys.notifications.all(user?.id)
      queryClient.setQueryData(queryKey, (current) =>
        (current || []).map((notification) =>
          successfulIds.has(notification.id) ? { ...notification, read: true } : notification,
        ),
      )
      queryClient.invalidateQueries({ queryKey })

      const failedCount = results.length - successfulIds.size
      if (failedCount > 0) {
        toast.error(`${failedCount} notification${failedCount === 1 ? '' : 's'} could not be marked as read.`)
      } else if (results.length > 0) {
        toast.success('All notifications marked as read.')
      }
    },
    onError: () => toast.error('Could not mark notifications as read.'),
  })

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
            navigate(item.href)
          },
        },
        duration: 7000,
      })
    }
  }, [items, user, navigate])

  function openItem(item) {
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
      <DropdownMenuContent
        align="end"
        className="flex max-h-[min(70vh,32rem)] w-80 flex-col overflow-hidden p-0"
      >
        <DropdownMenuLabel className="flex shrink-0 items-center justify-between px-3 py-2">
          <span>Your actions</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{unreadCount}</Badge>
            {persisted.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-xs"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {markAllRead.isPending ? 'Marking…' : 'Mark all as read'}
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0 shrink-0" />
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nothing waiting on your role right now.
            </div>
          )}
          {items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex cursor-pointer flex-col items-stretch gap-1 px-3 py-2.5"
              onSelect={() => openItem(item)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
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
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
