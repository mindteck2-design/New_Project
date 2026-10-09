import { useState } from 'react'

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
  'serviceable-inspect': [
    { name: 'condition', label: 'Condition notes' },
  ],
  'cat-d-label': [
    { name: 'labelType', label: 'Label (Repairable / Cat D)' },
  ],
  'rotable-input': [
    { name: 'documentRefs', label: 'Document references' },
  ],
  sst: [
    { name: 'sstResult', label: 'SST / bench check notes' },
  ],
  'ndt-visual': [
    { name: 'partNo', label: 'Part No' },
    { name: 'serialNo', label: 'Serial / PO No' },
  ],
  'rt-exposure': [
    { name: 'film', label: 'Film / exposure factors' },
  ],
  'rt-examine': [{ name: 'technique', label: 'Technique / procedure' }],
  'rt-process': [{ name: 'darkroomNotes', label: 'Dark room notes' }],
  'rt-interpret': [{ name: 'interpretation', label: 'Interpretation' }],
  'ndt-endorse': [{ name: 'endorsement', label: 'Document endorsement' }],
}

export default function DynamicForm({ formKey, disabled, onSubmit }) {
  const fields = FIELD_HINTS[formKey] || [
    { name: 'notes', label: 'Notes / remarks' },
  ]
  const [values, setValues] = useState({})
  const [signature, setSignature] = useState('')

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ formPayload: values, signaturePlaceholder: signature || undefined })
      }}
    >
      <p className="text-xs uppercase tracking-wide text-[var(--steel)]/60">Form: {formKey || 'generic'}</p>
      {fields.map((f) => (
        <label key={f.name} className="block text-sm">
          <span className="font-medium">{f.label}</span>
          <input
            className="mt-1 w-full border border-[var(--line)] px-3 py-2 bg-white"
            placeholder={f.placeholder || ''}
            value={values[f.name] || ''}
            disabled={disabled}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
          />
        </label>
      ))}
      <label className="block text-sm">
        <span className="font-medium">Digital signature placeholder</span>
        <input
          className="mt-1 w-full border border-[var(--line)] px-3 py-2 bg-white"
          value={signature}
          disabled={disabled}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Typed acknowledgement"
        />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="bg-[var(--accent)] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        Complete step
      </button>
    </form>
  )
}
