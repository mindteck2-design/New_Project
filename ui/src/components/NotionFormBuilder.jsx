import { useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Table2,
  Trash2,
  Type,
} from 'lucide-react'
import {
  ALL_BLOCK_TYPES,
  CONTENT_BLOCK_TYPES,
  DATA_BLOCK_TYPES,
  INPUT_BLOCK_TYPES,
  defaultTableColumns,
  emptyFormField,
  fieldNeedsOptions,
  isContentBlock,
  isTableField,
  slugifyFieldName,
} from '@/lib/formFieldTypes'
import { FormContentBlock } from '@/components/FormContentBlocks'
import TableColumnsEditor from '@/components/TableColumnsEditor'
import TableFieldInput from '@/components/TableFieldInput'
import Markdown from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

function typeMeta(type) {
  return ALL_BLOCK_TYPES.find((t) => t.value === type) || { label: type, hint: '' }
}

function InsertMenu({ onPick, children }) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const all = [...CONTENT_BLOCK_TYPES, ...DATA_BLOCK_TYPES, ...INPUT_BLOCK_TYPES]
    if (!needle) return all
    return all.filter(
      (t) =>
        t.label.toLowerCase().includes(needle) ||
        t.value.includes(needle) ||
        t.hint?.toLowerCase().includes(needle),
    )
  }, [q])

  const basic = filtered.filter((t) => t.group === 'Basic')
  const data = filtered.filter((t) => t.group === 'Data')
  const inputs = filtered.filter((t) => t.group === 'Input')

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setQ('')
      }}
    >
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="start">
        <div className="border-b p-2">
          <Input
            autoFocus
            value={q}
            placeholder="Filter blocks… try “table”"
            className="h-8"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {basic.length > 0 && (
            <>
              <DropdownMenuLabel>Basic — notes & docs</DropdownMenuLabel>
              {basic.map((t) => (
                <DropdownMenuItem
                  key={t.value}
                  className="flex flex-col items-start gap-0.5"
                  onSelect={() => onPick(t.value)}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground">{t.hint}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
          {data.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Data — grids</DropdownMenuLabel>
              {data.map((t) => (
                <DropdownMenuItem
                  key={t.value}
                  className="flex flex-col items-start gap-0.5"
                  onSelect={() => onPick(t.value)}
                >
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Table2 className="h-3.5 w-3.5" />
                    {t.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{t.hint}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
          {inputs.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Inputs — collect answers</DropdownMenuLabel>
              {inputs.map((t) => (
                <DropdownMenuItem
                  key={t.value}
                  className="flex flex-col items-start gap-0.5"
                  onSelect={() => onPick(t.value)}
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground">{t.hint}</span>
                </DropdownMenuItem>
              ))}
            </>
          )}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No matching blocks</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BlockRow({
  field,
  index,
  total,
  updateField,
  onRemove,
  onMove,
  onInsertAfter,
}) {
  const content = isContentBlock(field.type)
  const meta = typeMeta(field.type)
  const textRef = useRef(null)

  function handleSlash(e) {
    const v = e.target.value
    if (v === '/' || (content && v.endsWith('\n/'))) {
      // leave value; user opens + menu — Notion-like cue
    }
    if (content) {
      updateField({ content: v, label: v })
    }
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card/80 transition-colors hover:border-primary/30',
        content ? 'border-dashed' : 'border-solid',
      )}
    >
      <div className="flex items-start gap-1 px-1.5 pt-1.5">
        <div className="flex shrink-0 flex-col items-center gap-0.5 pt-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            aria-label="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            disabled={index >= total - 1}
            onClick={() => onMove(1)}
            aria-label="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="min-w-0 flex-1 space-y-2 px-1 pb-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-normal">
              {meta.label}
            </Badge>
            {!content && (
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-primary"
                  checked={!!field.required}
                  onChange={(e) => updateField({ required: e.target.checked })}
                />
                Required
              </label>
            )}
            <div className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Select
                value={field.type}
                onValueChange={(v) =>
                  updateField({
                    type: v,
                    required: !isContentBlock(v),
                    optionsText:
                      fieldNeedsOptions(v) && !field.optionsText
                        ? 'Option A\nOption B'
                        : field.optionsText,
                    columns:
                      isTableField(v) && !(field.columns || []).length
                        ? defaultTableColumns()
                        : field.columns,
                    label:
                      isTableField(v) && !field.label ? 'Data table' : field.label,
                    name:
                      isContentBlock(v) && !field.name?.startsWith('block_')
                        ? `block_${field.id || 'x'}`
                        : field.name,
                  })
                }
              >
                <SelectTrigger className="h-7 w-[9.5rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem disabled value="__basic">
                    — Basic —
                  </SelectItem>
                  {CONTENT_BLOCK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                  <SelectItem disabled value="__data">
                    — Data —
                  </SelectItem>
                  {DATA_BLOCK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                  <SelectItem disabled value="__input">
                    — Input —
                  </SelectItem>
                  {INPUT_BLOCK_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={total <= 1}
                onClick={onRemove}
                aria-label="Delete block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {content ? (
            field.type === 'divider' ? (
              <div className="py-2">
                <hr className="border-border" />
                <p className="mt-1 text-[11px] text-muted-foreground">Divider</p>
              </div>
            ) : (
              <Tabs defaultValue="textfield" className="w-full">
                <TabsList className="mb-2 h-8">
                  <TabsTrigger value="textfield" className="h-7 text-xs">
                    Text field
                  </TabsTrigger>
                  <TabsTrigger value="notion" className="h-7 text-xs">
                    Notion preview
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="textfield" className="mt-0 space-y-1.5">
                  {field.type.startsWith('heading') ? (
                    <Input
                      ref={textRef}
                      className={cn(
                        field.type === 'heading1' && 'text-lg font-semibold',
                        field.type === 'heading2' && 'font-semibold',
                      )}
                      placeholder={`Markdown heading text…`}
                      value={field.content || field.label || ''}
                      onChange={(e) => handleSlash(e)}
                    />
                  ) : (
                    <Textarea
                      ref={textRef}
                      rows={field.type === 'callout' || field.type === 'bullets' ? 3 : 5}
                      placeholder={
                        field.type === 'bullets'
                          ? 'One item per line (Markdown list)'
                          : field.type === 'callout'
                            ? 'Callout Markdown…'
                            : 'Write Markdown — **bold**, lists, tables, links, `code` (GFM)…'
                      }
                      value={field.content || field.label || ''}
                      onChange={(e) => handleSlash(e)}
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Edit as plain text / Markdown. Switch to Notion preview to see rendered output.
                  </p>
                </TabsContent>
                <TabsContent value="notion" className="mt-0">
                  <div
                    className={cn(
                      'min-h-[4.5rem] rounded-md border bg-background px-3 py-2',
                      field.type === 'callout' && 'border-amber-200 bg-amber-50/60',
                    )}
                  >
                    {(field.content || field.label) ? (
                      <FormContentBlock block={field} />
                    ) : (
                      <p className="text-sm text-muted-foreground">Nothing to preview yet — type in Text field.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )
          ) : (
            <Tabs defaultValue="textfield" className="w-full">
              <TabsList className="mb-2 h-8">
                <TabsTrigger value="textfield" className="h-7 text-xs">
                  Text field
                </TabsTrigger>
                <TabsTrigger value="notion" className="h-7 text-xs">
                  Notion preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="textfield" className="mt-0 space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Label</Label>
                    <Input
                      value={field.label}
                      placeholder="Question / field label"
                      onChange={(e) => {
                        const label = e.target.value
                        const patch = { label }
                        if (!field.name?.trim()) {
                          patch.name = slugifyFieldName(label)
                        }
                        updateField(patch)
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Field key</Label>
                    <Input
                      value={field.name}
                      placeholder="torqueValue"
                      className="font-mono text-xs"
                      onChange={(e) =>
                        updateField({ name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })
                      }
                    />
                  </div>
                </div>
                {field.type !== 'checkbox' &&
                  field.type !== 'attachment' &&
                  !fieldNeedsOptions(field.type) &&
                  !isTableField(field.type) && (
                  <Input
                    value={field.placeholder}
                    placeholder={
                      field.type === 'measurement'
                        ? 'Unit hint e.g. Nm, psi, mm'
                        : 'Placeholder'
                    }
                    onChange={(e) => updateField({ placeholder: e.target.value })}
                  />
                )}
                {field.type === 'checkbox' && (
                  <Input
                    value={field.placeholder}
                    placeholder="Checkbox caption e.g. I confirm this check"
                    onChange={(e) => updateField({ placeholder: e.target.value })}
                  />
                )}
                <Input
                  value={field.helpText}
                  placeholder="Help text (optional) — supports Markdown in Notion preview"
                  onChange={(e) => updateField({ helpText: e.target.value })}
                />
                {fieldNeedsOptions(field.type) && (
                  <Textarea
                    rows={3}
                    value={field.optionsText}
                    placeholder={'PASS\nFAIL\nN/A'}
                    onChange={(e) => updateField({ optionsText: e.target.value })}
                  />
                )}
                {isTableField(field.type) && (
                  <TableColumnsEditor
                    columns={field.columns}
                    onChange={(columns) => updateField({ columns })}
                  />
                )}
                {field.type === 'attachment' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={field.accept}
                      placeholder="Accept e.g. .pdf,.png,image/*"
                      onChange={(e) => updateField({ accept: e.target.value })}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-primary"
                        checked={!!field.multiple}
                        onChange={(e) => updateField({ multiple: e.target.checked })}
                      />
                      Multiple files
                    </label>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="notion" className="mt-0">
                <div className="space-y-2 rounded-md border bg-background px-3 py-3">
                  {field.label ? (
                    <Markdown compact>{`**${field.label}**${field.required ? '' : ' *(optional)*'}`}</Markdown>
                  ) : (
                    <p className="text-sm text-muted-foreground">Add a label in Text field to preview.</p>
                  )}
                  {field.helpText ? <Markdown compact>{field.helpText}</Markdown> : null}
                  {field.type === 'textarea' || field.type === 'signature' ? (
                    <Textarea disabled rows={2} placeholder={field.placeholder || ''} />
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" disabled className="h-3.5 w-3.5" />
                      {field.placeholder || field.label || 'Yes'}
                    </label>
                  ) : isTableField(field.type) ? (
                    <TableFieldInput columns={field.columns} preview disabled />
                  ) : fieldNeedsOptions(field.type) ? (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {String(field.optionsText || '')
                        .split(/[\n,]/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((opt) => (
                          <div key={opt} className="flex items-center gap-2">
                            <span className="inline-block h-3 w-3 rounded-full border" />
                            {opt}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <Input
                      disabled
                      placeholder={field.placeholder || meta.label}
                      type={field.type === 'number' || field.type === 'measurement' ? 'number' : 'text'}
                    />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <div className="flex justify-center border-t border-transparent py-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:!opacity-100">
        <InsertMenu onPick={(type) => onInsertAfter(type)}>
          <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground">
            <Plus className="h-3.5 w-3.5" />
            Add block
          </Button>
        </InsertMenu>
      </div>
    </div>
  )
}

/**
 * Notion-style Form Master canvas: mix documentation blocks and input fields.
 */
export default function NotionFormBuilder({ fields, onChange }) {
  function updateAt(index, patch) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  function insertAt(index, type) {
    const next = [...fields]
    next.splice(index, 0, emptyFormField(type))
    onChange(next)
  }

  function removeAt(index) {
    if (fields.length <= 1) return
    onChange(fields.filter((_, i) => i !== index))
  }

  function move(index, delta) {
    const j = index + delta
    if (j < 0 || j >= fields.length) return
    const next = [...fields]
    const [row] = next.splice(index, 1)
    next.splice(j, 0, row)
    onChange(next)
  }

  const previewBlocks = fields.filter(
    (f) => isContentBlock(f.type) || f.label || f.content,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Type className="h-4 w-4" />
            Document & form blocks
          </h3>
          <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
            Build like Notion: mix headings, Markdown notes, callouts, and any input type.
            Operators see the same layout when completing the stage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange([...fields, emptyFormField('table')])}
          >
            <Table2 className="h-3.5 w-3.5" />
            Add table
          </Button>
          <InsertMenu onPick={(type) => onChange([...fields, emptyFormField(type)])}>
            <Button type="button" size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add block
            </Button>
          </InsertMenu>
        </div>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <BlockRow
            key={field.id || `${field.name}-${index}`}
            field={field}
            index={index}
            total={fields.length}
            updateField={(patch) => updateAt(index, patch)}
            onRemove={() => removeAt(index)}
            onMove={(delta) => move(index, delta)}
            onInsertAfter={(type) => insertAt(index + 1, type)}
          />
        ))}
      </div>

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Empty page — add a heading or input to start.</p>
          <InsertMenu onPick={(type) => onChange([emptyFormField(type)])}>
            <Button type="button" size="sm" className="mt-3">
              <Plus className="h-3.5 w-3.5" />
              Insert first block
            </Button>
          </InsertMenu>
        </div>
      )}

      <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Live preview
        </p>
        <div className="space-y-4 rounded-md border bg-card p-4">
          {previewBlocks.length === 0 && (
            <p className="text-sm text-muted-foreground">Preview appears as you type.</p>
          )}
          {previewBlocks.map((f, i) =>
            isContentBlock(f.type) ? (
              <FormContentBlock key={f.id || i} block={f} />
            ) : (
              <div key={f.id || i} className="space-y-1.5">
                <Label>
                  {f.label || 'Untitled'}
                  {!f.required && (
                    <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                  )}
                </Label>
                {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
                {f.type === 'textarea' || f.type === 'signature' ? (
                  <Textarea disabled rows={2} placeholder={f.placeholder || ''} />
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" disabled className="h-3.5 w-3.5" />
                    {f.placeholder || f.label}
                  </label>
                ) : (
                  <Input
                    disabled
                    placeholder={f.placeholder || typeMeta(f.type).label}
                    type={f.type === 'number' || f.type === 'measurement' ? 'number' : 'text'}
                  />
                )}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}
