import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import ExcelJS from 'exceljs'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(value)
  }
}

function toDayStart(isoDate) {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function toDayEnd(isoDate) {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T23:59:59.999`)
  return Number.isNaN(d.getTime()) ? null : d
}

function SortIcon({ column }) {
  const sorted = column.getIsSorted()
  if (sorted === 'asc') return <ArrowUp className="h-3.5 w-3.5" />
  if (sorted === 'desc') return <ArrowDown className="h-3.5 w-3.5" />
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
}

export default function InstanceInsights({ instances = [] }) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sorting, setSorting] = useState([{ id: 'startedAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 })

  const statusCounts = useMemo(() => {
    const map = { RUNNING: 0, COMPLETED: 0 }
    for (const i of instances) {
      map[i.status] = (map[i.status] || 0) + 1
    }
    return Object.entries(map).map(([status, count]) => ({ status, count }))
  }, [instances])

  const columns = useMemo(
    () => [
      {
        accessorKey: 'workflowName',
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium"
            onClick={column.getToggleSortingHandler()}
          >
            Workflow <SortIcon column={column} />
          </button>
        ),
        cell: ({ row }) => (
          <Link
            to={`/instances/${row.original.instanceId}`}
            className="font-medium text-foreground no-underline hover:text-primary"
          >
            {row.original.workflowName}
          </Link>
        ),
      },
      {
        accessorKey: 'businessKey',
        header: 'Business key',
        cell: ({ getValue, row }) => getValue() || row.original.instanceId.slice(0, 8),
      },
      {
        id: 'step',
        accessorFn: (row) => row.currentNode?.label || '',
        header: 'Current step',
        cell: ({ getValue }) => getValue() || '—',
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium"
            onClick={column.getToggleSortingHandler()}
          >
            Status <SortIcon column={column} />
          </button>
        ),
        cell: ({ getValue }) => (
          <Badge variant={getValue() === 'COMPLETED' ? 'success' : 'warning'}>{getValue()}</Badge>
        ),
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue === 'ALL') return true
          return row.getValue(columnId) === filterValue
        },
      },
      {
        accessorKey: 'startedAt',
        header: ({ column }) => (
          <button
            type="button"
            className="inline-flex items-center gap-1 font-medium"
            onClick={column.getToggleSortingHandler()}
          >
            Started <SortIcon column={column} />
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(getValue())}</span>
        ),
        sortingFn: 'datetime',
        filterFn: (row, columnId, filterValue) => {
          const { from, to } = filterValue || {}
          if (!from && !to) return true
          const raw = row.getValue(columnId)
          if (!raw) return false
          const ts = new Date(raw).getTime()
          if (Number.isNaN(ts)) return false
          if (from && ts < from.getTime()) return false
          if (to && ts > to.getTime()) return false
          return true
        },
      },
    ],
    [],
  )

  const columnFilters = useMemo(() => {
    const filters = []
    if (statusFilter && statusFilter !== 'ALL') {
      filters.push({ id: 'status', value: statusFilter })
    }
    if (dateFrom || dateTo) {
      filters.push({
        id: 'startedAt',
        value: { from: toDayStart(dateFrom), to: toDayEnd(dateTo) },
      })
    }
    return filters
  }, [statusFilter, dateFrom, dateTo])

  const table = useReactTable({
    data: instances,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue || '')
        .trim()
        .toLowerCase()
      if (!q) return true
      const i = row.original
      const haystack = [
        i.workflowName,
        i.workflowKey,
        i.businessKey,
        i.status,
        i.instanceId,
        i.currentNode?.label,
        i.currentNode?.key,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    },
  })

  const filteredRows = table.getFilteredRowModel().rows
  const pageCount = table.getPageCount()
  const hasFilters = Boolean(globalFilter || (statusFilter && statusFilter !== 'ALL') || dateFrom || dateTo)

  function clearFilters() {
    setGlobalFilter('')
    setStatusFilter('ALL')
    setDateFrom('')
    setDateTo('')
    setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  async function exportExcel() {
    const rows = filteredRows.map((r) => r.original)
    const wb = new ExcelJS.Workbook()
    wb.creator = 'AMMS'
    const sheet = wb.addWorksheet('Instances', {
      properties: { defaultRowHeight: 18 },
    })
    sheet.addRow(['Workflow', 'Business key', 'Step', 'Status', 'Started', 'Updated'])
    sheet.getRow(1).font = { bold: true }
    for (const i of rows) {
      sheet.addRow([
        i.workflowName,
        i.businessKey || i.instanceId,
        i.currentNode?.label || '',
        i.status,
        i.startedAt || '',
        i.updatedAt || '',
      ])
    }
    sheet.addRow([])
    sheet.addRow(['Property of HAL — Restricted export'])
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `amms-instances-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Instance volume by status · {filteredRows.length} of {instances.length} shown
        </p>
        <Button type="button" size="sm" variant="outline" onClick={exportExcel} disabled={!filteredRows.length}>
          <Download className="h-3.5 w-3.5" />
          Export Excel
        </Button>
      </div>

      <div className="h-44 w-full rounded-xl border bg-muted/20 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusCounts} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="status" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-3 rounded-xl border bg-card/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="instance-search">Global search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="instance-search"
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value)
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              placeholder="Workflow, key, step…"
              className="h-9 pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="RUNNING">RUNNING</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date-from">Started from</Label>
          <Input
            id="date-from"
            type="date"
            className="h-9"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date-to">Started to</Label>
          <div className="flex gap-2">
            <Input
              id="date-to"
              type="date"
              className="h-9"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
            />
            {hasFilters && (
              <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={clearFilters} title="Clear filters">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {instances.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  No instances yet — start a workflow above.
                </td>
              </tr>
            )}
            {instances.length > 0 && filteredRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  No instances match the current search and filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Page {pageCount === 0 ? 0 : pagination.pageIndex + 1} of {pageCount}
          </span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => setPagination({ pageIndex: 0, pageSize: Number(v) })}
          >
            <SelectTrigger className="h-8 w-[7.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground hal-watermark">
        Property of HAL — Restricted
      </p>
    </div>
  )
}
