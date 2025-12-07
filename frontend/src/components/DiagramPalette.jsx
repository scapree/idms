import React, { useEffect, useMemo, useState } from 'react'
import { 
  ArrowRight, Circle, Database, Square, Triangle, Zap, 
  ChevronDown, ChevronRight, Box, Layers, ArrowRightCircle,
  FileText, Mail, Clock, HelpCircle, Radio, TrendingUp,
  AlertCircle, Undo2, Ban, Link, Sparkles, PlusCircle,
  User, Cog, FileCode, Hand, Send, Download, Scale, PhoneCall, Library,
  X, Plus, CircleDot, Equal, Files, ArrowDownToLine, ArrowUpFromLine,
  StickyNote, LayoutPanelTop, LayoutPanelLeft, Slash, ArrowUpRight, ArrowBigRight,
  StretchHorizontal
} from 'lucide-react'
import * as Icons from 'lucide-react'

const capitalize = (value = '') => value.charAt(0).toUpperCase() + value.slice(1)
const ALL_SIDES = ['top', 'right', 'bottom', 'left']

// ==========================================
// BPMN CONFIGURATION & CONSTANTS
// ==========================================

const EVENT_STYLES = {
  start: { background: '#ecfdf5', borderColor: '#10b981', textColor: '#065f46', borderWidth: 2 },
  intermediate: { background: '#eef2ff', borderColor: '#6366f1', textColor: '#312e81', borderWidth: 2, innerBorderWidth: 2, innerBorderColor: '#a5b4fc' },
  end: { background: '#fef2f2', borderColor: '#ef4444', textColor: '#7f1d1d', borderWidth: 4 },
}

const EVENT_VARIANTS = [
  { key: 'none', icon: 'Circle', label: 'Простое' },
  { key: 'message', icon: 'Mail', label: 'Сообщение' },
  { key: 'timer', icon: 'Clock', label: 'Таймер' },
  { key: 'conditional', icon: 'HelpCircle', label: 'Условие' },
  { key: 'signal', icon: 'Radio', label: 'Сигнал' },
  { key: 'escalation', icon: 'TrendingUp', label: 'Эскалация' },
  { key: 'error', icon: 'AlertCircle', label: 'Ошибка' },
  { key: 'compensation', icon: 'Undo2', label: 'Компенсация' },
  { key: 'cancel', icon: 'Ban', label: 'Отмена' },
  { key: 'link', icon: 'Link', label: 'Ссылка' },
  { key: 'multiple', icon: 'Sparkles', label: 'Множественное' },
  { key: 'parallel-multiple', icon: 'PlusCircle', label: 'Параллельное множ.' },
]

const TASK_VARIANTS = [
  { id: 'task', name: 'Задача', icon: 'Square', color: '#2563eb' },
  { id: 'user-task', name: 'Пользовательская', icon: 'User', color: '#0ea5e9' },
  { id: 'service-task', name: 'Сервисная', icon: 'Cog', color: '#7c3aed' },
  { id: 'script-task', name: 'Скриптовая', icon: 'FileCode', color: '#f59e0b' },
  { id: 'manual-task', name: 'Ручная', icon: 'Hand', color: '#f97316' },
  { id: 'send-task', name: 'Отправка', icon: 'Send', color: '#6366f1' },
  { id: 'receive-task', name: 'Получение', icon: 'Download', color: '#22c55e' },
  { id: 'business-rule-task', name: 'Бизнес-правило', icon: 'Scale', color: '#d946ef' },
  { id: 'call-activity', name: 'Вызов активности', icon: 'PhoneCall', color: '#f43f5e', extra: { borderWidth: 4 } },
  { id: 'subprocess-collapsed', name: 'Подпроцесс (сверн.)', icon: 'Library', color: '#14b8a6', extra: { label: 'Подпроцесс (+)', fontSize: 12 } },
  { id: 'event-subprocess', name: 'Событийный подпроц.', icon: 'Zap', color: '#0ea5e9', extra: { borderStyle: 'dashed' } },
]

const GATEWAYS = [
  { id: 'exclusive-gateway', name: 'Исключающий шлюз', icon: 'X', color: '#f97316' },
  { id: 'inclusive-gateway', name: 'Включающий шлюз', icon: 'Circle', color: '#6366f1' },
  { id: 'parallel-gateway', name: 'Параллельный шлюз', icon: 'Plus', color: '#22c55e' },
  { id: 'complex-gateway', name: 'Сложный шлюз', icon: 'Sparkles', color: '#8b5cf6' },
  { id: 'exclusive-event-gateway', name: 'Событийный шлюз', icon: 'CircleDot', color: '#0ea5e9' },
  { id: 'parallel-event-gateway', name: 'Парал. событийный', icon: 'Equal', color: '#22d3ee' },
]

const DATA_OBJECTS = [
  { id: 'data-object', name: 'Объект данных', icon: 'FileText', color: '#38bdf8' },
  { id: 'data-collection', name: 'Коллекция данных', icon: 'Files', color: '#6366f1' },
  { id: 'data-input', name: 'Входные данные', icon: 'ArrowDownToLine', color: '#22c55e' },
  { id: 'data-output', name: 'Выходные данные', icon: 'ArrowUpFromLine', color: '#f97316' },
  { id: 'data-store', name: 'Хранилище данных', icon: 'Database', color: '#14b8a6', shape: 'cylinder' },
]

const ARTIFACTS = [
  { id: 'group', name: 'Группа', icon: 'Layers', color: '#4b5563', extra: { borderStyle: 'dashed', borderWidth: 2 } },
  { id: 'text-annotation', name: 'Аннотация', icon: 'StickyNote', color: '#facc15', shape: 'annotation' },
]

const SWIMLANES = [
  { id: 'pool', name: 'Пул', icon: 'LayoutPanelTop', color: '#94a3b8', shape: 'lane', nodeConfig: { width: 500, height: 200, header: 'Участник', headerPosition: 'left', headerBackground: '#e2e8f0', isContainer: true, containerShape: 'pool' } },
  { id: 'lane', name: 'Дорожка', icon: 'LayoutPanelLeft', color: '#cbd5f5', shape: 'lane', nodeConfig: { width: 500, height: 120, header: 'Дорожка', headerPosition: 'top', headerBackground: '#e5e7eb', isContainer: true, containerShape: 'lane' } },
]

const BPMN_CONNECTORS = [
  { id: 'sequence-flow', name: 'Поток управления', connectionType: 'sequence-flow', description: 'Последовательность', icon: 'ArrowRight' },
  { id: 'default-flow', name: 'Поток по умолч.', connectionType: 'default-flow', description: 'Путь по умолчанию', icon: 'ArrowBigRight' },
  { id: 'conditional-flow', name: 'Условный поток', connectionType: 'conditional-flow', description: 'С условием', icon: 'HelpCircle' },
  { id: 'message-flow', name: 'Поток сообщений', connectionType: 'message-flow', description: 'Между пулами', icon: 'Mail' },
  { id: 'association', name: 'Ассоциация', connectionType: 'association', description: 'Связь артефакта', icon: 'Slash' },
  { id: 'data-association', name: 'Поток данных', connectionType: 'data-association', description: 'Передача данных', icon: 'ArrowUpRight' },
  { id: 'compensation-flow', name: 'Компенсация', connectionType: 'compensation-flow', description: 'Откат действия', icon: 'Undo2' },
]

const createEventElement = (stage, variant) => {
  const baseName = `${capitalize(stage)} ${variant.label} Event`
  const style = EVENT_STYLES[stage]
  return {
    id: `bpmn-${stage}-${variant.key}-event`,
    name: baseName,
    previewColor: style.borderColor,
    paletteIcon: variant.icon,
    nodeConfig: {
      label: baseName, shape: 'circle', width: 40, height: 40,
      background: style.background, borderColor: style.borderColor,
      borderWidth: style.borderWidth, innerBorderWidth: style.innerBorderWidth,
      innerBorderColor: style.innerBorderColor, textColor: style.textColor,
      showLabelInside: false, labelPosition: 'bottom',
      icon: variant.icon, iconColor: style.borderColor, iconSize: 20,
      handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }
}

const STAGE_TITLES = {
  start: 'Начальные события',
  intermediate: 'Промежуточные события', 
  end: 'Конечные события',
}

const buildBpmnGroups = () => {
  const eventGroups = ['start', 'intermediate', 'end'].map((stage) => ({
    title: STAGE_TITLES[stage],
    items: EVENT_VARIANTS.map((variant) => createEventElement(stage, variant)),
  }))

  const activities = TASK_VARIANTS.map((task) => ({
    id: `bpmn-${task.id}`, name: task.name, previewColor: task.color, paletteIcon: task.icon,
    nodeConfig: {
      label: task.extra?.label || task.name, shape: 'rectangle', width: 100, height: 80,
      background: '#ffffff', borderColor: task.color, borderWidth: task.extra?.borderWidth || 2,
      borderStyle: task.extra?.borderStyle || 'solid', borderRadius: 8, textColor: '#111827',
      icon: task.icon, iconColor: task.color,
      handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }))

  const gateways = GATEWAYS.map((gateway) => ({
    id: `bpmn-${gateway.id}`, name: gateway.name, previewColor: gateway.color, paletteIcon: gateway.icon,
    nodeConfig: {
      label: gateway.name, shape: 'diamond', width: 50, height: 50,
      background: '#ffffff', borderColor: gateway.color, borderWidth: 2, textColor: gateway.color,
      showLabelInside: false, labelPosition: 'bottom', icon: gateway.icon, iconColor: gateway.color,
      handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }))

  const dataObjects = DATA_OBJECTS.map((obj) => ({
    id: `bpmn-${obj.id}`, name: obj.name, previewColor: obj.color, paletteIcon: obj.icon,
    nodeConfig: {
      label: obj.name, shape: obj.shape || 'data-object', width: 40, height: 50,
      background: '#ffffff', borderColor: obj.color, borderWidth: 2, textColor: '#111827',
      icon: obj.icon, iconColor: obj.color,
      handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }))

  const swimlanes = SWIMLANES.map((lane) => ({
    id: `bpmn-${lane.id}`, name: lane.name, previewColor: lane.color, paletteIcon: lane.icon,
    nodeConfig: {
      ...lane.nodeConfig,
      shape: lane.shape, background: '#f8fafc', borderColor: '#475569', borderWidth: 2,
      handles: { incoming: [], outgoing: [] },
    },
  }))

  return [
    ...eventGroups,
    { title: 'Активности', items: activities },
    { title: 'Шлюзы', items: gateways },
    { title: 'Данные', items: dataObjects },
    { title: 'Пулы и дорожки', items: swimlanes },
  ]
}

// ==========================================
// ERD CONFIGURATION
// ==========================================

const buildErdConfiguration = () => {
  const entities = [
    {
      id: 'erd-entity',
      name: 'Сущность',
      paletteIcon: 'Square',
      previewColor: '#2563eb',
      nodeConfig: {
        label: 'Сущность', shape: 'entity', width: 200, height: 160,
        background: '#ffffff', borderColor: '#2563eb', borderWidth: 2,
        textColor: '#0f172a', attributes: [],
        handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
      },
    },
  ]

  return {
    groups: [{ title: 'Сущности', items: entities }],
    connectorsTitle: null,
    connectors: [],
  }
}

// ==========================================
// DFD CONFIGURATION (Yourdon & DeMarco)
// ==========================================

const buildDfdConfiguration = () => {
    const primaryColor = '#8b5cf6' // Violet-500
    const primaryBg = '#f5f3ff' // Violet-50
    
    const elements = [
        {
            id: 'dfd-process',
            name: 'Процесс',
            paletteIcon: 'Circle',
            previewColor: primaryColor,
            nodeConfig: {
                label: 'Процесс',
                shape: 'circle', // Круг
                width: 100, height: 100,
                background: primaryBg,
                borderColor: primaryColor,
                borderWidth: 2,
                textColor: '#4c1d95',
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
            }
        },
        {
            id: 'dfd-external-entity',
            name: 'Внешняя сущность',
            paletteIcon: 'Square',
            previewColor: '#64748b',
            nodeConfig: {
                label: 'Внешняя сущность',
                shape: 'rectangle', // Прямоугольник
                width: 140, height: 80,
                background: '#f1f5f9',
                borderColor: '#475569',
                borderWidth: 2,
                textColor: '#1e293b',
                fontWeight: 700,
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
            }
        },
        {
            id: 'dfd-data-store',
            name: 'Хранилище данных',
            paletteIcon: 'StretchHorizontal', // Иконка похожая на две линии
            previewColor: primaryColor,
            nodeConfig: {
                label: 'Хранилище',
                shape: 'data-store', // Кастомная форма (линии)
                width: 160, height: 60,
                background: 'transparent',
                borderColor: primaryColor,
                borderWidth: 2,
                textColor: '#4c1d95',
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
            }
        }
    ]

    const connectors = [
        {
            id: 'dfd-data-flow',
            name: 'Поток данных',
            connectionType: 'data-flow',
            description: 'Передача данных',
            icon: 'ArrowRight',
        }
    ]

    return {
        groups: [
            { title: 'Элементы DFD', items: elements },
        ],
        connectorsTitle: 'Связи',
        connectors: connectors
    }
}

// ==========================================
// MAIN COMPONENT
// ==========================================

const DiagramPalette = ({ diagramType, selectedConnectionType, onConnectionTypeChange }) => {
  const configuration = useMemo(() => {
    if (diagramType === 'bpmn') {
      return {
        groups: buildBpmnGroups(),
        connectorsTitle: 'Соединения',
        connectors: BPMN_CONNECTORS,
      }
    }

    if (diagramType === 'erd') {
      return buildErdConfiguration()
    }

    if (diagramType === 'dfd') {
      return buildDfdConfiguration()
    }

    return { groups: [], connectors: [] }
  }, [diagramType])

  const handleDragStart = (event, element) => {
    const payload = {
      id: element.id,
      name: element.name,
      nodeConfig: element.nodeConfig,
    }
    event.dataTransfer.setData('application/reactflow', JSON.stringify(payload))
    event.dataTransfer.effectAllowed = 'move'
  }

  const [collapsedGroups, setCollapsedGroups] = useState({})

  const groupsKey = useMemo(
    () => [
      configuration.groups.map((group) => group.title).join('|'),
      configuration.connectorsTitle || ''
    ].join('::'),
    [configuration.groups, configuration.connectorsTitle]
  )

  useEffect(() => {
    setCollapsedGroups((prev) => {
      const next = {}
      configuration.groups.forEach((group) => {
        next[group.title] = prev?.[group.title] ?? false
      })
      if (configuration.connectorsTitle) {
        next[configuration.connectorsTitle] = prev?.[configuration.connectorsTitle] ?? false
      }
      return next
    })
  }, [groupsKey, configuration.connectorsTitle])

  const toggleGroup = (title) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev?.[title] }))
  }

  const renderConnector = (connector) => {
    const isSelected = selectedConnectionType === connector.connectionType
    const iconName = connector.icon
    const connectorIcon = iconName && Icons[iconName] ? Icons[iconName] : null
    const FallbackIcon = Zap

    return (
      <button
        key={connector.id}
        type="button"
        onClick={() => onConnectionTypeChange?.(connector.connectionType)}
        className={`w-full text-left px-3 py-2 rounded border transition-colors ${
          isSelected
            ? 'border-primary-500 bg-primary-50 text-primary-700'
            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-7 h-7 rounded flex items-center justify-center ${
              isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {connectorIcon ? React.createElement(connectorIcon, { className: 'h-3.5 w-3.5' }) : <FallbackIcon className="h-3.5 w-3.5" />}
          </div>
          <div>
            <div className="text-sm font-medium">{connector.name}</div>
            <div className="text-xs text-gray-400">{connector.description}</div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
          Элементы {diagramType?.toUpperCase()}
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Перетащите элемент или выберите тип связи
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {configuration.groups.map((group) => {
          const isCollapsed = collapsedGroups[group.title]
          return (
            <div key={group.title} className="space-y-1.5">
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-100 px-2 py-1.5 rounded transition-colors"
                onClick={() => toggleGroup(group.title)}
              >
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.title}</h3>
                {isCollapsed ? <ChevronRight size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </div>
              
              {!isCollapsed && (
                <div className="space-y-1.5">
                  {group.items.map((element) => {
                    const iconName = element.paletteIcon
                    const IconComponent = element.icon || (iconName && Icons[iconName] ? Icons[iconName] : Square)
                    return (
                      <div
                        key={element.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, element)}
                        className="flex items-center space-x-3 p-2 rounded border border-gray-200 bg-white hover:border-primary-400 cursor-move transition-colors"
                      >
                        <div
                          className="w-7 h-7 rounded flex items-center justify-center text-white"
                          style={{ backgroundColor: element.previewColor || '#64748b' }}
                        >
                          <IconComponent className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm text-gray-700">{element.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {configuration.connectors && configuration.connectors.length > 0 && (
          <div className="space-y-1.5 pt-3 border-t border-gray-200">
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-100 px-2 py-1.5 rounded transition-colors"
              onClick={() => toggleGroup(configuration.connectorsTitle)}
            >
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {configuration.connectorsTitle || 'Соединения'}
              </h3>
              {collapsedGroups[configuration.connectorsTitle] ? <ChevronRight size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>
            {!collapsedGroups[configuration.connectorsTitle] && (
              <div className="space-y-1.5">
                {configuration.connectors.map(renderConnector)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DiagramPalette