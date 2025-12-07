import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getStraightPath, getBezierPath, getSmoothStepPath } from 'reactflow'

// Размер маркера (символа)
const MARKER_SIZE = 14

/**
 * Рисует символ ER (Crow's Foot).
 * 0,0 - это точка касания с узлом (Entity).
 * Ось X идет ОТ узла ВДОЛЬ линии.
 */
const ERDMarkerSymbol = ({ cardinality, optional, isIdentifying }) => {
  const strokeColor = 'currentColor'
  const strokeWidth = 2

  return (
    <g>
      {/* 1. Основная часть кардинальности (One или Many) */}
      {cardinality === 'many' ? (
        // Лапка вороны (<).
        // Открытая часть (концы) находятся на x=0 (у границы узла).
        // Сходятся в точку на x=MARKER_SIZE (в сторону линии).
        <>
          <path
            d={`M0,-7 L${MARKER_SIZE},0 L0,7`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Центральная линия, чтобы соединить острие с основной линией */}
          <line
            x1={0}
            y1={0}
            x2={MARKER_SIZE}
            y2={0}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
          />
        </>
      ) : (
        // One (прямая черта |)
        // Рисуем перпендикулярную линию рядом с узлом
        <line
          x1={2}
          y1={-7}
          x2={2}
          y2={7}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}

      {/* 2. Часть опциональности (Optional O или Mandatory |) - рисуется чуть дальше от узла */}
      {optional ? (
        // Кружок (O)
        <circle
          cx={MARKER_SIZE + 4} // Смещаем дальше по линии
          cy={0}
          r={4}
          fill="white"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      ) : (
        // Mandatory (вторая черта |)
        <line
          x1={MARKER_SIZE + 2}
          y1={-7}
          x2={MARKER_SIZE + 2}
          y2={7}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

/**
 * Получить путь в зависимости от типа
 */
const getPathByType = (pathType, params) => {
  switch (pathType) {
    case 'bezier':
      return getBezierPath(params)
    case 'smoothstep':
      return getSmoothStepPath(params)
    case 'straight':
    default:
      return getStraightPath(params)
  }
}

const ERDEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style = {},
  data,
  label,
  labelStyle,
  labelShowBg = true,
  labelBgStyle,
  labelBgBorderRadius,
  selected,
}) => {
  // Получаем настройки из data
  const pathType = data?.pathType || 'straight' // 'straight', 'bezier', 'smoothstep'
  const isIdentifying = data?.isIdentifying ?? true // true = solid, false = dashed
  const relationshipName = data?.relationshipName || label || ''
  const roleName = data?.roleName || ''
  
  // 1. Вычисляем путь линии
  const pathParams = {
    sourceX,
    sourceY,
    targetX,
    targetY,
  }
  
  const [edgePath, labelX, labelY] = getPathByType(pathType, pathParams)

  // 2. Вычисляем угол наклона линии
  // angle - это угол вектора от Source к Target
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * (180 / Math.PI)

  // 3. Получаем данные о кардинальности
  const sourceCardinality = data?.sourceCardinality || 'one'
  const sourceOptional = data?.sourceOptional || false
  
  const targetCardinality = data?.targetCardinality || 'many'
  const targetOptional = data?.targetOptional || false

  // Цвет линии
  const defaultColor = isIdentifying ? '#1f2937' : '#6b7280'
  const edgeColor = style.stroke || defaultColor
  const strokeWidth = style.strokeWidth || 2
  
  // Стиль линии (пунктир для non-identifying)
  const strokeDasharray = isIdentifying ? undefined : '8,4'
  
  // Стиль для выделенной связи
  const selectedStyle = selected ? {
    filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))',
  } : {}

  // Стили для метки
  const computedLabelStyle = {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'auto',
    fontSize: '11px',
    fontWeight: 500,
    background: labelShowBg ? (labelBgStyle?.fill || 'rgba(255, 255, 255, 0.95)') : 'transparent',
    padding: labelShowBg ? '3px 8px' : 0,
    borderRadius: labelBgBorderRadius || 4,
    border: labelShowBg ? '1px solid #e5e7eb' : 'none',
    boxShadow: labelShowBg ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
    color: '#374151',
    ...labelStyle,
  }

  // Вычисляем позицию для роли (чуть выше основной метки)
  const roleOffset = relationshipName ? -16 : 0

  return (
    <>
      {/* Сама линия */}
      <BaseEdge 
        path={edgePath} 
        style={{ 
          ...style, 
          stroke: edgeColor,
          strokeWidth,
          strokeDasharray,
          ...selectedStyle,
        }} 
      />
      
      {/* Невидимая толстая линия для лучшего hover/click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />

      {/* --- SOURCE MARKER --- */}
      <g
        transform={`translate(${sourceX}, ${sourceY}) rotate(${angle})`}
        style={{ color: edgeColor }}
      >
        <ERDMarkerSymbol 
          cardinality={sourceCardinality} 
          optional={sourceOptional}
          isIdentifying={isIdentifying}
        />
      </g>

      {/* --- TARGET MARKER --- */}
      <g
        transform={`translate(${targetX}, ${targetY}) rotate(${angle + 180})`}
        style={{ color: edgeColor }}
      >
        <ERDMarkerSymbol 
          cardinality={targetCardinality} 
          optional={targetOptional}
          isIdentifying={isIdentifying}
        />
      </g>

      {/* Метки связи */}
      <EdgeLabelRenderer>
        {/* Имя роли (если есть) */}
        {roleName && (
          <div
            style={{
              ...computedLabelStyle,
              left: labelX,
              top: labelY + roleOffset,
              fontSize: '10px',
              color: '#6b7280',
              fontStyle: 'italic',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '2px 6px',
            }}
            className="nodrag nopan"
          >
            {roleName}
          </div>
        )}
        
        {/* Имя связи / кардинальность */}
        {(relationshipName || data?.showCardinality) && (
          <div
            style={{
              ...computedLabelStyle,
              left: labelX,
              top: labelY,
            }}
            className="nodrag nopan"
          >
            {relationshipName || `${sourceCardinality === 'many' ? 'N' : '1'}:${targetCardinality === 'many' ? 'N' : '1'}`}
          </div>
        )}
        
        {/* Индикатор типа связи (identifying/non-identifying) */}
        {!isIdentifying && !relationshipName && (
          <div
            style={{
              position: 'absolute',
              left: labelX,
              top: labelY + 12,
              transform: 'translate(-50%, -50%)',
              fontSize: '9px',
              color: '#9ca3af',
              fontStyle: 'italic',
            }}
            className="nodrag nopan"
          >
            non-identifying
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}

export default ERDEdge
