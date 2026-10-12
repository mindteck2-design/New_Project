import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function emptyRow(columns) {
  const row = {}
  for (const col of columns) {
    if (col?.key) row[col.key] = ''
  }
  return row
}

/**
 * Operator table input: editable rows under configured columns.
 * Value shape: Array<Record<columnKey, string>>
 */
export default function TableFieldInput({
  columns = [],
  value,
  onChange,
  disabled = false,
  preview = false,
}) {
  const cols = (columns || []).filter((c) => c && (c.key || c.label))
  const normalizedCols = cols.map((c, i) => ({
    key: c.key || `col_${i + 1}`,
    label: c.label || c.key || `Column ${i + 1}`,
  }))

  const rows = Array.isArray(value) && value.length
    ? value
    : [emptyRow(normalizedCols)]

  function setRows(next) {
    onChange?.(next)
  }

  function updateCell(rowIndex, key, cellValue) {
    setRows(
      rows.map((row, i) => (i === rowIndex ? { ...row, [key]: cellValue } : row)),
    )
  }

  function addRow() {
    setRows([...rows, emptyRow(normalizedCols)])
  }

  function removeRow(index) {
    if (rows.length <= 1) {
      setRows([emptyRow(normalizedCols)])
      return
    }
    setRows(rows.filter((_, i) => i !== index))
  }

  if (!normalizedCols.length) {
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
        No columns configured for this table.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {normalizedCols.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              {!preview && <TableHead className="w-12 text-right"> </TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {normalizedCols.map((col) => (
                  <TableCell key={col.key}>
                    <Input
                      value={row?.[col.key] ?? ''}
                      disabled={disabled || preview}
                      placeholder={col.label}
                      onChange={(e) => updateCell(rowIndex, col.key, e.target.value)}
                    />
                  </TableCell>
                ))}
                {!preview && (
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      disabled={disabled}
                      onClick={() => removeRow(rowIndex)}
                      aria-label="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!preview && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={addRow}
        >
          <Plus className="h-3.5 w-3.5" />
          Add row
        </Button>
      )}
    </div>
  )
}
