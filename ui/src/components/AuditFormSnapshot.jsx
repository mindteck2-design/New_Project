import { FormContentBlock } from '@/components/FormContentBlocks'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

function formatValue(value) {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value.length ? value.map(formatValue).join(', ') : '—'
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export default function AuditFormSnapshot({ event, onClose }) {
  if (!event) return null

  const payload = event.payload || {}
  const values = payload.formPayload && typeof payload.formPayload === 'object'
    ? payload.formPayload
    : !payload.formKey && ['COMPLETE_STEP', 'SUBMIT_FORM'].includes(event.action)
      ? payload
      : {}
  const schemaFields = Array.isArray(payload.formFields) ? payload.formFields : []
  const fields = schemaFields.length
    ? schemaFields
    : Object.keys(values).map((name) => ({ name, label: name, type: 'text' }))

  return (
    <section
      aria-labelledby="audit-form-snapshot-title"
      className="rounded-lg border bg-card"
    >
      <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="space-y-1">
          <h2 id="audit-form-snapshot-title" className="text-base font-semibold">
            {payload.formName || payload.nodeLabel || 'Submitted form'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {payload.formKey || 'Form snapshot'}
            {payload.formSchemaVersion ? ` · schema v${payload.formSchemaVersion}` : ''}
            {payload.decisionValue ? ` · ${payload.decisionValue}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close submitted form"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="space-y-4 p-5">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No form fields were recorded for this audit event.
          </p>
        )}
        {fields.map((field, index) => {
          const type = String(field.type || 'text').toLowerCase()
          if (['heading1', 'heading2', 'heading3', 'paragraph', 'callout', 'divider', 'bullets'].includes(type)) {
            return (
              <FormContentBlock
                key={`${field.name || type}-${index}`}
                block={field}
              />
            )
          }
          const hasValue = Object.prototype.hasOwnProperty.call(values, field.name)
          const value = hasValue ? values[field.name] : undefined
          return (
            <section key={field.name || index} className="space-y-1.5 border-b pb-3 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">
                  {field.label || field.name || `Field ${index + 1}`}
                  {field.required === true && <span className="ml-1 text-destructive">*</span>}
                </h3>
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {type}
                </span>
              </div>
              {field.helpText && (
                <p className="text-xs text-muted-foreground">{field.helpText}</p>
              )}
              {type === 'table' && Array.isArray(value) ? (
                <div className="space-y-2">
                  {value.length === 0 && (
                    <p className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">No rows recorded</p>
                  )}
                  {value.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
                      {Object.entries(row || {}).map(([key, cell]) => (
                        <div key={key} className="min-w-0">
                          <div className="text-xs text-muted-foreground">{key}</div>
                          <div className="whitespace-pre-wrap break-words text-sm">{formatValue(cell)}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="min-h-10 whitespace-pre-wrap break-words rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  {formatValue(value)}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )
}
