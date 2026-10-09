import { useState } from 'react'
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

export default function DynamicForm({ formKey, disabled, onSubmit }) {
  const fields = FIELD_HINTS[formKey] || [{ name: 'notes', label: 'Notes / remarks' }]
  const [values, setValues] = useState({})
  const [signature, setSignature] = useState('')

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ formPayload: values, signaturePlaceholder: signature || undefined })
      }}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Form · {formKey || 'generic'}
      </p>
      {fields.map((f) => (
        <div key={f.name} className="space-y-2">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input
            id={f.name}
            placeholder={f.placeholder || ''}
            value={values[f.name] || ''}
            disabled={disabled}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
          />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="signature">Digital signature placeholder</Label>
        <Input
          id="signature"
          value={signature}
          disabled={disabled}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Typed acknowledgement"
        />
      </div>
      <Button type="submit" disabled={disabled}>
        Complete step
      </Button>
    </form>
  )
}
