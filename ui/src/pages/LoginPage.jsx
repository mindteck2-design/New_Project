import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Workflow } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { DEMO_USERS, ROLE_LABELS } from '@/lib/demoUsers'
import { primaryRoleGuidance } from '@/lib/roleGuidance'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [selectedDemoUser, setSelectedDemoUser] = useState(
    import.meta.env.DEV ? 'admin' : '',
  )

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: import.meta.env.DEV ? 'admin' : '',
      password: import.meta.env.DEV ? 'Passw0rd!' : '',
    },
  })

  async function onSubmit(values) {
    try {
      const session = await login(values.username, values.password)
      const roles = session?.user?.roles || []
      const guide = primaryRoleGuidance(roles)
      const roleLine = roles.map((r) => ROLE_LABELS[r] || r).join(' · ')
      toast.success(guide ? `${guide.title} signed in` : 'Signed in', {
        description: guide
          ? `${guide.charge.slice(0, 120)}${guide.charge.length > 120 ? '…' : ''}`
          : roleLine || 'Open your briefing on the dashboard.',
        duration: 5500,
      })
      navigate(session?.user?.mustChangePassword ? '/change-password' : '/')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,118,110,0.12),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(24,24,27,0.06),transparent_35%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Workflow className="h-5 w-5" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">AMMS</h1>
          <p className="mt-3 max-w-md text-base text-muted-foreground">
            Overhaul Division workflow control — role-gated steps, decision graphs, and a living audit trail.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            <Card>
              <CardContent className="px-4 py-3">Server-driven next steps</CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-3">Clickable action notifications</CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-3">Process-flow charts per definition</CardContent>
            </Card>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md border-border/70">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              {import.meta.env.DEV
                ? 'Sign in with an account or select a development demo user.'
                : 'Enter your account credentials to continue.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {import.meta.env.DEV && (
                  <div className="space-y-2">
                    <Label htmlFor="demo-user">Quick select user</Label>
                    <Select
                      value={selectedDemoUser}
                      onValueChange={(username) => {
                        const demoUser = DEMO_USERS.find((candidate) => candidate.username === username)
                        if (!demoUser) return
                        setSelectedDemoUser(username)
                        form.setValue('username', username, { shouldValidate: true })
                        form.setValue('password', 'Passw0rd!')
                      }}
                    >
                      <SelectTrigger id="demo-user">
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
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="username"
                          {...field}
                          onChange={(event) => {
                            field.onChange(event)
                            setSelectedDemoUser('')
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Signing in…' : 'Continue'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
