import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import ExcelJS from 'exceljs'
import { Download } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function InstanceInsights({ instances = [] }) {
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
        header: 'Workflow',
        cell: ({ row }) => (
          <Link to={`/instances/${row.original.instanceId}`} className="font-medium text-foreground no-underline hover:text-primary">
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
        header: 'Current step',
        cell: ({ row }) => row.original.currentNode?.label || '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => (
          <Badge variant={getValue() === 'COMPLETED' ? 'success' : 'warning'}>{getValue()}</Badge>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: instances.slice(0, 20),
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  async function exportExcel() {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'AMMS'
    const sheet = wb.addWorksheet('Instances', {
      properties: { defaultRowHeight: 18 },
    })
    sheet.addRow(['Workflow', 'Business key', 'Step', 'Status'])
    sheet.getRow(1).font = { bold: true }
    for (const i of instances) {
      sheet.addRow([
        i.workflowName,
        i.businessKey || i.instanceId,
        i.currentNode?.label || '',
        i.status,
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Instance volume by status</p>
        <Button type="button" size="sm" variant="outline" onClick={exportExcel} disabled={!instances.length}>
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
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-medium">
                    {flexRender(header.column.columnDef.header, header.getContext())}
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
            {!instances.length && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                  No instances yet — start a workflow above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-center text-[10px] uppercase tracking-wider text-muted-foreground hal-watermark">
        Property of HAL — Restricted
      </p>
    </div>
  )
}
