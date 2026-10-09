import { useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const TYPE_STYLES = {
  START: 'border-emerald-300 bg-emerald-50',
  END: 'border-zinc-300 bg-zinc-50',
  DECISION: 'border-amber-300 bg-amber-50',
  TASK: 'border-teal-300 bg-white',
}

function WorkflowNodeCard({ data }) {
  const active = data.active
  return (
    <div
      className={cn(
        'min-w-[180px] max-w-[220px] rounded-lg border px-3 py-2.5 shadow-sm transition-all duration-300',
        TYPE_STYLES[data.nodeType] || TYPE_STYLES.TASK,
        active && 'scale-[1.02] shadow-md ring-2 ring-primary',
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !bg-primary" />
      <div className="mb-1 flex items-center justify-between gap-2">
        <Badge variant={data.nodeType === 'DECISION' ? 'warning' : 'secondary'} className="text-[10px]">
          {data.nodeType}
        </Badge>
        {active && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
      </div>
      <div className="text-sm font-semibold leading-snug text-foreground">{data.label}</div>
      {data.roleCode && (
        <div className="mt-1 text-[11px] text-muted-foreground">{data.roleCode}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !bg-primary" />
    </div>
  )
}

const nodeTypes = { workflow: WorkflowNodeCard }

function layoutNodes(nodes) {
  const cols = 3
  return nodes.map((n, i) => ({
    id: n.key,
    type: 'workflow',
    position: {
      x: (i % cols) * 280 + 48,
      y: Math.floor(i / cols) * 160 + 48,
    },
    data: {
      label: n.label || n.key,
      nodeType: n.type || n.nodeType || 'TASK',
      roleCode: n.roleCode,
      active: false,
    },
  }))
}

export default function WorkflowChart({ definition, currentNodeKey, className }) {
  const initial = useMemo(() => {
    const nodes = definition?.nodes || []
    const transitions = definition?.transitions || []
    const flowNodes = layoutNodes(nodes).map((n) => ({
      ...n,
      data: { ...n.data, active: n.id === currentNodeKey },
    }))
    const flowEdges = transitions.map((t, idx) => ({
      id: `e-${t.from}-${t.to}-${idx}`,
      source: t.from,
      target: t.to,
      label: t.when || undefined,
      animated: t.from === currentNodeKey,
      style: {
        stroke: t.from === currentNodeKey ? '#0f766e' : '#a1a1aa',
        strokeWidth: t.from === currentNodeKey ? 2 : 1.25,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: t.from === currentNodeKey ? '#0f766e' : '#a1a1aa',
      },
      labelStyle: { fontSize: 10, fill: '#71717a' },
    }))
    return { flowNodes, flowEdges }
  }, [definition, currentNodeKey])

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.flowEdges)

  useEffect(() => {
    setNodes(initial.flowNodes)
    setEdges(initial.flowEdges)
  }, [initial, setNodes, setEdges])

  if (!definition?.nodes?.length) {
    return (
      <div
        className={cn(
          'flex h-[min(58vh,560px)] min-h-[360px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground',
          className,
        )}
      >
        No workflow graph available
      </div>
    )
  }

  return (
    <div
      className={cn(
        'h-[min(58vh,560px)] min-h-[360px] overflow-hidden rounded-lg border bg-card',
        className,
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.35}
        maxZoom={1.5}
      >
        <Background gap={20} size={1} color="#e4e4e7" />
        <MiniMap pannable zoomable className="!border-border !bg-muted/60" />
        <Controls showInteractive={false} className="!rounded-lg !border-border !shadow-sm" />
      </ReactFlow>
    </div>
  )
}
