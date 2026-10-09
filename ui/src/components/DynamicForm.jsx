import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

function buildSchema(fields) {
  const shape = {}
  for (const f of fields) {
    shape[f.name] = z.string().trim().min(1, `${f.label} is required`)
  }
  shape.signaturePlaceholder = z.string().optional()
  return z.object(shape)
}

export default function DynamicForm({ formKey, disabled, onSubmit }) {
  const fields = useMemo(
    () => FIELD_HINTS[formKey] || [{ name: 'notes', label: 'Notes / remarks' }],
    [formKey],
  )
  const schema = useMemo(() => buildSchema(fields), [fields])

  const defaultValues = useMemo(() => {
    const values = { signaturePlaceholder: '' }
    for (const f of fields) values[f.name] = ''
    return values
  }, [fields])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
  })

  useEffect(() => {
    reset(defaultValues)
  }, [defaultValues, reset])

  function submit(values) {
    const { signaturePlaceholder, ...formPayload } = values
    onSubmit({
      formPayload,
      signaturePlaceholder: signaturePlaceholder?.trim() || undefined,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)} noValidate>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Form · {formKey || 'generic'}
      </p>
      {fields.map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input
            id={f.name}
            placeholder={f.placeholder || ''}
            disabled={disabled}
            aria-invalid={!!errors[f.name]}
            {...register(f.name)}
          />
          {errors[f.name] && (
            <p className="text-xs text-destructive">{errors[f.name].message}</p>
          )}
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="signaturePlaceholder">Digital signature placeholder</Label>
        <Input
          id="signaturePlaceholder"
          disabled={disabled}
          placeholder="Typed acknowledgement"
          {...register('signaturePlaceholder')}
        />
      </div>
      <Button type="submit" disabled={disabled || isSubmitting}>
        Complete step
      </Button>
    </form>
  )
}
