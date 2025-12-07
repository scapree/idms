import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  MarkerType,
  ConnectionMode,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useMutation } from 'react-query'
import { diagramsAPI } from '../api'
import { Lock, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import ShapeNode from './nodes/ShapeNode'
import ERDEdge from './edges/ERDEdge'
import AttributeModal from './AttributeModal'

// --- CONSTANTS ---
const CONTAINER_SHAPES = new Set(['lane', 'pool'])
const createUniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const isContainerShape = (shape) => CONTAINER_SHAPES.has(shape)
const isErdEntity = (node) => node?.data?.shape === 'entity'

// --- ERD SETTINGS ---
const ERD_PRESETS = {
  '1:1': { sourceCardinality: 'one', targetCardinality: 'one' },
  '1:N': { sourceCardinality: 'one', targetCardinality: 'many' },
  'N:1': { sourceCardinality: 'many', targetCardinality: 'one' },
  'M:N': { sourceCardinality: 'many', targetCardinality: 'many' },
}
const DEFAULT_ERD_CONNECTION = ERD_PRESETS['1:N']

const getConnectionData = (type) => {
  const map = {
    'erd-one-to-one': ERD_PRESETS['1:1'],
    'erd-one-to-many': ERD_PRESETS['1:N'],
    'erd-many-to-many': ERD_PRESETS['M:N'],
  }
  return map[type] || DEFAULT_ERD_CONNECTION
}

const DiagramEditorContent = ({ 
  diagram, diagramType, isLocked, lockUser, connectionType, 
  nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange 
}) => {
  const reactFlowInstance = useReactFlow()
  const [isSaving, setIsSaving] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const [attributeModal, setAttributeModal] = useState({ isOpen: false, node: null })

  const nodeTypes = useMemo(() => ({ shape: ShapeNode }), [])
  const edgeTypes = useMemo(() => ({ erd: ERDEdge }), [])

  // --- EDGE CONFIGURATION ---
  const getEdgeConfig = useCallback((flowType) => {
    // ERD
    if (diagramType === 'erd') {
      return { type: 'erd', style: { stroke: '#111827', strokeWidth: 2 } }
    }
    
    // DFD Style
    if (diagramType === 'dfd') {
        return {
            type: 'default',
            style: { stroke: '#8b5cf6', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#8b5cf6' },
            label: 'Data Flow',
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 4,
            labelStyle: { fill: '#8b5cf6', fontWeight: 600 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
        }
    }

    // BPMN Default
    return { 
        type: 'smoothstep',
        style: { stroke: '#1f2937', strokeWidth: 2 }, 
        markerEnd: { type: MarkerType.ArrowClosed, color: '#1f2937' } 
    }
  }, [diagramType])

  const updateDiagramMutation = useMutation(
    (data) => diagramsAPI.updateDiagram(diagram.id, data),
    {
      onSuccess: () => { toast.success('Saved'); setIsSaving(false) },
      onError: () => { toast.error('Failed to save'); setIsSaving(false) },
    }
  )

  const handleSave = useCallback(() => {
    if (!diagram || isLocked) return
    setIsSaving(true)
    const content = JSON.stringify({ nodes, edges })
    updateDiagramMutation.mutate({ content })
  }, [diagram, nodes, edges, isLocked, updateDiagramMutation])

  useEffect(() => {
    if (diagram && !isSaving && !isLocked) {
      const timer = setTimeout(handleSave, 5000)
      return () => clearTimeout(timer)
    }
  }, [nodes, edges, diagram, isLocked])

  // --- CONNECTION HANDLER ---
  const onConnect = useCallback((params) => {
    if (isLocked) return

    // ERD Special Logic
    if (diagramType === 'erd') {
        const connSettings = getConnectionData(connectionType)
        const newEdge = {
            id: createUniqueId('erd-edge'),
            source: params.source,
            target: params.target,
            sourceHandle: params.sourceHandle,
            targetHandle: params.targetHandle,
            type: 'erd',
            data: {
                sourceCardinality: connSettings.sourceCardinality,
                targetCardinality: connSettings.targetCardinality,
            },
            style: { stroke: '#333', strokeWidth: 2 },
        }
        setEdges((eds) => addEdge(newEdge, eds))
        return
    }

    // Standard Logic (DFD & BPMN)
    setEdges((eds) => {
      const config = getEdgeConfig(connectionType)
      const mergedParams = { 
          ...params, 
          ...config, 
          data: { ...(params.data || {}), flowType: connectionType } 
      }
      return addEdge(mergedParams, eds)
    })
  }, [diagramType, connectionType, isLocked, getEdgeConfig, setEdges])

  const onDrop = useCallback((event) => {
    event.preventDefault()
    if (isLocked) return
    const transferData = event.dataTransfer.getData('application/reactflow')
    if (!transferData) return

    let parsedData
    try { parsedData = JSON.parse(transferData) } catch (e) { return }

    let position = reactFlowInstance.screenToFlowPosition 
        ? reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
        : { x: 0, y: 0 }

    const nodeConfig = parsedData.nodeConfig || {}
    const newNode = {
      id: `${parsedData.id || 'node'}-${Date.now()}`,
      type: nodeConfig.type || 'shape',
      position,
      data: {
        ...nodeConfig,
        label: nodeConfig.label || parsedData.name || 'Node',
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }, [isLocked, reactFlowInstance, setNodes])

  const onDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = isLocked ? 'none' : 'move' }, [isLocked])

  // --- CONTEXT MENUS HANDLERS ---
  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault(); if (isLocked) return;
    setContextMenu({ type: 'node', x: event.clientX, y: event.clientY, data: node })
  }, [isLocked])

  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault(); if (isLocked) return;
    setContextMenu({ type: 'edge', x: event.clientX, y: event.clientY, data: edge })
  }, [isLocked])

  const handleNodeDoubleClick = useCallback((event, node) => {
    event.preventDefault(); if (isLocked) return;
    if (diagramType === 'erd' && isErdEntity(node)) {
      setAttributeModal({ isOpen: true, node })
    } else {
      const label = window.prompt('Rename:', node.data?.label);
      if (label) setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label } } : n))
    }
  }, [diagramType, isLocked, setNodes])

  // --- ACTIONS ---

  // 1. Rename Edge (DFD)
  const handleRenameEdge = (edge) => {
      const newLabel = window.prompt("Enter data flow name:", edge.label);
      if (newLabel !== null) {
          setEdges((eds) => eds.map(e => e.id === edge.id ? { ...e, label: newLabel } : e));
      }
      setContextMenu(null);
  }

  // 2. Change Cardinality (ERD) - ВОТ ЭТА ФУНКЦИЯ
  const updateEdgeCardinality = (edgeId, type) => {
      const settings = ERD_PRESETS[type];
      setEdges((eds) => eds.map(e => {
          if (e.id === edgeId) {
              return {
                  ...e,
                  data: {
                      ...e.data,
                      sourceCardinality: settings.sourceCardinality,
                      targetCardinality: settings.targetCardinality
                  }
              }
          }
          return e
      }))
      setContextMenu(null)
  }

  // 3. Delete Item
  const handleDelete = () => {
      if (contextMenu?.type === 'node') {
          setNodes((nds) => nds.filter((n) => n.id !== contextMenu.data.id))
          setEdges((eds) => eds.filter((e) => e.source !== contextMenu.data.id && e.target !== contextMenu.data.id))
      } else if (contextMenu?.type === 'edge') {
          setEdges((eds) => eds.filter((e) => e.id !== contextMenu.data.id))
      }
      setContextMenu(null)
  }

  return (
    <>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onDrop={onDrop} onDragOver={onDragOver}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        fitView connectionMode={ConnectionMode.Loose}
      >
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} zoomable={!isLocked} pannable={!isLocked} />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {/* --- CONTEXT MENU DOM --- */}
      {contextMenu && (
        <div className="fixed bg-white rounded shadow-lg border py-1 z-50 text-sm min-w-[180px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
            
            {/* NODE MENU */}
            {contextMenu.type === 'node' && (
                <>
                    {diagramType === 'erd' && isErdEntity(contextMenu.data) && (
                         <button onClick={() => { setAttributeModal({ isOpen: true, node: contextMenu.data }); setContextMenu(null); }} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"><span>✏️</span>Edit Attributes</button>
                    )}
                    <button onClick={() => {
                        const label = window.prompt('Rename', contextMenu.data.data?.label);
                        if(label) setNodes(nds => nds.map(n => n.id === contextMenu.data.id ? {...n, data: {...n.data, label}} : n))
                        setContextMenu(null);
                    }} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"><span>📝</span>Rename</button>
                </>
            )}
            
            {/* EDGE MENU */}
            {contextMenu.type === 'edge' && (
                <>
                    {/* DFD Rename */}
                    {diagramType === 'dfd' && (
                        <button onClick={() => handleRenameEdge(contextMenu.data)} className="w-full px-4 py-2 text-left hover:bg-gray-100">Rename Data Flow</button>
                    )}

                    {/* ERD Cardinality - ВОТ ЭТОТ БЛОК ВЕРНУЛСЯ */}
                    {diagramType === 'erd' && (
                        <>
                            <div className="px-4 py-1 text-xs text-gray-400 uppercase font-semibold border-b">Change Cardinality</div>
                            <button onClick={() => updateEdgeCardinality(contextMenu.data.id, '1:1')} className="w-full px-4 py-2 text-left hover:bg-gray-100">One to One (1:1)</button>
                            <button onClick={() => updateEdgeCardinality(contextMenu.data.id, '1:N')} className="w-full px-4 py-2 text-left hover:bg-gray-100">One to Many (1:N)</button>
                            <button onClick={() => updateEdgeCardinality(contextMenu.data.id, 'N:1')} className="w-full px-4 py-2 text-left hover:bg-gray-100">Many to One (N:1)</button>
                            <button onClick={() => updateEdgeCardinality(contextMenu.data.id, 'M:N')} className="w-full px-4 py-2 text-left hover:bg-gray-100">Many to Many (M:N)</button>
                        </>
                    )}
                </>
            )}

            <div className="h-px bg-gray-200 my-1"></div>
            <button onClick={handleDelete} className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"><span>🗑️</span>Delete</button>
        </div>
      )}
      
      <div onClick={() => setContextMenu(null)} className={`fixed inset-0 z-40 ${contextMenu ? 'block' : 'hidden'}`}></div>

      <AttributeModal
        isOpen={attributeModal.isOpen}
        onClose={() => setAttributeModal({ isOpen: false, node: null })}
        onSave={(data) => setNodes(nds => nds.map(n => n.id === attributeModal.node.id ? { ...n, data: { ...n.data, ...data } } : n))}
        nodeData={attributeModal.node?.data}
        isEntity={isErdEntity(attributeModal.node)}
      />
    </>
  )
}

const DiagramEditor = (props) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => {
        const rawContent = props.diagram?.data ?? props.diagram?.content
        if (rawContent) {
          try {
            const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
            setNodes(content.nodes || [])
            setEdges(content.edges || [])
          } catch (e) { console.error("Load Error", e) }
        } else { setNodes([]); setEdges([]) }
        setIsLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [props.diagram, setNodes, setEdges])

  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center justify-between p-4 bg-white border-b">
         <h2 className="text-lg font-medium">{props.diagram?.name || 'Untitled'}</h2>
         <button className="btn btn-sm btn-primary flex gap-1" onClick={() => toast.success('Saved')}><Save className="w-4"/>Save</button>
       </div>
       <div className="flex-1 relative">
         {isLoading ? <div className="absolute inset-0 flex items-center justify-center bg-white z-50">Loading...</div> : 
             <ReactFlowProvider>
                <DiagramEditorContent {...props} nodes={nodes} setNodes={setNodes} onNodesChange={onNodesChange} edges={edges} setEdges={setEdges} onEdgesChange={onEdgesChange} />
             </ReactFlowProvider>
         }
       </div>
    </div>
  )
}

export default DiagramEditor