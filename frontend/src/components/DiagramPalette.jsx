import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Circle, Database, Square, Triangle, Zap, ChevronDown, ChevronRight } from 'lucide-react'
import * as Icons from 'lucide-react'

const capitalize = (value = '') => value.charAt(0).toUpperCase() + value.slice(1)

const ALL_SIDES = ['top', 'right', 'bottom', 'left']

const EVENT_STYLES = {
  start: {
    background: '#ecfdf5',
    borderColor: '#10b981',
    textColor: '#065f46',
    borderWidth: 2,
  },
  intermediate: {
    background: '#eef2ff',
    borderColor: '#6366f1',
    textColor: '#312e81',
    borderWidth: 2,
    innerBorderWidth: 2,
    innerBorderColor: '#a5b4fc',
  },
  end: {
    background: '#fef2f2',
    borderColor: '#ef4444',
    textColor: '#7f1d1d',
    borderWidth: 4,
  },
}

const EVENT_VARIANTS = [
  { key: 'none', icon: 'Circle', label: 'None' },
  { key: 'message', icon: 'Mail', label: 'Message' },
  { key: 'timer', icon: 'Clock', label: 'Timer' },
  { key: 'conditional', icon: 'HelpCircle', label: 'Conditional' },
  { key: 'signal', icon: 'Radio', label: 'Signal' },
  { key: 'escalation', icon: 'TrendingUp', label: 'Escalation' },
  { key: 'error', icon: 'AlertCircle', label: 'Error' },
  { key: 'compensation', icon: 'Undo2', label: 'Compensation' },
  { key: 'cancel', icon: 'Ban', label: 'Cancel' },
  { key: 'link', icon: 'Link', label: 'Link' },
  { key: 'multiple', icon: 'Sparkles', label: 'Multiple' },
  { key: 'parallel-multiple', icon: 'PlusCircle', label: 'Parallel Multiple' },
]

const TASK_VARIANTS = [
  { id: 'task', name: 'Task', icon: 'Square', color: '#2563eb' },
  { id: 'user-task', name: 'User Task', icon: 'User', color: '#0ea5e9' },
  { id: 'service-task', name: 'Service Task', icon: 'Cog', color: '#7c3aed' },
  { id: 'script-task', name: 'Script Task', icon: 'FileCode', color: '#f59e0b' },
  { id: 'manual-task', name: 'Manual Task', icon: 'Hand', color: '#f97316' },
  { id: 'send-task', name: 'Send Task', icon: 'Send', color: '#6366f1' },
  { id: 'receive-task', name: 'Receive Task', icon: 'Download', color: '#22c55e' },
  { id: 'business-rule-task', name: 'Business Rule Task', icon: 'Scale', color: '#d946ef' },
  { id: 'call-activity', name: 'Call Activity', icon: 'PhoneCall', color: '#f43f5e', extra: { borderWidth: 4 } },
  {
    id: 'subprocess-collapsed',
    name: 'Subprocess (Collapsed)',
    icon: 'Library',
    color: '#14b8a6',
    extra: { label: 'Subprocess (+)', fontSize: 12 },
  },
  {
    id: 'event-subprocess',
    name: 'Event Subprocess',
    icon: 'Zap',
    color: '#0ea5e9',
    extra: { borderStyle: 'dashed' },
  },
]

const GATEWAYS = [
  { id: 'exclusive-gateway', name: 'Exclusive Gateway', icon: 'X', color: '#f97316' },
  { id: 'inclusive-gateway', name: 'Inclusive Gateway', icon: 'Circle', color: '#6366f1' },
  { id: 'parallel-gateway', name: 'Parallel Gateway', icon: 'Plus', color: '#22c55e' },
  { id: 'complex-gateway', name: 'Complex Gateway', icon: 'Sparkles', color: '#8b5cf6' },
  { id: 'exclusive-event-gateway', name: 'Event-based Gateway', icon: 'CircleDot', color: '#0ea5e9' },
  { id: 'parallel-event-gateway', name: 'Parallel Event Gateway', icon: 'Equal', color: '#22d3ee' },
]

const DATA_OBJECTS = [
  { id: 'data-object', name: 'Data Object', icon: 'FileText', color: '#38bdf8' },
  { id: 'data-collection', name: 'Data Collection', icon: 'Files', color: '#6366f1' },
  { id: 'data-input', name: 'Data Input', icon: 'ArrowDownToLine', color: '#22c55e' },
  { id: 'data-output', name: 'Data Output', icon: 'ArrowUpFromLine', color: '#f97316' },
  { id: 'data-store', name: 'Data Store', icon: 'Database', color: '#14b8a6', shape: 'cylinder' },
]

const ARTIFACTS = [
  { id: 'group', name: 'Group', icon: 'Layers', color: '#4b5563', extra: { borderStyle: 'dashed', borderWidth: 2 } },
  { id: 'text-annotation', name: 'Text Annotation', icon: 'StickyNote', color: '#facc15', shape: 'annotation' },
]

const SWIMLANES = [
  {
    id: 'pool',
    name: 'Pool (Participant)',
    icon: 'LayoutPanelTop',
    color: '#94a3b8',
    shape: 'lane',
    nodeConfig: {
      width: 520,
      height: 140,
      borderColor: '#475569',
      borderWidth: 2,
      header: 'Participant',
      headerPosition: 'left',
      headerBackground: '#e2e8f0',
      isContainer: true,
      containerShape: 'pool',
    },
  },
  {
    id: 'lane',
    name: 'Lane',
    icon: 'LayoutPanelLeft',
    color: '#cbd5f5',
    shape: 'lane',
    nodeConfig: {
      width: 520,
      height: 100,
      borderColor: '#64748b',
      borderWidth: 2,
      header: 'Lane',
      headerPosition: 'top',
      headerBackground: '#e5e7eb',
      isContainer: true,
      containerShape: 'lane',
    },
  },
]

const BPMN_CONNECTORS = [
  {
    id: 'sequence-flow',
    name: 'Sequence Flow',
    connectionType: 'sequence-flow',
    description: 'Solid control flow',
    icon: 'ArrowRight',
  },
  {
    id: 'default-flow',
    name: 'Default Flow',
    connectionType: 'default-flow',
    description: 'Default branch from gateway',
    icon: 'ArrowBigRight',
  },
  {
    id: 'conditional-flow',
    name: 'Conditional Flow',
    connectionType: 'conditional-flow',
    description: 'Conditional branch from activity',
    icon: 'HelpCircle',
  },
  {
    id: 'message-flow',
    name: 'Message Flow',
    connectionType: 'message-flow',
    description: 'Communication across pools',
    icon: 'Mail',
  },
  {
    id: 'association',
    name: 'Association',
    connectionType: 'association',
    description: 'Annotation or data usage',
    icon: 'Slash',
  },
  {
    id: 'data-association',
    name: 'Data Association',
    connectionType: 'data-association',
    description: 'Data movement',
    icon: 'ArrowUpRight',
  },
  {
    id: 'compensation-flow',
    name: 'Compensation',
    connectionType: 'compensation-flow',
    description: 'Compensation handler',
    icon: 'Undo2',
  },
]

const createEventElement = (stage, variant) => {
  const baseName = `${capitalize(stage)} ${variant.label} Event`
  const style = EVENT_STYLES[stage]
  const handlesByStage = {
    start: { incoming: [], outgoing: ALL_SIDES },
    intermediate: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    end: { incoming: ALL_SIDES, outgoing: [] },
  }
  return {
    id: `bpmn-${stage}-${variant.key}-event`,
    name: baseName,
    previewColor: style.borderColor,
    paletteIcon: variant.icon,
    nodeConfig: {
      label: baseName,
      shape: 'circle',
      width: 78,
      height: 78,
      background: style.background,
      borderColor: style.borderColor,
      borderWidth: style.borderWidth,
      innerBorderWidth: style.innerBorderWidth,
      innerBorderColor: style.innerBorderColor,
      textColor: style.textColor,
      showLabelInside: false,
      labelPosition: 'bottom',
      icon: variant.icon,
      iconColor: style.borderColor,
      iconSize: 20,
      handles: handlesByStage[stage] || { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }
}

const buildBpmnGroups = () => {
  const eventGroups = ['start', 'intermediate', 'end'].map((stage) => ({
    title: `${capitalize(stage)} Events`,
    items: EVENT_VARIANTS.map((variant) => createEventElement(stage, variant)),
  }))

  const activities = TASK_VARIANTS.map((task) => ({
    id: `bpmn-${task.id}`,
    name: task.name,
    previewColor: task.color,
    paletteIcon: task.icon,
    nodeConfig: {
      label: task.extra?.label || task.name,
      shape: 'rectangle',
      width: 200,
      height: 96,
      background: '#ffffff',
      borderColor: task.color,
      borderWidth: task.extra?.borderWidth || 2,
      borderStyle: task.extra?.borderStyle || 'solid',
      borderRadius: 18,
      textColor: '#111827',
      icon: task.icon,
      iconColor: task.color,
      padding: 16,
      fontSize: task.extra?.fontSize,
      handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }))

  const gateways = GATEWAYS.map((gateway) => ({
    id: `bpmn-${gateway.id}`,
    name: gateway.name,
    previewColor: gateway.color,
    paletteIcon: gateway.icon,
    nodeConfig: {
      label: gateway.name,
      shape: 'diamond',
      width: 120,
      height: 120,
      background: '#ffffff',
      borderColor: gateway.color,
      borderWidth: 3,
      textColor: gateway.color,
      showLabelInside: false,
      labelPosition: 'bottom',
      icon: gateway.icon,
      iconColor: gateway.color,
      handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }))

  const dataObjects = DATA_OBJECTS.map((dataObject) => ({
    id: `bpmn-${dataObject.id}`,
    name: dataObject.name,
    previewColor: dataObject.color,
    paletteIcon: dataObject.icon,
    nodeConfig: {
      label: dataObject.name,
      shape: dataObject.shape || 'data-object',
      width: dataObject.shape === 'cylinder' ? 160 : 180,
      height: dataObject.shape === 'cylinder' ? 110 : 100,
      background: '#ffffff',
      borderColor: dataObject.color,
      borderWidth: 2,
      textColor: '#111827',
      icon: dataObject.icon,
      iconColor: dataObject.color,
      handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }))

  const artifacts = ARTIFACTS.map((artifact) => ({
    id: `bpmn-${artifact.id}`,
    name: artifact.name,
    previewColor: artifact.color,
    paletteIcon: artifact.icon,
    nodeConfig: {
      label: artifact.name,
      shape: artifact.shape || 'rectangle',
      width: artifact.shape === 'annotation' ? 220 : 260,
      height: artifact.shape === 'annotation' ? 80 : 160,
      background: '#ffffff',
      borderColor: artifact.color,
      borderWidth: artifact.extra?.borderWidth || 2,
      borderStyle: artifact.extra?.borderStyle || 'solid',
      textColor: '#111827',
      icon: artifact.icon,
      iconColor: artifact.color,
      showLabelInside: artifact.shape !== 'annotation',
      labelPosition: artifact.shape === 'annotation' ? 'inside' : 'bottom',
      handles:
        artifact.id === 'group'
          ? { incoming: [], outgoing: [] }
          : { incoming: ALL_SIDES, outgoing: ALL_SIDES },
    },
  }))

  const swimlanes = SWIMLANES.map((lane) => ({
    id: `bpmn-${lane.id}`,
    name: lane.name,
    previewColor: lane.color,
    paletteIcon: lane.icon,
    nodeConfig: {
      label: lane.icon === 'LayoutPanelTop' ? 'Pool' : 'Lane',
      shape: lane.shape,
      background: '#f8fafc',
      borderColor: lane.nodeConfig.borderColor,
      borderWidth: lane.nodeConfig.borderWidth,
      header: lane.nodeConfig.header,
      headerPosition: lane.nodeConfig.headerPosition,
      headerBackground: lane.nodeConfig.headerBackground,
      width: lane.nodeConfig.width,
      height: lane.nodeConfig.height,
      handles: { incoming: [], outgoing: [] },
    },
  }))

  return [
    ...eventGroups,
    {
      title: 'Activities',
      items: activities,
    },
    {
      title: 'Gateways',
      items: gateways,
    },
    {
      title: 'Data & Stores',
      items: dataObjects,
    },
    {
      title: 'Artifacts',
      items: artifacts,
    },
    {
      title: 'Pools & Lanes',
      items: swimlanes,
    },
  ]
}

const buildErdConfiguration = () => {
  const entities = [
    {
      id: 'erd-entity',
      name: 'Entity',
      paletteIcon: 'Square',
      previewColor: '#2563eb',
      nodeConfig: {
        label: 'Entity',
        shape: 'entity',
        width: 240,
        height: 200,
        background: '#ffffff',
        borderColor: '#2563eb',
        borderWidth: 2,
        borderRadius: 12,
        textColor: '#0f172a',
        headerBackground: '#2563eb',
        headerTextColor: '#ffffff',
        attributes: [],
        handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
      },
    },
  ]

  const relationships = [
    {
      id: 'erd-relationship',
      name: 'Relationship',
      paletteIcon: 'Diamond',
      previewColor: '#9333ea',
      nodeConfig: {
        label: 'Relationship',
        shape: 'relationship',
        width: 140,
        height: 140,
        background: '#faf5ff',
        borderColor: '#9333ea',
        borderWidth: 3,
        textColor: '#581c87',
        attributes: [],
        handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
      },
    },
  ]

  const connectors = [
    {
      id: 'erd-one-to-one',
      name: 'One to One (Mandatory)',
      connectionType: 'erd-one-to-one',
      description: 'Exactly one entity on both ends',
      icon: 'Minus',
      data: {
        sourceCardinality: 'one',
        targetCardinality: 'one',
        sourceOptional: false,
        targetOptional: false,
      },
    },
    {
      id: 'erd-one-to-one-optional',
      name: 'One to One (Optional)',
      connectionType: 'erd-one-to-one-optional',
      description: 'One to one with nullable relationship',
      icon: 'Circle',
      data: {
        sourceCardinality: 'one',
        targetCardinality: 'one',
        sourceOptional: true,
        targetOptional: true,
      },
    },
    {
      id: 'erd-one-to-many',
      name: 'One to Many (Mandatory)',
      connectionType: 'erd-one-to-many',
      description: 'One parent with many children',
      icon: 'GitBranch',
      data: {
        sourceCardinality: 'one',
        targetCardinality: 'many',
        sourceOptional: false,
        targetOptional: false,
      },
    },
    {
      id: 'erd-one-to-many-optional',
      name: 'One to Many (Optional)',
      connectionType: 'erd-one-to-many-optional',
      description: 'One to many with nullable relationship',
      icon: 'GitFork',
      data: {
        sourceCardinality: 'one',
        targetCardinality: 'many',
        sourceOptional: true,
        targetOptional: false,
      },
    },
    {
      id: 'erd-many-to-many',
      name: 'Many to Many',
      connectionType: 'erd-many-to-many',
      description: 'Many-to-many relationship',
      icon: 'Network',
      data: {
        sourceCardinality: 'many',
        targetCardinality: 'many',
        sourceOptional: false,
        targetOptional: false,
      },
    },
  ]

  return {
    groups: [
      {
        title: 'Entities',
        items: entities,
      },
      {
        title: 'Relationships',
        items: relationships,
      },
    ],
    connectorsTitle: 'Connection Types',
    connectors,
  }
}

const DiagramPalette = ({ diagramType, selectedConnectionType, onConnectionTypeChange }) => {
  const configuration = useMemo(() => {
    if (diagramType === 'bpmn') {
      return {
        groups: buildBpmnGroups(),
        connectorsTitle: 'Connecting Objects',
        connectors: BPMN_CONNECTORS,
      }
    }

    if (diagramType === 'erd') {
      return buildErdConfiguration()
    }

    const fallbackElements = (() => {
      switch (diagramType) {
        case 'erd':
          return [
            {
              id: 'entity',
              name: 'Entity',
              icon: Square,
              previewColor: '#0ea5e9',
              nodeConfig: {
                shape: 'entity',
                background: '#e0f2fe',
                borderColor: '#0284c7',
                textColor: '#0c4a6e',
                width: 220,
                height: 120,
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
            {
              id: 'attribute',
              name: 'Attribute',
              icon: Circle,
              previewColor: '#22c55e',
              nodeConfig: {
                shape: 'circle',
                background: '#bbf7d0',
                borderColor: '#15803d',
                textColor: '#14532d',
                width: 120,
                height: 120,
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
            {
              id: 'relationship',
              name: 'Relationship',
              icon: Triangle,
              previewColor: '#a855f7',
              nodeConfig: {
                shape: 'diamond',
                background: '#e9d5ff',
                borderColor: '#9333ea',
                textColor: '#581c87',
                width: 130,
                height: 130,
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
            {
              id: 'primary-key',
              name: 'Primary Key',
              icon: Circle,
              previewColor: '#f97316',
              nodeConfig: {
                shape: 'circle',
                background: '#fed7aa',
                borderColor: '#ea580c',
                textColor: '#7c2d12',
                width: 110,
                height: 110,
                decoration: 'underline',
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
            {
              id: 'foreign-key',
              name: 'Foreign Key',
              icon: Circle,
              previewColor: '#facc15',
              nodeConfig: {
                shape: 'circle',
                background: '#fef08a',
                borderColor: '#eab308',
                textColor: '#713f12',
                width: 110,
                height: 110,
                decoration: 'dashed',
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
          ]
        case 'dfd':
          return [
            {
              id: 'process',
              name: 'Process',
              icon: Circle,
              previewColor: '#2563eb',
              nodeConfig: {
                shape: 'circle',
                background: '#bfdbfe',
                borderColor: '#1d4ed8',
                textColor: '#1e3a8a',
                width: 130,
                height: 130,
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
            {
              id: 'data-store',
              name: 'Data Store',
              icon: Database,
              previewColor: '#14b8a6',
              nodeConfig: {
                shape: 'cylinder',
                background: '#ccfbf1',
                borderColor: '#0f766e',
                textColor: '#115e59',
                width: 180,
                height: 110,
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
            {
              id: 'external-entity',
              name: 'External Entity',
              icon: Square,
              previewColor: '#f472b6',
              nodeConfig: {
                shape: 'rectangle',
                background: '#fdf2f8',
                borderColor: '#db2777',
                textColor: '#831843',
                width: 200,
                height: 90,
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
            {
              id: 'data-flow',
              name: 'Data Flow',
              icon: ArrowRight,
              previewColor: '#4b5563',
              nodeConfig: {
                shape: 'parallelogram',
                background: '#d1d5db',
                borderColor: '#1f2937',
                textColor: '#111827',
                width: 220,
                height: 60,
                handles: { incoming: ALL_SIDES, outgoing: ALL_SIDES },
              },
            },
          ]
        default:
          return []
      }
    })()

    return {
      groups: [
        {
          title: `${diagramType?.toUpperCase()} Elements`,
          items: fallbackElements,
        },
      ],
      connectors: [],
      connectorsTitle: null,
    }
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
    () =>
      [
        configuration.groups.map((group) => group.title).join('|'),
        configuration.connectorsTitle || '',
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
    setCollapsedGroups((prev) => ({
      ...prev,
      [title]: !prev?.[title],
    }))
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
        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
          isSelected
            ? 'border-primary-500 bg-primary-50 text-primary-700'
            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-8 h-8 rounded flex items-center justify-center ${
              isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {connectorIcon ? (
              React.createElement(connectorIcon, { className: 'h-4 w-4' })
            ) : (
              <FallbackIcon className="h-4 w-4" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold">{connector.name}</div>
            <div className="text-xs text-gray-500">{connector.description}</div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium text-gray-900">
          {diagramType.toUpperCase()} Elements
        </h2>
        <p className="text-sm text-gray-500">
          Drag nodes or select connection type below
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {configuration.groups.map((group) => {
          const isCollapsed = collapsedGroups[group.title]

          return (
            <div key={group.title} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {group.title}
                </h3>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </div>
              {!isCollapsed && (
                <div className="space-y-2">
                  {group.items.map((element) => {
                    const iconName = element.paletteIcon
                    const IconComponent = element.icon
                      ? element.icon
                      : iconName && Icons[iconName]
                        ? Icons[iconName]
                        : Square
                    return (
                      <div
                        key={element.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, element)}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-move transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white"
                          style={{ backgroundColor: element.previewColor || '#64748b' }}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {element.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {configuration.connectors && configuration.connectors.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {configuration.connectorsTitle || 'Connectors'}
              </h3>
              <button
                type="button"
                onClick={() => toggleGroup(configuration.connectorsTitle || 'Connectors')}
                className="text-gray-500 hover:text-gray-700"
                aria-label={
                  collapsedGroups[configuration.connectorsTitle || 'Connectors']
                    ? 'Expand connectors'
                    : 'Collapse connectors'
                }
              >
                {collapsedGroups[configuration.connectorsTitle || 'Connectors'] ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
            {!collapsedGroups[configuration.connectorsTitle || 'Connectors'] && (
              <div className="space-y-2">
                {configuration.connectors.map(renderConnector)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-gray-50">
        <div className="text-xs text-gray-500">
          <p>💡 Tip: Drag nodes onto the canvas or select a connector before drawing an edge.</p>
        </div>
      </div>
    </div>
  )
}

export default DiagramPalette
