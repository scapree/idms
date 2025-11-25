import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getStraightPath } from 'reactflow'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const toDegrees = (radians) => (radians * 180) / Math.PI

const getPointAlongLine = (fromX, fromY, toX, toY, distance) => {
  const dx = toX - fromX
  const dy = toY - fromY
  const length = Math.sqrt(dx * dx + dy * dy) || 1

  return {
    x: fromX + (dx / length) * distance,
    y: fromY + (dy / length) * distance,
  }
}

const renderCrowsFootSymbol = (cardinality, optional, color, strokeWidth) => {
  const effectiveStroke = strokeWidth || 2.2
  const elements = []

  // Crow's foot notation:
  // - Line (|): One (mandatory)
  // - Circle (O): Zero/Optional
  // - Crow's foot (<): Many

  if (optional) {
    // Draw circle for optional/nullable
    elements.push(
      <circle
        key="circle"
        cx="10"
        cy="12"
        r="5"
        stroke={color}
        strokeWidth={effectiveStroke - 0.6}
        fill="none"
      />
    )
  }

  if (cardinality === 'one') {
    // Draw single line for "one"
    const x = optional ? 20 : 18
    elements.push(
      <line
        key="one-line"
        x1={x}
        y1="2"
        x2={x}
        y2="22"
        stroke={color}
        strokeWidth={effectiveStroke}
        strokeLinecap="round"
      />
    )
  } else if (cardinality === 'many') {
    // Draw crow's foot for "many"
    const baseX = optional ? 18 : 16
    elements.push(
      <g key="crows-foot">
        <path
          d={`M${baseX} 12 L${baseX + 14} 2`}
          stroke={color}
          strokeWidth={effectiveStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d={`M${baseX} 12 L${baseX + 14} 22`}
          stroke={color}
          strokeWidth={effectiveStroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line
          x1={baseX}
          y1="12"
          x2={baseX + 16}
          y2="12"
          stroke={color}
          strokeWidth={effectiveStroke}
          strokeLinecap="round"
        />
      </g>
    )
  }

  return <>{elements}</>
}

const CardinalityMarker = ({ x, y, angle, cardinality, optional, color, strokeWidth }) => {
  if (!cardinality) {
    return null
  }

  return (
    <EdgeLabelRenderer>
      <div
        className="pointer-events-none"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          transformOrigin: 'center',
          width: 40,
          height: 24,
        }}
      >
        <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
          {renderCrowsFootSymbol(cardinality, optional, color, strokeWidth)}
        </svg>
      </div>
    </EdgeLabelRenderer>
  )
}

const ERDEdge = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data = {},
    markerStart,
    markerEnd,
    selected,
    label,
    labelStyle,
    labelShowBg = true,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
  } = props

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  const strokeColor = style.stroke || '#0f172a'
  const baseStrokeWidth = style.strokeWidth || 2.2
  const effectiveStrokeWidth = selected ? baseStrokeWidth + 0.6 : baseStrokeWidth
  const edgeStyle = {
    ...style,
    stroke: strokeColor,
    strokeWidth: effectiveStrokeWidth,
  }

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const length = Math.sqrt(dx * dx + dy * dy) || 1
  const offset = clamp(length * 0.18, 18, 42)

  const sourcePoint = getPointAlongLine(sourceX, sourceY, targetX, targetY, offset)
  const targetPoint = getPointAlongLine(targetX, targetY, sourceX, sourceY, offset)
  const sourceAngle = toDegrees(Math.atan2(targetY - sourceY, targetX - sourceX))
  const targetAngle = toDegrees(Math.atan2(sourceY - targetY, sourceX - targetX))

  // New crow's foot notation properties
  const sourceCardinality = data?.sourceCardinality || 'one'
  const targetCardinality = data?.targetCardinality || 'many'
  const sourceOptional = data?.sourceOptional || false
  const targetOptional = data?.targetOptional || false
  const symbolColor = data?.symbolColor || strokeColor

  const showLabel = label !== undefined && label !== null && String(label).length > 0

  const resolvedLabelBgPadding = Array.isArray(labelBgPadding)
    ? labelBgPadding
    : [8, 4]

  const computedLabelStyle = {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'auto',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    color: labelStyle?.color || labelBgStyle?.color || symbolColor,
    ...labelStyle,
  }

  if (labelShowBg !== false) {
    computedLabelStyle.background = labelBgStyle?.fill || 'rgba(255, 255, 255, 0.95)'
    computedLabelStyle.boxShadow = labelBgStyle?.boxShadow || '0 1px 3px rgba(15, 23, 42, 0.18)'
    const [padX = 8, padY = 4] = resolvedLabelBgPadding
    computedLabelStyle.padding = `${padY}px ${padX}px`
    computedLabelStyle.borderRadius = labelBgBorderRadius ?? 6
  }

  if (labelBgStyle) {
    Object.assign(computedLabelStyle, labelBgStyle)
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={edgeStyle}
      />

      <CardinalityMarker
        x={sourcePoint.x}
        y={sourcePoint.y}
        angle={sourceAngle}
        cardinality={sourceCardinality}
        optional={sourceOptional}
        color={symbolColor}
        strokeWidth={effectiveStrokeWidth}
      />
      <CardinalityMarker
        x={targetPoint.x}
        y={targetPoint.y}
        angle={targetAngle}
        cardinality={targetCardinality}
        optional={targetOptional}
        color={symbolColor}
        strokeWidth={effectiveStrokeWidth}
      />

      {showLabel && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              ...computedLabelStyle,
              left: labelX,
              top: labelY,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default ERDEdge


