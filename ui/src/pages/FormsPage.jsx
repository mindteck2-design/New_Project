import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, ArrowLeft, Paperclip } from 'lucide-react'
import {
  createFormSchema,
  deleteFormSchema,
  fetchFormSchema,
  fetchFormSchemas,
  updateFormSchema,
} from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import {
  FORM_FIELD_TYPES,
  emptyFormField,
  fieldNeedsOptions,
  fieldToApiPayload,
  normalizeFieldFromApi,
} from '@/lib/formFieldTypes'
import { NAV_LABELS } from '@/lib/navConfig'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
        if (!f.name.trim() || !f.label.trim()) continue
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
      const body = {
        formKey: formKey.trim().toLowerCase(),
        name: name.trim(),
        fields: fields.filter((f) => f.name.trim() && f.label.trim()).map(fieldToApiPayload),
      }
      if (!body.fields.length) {
        throw new Error('Add at least one complete field')
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

  function updateField(index, patch) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

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
            Lowercase kebab-case. Used by workflow nodes as <code>formKey</code>.
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

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Fields</h3>
            <p className="text-xs text-muted-foreground">
              Text, select, radio, checkbox, date, attachment, and more — options for selectors are
              one per line.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setFields((p) => [...p, emptyFormField()])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="space-y-3 rounded-md border bg-background/60 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_180px_auto]">
                <div className="space-y-1.5">
                  <Label>Field name</Label>
                  <Input
                    value={field.name}
                    placeholder="torqueValue"
                    onChange={(e) =>
                      updateField(index, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Label</Label>
                  <Input
                    value={field.label}
                    placeholder="Torque value (Nm)"
                    onChange={(e) => updateField(index, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(v) =>
                      updateField(index, {
                        type: v,
                        optionsText:
                          fieldNeedsOptions(v) && !field.optionsText
                            ? 'Option A\nOption B'
                            : field.optionsText,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORM_FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-1.5 pb-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={!!field.required}
                      onChange={(e) => updateField(index, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={fields.length <= 1}
                    onClick={() => setFields((p) => p.filter((_, i) => i !== index))}
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {!fieldNeedsOptions(field.type) && field.type !== 'attachment' && field.type !== 'checkbox' && (
                  <div className="space-y-1.5">
                    <Label>Placeholder</Label>
                    <Input
                      value={field.placeholder}
                      placeholder="Optional hint shown in the input"
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                    />
                  </div>
                )}
                {field.type === 'checkbox' && (
                  <div className="space-y-1.5">
                    <Label>Checkbox caption</Label>
                    <Input
                      value={field.placeholder}
                      placeholder="I confirm this check"
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Help text</Label>
                  <Input
                    value={field.helpText}
                    placeholder="Optional guidance under the field"
                    onChange={(e) => updateField(index, { helpText: e.target.value })}
                  />
                </div>
              </div>

              {fieldNeedsOptions(field.type) && (
                <div className="space-y-1.5">
                  <Label>Options (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={field.optionsText}
                    placeholder={'PASS\nFAIL\nN/A'}
                    onChange={(e) => updateField(index, { optionsText: e.target.value })}
                  />
                </div>
              )}

              {field.type === 'attachment' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Accepted file types</Label>
                    <Input
                      value={field.accept}
                      placeholder="e.g. .pdf,.png,image/*"
                      onChange={(e) => updateField(index, { accept: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={!!field.multiple}
                      onChange={(e) => updateField(index, { multiple: e.target.checked })}
                    />
                    Allow multiple files
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Live preview
        </p>
        <div className="space-y-3">
          {fields
            .filter((f) => f.label)
            .map((f) => {
              const options = String(f.optionsText || '')
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean)
              return (
                <div key={f.name || f.label} className="space-y-1.5">
                  <Label>
                    {f.label}
                    {!f.required && (
                      <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                    )}
                  </Label>
                  {f.type === 'textarea' && (
                    <Textarea disabled placeholder={f.placeholder || ''} rows={2} />
                  )}
                  {f.type === 'select' && (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder={f.placeholder || options[0] || 'Select…'} />
                      </SelectTrigger>
                    </Select>
                  )}
                  {f.type === 'radio' && (
                    <div className="space-y-1.5 rounded-md border bg-card px-3 py-2">
                      {options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input type="radio" disabled className="h-3.5 w-3.5" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {f.type === 'checkbox' && (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" disabled className="h-3.5 w-3.5" />
                      {f.placeholder || 'Yes'}
                    </label>
                  )}
                  {f.type === 'multiselect' && (
                    <div className="space-y-1.5 rounded-md border bg-card px-3 py-2">
                      {options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input type="checkbox" disabled className="h-3.5 w-3.5" />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {f.type === 'attachment' && (
                    <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      {f.multiple ? 'Choose files' : 'Choose file'}
                      {f.accept ? ` · ${f.accept}` : ''}
                    </div>
                  )}
                  {!['textarea', 'select', 'radio', 'checkbox', 'multiselect', 'attachment'].includes(
                    f.type,
                  ) && (
                    <Input
                      disabled
                      type={
                        f.type === 'number'
                          ? 'number'
                          : f.type === 'email'
                            ? 'email'
                            : f.type === 'date'
                              ? 'date'
                              : f.type === 'time'
                                ? 'time'
                                : f.type === 'datetime'
                                  ? 'datetime-local'
                                  : 'text'
                      }
                      placeholder={f.placeholder || ''}
                    />
                  )}
                  {f.helpText && (
                    <p className="text-xs text-muted-foreground">{f.helpText}</p>
                  )}
                </div>
              )
            })}
          {!fields.some((f) => f.label) && (
            <p className="text-sm text-muted-foreground">Add field labels to preview the operator form.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={save.isPending || !formKey || !name || fields.every((f) => !f.name || !f.label)}
          onClick={() => save.mutate()}
        >
          {save.isPending ? 'Saving…' : mode === 'create' ? 'Create form in MongoDB' : 'Save changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
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
        description="Reusable checklists and stage forms. Bind a published form to each Workflow Master stage — in-progress runs keep their original structure."
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
        description="Define fields, validation, and options. Publish, then bind the form key to a Workflow Master stage."
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
