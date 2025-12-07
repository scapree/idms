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
import { Save, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ShapeNode from './nodes/ShapeNode'
import ERDEdge from './edges/ERDEdge'
import AttributeModal from './AttributeModal'

// --- CONSTANTS ---
const createUniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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

// Parse diagram data safely
const parseDiagramData = (rawData) => {
  try {
    if (!rawData) return { nodes: [], edges: [] }
    if (typeof rawData === 'string') return JSON.parse(rawData)
    if (typeof rawData === 'object') return rawData
  } catch (e) {
    console.error('Failed to parse diagram data:', e)
  }
  return { nodes: [], edges: [] }
}

// Clean node data for serialization - remove ReactFlow internal fields
const cleanNodeForSave = (node) => {
  const { 
    // Remove ReactFlow internal fields
    selected, dragging, measured, resizing, 
    positionAbsolute, draggable, selectable, deletable, connectable,
    // Keep everything else
    ...cleanNode 
  } = node
  
  return {
    id: cleanNode.id,
    type: cleanNode.type,
    position: cleanNode.position,
    data: cleanNode.data,
    // Keep optional fields if they exist and are meaningful
    ...(cleanNode.width && { width: cleanNode.width }),
    ...(cleanNode.height && { height: cleanNode.height }),
    ...(cleanNode.style && { style: cleanNode.style }),
    ...(cleanNode.className && { className: cleanNode.className }),
    ...(cleanNode.parentId && { parentId: cleanNode.parentId }),
    ...(cleanNode.extent && { extent: cleanNode.extent }),
  }
}

// Clean edge data for serialization
const cleanEdgeForSave = (edge) => {
  const {
    selected, interactionWidth,
    ...cleanEdge
  } = edge
  
  return {
    id: cleanEdge.id,
    source: cleanEdge.source,
    target: cleanEdge.target,
    ...(cleanEdge.type && { type: cleanEdge.type }),
    ...(cleanEdge.sourceHandle && { sourceHandle: cleanEdge.sourceHandle }),
    ...(cleanEdge.targetHandle && { targetHandle: cleanEdge.targetHandle }),
    ...(cleanEdge.data && { data: cleanEdge.data }),
    ...(cleanEdge.style && { style: cleanEdge.style }),
    ...(cleanEdge.label && { label: cleanEdge.label }),
    ...(cleanEdge.labelStyle && { labelStyle: cleanEdge.labelStyle }),
    ...(cleanEdge.labelBgStyle && { labelBgStyle: cleanEdge.labelBgStyle }),
    ...(cleanEdge.markerEnd && { markerEnd: cleanEdge.markerEnd }),
    ...(cleanEdge.markerStart && { markerStart: cleanEdge.markerStart }),
  }
}

// Deep compare for checking if data actually changed
const dataChanged = (oldNodes, oldEdges, newNodes, newEdges) => {
  if (oldNodes.length !== newNodes.length || oldEdges.length !== newEdges.length) {
    return true
  }
  
  // Compare cleaned versions
  const cleanOld = JSON.stringify({ 
    nodes: oldNodes.map(cleanNodeForSave), 
    edges: oldEdges.map(cleanEdgeForSave) 
  })
  const cleanNew = JSON.stringify({ 
    nodes: newNodes.map(cleanNodeForSave), 
    edges: newEdges.map(cleanEdgeForSave) 
  })
  return cleanOld !== cleanNew
}

const DiagramEditorContent = ({ 
  diagram, diagramType, isLocked, connectionType, 
  nodes, setNodes, onNodesChange, edges, setEdges, onEdgesChange,
  onDataChange, initialDataRef, setForceSaveRef
}) => {
  const reactFlowInstance = useReactFlow()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [attributeModal, setAttributeModal] = useState({ isOpen: false, node: null })
  const saveTimeoutRef = useRef(null)
  const isDirtyRef = useRef(false)
  const lastSavedDataRef = useRef(null)

  const nodeTypes = useMemo(() => ({ shape: ShapeNode }), [])
  const edgeTypes = useMemo(() => ({ erd: ERDEdge }), [])

  // Center view on nodes after mount
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      // Small delay to ensure nodes are rendered
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 200 })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [reactFlowInstance]) // Only run once when instance is ready

  // --- EDGE CONFIGURATION ---
  const getEdgeConfig = useCallback((flowType) => {
    if (diagramType === 'erd') {
      return { type: 'erd', style: { stroke: '#111827', strokeWidth: 2 } }
    }
    
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

    return { 
      type: 'smoothstep',
      style: { stroke: '#1f2937', strokeWidth: 2 }, 
      markerEnd: { type: MarkerType.ArrowClosed, color: '#1f2937' } 
    }
  }, [diagramType])

  const updateDiagramMutation = useMutation(
    (data) => diagramsAPI.updateDiagram(diagram.id, data),
    {
      onSuccess: (savedDiagram) => { 
        setIsSaving(false)
        setLastSaved(new Date())
        isDirtyRef.current = false

        // Store what we saved to compare later
        if (reactFlowInstance) {
          const savedNodes = reactFlowInstance.getNodes().map(cleanNodeForSave)
          const savedEdges = reactFlowInstance.getEdges().map(cleanEdgeForSave)
          lastSavedDataRef.current = { nodes: savedNodes, edges: savedEdges }
        }

        // Обновляем кэш списка диаграмм, чтобы при переключении подтягивались свежие данные
        if (diagram?.project) {
          queryClient.setQueryData(['diagrams', diagram.project], (prev) => {
            if (!Array.isArray(prev)) return prev
            return prev.map((d) => (d.id === diagram.id ? { ...d, ...savedDiagram } : d))
          })
        }
      },
      onError: (error) => { 
        console.error('Save error:', error)
        toast.error('Failed to save: ' + (error.response?.data?.detail || error.message))
        setIsSaving(false) 
      },
    }
  )

  // --- SAVE HANDLER ---
  const handleSave = useCallback(async () => {
    if (!diagram || isLocked || !reactFlowInstance || isSaving) return
    
    const currentNodes = reactFlowInstance.getNodes()
    const currentEdges = reactFlowInstance.getEdges()
    
    // Check if anything actually changed since last save
    if (lastSavedDataRef.current) {
      const hasChanges = dataChanged(
        lastSavedDataRef.current.nodes,
        lastSavedDataRef.current.edges,
        currentNodes,
        currentEdges
      )
      if (!hasChanges) {
        isDirtyRef.current = false
        return
      }
    }

    // Clean data for serialization - remove ReactFlow internal fields
    const cleanedNodes = currentNodes.map(cleanNodeForSave)
    const cleanedEdges = currentEdges.map(cleanEdgeForSave)

    setIsSaving(true)

    const payload = { 
      data: { 
        nodes: cleanedNodes, 
        edges: cleanedEdges 
      } 
    }
    
    await updateDiagramMutation.mutateAsync(payload)
  }, [diagram, isLocked, reactFlowInstance, isSaving, updateDiagramMutation])

  // Mark as dirty when user makes changes and debounce save
  const scheduleAutosave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    // короткий дебаунс, чтобы сохранять почти сразу
    saveTimeoutRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        handleSave()
      }
    }, 400)
  }, [handleSave])

  const markDirty = useCallback(() => {
    isDirtyRef.current = true
    onDataChange?.()
    scheduleAutosave()
  }, [onDataChange, scheduleAutosave])

  // Custom nodes change handler that tracks dirty state
  const handleNodesChange = useCallback((changes) => {
    // Only treat real edits as dirty: position/add/remove
    const significantChanges = changes.filter(c => ['position', 'add', 'remove'].includes(c.type))
    if (significantChanges.length > 0) {
      markDirty()
    }
    onNodesChange(changes)
  }, [onNodesChange, markDirty])

  // Custom edges change handler
  const handleEdgesChange = useCallback((changes) => {
    const significantChanges = changes.filter(c => ['add', 'remove'].includes(c.type))
    if (significantChanges.length > 0) {
      markDirty()
    }
    onEdgesChange(changes)
  }, [onEdgesChange, markDirty])

  // Cleanup pending autosave on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && reactFlowInstance && diagram && !isLocked) {
        const currentNodes = reactFlowInstance.getNodes()
        const currentEdges = reactFlowInstance.getEdges()
        // Clean and save
        const cleanedNodes = currentNodes.map(cleanNodeForSave)
        const cleanedEdges = currentEdges.map(cleanEdgeForSave)
        // Sync save attempt on unmount
        diagramsAPI.updateDiagram(diagram.id, {
          data: { nodes: cleanedNodes, edges: cleanedEdges }
        }).catch(err => console.error('Failed to save on unmount:', err))
      }
    }
  }, [diagram, isLocked, reactFlowInstance])

  // --- CONNECTION HANDLER ---
  const onConnect = useCallback((params) => {
    if (isLocked) return

    markDirty()

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

    setEdges((eds) => {
      const config = getEdgeConfig(connectionType)
      const mergedParams = { 
        ...params, 
        ...config, 
        data: { ...(params.data || {}), flowType: connectionType } 
      }
      return addEdge(mergedParams, eds)
    })
  }, [diagramType, connectionType, isLocked, getEdgeConfig, setEdges, markDirty])

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
        attributes: nodeConfig.attributes || [],
      },
    }
    
    markDirty()
    setNodes((nds) => nds.concat(newNode))
  }, [isLocked, reactFlowInstance, setNodes, markDirty])

  const onDragOver = useCallback((e) => { 
    e.preventDefault()
    e.dataTransfer.dropEffect = isLocked ? 'none' : 'move' 
  }, [isLocked])

  // Context Menu Handlers
  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault()
    if (isLocked) return
    setContextMenu({ type: 'node', x: event.clientX, y: event.clientY, data: node })
  }, [isLocked])

  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault()
    if (isLocked) return
    setContextMenu({ type: 'edge', x: event.clientX, y: event.clientY, data: edge })
  }, [isLocked])

  const handleNodeDoubleClick = useCallback((event, node) => {
    event.preventDefault()
    if (isLocked) return
    if (diagramType === 'erd' && isErdEntity(node)) {
      setAttributeModal({ isOpen: true, node })
    } else {
      const label = window.prompt('Rename:', node.data?.label)
      if (label) {
        markDirty()
        setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label } } : n))
      }
    }
  }, [diagramType, isLocked, setNodes, markDirty])

  // Actions
  const handleRenameEdge = (edge) => {
    const newLabel = window.prompt('Enter data flow name:', edge.label)
    if (newLabel !== null) {
      markDirty()
      setEdges((eds) => eds.map(e => e.id === edge.id ? { ...e, label: newLabel } : e))
    }
    setContextMenu(null)
  }

  const updateEdgeCardinality = (edgeId, type) => {
    const settings = ERD_PRESETS[type]
    markDirty()
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

  const handleDelete = () => {
    markDirty()
    if (contextMenu?.type === 'node') {
      setNodes((nds) => nds.filter((n) => n.id !== contextMenu.data.id))
      setEdges((eds) => eds.filter((e) => e.source !== contextMenu.data.id && e.target !== contextMenu.data.id))
    } else if (contextMenu?.type === 'edge') {
      setEdges((eds) => eds.filter((e) => e.id !== contextMenu.data.id))
    }
    setContextMenu(null)
  }

  const handleAttributeSave = (newData) => {
    markDirty()
    setNodes((nds) => nds.map((n) => {
      if (n.id === attributeModal.node.id) {
        return {
          ...n,
          data: {
            ...n.data,
            label: newData.label,
            attributes: newData.attributes
          }
        }
      }
      return n
    }))
    setAttributeModal({ isOpen: false, node: null })
  }

  // Expose force save to parent (for diagram switch)
  useEffect(() => {
    if (setForceSaveRef) {
      setForceSaveRef(() => handleSave)
      return () => setForceSaveRef(null)
    }
  }, [setForceSaveRef, handleSave])

  // Manual save handler (for keyboard shortcut)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Use code to work across keyboard layouts
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault()
        if (isDirtyRef.current) {
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  return (
    <>
      <ReactFlow
        nodes={nodes} 
        edges={edges}
        onNodesChange={handleNodesChange} 
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onDrop={onDrop} 
        onDragOver={onDragOver}
        nodeTypes={nodeTypes} 
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        connectionMode={ConnectionMode.Loose}
        minZoom={0.1}
      >
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} zoomable={!isLocked} pannable={!isLocked} />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {contextMenu && (
        <div 
          className="fixed bg-white rounded shadow-lg border py-1 z-50 text-sm min-w-[180px]" 
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'node' && (
            <>
              {diagramType === 'erd' && isErdEntity(contextMenu.data) && (
                <button 
                  onClick={() => { setAttributeModal({ isOpen: true, node: contextMenu.data }); setContextMenu(null) }} 
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>✏️</span>Edit Attributes
                </button>
              )}
              <button 
                onClick={() => {
                  const label = window.prompt('Rename', contextMenu.data.data?.label)
                  if (label) {
                    markDirty()
                    setNodes(nds => nds.map(n => n.id === contextMenu.data.id ? {...n, data: {...n.data, label}} : n))
                  }
                  setContextMenu(null)
                }} 
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2"
              >
                <span>📝</span>Rename
              </button>
            </>
          )}
          
          {contextMenu.type === 'edge' && (
            <>
              {diagramType === 'dfd' && (
                <button 
                  onClick={() => handleRenameEdge(contextMenu.data)} 
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  Rename Data Flow
                </button>
              )}
              {diagramType === 'erd' && (
                <>
                  <div className="px-4 py-1 text-xs text-gray-400 uppercase font-semibold border-b">
                    Change Cardinality
                  </div>
                  <button onClick={() => updateEdgeCardinality(contextMenu.data.id, '1:1')} className="w-full px-4 py-2 text-left hover:bg-gray-100">One to One (1:1)</button>
                  <button onClick={() => updateEdgeCardinality(contextMenu.data.id, '1:N')} className="w-full px-4 py-2 text-left hover:bg-gray-100">One to Many (1:N)</button>
                  <button onClick={() => updateEdgeCardinality(contextMenu.data.id, 'N:1')} className="w-full px-4 py-2 text-left hover:bg-gray-100">Many to One (N:1)</button>
                  <button onClick={() => updateEdgeCardinality(contextMenu.data.id, 'M:N')} className="w-full px-4 py-2 text-left hover:bg-gray-100">Many to Many (M:N)</button>
                </>
              )}
            </>
          )}
          <div className="h-px bg-gray-200 my-1"></div>
          <button 
            onClick={handleDelete} 
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <span>🗑️</span>Delete
          </button>
        </div>
      )}
      
      <div 
        onClick={() => setContextMenu(null)} 
        className={`fixed inset-0 z-40 ${contextMenu ? 'block' : 'hidden'}`}
      />

      <AttributeModal
        isOpen={attributeModal.isOpen}
        onClose={() => setAttributeModal({ isOpen: false, node: null })}
        onSave={handleAttributeSave}
        nodeData={attributeModal.node?.data}
        isEntity={isErdEntity(attributeModal.node)}
      />

      {/* Save Status Indicator */}
      <div className="absolute bottom-4 right-4 z-10">
        {isSaving ? (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow text-sm text-gray-600">
            <Save className="w-4 h-4 animate-pulse" />
            Saving...
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </div>
        ) : null}
      </div>
    </>
  )
}

const DiagramEditor = (props) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [isReady, setIsReady] = useState(false)
  const currentDiagramId = useRef(null)
  const initialDataRef = useRef(null)
  const forceSaveRef = useRef(null)
  const loadCounterRef = useRef(0)

  // Load diagram data when diagram changes
  useEffect(() => {
    const diagramId = props.diagram?.id

    // No diagram selected - reset state
    if (!diagramId) {
      setIsReady(false)
      currentDiagramId.current = null
      initialDataRef.current = null
      setNodes([])
      setEdges([])
      return
    }

    // New diagram - always reload data from props
    const isSameDiagram = diagramId === currentDiagramId.current
    
    // Track load to handle race conditions
    loadCounterRef.current += 1
    const thisLoad = loadCounterRef.current

    const loadDiagram = async () => {
      // If switching to a different diagram, flush save of the previous one
      if (!isSameDiagram && currentDiagramId.current && forceSaveRef.current) {
        try {
          await forceSaveRef.current()
        } catch (e) {
          console.error('Failed to save before switching diagram:', e)
        }
      }

      // Check if another load started while we were saving
      if (thisLoad !== loadCounterRef.current) return

      // Begin loading new diagram
      setIsReady(false)
      currentDiagramId.current = diagramId

      // Parse data from props - always use fresh data from props
      const data = parseDiagramData(props.diagram?.data)
      const safeNodes = Array.isArray(data.nodes) ? data.nodes : []
      const safeEdges = Array.isArray(data.edges) ? data.edges : []

      // Store initial data for comparison
      initialDataRef.current = { nodes: safeNodes, edges: safeEdges }

      // Set data
      setNodes(safeNodes)
      setEdges(safeEdges)

      // Ready after a frame to ensure React Flow has rendered
      requestAnimationFrame(() => {
        if (thisLoad === loadCounterRef.current) {
          setIsReady(true)
        }
      })
    }

    loadDiagram()
  }, [props.diagram?.id, props.diagram?.data, props.diagram?.updated_at, setNodes, setEdges])

  if (!props.diagram) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <span className="text-gray-500">No diagram selected</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">{props.diagram?.name || 'Untitled'}</h2>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono uppercase">
            {props.diagram?.diagram_type}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          Ctrl+S to save
        </div>
      </div>
      <div className="flex-1 relative bg-gray-50">
        {!isReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="text-sm text-gray-500">Loading diagram...</span>
            </div>
          </div>
        ) : (
          <ReactFlowProvider>
            <DiagramEditorContent 
              {...props} 
              nodes={nodes} 
              setNodes={setNodes} 
              onNodesChange={onNodesChange} 
              edges={edges} 
              setEdges={setEdges} 
              onEdgesChange={onEdgesChange}
              initialDataRef={initialDataRef}
              setForceSaveRef={(fn) => { forceSaveRef.current = fn }}
            />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  )
}

export default DiagramEditor
