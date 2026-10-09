import { useForm } from 'react-hook-form'
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

  const form = useForm({
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
            <Card>
              <CardContent className="px-4 py-3">Server-driven next steps</CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-3">Clickable action notifications</CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-3">XY workflow charts per definition</CardContent>
            </Card>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <Card className="mx-auto w-full max-w-md border-border/70">
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>Select a demo role/user or enter credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quick select user</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v)
                            form.setValue('password', 'Passw0rd!')
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DEMO_USERS.map((u) => (
                              <SelectItem key={u.username} value={u.username}>
                                {u.displayName} · {u.roles.join(', ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input autoComplete="username" {...field} />
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
              <p className="hal-watermark mt-6 text-center">Property of HAL — Restricted</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
