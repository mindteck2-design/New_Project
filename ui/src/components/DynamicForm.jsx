import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

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

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  function submit(values) {
    const { signaturePlaceholder, ...formPayload } = values
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
        </p>
        {fields.map((f) => (
          <FormField
            key={f.name}
            control={form.control}
            name={f.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{f.label}</FormLabel>
                <FormControl>
                  <Input placeholder={f.placeholder || ''} disabled={disabled} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
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
        <Button type="submit" disabled={disabled || form.formState.isSubmitting}>
          Complete step
        </Button>
      </form>
    </Form>
  )
}
