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
  const [description, setDescription] = useState('')
  const [workType, setWorkType] = useState('ROUTINE')
  const [aircraftTypes, setAircraftTypes] = useState('')
  const [startRole, setStartRole] = useState('PROGRESS')
  const [steps, setSteps] = useState([
    { id: crypto.randomUUID(), type: 'TASK', label: '', roleCode: 'PROGRESS', formKey: '' },
  ])
  const [endRole, setEndRole] = useState('PROGRESS')

  const masterForms = useMemo(
    () => (forms.data || []).filter((f) => String(f.status || 'PUBLISHED').toUpperCase() !== 'DRAFT'),
    [forms.data],
  )
  const roleCodes = useMemo(
    () => (roles.data || []).map((r) => r.code),
    [roles.data],
  )

  const updateStep = useCallback((id, patch) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const { nodeType, ...changes } = patch
      const type = nodeType || changes.type || s.type
      return {
        ...s,
        ...changes,
        type,
        ...(type === 'DECISION' && !s.failureTarget ? { failureTarget: 'end' } : {}),
      }
    }))
  }, [])

  const removeStep = useCallback((id) => {
    setSteps((prev) => {
      if (prev.length <= 1) return prev
      return prev
        .filter((s) => s.id !== id)
        .map((s) => s.type === 'DECISION' && s.failureTarget === id
          ? { ...s, failureTarget: 'end' }
          : s)
    })
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

      steps.forEach((step, index) => {
        const nodeKey = `step_${index + 1}`
        const isDecision = step.type === 'DECISION'
        nodes.push({
          key: nodeKey,
          type: isDecision ? 'DECISION' : 'TASK',
          label: step.label.trim() || `Step ${index + 1}`,
          roleCode: step.roleCode,
          formKey: step.formKey,
          ...(isDecision ? { options: ['PASS', 'FAIL'], expression: 'decision' } : {}),
        })
      })

      nodes.push({
        key: 'end',
        type: 'END',
        label: 'Complete',
        roleCode: endRole,
      })

      const firstNodeKey = 'step_1'
      transitions.push({ from: 'start', to: firstNodeKey })
      steps.forEach((step, index) => {
        const nodeKey = `step_${index + 1}`
        const nextNodeKey = index + 1 < steps.length ? `step_${index + 2}` : 'end'
        if (step.type === 'DECISION') {
          const failureTargetIndex = steps.findIndex((candidate) => candidate.id === step.failureTarget)
          const failureNodeKey = step.failureTarget === 'end' || failureTargetIndex < 0
            ? 'end'
            : `step_${failureTargetIndex + 1}`
          transitions.push(
            { from: nodeKey, to: nextNodeKey, when: 'PASS' },
            { from: nodeKey, to: failureNodeKey, when: 'FAIL' },
          )
        } else {
          transitions.push({ from: nodeKey, to: nextNodeKey })
        }
      })

      const aircraftList = aircraftTypes
        .split(/[,;]/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)

      return createWorkflow({
        key: wfKey,
        name: name.trim(),
        version: 1,
        description: description.trim() || undefined,
        workType: workType || undefined,
        aircraftTypes: aircraftList.length ? aircraftList : undefined,
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
    steps.every((s) =>
      s.label.trim()
      && s.roleCode
      && s.formKey
      && (s.type !== 'DECISION'
        || s.failureTarget === 'end'
        || steps.some((target) => target.id === s.failureTarget && target.id !== s.id)),
    )
  const hasBackwardFailureRoute = steps.some((step, index) => {
    if (step.type !== 'DECISION' || step.failureTarget === 'end') return false
    const targetIndex = steps.findIndex((candidate) => candidate.id === step.failureTarget)
    return targetIndex >= 0 && targetIndex <= index
  })

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
              <Label>Work type</Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROUTINE">ROUTINE</SelectItem>
                  <SelectItem value="REPAIR">REPAIR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Aircraft types</Label>
              <Input
                placeholder="A320, B737 (comma-separated)"
                value={aircraftTypes}
                onChange={(e) => setAircraftTypes(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Input
                placeholder="Optional applicability notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                Configure each step as a task or decision, attach its form, and set decision routes.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setSteps((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    type: 'TASK',
                    label: '',
                    roleCode: 'INSPECTION',
                    formKey: masterForms[0]?.formKey || '',
                    failureTarget: 'end',
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add step
            </Button>
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
          {hasBackwardFailureRoute && (
            <p role="status" className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-muted-foreground">
              A FAIL route returns to an earlier step. Ensure the workflow has a valid exit path; repeated failures may loop indefinitely.
            </p>
          )}
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
