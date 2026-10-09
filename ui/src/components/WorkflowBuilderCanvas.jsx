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
const FAIL_X = 420
const ROW_H = 210
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
      {data.kind === 'END' && data.acceptFail && (
        <Handle
          type="target"
          id="fail"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !bg-amber-500"
        />
      )}
    </div>
  )
}

function TaskNode({ data, selected }) {
  return (
    <div
      className={cn(
        'w-[300px] rounded-xl border bg-card p-3 shadow-sm transition-shadow',
        selected && 'ring-2 ring-primary shadow-md',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-primary" />
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            Step {data.stepIndex}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            TASK
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
            <Label className="text-[11px]">Role</Label>
            <RoleSelect
              value={data.roleCode}
              roles={data.roles}
              onChange={(v) => data.onUpdate?.({ roleCode: v })}
            />
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
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !bg-primary" />
    </div>
  )
}

function DecisionNode({ data, selected }) {
  return (
    <div
      className={cn(
        'w-[300px] rounded-xl border border-amber-300/70 bg-amber-50/60 p-3 shadow-sm transition-shadow',
        selected && 'ring-2 ring-amber-500 shadow-md',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !bg-amber-600" />
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            Step {data.stepIndex}
          </Badge>
          <Badge variant="warning" className="text-[10px]">
            DECISION
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
            placeholder="Inspection result"
            value={data.label}
            onChange={(e) => data.onUpdate?.({ label: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Role</Label>
          <RoleSelect
            value={data.roleCode}
            roles={data.roles}
            onChange={(v) => data.onUpdate?.({ roleCode: v })}
          />
        </div>
        <p className="rounded-md border border-amber-200 bg-white/70 px-2.5 py-1.5 text-[11px] text-muted-foreground">
          PASS continues down · FAIL goes to reject end
        </p>
      </div>
      <Handle
        type="source"
        id="pass"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !bg-emerald-600"
      />
      <Handle
        type="source"
        id="fail"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !bg-amber-600"
      />
    </div>
  )
}

function FailEndNode({ data }) {
  return (
    <div className="min-w-[180px] rounded-lg border border-rose-300/80 bg-rose-50 px-3 py-2.5 text-center shadow-sm">
      <Handle
        type="target"
        id="fail"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !bg-rose-500"
      />
      <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-700/80">
        END · FAIL
      </div>
      <div className="mt-0.5 text-xs font-medium text-foreground">{data.label}</div>
    </div>
  )
}

const nodeTypes = {
  terminal: TerminalNode,
  taskStep: TaskNode,
  decisionStep: DecisionNode,
  failEnd: FailEndNode,
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
        type: 'decisionStep',
        position: { x: MAIN_X, y },
        draggable: true,
        data: {
          stepIndex,
          label: step.label,
          roleCode: step.roleCode,
          roles,
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

      const failId = `fail-${id}`
      nodes.push({
        id: failId,
        type: 'failEnd',
        position: { x: FAIL_X, y: y + 36 },
        draggable: true,
        data: {
          label: `${step.label?.trim() || `Decision ${stepIndex}`} — FAIL`,
        },
      })
      edges.push({
        id: `e-${id}-${failId}`,
        source: id,
        target: failId,
        sourceHandle: 'fail',
        targetHandle: 'fail',
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
        type: 'taskStep',
        position: { x: MAIN_X, y },
        draggable: true,
        data: {
          stepIndex,
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
        Drag the canvas · edit fields on nodes · FAIL branches show to the right
      </Panel>
    </ReactFlow>
  )
}

/**
 * Editable xyflow canvas for the admin workflow builder.
 * START / END are terminals; TASK and DECISION steps are editable cards.
 */
export default function WorkflowBuilderCanvas(props) {
  const onUpdateStep = useCallback(
    (id, patch) => props.onUpdateStep?.(id, patch),
    [props.onUpdateStep],
  )
  const onRemoveStep = useCallback(
    (id) => props.onRemoveStep?.(id),
    [props.onRemoveStep],
  )

  return (
    <div
      className={cn(
        'h-[min(68vh,640px)] min-h-[420px] overflow-hidden rounded-lg border bg-card',
        props.className,
      )}
    >
      <ReactFlowProvider>
        <CanvasInner
          steps={props.steps}
          startRole={props.startRole}
          endRole={props.endRole}
          roles={props.roles}
          masterForms={props.masterForms}
          onUpdateStep={onUpdateStep}
          onRemoveStep={onRemoveStep}
        />
      </ReactFlowProvider>
    </div>
  )
}
