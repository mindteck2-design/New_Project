import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Copy, Plus } from 'lucide-react'
import {
  cloneFormSchema,
  createFormSchema,
  deleteFormSchema,
  draftFormSchema,
  fetchFormSchema,
  fetchFormSchemas,
  publishFormSchema,
  updateFormSchema,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  emptyFormField,
  fieldNeedsOptions,
  fieldToApiPayload,
  isContentBlock,
  isInputBlock,
  normalizeFieldFromApi,
} from '@/lib/formFieldTypes'
import { NAV_LABELS } from '@/lib/navConfig'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import ClassicFormFieldsEditor from '@/components/ClassicFormFieldsEditor'
import NotionFormBuilder from '@/components/NotionFormBuilder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function statusBadgeVariant(status) {
  return String(status).toUpperCase() === 'PUBLISHED' ? 'default' : 'outline'
}

function FormEditor({ mode, initial, onCancel, workflowKey }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [formKey, setFormKey] = useState(initial?.formKey || '')
  const [name, setName] = useState(initial?.name || '')
  const [fields, setFields] = useState(
    initial?.fields?.length
      ? initial.fields.map(normalizeFieldFromApi)
      : [emptyFormField(), emptyFormField()],
  )

  const save = useMutation({
    mutationFn: async () => {
      for (const f of fields) {
        if (isContentBlock(f.type)) continue
        if (!String(f.label || '').trim()) continue
        if (fieldNeedsOptions(f.type)) {
          const opts = String(f.optionsText || '')
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
          if (!opts.length) {
            throw new Error(`${f.label || f.name}: add at least one option (one per line)`)
          }
        }
      }
      const payloadFields = fields
        .filter((f) => {
          if (isContentBlock(f.type)) {
            return f.type === 'divider' || String(f.content || f.label || '').trim()
          }
          return String(f.label || '').trim()
        })
        .map(fieldToApiPayload)
      const body = {
        formKey: formKey.trim().toLowerCase(),
        name: name.trim(),
        fields: payloadFields,
        status: mode === 'create' ? 'DRAFT' : undefined,
      }
      if (!body.fields.length) {
        throw new Error('Add at least one Markdown block or input field')
      }
      if (mode === 'create') return createFormSchema(body)
      return updateFormSchema(initial.formKey, { name: body.name, fields: body.fields })
    },
    onSuccess: (data) => {
      toast.success(mode === 'create' ? 'Draft form created' : 'Form schema saved')
      qc.invalidateQueries({ queryKey: ['form-schemas'] })
      qc.invalidateQueries({ queryKey: queryKeys.forms.detail(data.formKey) })
      if (workflowKey) {
        qc.invalidateQueries({ queryKey: queryKeys.workflows.detail(workflowKey) })
        navigate(`/workflows/${workflowKey}`)
      } else {
        navigate(`/forms/${data.formKey}`)
      }
    },
    onError: (err) =>
      toast.error(err?.response?.data?.message || err?.message || 'Could not save form schema'),
  })

  const canSave =
    !!formKey.trim() &&
    !!name.trim() &&
    fields.some((f) =>
      isContentBlock(f.type)
        ? f.type === 'divider' || String(f.content || f.label || '').trim()
        : String(f.label || '').trim(),
    )

  return (
    <div className="space-y-5 rounded-lg border bg-card p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="formKey">Form key</Label>
          <Input
            id="formKey"
            value={formKey}
            disabled={mode === 'edit'}
            placeholder="e.g. torque-check"
            onChange={(e) => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          />
          <p className="text-xs text-muted-foreground">
            Lowercase kebab-case. Used by workflow stages as <code>formKey</code>.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="formName">Display name</Label>
          <Input
            id="formName"
            value={name}
            placeholder="Torque check sheet"
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </div>

      {mode === 'edit' && initial && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={statusBadgeVariant(initial.status)}>{initial.status || 'PUBLISHED'}</Badge>
          <Badge variant="secondary">v{initial.version || 1}</Badge>
          {initial.clonedFrom && (
            <span className="text-xs text-muted-foreground">Cloned from {initial.clonedFrom}</span>
          )}
        </div>
      )}

      <Tabs defaultValue="classic" className="w-full">
        <TabsList>
          <TabsTrigger value="classic">Classic fields</TabsTrigger>
          <TabsTrigger value="notion">Notion + Markdown</TabsTrigger>
        </TabsList>
        <TabsContent value="classic">
          <ClassicFormFieldsEditor fields={fields} onChange={setFields} />
        </TabsContent>
        <TabsContent value="notion">
          <NotionFormBuilder fields={fields} onChange={setFields} />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={save.isPending || !canSave} onClick={() => save.mutate()}>
          {save.isPending
            ? 'Saving…'
            : mode === 'create'
              ? 'Save as draft'
              : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        {fields.some(isInputBlock) ? null : (
          <p className="w-full text-xs text-muted-foreground">
            Docs-only Markdown page is allowed — add an input field when you need operator answers.
          </p>
        )}
      </div>
    </div>
  )
}

function FormsList() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [cloneTarget, setCloneTarget] = useState(null)
  const [cloneKey, setCloneKey] = useState('')
  const [cloneName, setCloneName] = useState('')

  const listFilters = useMemo(
    () => ({ status: statusFilter === 'ALL' ? undefined : statusFilter }),
    [statusFilter],
  )

  const forms = useQuery({
    queryKey: queryKeys.forms.list(listFilters),
    queryFn: () => fetchFormSchemas(listFilters),
  })

  const remove = useMutation({
    mutationFn: deleteFormSchema,
    onSuccess: (_, formKey) => {
      toast.success(`Deleted ${formKey}`)
      qc.invalidateQueries({ queryKey: ['form-schemas'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Delete failed'),
  })

  const publish = useMutation({
    mutationFn: publishFormSchema,
    onSuccess: (data) => {
      toast.success(`Published ${data.formKey} (v${data.version})`)
      qc.invalidateQueries({ queryKey: ['form-schemas'] })
      qc.invalidateQueries({ queryKey: queryKeys.forms.detail(data.formKey) })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Publish failed'),
  })

  const draft = useMutation({
    mutationFn: draftFormSchema,
    onSuccess: (data) => {
      toast.success(`${data.formKey} set to draft`)
      qc.invalidateQueries({ queryKey: ['form-schemas'] })
      qc.invalidateQueries({ queryKey: queryKeys.forms.detail(data.formKey) })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not set draft'),
  })

  const clone = useMutation({
    mutationFn: () =>
      cloneFormSchema(cloneTarget.formKey, {
        newKey: cloneKey.trim().toLowerCase(),
        name: cloneName.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success(`Cloned as ${data.formKey}`)
      setCloneTarget(null)
      setCloneKey('')
      setCloneName('')
      qc.invalidateQueries({ queryKey: ['form-schemas'] })
      navigate(`/forms/${data.formKey}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not clone form'),
  })

  const rows = useMemo(() => forms.data || [], [forms.data])

  return (
    <>
      <PageHeader
        title={NAV_LABELS.forms}
        description="Classic field builder plus optional Notion/Markdown blocks. Save drafts, publish for Workflow Master, or clone to revise without losing the live key."
        backTo="/"
        backLabel={NAV_LABELS.dashboard}
        breadcrumbs={[
          { label: NAV_LABELS.dashboard, to: '/' },
          { label: NAV_LABELS.forms },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/workflows">{NAV_LABELS.workflows}</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/forms/new">
                <Plus className="h-3.5 w-3.5" />
                Create form
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3 sm:p-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {cloneTarget && (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-accent/20 p-4">
          <p className="text-sm font-semibold">
            Clone form · {cloneTarget.name} ({cloneTarget.formKey})
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>New key</Label>
              <Input
                value={cloneKey}
                onChange={(e) => setCloneKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
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
              {clone.isPending ? 'Cloning…' : 'Clone as draft'}
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
              <TableHead>Form key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Loading form schemas from MongoDB…
                </TableCell>
              </TableRow>
            )}
            {!forms.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No form schemas yet.{' '}
                  <Link className="text-primary underline-offset-2 hover:underline" to="/forms/new">
                    Create the first one
                  </Link>
                  .
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const status = String(row.status || 'PUBLISHED').toUpperCase()
              const isPublished = status === 'PUBLISHED'
              return (
                <TableRow key={row.formKey}>
                  <TableCell className="font-mono text-xs">{row.formKey}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">v{row.version || 1}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{(row.fields || []).length}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/forms/${row.formKey}`)}>
                        Edit
                      </Button>
                      {isPublished ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={draft.isPending}
                          onClick={() => draft.mutate(row.formKey)}
                        >
                          Unpublish
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={publish.isPending}
                          onClick={() => publish.mutate(row.formKey)}
                        >
                          Publish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setCloneTarget(row)
                          setCloneKey(`${row.formKey}-copy`.slice(0, 63))
                          setCloneName(`${row.name} (copy)`)
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Clone
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete form schema “${row.formKey}”?`)) {
                            remove.mutate(row.formKey)
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function FormCreatePage() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader
        title="Create form"
        description="Starts as a draft. Publish when ready to bind to Workflow Master stages."
        backTo="/forms"
        backLabel={NAV_LABELS.forms}
        breadcrumbs={[
          { label: NAV_LABELS.dashboard, to: '/' },
          { label: NAV_LABELS.forms, to: '/forms' },
          { label: 'Create' },
        ]}
      />
      <FormEditor mode="create" onCancel={() => navigate('/forms')} />
    </>
  )
}

function FormDetailPage({ workflowKey }) {
  const { formKey } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const backTo = workflowKey ? `/workflows/${workflowKey}` : '/forms'
  const schema = useQuery({
    queryKey: queryKeys.forms.detail(formKey),
    queryFn: () => fetchFormSchema(formKey),
    enabled: !!formKey,
  })

  const publish = useMutation({
    mutationFn: () => publishFormSchema(formKey),
    onSuccess: (data) => {
      toast.success(`Published v${data.version}`)
      qc.invalidateQueries({ queryKey: queryKeys.forms.detail(formKey) })
      qc.invalidateQueries({ queryKey: ['form-schemas'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Publish failed'),
  })

  const draft = useMutation({
    mutationFn: () => draftFormSchema(formKey),
    onSuccess: () => {
      toast.success('Set to draft')
      qc.invalidateQueries({ queryKey: queryKeys.forms.detail(formKey) })
      qc.invalidateQueries({ queryKey: ['form-schemas'] })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not set draft'),
  })

  if (schema.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading schema…</p>
  }
  if (schema.isError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Form schema not found: {formKey}</p>
        <Button asChild variant="outline" size="sm">
          <Link to={backTo}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </Button>
      </div>
    )
  }

  const status = String(schema.data.status || 'PUBLISHED').toUpperCase()
  const isPublished = status === 'PUBLISHED'

  return (
    <>
      <PageHeader
        title={schema.data.name || formKey}
        description={
          workflowKey
            ? `Workflow form · ${workflowKey} · ${formKey}`
            : `Mongo schema · ${formKey} · ${status} · v${schema.data.version || 1}`
        }
        backTo={backTo}
        backLabel={workflowKey ? NAV_LABELS.workflows : NAV_LABELS.forms}
        breadcrumbs={
          workflowKey
            ? [
                { label: NAV_LABELS.dashboard, to: '/' },
                { label: NAV_LABELS.workflows, to: '/workflows' },
                { label: workflowKey, to: `/workflows/${workflowKey}` },
                { label: formKey },
              ]
            : [
                { label: NAV_LABELS.dashboard, to: '/' },
                { label: NAV_LABELS.forms, to: '/forms' },
                { label: formKey },
              ]
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
            <Badge variant="secondary">v{schema.data.version || 1}</Badge>
            {isPublished ? (
              <Button size="sm" variant="outline" disabled={draft.isPending} onClick={() => draft.mutate()}>
                Unpublish
              </Button>
            ) : (
              <Button size="sm" disabled={publish.isPending} onClick={() => publish.mutate()}>
                Publish
              </Button>
            )}
          </div>
        }
      />
      <FormEditor
        mode="edit"
        initial={schema.data}
        workflowKey={workflowKey}
        onCancel={() => navigate(backTo)}
      />
    </>
  )
}

export default function FormsPage() {
  const { formKey, key: workflowKey } = useParams()
  const isNew = formKey === 'new'
  const isDetail = formKey && formKey !== 'new'

  return (
    <Shell>
      <PageFrame>
        {!formKey && <FormsList />}
        {isNew && <FormCreatePage />}
        {isDetail && <FormDetailPage workflowKey={workflowKey} />}
      </PageFrame>
    </Shell>
  )
}
