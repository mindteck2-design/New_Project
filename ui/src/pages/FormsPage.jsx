import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import {
  createFormSchema,
  deleteFormSchema,
  fetchFormSchema,
  fetchFormSchemas,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
      }
      if (!body.fields.length) {
        throw new Error('Add at least one Markdown block or input field')
      }
      if (mode === 'create') return createFormSchema(body)
      return updateFormSchema(initial.formKey, { name: body.name, fields: body.fields })
    },
    onSuccess: (data) => {
      toast.success(mode === 'create' ? 'Form schema created in MongoDB' : 'Form schema updated')
      qc.invalidateQueries({ queryKey: queryKeys.forms.all })
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
              ? 'Create form in MongoDB'
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
  const forms = useQuery({ queryKey: queryKeys.forms.all, queryFn: fetchFormSchemas })

  const remove = useMutation({
    mutationFn: deleteFormSchema,
    onSuccess: (_, formKey) => {
      toast.success(`Deleted ${formKey}`)
      qc.invalidateQueries({ queryKey: queryKeys.forms.all })
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Delete failed'),
  })

  const rows = useMemo(() => forms.data || [], [forms.data])

  return (
    <>
      <PageHeader
        title={NAV_LABELS.forms}
        description="Classic field builder plus optional Notion/Markdown document blocks. Bind a published form to each Workflow Master stage."
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

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead>Store</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Loading form schemas from MongoDB…
                </TableCell>
              </TableRow>
            )}
            {!forms.isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No form schemas yet.{' '}
                  <Link className="text-primary underline-offset-2 hover:underline" to="/forms/new">
                    Create the first one
                  </Link>
                  .
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.formKey}>
                <TableCell className="font-mono text-xs">{row.formKey}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{(row.fields || []).length}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{row.store || 'mongo'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/forms/${row.formKey}`)}>
                      Edit
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
            ))}
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
        description="Use Classic fields as before, or add Notion/Markdown blocks on top. Publish, then bind the form key to a Workflow Master stage."
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
  const backTo = workflowKey ? `/workflows/${workflowKey}` : '/forms'
  const schema = useQuery({
    queryKey: queryKeys.forms.detail(formKey),
    queryFn: () => fetchFormSchema(formKey),
    enabled: !!formKey,
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

  return (
    <>
      <PageHeader
        title={schema.data.name || formKey}
        description={
          workflowKey
            ? `Workflow form · ${workflowKey} · ${formKey}`
            : `Mongo schema · ${formKey} · ${(schema.data.fields || []).length} fields`
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
        actions={<Badge variant="outline">mongo</Badge>}
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
