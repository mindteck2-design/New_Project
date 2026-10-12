import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { createWorkflow, fetchFormSchemas, fetchRoles } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { ROLE_LABELS } from '@/lib/demoUsers'
import { NAV_LABELS } from '@/lib/navConfig'
import Shell from '@/components/Shell'
import PageHeader from '@/components/PageHeader'
import PageFrame from '@/components/PageFrame'
import WorkflowBuilderCanvas from '@/components/WorkflowBuilderCanvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Admin workflow builder:
 * 1) Master forms are created separately (/forms)
 * 2) Here admin paints the chart on an xyflow canvas (role + master form per step)
 */
export default function WorkflowBuilderPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const forms = useQuery({ queryKey: queryKeys.forms.all, queryFn: fetchFormSchemas })
  const roles = useQuery({ queryKey: queryKeys.roles.all, queryFn: fetchRoles })

  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [startRole, setStartRole] = useState('PROGRESS')
  const [steps, setSteps] = useState([
    { id: crypto.randomUUID(), type: 'TASK', label: '', roleCode: 'PROGRESS', formKey: '' },
  ])
  const [endRole, setEndRole] = useState('PROGRESS')

  const masterForms = forms.data || []
  const roleCodes = useMemo(
    () => (roles.data || []).map((r) => r.code),
    [roles.data],
  )

  const updateStep = useCallback((id, patch) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const removeStep = useCallback((id) => {
    setSteps((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)))
  }, [])

  const save = useMutation({
    mutationFn: () => {
      const wfKey = key.trim().toLowerCase()
      const nodes = [
        {
          key: 'start',
          type: 'START',
          label: 'Start',
          roleCode: startRole,
        },
      ]
      const transitions = []
      let prev = 'start'
      let prevNeedsPass = false

      steps.forEach((step, index) => {
        const nodeKey = `step_${index + 1}`
        if (step.type === 'DECISION') {
          nodes.push({
            key: nodeKey,
            type: 'DECISION',
            label: step.label.trim() || `Decision ${index + 1}`,
            roleCode: step.roleCode,
            options: ['PASS', 'FAIL'],
            expression: 'decision',
          })
          transitions.push(
            prevNeedsPass
              ? { from: prev, to: nodeKey, when: 'PASS' }
              : { from: prev, to: nodeKey },
          )
          const failEnd = `end_fail_${index + 1}`
          nodes.push({
            key: failEnd,
            type: 'END',
            label: `${step.label.trim() || 'Decision'} — FAIL`,
            roleCode: step.roleCode,
          })
          transitions.push({ from: nodeKey, to: failEnd, when: 'FAIL' })
          prev = nodeKey
          prevNeedsPass = true
        } else {
          nodes.push({
            key: nodeKey,
            type: 'TASK',
            label: step.label.trim() || `Step ${index + 1}`,
            roleCode: step.roleCode,
            formKey: step.formKey,
          })
          transitions.push(
            prevNeedsPass
              ? { from: prev, to: nodeKey, when: 'PASS' }
              : { from: prev, to: nodeKey },
          )
          prev = nodeKey
          prevNeedsPass = false
        }
      })

      nodes.push({
        key: 'end',
        type: 'END',
        label: 'Complete',
        roleCode: endRole,
      })
      transitions.push(
        prevNeedsPass ? { from: prev, to: 'end', when: 'PASS' } : { from: prev, to: 'end' },
      )

      return createWorkflow({
        key: wfKey,
        name: name.trim(),
        version: 1,
        nodes,
        transitions,
      })
    },
    onSuccess: (data) => {
      toast.success(`Workflow “${data.name}” created`)
      qc.invalidateQueries({ queryKey: queryKeys.workflows.all })
      navigate(`/workflows/${data.key}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Could not create workflow'),
  })

  const canSave =
    key.trim() &&
    name.trim() &&
    steps.length > 0 &&
    steps.every((s) => s.label.trim() && s.roleCode && (s.type !== 'TASK' || s.formKey))

  return (
    <Shell>
      <PageFrame>
        <PageHeader
          title="Create workflow"
          description="Paint maintenance stages on the canvas — assign a role and Form Master checklist to each step. Forms stay in the catalog; this only binds them."
          backTo="/workflows"
          backLabel={NAV_LABELS.workflows}
          breadcrumbs={[
            { label: NAV_LABELS.dashboard, to: '/' },
            { label: NAV_LABELS.workflows, to: '/workflows' },
            { label: 'Create' },
          ]}
        />

        {masterForms.length === 0 && !forms.isLoading && (
          <div className="rounded-lg border border-warning/40 bg-card px-4 py-3 text-sm">
            No master forms yet.{' '}
            <Link className="font-medium text-primary hover:underline" to="/forms/new">
              Create a master form
            </Link>{' '}
            first, then return here to build the workflow.
          </div>
        )}

        <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold tracking-tight">Workflow identity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input
                placeholder="bench-intake-v2"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Bench intake process"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start role</Label>
              <RoleSelect value={startRole} roles={roleCodes} onChange={setStartRole} />
            </div>
            <div className="space-y-1.5">
              <Label>Complete (END) role</Label>
              <RoleSelect value={endRole} roles={roleCodes} onChange={setEndRole} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Canvas</h2>
              <p className="text-xs text-muted-foreground">
                START → steps → END on xyflow. Decision FAIL branches right to a reject end.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setSteps((p) => [
                    ...p,
                    {
                      id: crypto.randomUUID(),
                      type: 'TASK',
                      label: '',
                      roleCode: 'INSPECTION',
                      formKey: masterForms[0]?.formKey || '',
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Task step
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setSteps((p) => [
                    ...p,
                    {
                      id: crypto.randomUUID(),
                      type: 'DECISION',
                      label: 'Pass / Fail',
                      roleCode: 'INSPECTION',
                      formKey: '',
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Decision
              </Button>
            </div>
          </div>

          <WorkflowBuilderCanvas
            steps={steps}
            startRole={startRole}
            endRole={endRole}
            roles={roleCodes}
            masterForms={masterForms}
            onUpdateStep={updateStep}
            onRemoveStep={removeStep}
          />
        </section>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Creating…' : 'Create workflow'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/forms">Manage master forms</Link>
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link to="/workflows">Cancel</Link>
          </Button>
        </div>
      </PageFrame>
    </Shell>
  )
}

function RoleSelect({ value, roles, onChange }) {
  const list = roles?.length ? roles : Object.keys(ROLE_LABELS)
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {list.map((code) => (
          <SelectItem key={code} value={code}>
            {ROLE_LABELS[code] || code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
