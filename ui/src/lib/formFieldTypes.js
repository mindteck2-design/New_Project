/**
 * Form Master block catalog — Notion-like docs + collectable inputs.
 * Content blocks render as layout (no payload). Input blocks collect values.
 */

export const CONTENT_BLOCK_TYPES = [
  { value: 'heading1', label: 'Heading 1', group: 'Basic', hint: 'Large section title' },
  { value: 'heading2', label: 'Heading 2', group: 'Basic', hint: 'Subsection title' },
  { value: 'heading3', label: 'Heading 3', group: 'Basic', hint: 'Small heading' },
  { value: 'paragraph', label: 'Text / Markdown', group: 'Basic', hint: 'Paragraph or notes (Markdown)' },
  { value: 'callout', label: 'Callout', group: 'Basic', hint: 'Highlighted guidance box' },
  { value: 'divider', label: 'Divider', group: 'Basic', hint: 'Horizontal rule' },
  { value: 'bullets', label: 'Bullet list', group: 'Basic', hint: 'One item per line' },
]

export const INPUT_BLOCK_TYPES = [
  { value: 'text', label: 'Short text', group: 'Input', hint: 'Single-line answer' },
  { value: 'textarea', label: 'Long text', group: 'Input', hint: 'Multi-line answer' },
  { value: 'number', label: 'Number', group: 'Input', hint: 'Numeric value' },
  { value: 'measurement', label: 'Measurement', group: 'Input', hint: 'Value + unit hint' },
  { value: 'email', label: 'Email', group: 'Input', hint: 'Email address' },
  { value: 'phone', label: 'Phone', group: 'Input', hint: 'Phone number' },
  { value: 'url', label: 'URL', group: 'Input', hint: 'Web link' },
  { value: 'date', label: 'Date', group: 'Input', hint: 'Calendar day (YYYY-MM-DD)' },
  { value: 'time', label: 'Time', group: 'Input', hint: 'Time of day' },
  { value: 'datetime', label: 'Date & time', group: 'Input', hint: 'Local date-time' },
  { value: 'select', label: 'Dropdown', group: 'Input', hint: 'Pick one option' },
  { value: 'radio', label: 'Radio', group: 'Input', hint: 'Single choice buttons' },
  { value: 'checkbox', label: 'Checkbox', group: 'Input', hint: 'Yes / no confirm' },
  { value: 'multiselect', label: 'Multi-select', group: 'Input', hint: 'Pick many options' },
  { value: 'table', label: 'Table', group: 'Input', hint: 'Rows with add/remove columns' },
  { value: 'attachment', label: 'Attachment', group: 'Input', hint: 'File upload' },
  { value: 'signature', label: 'Signature', group: 'Input', hint: 'Typed endorsement' },
]

/** @deprecated use CONTENT + INPUT — kept for FormsPage type dropdowns */
export const FORM_FIELD_TYPES = [...CONTENT_BLOCK_TYPES, ...INPUT_BLOCK_TYPES]

export const ALL_BLOCK_TYPES = FORM_FIELD_TYPES

const CONTENT_SET = new Set(CONTENT_BLOCK_TYPES.map((t) => t.value))

export function isContentBlock(type) {
  return CONTENT_SET.has(String(type || '').toLowerCase())
}

export function isInputBlock(type) {
  return !isContentBlock(type)
}

export function fieldNeedsOptions(type) {
  const t = String(type || '')
  return t === 'select' || t === 'radio' || t === 'multiselect'
}

export function isTableField(type) {
  return String(type || '').toLowerCase() === 'table'
}

export function emptyTableColumn(label = 'Column') {
  const id = newBlockId()
  return {
    id,
    key: slugifyFieldName(label, `col_${id.slice(0, 6)}`),
    label,
    keyLocked: false,
  }
}

export function defaultTableColumns() {
  return [
    emptyTableColumn('Part No'),
    emptyTableColumn('Serial No'),
    emptyTableColumn('Result'),
  ]
}

export function normalizeTableColumns(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultTableColumns()
  }
  return raw
    .map((c, i) => {
      if (c == null) return null
      if (typeof c === 'string') {
        const label = c.trim()
        if (!label) return null
        return {
          id: newBlockId(),
          key: slugifyFieldName(label, `col_${i + 1}`),
          label,
          keyLocked: true,
        }
      }
      const label = String(c.label || c.key || `Column ${i + 1}`).trim()
      let key = String(c.key || '').trim()
      if (!key) key = slugifyFieldName(label, `col_${i + 1}`)
      key = key.replace(/[^a-zA-Z0-9_]/g, '')
      if (!key || !/^[a-zA-Z]/.test(key)) key = `col_${i + 1}`
      return {
        id: c.id || newBlockId(),
        key,
        label: label || key,
        keyLocked: true,
      }
    })
    .filter(Boolean)
}

export function slugifyFieldName(label, fallback = 'field') {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
  return base || fallback
}

export function newBlockId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  }
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function emptyFormField(type = 'text') {
  const id = newBlockId()
  const content = isContentBlock(type)
  return {
    id,
    name: content ? `block_${id}` : '',
    label: content && type === 'divider' ? '—' : type === 'table' ? 'Data table' : '',
    type,
    placeholder: '',
    required: !content,
    optionsText: fieldNeedsOptions(type) ? 'Option A\nOption B' : '',
    accept: '',
    multiple: false,
    helpText: '',
    content: '',
    columns: isTableField(type) ? defaultTableColumns() : [],
  }
}

export function normalizeFieldFromApi(f) {
  const options = Array.isArray(f.options) ? f.options : []
  const type = f.type || 'text'
  const id = f.id || newBlockId()
  const content = isContentBlock(type)
  return {
    id,
    name: f.name || (content ? `block_${id}` : ''),
    label: f.label || '',
    type,
    placeholder: f.placeholder || '',
    required: content ? false : f.required !== false,
    optionsText: options.join('\n'),
    accept: f.accept || '',
    multiple: !!f.multiple,
    helpText: f.helpText || '',
    content: f.content || f.label || '',
    columns: isTableField(type) ? normalizeTableColumns(f.columns) : [],
  }
}

export function fieldToApiPayload(f) {
  const type = f.type || 'text'
  const content = isContentBlock(type)
  let name = String(f.name || '').trim()
  if (!name) {
    name = content
      ? `block_${(f.id || newBlockId()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`
      : slugifyFieldName(f.label, `field_${(f.id || 'x').slice(0, 6)}`)
  }
  if (!/^[a-zA-Z]/.test(name)) {
    name = `f_${name}`
  }

  const label = content
    ? String(f.content || f.label || (type === 'divider' ? '—' : 'Untitled')).trim()
    : String(f.label || '').trim()

  const payload = {
    id: f.id || undefined,
    name,
    label: label || name,
    type,
    placeholder: f.placeholder?.trim() || undefined,
    required: content ? false : !!f.required,
    helpText: f.helpText?.trim() || undefined,
  }

  if (content && type !== 'divider') {
    payload.content = String(f.content || f.label || '').trim() || undefined
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
  if (type === 'measurement' && f.placeholder) {
    payload.placeholder = f.placeholder.trim()
  }
  if (isTableField(type)) {
    payload.columns = normalizeTableColumns(f.columns).map((c) => ({
      key: c.key,
      label: c.label,
      id: c.id,
    }))
  }
  return payload
}
