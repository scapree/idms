import React, { useMemo } from 'react'
import { Handle, Position } from 'reactflow'
import * as Icons from 'lucide-react'

const DEFAULT_TEXT_STYLES = {
  fontWeight: 600,
  fontSize: 13,
  lineHeight: '1.2',
  textAlign: 'center',
}

const ALL_HANDLE_POSITIONS = [Position.Top, Position.Right, Position.Bottom, Position.Left]

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
  } = data

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
             <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: borderColor, color: '#fff' }}>
                {label}
             </div>
        )}
        <div className="flex-1 flex items-center justify-center p-2">
            {shape === 'entity' ? (
                <div className="w-full space-y-1">
                    {data.attributes?.map((attr, i) => (
                        <div key={i} className="text-sm border-b last:border-0 border-gray-100 py-1 flex justify-between">
                            <span className={attr.primary ? "font-bold underline" : ""}>{attr.name}</span>
                            {attr.primary && <span className="text-xs text-orange-500 font-bold">PK</span>}
                        </div>
                    ))}
                    {(!data.attributes || data.attributes.length === 0) && (
                        <div className="text-xs text-gray-400 italic text-center">Right-click to add</div>
                    )}
                </div>
            ) : (
                renderContentInner()
            )}
        </div>
      </div>
      {!showLabelInside && labelPosition === 'bottom' && renderLabel('bottom')}
    </div>
  )

  const renderCircle = () => {
    const size = Math.max(width, height)
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center" style={{ 
          width: size, height: size, 
          backgroundColor: background, borderColor, borderStyle, borderWidth, 
          borderRadius: '50%' 
        }}>
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

  return (
    <div className="relative group">
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
    </div>
  )
}

export default ShapeNode