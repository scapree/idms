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
import { Lock, Save, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import ShapeNode from './nodes/ShapeNode'
import ERDEdge from './edges/ERDEdge'
import AttributeModal from './AttributeModal'

// --- CONSTANTS ---
const CONTAINER_SHAPES = new Set(['lane', 'pool'])

const createUniqueId = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const isContainerShape = (shape) => CONTAINER_SHAPES.has(shape)
const isContainerNode = (node) => isContainerShape(node?.data?.shape)

const isErdEntity = (node) => node?.data?.shape === 'entity'

// Настройки кардинальности для связей
const ERD_PRESETS = {
  '1:1': { sourceCardinality: 'one', targetCardinality: 'one' },
  '1:N': { sourceCardinality: 'one', targetCardinality: 'many' },
  'N:1': { sourceCardinality: 'many', targetCardinality: 'one' },
  'M:N': { sourceCardinality: 'many', targetCardinality: 'many' },
}

const DEFAULT_ERD_CONNECTION = ERD_PRESETS['1:N']

// Маппинг типов соединения из пропсов в настройки
const getConnectionData = (type) => {
  const map = {
    'erd-one-to-one': ERD_PRESETS['1:1'],
    'erd-one-to-many': ERD_PRESETS['1:N'],
    'erd-many-to-many': ERD_PRESETS['M:N'],
  }
  return map[type] || DEFAULT_ERD_CONNECTION
}

const getNodeSizeFromData = (data = {}) => ({
  width: data.width ?? 160,
  height: data.height ?? 80,
})

const getNodeBounds = (node) => {
  const position = node?.positionAbsolute ?? node?.position ?? { x: 0, y: 0 }
  const width = node?.width ?? node?.data?.width ?? 0
  const height = node?.height ?? node?.data?.height ?? 0
  return { x: position.x, y: position.y, width, height }
}

const pointInsideBounds = (point, bounds, padding = 0) =>
  point.x >= bounds.x + padding &&
  point.x <= bounds.x + bounds.width - padding &&
  point.y >= bounds.y + padding &&
  point.y <= bounds.y + bounds.height - padding

const canContainerAcceptShape = (containerShape, childShape) => {
  if (!containerShape) return false
  if (containerShape === 'pool') return childShape !== 'pool'
  if (containerShape === 'lane') return childShape !== 'pool' && childShape !== 'lane'
  return false
}

// --- MAIN CONTENT COMPONENT ---

const DiagramEditorContent = ({ 
  diagram, 
  diagramType, 
  isLocked, 
  lockUser, 
  connectionType, 
  nodes, 
  setNodes, 
  onNodesChange, 
  edges, 
  setEdges, 
  onEdgesChange 
}) => {
  const reactFlowInstance = useReactFlow()
  const [isSaving, setIsSaving] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const [attributeModal, setAttributeModal] = useState({ isOpen: false, node: null })

  // Регистрируем типы узлов и ребер
  const nodeTypes = useMemo(() => ({ shape: ShapeNode }), [])
  const edgeTypes = useMemo(() => ({ erd: ERDEdge }), [])

  // Конфигурация стилей для обычных диаграмм (BPMN)
  const getEdgeConfig = useCallback((flowType) => {
    if (diagramType === 'erd') {
      return { type: 'erd', style: { stroke: '#111827', strokeWidth: 2 } }
    }
    const configs = {
      'default-flow': { style: { stroke: '#1f2937', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#1f2937' } },
      'sequence-flow': { style: { stroke: '#111827', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#111827' } },
      // ...остальные типы можно добавить по необходимости
    }
    return configs[flowType] || configs['sequence-flow']
  }, [diagramType])

  // Сохранение
  const updateDiagramMutation = useMutation(
    (data) => diagramsAPI.updateDiagram(diagram.id, data),
    {
      onSuccess: () => { toast.success('Diagram saved successfully!'); setIsSaving(false) },
      onError: () => { toast.error('Failed to save'); setIsSaving(false) },
    }
  )

  const handleSave = useCallback(() => {
    if (!diagram || isLocked) return
    setIsSaving(true)
    const content = JSON.stringify({ nodes, edges })
    updateDiagramMutation.mutate({ content })
  }, [diagram, nodes, edges, isLocked, updateDiagramMutation])

  // Авто-сохранение
  useEffect(() => {
    if (diagram && !isSaving && !isLocked) {
      const timer = setTimeout(handleSave, 5000)
      return () => clearTimeout(timer)
    }
  }, [nodes, edges, diagram, isLocked])

  // --- LOGIC: ON CONNECT (Создание связи) ---
  const onConnect = useCallback((params) => {
    if (isLocked) return

    // Логика для ERD (Прямая связь Entity -> Entity)
    if (diagramType === 'erd') {
        const { source, target, sourceHandle, targetHandle } = params
        
        // Получаем настройки (1:1, 1:N) из текущего выбранного инструмента или дефолт
        const connSettings = getConnectionData(connectionType)

        const newEdge = {
            id: createUniqueId('erd-edge'),
            source,
            target,
            sourceHandle, // Важно передавать handle ID, чтобы ReactFlow знал откуда вести
            targetHandle,
            type: 'erd', // Используем наш компонент ERDEdge
            data: {
                // Передаем кардинальность для обоих концов
                sourceCardinality: connSettings.sourceCardinality, 
                targetCardinality: connSettings.targetCardinality,
                sourceOptional: false, // Можно расширить настройки для optional
                targetOptional: false,
            },
            style: { stroke: '#333', strokeWidth: 2 },
        }

        setEdges((eds) => addEdge(newEdge, eds))
        return
    }

    // Логика для остальных диаграмм (BPMN и т.д.)
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

  // Drag & Drop узлов
  const onDrop = useCallback((event) => {
    event.preventDefault()
    if (isLocked) return

    const transferData = event.dataTransfer.getData('application/reactflow')
    if (!transferData) return

    let parsedData
    try { parsedData = JSON.parse(transferData) } catch (e) { return }

    let position
    if (reactFlowInstance.screenToFlowPosition) {
        position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    } else {
        const bounds = event.currentTarget.getBoundingClientRect()
        position = reactFlowInstance.project({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top
        })
    }

    const nodeConfig = parsedData.nodeConfig || {}
    const newNode = {
      id: `${parsedData.id || 'node'}-${Date.now()}`,
      type: nodeConfig.type || 'shape',
      position,
      data: {
        ...nodeConfig,
        label: nodeConfig.label || parsedData.name || 'Entity',
        isContainer: isContainerShape(nodeConfig.shape),
      },
    }
    setNodes((nds) => nds.concat(newNode))
  }, [isLocked, reactFlowInstance, setNodes])

  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = isLocked ? 'none' : 'move'
  }, [isLocked])

  // --- CONTEXT MENUS ---

  // Для узлов
  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault(); if (isLocked) return;
    setContextMenu({ type: 'node', x: event.clientX, y: event.clientY, data: node })
  }, [isLocked])

  // Для связей (чтобы менять тип связи)
  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault(); if (isLocked) return;
    setContextMenu({ type: 'edge', x: event.clientX, y: event.clientY, data: edge })
  }, [isLocked])

  // Двойной клик
  const handleNodeDoubleClick = useCallback((event, node) => {
    event.preventDefault(); if (isLocked) return;
    if (diagramType === 'erd' && isErdEntity(node)) {
      setAttributeModal({ isOpen: true, node })
    } else {
      const label = window.prompt('Rename:', node.data?.label);
      if (label) setNodes((nds) => nds.map((n) => n.id === node.id ? { ...n, data: { ...n.data, label } } : n))
    }
  }, [diagramType, isLocked, setNodes])

  // Закрытие меню
  useEffect(() => {
    const fn = () => setContextMenu(null)
    if (contextMenu) window.addEventListener('click', fn)
    return () => window.removeEventListener('click', fn)
  }, [contextMenu])

  // Функция изменения кардинальности связи
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

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu} // Добавили обработчик для связей
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        connectionMode={ConnectionMode.Loose}
        connectionRadius={30}
        snapToGrid={true}
        snapGrid={[15, 15]}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        panOnDrag={!isLocked ? [1, 2] : true}
      >
        <Controls showInteractive={false} />
        <MiniMap nodeStrokeWidth={3} zoomable={!isLocked} pannable={!isLocked} />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div 
            className="fixed bg-white rounded shadow-lg border border-gray-200 py-1 z-50 text-sm min-w-[160px]" 
            style={{ left: contextMenu.x, top: contextMenu.y }}
        >
            {/* Меню для Узла */}
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
                    
                    <div className="h-px bg-gray-200 my-1"></div>
                    
                    <button onClick={() => {
                        setNodes((nds) => nds.filter((n) => n.id !== contextMenu.data.id));
                        setEdges((eds) => eds.filter((e) => e.source !== contextMenu.data.id && e.target !== contextMenu.data.id));
                        setContextMenu(null);
                    }} className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"><span>🗑️</span>Delete</button>
                </>
            )}

            {/* Меню для Связи (ERD only) */}
            {contextMenu.type === 'edge' && diagramType === 'erd' && (
                <>
                    <div className="px-4 py-1 text-xs text-gray-400 uppercase font-semibold">Change Cardinality</div>
                    <button onClick={() => updateEdgeCardinality(contextMenu.data.id, '1:1')} className="w-full px-4 py-2 text-left hover:bg-gray-100">One to One (1:1)</button>
                    <button onClick={() => updateEdgeCardinality(contextMenu.data.id, '1:N')} className="w-full px-4 py-2 text-left hover:bg-gray-100">One to Many (1:N)</button>
                    <button onClick={() => updateEdgeCardinality(contextMenu.data.id, 'N:1')} className="w-full px-4 py-2 text-left hover:bg-gray-100">Many to One (N:1)</button>
                    <button onClick={() => updateEdgeCardinality(contextMenu.data.id, 'M:N')} className="w-full px-4 py-2 text-left hover:bg-gray-100">Many to Many (M:N)</button>
                    
                    <div className="h-px bg-gray-200 my-1"></div>
                    
                    <button onClick={() => {
                        setEdges((eds) => eds.filter((e) => e.id !== contextMenu.data.id));
                        setContextMenu(null);
                    }} className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50">Delete Connection</button>
                </>
            )}

             {/* Меню для Связи (Обычное) */}
             {contextMenu.type === 'edge' && diagramType !== 'erd' && (
                <button onClick={() => {
                    setEdges((eds) => eds.filter((e) => e.id !== contextMenu.data.id));
                    setContextMenu(null);
                }} className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50">Delete Connection</button>
            )}
        </div>
      )}

      <AttributeModal
        isOpen={attributeModal.isOpen}
        onClose={() => setAttributeModal({ isOpen: false, node: null })}
        onSave={(data) => {
            setNodes((nds) => nds.map((n) => n.id === attributeModal.node.id ? { ...n, data: { ...n.data, ...data } } : n));
        }}
        nodeData={attributeModal.node?.data}
        isEntity={isErdEntity(attributeModal.node)}
      />
    </>
  )
}

// --- WRAPPER COMPONENT ---

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
        } else {
            setNodes([])
            setEdges([])
        }
        setIsLoading(false)
    }, 100)
    return () => clearTimeout(timer)
  }, [props.diagram, setNodes, setEdges])

  const getDiagramTitle = () => {
    switch (props.diagramType) {
      case 'bpmn': return 'BPMN Diagram';
      case 'erd': return 'ER Diagram';
      default: return 'Diagram Editor';
    }
  }

  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center justify-between p-4 bg-white border-b">
         <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-gray-900">{props.diagram?.name || 'Untitled'}</h2>
            <span className="text-sm text-gray-500">{getDiagramTitle()}</span>
         </div>
         <div className="flex gap-2">
            <button className="btn btn-sm btn-primary flex items-center gap-1" onClick={() => toast.success('Saved')}><Save className="w-4 h-4"/>Save</button>
         </div>
       </div>

       <div className="flex-1 relative">
         {isLoading ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50">
                 <span className="text-gray-500">Loading...</span>
             </div>
         ) : (
             <ReactFlowProvider>
                <DiagramEditorContent 
                    {...props} 
                    nodes={nodes} setNodes={setNodes} onNodesChange={onNodesChange} 
                    edges={edges} setEdges={setEdges} onEdgesChange={onEdgesChange} 
                />
             </ReactFlowProvider>
         )}
       </div>
    </div>
  )
}

export default DiagramEditor