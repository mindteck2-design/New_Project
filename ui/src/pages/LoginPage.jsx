import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { Workflow } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { DEMO_USERS } from '@/lib/demoUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: 'admin',
      password: 'Passw0rd!',
    },
  })

  async function onSubmit(values) {
    try {
      await login(values.username, values.password)
      toast.success('Welcome back')
      navigate('/')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,118,110,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(24,24,27,0.06),transparent_35%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="hidden lg:block"
        >
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Workflow className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">AMMS</h1>
          <p className="mt-3 max-w-md text-base text-muted-foreground">
            Overhaul Division workflow control — role-gated steps, decision graphs, and a living audit trail.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-xl border bg-card/70 px-4 py-3 backdrop-blur">Server-driven next steps</div>
            <div className="rounded-xl border bg-card/70 px-4 py-3 backdrop-blur">Clickable action notifications</div>
            <div className="rounded-xl border bg-card/70 px-4 py-3 backdrop-blur">XY workflow charts per definition</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <Card className="mx-auto w-full max-w-md border-border/70">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Select a demo role/user or enter credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label>Quick select user</Label>
                  <Controller
                    name="username"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v)
                          setValue('password', 'Passw0rd!')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose user" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEMO_USERS.map((u) => (
                            <SelectItem key={u.username} value={u.username}>
                              {u.displayName} · {u.roles.join(', ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    aria-invalid={!!errors.username}
                    {...register('username')}
                  />
                  {errors.username && (
                    <p className="text-xs text-destructive">{errors.username.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in…' : 'Continue'}
                </Button>
              </form>
              <p className="hal-watermark mt-6 text-center">Property of HAL — Restricted</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
