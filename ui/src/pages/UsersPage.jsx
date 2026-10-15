import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Plus, RotateCcw, Search, UserRoundCog } from 'lucide-react'
import { toast } from 'sonner'
import {
  createUser,
  fetchRoles,
  fetchUsers,
  resetUserPassword,
  updateUser,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import Shell from '@/components/Shell'
import PageFrame from '@/components/PageFrame'
import PageHeader from '@/components/PageHeader'
import { useAuth } from '@/stores/authStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const createSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(100),
  displayName: z.string().trim().min(1, 'Display name is required').max(200),
  roles: z.array(z.string()).min(1, 'Assign at least one role'),
  temporaryPassword: z.string().min(12, 'Use at least 12 characters').max(72)
    .refine((value) => new TextEncoder().encode(value).length <= 72, 'Use no more than 72 UTF-8 bytes'),
  active: z.boolean(),
})

const updateSchema = createSchema.omit({ username: true, temporaryPassword: true })

function errorMessage(error, fallback) {
  return error?.response?.data?.message || fallback
}

function RoleAssignments({ roles, assigned, onChange, disabled }) {
  return (
    <div className="space-y-2">
      <Label>Assigned roles</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Assigned roles">
        {roles.map((role) => {
          const selected = assigned.includes(role.code)
          return (
            <Button
              key={role.code}
              type="button"
              size="sm"
              variant={selected ? 'secondary' : 'outline'}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(selected
                ? assigned.filter((code) => code !== role.code)
                : [...assigned, role.code])}
            >
              {role.name}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState('create')
  const [editingUser, setEditingUser] = useState(null)
  const [deactivationConfirmed, setDeactivationConfirmed] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const filters = useMemo(() => ({
    page,
    size: 25,
    ...(activeFilter === 'all' ? {} : { active: activeFilter === 'active' }),
    ...(roleFilter === 'all' ? {} : { role: roleFilter }),
    ...(search.trim() ? { q: search.trim() } : {}),
  }), [activeFilter, page, roleFilter, search])

  const users = useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () => fetchUsers(filters),
    placeholderData: (previous) => previous,
  })
  const roles = useQuery({
    queryKey: queryKeys.roles.all,
    queryFn: fetchRoles,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      toast.success('User created; provide the temporary password securely')
      setEditorOpen(false)
      form.reset(emptyUser)
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not create user')),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => updateUser(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      toast.success('User account updated')
      setEditorOpen(false)
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not update user')),
  })
  const resetMutation = useMutation({
    mutationFn: ({ id, password }) => resetUserPassword(id, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      toast.success('Temporary password set; provide it securely to the user')
      closeReset()
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not reset password')),
  })

  const formSchema = editorMode === 'create' ? createSchema : updateSchema
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: emptyUser,
  })

  function openCreate() {
    setEditorMode('create')
    setEditingUser(null)
    setDeactivationConfirmed(false)
    form.reset(emptyUser)
    setEditorOpen(true)
  }

  function openEdit(user) {
    setEditorMode('edit')
    setEditingUser(user)
    setDeactivationConfirmed(false)
    form.reset({
      displayName: user.displayName,
      roles: user.roles,
      active: user.active,
    })
    setEditorOpen(true)
  }

  function onSubmit(values) {
    if (editorMode === 'create') {
      createMutation.mutate({
        username: values.username,
        displayName: values.displayName,
        roles: values.roles,
        temporaryPassword: values.temporaryPassword,
      })
      return
    }
    if (editingUser.active && !values.active && !deactivationConfirmed) {
      toast.error('Confirm account deactivation before saving')
      return
    }
    updateMutation.mutate({
      id: editingUser.id,
      body: {
        displayName: values.displayName,
        roles: values.roles,
        active: values.active,
      },
    })
  }

  function closeReset() {
    setResetTarget(null)
    setTemporaryPassword('')
    setConfirmPassword('')
  }

  function submitReset(event) {
    event.preventDefault()
    if (temporaryPassword.length < 12 || new TextEncoder().encode(temporaryPassword).length > 72) {
      toast.error('Password must be at least 12 characters and no more than 72 UTF-8 bytes')
      return
    }
    if (temporaryPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    resetMutation.mutate({ id: resetTarget.id, password: temporaryPassword })
  }

  const roleList = roles.data || []
  const rows = users.data?.items || []
  const totalPages = Math.max(1, Math.ceil((users.data?.total || 0) / (users.data?.size || 25)))
  const busy = createMutation.isPending || updateMutation.isPending
  const deactivationNeedsConfirmation = editorMode === 'edit'
    && editingUser?.active && form.watch('active') === false

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="User management"
          description="Create accounts, assign operational access, and control account status."
          breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'User management' }]}
          actions={
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add user
            </Button>
          }
        />

      {roles.isError && (
        <Alert variant="destructive">
          <AlertTitle>Role catalog unavailable</AlertTitle>
          <AlertDescription>{errorMessage(roles.error, 'Could not load roles')}</AlertDescription>
        </Alert>
      )}
      {users.isError && (
        <Alert variant="destructive">
          <AlertTitle>User records unavailable</AlertTitle>
          <AlertDescription>{errorMessage(users.error, 'Could not load users')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search users"
                className="pl-9"
                placeholder="Search username or name"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(0)
                }}
              />
            </div>
            <Select value={activeFilter} onValueChange={(value) => {
              setActiveFilter(value)
              setPage(0)
            }}>
              <SelectTrigger aria-label="Filter by account status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(value) => {
              setRoleFilter(value)
              setPage(0)
            }}>
              <SelectTrigger aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roleList.map((role) => (
                  <SelectItem key={role.code} value={role.code}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {users.isError && !users.data ? null : users.isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading user records…</p>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <UserRoundCog className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No users match these filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Change the filters or create an account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Assigned roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground">{user.username}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[28rem] flex-wrap gap-1.5">
                          {user.roles.map((code) => (
                            <Badge key={code} variant="outline">{roleList.find((role) => role.code === code)?.name || code}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={user.active ? 'success' : 'danger'}>
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                          {user.mustChangePassword && (
                            <span className="text-xs text-amber-700">Temporary password outstanding</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(user)}>
                            Edit
                          </Button>
                          {currentUser?.id !== user.id && (
                            <Button type="button" variant="ghost" size="sm" disabled={!user.active}
                              onClick={() => setResetTarget(user)}>
                              <RotateCcw className="h-3.5 w-3.5" />
                              Reset password
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <p className="text-sm text-muted-foreground">
              {users.data?.total || 0} accounts · Page {page + 1} of {totalPages}
              {users.isFetching && !users.isLoading ? ' · Updating' : ''}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page === 0 || users.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}>
                Previous
              </Button>
              <Button type="button" variant="outline" size="sm"
                disabled={page + 1 >= totalPages || users.isFetching}
                onClick={() => setPage((current) => current + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

        <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader className="border-b">
            <SheetTitle>{editorMode === 'create' ? 'Create user account' : 'Edit user account'}</SheetTitle>
            <SheetDescription>
              {editorMode === 'create'
                ? 'Usernames cannot be changed after creation. Choose roles explicitly.'
                : `Update ${editingUser?.username}; account history and attribution are retained.`}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-4 pb-6">
            {editorMode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" autoComplete="off" {...form.register('username')} />
                {form.formState.errors.username && (
                  <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input id="displayName" autoComplete="name" {...form.register('displayName')} />
              {form.formState.errors.displayName && (
                <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
              )}
            </div>
            <RoleAssignments
              roles={roleList}
              assigned={form.watch('roles') || []}
              disabled={busy}
              onChange={(value) => form.setValue('roles', value, { shouldValidate: true })}
            />
            {form.formState.errors.roles && (
              <p className="text-sm text-destructive">{form.formState.errors.roles.message}</p>
            )}
            {editorMode === 'create' ? (
              <div className="space-y-2">
                <Label htmlFor="temporaryPassword">Temporary password</Label>
                <Input id="temporaryPassword" type="password" autoComplete="new-password"
                  {...form.register('temporaryPassword')} />
                <p className="text-xs text-muted-foreground">
                  At least 12 characters. The user must change this at first sign-in; provide it through an approved secure channel.
                </p>
                {form.formState.errors.temporaryPassword && (
                  <p className="text-sm text-destructive">{form.formState.errors.temporaryPassword.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="accountStatus">Account status</Label>
                <Select value={form.watch('active') ? 'active' : 'inactive'}
                  onValueChange={(value) => {
                    form.setValue('active', value === 'active')
                    setDeactivationConfirmed(false)
                  }}>
                  <SelectTrigger id="accountStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Deactivated accounts cannot sign in. Existing workflow and audit history is retained.
                </p>
                {deactivationNeedsConfirmation && (
                  <Alert variant="warning">
                    <AlertTitle>Confirm account deactivation</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>This will block future requests and sign-ins for this account.</p>
                      <Button type="button" size="sm" variant={deactivationConfirmed ? 'secondary' : 'outline'}
                        aria-pressed={deactivationConfirmed}
                        onClick={() => setDeactivationConfirmed((confirmed) => !confirmed)}>
                        {deactivationConfirmed ? 'Deactivation confirmed' : 'Confirm deactivation'}
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy || !roleList.length
                || (deactivationNeedsConfirmation && !deactivationConfirmed)}>
                {busy ? 'Saving…' : editorMode === 'create' ? 'Create account' : 'Save changes'}
              </Button>
            </div>
          </form>
        </SheetContent>
        </Sheet>

        <Sheet open={!!resetTarget} onOpenChange={(open) => !open && closeReset()}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle>Set temporary password</SheetTitle>
            <SheetDescription>
              For {resetTarget?.username}. The account must change this password at next sign-in.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={submitReset} className="space-y-4 px-4 pb-6">
            <Alert>
              <AlertTitle>Handle credentials securely</AlertTitle>
              <AlertDescription>
                Do not include passwords in messages or audit notes. Provide the temporary password through an approved secure channel.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="resetPassword">Temporary password</Label>
              <Input id="resetPassword" type="password" autoComplete="new-password"
                value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmResetPassword">Confirm temporary password</Label>
              <Input id="confirmResetPassword" type="password" autoComplete="new-password"
                value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={closeReset}>Cancel</Button>
              <Button type="submit" disabled={!resetTarget || resetMutation.isPending}>
                {resetMutation.isPending ? 'Setting password…' : 'Set temporary password'}
              </Button>
            </div>
          </form>
        </SheetContent>
        </Sheet>
      </PageFrame>
    </Shell>
  )
}

const emptyUser = {
  username: '',
  displayName: '',
  roles: [],
  temporaryPassword: '',
  active: true,
}
