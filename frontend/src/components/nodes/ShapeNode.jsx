import React, { useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import * as Icons from 'lucide-react'
import { ExternalLink, Link2, Layers, Code, Database, Key } from 'lucide-react'

const DEFAULT_TEXT_STYLES = {
  fontWeight: 600,
  fontSize: 13,
  lineHeight: '1.2',
  textAlign: 'center',
}

const ALL_HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

// Стили и иконки для типов связей
const LINK_TYPE_CONFIG = {
  reference: { 
    bg: 'bg-gray-500', 
    hoverBg: 'hover:bg-gray-600', 
    activeBg: 'active:bg-gray-700',
    borderColor: 'border-gray-400',
    icon: Link2,
    label: 'Ссылка'
  },
  decomposition: { 
    bg: 'bg-green-500', 
    hoverBg: 'hover:bg-green-600', 
    activeBg: 'active:bg-green-700',
    borderColor: 'border-green-400',
    icon: Layers,
    label: 'Декомпозиция'
  },
  implementation: { 
    bg: 'bg-blue-500', 
    hoverBg: 'hover:bg-blue-600', 
    activeBg: 'active:bg-blue-700',
    borderColor: 'border-blue-400',
    icon: Code,
    label: 'Реализация'
  },
  data_source: { 
    bg: 'bg-amber-500', 
    hoverBg: 'hover:bg-amber-600', 
    activeBg: 'active:bg-amber-700',
    borderColor: 'border-amber-400',
    icon: Database,
    label: 'Источник данных'
  },
}

const normalizePosition = (value) => {
  if (!value) return null
  const lookup = String(value).toLowerCase()
  switch (lookup) {
    case 'top': return Position.Top
    case 'right': return Position.Right
    case 'bottom': return Position.Bottom
    case 'left': return Position.Left
    default: return null
  }
}

const parseHandlePositions = (values) => {
  if (!Array.isArray(values)) return null
  const normalized = values.map(normalizePosition).filter((position) => position !== null)
  return [...new Set(normalized)]
}

const ShapeNode = ({ data = {} }) => {
  const {
    label = 'Element',
    shape = 'rectangle',
    background = '#ffffff',
    borderColor = '#1f2937',
    textColor = '#111827',
    width = 160,
    height = 80,
    borderRadius = 12,
    borderWidth = 2,
    borderStyle = 'solid',
    borderDash,
    innerBorderWidth,
    innerBorderColor,
    showLabelInside = true,
    labelPosition = 'inside',
    fontSize,
    fontWeight,
    icon,
    iconColor,
    iconSize = 20,
    iconPosition = 'top',
    padding = 12,
    header,
    headerPosition = 'top',
    headerBackground = '#e2e8f0',
    headerTextColor = '#0f172a',
    decoration,
    // Link-related props
    linkedDiagram,
    linkedDiagramName,
    linkedDiagramType,
    linkedDiagramProject,
    linkCount = 0,
    allLinks = [],
    // Highlight state
    isHighlighted = false,
  } = data

  const hasLink = Boolean(linkedDiagram)
  
  // Получить первичный тип связи (или смешанный если разные)
  const primaryLinkType = useMemo(() => {
    if (!allLinks || allLinks.length === 0) return 'reference'
    const types = [...new Set(allLinks.map(l => l.link_type))]
    if (types.length === 1) return types[0]
    // Если есть разные типы, показываем первый
    return allLinks[0].link_type || 'reference'
  }, [allLinks])

  const linkConfig = LINK_TYPE_CONFIG[primaryLinkType] || LINK_TYPE_CONFIG.reference

  // Handle badge click - dispatch custom event for navigation
  const handleBadgeClick = (e) => {
    e.stopPropagation()
    if (linkedDiagram) {
      window.dispatchEvent(new CustomEvent('navigate-to-diagram', {
        detail: { diagramId: linkedDiagram, projectId: linkedDiagramProject }
      }))
    }
  }

  const IconComponent = useMemo(() => {
    if (!icon) return null
    const iconName = icon in Icons ? icon : null
    return iconName ? Icons[iconName] : null
  }, [icon])

  const handlesConfig = useMemo(() => {
    const incoming = parseHandlePositions(data.handles?.incoming)
    const outgoing = parseHandlePositions(data.handles?.outgoing)
    return {
      incoming: incoming ?? ALL_HANDLE_POSITIONS,
      outgoing: outgoing ?? ALL_HANDLE_POSITIONS,
    }
  }, [data.handles])

  const handleDefinitions = useMemo(() => {
    const definitions = []
    handlesConfig.incoming.forEach((position) => definitions.push({ type: 'target', position }))
    handlesConfig.outgoing.forEach((position) => definitions.push({ type: 'source', position }))
    return definitions
  }, [handlesConfig])

  const baseTextStyles = {
    ...DEFAULT_TEXT_STYLES,
    color: textColor,
    fontSize: fontSize || 13,
    fontWeight: fontWeight || 600,
  }

  const renderIcon = (sizeOverride) => {
    if (!IconComponent) return null
    return <IconComponent size={sizeOverride || iconSize} strokeWidth={2} style={{ color: iconColor || textColor }} />
  }

  const renderLabel = (position = 'bottom') => (
    <span style={{ ...baseTextStyles, marginTop: position === 'bottom' ? 8 : 0 }}>
      {label}
    </span>
  )

  const renderContentInner = () => (
    <div className="flex flex-col items-center justify-center" style={{ gap: showLabelInside && icon ? 4 : 0 }}>
      {icon && iconPosition !== 'bottom' && renderIcon()}
      {showLabelInside && <span style={baseTextStyles}>{label}</span>}
      {icon && iconPosition === 'bottom' && renderIcon()}
    </div>
  )

  // Helper to render type with size
  const renderTypeWithSize = (attr) => {
    const type = attr.type || 'VARCHAR'
    // Show size for types that typically have it
    if (attr.size) {
      return `${type}(${attr.size})`
    }
    return type
  }

  // --- RENDERERS ---

  const renderRectangle = () => (
    <div className="flex flex-col" style={{ width, minHeight: height }}>
      <div
        className="flex-1 flex flex-col"
        style={{
          backgroundColor: background,
          borderColor,
          borderStyle,
          borderWidth,
          borderRadius,
          overflow: 'hidden',
        }}
      >
        {/* Support for ERD Header style entities */}
        {shape === 'entity' && (
          <div 
            className="px-3 py-2 text-sm font-bold tracking-wide flex items-center justify-between" 
            style={{ backgroundColor: borderColor, color: '#fff' }}
          >
            <span className="truncate">{label}</span>
            <Database className="w-4 h-4 opacity-70 flex-shrink-0" />
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          {shape === 'entity' ? (
            <div className="w-full">
              {/* Attributes list */}
              {data.attributes?.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {data.attributes.map((attr, i) => {
                    const attrName = typeof attr === 'string' ? attr : attr.name
                    const isPrimary = typeof attr === 'object' && attr.primary
                    const isForeignKey = typeof attr === 'object' && attr.foreignKey
                    const isUnique = typeof attr === 'object' && attr.unique && !isPrimary
                    const isNullable = typeof attr === 'object' ? attr.nullable : true
                    const attrType = typeof attr === 'object' ? renderTypeWithSize(attr) : ''
                    
                    return (
                      <div 
                        key={i} 
                        className={`px-3 py-1.5 flex items-center gap-2 text-sm ${
                          isPrimary ? 'bg-amber-50' : isForeignKey ? 'bg-blue-50' : ''
                        }`}
                      >
                        {/* Key indicators */}
                        <div className="flex items-center gap-0.5 w-8 flex-shrink-0">
                          {isPrimary && (
                            <Key className="w-3.5 h-3.5 text-amber-500" title="Primary Key" />
                          )}
                          {isForeignKey && (
                            <Link2 className="w-3.5 h-3.5 text-blue-500" title={`FK → ${attr.foreignKey.entityName}.${attr.foreignKey.attributeName}`} />
                          )}
                        </div>
                        
                        {/* Attribute name */}
                        <span className={`flex-1 truncate ${
                          isPrimary ? 'font-bold text-amber-800 underline decoration-amber-400' : 
                          isForeignKey ? 'font-medium text-blue-700' : 
                          'text-gray-800'
                        }`}>
                          {attrName}
                        </span>
                        
                        {/* Type */}
                        {attrType && (
                          <span className="text-xs font-mono text-gray-400 flex-shrink-0">
                            {attrType}
                          </span>
                        )}
                        
                        {/* Constraints badges */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isUnique && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-600 font-bold">
                              UQ
                            </span>
                          )}
                          {typeof attr === 'object' && attr.nullable === false && !isPrimary && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-bold">
                              NN
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic text-center py-4 px-2">
                  Двойной клик или ПКМ для добавления атрибутов
                </div>
              )}
            </div>
          ) : (
            <div className="p-2">
              {renderContentInner()}
            </div>
          )}
        </div>
      </div>
      {!showLabelInside && labelPosition === 'bottom' && renderLabel('bottom')}
    </div>
  )

  const renderCircle = () => {
    const size = Math.max(width, height)
    const hasInner = data.hasInnerCircle
    const innerSize = size - 8 // Inner circle is 8px smaller (4px gap on each side)
    
    return (
      <div className="flex flex-col items-center">
        <div 
          className="flex items-center justify-center relative" 
          style={{ 
            width: size, height: size, 
            backgroundColor: background, borderColor, borderStyle, borderWidth, 
            borderRadius: '50%' 
          }}
        >
          {/* Inner circle for events */}
          {hasInner && (
            <div 
              className="absolute"
              style={{
                width: innerSize,
                height: innerSize,
                borderRadius: '50%',
                border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                backgroundColor: 'transparent',
              }}
            />
          )}
          {renderContentInner()}
        </div>
        {!showLabelInside && labelPosition === 'bottom' && renderLabel('bottom')}
      </div>
    )
  }

  // DFD Data Store: Две горизонтальные линии (сверху и снизу), боков нет.
  const renderDataStore = () => (
    <div className="flex flex-col items-center justify-center" style={{ width, height }}>
        <div 
            className="flex items-center justify-center w-full h-full relative"
            style={{
                backgroundColor: 'transparent', // Usually transparent or white
                borderTop: `${borderWidth}px solid ${borderColor}`,
                borderBottom: `${borderWidth}px solid ${borderColor}`,
                color: textColor
            }}
        >
            <span style={{...baseTextStyles}}>{label}</span>
        </div>
    </div>
  )

  const renderByShape = () => {
    switch (shape) {
      case 'circle': return renderCircle()
      case 'data-store': return renderDataStore() // DFD Specific
      case 'entity': return renderRectangle() // ERD Entity reuse rectangle logic
      case 'rectangle': default: return renderRectangle()
    }
  }

  const getHandleStyle = (position) => {
    const isCircular = ['circle'].includes(shape)
    const base = {
      width: 10, height: 10,
      background: 'transparent', border: 'none',
      zIndex: 10
    }
    
    // Positioning tweaks
    if (position === Position.Top) return { ...base, top: -5, left: '50%', transform: 'translateX(-50%)' }
    if (position === Position.Right) return { ...base, right: -5, top: '50%', transform: 'translateY(-50%)' }
    if (position === Position.Bottom) return { ...base, bottom: -5, left: '50%', transform: 'translateX(-50%)' }
    if (position === Position.Left) return { ...base, left: -5, top: '50%', transform: 'translateY(-50%)' }
    return base
  }

  // Link indicator badge - with type-based styling
  const renderLinkBadge = () => {
    if (!hasLink) return null
    
    const displayCount = linkCount > 1
    const LinkIcon = linkConfig.icon
    
    // Формируем подсказку с информацией о типе связи
    const tooltipText = linkCount > 1 
      ? `${linkCount} связей (${linkConfig.label}) • клик для перехода, ПКМ для списка`
      : `${linkConfig.label} → ${linkedDiagramName}`
    
    return (
      <div 
        onClick={handleBadgeClick}
        className={`absolute -top-2 -right-2 z-20 flex items-center justify-center ${linkConfig.bg} ${linkConfig.hoverBg} ${linkConfig.activeBg} border-2 border-white rounded cursor-pointer group/badge transition-all`}
        style={{ 
          minWidth: 22, 
          height: 22,
          padding: displayCount ? '0 5px' : 0
        }}
        title={tooltipText}
      >
        {displayCount ? (
          <span className="text-white text-xs font-bold">{linkCount}</span>
        ) : (
          <LinkIcon className="w-3 h-3 text-white" />
        )}
        {/* Tooltip on hover */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none z-30">
          {tooltipText}
        </div>
      </div>
    )
  }

  // Получить цвет рамки в зависимости от типа связи
  const getLinkBorderColor = () => {
    if (!hasLink) return null
    const colorMap = {
      reference: '#6b7280',      // gray-500
      decomposition: '#22c55e',  // green-500
      implementation: '#3b82f6', // blue-500
      data_source: '#f59e0b',    // amber-500
    }
    return colorMap[primaryLinkType] || colorMap.reference
  }

  return (
    <div className={`relative group ${hasLink ? 'cursor-pointer' : ''} ${isHighlighted ? 'animate-pulse' : ''}`}>
      {handleDefinitions.map((handle, index) => (
        <Handle
          key={`${handle.type}-${handle.position}-${index}`}
          id={`${handle.type}-${handle.position}`}
          type={handle.type}
          position={handle.position}
          style={getHandleStyle(handle.position)}
          isConnectable={true}
        />
      ))}
      {renderByShape()}
      {renderLinkBadge()}
      
      {/* Selection/link indicator border for linked nodes - color based on link type */}
      {hasLink && !isHighlighted && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: shape === 'circle' ? '50%' : borderRadius,
            border: `2px solid ${getLinkBorderColor()}`,
            opacity: 0.7,
          }}
        />
      )}
      
      {/* Highlight border for navigation target */}
      {isHighlighted && (
        <div 
          className="absolute -inset-1 pointer-events-none animate-pulse"
          style={{
            borderRadius: shape === 'circle' ? '50%' : borderRadius + 4,
            border: '3px solid #f59e0b',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.5)',
          }}
        />
      )}
    </div>
  )
}

export default ShapeNode
