import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { ArrowRight, Play, Sparkles } from 'lucide-react'
import {
  actionableNotifications,
  fetchInstances,
  fetchWorkflowDefinition,
  fetchWorkflows,
  startInstance,
} from '@/api/client'
import { useAuth } from '@/stores/authStore'
import Shell from '@/components/Shell'
import WorkflowChart from '@/components/WorkflowChart'
import InstanceInsights from '@/components/InstanceInsights'
import RoleUserSwitcher from '@/components/RoleUserSwitcher'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [selectedKey, setSelectedKey] = useState(null)

  const workflows = useQuery({ queryKey: ['workflows'], queryFn: fetchWorkflows })
  const instances = useQuery({ queryKey: ['instances', user?.id], queryFn: fetchInstances })

  const activeKey = selectedKey || workflows.data?.[0]?.key
  const definition = useQuery({
    queryKey: ['workflow-def', activeKey],
    queryFn: () => fetchWorkflowDefinition(activeKey),
    enabled: !!activeKey,
  })

  const inbox = useMemo(
    () => actionableNotifications(instances.data || [], user),
    [instances.data, user],
  )

  const start = useMutation({
    mutationFn: ({ key }) => startInstance(key, `BK-${Date.now()}`),
    onSuccess: (data) => {
      toast.success('Workflow started — open to continue', {
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
    <Shell
      title="Operations dashboard"
      subtitle="Switch role, jump into waiting actions, and inspect workflow graphs."
    >
      <div className="mb-6 lg:hidden">
        <Card>
          <CardContent className="p-4">
            <RoleUserSwitcher />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Action inbox
                </CardTitle>
                <CardDescription>Click a notification to go straight to the step you must complete.</CardDescription>
              </div>
              <Badge variant={inbox.length ? 'default' : 'secondary'}>{inbox.length} waiting</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {inbox.length === 0 && (
                <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No steps waiting on {(user?.roles || []).join(', ') || 'your roles'}.
                </p>
              )}
              {inbox.map((item, idx) => (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => navigate(item.href)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.995]"
                >
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-primary" />
                </motion.button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workflow definitions</CardTitle>
              <CardDescription>Start a seeded process. Graph updates on the right.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {(workflows.data || []).map((w, idx) => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + idx * 0.05 }}
                  className={`rounded-xl border p-4 transition-all ${
                    activeKey === w.key ? 'border-primary/50 bg-accent/40' : 'bg-card hover:border-border'
                  }`}
                >
                  <button type="button" className="w-full text-left" onClick={() => setSelectedKey(w.key)}>
                    <div className="font-semibold">{w.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {w.key} · v{w.version}
                    </div>
                  </button>
                  <Button
                    size="sm"
                    className="mt-3"
                    disabled={start.isPending}
                    onClick={() => start.mutate({ key: w.key })}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow chart</CardTitle>
              <CardDescription>
                {activeKey ? `XY graph for ${activeKey}` : 'Select a definition'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkflowChart definition={definition.data} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instance insights</CardTitle>
              <CardDescription>TanStack Table, Recharts, and Excel export for operational visibility.</CardDescription>
            </CardHeader>
            <CardContent>
              <InstanceInsights instances={instances.data || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent instances</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="mine">My actions</TabsTrigger>
                </TabsList>
                <TabsContent value="all" className="space-y-2">
                  {(instances.data || []).slice(0, 8).map((i) => (
                    <Link
                      key={i.instanceId}
                      to={`/instances/${i.instanceId}`}
                      className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm no-underline transition-colors hover:bg-muted/60"
                    >
                      <div>
                        <div className="font-medium text-foreground">{i.workflowName}</div>
                        <div className="text-xs text-muted-foreground">
                          {i.businessKey || i.instanceId.slice(0, 8)} · {i.currentNode?.label}
                        </div>
                      </div>
                      <Badge variant={i.status === 'COMPLETED' ? 'success' : 'warning'}>{i.status}</Badge>
                    </Link>
                  ))}
                </TabsContent>
                <TabsContent value="mine" className="space-y-2">
                  {inbox.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                    >
                      <span>{item.title}</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </button>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  )
}
