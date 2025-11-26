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
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useMutation } from 'react-query'
import { diagramsAPI } from '../api'
import { Lock, Save, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import ShapeNode from './nodes/ShapeNode'
import ERDEdge from './edges/ERDEdge'
import AttributeModal from './AttributeModal'

const CONTAINER_SHAPES = new Set(['lane', 'pool'])

const createUniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const ERD_HANDLE_SIDES = ['top', 'right', 'bottom', 'left']

const DEFAULT_ERD_CONNECTION = {
  sourceCardinality: 'one',
  targetCardinality: 'many',
  sourceOptional: false,
  targetOptional: false,
}

const ERD_CONNECTION_PRESETS = {
  'erd-one-to-one': {
    sourceCardinality: 'one',
    targetCardinality: 'one',
    sourceOptional: false,
    targetOptional: false,
  },
  'erd-one-to-one-optional': {
    sourceCardinality: 'one',
    targetCardinality: 'one',
    sourceOptional: true,
    targetOptional: true,
  },
  'erd-one-to-many': {
    sourceCardinality: 'one',
    targetCardinality: 'many',
    sourceOptional: false,
    targetOptional: false,
  },
  'erd-one-to-many-optional': {
    sourceCardinality: 'one',
    targetCardinality: 'many',
    sourceOptional: true,
    targetOptional: false,
  },
  'erd-many-to-many': {
    sourceCardinality: 'many',
    targetCardinality: 'many',
    sourceOptional: false,
    targetOptional: false,
  },
}

const getErdConnectionData = (connectionType) =>
  ERD_CONNECTION_PRESETS[connectionType] || DEFAULT_ERD_CONNECTION

const getEntityCardinality = (connectionData, entityWasSource) => {
  if (entityWasSource) {
    return {
      cardinality: connectionData.sourceCardinality,
      optional: connectionData.sourceOptional,
    }
  }

  return {
    cardinality: connectionData.targetCardinality,
    optional: connectionData.targetOptional,
  }
}

const createErdEdge = ({
  entityId,
  relationshipId,
  cardinality,
  optional,
  entityHandle,
  relationshipHandle,
}) => ({
  id: createUniqueId('erd-edge'),
  source: entityId,
  target: relationshipId,
  type: 'erd',
  sourceHandle: entityHandle || undefined,
  targetHandle: relationshipHandle || undefined,
  style: { stroke: '#9333ea', strokeWidth: 2 },
  data: {
    sourceCardinality: cardinality,
    sourceOptional: optional,
    targetCardinality: 'one',
    targetOptional: false,
    symbolColor: '#9333ea',
    entityId,
    relationshipId,
  },
})

const normalizeLoadedErdEdge = (edge, nodeShapeLookup) => {
  if (!edge || edge.type !== 'erd') {
    return edge
  }

  const sourceShape = nodeShapeLookup.get(edge.source)
  const targetShape = nodeShapeLookup.get(edge.target)
  const sourceIsEntity = sourceShape === 'entity'
  const targetIsRelationship = targetShape === 'relationship'
  const sourceIsRelationship = sourceShape === 'relationship'
  const targetIsEntity = targetShape === 'entity'

  if (sourceIsEntity && targetIsRelationship) {
    return {
      ...edge,
      data: {
        ...edge.data,
        entityId: edge.data?.entityId || edge.source,
        relationshipId: edge.data?.relationshipId || edge.target,
      },
    }
  }

  if (sourceIsRelationship && targetIsEntity) {
    const swappedEdge = {
      ...edge,
      source: edge.target,
      target: edge.source,
      sourceHandle: edge.targetHandle,
      targetHandle: edge.sourceHandle,
      data: {
        ...edge.data,
        sourceCardinality:
          edge.data?.targetCardinality ?? edge.data?.sourceCardinality ?? 'one',
        targetCardinality:
          edge.data?.sourceCardinality ?? edge.data?.targetCardinality ?? 'one',
        sourceOptional:
          typeof edge.data?.targetOptional === 'boolean'
            ? edge.data.targetOptional
            : edge.data?.sourceOptional ?? false,
        targetOptional:
          typeof edge.data?.sourceOptional === 'boolean'
            ? edge.data.sourceOptional
            : edge.data?.targetOptional ?? false,
        entityId: edge.data?.entityId || edge.target,
        relationshipId: edge.data?.relationshipId || edge.source,
      },
    }

    return swappedEdge
  }

  return edge
}

const isErdEntity = (node) => node?.data?.shape === 'entity'
const isErdRelationship = (node) => node?.data?.shape === 'relationship'

const isContainerShape = (shape) => CONTAINER_SHAPES.has(shape)

const isContainerNode = (node) => isContainerShape(node?.data?.shape)

const getNodeSizeFromNode = (node) => ({
  width: node?.width ?? node?.data?.width ?? 0,
  height: node?.height ?? node?.data?.height ?? 0,
})

const getNodeSizeFromData = (data = {}) => ({
  width: data.width ?? 160,
  height: data.height ?? 80,
})

const getNodeBounds = (node) => {
  const position = node?.positionAbsolute ?? node?.position ?? { x: 0, y: 0 }
  const { width, height } = getNodeSizeFromNode(node)
  return {
    x: position.x,
    y: position.y,
    width,
    height,
  }
}

const pointInsideBounds = (point, bounds, padding = 0) =>
  point.x >= bounds.x + padding &&
  point.x <= bounds.x + bounds.width - padding &&
  point.y >= bounds.y + padding &&
  point.y <= bounds.y + bounds.height - padding

const canContainerAcceptShape = (containerShape, childShape) => {
  if (!containerShape) return false
  if (containerShape === 'pool') {
    return childShape !== 'pool'
  }
  if (containerShape === 'lane') {
    return childShape !== 'pool' && childShape !== 'lane'
  }
  return false
}

const DiagramEditor = ({ diagram, diagramType, isLocked, lockUser, connectionType = 'sequence-flow' }) => {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState([])
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [attributeModal, setAttributeModal] = useState({ isOpen: false, node: null })

  // Wrap handlers to block changes when locked
  const onNodesChange = useCallback(
    (changes) => {
      if (isLocked) return
      onNodesChangeInternal(changes)
    },
    [isLocked, onNodesChangeInternal]
  )

  const onEdgesChange = useCallback(
    (changes) => {
      if (isLocked) return
      onEdgesChangeInternal(changes)
    },
    [isLocked, onEdgesChangeInternal]
  )

  const nodeTypes = useMemo(
    () => ({
      shape: ShapeNode,
    }),
    []
  )

  const edgeTypes = useMemo(
    () => ({
      erd: ERDEdge,
    }),
    []
  )

  const getEdgeConfig = useCallback(
    (flowType) => {
      if (diagramType === 'erd') {
        return {
          style: { stroke: '#111827', strokeWidth: 2 },
        }
      }

      switch (flowType) {
        case 'default-flow':
          return {
            style: { stroke: '#1f2937', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#1f2937' },
            label: 'default',
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 4,
            labelBgStyle: { fill: '#f8fafc', color: '#1f2937' },
          }
        case 'conditional-flow':
          return {
            style: { stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 4' },
            markerStart: { type: MarkerType.Diamond, color: '#2563eb' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb' },
            label: 'condition',
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 4,
            labelBgStyle: { fill: '#1d4ed8', color: '#ffffff' },
          }
        case 'message-flow':
          return {
            style: { stroke: '#0ea5e9', strokeWidth: 2, strokeDasharray: '8 4' },
            markerStart: { type: MarkerType.Circle, color: '#0ea5e9' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' },
            animated: true,
          }
        case 'association':
          return {
            style: { stroke: '#6b7280', strokeWidth: 1.5, strokeDasharray: '4 4' },
            type: 'straight',
          }
        case 'data-association':
          return {
            style: { stroke: '#047857', strokeWidth: 1.5, strokeDasharray: '4 4' },
            type: 'straight',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#047857' },
          }
        case 'compensation-flow':
          return {
            style: { stroke: '#9333ea', strokeWidth: 2, strokeDasharray: '3 3' },
            markerEnd: { type: MarkerType.Arrow, color: '#9333ea' },
          }
        case 'sequence-flow':
        default:
          return {
            style: { stroke: '#111827', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#111827' },
          }
      }
    },
    [diagramType]
  )

  const applyEdgeVisuals = useCallback(
    (edge) => {
      const flowType = edge?.data?.flowType || 'sequence-flow'
      const config = getEdgeConfig(flowType)
      const mergedData = {
        ...(edge.data || {}),
        flowType,
      }

      const mergedEdge = {
        ...edge,
        data: mergedData,
        style: { ...(edge.style || {}), ...(config.style || {}) },
        markerStart: config.markerStart || edge.markerStart,
        markerEnd: config.markerEnd || edge.markerEnd,
        type: config.type || edge.type,
        animated: typeof config.animated === 'boolean' ? config.animated : edge.animated,
      }

      if (config.label && !edge.label) {
        mergedEdge.label = config.label
        mergedEdge.labelBgPadding = config.labelBgPadding
        mergedEdge.labelBgBorderRadius = config.labelBgBorderRadius
        mergedEdge.labelBgStyle = config.labelBgStyle
      }

      return mergedEdge
    },
    [getEdgeConfig]
  )

  // Update diagram mutation
  const updateDiagramMutation = useMutation(
    (data) => diagramsAPI.updateDiagram(diagram.id, data),
    {
      onSuccess: () => {
        toast.success('Diagram saved successfully!')
        setIsSaving(false)
      },
      onError: (error) => {
        toast.error('Failed to save diagram')
        setIsSaving(false)
      },
    }
  )

  // Load diagram content when diagram changes
  useEffect(() => {
    setIsLoading(true)
    
    // Small delay to show loading state
    const timer = setTimeout(() => {
      const rawContent = diagram?.data ?? diagram?.content
      if (rawContent) {
        try {
          const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent
          const normalisedNodes = (content.nodes || []).map((node) =>
            isContainerShape(node?.data?.shape)
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    isContainer: true,
                  },
                }
              : node
          )
          setNodes(normalisedNodes)
          const nodeShapeLookup = new Map(
            normalisedNodes.map((node) => [node.id, node?.data?.shape])
          )
          const preparedEdges =
            diagramType === 'erd'
              ? (content.edges || []).map((edge) => normalizeLoadedErdEdge(edge, nodeShapeLookup))
              : content.edges || []
          const enrichedEdges = preparedEdges.map((edge) => applyEdgeVisuals(edge))
          setEdges(enrichedEdges)
        } catch (error) {
          console.error('Error parsing diagram content:', error)
          setNodes([])
          setEdges([])
        }
      } else {
        setNodes([])
        setEdges([])
      }
      
      setIsLoading(false)
    }, 100) // Small delay to ensure smooth transition
    
    return () => clearTimeout(timer)
  }, [diagram, applyEdgeVisuals, diagramType, setEdges, setNodes])

  // Auto-save functionality
  useEffect(() => {
    if (diagram && !isSaving) {
      const timer = setTimeout(() => {
        handleSave()
      }, 2000) // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timer)
    }
  }, [nodes, edges, diagram])

  const onConnect = useCallback(
    (params) => {
      if (isLocked) return

      if (diagramType === 'erd') {
        const sourceNode = nodes.find((node) => node.id === params.source)
        const targetNode = nodes.find((node) => node.id === params.target)

        if (!sourceNode || !targetNode) {
          return
        }

        const connectionData = getErdConnectionData(connectionType)
        const sourceIsEntity = isErdEntity(sourceNode)
        const targetIsEntity = isErdEntity(targetNode)
        const sourceIsRelationship = isErdRelationship(sourceNode)
        const targetIsRelationship = isErdRelationship(targetNode)

        if (sourceIsEntity && targetIsEntity) {
          const relationshipWidth = 140
          const relationshipHeight = 140

          const sourceBounds = getNodeBounds(sourceNode)
          const targetBounds = getNodeBounds(targetNode)

          const sourceCenter = {
            x: sourceBounds.x + sourceBounds.width / 2,
            y: sourceBounds.y + sourceBounds.height / 2,
          }
          const targetCenter = {
            x: targetBounds.x + targetBounds.width / 2,
            y: targetBounds.y + targetBounds.height / 2,
          }

          const midpoint = {
            x: (sourceCenter.x + targetCenter.x) / 2,
            y: (sourceCenter.y + targetCenter.y) / 2,
          }

          const relationshipNodeId = createUniqueId('relationship')
          const relationshipNode = {
            id: relationshipNodeId,
            type: 'shape',
            position: {
              x: midpoint.x - relationshipWidth / 2,
              y: midpoint.y - relationshipHeight / 2,
            },
            data: {
              label: 'Relationship',
              shape: 'relationship',
              background: '#faf5ff',
              borderColor: '#9333ea',
              textColor: '#581c87',
              width: relationshipWidth,
              height: relationshipHeight,
              borderWidth: 3,
              attributes: [],
              handles: { incoming: ERD_HANDLE_SIDES, outgoing: ERD_HANDLE_SIDES },
            },
          }

          setNodes((currentNodes) => currentNodes.concat(relationshipNode))

          const firstEntityEdge = createErdEdge({
            entityId: sourceNode.id,
            relationshipId: relationshipNodeId,
            cardinality: connectionData.sourceCardinality,
            optional: connectionData.sourceOptional,
            entityHandle: params.sourceHandle,
          })

          const secondEntityEdge = createErdEdge({
            entityId: targetNode.id,
            relationshipId: relationshipNodeId,
            cardinality: connectionData.targetCardinality,
            optional: connectionData.targetOptional,
            entityHandle: params.targetHandle,
          })

          setEdges((currentEdges) => currentEdges.concat([firstEntityEdge, secondEntityEdge]))
          return
        }

        const connectsEntityAndRelationship =
          (sourceIsEntity && targetIsRelationship) || (sourceIsRelationship && targetIsEntity)

        if (connectsEntityAndRelationship) {
          const entityNode = sourceIsEntity ? sourceNode : targetNode
          const relationshipNode = sourceIsRelationship ? sourceNode : targetNode
          const entityWasSource = sourceIsEntity
          const entityHandle = entityWasSource ? params.sourceHandle : params.targetHandle
          const relationshipHandle = entityWasSource ? params.targetHandle : params.sourceHandle
          const { cardinality, optional } = getEntityCardinality(connectionData, entityWasSource)

          setEdges((currentEdges) => {
            const alreadyConnected = currentEdges.some(
              (edge) =>
                edge.type === 'erd' &&
                edge.source === entityNode.id &&
                edge.target === relationshipNode.id
            )

            if (alreadyConnected) {
              toast.error('This entity is already connected to the selected relationship')
              return currentEdges
            }

            return currentEdges.concat(
              createErdEdge({
                entityId: entityNode.id,
                relationshipId: relationshipNode.id,
                cardinality,
                optional,
                entityHandle,
                relationshipHandle,
              })
            )
          })

          return
        }

        toast.error('ERD connections must link entities to entities or relationships')
        return
      }

      setEdges((eds) => {
        const config = getEdgeConfig(connectionType)
        const mergedParams = {
          ...params,
          ...config,
          data: {
            ...(params.data || {}),
            flowType: connectionType,
          },
        }

        const updated = addEdge(mergedParams, eds)
        return updated.map((edge) => applyEdgeVisuals(edge))
      })
    },
    [applyEdgeVisuals, connectionType, diagramType, getEdgeConfig, isLocked, nodes]
  )

  const handleNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault()
      if (isLocked) return

      // Show context menu for all nodes
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        node,
      })
    },
    [isLocked]
  )

  const handleNodeDoubleClick = useCallback(
    (event, node) => {
      event.preventDefault()
      if (isLocked) return

      // For ERD, open modal on double click
      if (diagramType === 'erd' && (isErdEntity(node) || isErdRelationship(node))) {
        setAttributeModal({ isOpen: true, node })
        return
      }

      // Default behavior for other node types
      const currentLabel = node?.data?.label ?? ''
      const newLabel = window.prompt('Enter new element name:', currentLabel)
      if (newLabel === null) {
        return
      }

      const trimmedLabel = newLabel.trim()
      if (!trimmedLabel || trimmedLabel === currentLabel) {
        return
      }

      setNodes((existingNodes) =>
        existingNodes.map((existingNode) =>
          existingNode.id === node.id
            ? {
                ...existingNode,
                data: {
                  ...existingNode.data,
                  label: trimmedLabel,
                },
              }
            : existingNode
        )
      )
    },
    [diagramType, isLocked, setNodes]
  )

  const handleAttributeModalSave = useCallback(
    (data) => {
      if (!attributeModal.node) return

      setNodes((existingNodes) =>
        existingNodes.map((existingNode) =>
          existingNode.id === attributeModal.node.id
            ? {
                ...existingNode,
                data: {
                  ...existingNode.data,
                  label: data.label,
                  attributes: data.attributes,
                },
              }
            : existingNode
        )
      )
    },
    [attributeModal.node, setNodes]
  )

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const handleSave = useCallback(() => {
    if (!diagram || isLocked) return

    setIsSaving(true)
    const payload = { nodes, edges }
    updateDiagramMutation.mutate({ data: payload })
  }, [diagram, nodes, edges, isLocked, updateDiagramMutation])

  const handleExport = (format) => {
    // This would implement actual export functionality
    toast.info(`Export to ${format.toUpperCase()} feature coming soon!`)
  }

  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      if (isLocked) {
        return
      }

      const transferData = event.dataTransfer.getData('application/reactflow')
      if (!transferData) {
        return
      }

      let parsedData
      try {
        parsedData = JSON.parse(transferData)
      } catch (error) {
        console.error('Failed to parse dropped element:', error)
        return
      }

      const reactFlowBounds = event.currentTarget.getBoundingClientRect()

      const position = reactFlowInstance
        ? reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          })
        : {
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          }

      const nodeConfig = parsedData.nodeConfig || {}
      const label = nodeConfig.label || parsedData.name || 'Element'
      const nodeType = nodeConfig.type || 'shape'

      const nodeId = `${parsedData.id || 'node'}-${Date.now()}`
      const nodeShape = nodeConfig.shape
      const nodeSize = getNodeSizeFromData(nodeConfig)
      const absoluteBounds = {
        x: position.x,
        y: position.y,
        width: nodeSize.width,
        height: nodeSize.height,
      }

      const containers = reactFlowInstance
        ? reactFlowInstance
            .getNodes()
            .filter((candidate) => isContainerNode(candidate))
            .map((candidate) => ({
              id: candidate.id,
              shape: candidate.data?.shape,
              bounds: getNodeBounds(candidate),
            }))
            .filter((info) => info.bounds.width > 0 && info.bounds.height > 0)
            .sort(
              (a, b) =>
                a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height
            )
        : []

      const targetContainer = containers.find(
        (container) =>
          canContainerAcceptShape(container.shape, nodeShape) &&
          pointInsideBounds(
            {
              x: absoluteBounds.x + absoluteBounds.width / 2,
              y: absoluteBounds.y + absoluteBounds.height / 2,
            },
            container.bounds,
            8
          )
      )

      const newNode = {
        id: nodeId,
        type: nodeType,
        position: targetContainer
          ? {
              x: absoluteBounds.x - targetContainer.bounds.x,
              y: absoluteBounds.y - targetContainer.bounds.y,
            }
          : position,
        parentNode: targetContainer?.id,
        extent: targetContainer ? 'parent' : undefined,
        data: {
          ...nodeConfig,
          label,
          parentContainerId: targetContainer?.id,
          isContainer: isContainerShape(nodeShape) || nodeConfig.isContainer || false,
        },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [isLocked, reactFlowInstance, setNodes]
  )

  const onDragOver = useCallback(
    (event) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = isLocked ? 'none' : 'move'
    },
    [isLocked]
  )

  const handleNodeDragStop = useCallback(
    (event, node) => {
      if (isLocked || !reactFlowInstance) {
        return
      }

      const absolutePosition = node.positionAbsolute ?? node.position ?? { x: 0, y: 0 }
      const nodeSize = {
        width: node.width ?? node.data?.width ?? 0,
        height: node.height ?? node.data?.height ?? 0,
      }

      const containers = reactFlowInstance
        .getNodes()
        .filter((candidate) => isContainerNode(candidate) && candidate.id !== node.id)
        .map((candidate) => ({
          id: candidate.id,
          shape: candidate.data?.shape,
          bounds: getNodeBounds(candidate),
        }))
        .filter((info) => info.bounds.width > 0 && info.bounds.height > 0)
        .sort(
          (a, b) => a.bounds.width * a.bounds.height - b.bounds.width * b.bounds.height
        )

      const targetContainer = containers.find((container) =>
        canContainerAcceptShape(container.shape, node.data?.shape) &&
        pointInsideBounds(
          {
            x: absolutePosition.x + nodeSize.width / 2,
            y: absolutePosition.y + nodeSize.height / 2,
          },
          container.bounds,
          8
        )
      )

      const containerBoundsById = Object.fromEntries(
        containers.map((container) => [container.id, container.bounds])
      )

      setNodes((currentNodes) =>
        currentNodes.map((currentNode) => {
          if (currentNode.id !== node.id) {
            return currentNode
          }

          const updatedNode = {
            ...currentNode,
            position: node.position,
            positionAbsolute: node.positionAbsolute,
          }

          if (targetContainer) {
            const bounds = containerBoundsById[targetContainer.id]
            updatedNode.parentNode = targetContainer.id
            updatedNode.extent = 'parent'
            updatedNode.position = {
              x: absolutePosition.x - bounds.x,
              y: absolutePosition.y - bounds.y,
            }
            updatedNode.data = {
              ...updatedNode.data,
              parentContainerId: targetContainer.id,
            }
          } else if (currentNode.parentNode) {
            updatedNode.parentNode = undefined
            updatedNode.extent = undefined
            updatedNode.position = {
              x: absolutePosition.x,
              y: absolutePosition.y,
            }
            updatedNode.data = {
              ...updatedNode.data,
              parentContainerId: undefined,
            }
          }

          return updatedNode
        })
      )
    },
    [isLocked, reactFlowInstance, setNodes]
  )

  const handleEdgeDoubleClick = useCallback(
    (event, edge) => {
      event.preventDefault()
      event.stopPropagation()

      if (isLocked) return

      setEdges((currentEdges) => currentEdges.filter((existingEdge) => existingEdge.id !== edge.id))
      toast.success('Connection removed')
    },
    [isLocked, setEdges]
  )

  const handleInit = useCallback((instance) => {
    setReactFlowInstance(instance)
  }, [])

  useEffect(() => {
    const keydownHandler = (event) => {
      if (isLocked) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return

      const target = event.target
      const tagName = target?.tagName
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) {
        return
      }

      event.preventDefault()

      setNodes((currentNodes) => {
        const nodesToRemove = new Set(
          currentNodes.filter((node) => node.selected).map((node) => node.id)
        )

        if (nodesToRemove.size === 0) {
          setEdges((currentEdges) => currentEdges.filter((edge) => !edge.selected))
          return currentNodes
        }

        let changed = true
        while (changed) {
          changed = false
          currentNodes.forEach((node) => {
            if (!nodesToRemove.has(node.id) && node.parentNode && nodesToRemove.has(node.parentNode)) {
              nodesToRemove.add(node.id)
              changed = true
            }
          })
        }

        setEdges((currentEdges) =>
          currentEdges.filter(
            (edge) =>
              !edge.selected &&
              !nodesToRemove.has(edge.source) &&
              !nodesToRemove.has(edge.target)
          )
        )

        return currentNodes.filter((node) => !nodesToRemove.has(node.id))
      })
    }

    window.addEventListener('keydown', keydownHandler)
    return () => window.removeEventListener('keydown', keydownHandler)
  }, [isLocked, setNodes, setEdges])

  const getDiagramTitle = () => {
    switch (diagramType) {
      case 'bpmn':
        return 'Business Process Model and Notation'
      case 'erd':
        return 'Entity Relationship Diagram'
      case 'dfd':
        return 'Data Flow Diagram'
      default:
        return 'Diagram Editor'
    }
  }

  // ReactFlow component with useReactFlow hook
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-medium text-gray-900">
            {diagram?.name || 'Untitled Diagram'}
          </h2>
          <span className="text-sm text-gray-500">
            {getDiagramTitle()}
          </span>
          {isLocked && (
            <div className="flex items-center space-x-1 text-sm text-red-600">
              <Lock className="h-4 w-4" />
              <span>Locked by {lockUser}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={isLocked || isSaving}
            className="btn btn-primary btn-sm"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          <div className="relative group">
            <button className="btn btn-secondary btn-sm">
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="py-1">
                <button
                  onClick={() => handleExport('png')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as PNG
                </button>
                <button
                  onClick={() => handleExport('svg')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Export as SVG
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diagram Canvas */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              <span className="text-gray-600 font-medium">Loading diagram...</span>
            </div>
          </div>
        )}
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeContextMenu={handleNodeContextMenu}
            onNodeDragStop={handleNodeDragStop}
            onEdgeDoubleClick={handleEdgeDoubleClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={handleInit}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            connectionMode={ConnectionMode.Loose}
            connectionRadius={120}
            snapToGrid={false}
            snapGrid={[15, 15]}
            attributionPosition="bottom-left"
            defaultEdgeOptions={{
              type: 'default',
              style: { strokeWidth: 2 }
            }}
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            nodesFocusable={!isLocked}
            edgesFocusable={!isLocked}
            elementsSelectable={!isLocked}
            panOnDrag={!isLocked ? [1, 2] : true}
            zoomOnDoubleClick={!isLocked}
          >
            <Controls showInteractive={false} />
            <MiniMap nodeStrokeWidth={3} zoomable={!isLocked} pannable={!isLocked} />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-t text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>{nodes.length} nodes</span>
          <span>{edges.length} connections</span>
        </div>
        <div>
          {isSaving && <span className="text-blue-600">Saving...</span>}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit Attributes - только для ERD */}
          {diagramType === 'erd' && (isErdEntity(contextMenu.node) || isErdRelationship(contextMenu.node)) && (
            <button
              onClick={() => {
                setAttributeModal({ isOpen: true, node: contextMenu.node })
                setContextMenu(null)
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <span>✏️</span>
              <span>Edit Attributes</span>
            </button>
          )}
          
          {/* Rename - для всех типов диаграмм */}
          <button
            onClick={() => {
              const currentLabel = contextMenu.node?.data?.label ?? ''
              const newLabel = window.prompt('Enter new name:', currentLabel)
              if (newLabel && newLabel.trim()) {
                setNodes((existingNodes) =>
                  existingNodes.map((node) =>
                    node.id === contextMenu.node.id
                      ? {
                          ...node,
                          data: {
                            ...node.data,
                            label: newLabel.trim(),
                          },
                        }
                      : node
                  )
                )
              }
              setContextMenu(null)
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
          >
            <span>📝</span>
            <span>Rename</span>
          </button>
          
          <hr className="my-1" />
          
          {/* Delete - для всех типов диаграмм */}
          <button
            onClick={() => {
              const nodeName = contextMenu.node?.data?.label || 'Node'
              setNodes((nds) => nds.filter((n) => n.id !== contextMenu.node.id))
              setEdges((eds) =>
                eds.filter(
                  (e) => e.source !== contextMenu.node.id && e.target !== contextMenu.node.id
                )
              )
              setContextMenu(null)
              toast.success(`"${nodeName}" deleted`)
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Attribute Modal */}
      <AttributeModal
        isOpen={attributeModal.isOpen}
        onClose={() => setAttributeModal({ isOpen: false, node: null })}
        onSave={handleAttributeModalSave}
        nodeData={attributeModal.node?.data}
        isEntity={isErdEntity(attributeModal.node)}
      />
    </div>
  )
}

export default DiagramEditor
