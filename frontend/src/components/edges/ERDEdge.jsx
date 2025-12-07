import React from 'react'
import { BaseEdge, EdgeLabelRenderer, getStraightPath } from 'reactflow'

// Размер маркера (символа)
const MARKER_SIZE = 14

/**
 * Рисует символ ER (Crow's Foot).
 * 0,0 - это точка касания с узлом (Entity).
 * Ось X идет ОТ узла ВДОЛЬ линии.
 */
const ERDMarkerSymbol = ({ cardinality, optional }) => {
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
}) => {
  // 1. Вычисляем путь линии
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  // 2. Вычисляем угол наклона линии
  // angle - это угол вектора от Source к Target
  const angle = Math.atan2(targetY - sourceY, targetX - sourceX) * (180 / Math.PI)

  // 3. Получаем данные о кардинальности
  const sourceCardinality = data?.sourceCardinality || 'one'
  const sourceOptional = data?.sourceOptional || false
  
  const targetCardinality = data?.targetCardinality || 'many'
  const targetOptional = data?.targetOptional || false

  const edgeColor = style.stroke || '#000'

  // Стили для метки
  const computedLabelStyle = {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'auto',
    fontSize: '12px',
    fontWeight: 600,
    background: labelShowBg ? (labelBgStyle?.fill || 'rgba(255, 255, 255, 0.9)') : 'transparent',
    padding: labelShowBg ? '4px 8px' : 0,
    borderRadius: labelBgBorderRadius || 4,
    ...labelStyle,
  }

  return (
    <>
      {/* Сама линия. Рисуем её чуть короче визуально, чтобы она не перекрывала маркеры, 
          но BaseEdge рисует полный путь. Маркеры лягут сверху. */}
      <BaseEdge path={edgePath} style={{ ...style, strokeWidth: 2 }} />

      {/* --- SOURCE MARKER --- */}
      {/* Угол angle смотрит от Source к Target. 
          Нам нужно, чтобы ось X маркера шла ОТ Source ВДОЛЬ линии. 
          Это как раз совпадает с направлением angle. */}
      <g
        transform={`translate(${sourceX}, ${sourceY}) rotate(${angle})`}
        style={{ color: edgeColor }}
      >
        <ERDMarkerSymbol 
            cardinality={sourceCardinality} 
            optional={sourceOptional} 
        />
      </g>

      {/* --- TARGET MARKER --- */}
      {/* Угол angle смотрит В Target. 
          Нам нужно, чтобы ось X маркера шла ОТ Target ВДОЛЬ линии (обратно к Source).
          Поэтому поворачиваем на angle + 180. */}
      <g
        transform={`translate(${targetX}, ${targetY}) rotate(${angle + 180})`}
        style={{ color: edgeColor }}
      >
        <ERDMarkerSymbol 
            cardinality={targetCardinality} 
            optional={targetOptional} 
        />
      </g>

      {/* Текстовая метка */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              ...computedLabelStyle,
              left: labelX,
              top: labelY,
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default ERDEdge