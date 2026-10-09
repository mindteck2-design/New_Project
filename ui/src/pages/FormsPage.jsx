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

function emptyField() {
  return { name: '', label: '', type: 'text', placeholder: '', required: true }
}

function FormEditor({ mode, initial, onCancel }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [formKey, setFormKey] = useState(initial?.formKey || '')
  const [name, setName] = useState(initial?.name || '')
  const [fields, setFields] = useState(
    initial?.fields?.length
      ? initial.fields.map((f) => ({
          name: f.name || '',
          label: f.label || '',
          type: f.type || 'text',
          placeholder: f.placeholder || '',
          required: f.required !== false,
        }))
      : [emptyField(), emptyField()],
  )

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        formKey: formKey.trim().toLowerCase(),
        name: name.trim(),
        fields: fields.map((f) => ({
          name: f.name.trim(),
          label: f.label.trim(),
          type: f.type || 'text',
          placeholder: f.placeholder?.trim() || undefined,
          required: !!f.required,
        })),
      }
      if (mode === 'create') return createFormSchema(body)
      return updateFormSchema(initial.formKey, { name: body.name, fields: body.fields })
    },
    onSuccess: (data) => {
      toast.success(mode === 'create' ? 'Form schema created in MongoDB' : 'Form schema updated')
      qc.invalidateQueries({ queryKey: queryKeys.forms.all })
      qc.invalidateQueries({ queryKey: queryKeys.forms.detail(data.formKey) })
      navigate(`/forms/${data.formKey}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not save form schema'),
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
          <h3 className="text-sm font-semibold tracking-tight">Fields</h3>
          <Button type="button" size="sm" variant="outline" onClick={() => setFields((p) => [...p, emptyField()])}>
            <Plus className="h-3.5 w-3.5" />
            Add field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-md border bg-background/60 p-3 sm:grid-cols-[1fr_1fr_140px_auto]"
            >
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
              </div>
              <div className="flex items-end">
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
              <div className="space-y-1.5 sm:col-span-3">
                <Label>Placeholder</Label>
                <Input
                  value={field.placeholder}
                  placeholder="Optional hint shown in the input"
                  onChange={(e) => updateField(index, { placeholder: e.target.value })}
                />
              </div>
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
            .map((f) => (
              <div key={f.name || f.label} className="space-y-1.5">
                <Label>{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea disabled placeholder={f.placeholder || ''} rows={2} />
                ) : (
                  <Input disabled type={f.type === 'number' ? 'number' : 'text'} placeholder={f.placeholder || ''} />
                )}
              </div>
            ))}
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
        title="Dynamic forms"
        description="Create and edit MongoDB form schemas used by workflow steps. Operators fill these at runtime."
        backTo="/"
        backLabel="Dashboard"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Dynamic forms' },
        ]}
        actions={
          <Button asChild size="sm">
            <Link to="/forms/new">
              <Plus className="h-3.5 w-3.5" />
              Create form
            </Link>
          </Button>
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
        title="Create dynamic form"
        description="Define a MongoDB form schema. Attach its form key to a workflow node to collect data at that step."
        backTo="/forms"
        backLabel="Forms"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Dynamic forms', to: '/forms' },
          { label: 'Create' },
        ]}
      />
      <FormEditor mode="create" onCancel={() => navigate('/forms')} />
    </>
  )
}

function FormDetailPage() {
  const { formKey } = useParams()
  const navigate = useNavigate()
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
          <Link to="/forms">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to forms
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={schema.data.name || formKey}
        description={`Mongo schema · ${formKey} · ${(schema.data.fields || []).length} fields`}
        backTo="/forms"
        backLabel="Forms"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Dynamic forms', to: '/forms' },
          { label: formKey },
        ]}
        actions={<Badge variant="outline">mongo</Badge>}
      />
      <FormEditor mode="edit" initial={schema.data} onCancel={() => navigate('/forms')} />
    </>
  )
}

export default function FormsPage() {
  const { formKey } = useParams()
  const isNew = formKey === 'new'
  const isDetail = formKey && formKey !== 'new'

  return (
    <Shell>
      <PageFrame>
        {!formKey && <FormsList />}
        {isNew && <FormCreatePage />}
        {isDetail && <FormDetailPage />}
      </PageFrame>
    </Shell>
  )
}
