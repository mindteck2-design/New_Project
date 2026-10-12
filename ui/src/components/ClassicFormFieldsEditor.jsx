import { Plus, Trash2, Paperclip } from 'lucide-react'
import {
  FORM_FIELD_TYPES,
  emptyFormField,
  fieldNeedsOptions,
  isContentBlock,
} from '@/lib/formFieldTypes'
import { FormContentBlock } from '@/components/FormContentBlocks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Previous Form Master field editor (textfield-centric) — preserved.
 * Content / Markdown blocks show a read-only Notion render; edit them in the Notion tab.
 */
export default function ClassicFormFieldsEditor({ fields, onChange }) {
  function updateField(index, patch) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Fields</h3>
          <p className="text-xs text-muted-foreground">
            Text, select, radio, checkbox, date, attachment, and more — options for selectors are one
            per line. Use the Notion tab for Markdown document blocks.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...fields, emptyFormField('text')])}
        >
          <Plus className="h-3.5 w-3.5" />
          Add field
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id || `${field.name}-${index}`}
            className="space-y-3 rounded-md border bg-background/60 p-3"
          >
            {isContentBlock(field.type) ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Markdown / Notion block · {field.type}
                  </p>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={fields.length <= 1}
                    onClick={() => onChange(fields.filter((_, i) => i !== index))}
                    aria-label="Remove field"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="rounded-md border bg-card px-3 py-2">
                  <FormContentBlock block={field} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Switch to the <span className="font-medium">Notion + Markdown</span> tab to edit
                  this block.
                </p>
              </div>
            ) : (
              <>
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
                      onClick={() => onChange(fields.filter((_, i) => i !== index))}
                      aria-label="Remove field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {!fieldNeedsOptions(field.type) &&
                    field.type !== 'attachment' &&
                    field.type !== 'checkbox' && (
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
              </>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Live preview
        </p>
        <div className="space-y-3">
          {fields
            .filter((f) => f.label || f.content || f.type === 'divider')
            .map((f, i) => {
              if (isContentBlock(f.type)) {
                return <FormContentBlock key={f.id || `${f.name}-${i}`} block={f} />
              }
              const options = String(f.optionsText || '')
                .split(/[\n,]/)
                .map((s) => s.trim())
                .filter(Boolean)
              return (
                <div key={f.id || f.name || f.label} className="space-y-1.5">
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
                        <label
                          key={opt}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
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
                        <label
                          key={opt}
                          className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
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
                        f.type === 'number' || f.type === 'measurement'
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
                  {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
                </div>
              )
            })}
          {!fields.some((f) => f.label || f.content || f.type === 'divider') && (
            <p className="text-sm text-muted-foreground">Add field labels to preview the operator form.</p>
          )}
        </div>
      </div>
    </div>
  )
}
