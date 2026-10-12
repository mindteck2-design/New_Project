import { Plus, Trash2 } from 'lucide-react'
import {
  TABLE_COLUMN_INPUT_TYPES,
  emptyTableColumn,
  fieldNeedsOptions,
  normalizeTableColumnType,
  slugifyFieldName,
} from '@/lib/formFieldTypes'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Form Master designer: add / remove columns and pick each column's input type.
 */
export default function TableColumnsEditor({ columns = [], onChange }) {
  const rows = columns.length ? columns : [emptyTableColumn('Column 1')]

  function updateColumn(index, patch) {
    const next = rows.map((c, i) => (i === index ? { ...c, ...patch } : c))
    onChange(next)
  }

  function addColumn() {
    onChange([...rows, emptyTableColumn(`Column ${rows.length + 1}`, 'text')])
  }

  function removeColumn(index) {
    if (rows.length <= 1) return
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Table columns</Label>
          <p className="text-[11px] text-muted-foreground">
            Add or remove columns. Choose text, date, number, dropdown, and more for each column.
            Operators add/remove rows when filling the form.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addColumn}>
          <Plus className="h-3.5 w-3.5" />
          Add column
        </Button>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
              <TableHead className="hidden sm:table-cell">Key</TableHead>
              <TableHead>Input type</TableHead>
              <TableHead className="w-12 text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((col, index) => {
              const colType = normalizeTableColumnType(col.type)
              return (
                <TableRow key={col.id || `${col.key}-${index}`}>
                  <TableCell className="align-top">
                    <div className="space-y-2 py-1">
                      <Input
                        value={col.label || ''}
                        placeholder="Column header"
                        onChange={(e) => {
                          const label = e.target.value
                          const patch = { label }
                          if (!col.keyLocked) {
                            patch.key = slugifyFieldName(label, `col_${index + 1}`)
                          }
                          updateColumn(index, patch)
                        }}
                      />
                      <Input
                        className="sm:hidden font-mono text-xs"
                        value={col.key || ''}
                        placeholder="col_key"
                        onChange={(e) =>
                          updateColumn(index, {
                            key: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                            keyLocked: true,
                          })
                        }
                      />
                      {fieldNeedsOptions(colType) && (
                        <Textarea
                          rows={2}
                          value={col.optionsText || ''}
                          placeholder={'PASS\nFAIL\nN/A'}
                          onChange={(e) => updateColumn(index, { optionsText: e.target.value })}
                        />
                      )}
                      {!fieldNeedsOptions(colType) && colType !== 'checkbox' && (
                        <Input
                          value={col.placeholder || ''}
                          placeholder="Cell placeholder (optional)"
                          onChange={(e) => updateColumn(index, { placeholder: e.target.value })}
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden align-top sm:table-cell">
                    <Input
                      className="mt-1 font-mono text-xs"
                      value={col.key || ''}
                      placeholder="col_key"
                      onChange={(e) =>
                        updateColumn(index, {
                          key: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                          keyLocked: true,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Select
                      value={colType}
                      onValueChange={(v) =>
                        updateColumn(index, {
                          type: v,
                          optionsText:
                            fieldNeedsOptions(v) && !col.optionsText
                              ? 'PASS\nFAIL\nN/A'
                              : col.optionsText,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TABLE_COLUMN_INPUT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="mt-1 h-8 w-8"
                      disabled={rows.length <= 1}
                      onClick={() => removeColumn(index)}
                      aria-label="Remove column"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
