import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, Package, Plus, Play } from 'lucide-react'
import {
  addPackagePart,
  createPackage,
  fetchPackage,
  fetchPackageReport,
  fetchPackages,
  fetchWorkflows,
  openPackagePart,
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function statusVariant(status) {
  switch (String(status || '').toUpperCase()) {
    case 'COMPLETED':
    case 'PASSED':
      return 'default'
    case 'IN_PROGRESS':
    case 'IN_TEST':
      return 'secondary'
    case 'FAILED':
    case 'CANCELLED':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default function PackagesPage({ mode = 'list' }) {
  if (mode === 'new') return <PackageCreate />
  if (mode === 'detail') return <PackageDetail />
  if (mode === 'report') return <PackageReport />
  return <PackageList />
}

function PackageList() {
  const packages = useQuery({ queryKey: queryKeys.packages.all, queryFn: fetchPackages })

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title={NAV_LABELS.packages}
          description="Create an aircraft work order from PO/SO. Attach a master workflow to each aircraft part, run the stage forms, and consolidate the report."
          backTo="/"
          backLabel={NAV_LABELS.dashboard}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.packages },
          ]}
          actions={
            <Button asChild size="sm">
              <Link to="/packages/new">
                <Plus className="h-3.5 w-3.5" />
                New work order
              </Link>
            </Button>
          }
        />

        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work order</TableHead>
                <TableHead className="hidden sm:table-cell">Aircraft</TableHead>
                <TableHead>PO / SO</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(packages.data || []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.packageNo}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.defaultWorkflowName || p.defaultWorkflowKey
                        ? `Default: ${p.defaultWorkflowName || p.defaultWorkflowKey}`
                        : 'Workflows attach per part'}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs">
                    {p.aircraftId}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{p.poNumber}</div>
                    {p.soNumber && (
                      <div className="text-xs text-muted-foreground">SO {p.soNumber}</div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{p.testingType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link to={`/packages/${p.id}`}>Parts</Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-8">
                        <Link to={`/packages/${p.id}/report`}>
                          <FileText className="h-3.5 w-3.5" />
                          Report
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {packages.isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading work orders…
                  </TableCell>
                </TableRow>
              )}
              {!packages.isLoading && (packages.data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No work orders yet.{' '}
                    <Link className="text-primary underline-offset-2 hover:underline" to="/packages/new">
                      Create one from a PO/SO
                    </Link>
                  </TableCell>
                </TableRow>
              )}
              {packages.isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    Could not load work orders.
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

function PackageCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    aircraftId: '',
    poNumber: '',
    soNumber: '',
    testingType: 'ROUTINE',
    aircraftType: '',
    workflowKey: '',
    notes: '',
  })

  const workflowFilters = useMemo(
    () => ({
      includeInactive: false,
      workType: form.testingType,
      aircraftType: form.aircraftType.trim() || undefined,
    }),
    [form.testingType, form.aircraftType],
  )
  const workflows = useQuery({
    queryKey: queryKeys.workflows.list(workflowFilters),
    queryFn: () => fetchWorkflows(workflowFilters),
  })

  const create = useMutation({
    mutationFn: () => {
      const { aircraftType, workflowKey, ...rest } = form
      const body = { ...rest }
      if (workflowKey) body.workflowKey = workflowKey
      return createPackage(body)
    },
    onSuccess: (data) => {
      toast.success('Work order created — attach workflows when adding parts')
      navigate(`/packages/${data.id}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not create work order'),
  })

  const workflowOptions = workflows.data || []

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="New work order"
          description="Create a PO/SO header for the aircraft. Master workflows attach to each part on the next screen — not to the whole work order."
          backTo="/packages"
          backLabel={NAV_LABELS.packages}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.packages, to: '/packages' },
            { label: 'New' },
          ]}
        />

        <form
          className="mx-auto max-w-xl space-y-4 rounded-lg border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!form.aircraftId.trim() || !form.poNumber.trim()) {
              toast.error('Aircraft and PO number are required')
              return
            }
            create.mutate()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="aircraftId">Aircraft ID</Label>
            <Input
              id="aircraftId"
              value={form.aircraftId}
              onChange={(e) => setForm((f) => ({ ...f, aircraftId: e.target.value }))}
              placeholder="e.g. VT-HLL"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="poNumber">PO number</Label>
              <Input
                id="poNumber"
                value={form.poNumber}
                onChange={(e) => setForm((f) => ({ ...f, poNumber: e.target.value }))}
                placeholder="PO-…"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="soNumber">SO number (optional)</Label>
              <Input
                id="soNumber"
                value={form.soNumber}
                onChange={(e) => setForm((f) => ({ ...f, soNumber: e.target.value }))}
                placeholder="SO-…"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Testing type</Label>
              <Select
                value={form.testingType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, testingType: v, workflowKey: '' }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">ROUTINE — scheduled / periodic</SelectItem>
                  <SelectItem value="REPAIR">REPAIR — finding / retest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aircraftType">Aircraft type filter (optional)</Label>
              <Input
                id="aircraftType"
                value={form.aircraftType}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    aircraftType: e.target.value.toUpperCase(),
                    workflowKey: '',
                  }))
                }
                placeholder="e.g. A320 — leave blank for all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Default master workflow (optional)</Label>
            <Select
              value={form.workflowKey || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, workflowKey: v }))}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    workflows.isLoading
                      ? 'Loading…'
                      : workflowOptions.length
                        ? 'Pre-fill when adding parts (optional)'
                        : 'No matching active workflows'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {workflowOptions.map((w) => (
                  <SelectItem key={w.key} value={w.key}>
                    {w.name} ({w.key})
                    {w.workType ? ` · ${w.workType}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Optional default only. You still attach (or override) a workflow on each aircraft part.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Optional planning notes"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={create.isPending}>
              <Package className="h-3.5 w-3.5" />
              {create.isPending ? 'Creating…' : 'Create work order'}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to="/packages">Cancel</Link>
            </Button>
          </div>
        </form>
      </PageFrame>
    </Shell>
  )
}

function PackageDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const pkg = useQuery({
    queryKey: queryKeys.packages.detail(id),
    queryFn: () => fetchPackage(id),
    enabled: !!id,
  })

  const data = pkg.data
  const defaultWorkflowKey = data?.defaultWorkflowKey || data?.workflowKey || ''

  const [partForm, setPartForm] = useState({
    partNo: '',
    serialNo: '',
    description: '',
    workflowKey: '',
  })

  // Prefill part workflow from package default when detail loads / changes.
  const effectivePartWorkflow =
    partForm.workflowKey || defaultWorkflowKey || ''

  const workflowFilters = useMemo(
    () => ({
      includeInactive: false,
      workType: data?.testingType || undefined,
    }),
    [data?.testingType],
  )
  const workflows = useQuery({
    queryKey: queryKeys.workflows.list(workflowFilters),
    queryFn: () => fetchWorkflows(workflowFilters),
    enabled: !!data?.testingType,
  })
  const workflowOptions = workflows.data || []

  const addPart = useMutation({
    mutationFn: () =>
      addPackagePart(id, {
        partNo: partForm.partNo,
        serialNo: partForm.serialNo,
        description: partForm.description,
        workflowKey: effectivePartWorkflow,
      }),
    onSuccess: () => {
      toast.success('Part added with attached workflow')
      setPartForm({
        partNo: '',
        serialNo: '',
        description: '',
        workflowKey: defaultWorkflowKey || '',
      })
      qc.invalidateQueries({ queryKey: queryKeys.packages.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.packages.all })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not add part'),
  })

  const openPart = useMutation({
    mutationFn: (partId) => openPackagePart(id, partId),
    onSuccess: (data) => {
      toast.success('Part opened — workflow instance started')
      qc.invalidateQueries({ queryKey: queryKeys.packages.detail(id) })
      qc.invalidateQueries({ queryKey: queryKeys.packages.all })
      if (data.openedInstanceId) {
        navigate(`/instances/${data.openedInstanceId}`)
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not open part'),
  })

  const parts = data?.parts || []
  const closed = data?.status === 'COMPLETED' || data?.status === 'CANCELLED'

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title={data?.packageNo || 'Work order'}
          description={
            data
              ? `${data.aircraftId} · PO ${data.poNumber}${data.soNumber ? ` · SO ${data.soNumber}` : ''} · ${data.testingType}`
              : 'Loading work order…'
          }
          backTo="/packages"
          backLabel={NAV_LABELS.packages}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.packages, to: '/packages' },
            { label: data?.packageNo || 'Detail' },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusVariant(data?.status)}>{data?.status || '…'}</Badge>
              <Button asChild size="sm" variant="outline">
                <Link to={`/packages/${id}/report`}>
                  <FileText className="h-3.5 w-3.5" />
                  Test report
                </Link>
              </Button>
            </div>
          }
        />

        {pkg.isLoading && (
          <p className="text-sm text-muted-foreground">Loading work order…</p>
        )}
        {pkg.isError && (
          <p className="text-sm text-destructive">Could not load this work order.</p>
        )}

        {data && (
          <>
            {!closed && (
              <form
                className="mb-6 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!partForm.partNo.trim()) {
                    toast.error('Part number is required')
                    return
                  }
                  if (!effectivePartWorkflow) {
                    toast.error('Attach a master workflow to this aircraft part')
                    return
                  }
                  addPart.mutate()
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="partNo">Part no.</Label>
                  <Input
                    id="partNo"
                    value={partForm.partNo}
                    onChange={(e) => setPartForm((f) => ({ ...f, partNo: e.target.value }))}
                    placeholder="P/N"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="serialNo">Serial</Label>
                  <Input
                    id="serialNo"
                    value={partForm.serialNo}
                    onChange={(e) => setPartForm((f) => ({ ...f, serialNo: e.target.value }))}
                    placeholder="S/N"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={partForm.description}
                    onChange={(e) => setPartForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Master workflow</Label>
                  <Select
                    value={effectivePartWorkflow || undefined}
                    onValueChange={(v) => setPartForm((f) => ({ ...f, workflowKey: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          workflows.isLoading ? 'Loading…' : 'Attach workflow to this part'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {workflowOptions.map((w) => (
                        <SelectItem key={w.key} value={w.key}>
                          {w.name}
                          {w.workType ? ` · ${w.workType}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full" disabled={addPart.isPending}>
                    <Plus className="h-3.5 w-3.5" />
                    Add part
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-5">
                  Workflow attaches to this aircraft part. Opening the part starts a maintenance
                  run for that chart only.
                </p>
              </form>
            )}

            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead className="hidden sm:table-cell">Serial</TableHead>
                    <TableHead className="hidden lg:table-cell">Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Step</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {part.sequenceNo}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{part.partNo}</div>
                        {part.description && (
                          <div className="text-xs text-muted-foreground">{part.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs sm:table-cell">
                        {part.serialNo || '—'}
                      </TableCell>
                      <TableCell className="hidden text-xs lg:table-cell">
                        <div className="font-medium">
                          {part.workflowName || part.workflowKey || '—'}
                        </div>
                        {part.workflowName && part.workflowKey ? (
                          <div className="text-muted-foreground">{part.workflowKey}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(part.status)}>{part.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {part.currentNodeKey || part.instanceStatus || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-2">
                          {part.status === 'PENDING' && !closed && (
                            <Button
                              size="sm"
                              className="h-8"
                              disabled={openPart.isPending || !part.workflowKey}
                              onClick={() => openPart.mutate(part.id)}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Open &amp; test
                            </Button>
                          )}
                          {part.instanceId && (
                            <Button asChild size="sm" variant="outline" className="h-8">
                              <Link to={`/instances/${part.instanceId}`}>
                                {part.status === 'IN_TEST' ? 'Continue' : 'Instance'}
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {parts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Add aircraft parts and attach a master workflow to each, then open them one
                        by one (open → test → reassemble → report).
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </PageFrame>
    </Shell>
  )
}

function PackageReport() {
  const { id } = useParams()
  const report = useQuery({
    queryKey: queryKeys.packages.report(id),
    queryFn: () => fetchPackageReport(id),
    enabled: !!id,
  })

  const data = report.data
  const parts = data?.parts || []
  const summary = data?.summary || {}

  const summaryLine = useMemo(() => {
    if (!data) return ''
    return `${summary.totalParts ?? 0} parts · ${summary.passed ?? 0} passed · ${summary.failed ?? 0} failed · ${summary.pending ?? 0} pending`
  }, [data, summary])

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="Test report"
          description={
            data
              ? `${data.packageNo} · ${data.aircraftId} · PO ${data.poNumber} · ${data.testingType}`
              : 'Loading report…'
          }
          backTo={`/packages/${id}`}
          backLabel={NAV_LABELS.packages}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.packages, to: '/packages' },
            { label: data?.packageNo || 'Work order', to: `/packages/${id}` },
            { label: 'Report' },
          ]}
          actions={
            data && (
              <Badge variant={statusVariant(data.status)}>{data.status}</Badge>
            )
          }
        />

        {report.isLoading && (
          <p className="text-sm text-muted-foreground">Building report…</p>
        )}
        {report.isError && (
          <p className="text-sm text-destructive">Could not load report.</p>
        )}

        {data && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
              <div className="bg-card px-4 py-3.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Parts
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {summary.totalParts ?? 0}
                </div>
              </div>
              <div className="bg-card px-4 py-3.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Passed
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {summary.passed ?? 0}
                </div>
              </div>
              <div className="bg-card px-4 py-3.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Failed
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {summary.failed ?? 0}
                </div>
              </div>
              <div className="bg-card px-4 py-3.5">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Pending
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {summary.pending ?? 0}
                </div>
              </div>
            </div>

            <p className="mb-3 text-sm text-muted-foreground">{summaryLine}</p>

            <div className="overflow-hidden rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead className="hidden sm:table-cell">Serial</TableHead>
                    <TableHead className="hidden lg:table-cell">Workflow</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="hidden md:table-cell">Instance</TableHead>
                    <TableHead className="text-right">Evidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="tabular-nums">{part.sequenceNo}</TableCell>
                      <TableCell>
                        <div className="font-medium">{part.partNo}</div>
                        {part.description && (
                          <div className="text-xs text-muted-foreground">{part.description}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs sm:table-cell">
                        {part.serialNo || '—'}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {part.workflowName || part.workflowKey || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(part.status)}>{part.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        {part.instanceStatus || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {part.instanceId ? (
                          <Button asChild size="sm" variant="outline" className="h-8">
                            <Link to={`/instances/${part.instanceId}`}>Audit &amp; forms</Link>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not opened</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {parts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No parts on this work order yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </PageFrame>
    </Shell>
  )
}
