import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GitBranch, Play, Plus } from 'lucide-react'
import { fetchWorkflows, startInstance } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function WorkflowsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const workflows = useQuery({ queryKey: queryKeys.workflows.all, queryFn: fetchWorkflows })

  const start = useMutation({
    mutationFn: ({ key }) => startInstance(key, `BK-${Date.now()}`),
    onSuccess: (data) => {
      toast.success('Workflow started', {
        action: {
          label: 'Open',
          onClick: () => navigate(`/instances/${data.instanceId}`),
        },
      })
      qc.invalidateQueries({ queryKey: ['instances'] })
      navigate(`/instances/${data.instanceId}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not start workflow'),
  })

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="Workflow definitions"
          description="Admin creates master forms, then builds workflows by assigning role + form to each step. Operators only run instances."
          backTo="/"
          backLabel="Dashboard"
          breadcrumbs={[
            { label: 'Dashboard', to: '/' },
            { label: 'Workflows' },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/forms">Master forms</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/workflows/new">
                  <Plus className="h-3.5 w-3.5" />
                  Create workflow
                </Link>
              </Button>
            </div>
          }
        />

        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Key</TableHead>
                <TableHead className="hidden md:table-cell">Version</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(workflows.data || []).map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden">{w.key}</div>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                    {w.key}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="secondary">v{w.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link to={`/workflows/${w.key}`}>
                          Forms & steps
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link to={`/process/${w.key}`}>
                          <GitBranch className="h-3.5 w-3.5" />
                          Map
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={start.isPending}
                        onClick={() => start.mutate({ key: w.key })}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Start
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {workflows.isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Loading definitions…
                  </TableCell>
                </TableRow>
              )}
              {!workflows.isLoading && (workflows.data || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No workflow definitions available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageFrame>
    </Shell>
  )
}
