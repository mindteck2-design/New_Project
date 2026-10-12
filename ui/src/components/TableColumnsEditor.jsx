import { Plus, Trash2 } from 'lucide-react'
import { emptyTableColumn, slugifyFieldName } from '@/lib/formFieldTypes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Form Master designer: add / rename / remove table columns.
 */
export default function TableColumnsEditor({ columns = [], onChange }) {
  const rows = columns.length ? columns : [emptyTableColumn('Column 1')]

  function updateColumn(index, patch) {
    const next = rows.map((c, i) => (i === index ? { ...c, ...patch } : c))
    onChange(next)
  }

  function addColumn() {
    onChange([...rows, emptyTableColumn(`Column ${rows.length + 1}`)])
  }

  function removeColumn(index) {
    if (rows.length <= 1) return
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label>Table columns</Label>
          <p className="text-[11px] text-muted-foreground">
            Add or remove columns. Operators fill rows under these headers.
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
              <TableHead className="w-[40%]">Header</TableHead>
              <TableHead className="w-[40%]">Key</TableHead>
              <TableHead className="w-[20%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((col, index) => (
              <TableRow key={col.id || `${col.key}-${index}`}>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <Input
                    className="font-mono text-xs"
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
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={rows.length <= 1}
                    onClick={() => removeColumn(index)}
                    aria-label="Remove column"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
