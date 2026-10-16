import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  Handle,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import { Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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

function WorkflowChartCanvas({ nodes, edges, onNodesChange, onEdgesChange, className }) {
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { fitView } = useReactFlow()

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === containerRef.current
      setIsFullscreen(fullscreen)
      if (fullscreen) {
        requestAnimationFrame(() => fitView({ padding: 0.2 }))
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [fitView])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen()
        return
      }
      await containerRef.current.requestFullscreen()
    } catch {
      toast.error('Could not change the workflow full-screen view.')
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col overflow-hidden border bg-card',
        className,
        isFullscreen
          ? 'h-screen min-h-0 w-screen rounded-none border-0'
          : 'h-[min(58vh,560px)] min-h-[360px] rounded-lg',
      )}
    >
      <div className="flex shrink-0 justify-end border-b px-2 py-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="bg-card shadow-sm"
          aria-label={isFullscreen ? 'Exit full screen workflow view' : 'Open full screen workflow view'}
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          onClick={toggleFullscreen}
        >
          {isFullscreen
            ? <Minimize2 className="h-4 w-4" />
            : <Maximize2 className="h-4 w-4" />}
          <span>{isFullscreen ? 'Exit full screen' : 'Full screen'}</span>
        </Button>
      </div>
      <div className="min-h-0 flex-1">
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
          <Controls showInteractive={false} className="!rounded-lg !border-border !shadow-sm" />
        </ReactFlow>
      </div>
    </div>
  )
}

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
    <ReactFlowProvider>
      <WorkflowChartCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        className={className}
      />
    </ReactFlowProvider>
  )
}
