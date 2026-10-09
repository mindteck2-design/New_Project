/** Master-form field types supported by builder + DynamicForm. */
export const FORM_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & time' },
  { value: 'select', label: 'Dropdown (custom options)' },
  { value: 'radio', label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkbox (yes / no)' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'attachment', label: 'Attachment / file' },
]

export function fieldNeedsOptions(type) {
  return type === 'select' || type === 'radio' || type === 'multiselect'
}

export function emptyFormField() {
  return {
    name: '',
    label: '',
    type: 'text',
    placeholder: '',
    required: true,
    optionsText: '',
    accept: '',
    multiple: false,
    helpText: '',
  }
}

export function normalizeFieldFromApi(f) {
  const options = Array.isArray(f.options) ? f.options : []
  return {
    name: f.name || '',
    label: f.label || '',
    type: f.type || 'text',
    placeholder: f.placeholder || '',
    required: f.required !== false,
    optionsText: options.join('\n'),
    accept: f.accept || '',
    multiple: !!f.multiple,
    helpText: f.helpText || '',
  }
}

export function fieldToApiPayload(f) {
  const type = f.type || 'text'
  const payload = {
    name: f.name.trim(),
    label: f.label.trim(),
    type,
    placeholder: f.placeholder?.trim() || undefined,
    required: !!f.required,
    helpText: f.helpText?.trim() || undefined,
  }
  if (fieldNeedsOptions(type)) {
    payload.options = String(f.optionsText || '')
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (type === 'attachment') {
    payload.accept = f.accept?.trim() || undefined
    payload.multiple = !!f.multiple
  }
  if (type === 'multiselect') {
    payload.multiple = true
  }
  return payload
}
