import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Copy, FileText, Package, Play, Plus, Power } from 'lucide-react'
import {
  assignWorkflowNodeForm,
  cloneWorkflow,
  createFormForWorkflowNode,
  fetchFormSchemas,
  fetchWorkflowDefinition,
  setWorkflowActive,
  startInstance,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { NAV_LABELS } from '@/lib/navConfig'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import WorkflowChart from '@/components/WorkflowChart'
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

function emptyField() {
  return { name: '', label: '', type: 'text', placeholder: '', required: true }
}

/** Inline create form bound to a specific workflow node. */
function CreateFormForNode({ workflowKey, node, onDone, onCancel }) {
  const suggestedKey = `${workflowKey}-${node.key}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  const [formKey, setFormKey] = useState(suggestedKey.slice(0, 63))
  const [name, setName] = useState(`${node.label} form`)
  const [fields, setFields] = useState([emptyField(), emptyField()])
  const qc = useQueryClient()

  const save = useMutation({
    mutationFn: () =>
      createFormForWorkflowNode(workflowKey, node.key, {
        formKey: formKey.trim().toLowerCase(),
        name: name.trim(),
        fields: fields.map((f) => ({
          name: f.name.trim(),
          label: f.label.trim(),
          type: f.type || 'text',
          placeholder: f.placeholder?.trim() || undefined,
          required: !!f.required,
        })),
      }),
    onSuccess: (data) => {
      toast.success(`Form “${data.formKey}” attached to step ${node.label}`)
      qc.invalidateQueries({ queryKey: queryKeys.workflows.detail(workflowKey) })
      qc.invalidateQueries({ queryKey: queryKeys.forms.all })
      onDone?.(data)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not create workflow form'),
  })

  function updateField(index, patch) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-accent/30 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">
          New form for step · {node.label}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Saved in MongoDB and linked to this workflow node as <code>formKey</code>. Operators fill
          it when the instance reaches this step.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Form key</Label>
          <Input
            value={formKey}
            onChange={(e) => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Display name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Fields</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setFields((p) => [...p, emptyField()])}>
            <Plus className="h-3.5 w-3.5" />
            Field
          </Button>
        </div>
        {fields.map((field, index) => (
          <div key={index} className="grid gap-2 rounded-md border bg-card p-3 sm:grid-cols-3">
            <Input
              placeholder="fieldName"
              value={field.name}
              onChange={(e) => updateField(index, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            />
            <Input
              placeholder="Label"
              value={field.label}
              onChange={(e) => updateField(index, { label: e.target.value })}
            />
            <Select value={field.type} onValueChange={(v) => updateField(index, { type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="textarea">Long text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
              </SelectContent>
            </Select>
            {field.type === 'textarea' ? (
              <Textarea
                className="sm:col-span-3"
                placeholder="Placeholder"
                value={field.placeholder}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                rows={2}
              />
            ) : (
              <Input
                className="sm:col-span-3"
                placeholder="Placeholder"
                value={field.placeholder}
                onChange={(e) => updateField(index, { placeholder: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={
            save.isPending || !formKey || !name || fields.some((f) => !f.name || !f.label)
          }
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : 'Create & attach to step'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export default function WorkflowDetailPage() {
  const { key } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [creatingFor, setCreatingFor] = useState(null)
  const [showClone, setShowClone] = useState(false)
  const [cloneKey, setCloneKey] = useState('')
  const [cloneName, setCloneName] = useState('')

  const definition = useQuery({
    queryKey: queryKeys.workflows.detail(key),
    queryFn: () => fetchWorkflowDefinition(key),
    enabled: !!key,
  })
  const forms = useQuery({
    queryKey: queryKeys.forms.list({ status: 'PUBLISHED' }),
    queryFn: () => fetchFormSchemas({ status: 'PUBLISHED' }),
  })

  const start = useMutation({
    mutationFn: () => startInstance(key, `BK-${Date.now()}`),
    onSuccess: (data) => {
      toast.success('Workflow started')
      qc.invalidateQueries({ queryKey: ['instances'] })
      navigate(`/instances/${data.instanceId}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not start'),
  })

  const assign = useMutation({
    mutationFn: ({ nodeKey, formKey }) => assignWorkflowNodeForm(key, nodeKey, formKey),
    onSuccess: (data) => {
      toast.success(`Form linked to ${data.label || data.nodeKey}`)
      qc.invalidateQueries({ queryKey: queryKeys.workflows.detail(key) })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not attach form'),
  })

  const toggleActive = useMutation({
    mutationFn: (active) => setWorkflowActive(key, active),
    onSuccess: (data) => {
      toast.success(data.active ? 'Workflow activated' : 'Workflow deactivated')
      qc.invalidateQueries({ queryKey: queryKeys.workflows.detail(key) })
      qc.invalidateQueries({ queryKey: ['workflows'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not update status'),
  })

  const clone = useMutation({
    mutationFn: () =>
      cloneWorkflow(key, {
        newKey: cloneKey.trim().toLowerCase(),
        name: cloneName.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success(`Cloned as ${data.key}`)
      qc.invalidateQueries({ queryKey: ['workflows'] })
      navigate(`/workflows/${data.key}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not clone'),
  })

  const nodes = useMemo(() => definition.data?.nodes || [], [definition.data])
  const taskNodes = useMemo(
    () => nodes.filter((n) => String(n.type).toUpperCase() === 'TASK'),
    [nodes],
  )
  const formOptions = forms.data || []
  const isActive = definition.data?.active !== false

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title={definition.data?.name || key}
          description="Assign a Form Master checklist and responsible role to each stage. Shop work runs through Work orders; Test run validates the chart only."
          backTo="/workflows"
          backLabel={NAV_LABELS.workflows}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.workflows, to: '/workflows' },
            { label: definition.data?.name || key },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/packages/new">
                  <Package className="h-3.5 w-3.5" />
                  New work order
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowClone(true)
                  setCloneKey(`${key}-copy`.slice(0, 63))
                  setCloneName(`${definition.data?.name || key} (copy)`)
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Clone
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={toggleActive.isPending || !definition.data}
                onClick={() => toggleActive.mutate(!isActive)}
              >
                <Power className="h-3.5 w-3.5" />
                {isActive ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!isActive || start.isPending}
                onClick={() => start.mutate()}
                title="Standalone validation run — prefer Work orders for shop execution"
              >
                <Play className="h-3.5 w-3.5" />
                Test run
              </Button>
            </div>
          }
        />

        {definition.isLoading && (
          <p className="text-sm text-muted-foreground">Loading workflow definition…</p>
        )}
        {definition.isError && (
          <p className="text-sm text-destructive">Workflow not found: {key}</p>
        )}

        {definition.data && (
          <>
            {showClone && (
              <div className="space-y-3 rounded-lg border border-primary/20 bg-accent/20 p-4">
                <p className="text-sm font-semibold">Clone this workflow</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>New key</Label>
                    <Input
                      value={cloneKey}
                      onChange={(e) =>
                        setCloneKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>New name</Label>
                    <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
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
                  <Button size="sm" variant="outline" onClick={() => setShowClone(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 lg:grid-cols-6">
              <div className="bg-card px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Key
                </div>
                <div className="mt-1 font-mono text-sm">{definition.data.key || key}</div>
              </div>
              <div className="bg-card px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Version
                </div>
                <div className="mt-1 text-sm font-semibold">v{definition.data.version || 1}</div>
              </div>
              <div className="bg-card px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </div>
                <div className="mt-1">
                  <Badge variant={isActive ? 'default' : 'outline'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="bg-card px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Work type
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {definition.data.workType || '—'}
                </div>
              </div>
              <div className="bg-card px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Aircraft
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {(definition.data.aircraftTypes || []).join(', ') || '—'}
                </div>
              </div>
              <div className="bg-card px-4 py-3">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Forms on steps
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {taskNodes.filter((n) => n.formKey).length}/{taskNodes.length} tasks
                </div>
              </div>
            </div>

            <section className="space-y-3" aria-labelledby="wf-chart-heading">
              <div>
                <h2 id="wf-chart-heading" className="text-sm font-semibold tracking-tight">
                  Stage sequence
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Visual map of maintenance stages and transitions for this workflow.
                </p>
              </div>
              <WorkflowChart
                definition={definition.data}
                className="h-[min(52vh,480px)] min-h-[320px]"
              />
            </section>

            <section className="space-y-3" aria-labelledby="wf-forms-heading">
              <div>
                <h2 id="wf-forms-heading" className="text-sm font-semibold tracking-tight">
                  Stage forms
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Only TASK stages collect operator input. Create a form here or assign an existing
                  Form Master schema.
                </p>
              </div>

              {creatingFor && (
                <CreateFormForNode
                  workflowKey={key}
                  node={creatingFor}
                  onDone={() => setCreatingFor(null)}
                  onCancel={() => setCreatingFor(null)}
                />
              )}

              <div className="overflow-hidden rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Step</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Form</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nodes.map((node) => {
                      const isTask = String(node.type).toUpperCase() === 'TASK'
                      return (
                        <TableRow key={node.key}>
                          <TableCell>
                            <div className="font-medium">{node.label || node.key}</div>
                            <div className="font-mono text-[11px] text-muted-foreground">{node.key}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{node.type}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">{node.roleCode || '—'}</TableCell>
                          <TableCell>
                            {isTask ? (
                              <div className="flex min-w-[180px] flex-col gap-1.5">
                                <Select
                                  value={node.formKey || '__none__'}
                                  onValueChange={(v) => {
                                    if (v === '__none__' || v === node.formKey) return
                                    assign.mutate({ nodeKey: node.key, formKey: v })
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select form" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">No form</SelectItem>
                                    {formOptions.map((f) => (
                                      <SelectItem key={f.formKey} value={f.formKey}>
                                        {f.formKey} · {f.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {node.formKey && (
                                  <Link
                                    to={`/workflows/${key}/forms/${node.formKey}`}
                                    className="text-[11px] text-primary hover:underline"
                                  >
                                    Edit schema
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {isTask && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => setCreatingFor(node)}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                New form
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          </>
        )}
      </PageFrame>
    </Shell>
  )
}
