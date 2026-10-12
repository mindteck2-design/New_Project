import { Plus, Trash2 } from 'lucide-react'
import {
  emptyTableRow,
  fieldNeedsOptions,
  normalizeTableColumnType,
  normalizeTableColumns,
} from '@/lib/formFieldTypes'
import { toCalendarDate } from '@/lib/dateTime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

function columnOptions(col) {
  if (Array.isArray(col.options) && col.options.length) return col.options
  return String(col.optionsText || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function CellControl({ col, value, onChange, disabled, rowIndex = 0 }) {
  const type = normalizeTableColumnType(col.type)
  const options = columnOptions(col)

  if (type === 'textarea') {
    return (
      <Textarea
        rows={2}
        value={value ?? ''}
        disabled={disabled}
        placeholder={col.placeholder || col.label}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  if (type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        {col.placeholder || 'Yes'}
      </label>
    )
  }

  if (type === 'select') {
    return (
      <Select
        value={value || undefined}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={col.placeholder || 'Select…'} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (type === 'radio') {
    return (
      <div className="space-y-1.5">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              className="h-3.5 w-3.5 accent-primary"
              name={`${col.key}_r${rowIndex}`}
              checked={value === opt}
              disabled={disabled}
              onChange={() => onChange(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
    )
  }

  const inputType =
    type === 'number' || type === 'measurement'
      ? 'number'
      : type === 'email'
        ? 'email'
        : type === 'url'
          ? 'url'
          : type === 'phone'
            ? 'tel'
            : type === 'date'
              ? 'date'
              : type === 'time'
                ? 'time'
                : type === 'datetime'
                  ? 'datetime-local'
                  : 'text'

  const displayValue = type === 'date' ? toCalendarDate(value) : (value ?? '')

  return (
    <Input
      type={inputType}
      value={displayValue}
      disabled={disabled}
      placeholder={col.placeholder || col.label}
      onChange={(e) => {
        if (type === 'date') {
          onChange(toCalendarDate(e.target.value))
          return
        }
        onChange(e.target.value)
      }}
    />
  )
}

/**
 * Operator table input: typed cells under configured columns.
 * Designers add/remove columns; operators add/remove rows.
 * Value: Array<Record<columnKey, string|boolean>>
 */
export default function TableFieldInput({
  columns = [],
  value,
  onChange,
  disabled = false,
  preview = false,
}) {
  const normalizedCols = normalizeTableColumns(columns)

  const rows =
    Array.isArray(value) && value.length ? value : [emptyTableRow(normalizedCols)]

  function setRows(next) {
    onChange?.(next)
  }

  function updateCell(rowIndex, key, cellValue) {
    setRows(rows.map((row, i) => (i === rowIndex ? { ...row, [key]: cellValue } : row)))
  }

  function addRow() {
    setRows([...rows, emptyTableRow(normalizedCols)])
  }

  function removeRow(index) {
    if (rows.length <= 1) {
      setRows([emptyTableRow(normalizedCols)])
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
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {normalizedCols.map((col) => (
                <TableHead key={col.key} className="min-w-[8rem]">
                  <div className="space-y-0.5">
                    <div>{col.label}</div>
                    <div className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                      {normalizeTableColumnType(col.type)}
                      {fieldNeedsOptions(col.type) ? ' · options' : ''}
                    </div>
                  </div>
                </TableHead>
              ))}
              {!preview && <TableHead className="w-12 text-right"> </TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {normalizedCols.map((col) => (
                  <TableCell key={col.key} className="align-top">
                    <CellControl
                      col={col}
                      rowIndex={rowIndex}
                      value={row?.[col.key]}
                      disabled={disabled || preview}
                      onChange={(v) => updateCell(rowIndex, col.key, v)}
                    />
                  </TableCell>
                ))}
                {!preview && (
                  <TableCell className="align-top text-right">
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
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={addRow}>
          <Plus className="h-3.5 w-3.5" />
          Add row
        </Button>
      )}
    </div>
  )
}
