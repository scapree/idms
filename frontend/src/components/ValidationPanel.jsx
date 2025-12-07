import React, { useState, useMemo } from 'react'
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle,
  Shield
} from 'lucide-react'
import { validateDiagram, SEVERITY } from '../utils/diagramValidators'

/**
 * Компонент панели валидации диаграммы
 * Показывает ошибки, предупреждения и информацию о диаграмме
 */
const ValidationPanel = ({ 
  diagramType, 
  nodes, 
  edges, 
  onIssueClick,
  className = '' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filterSeverity, setFilterSeverity] = useState(null) // null = все

  // Выполняем валидацию
  const validationResult = useMemo(() => {
    return validateDiagram(diagramType, nodes, edges)
  }, [diagramType, nodes, edges])

  const { errors, warnings, infos, isValid, hasIssues } = validationResult

  // Фильтрация issues
  const filteredIssues = useMemo(() => {
    if (!filterSeverity) return validationResult.issues
    return validationResult.issues.filter(i => i.severity === filterSeverity)
  }, [validationResult.issues, filterSeverity])

  // Иконка и цвет для severity
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case SEVERITY.ERROR:
        return { 
          icon: XCircle, 
          bgColor: 'bg-red-50', 
          textColor: 'text-red-700',
          borderColor: 'border-red-200',
          iconColor: 'text-red-500'
        }
      case SEVERITY.WARNING:
        return { 
          icon: AlertTriangle, 
          bgColor: 'bg-amber-50', 
          textColor: 'text-amber-700',
          borderColor: 'border-amber-200',
          iconColor: 'text-amber-500'
        }
      case SEVERITY.INFO:
        return { 
          icon: Info, 
          bgColor: 'bg-blue-50', 
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-500'
        }
      default:
        return { 
          icon: Info, 
          bgColor: 'bg-gray-50', 
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-500'
        }
    }
  }

  // Если диаграмма пуста или нет данных для валидации
  if (!nodes || nodes.length === 0) {
    return null
  }

  // Компактный режим (свёрнутый)
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-md ${className} ${
          isValid 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : errors.length > 0 
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}
        title="Показать результаты валидации"
      >
        {isValid ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Диаграмма корректна</span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">
              {errors.length > 0 && <span className="text-red-600">{errors.length} ош.</span>}
              {errors.length > 0 && warnings.length > 0 && ' • '}
              {warnings.length > 0 && <span className="text-amber-600">{warnings.length} пред.</span>}
              {(errors.length > 0 || warnings.length > 0) && infos.length > 0 && ' • '}
              {infos.length > 0 && errors.length === 0 && warnings.length === 0 && (
                <span className="text-blue-600">{infos.length} инфо</span>
              )}
            </span>
            <ChevronDown className="w-4 h-4 ml-1" />
          </>
        )}
      </button>
    )
  }

  // Развёрнутая панель
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${isValid ? 'text-emerald-500' : 'text-amber-500'}`} />
          <h3 className="text-sm font-semibold text-gray-900">Валидация диаграммы</h3>
          {diagramType && (
            <span className="text-xs font-mono bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
              {diagramType.toUpperCase()}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <ChevronUp className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
        <button
          onClick={() => setFilterSeverity(null)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
            filterSeverity === null ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          Все ({validationResult.issues.length})
        </button>
        {errors.length > 0 && (
          <button
            onClick={() => setFilterSeverity(SEVERITY.ERROR)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
              filterSeverity === SEVERITY.ERROR ? 'bg-red-100 text-red-700' : 'text-red-500 hover:bg-red-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Ошибки ({errors.length})
          </button>
        )}
        {warnings.length > 0 && (
          <button
            onClick={() => setFilterSeverity(SEVERITY.WARNING)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
              filterSeverity === SEVERITY.WARNING ? 'bg-amber-100 text-amber-700' : 'text-amber-500 hover:bg-amber-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Предупреждения ({warnings.length})
          </button>
        )}
        {infos.length > 0 && (
          <button
            onClick={() => setFilterSeverity(SEVERITY.INFO)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors ${
              filterSeverity === SEVERITY.INFO ? 'bg-blue-100 text-blue-700' : 'text-blue-500 hover:bg-blue-50'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Информация ({infos.length})
          </button>
        )}
      </div>

      {/* Issues List */}
      <div className="max-h-64 overflow-y-auto">
        {filteredIssues.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Проблем не обнаружено!</p>
            <p className="text-xs text-gray-400 mt-1">Диаграмма соответствует правилам {diagramType?.toUpperCase()}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredIssues.map((issue, index) => {
              const config = getSeverityConfig(issue.severity)
              const IconComponent = config.icon
              
              return (
                <button
                  key={index}
                  onClick={() => issue.elementId && onIssueClick?.(issue.elementId, issue.elementType)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                    issue.elementId ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${config.textColor}`}>{issue.message}</p>
                    {issue.elementId && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {issue.elementType === 'edge' ? 'Связь: ' : 'Элемент: '}
                        <code className="font-mono">{issue.elementId}</code>
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer with tips */}
      {hasIssues && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            💡 Нажмите на проблему, чтобы выделить соответствующий элемент
          </p>
        </div>
      )}
    </div>
  )
}

export default ValidationPanel

