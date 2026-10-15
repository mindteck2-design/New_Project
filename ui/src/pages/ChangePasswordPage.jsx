import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/stores/authStore'
import PageFrame from '@/components/PageFrame'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(12, 'Use at least 12 characters').max(72, 'Use no more than 72 characters')
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Use no more than 72 UTF-8 bytes'),
  confirmPassword: z.string().min(1, 'Confirm the new password'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
})

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, changePassword } = useAuth()
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  async function onSubmit(values) {
    try {
      await changePassword(values.currentPassword, values.newPassword)
      toast.success('Password updated')
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Could not update password')
    }
  }

  return (
    <PageFrame className="max-w-3xl">
      <PageHeader
        title="Change password"
        description={user?.mustChangePassword
          ? `Set a permanent password for ${user?.username}.`
          : `Update the password for ${user?.username}.`}
        breadcrumbs={[{ label: 'Change password' }]}
      />
      <Card>
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Use at least 12 characters and no more than 72 UTF-8 bytes.
            The old password will stop working after this change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" type="password" autoComplete="current-password"
                {...form.register('currentPassword')} />
              {form.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" autoComplete="new-password"
                {...form.register('newPassword')} />
              {form.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" type="password" autoComplete="new-password"
                {...form.register('confirmPassword')} />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageFrame>
  )
}
