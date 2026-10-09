import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/stores/authStore'
import { DEMO_USERS, ROLE_LABELS } from '@/lib/demoUsers'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export default function RoleUserSwitcher({ compact = false }) {
  const { user, switchUser, switching } = useAuth()

  async function onChange(username) {
    if (!username || username === user?.username) return
    try {
      const data = await switchUser(username)
      toast.success(`Switched to ${data.user.displayName}`, {
        description: (data.user.roles || []).map((r) => ROLE_LABELS[r] || r).join(' · '),
      })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not switch user')
    }
  }

  return (
    <div className={compact ? 'flex items-center gap-2' : 'space-y-2'}>
      {!compact && (
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Act as user / role
        </div>
      )}
      <Select value={user?.username || ''} onValueChange={onChange} disabled={switching}>
        <SelectTrigger className={compact ? 'w-[220px]' : 'w-full'}>
          <SelectValue placeholder="Select user" />
        </SelectTrigger>
        <SelectContent>
          {DEMO_USERS.map((u) => (
            <SelectItem key={u.username} value={u.username}>
              <span className="flex flex-col text-left">
                <span>{u.displayName}</span>
                <span className="text-[11px] text-muted-foreground">
                  {u.roles.map((r) => ROLE_LABELS[r] || r).join(', ')}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {user && !compact && (
        <div className="flex flex-wrap gap-1.5">
          {(user.roles || []).map((r) => (
            <Badge key={r} variant="default">{ROLE_LABELS[r] || r}</Badge>
          ))}
        </div>
      )}
      {switching && (
        <Button variant="ghost" size="sm" disabled>
          Switching…
        </Button>
      )}
    </div>
  )
}
