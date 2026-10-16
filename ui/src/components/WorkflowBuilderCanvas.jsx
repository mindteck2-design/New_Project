import { useCallback, useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import { Trash2 } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/demoUsers'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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

const MAIN_X = 80
const ROW_H = 310
const TERMINAL_H = 72

function roleLabel(code) {
  return ROLE_LABELS[code] || code
}

function RoleSelect({ value, roles, onChange }) {
  const list = roles?.length ? roles : Object.keys(ROLE_LABELS)
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="nodrag nopan h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {list.map((code) => (
          <SelectItem key={code} value={code}>
            {roleLabel(code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TerminalNode({ data }) {
  return (
    <div
      className={cn(
        'min-w-[260px] rounded-lg border px-4 py-3 text-center shadow-sm',
        data.kind === 'START'
          ? 'border-emerald-300/80 bg-emerald-50'
          : 'border-zinc-300 bg-zinc-50',
      )}
    >
      {data.kind !== 'START' && (
        <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-primary" />
      )}
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {data.kind}
      </div>
      <div className="mt-0.5 text-sm font-medium text-foreground">
        {roleLabel(data.roleCode)}
      </div>
      {data.kind !== 'END' && (
        <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-primary" />
      )}
    </div>
  )
}

function WorkflowStepNode({ data, selected }) {
  const isDecision = data.nodeType === 'DECISION'
  return (
    <div
      className={cn(
        'w-[320px] rounded-xl border p-3 shadow-sm transition-shadow',
        isDecision ? 'border-amber-300/70 bg-amber-50/60' : 'bg-card',
        selected && (isDecision ? 'ring-2 ring-amber-500 shadow-md' : 'ring-2 ring-primary shadow-md'),
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={cn('!h-2.5 !w-2.5', isDecision ? '!bg-amber-600' : '!bg-primary')}
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            Step {data.stepIndex}
          </Badge>
          <Badge variant={isDecision ? 'warning' : 'outline'} className="text-[10px]">
            {data.nodeType}
          </Badge>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="nodrag nopan h-7 w-7"
          disabled={!data.canRemove}
          onClick={(e) => {
            e.stopPropagation()
            data.onRemove?.()
          }}
          aria-label="Remove step"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-[11px]">Step label</Label>
          <Input
            className="nodrag nopan h-8"
            placeholder="Spares demand"
            value={data.label}
            onChange={(e) => data.onUpdate?.({ label: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">Step type</Label>
            <Select
              value={data.nodeType}
              onValueChange={(value) => data.onUpdate?.({ nodeType: value })}
            >
              <SelectTrigger className="nodrag nopan h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TASK">Task</SelectItem>
                <SelectItem value="DECISION">Decision</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Role</Label>
            <RoleSelect
              value={data.roleCode}
              roles={data.roles}
              onChange={(v) => data.onUpdate?.({ roleCode: v })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Master form</Label>
          <Select
            value={data.formKey || undefined}
            onValueChange={(v) => data.onUpdate?.({ formKey: v })}
          >
            <SelectTrigger className="nodrag nopan h-8">
              <SelectValue placeholder="Select form" />
            </SelectTrigger>
            <SelectContent>
              {(data.masterForms || []).map((f) => (
                <SelectItem key={f.formKey} value={f.formKey}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isDecision && (
          <div className="space-y-1">
            <Label className="text-[11px]">FAIL destination</Label>
            <Select
              value={data.failureTarget}
              onValueChange={(value) => data.onUpdate?.({ failureTarget: value })}
            >
              <SelectTrigger className="nodrag nopan h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.failureTargets.map((target) => (
                  <SelectItem key={target.value} value={target.value}>
                    {target.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {isDecision && (
          <p className="rounded-md border border-amber-200 bg-white/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            PASS continues to the next step. FAIL follows the selected route.
          </p>
        )}
      </div>
      {isDecision ? (
        <>
          <Handle type="source" id="pass" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-emerald-600" />
          <Handle type="source" id="fail" position={Position.Right} className="!h-2.5 !w-2.5 !bg-amber-600" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-primary" />
      )}
    </div>
  )
}

const nodeTypes = {
  terminal: TerminalNode,
  workflowStep: WorkflowStepNode,
}

function buildGraph({ steps, startRole, endRole, roles, masterForms, onUpdateStep, onRemoveStep }) {
  const nodes = []
  const edges = []
  let y = 24

  nodes.push({
    id: 'start',
    type: 'terminal',
    position: { x: MAIN_X, y },
    draggable: false,
    data: { kind: 'START', roleCode: startRole },
  })
  y += TERMINAL_H + 48

  let prevId = 'start'
  let prevSourceHandle = undefined
  let prevNeedsPass = false

  steps.forEach((step, index) => {
    const id = step.id
    const stepIndex = index + 1
    const canRemove = steps.length > 1

    if (step.type === 'DECISION') {
      nodes.push({
        id,
        type: 'workflowStep',
        position: { x: MAIN_X, y },
        draggable: true,
        data: {
          stepIndex,
          nodeType: step.type,
          label: step.label,
          roleCode: step.roleCode,
          formKey: step.formKey,
          roles,
          masterForms,
          failureTarget: step.failureTarget || 'end',
          failureTargets: [
            ...steps
              .filter((candidate) => candidate.id !== id)
              .map((candidate) => ({
                value: candidate.id,
                label: `Step ${steps.indexOf(candidate) + 1} · ${candidate.label?.trim() || candidate.type}`,
              })),
            { value: 'end', label: 'Complete workflow' },
          ],
          canRemove,
          onUpdate: (patch) => onUpdateStep(id, patch),
          onRemove: () => onRemoveStep(id),
        },
      })
      edges.push({
        id: `e-${prevId}-${id}`,
        source: prevId,
        target: id,
        sourceHandle: prevSourceHandle,
        label: prevNeedsPass ? 'PASS' : undefined,
        ...edgeStyle(prevNeedsPass ? 'pass' : 'default'),
      })

      const failureTargetId = step.failureTarget === 'end'
        || !steps.some((candidate) => candidate.id === step.failureTarget)
        ? 'end'
        : step.failureTarget
      edges.push({
        id: `e-${id}-fail-${failureTargetId}`,
        source: id,
        target: failureTargetId,
        sourceHandle: 'fail',
        label: 'FAIL',
        ...edgeStyle('fail'),
      })

      prevId = id
      prevSourceHandle = 'pass'
      prevNeedsPass = true
      y += ROW_H
    } else {
      nodes.push({
        id,
        type: 'workflowStep',
        position: { x: MAIN_X, y },
        draggable: true,
        data: {
          stepIndex,
          nodeType: step.type,
          label: step.label,
          roleCode: step.roleCode,
          formKey: step.formKey,
          roles,
          masterForms,
          canRemove,
          onUpdate: (patch) => onUpdateStep(id, patch),
          onRemove: () => onRemoveStep(id),
        },
      })
      edges.push({
        id: `e-${prevId}-${id}`,
        source: prevId,
        target: id,
        sourceHandle: prevSourceHandle,
        label: prevNeedsPass ? 'PASS' : undefined,
        ...edgeStyle(prevNeedsPass ? 'pass' : 'default'),
      })
      prevId = id
      prevSourceHandle = undefined
      prevNeedsPass = false
      y += ROW_H
    }
  })

  nodes.push({
    id: 'end',
    type: 'terminal',
    position: { x: MAIN_X, y },
    draggable: false,
    data: { kind: 'END', roleCode: endRole },
  })
  edges.push({
    id: `e-${prevId}-end`,
    source: prevId,
    target: 'end',
    sourceHandle: prevSourceHandle,
    label: prevNeedsPass ? 'PASS' : undefined,
    ...edgeStyle(prevNeedsPass ? 'pass' : 'default'),
  })

  return { nodes, edges }
}

function edgeStyle(kind) {
  const color =
    kind === 'fail' ? '#e11d48' : kind === 'pass' ? '#059669' : '#71717a'
  return {
    animated: kind === 'fail',
    style: { stroke: color, strokeWidth: kind === 'default' ? 1.5 : 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
    labelStyle: { fontSize: 10, fill: color, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 4,
  }
}

function CanvasInner({
  steps,
  startRole,
  endRole,
  roles,
  masterForms,
  onUpdateStep,
  onRemoveStep,
}) {
  const { fitView } = useReactFlow()

  const graph = useMemo(
    () =>
      buildGraph({
        steps,
        startRole,
        endRole,
        roles,
        masterForms,
        onUpdateStep,
        onRemoveStep,
      }),
    [steps, startRole, endRole, roles, masterForms, onUpdateStep, onRemoveStep],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges)

  useEffect(() => {
    setNodes(graph.nodes)
    setEdges(graph.edges)
    const t = requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 220 })
    })
    return () => cancelAnimationFrame(t)
  }, [graph, setNodes, setEdges, fitView])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      minZoom={0.35}
      maxZoom={1.4}
      nodesConnectable={false}
      edgesReconnectable={false}
      deleteKeyCode={null}
      className="bg-[radial-gradient(circle_at_top,_#f0fdfa_0%,_#fafafa_42%,_#f4f4f5_100%)]"
    >
      <Background gap={18} size={1} color="#d4d4d8" />
      <MiniMap
        pannable
        zoomable
        nodeStrokeWidth={2}
        className="!border-border !bg-card/90"
      />
      <Controls showInteractive={false} className="!rounded-lg !border-border !shadow-sm" />
      <Panel
        position="top-left"
        className="rounded-md border bg-card/90 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur"
      >
        Drag the canvas · edit node fields and decision routes
      </Panel>
    </ReactFlow>
  )
}

/**
 * Editable xyflow canvas for the admin workflow builder.
 * START / END are terminals; TASK and DECISION steps are editable cards.
 */
export default function WorkflowBuilderCanvas({
  steps,
  startRole,
  endRole,
  roles,
  masterForms,
  onUpdateStep: updateStep,
  onRemoveStep: removeStep,
  className,
}) {
  const onUpdateStep = useCallback(
    (id, patch) => updateStep?.(id, patch),
    [updateStep],
  )
  const onRemoveStep = useCallback(
    (id) => removeStep?.(id),
    [removeStep],
  )

  return (
    <div
      className={cn(
        'h-[min(68vh,640px)] min-h-[420px] overflow-hidden rounded-lg border bg-card',
        className,
      )}
    >
      <ReactFlowProvider>
        <CanvasInner
          steps={steps}
          startRole={startRole}
          endRole={endRole}
          roles={roles}
          masterForms={masterForms}
          onUpdateStep={onUpdateStep}
          onRemoveStep={onRemoveStep}
        />
      </ReactFlowProvider>
    </div>
  )
}
