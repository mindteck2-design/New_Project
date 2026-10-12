import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Paperclip } from 'lucide-react'
import { fetchFormSchema, uploadDocument } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { normalizeFormDateValues, toCalendarDate } from '@/lib/dateTime'
import { isContentBlock, isInputBlock } from '@/lib/formFieldTypes'
import { FormContentBlock } from '@/components/FormContentBlocks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

/** Offline fallback when Mongo schema API is unavailable (tests / degraded local). */
const FIELD_HINTS = {
  'spares-demand': [
    { name: 'sparesRequired', label: 'Spares required', placeholder: 'Yes / No / part list' },
    { name: 'notes', label: 'Notes' },
  ],
  'bench-test': [
    { name: 'scheduleRef', label: 'Test schedule ref' },
    { name: 'observations', label: 'Observations' },
  ],
  'repair-rework': [
    { name: 'workDone', label: 'Repair / rework performed' },
    { name: 'technician', label: 'Technician' },
  ],
  'serviceable-inspect': [{ name: 'condition', label: 'Condition notes' }],
  'cat-d-label': [{ name: 'labelType', label: 'Label (Repairable / Cat D)' }],
  'rotable-input': [{ name: 'documentRefs', label: 'Document references' }],
  sst: [{ name: 'sstResult', label: 'SST / bench check notes' }],
  'ndt-visual': [
    { name: 'partNo', label: 'Part No' },
    { name: 'serialNo', label: 'Serial / PO No' },
  ],
  'rt-exposure': [{ name: 'film', label: 'Film / exposure factors' }],
  'rt-examine': [{ name: 'technique', label: 'Technique / procedure' }],
  'rt-process': [{ name: 'darkroomNotes', label: 'Dark room notes' }],
  'rt-interpret': [{ name: 'interpretation', label: 'Interpretation' }],
  'ndt-endorse': [{ name: 'endorsement', label: 'Document endorsement' }],
}

function fieldZod(f) {
  const required = f.required !== false
  const label = f.label || f.name
  switch (f.type) {
    case 'number':
    case 'measurement': {
      let s = z.coerce.number({ invalid_type_error: `${label} must be a number` })
      return required ? s : s.optional()
    }
    case 'checkbox':
      return required
        ? z.literal(true, { errorMap: () => ({ message: `${label} is required` }) })
        : z.boolean().optional()
    case 'multiselect': {
      let s = z.array(z.string())
      return required ? s.min(1, `Select at least one ${label}`) : s.optional()
    }
    case 'attachment': {
      let s = z.string().trim()
      return required ? s.min(1, `${label} is required`) : s.optional()
    }
    case 'email': {
      let s = z.string().trim()
      s = required
        ? s.min(1, `${label} is required`).email('Enter a valid email')
        : s.email('Enter a valid email').or(z.literal(''))
      return s
    }
    case 'url': {
      let s = z.string().trim()
      return required
        ? s.min(1, `${label} is required`).url('Enter a valid URL')
        : s.url('Enter a valid URL').or(z.literal(''))
    }
    case 'date': {
      // Keep calendar dates as YYYY-MM-DD — never coerce through Date/ISO Instant.
      let s = z
        .string()
        .trim()
        .transform((v) => toCalendarDate(v))
        .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), `${label} must be YYYY-MM-DD`)
      return required ? s.refine((v) => !!v, `${label} is required`) : s.optional()
    }
    case 'signature':
    case 'phone':
    case 'textarea':
    case 'text':
    default: {
      let s = z.string().trim()
      return required ? s.min(1, `${label} is required`) : s.optional()
    }
  }
}

function buildSchema(fields) {
  const shape = {}
  for (const f of fields) {
    if (!isInputBlock(f.type) || !f.name) continue
    shape[f.name] = fieldZod(f)
  }
  shape.signaturePlaceholder = z.string().optional()
  return z.object(shape)
}

function defaultForField(f) {
  if (f.type === 'checkbox') return false
  if (f.type === 'multiselect') return []
  if (f.type === 'number') return ''
  return ''
}

export default function DynamicForm({ formKey, instanceId, disabled, onSubmit }) {
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(null)

  const schemaQuery = useQuery({
    queryKey: ['form-schema', formKey],
    queryFn: () => fetchFormSchema(formKey),
    enabled: !!formKey,
    retry: false,
    staleTime: 60_000,
  })

  const fields = useMemo(() => {
    const remote = schemaQuery.data?.fields
    if (Array.isArray(remote) && remote.length > 0) {
      return remote.map((f) => ({
        name: f.name,
        label: f.label || f.name,
        placeholder: f.placeholder || '',
        type: f.type || 'text',
        required: f.required !== false,
        options: Array.isArray(f.options) ? f.options : [],
        accept: f.accept || '',
        multiple: !!f.multiple,
        helpText: f.helpText || '',
        content: f.content || f.label || '',
      }))
    }
    return (FIELD_HINTS[formKey] || [{ name: 'notes', label: 'Notes / remarks' }]).map((f) => ({
      ...f,
      type: 'text',
      required: true,
      options: [],
      accept: '',
      multiple: false,
      helpText: '',
      content: '',
    }))
  }, [formKey, schemaQuery.data])

  const inputFields = useMemo(() => fields.filter((f) => isInputBlock(f.type)), [fields])
  const fromMongo = schemaQuery.isSuccess && Array.isArray(schemaQuery.data?.fields)
  const schema = useMemo(() => buildSchema(fields), [fields])

  const defaultValues = useMemo(() => {
    const values = { signaturePlaceholder: '' }
    for (const f of inputFields) values[f.name] = defaultForField(f)
    return values
  }, [inputFields])

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  async function handleAttachment(field, fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    if (!instanceId) {
      const names = files.map((f) => f.name).join(', ')
      form.setValue(field.name, names, { shouldValidate: true, shouldDirty: true })
      toast.message('File name recorded (upload when running on an instance)')
      return
    }
    setUploading(field.name)
    try {
      const uploaded = []
      for (const file of files) {
        const doc = await uploadDocument(instanceId, file)
        uploaded.push(doc.fileName || file.name)
      }
      const existing = form.getValues(field.name)
      const next = field.multiple && existing
        ? `${existing}, ${uploaded.join(', ')}`
        : uploaded.join(', ')
      form.setValue(field.name, next, { shouldValidate: true, shouldDirty: true })
      qc.invalidateQueries({ queryKey: queryKeys.instances.documents(instanceId) })
      toast.success(uploaded.length === 1 ? 'Attachment uploaded' : `${uploaded.length} files uploaded`)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  function submit(values) {
    const { signaturePlaceholder, ...rawPayload } = values
    const formPayload = normalizeFormDateValues(inputFields, rawPayload)
    onSubmit({
      formPayload,
      signaturePlaceholder: signaturePlaceholder?.trim() || undefined,
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)} noValidate>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Form · {formKey || 'generic'}
          {fromMongo ? ' · Mongo schema' : schemaQuery.isError ? ' · local fallback' : ''}
        </p>
        {schemaQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading form schema from MongoDB…</p>
        )}
        {fields.map((f, idx) => {
          if (isContentBlock(f.type)) {
            return <FormContentBlock key={`${f.name || 'c'}-${idx}`} block={f} />
          }
          return (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {f.label}
                    {f.required === false && (
                      <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <FieldControl
                      fieldDef={f}
                      field={field}
                      disabled={disabled}
                      uploading={uploading === f.name}
                      onFiles={(list) => handleAttachment(f, list)}
                    />
                  </FormControl>
                  {f.helpText ? <FormDescription>{f.helpText}</FormDescription> : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          )
        })}
        {inputFields.some((f) => f.type === 'signature') ? null : (
          <FormField
            control={form.control}
            name="signaturePlaceholder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Digital signature placeholder</FormLabel>
                <FormControl>
                  <Input disabled={disabled} placeholder="Typed acknowledgement" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" disabled={disabled || form.formState.isSubmitting || !!uploading}>
          {inputFields.length ? 'Complete step' : 'Acknowledge & continue'}
        </Button>
      </form>
    </Form>
  )
}

function FieldControl({ fieldDef: f, field, disabled, uploading, onFiles }) {
  if (f.type === 'textarea' || f.type === 'signature') {
    return (
      <Textarea
        placeholder={f.placeholder || (f.type === 'signature' ? 'Type full name to endorse' : '')}
        disabled={disabled}
        rows={f.type === 'signature' ? 2 : 3}
        {...field}
      />
    )
  }

  if (f.type === 'select') {
    return (
      <Select value={field.value || undefined} onValueChange={field.onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={f.placeholder || 'Select…'} />
        </SelectTrigger>
        <SelectContent>
          {(f.options || []).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (f.type === 'radio') {
    return (
      <div className="space-y-2 rounded-md border px-3 py-2">
        {(f.options || []).map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              className="h-4 w-4 accent-primary"
              name={field.name}
              value={opt}
              checked={field.value === opt}
              disabled={disabled}
              onChange={() => field.onChange(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    )
  }

  if (f.type === 'checkbox') {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={!!field.value}
          disabled={disabled}
          onChange={(e) => field.onChange(e.target.checked)}
        />
        {f.placeholder || 'Yes'}
      </label>
    )
  }

  if (f.type === 'multiselect') {
    const selected = Array.isArray(field.value) ? field.value : []
    return (
      <div className="space-y-2 rounded-md border px-3 py-2">
        {(f.options || []).map((opt) => {
          const checked = selected.includes(opt)
          return (
            <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  field.onChange(
                    checked ? selected.filter((v) => v !== opt) : [...selected, opt],
                  )
                }}
              />
              {opt}
            </label>
          )
        })}
      </div>
    )
  }

  if (f.type === 'attachment') {
    return (
      <div className="space-y-2">
        <Label className="flex cursor-pointer flex-col items-start gap-2 rounded-md border border-dashed px-3 py-3 text-sm hover:bg-muted/40">
          <span className="inline-flex items-center gap-2 font-medium">
            <Paperclip className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : f.multiple ? 'Choose files' : 'Choose file'}
          </span>
          <input
            type="file"
            className="text-xs text-muted-foreground"
            disabled={disabled || uploading}
            accept={f.accept || undefined}
            multiple={!!f.multiple}
            onChange={(e) => {
              onFiles?.(e.target.files)
              e.target.value = ''
            }}
          />
        </Label>
        {field.value ? (
          <p className="text-xs text-muted-foreground">Attached: {field.value}</p>
        ) : null}
      </div>
    )
  }

  const inputType =
    f.type === 'number' || f.type === 'measurement'
      ? 'number'
      : f.type === 'email'
        ? 'email'
        : f.type === 'url'
          ? 'url'
          : f.type === 'phone'
            ? 'tel'
            : f.type === 'date'
              ? 'date'
              : f.type === 'time'
                ? 'time'
                : f.type === 'datetime'
                  ? 'datetime-local'
                  : 'text'

  const value =
    f.type === 'date' ? toCalendarDate(field.value) : (field.value ?? '')

  return (
    <Input
      type={inputType}
      placeholder={f.placeholder || ''}
      disabled={disabled}
      name={field.name}
      ref={field.ref}
      onBlur={field.onBlur}
      onChange={(e) => {
        if (f.type === 'date') {
          field.onChange(toCalendarDate(e.target.value))
          return
        }
        field.onChange(e)
      }}
      value={value}
    />
  )
}
