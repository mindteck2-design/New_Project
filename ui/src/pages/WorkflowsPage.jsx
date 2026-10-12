import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, Play, Plus, Power } from 'lucide-react'
import {
  cloneWorkflow,
  fetchWorkflows,
  setWorkflowActive,
  startInstance,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { NAV_LABELS } from '@/lib/navConfig'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [workType, setWorkType] = useState('ALL')
  const [aircraftType, setAircraftType] = useState('')
  const [includeInactive, setIncludeInactive] = useState(true)
  const [cloneTarget, setCloneTarget] = useState(null)
  const [cloneKey, setCloneKey] = useState('')
  const [cloneName, setCloneName] = useState('')

  const filters = useMemo(
    () => ({
      includeInactive,
      workType: workType === 'ALL' ? undefined : workType,
      aircraftType: aircraftType.trim() || undefined,
    }),
    [includeInactive, workType, aircraftType],
  )

  const workflows = useQuery({
    queryKey: queryKeys.workflows.list(filters),
    queryFn: () => fetchWorkflows(filters),
  })

  const start = useMutation({
    mutationFn: ({ key }) => startInstance(key, `BK-${Date.now()}`),
    onSuccess: (data) => {
      toast.success('Test run started', {
        action: {
          label: 'Open',
          onClick: () => navigate(`/instances/${data.instanceId}`),
        },
      })
      qc.invalidateQueries({ queryKey: ['instances'] })
      navigate(`/instances/${data.instanceId}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not start workflow'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ key, active }) => setWorkflowActive(key, active),
    onSuccess: (data) => {
      toast.success(data.active ? `Activated ${data.key}` : `Deactivated ${data.key}`)
      qc.invalidateQueries({ queryKey: ['workflows'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not update status'),
  })

  const clone = useMutation({
    mutationFn: () =>
      cloneWorkflow(cloneTarget.key, {
        newKey: cloneKey.trim().toLowerCase(),
        name: cloneName.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success(`Cloned as ${data.key}`)
      setCloneTarget(null)
      setCloneKey('')
      setCloneName('')
      qc.invalidateQueries({ queryKey: ['workflows'] })
      navigate(`/workflows/${data.key}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not clone workflow'),
  })

  const rows = workflows.data || []

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title={NAV_LABELS.workflows}
          description="Configure maintenance stages, roles, forms, and transitions. Filter by work type or aircraft. Shop execution starts from Work orders."
          backTo="/"
          backLabel={NAV_LABELS.dashboard}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.workflows },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/forms">{NAV_LABELS.forms}</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/workflows/new">
                  <Plus className="h-3.5 w-3.5" />
                  Create workflow
                </Link>
              </Button>
            </div>
          }
        />

        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3 sm:p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Work type</Label>
            <Select value={workType} onValueChange={setWorkType}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="ROUTINE">ROUTINE</SelectItem>
                <SelectItem value="REPAIR">REPAIR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Aircraft type</Label>
            <Input
              className="h-9 w-[160px]"
              placeholder="e.g. A320"
              value={aircraftType}
              onChange={(e) => setAircraftType(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Visibility</Label>
            <Select
              value={includeInactive ? 'all' : 'active'}
              onValueChange={(v) => setIncludeInactive(v === 'all')}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Active + inactive</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {cloneTarget && (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-accent/20 p-4">
            <p className="text-sm font-semibold">
              Clone workflow · {cloneTarget.name} ({cloneTarget.key})
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>New key</Label>
                <Input
                  value={cloneKey}
                  placeholder={`${cloneTarget.key}-copy`}
                  onChange={(e) => setCloneKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>New name</Label>
                <Input
                  value={cloneName}
                  placeholder={`${cloneTarget.name} (copy)`}
                  onChange={(e) => setCloneName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!cloneKey.trim() || clone.isPending}
                onClick={() => clone.mutate()}
              >
                {clone.isPending ? 'Cloning…' : 'Clone'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCloneTarget(null)
                  setCloneKey('')
                  setCloneName('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Key</TableHead>
                <TableHead className="hidden md:table-cell">Work type</TableHead>
                <TableHead className="hidden lg:table-cell">Aircraft</TableHead>
                <TableHead className="hidden md:table-cell">Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{w.key}</div>
                    {w.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {w.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                    {w.key}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {w.workType ? (
                      <Badge variant="outline">{w.workType}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {(w.aircraftTypes || []).length ? (
                      <div className="flex flex-wrap gap-1">
                        {w.aircraftTypes.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary">v{w.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={w.active ? 'default' : 'outline'}>
                      {w.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link to={`/workflows/${w.key}`}>Edit stages</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          setCloneTarget(w)
                          setCloneKey(`${w.key}-copy`.slice(0, 63))
                          setCloneName(`${w.name} (copy)`)
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Clone
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        disabled={toggleActive.isPending}
                        onClick={() => toggleActive.mutate({ key: w.key, active: !w.active })}
                        title={w.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="h-3.5 w-3.5" />
                        {w.active ? 'Off' : 'On'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        disabled={!w.active || start.isPending}
                        onClick={() => start.mutate({ key: w.key })}
                        title="Starts a standalone test run — prefer Work orders for shop work"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Test run
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workflows.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Loading definitions…
                  </TableCell>
                </TableRow>
              )}
              {!workflows.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No workflow definitions match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageFrame>
    </Shell>
  )
}
