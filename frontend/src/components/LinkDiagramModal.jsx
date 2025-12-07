import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from 'react-query'
import { diagramsAPI } from '../api'
import { 
  X, Link2, Search, FolderOpen, FileText, ArrowRight, 
  Layers, Code, Database, ChevronDown, ChevronRight,
  Target, Box
} from 'lucide-react'

const DIAGRAM_TYPE_COLORS = {
  bpmn: 'bg-blue-100 text-blue-700',
  erd: 'bg-amber-100 text-amber-700',
  dfd: 'bg-purple-100 text-purple-700',
}

// Типы связей с описаниями и иконками
const LINK_TYPES = [
  { 
    value: 'reference', 
    label: 'Ссылка', 
    description: 'Простая навигационная ссылка для быстрого перехода',
    fullDescription: 'Используйте для связи элементов без строгой иерархии. Например, ссылка на справочную диаграмму.',
    icon: Link2,
    color: 'text-gray-600 bg-gray-100 border-gray-300',
    example: 'Процесс → Схема взаимодействия'
  },
  { 
    value: 'decomposition', 
    label: 'Декомпозиция', 
    description: 'Детализация элемента в подчинённой диаграмме',
    fullDescription: 'Используйте когда элемент (процесс, подсистема) детально описан на отдельной диаграмме более низкого уровня.',
    icon: Layers,
    color: 'text-green-600 bg-green-50 border-green-300',
    example: 'BPMN подпроцесс → детальный BPMN'
  },
  { 
    value: 'implementation', 
    label: 'Реализация', 
    description: 'Техническая реализация бизнес-логики',
    fullDescription: 'Используйте для связи бизнес-процесса с его технической реализацией (архитектура, код, интеграции).',
    icon: Code,
    color: 'text-blue-600 bg-blue-50 border-blue-300',
    example: 'BPMN сервис → DFD потоки данных'
  },
  { 
    value: 'data_source', 
    label: 'Источник данных', 
    description: 'Связь с моделью данных (ERD)',
    fullDescription: 'Используйте для указания какие данные использует элемент. Связывает хранилища данных с их структурой в ERD.',
    icon: Database,
    color: 'text-amber-600 bg-amber-50 border-amber-300',
    targetType: 'erd',
    example: 'DFD хранилище → ERD сущность'
  },
]

const LinkDiagramModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  sourceNode, 
  currentDiagramId,
  currentDiagramType,
  existingLinks = [],
  editingLink = null, // Для режима редактирования
  onUpdate, // Callback для обновления связи
}) => {
  const [selectedDiagram, setSelectedDiagram] = useState(null)
  const [linkType, setLinkType] = useState('reference')
  const [targetElementId, setTargetElementId] = useState(null)
  const [description, setDescription] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedProjects, setExpandedProjects] = useState({})
  const [showElementPicker, setShowElementPicker] = useState(false)
  const [step, setStep] = useState(1) // 1: выбор диаграммы, 2: настройка связи

  const isEditMode = Boolean(editingLink)

  const { data: projectsWithDiagrams = [], isLoading } = useQuery(
    'diagrams-for-linking',
    () => diagramsAPI.getDiagramsForLinking(),
    { enabled: isOpen }
  )

  // Загрузка данных целевой диаграммы для выбора элемента
  const { data: targetDiagramData, isLoading: isLoadingTarget } = useQuery(
    ['diagram', selectedDiagram?.id],
    () => diagramsAPI.getDiagram(selectedDiagram.id),
    { enabled: !!selectedDiagram?.id && showElementPicker }
  )

  // Элементы целевой диаграммы
  const targetElements = useMemo(() => {
    if (!targetDiagramData?.data?.nodes) return []
    return targetDiagramData.data.nodes.map(node => ({
      id: node.id,
      label: node.data?.label || 'Без названия',
      shape: node.data?.shape || 'rectangle',
      type: node.type
    }))
  }, [targetDiagramData])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingLink) {
        // Режим редактирования - заполнить данные из существующей связи
        setLinkType(editingLink.link_type || 'reference')
        setDescription(editingLink.description || '')
        setTargetElementId(editingLink.target_element_id || null)
        // Найти диаграмму в списке
        const targetDiagram = projectsWithDiagrams
          .flatMap(p => p.diagrams)
          .find(d => d.id === editingLink.target_diagram)
        setSelectedDiagram(targetDiagram || null)
        setStep(2)
      } else {
        // Режим создания
        setSelectedDiagram(null)
        setLinkType('reference')
        setTargetElementId(null)
        setDescription('')
        setStep(1)
      }
      setSearchTerm('')
      setShowElementPicker(false)
      // Expand all projects by default
      const expanded = {}
      projectsWithDiagrams.forEach(p => { expanded[p.id] = true })
      setExpandedProjects(expanded)
    }
  }, [isOpen, editingLink, projectsWithDiagrams])

  if (!isOpen) return null

  // Filter diagrams based on search and exclude current diagram
  const filteredProjects = projectsWithDiagrams
    .map(project => ({
      ...project,
      diagrams: project.diagrams.filter(d => 
        d.id !== currentDiagramId &&
        (d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         d.diagram_type.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }))
    .filter(project => project.diagrams.length > 0)

  // Get IDs of already linked diagrams for this specific element
  const linkedDiagramIds = new Set(
    existingLinks
      .filter(l => l.source_element_id === sourceNode?.id)
      .map(l => l.target_diagram)
  )

  const handleToggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const handleSelectDiagram = (diagram) => {
    if (!isEditMode && linkedDiagramIds.has(diagram.id)) return
    setSelectedDiagram(diagram)
    setTargetElementId(null) // Reset target element when diagram changes
  }

  const handleNextStep = () => {
    if (!selectedDiagram) return
    setStep(2)
  }

  const handleBackStep = () => {
    if (isEditMode) return // В режиме редактирования нельзя вернуться
    setStep(1)
  }

  const handleSubmit = () => {
    if (!selectedDiagram) return
    
    const linkData = {
      source_element_id: sourceNode.id,
      source_element_label: sourceNode.data?.label || 'Element',
      target_diagram: selectedDiagram.id,
      target_element_id: targetElementId || null,
      link_type: linkType,
      description: description.trim() || '',
    }

    if (isEditMode && onUpdate) {
      onUpdate(editingLink.id, linkData)
    } else {
      onSave(linkData)
    }
  }

  // Получить предупреждение для выбранного типа связи
  const getLinkTypeWarning = () => {
    const selectedType = LINK_TYPES.find(t => t.value === linkType)
    if (!selectedType || !selectedDiagram) return null

    if (selectedType.targetType && selectedDiagram.diagram_type !== selectedType.targetType) {
      return `Тип "${selectedType.label}" обычно используется для связи с ${selectedType.targetType.toUpperCase()} диаграммами`
    }
    return null
  }

  const warning = getLinkTypeWarning()

  // Шаг 1: Выбор диаграммы
  const renderDiagramSelection = () => (
    <>
      {/* Search */}
      <div className="px-5 py-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск диаграмм..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Diagram Selection */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-primary-600"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Диаграммы не найдены</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map(project => (
              <div key={project.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => handleToggleProject(project.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {expandedProjects[project.id] ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <FolderOpen className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-gray-700">{project.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {project.diagrams.length} {project.diagrams.length === 1 ? 'диаграмма' : project.diagrams.length < 5 ? 'диаграммы' : 'диаграмм'}
                  </span>
                </button>
                
                {expandedProjects[project.id] && (
                  <div className="divide-y">
                    {project.diagrams.map(diagram => {
                      const isLinked = linkedDiagramIds.has(diagram.id)
                      const isSelected = selectedDiagram?.id === diagram.id
                      
                      return (
                        <button
                          key={diagram.id}
                          onClick={() => handleSelectDiagram(diagram)}
                          disabled={isLinked}
                          className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                            isLinked 
                              ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'bg-primary-50 border-l-2 border-primary-500'
                                : 'hover:bg-gray-50'
                          }`}
                        >
                          <FileText className={`w-4 h-4 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                          <span className={`flex-1 text-left ${isSelected ? 'font-medium text-primary-700' : 'text-gray-700'}`}>
                            {diagram.name}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${DIAGRAM_TYPE_COLORS[diagram.diagram_type] || 'bg-gray-100 text-gray-600'}`}>
                            {diagram.diagram_type}
                          </span>
                          {isLinked && (
                            <span className="text-xs text-gray-400">Уже связано</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )

  // Шаг 2: Настройка связи
  const renderLinkConfiguration = () => (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* Выбранная диаграмма */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Целевая диаграмма</div>
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900">{selectedDiagram?.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${DIAGRAM_TYPE_COLORS[selectedDiagram?.diagram_type] || 'bg-gray-100 text-gray-600'}`}>
            {selectedDiagram?.diagram_type}
          </span>
          {!isEditMode && (
            <button 
              onClick={handleBackStep}
              className="ml-auto text-sm text-primary-600 hover:text-primary-700"
            >
              Изменить
            </button>
          )}
        </div>
      </div>

      {/* Тип связи */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Тип связи</label>
        <div className="space-y-2">
          {LINK_TYPES.map(type => {
            const Icon = type.icon
            const isSelected = linkType === type.value
            return (
              <button
                key={type.value}
                onClick={() => setLinkType(type.value)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  isSelected 
                    ? `${type.color} border-current` 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-gray-400'}`} />
                  <span className={`font-medium text-sm ${isSelected ? '' : 'text-gray-700'}`}>
                    {type.label}
                  </span>
                  {type.example && (
                    <span className={`ml-auto text-xs ${isSelected ? 'opacity-70' : 'text-gray-400'}`}>
                      {type.example}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isSelected ? 'opacity-80' : 'text-gray-500'}`}>
                  {type.description}
                </p>
              </button>
            )
          })}
        </div>
        {/* Развёрнутое описание выбранного типа */}
        {linkType && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-200">
            💡 {LINK_TYPES.find(t => t.value === linkType)?.fullDescription}
          </div>
        )}
        {warning && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            ⚠️ {warning}
          </div>
        )}
      </div>

      {/* Связь с конкретным элементом */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Связать с элементом</label>
          <button
            onClick={() => setShowElementPicker(!showElementPicker)}
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            {showElementPicker ? 'Скрыть' : 'Выбрать элемент'}
            <Target className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {showElementPicker && (
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-500">
              Выберите элемент целевой диаграммы (опционально)
            </div>
            <div className="max-h-48 overflow-y-auto">
              {isLoadingTarget ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-primary-600"></div>
                </div>
              ) : targetElements.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  Элементы не найдены
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setTargetElementId(null)}
                    className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
                      !targetElementId ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">Вся диаграмма</span>
                  </button>
                  {targetElements.map(element => (
                    <button
                      key={element.id}
                      onClick={() => setTargetElementId(element.id)}
                      className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-colors ${
                        targetElementId === element.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Box className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{element.label}</span>
                      <span className="text-xs text-gray-400 ml-auto">{element.shape}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
        
        {targetElementId && (
          <div className="mt-2 text-sm text-gray-600">
            Выбран элемент: <span className="font-medium text-gray-900">
              {targetElements.find(e => e.id === targetElementId)?.label}
            </span>
          </div>
        )}
      </div>

      {/* Описание */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Описание <span className="text-gray-400 font-normal">(опционально)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Добавьте описание связи..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-gray-200 w-[700px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded">
                <Link2 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {isEditMode ? 'Редактировать связь' : 'Связать с диаграммой'}
                </h2>
                <p className="text-sm text-gray-500">
                  {step === 1 
                    ? `Выберите диаграмму для связи с "${sourceNode?.data?.label || 'Элемент'}"`
                    : `Настройка связи с "${selectedDiagram?.name}"`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* Stepper */}
          {!isEditMode && (
            <div className="flex items-center gap-2 mt-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                step === 1 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">1</span>
                Диаграмма
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300" />
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                step === 2 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center">2</span>
                Настройка
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 1 ? renderDiagramSelection() : renderLinkConfiguration()}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {selectedDiagram && (
              <>
                <span className="font-medium text-gray-700">{sourceNode?.data?.label}</span>
                <ArrowRight className="w-4 h-4" />
                <span className="font-medium text-primary-600">{selectedDiagram.name}</span>
                {targetElementId && (
                  <>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-600">
                      {targetElements.find(e => e.id === targetElementId)?.label}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step === 1 ? (
              <>
                <button
                  onClick={onClose}
                  className="btn btn-secondary btn-md"
                >
                  Отмена
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!selectedDiagram}
                  className="btn btn-primary btn-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Далее
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {!isEditMode && (
                  <button
                    onClick={handleBackStep}
                    className="btn btn-secondary btn-md"
                  >
                    Назад
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="btn btn-secondary btn-md"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn btn-primary btn-md flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  {isEditMode ? 'Сохранить' : 'Создать связь'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LinkDiagramModal
