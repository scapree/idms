import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
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
import { useMutation, useQueryClient } from 'react-query'
import { diagramsAPI } from '../api'
import { Lock, Save, RefreshCw } from 'lucide-react'
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
  nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange,
  isDataLoaded 
}) => {
  const reactFlowInstance = useReactFlow()
  const queryClient = useQueryClient()
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
      onSuccess: () => { 
        setIsSaving(false)
        queryClient.invalidateQueries(['diagrams', diagram.project])
      },
      onError: (error) => { 
        console.error("Save error:", error);
        toast.error('Failed to save diagram'); 
        setIsSaving(false) 
      },
    }
  )

  // --- SAVE HANDLER ---
  const handleSave = useCallback(() => {
    if (!diagram || isLocked || !reactFlowInstance || !isDataLoaded) return
    
    setIsSaving(true)

    // Merge logic:
    // React Flow instance has the correct Position (x,y)
    // "nodes" State has the correct Data (attributes, labels, etc.)
    // We must merge them to avoid losing attributes or position.
    const flowNodes = reactFlowInstance.getNodes()
    const flowEdges = reactFlowInstance.getEdges()

    const mergedNodes = flowNodes.map(flowNode => {
        const stateNode = nodes.find(n => n.id === flowNode.id)
        if (!stateNode) return flowNode
        return {
            ...flowNode,
            data: {
                ...flowNode.data,
                ...stateNode.data // Prefer state data (attributes) over flow data if they differ
            }
        }
    })

    const payload = { 
      data: { 
        nodes: mergedNodes, 
        edges: flowEdges 
      } 
    }
    
    updateDiagramMutation.mutate(payload)
  }, [diagram, isLocked, reactFlowInstance, updateDiagramMutation, isDataLoaded, nodes])

  // Автосохранение
  useEffect(() => {
    // CRITICAL: Only save if data has been loaded initially to avoid overwriting with empty state
    if (diagram && !isSaving && !isLocked && isDataLoaded) {
      const timer = setTimeout(handleSave, 3000) // 3 seconds debounce
      return () => clearTimeout(timer)
    }
  }, [nodes, edges, diagram, isLocked, isDataLoaded]) 

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
        // Ensure attributes array exists for ERD
        attributes: nodeConfig.attributes || [],
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

  // 2. Change Cardinality (ERD)
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

  const handleAttributeSave = (newData) => {
      setNodes((nds) => nds.map((n) => {
          if (n.id === attributeModal.node.id) {
              return {
                  ...n,
                  data: {
                      ...n.data,
                      label: newData.label,
                      attributes: newData.attributes // Ensure deep update
                  }
              }
          }
          return n
      }))
      // Force close to avoid stale closures
      setAttributeModal({ isOpen: false, node: null })
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
        minZoom={0.1}
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

                    {/* ERD Cardinality */}
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
        onSave={handleAttributeSave}
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
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  
  // Ref чтобы запомнить ID текущей диаграммы
  const loadedDiagramIdRef = useRef(null)

  useEffect(() => {
    // Reset state when diagram ID changes
    if (props.diagram?.id && props.diagram.id !== loadedDiagramIdRef.current) {
        setIsLoading(true)
        setIsDataLoaded(false)
        setNodes([])
        setEdges([])
        loadedDiagramIdRef.current = props.diagram.id
        
        // Timeout to allow render cycle to clear previous diagram
        const timer = setTimeout(() => {
            const rawData = props.diagram?.data
            let content = { nodes: [], edges: [] }
            
            try {
                if (rawData) {
                    if (typeof rawData === 'string') {
                        content = JSON.parse(rawData)
                    } else if (typeof rawData === 'object') {
                        content = rawData
                    }
                } else if (props.diagram?.content) {
                    // Legacy support
                    content = typeof props.diagram.content === 'string' 
                        ? JSON.parse(props.diagram.content) 
                        : props.diagram.content
                }
            } catch (e) { 
                console.error("Load error", e) 
            }

            // Ensure content.nodes is an array
            const safeNodes = Array.isArray(content.nodes) ? content.nodes : []
            const safeEdges = Array.isArray(content.edges) ? content.edges : []

            setNodes(safeNodes)
            setEdges(safeEdges)
            setIsLoading(false)
            
            // Allow autosave only after data is fully set
            setTimeout(() => {
                setIsDataLoaded(true)
            }, 500)
            
        }, 50)
        return () => clearTimeout(timer)
    }
  }, [props.diagram?.id, setNodes, setEdges, props.diagram])

  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center justify-between p-4 bg-white border-b">
         <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">{props.diagram?.name || 'Untitled'}</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono uppercase">
                {props.diagram?.diagram_type}
            </span>
         </div>
         <div className="flex items-center gap-3">
             {/* Status Indicator */}
             {!isDataLoaded && !isLoading && (
                 <span className="text-xs text-orange-500 flex items-center gap-1">
                     <RefreshCw className="w-3 h-3 animate-spin"/> Syncing...
                 </span>
             )}
             {isDataLoaded && (
                 <div className="text-xs text-gray-400 flex items-center gap-1">
                     <Save className="w-3 h-3"/> Saved
                 </div>
             )}
         </div>
       </div>
       <div className="flex-1 relative bg-gray-50">
         {isLoading ? 
            <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
                <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="text-sm text-gray-500">Loading diagram...</span>
                </div>
            </div> 
            : 
             <ReactFlowProvider>
                <DiagramEditorContent 
                    {...props} 
                    nodes={nodes} setNodes={setNodes} onNodesChange={onNodesChange} 
                    edges={edges} setEdges={setEdges} onEdgesChange={onEdgesChange} 
                    isDataLoaded={isDataLoaded}
                />
             </ReactFlowProvider>
         }
       </div>
    </div>
  )
}

export default DiagramEditor