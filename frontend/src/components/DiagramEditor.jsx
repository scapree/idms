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
import { useMutation, useQueryClient, useQuery } from 'react-query'
import { diagramsAPI } from '../api'
import { Save, CheckCircle2, Link2, ExternalLink, Unlink, ArrowUpRight, Edit, Trash2, Palette, Download, Upload, Bookmark, HelpCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ShapeNode from './nodes/ShapeNode'
import ERDEdge from './edges/ERDEdge'
import AttributeModal from './AttributeModal'
import LinkDiagramModal from './LinkDiagramModal'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import ExportModal from './ExportModal'
import ValidationPanel from './ValidationPanel'

// --- CONSTANTS ---
const createUniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const isErdEntity = (node) => node?.data?.shape === 'entity'

// Цвета для ERD сущностей
const ERD_ENTITY_COLORS = [
  { id: 'blue', name: 'Синий', color: '#2563eb' },
  { id: 'green', name: 'Зелёный', color: '#16a34a' },
  { id: 'purple', name: 'Фиолетовый', color: '#7c3aed' },
  { id: 'orange', name: 'Оранжевый', color: '#ea580c' },
  { id: 'rose', name: 'Розовый', color: '#e11d48' },
  { id: 'teal', name: 'Бирюзовый', color: '#0d9488' },
  { id: 'gray', name: 'Серый', color: '#6b7280' },
]

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
    'erd-one-to-one': { ...ERD_PRESETS['1:1'], isIdentifying: true },
    'erd-one-to-many': { ...ERD_PRESETS['1:N'], isIdentifying: true },
    'erd-many-to-one': { ...ERD_PRESETS['N:1'], isIdentifying: true },
    'erd-many-to-many': { ...ERD_PRESETS['M:N'], isIdentifying: false },
  }
  return map[type] || { ...DEFAULT_ERD_CONNECTION, isIdentifying: true }
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
  onDataChange, initialDataRef, setForceSaveRef, onNavigateToDiagram,
  highlightElementId
}) => {
  const reactFlowInstance = useReactFlow()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [attributeModal, setAttributeModal] = useState({ isOpen: false, node: null })
  const [linkModal, setLinkModal] = useState({ isOpen: false, node: null, editingLink: null })
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [highlightedNodeId, setHighlightedNodeId] = useState(null)
  const saveTimeoutRef = useRef(null)
  const isDirtyRef = useRef(false)
  const lastSavedDataRef = useRef(null)
  const clipboardRef = useRef({ nodes: [], edges: [] })

  const nodeTypes = useMemo(() => ({ shape: ShapeNode }), [])
  const edgeTypes = useMemo(() => ({ erd: ERDEdge }), [])

  // Fetch diagram links
  const { data: diagramLinks } = useQuery(
    ['diagram-links', diagram?.id],
    () => diagramsAPI.getDiagramLinks(diagram.id),
    { 
      enabled: !!diagram?.id,
      staleTime: 0,
      cacheTime: 0,
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    }
  )

  // Create link mutation
  const createLinkMutation = useMutation(
    (linkData) => diagramsAPI.createDiagramLink(diagram.id, linkData),
    {
      onSuccess: async (data) => {
        // Show warnings if any from semantic validation
        if (data.warnings && data.warnings.length > 0) {
          data.warnings.forEach(warning => {
            toast(warning, { icon: '⚠️', duration: 5000 })
          })
        }
        toast.success('Связь создана!')
        // Invalidate ALL diagram links queries to update incoming panels too
        await queryClient.invalidateQueries({ queryKey: ['diagram-links'] })
        setLinkModal({ isOpen: false, node: null })
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Не удалось создать связь')
      }
    }
  )

  // Delete link mutation
  const deleteLinkMutation = useMutation(
    (linkId) => diagramsAPI.deleteDiagramLink(linkId),
    {
      onSuccess: async () => {
        toast.success('Связь удалена')
        // Invalidate ALL diagram links queries to update everything
        await queryClient.invalidateQueries({ queryKey: ['diagram-links'] })
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Не удалось удалить связь')
      }
    }
  )

  // Update link mutation
  const updateLinkMutation = useMutation(
    ({ linkId, linkData }) => diagramsAPI.updateDiagramLink(linkId, linkData),
    {
      onSuccess: async () => {
        toast.success('Связь обновлена!')
        await queryClient.invalidateQueries({ queryKey: ['diagram-links'] })
        setLinkModal({ isOpen: false, node: null, editingLink: null })
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Не удалось обновить связь')
      }
    }
  )

  // Create a map of element IDs to their links (array - multiple links allowed)
  // Using JSON.stringify to ensure proper dependency tracking
  const outgoingLinksJson = JSON.stringify(diagramLinks?.outgoing || [])
  const elementLinksMap = useMemo(() => {
    const map = new Map()
    const outgoing = JSON.parse(outgoingLinksJson)
    outgoing.forEach(link => {
      const existing = map.get(link.source_element_id) || []
      existing.push(link)
      map.set(link.source_element_id, existing)
    })
    return map
  }, [outgoingLinksJson])

  // Enrich nodes with link data (supports multiple links) and highlight state
  const enrichedNodes = useMemo(() => {
    return nodes.map(node => {
      const links = elementLinksMap.get(node.id)
      const isHighlighted = highlightedNodeId === node.id
      // Strip old link data first to ensure clean state
      const { linkedDiagram, linkedDiagramName, linkedDiagramType, linkId, allLinks, linkCount, isHighlighted: _, ...cleanData } = node.data || {}
      
      if (links && links.length > 0) {
        const firstLink = links[0]
        return {
          ...node,
          data: {
            ...cleanData,
            linkedDiagram: firstLink.target_diagram,
            linkedDiagramName: firstLink.target_diagram_name,
            linkedDiagramType: firstLink.target_diagram_type,
            linkedDiagramProject: firstLink.target_diagram_project,
            linkId: firstLink.id,
            allLinks: links,
            linkCount: links.length,
            isHighlighted,
          }
        }
      }
      
      // No links - return node with clean data (no link properties)
      return {
        ...node,
        data: {
          ...cleanData,
          isHighlighted,
        }
      }
    })
  }, [nodes, elementLinksMap, highlightedNodeId])

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
          isIdentifying: connSettings.isIdentifying ?? true,
          sourceOptional: false,
          targetOptional: false,
          relationshipName: '',
          showCardinality: true,
        },
        style: { stroke: '#1f2937', strokeWidth: 2 },
      }
      setEdges((eds) => addEdge(newEdge, eds))
      
      // Автоматическое создание FK в target entity
      // Находим source и target nodes
      const sourceNode = nodes.find(n => n.id === params.source)
      const targetNode = nodes.find(n => n.id === params.target)
      
      if (sourceNode && targetNode && isErdEntity(sourceNode) && isErdEntity(targetNode)) {
        // Получаем PK из source entity
        const sourcePKs = (sourceNode.data?.attributes || []).filter(attr => 
          typeof attr === 'object' && attr.primary
        )
        
        if (sourcePKs.length > 0) {
          // Спрашиваем пользователя, хочет ли он создать FK
          const shouldCreateFK = window.confirm(
            `Создать Foreign Key в "${targetNode.data?.label}" ссылающийся на PK "${sourceNode.data?.label}"?`
          )
          
          if (shouldCreateFK) {
            // Создаем FK атрибуты в target entity
            const newFKAttributes = sourcePKs.map(pk => ({
              name: `${sourceNode.data?.label?.toLowerCase() || 'entity'}_${pk.name}`,
              type: pk.type || 'INT',
              size: pk.size || '',
              primary: false,
              foreignKey: {
                entityId: sourceNode.id,
                entityName: sourceNode.data?.label || 'Entity',
                attributeName: pk.name,
              },
              nullable: connSettings.targetOptional || false,
              unique: connSettings.targetCardinality === 'one',
              default: '',
            }))
            
            // Обновляем target node с новыми FK атрибутами
            setNodes(nds => nds.map(n => {
              if (n.id === targetNode.id) {
                const existingAttrs = n.data?.attributes || []
                // Проверяем, нет ли уже такого FK
                const newAttrs = newFKAttributes.filter(fk => 
                  !existingAttrs.some(attr => 
                    typeof attr === 'object' && 
                    attr.foreignKey?.entityId === fk.foreignKey.entityId &&
                    attr.foreignKey?.attributeName === fk.foreignKey.attributeName
                  )
                )
                return {
                  ...n,
                  data: {
                    ...n.data,
                    attributes: [...existingAttrs, ...newAttrs],
                  }
                }
              }
              return n
            }))
          }
        }
      }
      
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
  }, [diagramType, connectionType, isLocked, getEdgeConfig, setEdges, setNodes, nodes, markDirty])

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


  // Handle link actions from context menu
  const handleCreateLink = (node) => {
    setLinkModal({ isOpen: true, node, editingLink: null })
    setContextMenu(null)
  }

  const handleEditLink = (node, link) => {
    setLinkModal({ isOpen: true, node, editingLink: link })
    setContextMenu(null)
  }

  const handleRemoveLink = (node, linkId) => {
    if (linkId) {
      deleteLinkMutation.mutate(linkId)
    }
    setContextMenu(null)
  }

  const handleRemoveAllLinks = (node) => {
    const links = elementLinksMap.get(node.id)
    if (links) {
      links.forEach(link => deleteLinkMutation.mutate(link.id))
    }
    setContextMenu(null)
  }

  const handleNavigateToLinked = (link) => {
    if (link && onNavigateToDiagram) {
      onNavigateToDiagram(link.target_diagram, link.target_diagram_project, link.target_element_id)
    }
    setContextMenu(null)
  }

  const handleLinkSave = (linkData) => {
    createLinkMutation.mutate(linkData)
  }

  const handleLinkUpdate = (linkId, linkData) => {
    updateLinkMutation.mutate({ linkId, linkData })
  }

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
      const nodeId = contextMenu.data.id
      // Also delete all links if this node has any
      const links = elementLinksMap.get(nodeId)
      if (links) {
        links.forEach(link => deleteLinkMutation.mutate(link.id))
      }
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
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

  // --- KEYBOARD SHORTCUTS ---
  
  // Delete selected elements
  const handleDeleteSelected = useCallback(() => {
    if (isLocked) return
    const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected)
    const selectedEdges = reactFlowInstance.getEdges().filter(e => e.selected)
    
    if (selectedNodes.length === 0 && selectedEdges.length === 0) return
    
    markDirty()
    const nodeIds = new Set(selectedNodes.map(n => n.id))
    
    // Delete links for selected nodes
    selectedNodes.forEach(node => {
      const links = elementLinksMap.get(node.id)
      if (links) {
        links.forEach(link => deleteLinkMutation.mutate(link.id))
      }
    })
    
    setNodes(nds => nds.filter(n => !nodeIds.has(n.id)))
    setEdges(eds => eds.filter(e => !selectedEdges.some(se => se.id === e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target)))
  }, [isLocked, reactFlowInstance, setNodes, setEdges, markDirty, elementLinksMap, deleteLinkMutation])

  // Select all elements
  const handleSelectAll = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, selected: true })))
    setEdges(eds => eds.map(e => ({ ...e, selected: true })))
  }, [setNodes, setEdges])

  // Deselect all elements
  const handleDeselectAll = useCallback(() => {
    setNodes(nds => nds.map(n => ({ ...n, selected: false })))
    setEdges(eds => eds.map(e => ({ ...e, selected: false })))
  }, [setNodes, setEdges])

  // Copy selected elements
  const handleCopy = useCallback(() => {
    const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected)
    const selectedEdges = reactFlowInstance.getEdges().filter(e => e.selected)
    
    if (selectedNodes.length === 0) return
    
    clipboardRef.current = {
      nodes: selectedNodes.map(cleanNodeForSave),
      edges: selectedEdges.filter(e => 
        selectedNodes.some(n => n.id === e.source) && 
        selectedNodes.some(n => n.id === e.target)
      ).map(cleanEdgeForSave)
    }
    
    toast.success(`Скопировано: ${selectedNodes.length}`)
  }, [reactFlowInstance])

  // Paste elements
  const handlePaste = useCallback(() => {
    if (isLocked) return
    if (clipboardRef.current.nodes.length === 0) return
    
    const idMap = new Map()
    const offset = 50
    
    const newNodes = clipboardRef.current.nodes.map(node => {
      const newId = createUniqueId('node')
      idMap.set(node.id, newId)
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offset,
          y: node.position.y + offset
        },
        selected: true
      }
    })
    
    const newEdges = clipboardRef.current.edges.map(edge => ({
      ...edge,
      id: createUniqueId('edge'),
      source: idMap.get(edge.source),
      target: idMap.get(edge.target),
      selected: true
    }))
    
    // Update clipboard positions for next paste
    clipboardRef.current = {
      nodes: clipboardRef.current.nodes.map(n => ({
        ...n,
        position: { x: n.position.x + offset, y: n.position.y + offset }
      })),
      edges: clipboardRef.current.edges
    }
    
    markDirty()
    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...newNodes])
    setEdges(eds => [...eds.map(e => ({ ...e, selected: false })), ...newEdges])
    
    toast.success(`Вставлено: ${newNodes.length}`)
  }, [isLocked, setNodes, setEdges, markDirty])

  // Duplicate selected elements
  const handleDuplicate = useCallback(() => {
    if (isLocked) return
    
    const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected)
    const selectedEdges = reactFlowInstance.getEdges().filter(e => e.selected)
    
    if (selectedNodes.length === 0) return
    
    const idMap = new Map()
    const offset = 50
    
    const newNodes = selectedNodes.map(node => {
      const newId = createUniqueId('node')
      idMap.set(node.id, newId)
      return {
        ...cleanNodeForSave(node),
        id: newId,
        position: {
          x: node.position.x + offset,
          y: node.position.y + offset
        },
        selected: true
      }
    })
    
    const newEdges = selectedEdges
      .filter(e => selectedNodes.some(n => n.id === e.source) && selectedNodes.some(n => n.id === e.target))
      .map(edge => ({
        ...cleanEdgeForSave(edge),
        id: createUniqueId('edge'),
        source: idMap.get(edge.source),
        target: idMap.get(edge.target),
        selected: true
      }))
    
    markDirty()
    setNodes(nds => [...nds.map(n => ({ ...n, selected: false })), ...newNodes])
    setEdges(eds => [...eds.map(e => ({ ...e, selected: false })), ...newEdges])
    
    toast.success(`Дублировано: ${newNodes.length}`)
  }, [isLocked, reactFlowInstance, setNodes, setEdges, markDirty])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    reactFlowInstance?.zoomIn({ duration: 200 })
  }, [reactFlowInstance])

  const handleZoomOut = useCallback(() => {
    reactFlowInstance?.zoomOut({ duration: 200 })
  }, [reactFlowInstance])

  const handleFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2, duration: 200 })
  }, [reactFlowInstance])

  // Main keyboard handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }
      
      const isCtrlOrCmd = e.ctrlKey || e.metaKey
      
      // Show shortcuts modal: ?
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
        return
      }
      
      // Escape: deselect all or close modals
      if (e.key === 'Escape') {
        if (showShortcuts) {
          setShowShortcuts(false)
        } else if (contextMenu) {
          setContextMenu(null)
        } else {
          handleDeselectAll()
        }
        return
      }
      
      // Ctrl+S: Save
      if (isCtrlOrCmd && e.code === 'KeyS') {
        e.preventDefault()
        if (isDirtyRef.current) {
          handleSave()
        }
        return
      }
      
      // Ctrl+A: Select all
      if (isCtrlOrCmd && e.code === 'KeyA') {
        e.preventDefault()
        handleSelectAll()
        return
      }
      
      // Ctrl+C: Copy
      if (isCtrlOrCmd && e.code === 'KeyC') {
        e.preventDefault()
        handleCopy()
        return
      }
      
      // Ctrl+V: Paste
      if (isCtrlOrCmd && e.code === 'KeyV') {
        e.preventDefault()
        handlePaste()
        return
      }
      
      // Ctrl+D: Duplicate
      if (isCtrlOrCmd && e.code === 'KeyD') {
        e.preventDefault()
        handleDuplicate()
        return
      }
      
      // Ctrl+E: Export
      if (isCtrlOrCmd && e.code === 'KeyE') {
        e.preventDefault()
        setShowExportModal(true)
        return
      }
      
      // Ctrl+Z: Undo (ReactFlow doesn't have built-in undo, just show message)
      if (isCtrlOrCmd && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault()
        // Undo is not implemented natively, could use a library
        return
      }
      
      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if ((isCtrlOrCmd && e.shiftKey && e.code === 'KeyZ') || (isCtrlOrCmd && e.code === 'KeyY')) {
        e.preventDefault()
        // Redo is not implemented natively
        return
      }
      
      // Ctrl++: Zoom in
      if (isCtrlOrCmd && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        handleZoomIn()
        return
      }
      
      // Ctrl+-: Zoom out
      if (isCtrlOrCmd && e.key === '-') {
        e.preventDefault()
        handleZoomOut()
        return
      }
      
      // Ctrl+0: Fit view
      if (isCtrlOrCmd && e.key === '0') {
        e.preventDefault()
        handleFitView()
        return
      }
      
      // Delete/Backspace: Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handleDeleteSelected()
        return
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    handleSave, handleSelectAll, handleDeselectAll, handleCopy, handlePaste, 
    handleDuplicate, handleZoomIn, handleZoomOut, handleFitView, handleDeleteSelected,
    showShortcuts, contextMenu
  ])

  // Listen for badge click navigation events
  useEffect(() => {
    const handleNavigateEvent = (e) => {
      const { diagramId, projectId, targetElementId } = e.detail
      if (diagramId && onNavigateToDiagram) {
        onNavigateToDiagram(diagramId, projectId, targetElementId)
      }
    }
    window.addEventListener('navigate-to-diagram', handleNavigateEvent)
    return () => window.removeEventListener('navigate-to-diagram', handleNavigateEvent)
  }, [onNavigateToDiagram])

  // Highlight element when navigating to it
  useEffect(() => {
    if (highlightElementId && reactFlowInstance) {
      setHighlightedNodeId(highlightElementId)
      
      // Find and focus on the highlighted node
      const targetNode = nodes.find(n => n.id === highlightElementId)
      if (targetNode) {
        // Wait a bit for the diagram to render, then fit view
        setTimeout(() => {
          reactFlowInstance.fitView({
            nodes: [{ id: highlightElementId }],
            padding: 0.5,
            duration: 500,
          })
        }, 100)
      }
      
      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightedNodeId(null)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [highlightElementId, reactFlowInstance, nodes])

  return (
    <>
      <ReactFlow
        nodes={enrichedNodes} 
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
          className="fixed bg-white rounded border border-gray-200 py-1 z-50 text-sm w-[200px]" 
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'node' && (
            <>
              {/* Link Actions Section */}
              {(() => {
                const nodeLinks = elementLinksMap.get(contextMenu.data.id)
                if (nodeLinks && nodeLinks.length > 0) {
                  return (
                    <>
                      <div className="px-3 py-1.5 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-50">
                        Связи ({nodeLinks.length})
                      </div>
                      {nodeLinks.map(link => (
                        <div key={link.id} className="flex items-center hover:bg-gray-50">
                          <button 
                            onClick={() => handleNavigateToLinked(link)}
                            className="flex-1 px-3 py-2 text-left flex items-center gap-2 text-primary-600 hover:bg-primary-50"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="truncate">{link.target_diagram_name}</span>
                            <span className="text-xs text-gray-400 ml-auto">{link.link_type}</span>
                          </button>
                          <button 
                            onClick={() => handleEditLink(contextMenu.data, link)}
                            className="px-2 py-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                            title="Редактировать связь"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleRemoveLink(contextMenu.data, link.id)}
                            className="px-2 py-2 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Удалить связь"
                          >
                            <Unlink className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <div className="h-px bg-gray-100 my-1"></div>
                      <button 
                        onClick={() => handleCreateLink(contextMenu.data)}
                        className="w-full px-3 py-2 text-left hover:bg-primary-50 flex items-center gap-2 text-primary-600"
                      >
                        <Link2 className="w-4 h-4" />
                        Добавить связь...
                      </button>
                      <div className="h-px bg-gray-100 my-1"></div>
                    </>
                  )
                }
                return (
                  <>
                    <button 
                      onClick={() => handleCreateLink(contextMenu.data)}
                      className="w-full px-3 py-2 text-left hover:bg-primary-50 flex items-center gap-2 text-primary-600"
                    >
                      <Link2 className="w-4 h-4" />
                      Связать с диаграммой...
                    </button>
                    <div className="h-px bg-gray-100 my-1"></div>
                  </>
                )
              })()}

              {diagramType === 'erd' && isErdEntity(contextMenu.data) && (
                <>
                  <button 
                    onClick={() => { setAttributeModal({ isOpen: true, node: contextMenu.data }); setContextMenu(null) }} 
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  >
                    <Edit className="w-4 h-4" />
                    Редактировать атрибуты
                  </button>
                  
                  {/* Выбор цвета сущности */}
                  <div className="px-3 py-1.5 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-50 flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    Цвет
                  </div>
                  <div className="px-3 py-2 flex flex-wrap gap-1.5">
                    {ERD_ENTITY_COLORS.map(colorDef => (
                      <button
                        key={colorDef.id}
                        onClick={() => {
                          markDirty()
                          setNodes(nds => nds.map(n => n.id === contextMenu.data.id ? {
                            ...n,
                            data: { ...n.data, borderColor: colorDef.color }
                          } : n))
                          setContextMenu(null)
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          contextMenu.data.data?.borderColor === colorDef.color ? 'ring-2 ring-offset-1 ring-gray-400' : 'border-white'
                        }`}
                        style={{ backgroundColor: colorDef.color }}
                        title={colorDef.name}
                      />
                    ))}
                  </div>
                  <div className="h-px bg-gray-100 my-1"></div>
                </>
              )}
              <button 
                onClick={() => {
                  const label = window.prompt('Переименовать', contextMenu.data.data?.label)
                  if (label) {
                    markDirty()
                    setNodes(nds => nds.map(n => n.id === contextMenu.data.id ? {...n, data: {...n.data, label}} : n))
                  }
                  setContextMenu(null)
                }} 
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700"
              >
                <Edit className="w-4 h-4" />
                Переименовать
              </button>
            </>
          )}
          
          {contextMenu.type === 'edge' && (
            <>
              {diagramType === 'dfd' && (
                <button 
                  onClick={() => handleRenameEdge(contextMenu.data)} 
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-700"
                >
                  Переименовать поток данных
                </button>
              )}
              {diagramType === 'erd' && (
                <>
                  {/* Имя связи */}
                  <button 
                    onClick={() => {
                      const name = window.prompt('Название связи:', contextMenu.data.data?.relationshipName || '')
                      if (name !== null) {
                        markDirty()
                        setEdges(eds => eds.map(e => e.id === contextMenu.data.id ? {
                          ...e,
                          data: { ...e.data, relationshipName: name }
                        } : e))
                      }
                      setContextMenu(null)
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-700"
                  >
                    Название связи...
                  </button>

                  <div className="h-px bg-gray-100 my-1"></div>
                  
                  {/* Кардинальность */}
                  <div className="px-3 py-1.5 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-50">
                    Кардинальность
                  </div>
                  <button onClick={() => updateEdgeCardinality(contextMenu.data.id, '1:1')} className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${contextMenu.data.data?.sourceCardinality === 'one' && contextMenu.data.data?.targetCardinality === 'one' ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>Один к одному (1:1)</button>
                  <button onClick={() => updateEdgeCardinality(contextMenu.data.id, '1:N')} className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${contextMenu.data.data?.sourceCardinality === 'one' && contextMenu.data.data?.targetCardinality === 'many' ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>Один ко многим (1:N)</button>
                  <button onClick={() => updateEdgeCardinality(contextMenu.data.id, 'N:1')} className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${contextMenu.data.data?.sourceCardinality === 'many' && contextMenu.data.data?.targetCardinality === 'one' ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>Многие к одному (N:1)</button>
                  <button onClick={() => updateEdgeCardinality(contextMenu.data.id, 'M:N')} className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${contextMenu.data.data?.sourceCardinality === 'many' && contextMenu.data.data?.targetCardinality === 'many' ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}>Многие ко многим (M:N)</button>
                  
                  <div className="h-px bg-gray-100 my-1"></div>
                  
                  {/* Тип связи */}
                  <div className="px-3 py-1.5 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-50">
                    Тип связи
                  </div>
                  <button 
                    onClick={() => {
                      markDirty()
                      setEdges(eds => eds.map(e => e.id === contextMenu.data.id ? {
                        ...e,
                        data: { ...e.data, isIdentifying: true }
                      } : e))
                      setContextMenu(null)
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${contextMenu.data.data?.isIdentifying !== false ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}
                  >
                    Идентифиц. (—)
                  </button>
                  <button 
                    onClick={() => {
                      markDirty()
                      setEdges(eds => eds.map(e => e.id === contextMenu.data.id ? {
                        ...e,
                        data: { ...e.data, isIdentifying: false }
                      } : e))
                      setContextMenu(null)
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${contextMenu.data.data?.isIdentifying === false ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}
                  >
                    Неидентифиц. (---)
                  </button>
                  
                  <div className="h-px bg-gray-100 my-1"></div>
                  
                  {/* Опциональность */}
                  <div className="px-3 py-1.5 text-xs text-gray-500 font-medium uppercase tracking-wide bg-gray-50">
                    Опциональность
                  </div>
                  <button 
                    onClick={() => {
                      markDirty()
                      setEdges(eds => eds.map(e => e.id === contextMenu.data.id ? {
                        ...e,
                        data: { ...e.data, sourceOptional: !e.data?.sourceOptional }
                      } : e))
                      setContextMenu(null)
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${contextMenu.data.data?.sourceOptional ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}
                  >
                    {contextMenu.data.data?.sourceOptional ? '✓ ' : ''}Source опц. (○)
                  </button>
                  <button 
                    onClick={() => {
                      markDirty()
                      setEdges(eds => eds.map(e => e.id === contextMenu.data.id ? {
                        ...e,
                        data: { ...e.data, targetOptional: !e.data?.targetOptional }
                      } : e))
                      setContextMenu(null)
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${contextMenu.data.data?.targetOptional ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'}`}
                  >
                    {contextMenu.data.data?.targetOptional ? '✓ ' : ''}Target опц. (○)
                  </button>
                </>
              )}
            </>
          )}
          <div className="h-px bg-gray-100 my-1"></div>
          <button 
            onClick={handleDelete} 
            className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Удалить
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
        nodeData={attributeModal.node ? { ...attributeModal.node.data, id: attributeModal.node.id } : null}
        isEntity={isErdEntity(attributeModal.node)}
        allEntities={nodes.filter(n => isErdEntity(n))}
      />

      <LinkDiagramModal
        isOpen={linkModal.isOpen}
        onClose={() => setLinkModal({ isOpen: false, node: null, editingLink: null })}
        onSave={handleLinkSave}
        onUpdate={handleLinkUpdate}
        sourceNode={linkModal.node}
        currentDiagramId={diagram?.id}
        currentDiagramType={diagramType}
        existingLinks={diagramLinks?.outgoing || []}
        editingLink={linkModal.editingLink}
      />

      {/* Save Status Indicator */}
      <div className="absolute bottom-4 right-4 z-10">
        {isSaving ? (
          <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded text-sm text-gray-600">
            <Save className="w-4 h-4 animate-pulse" />
            Сохранение...
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            Сохранено
          </div>
        ) : null}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal 
        isOpen={showShortcuts} 
        onClose={() => setShowShortcuts(false)} 
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        diagramName={diagram?.name}
        reactFlowInstance={reactFlowInstance}
        mode="single"
      />

      {/* Incoming Links Panel */}
      {(diagramLinks?.incoming?.length ?? 0) > 0 && (
        <div className="absolute top-4 left-4 z-10 max-w-xs">
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 bg-primary-50 border-b border-primary-100 text-primary-700 text-xs font-medium flex items-center gap-2">
              <ExternalLink className="w-3 h-3" />
              Ссылается {diagramLinks.incoming.length} {diagramLinks.incoming.length === 1 ? 'диаграмма' : diagramLinks.incoming.length < 5 ? 'диаграммы' : 'диаграмм'}
            </div>
            <div className="max-h-32 overflow-y-auto">
              {diagramLinks.incoming.map(link => (
                <button
                  key={link.id}
                  onClick={() => onNavigateToDiagram?.(link.source_diagram, link.target_diagram_project)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm border-b border-gray-100 last:border-0 transition-colors"
                >
                  <span className="flex-1 truncate text-gray-700">
                    {link.source_diagram_name}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    {link.source_element_label}
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation Panel */}
      <ValidationPanel
        diagramType={diagramType}
        nodes={nodes}
        edges={edges}
        onIssueClick={(elementId, elementType) => {
          // Подсветка элемента при клике на проблему
          if (elementType === 'node') {
            setHighlightedNodeId(elementId)
            // Центрируем на элементе
            const targetNode = nodes.find(n => n.id === elementId)
            if (targetNode && reactFlowInstance) {
              reactFlowInstance.fitView({
                nodes: [{ id: elementId }],
                padding: 0.5,
                duration: 500,
              })
            }
            // Убираем подсветку через 3 секунды
            setTimeout(() => setHighlightedNodeId(null), 3000)
          } else if (elementType === 'edge') {
            // Для связей выделяем её в ReactFlow
            setEdges(eds => eds.map(e => ({
              ...e,
              selected: e.id === elementId
            })))
          }
        }}
        className="absolute top-4 right-4 z-10 max-w-md"
      />
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
        <span className="text-gray-500">Диаграмма не выбрана</span>
      </div>
    )
  }

  const [showShortcutsFromHeader, setShowShortcutsFromHeader] = useState(false)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">{props.diagram?.name || 'Без названия'}</h2>
          <span className="badge badge-secondary font-mono uppercase">
            {props.diagram?.diagram_type}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Diagram actions */}
          <button
            onClick={props.onSaveAsTemplate}
            className="btn btn-secondary btn-sm"
            title="Сохранить как шаблон"
          >
            <Bookmark className="h-4 w-4 mr-1.5" />
            Шаблон
          </button>
          <button
            onClick={props.onExport}
            className="btn btn-secondary btn-sm"
            title="Экспорт диаграммы"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Экспорт
          </button>
          <button
            onClick={props.onImport}
            className="btn btn-secondary btn-sm"
            title="Импорт диаграммы"
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Импорт
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          {/* Help button */}
          <button
            onClick={() => setShowShortcutsFromHeader(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Горячие клавиши (?)"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Shortcuts modal triggered from header */}
      <KeyboardShortcutsModal 
        isOpen={showShortcutsFromHeader} 
        onClose={() => setShowShortcutsFromHeader(false)} 
        diagramType={props.diagram?.diagram_type}
      />
      <div className="flex-1 relative bg-gray-50">
        {!isReady ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-primary-600"></div>
              <span className="text-sm text-gray-400">Загрузка диаграммы...</span>
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
              onNavigateToDiagram={props.onNavigateToDiagram}
            />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  )
}

export default DiagramEditor
