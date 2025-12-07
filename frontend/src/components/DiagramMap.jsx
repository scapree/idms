import React, { useMemo, useCallback, useState, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useQuery } from 'react-query'
import { diagramsAPI } from '../api'
import { 
  Map as MapIcon, X, 
  Link2, Layers, Code, Database,
  FileText
} from 'lucide-react'

// Типы связей с цветами и описаниями
const LINK_TYPE_STYLES = {
  reference: { 
    stroke: '#6b7280', 
    label: 'Ссылка',
    icon: Link2,
    description: 'Общая ссылка на связанную диаграмму'
  },
  decomposition: { 
    stroke: '#22c55e', 
    label: 'Декомпозиция',
    icon: Layers,
    description: 'Элемент детализируется в подчинённой диаграмме'
  },
  implementation: { 
    stroke: '#3b82f6', 
    label: 'Реализация',
    icon: Code,
    description: 'Техническая реализация процесса/элемента'
  },
  data_source: { 
    stroke: '#f59e0b', 
    label: 'Источник данных',
    icon: Database,
    description: 'Связь с моделью данных (ERD)'
  },
}

// Цвета для типов диаграмм
const DIAGRAM_TYPE_COLORS = {
  bpmn: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  erd: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  dfd: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
}

// Компонент для узла диаграммы на карте
const DiagramMapNode = ({ data }) => {
  const colors = DIAGRAM_TYPE_COLORS[data.diagramType] || DIAGRAM_TYPE_COLORS.bpmn
  const isActive = data.isActive
  
  return (
    <div 
      className={`px-4 py-3 rounded-lg border-2 min-w-[140px] max-w-[200px] cursor-pointer transition-all relative ${
        isActive ? 'ring-2 ring-offset-2 ring-primary-500 shadow-lg scale-105' : 'hover:shadow-md'
      }`}
      style={{ 
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      {/* Connection handles for edges */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ background: colors.border, border: 'none', width: 8, height: 8 }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ background: colors.border, border: 'none', width: 8, height: 8 }} 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="left"
        style={{ background: colors.border, border: 'none', width: 8, height: 8 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right"
        style={{ background: colors.border, border: 'none', width: 8, height: 8 }} 
      />
      
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4" style={{ color: colors.text }} />
        <span 
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: colors.text }}
        >
          {data.diagramType}
        </span>
      </div>
      <div 
        className="font-medium text-sm truncate"
        style={{ color: colors.text }}
        title={data.label}
      >
        {data.label}
      </div>
      {data.linkCount > 0 && (
        <div className="mt-1 text-xs opacity-70" style={{ color: colors.text }}>
          {data.linkCount} {data.linkCount === 1 ? 'связь' : data.linkCount < 5 ? 'связи' : 'связей'}
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  diagramNode: DiagramMapNode,
}

// Автоматическое расположение узлов в иерархическом стиле
const calculateNodePositions = (diagrams) => {
  const positions = new Map()
  
  if (diagrams.length === 0) return positions
  
  const nodeWidth = 180
  const nodeHeight = 100
  const horizontalSpacing = 280
  const verticalSpacing = 180
  
  if (diagrams.length === 1) {
    positions.set(diagrams[0].id, { x: 400, y: 200 })
  } else if (diagrams.length === 2) {
    positions.set(diagrams[0].id, { x: 250, y: 200 })
    positions.set(diagrams[1].id, { x: 550, y: 200 })
  } else if (diagrams.length === 3) {
    // Треугольник: один сверху, два снизу
    positions.set(diagrams[0].id, { x: 400, y: 100 })
    positions.set(diagrams[1].id, { x: 200, y: 350 })
    positions.set(diagrams[2].id, { x: 600, y: 350 })
  } else if (diagrams.length <= 6) {
    // Два ряда
    const topCount = Math.ceil(diagrams.length / 2)
    const bottomCount = diagrams.length - topCount
    
    diagrams.slice(0, topCount).forEach((diagram, index) => {
      const totalWidth = (topCount - 1) * horizontalSpacing
      const startX = 400 - totalWidth / 2
      positions.set(diagram.id, { x: startX + index * horizontalSpacing, y: 100 })
    })
    
    diagrams.slice(topCount).forEach((diagram, index) => {
      const totalWidth = (bottomCount - 1) * horizontalSpacing
      const startX = 400 - totalWidth / 2
      positions.set(diagram.id, { x: startX + index * horizontalSpacing, y: 100 + verticalSpacing * 1.5 })
    })
  } else {
    // Сетка для большего количества
    const cols = Math.ceil(Math.sqrt(diagrams.length))
    
    diagrams.forEach((diagram, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)
      const totalWidth = (cols - 1) * horizontalSpacing
      const startX = 400 - totalWidth / 2
      positions.set(diagram.id, {
        x: startX + col * horizontalSpacing,
        y: 100 + row * verticalSpacing,
      })
    })
  }
  
  return positions
}

// Внутренний компонент с ReactFlow (требует ReactFlowProvider)
const DiagramMapFlow = ({ 
  initialNodes, 
  initialEdges, 
  onNodeClick,
  showLegend,
  setShowLegend 
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const reactFlowInstance = useReactFlow()
  
  // Обновление при изменении данных
  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes)
      setEdges(initialEdges)
      
      // Fit view after updating nodes
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.2 })
        }
      }, 100)
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, reactFlowInstance])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.2}
      maxZoom={2}
      attributionPosition="bottom-left"
      style={{ width: '100%', height: '100%' }}
    >
      <Background variant="dots" gap={20} size={1} color="#e5e7eb" />
      <Controls showInteractive={false} />
      <MiniMap 
        nodeStrokeWidth={2}
        style={{ 
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
        }}
      />
      
      {/* Legend Panel */}
      {showLegend && (
        <Panel position="top-right" className="bg-white/95 backdrop-blur rounded-lg border border-gray-200 p-3 shadow-lg max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Легенда
            </span>
            <button 
              onClick={() => setShowLegend(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
          <div className="space-y-3">
            {/* Типы диаграмм */}
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">Типы диаграмм:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(DIAGRAM_TYPE_COLORS).map(([type, colors]) => (
                  <div 
                    key={type}
                    className="px-2 py-1 rounded text-xs font-bold uppercase"
                    style={{ 
                      backgroundColor: colors.bg, 
                      color: colors.text,
                      border: `1px solid ${colors.border}`
                    }}
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Типы связей */}
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">Типы связей:</div>
              <div className="space-y-1.5">
                {Object.entries(LINK_TYPE_STYLES).map(([type, style]) => {
                  const Icon = style.icon
                  return (
                    <div key={type} className="flex items-start gap-2">
                      <div 
                        className="w-4 h-0.5 rounded mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: style.stroke }}
                      />
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: style.stroke }} />
                      <div>
                        <span className="text-xs text-gray-700 font-medium">{style.label}</span>
                        <p className="text-xs text-gray-400 leading-tight">{style.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </Panel>
      )}
      
      {/* Show legend button if hidden */}
      {!showLegend && (
        <Panel position="top-right">
          <button 
            onClick={() => setShowLegend(true)}
            className="bg-white/95 backdrop-blur rounded-lg border border-gray-200 p-2 shadow-lg hover:bg-gray-50"
            title="Показать легенду"
          >
            <MapIcon className="w-4 h-4 text-gray-600" />
          </button>
        </Panel>
      )}
    </ReactFlow>
  )
}

const DiagramMap = ({ 
  projectId, 
  diagrams = [], 
  currentDiagramId,
  onDiagramSelect,
  isOpen,
  onClose
}) => {
  const [showLegend, setShowLegend] = useState(true)
  
  // Загрузка связей проекта
  const { data: projectLinks = [], isLoading } = useQuery(
    ['project-links', projectId],
    () => diagramsAPI.getProjectLinks(projectId),
    { 
      enabled: isOpen && !!projectId,
      staleTime: 0,
      refetchOnMount: true,
    }
  )

  
  // Создание узлов и рёбер для ReactFlow
  const { flowNodes, flowEdges } = useMemo(() => {
    if (!diagrams.length) return { flowNodes: [], flowEdges: [] }
    
    // Подсчёт связей для каждой диаграммы
    const linkCounts = new Map()
    projectLinks.forEach(link => {
      linkCounts.set(link.source_diagram, (linkCounts.get(link.source_diagram) || 0) + 1)
    })
    
    // Расчёт позиций
    const positions = calculateNodePositions(diagrams)
    
    // Создаём Set с ID диаграмм текущего проекта
    const diagramIds = new Set(diagrams.map(d => d.id))
    
    // Создаём узлы
    const flowNodes = diagrams.map(diagram => ({
      id: `diagram-${diagram.id}`,
      type: 'diagramNode',
      position: positions.get(diagram.id) || { x: Math.random() * 600, y: Math.random() * 400 },
      data: {
        label: diagram.name,
        diagramType: diagram.diagram_type,
        diagramId: diagram.id,
        isActive: diagram.id === currentDiagramId,
        linkCount: linkCounts.get(diagram.id) || 0,
      },
    }))
    
    // Создаём рёбра - только для связей где обе диаграммы есть на карте
    const flowEdges = projectLinks
      .filter(link => {
        // Проверяем что и source и target диаграммы есть в текущем проекте
        const hasSource = diagramIds.has(link.source_diagram)
        const hasTarget = diagramIds.has(link.target_diagram)
        return hasSource && hasTarget
      })
      .map(link => {
        const style = LINK_TYPE_STYLES[link.link_type] || LINK_TYPE_STYLES.reference
        return {
        id: `link-${link.id}`,
        source: `diagram-${link.source_diagram}`,
        target: `diagram-${link.target_diagram}`,
        type: 'default',
        animated: link.link_type === 'decomposition',
          style: { 
            stroke: style.stroke, 
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: style.stroke,
          },
          data: {
            linkType: link.link_type,
            sourceElement: link.source_element_label,
          },
          label: link.source_element_label || '',
          labelStyle: { 
            fontSize: 10, 
            fontWeight: 500,
            fill: '#64748b',
          },
          labelBgStyle: { 
            fill: 'white', 
            fillOpacity: 0.8,
          },
        }
      })
    
    
    return { flowNodes, flowEdges }
  }, [diagrams, projectLinks, currentDiagramId])
  
  const handleNodeClick = useCallback((event, node) => {
    if (onDiagramSelect && node.data?.diagramId) {
      onDiagramSelect(node.data.diagramId)
    }
  }, [onDiagramSelect])
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-gray-200 w-[90vw] h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <MapIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Карта связей</h2>
              <p className="text-sm text-gray-500">
                {diagrams.length} {diagrams.length === 1 ? 'диаграмма' : diagrams.length < 5 ? 'диаграммы' : 'диаграмм'} • {flowEdges.length} {flowEdges.length === 1 ? 'связь' : flowEdges.length < 5 ? 'связи' : 'связей'}
                {flowEdges.length < projectLinks.length && (
                  <span className="text-gray-400 ml-1">
                    (+{projectLinks.length - flowEdges.length} внешних)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Map Content */}
        <div className="flex-1 relative bg-gray-50" style={{ minHeight: '500px', height: '100%' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-primary-600"></div>
            </div>
          ) : diagrams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">Нет диаграмм</p>
              <p className="text-sm">Создайте диаграммы, чтобы увидеть карту связей</p>
            </div>
          ) : (
            <ReactFlowProvider>
              <div className="absolute inset-0">
                <DiagramMapFlow
                  initialNodes={flowNodes}
                  initialEdges={flowEdges}
                  onNodeClick={handleNodeClick}
                  showLegend={showLegend}
                  setShowLegend={setShowLegend}
                />
              </div>
            </ReactFlowProvider>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span>💡 Нажмите на диаграмму для перехода</span>
            <span>• Перетащите для перемещения</span>
            <span>• Колёсико мыши для масштаба</span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

export default DiagramMap
