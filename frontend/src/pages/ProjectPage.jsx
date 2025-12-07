import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { projectsAPI, diagramsAPI } from '../api'
import Layout from '../components/Layout'
import DiagramEditor from '../components/DiagramEditor'
import DiagramTree from '../components/DiagramTree'
import DiagramPalette from '../components/DiagramPalette'
import ExportModal from '../components/ExportModal'
import ImportModal from '../components/ImportModal'
import DiagramTemplatesModal from '../components/DiagramTemplatesModal'
import DiagramMap from '../components/DiagramMap'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, Plus, FileText, Share2, Copy, X, Download, Upload, LayoutTemplate, Map, Bookmark } from 'lucide-react'
import toast from 'react-hot-toast'

const ProjectPage = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedDiagram, setSelectedDiagram] = useState(null)
  const [selectedDiagramType, setSelectedDiagramType] = useState('bpmn')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newDiagramName, setNewDiagramName] = useState('')
  const [diagramLock, setDiagramLock] = useState(null)
  const [connectionType, setConnectionType] = useState('sequence-flow')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [showDiagramMap, setShowDiagramMap] = useState(false)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pendingTemplate, setPendingTemplate] = useState(null)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateIsPublic, setTemplateIsPublic] = useState(false)
  const [highlightElementId, setHighlightElementId] = useState(null)
  const { user } = useAuth()
  const heldLockRef = useRef(null)
  const diagramForceSaveRef = useRef(null)

  // Fetch project data
  const { data: project, isLoading: projectLoading } = useQuery(
    ['project', projectId],
    () => projectsAPI.getProject(projectId)
  )

  // Fetch diagrams
  const { data: diagrams = [], isLoading: diagramsLoading } = useQuery(
    ['diagrams', projectId],
    () => diagramsAPI.getDiagrams(projectId)
  )

  // Keep selectedDiagram in sync with latest list only if list has newer data
  // (e.g. after diagram was updated from another source)
  useEffect(() => {
    if (!selectedDiagram) return
    const fromList = diagrams.find((d) => d.id === selectedDiagram.id)
    // Only update if list has newer updated_at timestamp
    if (fromList && fromList.updated_at && selectedDiagram.updated_at) {
      if (new Date(fromList.updated_at) > new Date(selectedDiagram.updated_at)) {
        setSelectedDiagram(fromList)
      }
    }
  }, [diagrams, selectedDiagram])

  // Create diagram mutation
  const createDiagramMutation = useMutation(
    (data) => diagramsAPI.createDiagram(projectId, data),
    {
      onSuccess: (newDiagram) => {
        queryClient.invalidateQueries(['diagrams', projectId])
        setSelectedDiagram(newDiagram)
        setShowCreateModal(false)
        setNewDiagramName('')
        toast.success('Диаграмма создана!')
      },
      onError: (error) => {
        const errorDetail = error.response?.data?.detail
        let errorMessage = 'Не удалось создать диаграмму'
        
        if (typeof errorDetail === 'string') {
          errorMessage = errorDetail
        } else if (Array.isArray(errorDetail)) {
          // Pydantic v2 validation errors format
          errorMessage = errorDetail.map(err => err.msg || err.message).join(', ')
        } else if (errorDetail && typeof errorDetail === 'object') {
          errorMessage = errorDetail.msg || errorDetail.message || 'Не удалось создать диаграмму'
        }
        
        toast.error(errorMessage)
      },
    }
  )

  // Create invite mutation
  const createInviteMutation = useMutation(
    () => projectsAPI.createInvite(projectId, 24),
    {
      onSuccess: (invite) => {
        const link = `${window.location.origin}/invite/${invite.token}`
        setInviteLink(link)
        setShowInviteModal(true)
        toast.success('Ссылка-приглашение создана!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Не удалось создать ссылку')
      },
    }
  )

  // Save as template mutation
  const saveAsTemplateMutation = useMutation(
    ({ diagramId, data }) => diagramsAPI.saveDiagramAsTemplate(diagramId, data),
    {
      onSuccess: () => {
        setShowSaveTemplateModal(false)
        setTemplateName('')
        setTemplateDescription('')
        setTemplateIsPublic(false)
        toast.success('Шаблон сохранён!')
      },
      onError: (error) => {
        toast.error(error.response?.data?.detail || 'Не удалось сохранить шаблон')
      },
    }
  )


  useEffect(() => {
    setConnectionType((prev) => {
      if (!selectedDiagram) {
        return 'sequence-flow'
      }

      if (selectedDiagram.diagram_type === 'erd') {
        return prev && prev.startsWith('erd-') ? prev : 'erd-one-to-many'
      }

      if (selectedDiagram.diagram_type === 'bpmn') {
        return prev && !prev.startsWith('erd-') ? prev : 'sequence-flow'
      }

      return 'sequence-flow'
    })
  }, [selectedDiagram?.diagram_type])

  useEffect(() => {
    const diagramId = selectedDiagram?.id
    const userId = user?.id

    if (!diagramId || !userId) {
      setDiagramLock(null)
      return () => {}
    }

    let cancelled = false

    const acquireLock = async () => {
      try {
        const lockData = await diagramsAPI.lockDiagram(diagramId)

        if (cancelled) {
          if (lockData?.user?.id === userId) {
            diagramsAPI.unlockDiagram(diagramId).catch((error) => {
              console.error('Failed to release diagram lock after cancellation', error)
            })
          }
          return
        }

        setDiagramLock(lockData)

        if (lockData?.user?.id === userId) {
          heldLockRef.current = { diagramId, userId }
        } else {
          heldLockRef.current = null
        }
      } catch (error) {
        if (cancelled) return

        heldLockRef.current = null
        console.error('Failed to lock diagram', error)
        
        // Don't show error toast, just set lock to null
        if (!cancelled) {
          setDiagramLock(null)
        }
      }
    }

    acquireLock()

    return () => {
      cancelled = true

      const heldLock = heldLockRef.current
      if (heldLock && heldLock.diagramId === diagramId) {
        heldLockRef.current = null
        setDiagramLock((currentLock) =>
          currentLock?.diagram_id === diagramId ? null : currentLock
        )
        diagramsAPI.unlockDiagram(diagramId).catch((error) => {
          console.error('Failed to release diagram lock', error)
        })
      }
    }
  }, [selectedDiagram?.id, user?.id])

  const handleCreateDiagram = () => {
    if (!newDiagramName.trim()) {
      toast.error('Введите название диаграммы')
      return
    }

    const diagramData = {
      name: newDiagramName,
      diagram_type: selectedDiagramType,
    }

    // If we have a pending template, include its nodes and edges
    if (pendingTemplate) {
      diagramData.data = {
        nodes: pendingTemplate.nodes || [],
        edges: pendingTemplate.edges || [],
      }
    }

    createDiagramMutation.mutate(diagramData)
    setPendingTemplate(null)
  }

  const handleSelectTemplate = (template) => {
    setPendingTemplate(template)
    setSelectedDiagramType(template.diagramType)
    setNewDiagramName(template.name)
    setShowTemplatesModal(false)
    setShowCreateModal(true)
  }

  const handleCreateInvite = () => {
    createInviteMutation.mutate()
  }

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Введите название шаблона')
      return
    }
    
    saveAsTemplateMutation.mutate({
      diagramId: selectedDiagram.id,
      data: {
        name: templateName,
        description: templateDescription,
        is_public: templateIsPublic,
      },
    })
  }

  const openSaveTemplateModal = () => {
    if (selectedDiagram) {
      setTemplateName(`${selectedDiagram.name} (шаблон)`)
      setTemplateDescription(selectedDiagram.description || '')
      setShowSaveTemplateModal(true)
    }
  }

  // Handle import from file
  const handleImport = (importedData) => {
    // Create a new diagram with imported data
    createDiagramMutation.mutate({
      name: importedData.name,
      diagram_type: importedData.diagram_type,
      data: importedData.data,
    })
    setShowImportModal(false)
  }

  const handleSelectDiagram = async (diagram) => {
    // Если уже выбрана эта диаграмма - ничего не делаем
    if (selectedDiagram?.id === diagram.id) return

    // Перед переключением — попытка досохранить текущую диаграмму
    if (diagramForceSaveRef.current) {
      try {
        await diagramForceSaveRef.current()
      } catch (e) {
        console.error('Failed to force-save before switching diagram', e)
      }
    }
    
    // Загружаем свежие данные диаграммы с сервера
    try {
      const freshDiagram = await diagramsAPI.getDiagram(diagram.id)
      setSelectedDiagram(freshDiagram)
      
      // Обновляем кэш списка диаграмм свежими данными
      queryClient.setQueryData(['diagrams', projectId], (prev) => {
        if (!Array.isArray(prev)) return prev
        return prev.map((d) => (d.id === freshDiagram.id ? freshDiagram : d))
      })
    } catch (e) {
      console.error('Failed to fetch diagram:', e)
      // Fallback - используем то что есть
      setSelectedDiagram(diagram)
    }
  }

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast.success('Ссылка скопирована!')
  }

  // Handle navigation to linked diagrams
  const handleNavigateToDiagram = async (targetDiagramId, targetProjectId, targetElementId = null) => {
    // Clear previous highlight
    setHighlightElementId(null)
    
    // If it's in a different project, navigate there
    if (targetProjectId && targetProjectId !== parseInt(projectId)) {
      // Store target element in URL state for cross-project navigation
      navigate(`/projects/${targetProjectId}`, { 
        state: { targetDiagramId, targetElementId } 
      })
      toast.success('Переход к связанной диаграмме в другом проекте...')
      return
    }

    // Same project - find and select the diagram
    const targetDiagram = diagrams.find(d => d.id === targetDiagramId)
    if (targetDiagram) {
      await handleSelectDiagram(targetDiagram)
      
      // Set highlight after a short delay to allow diagram to render
      if (targetElementId) {
        setTimeout(() => {
          setHighlightElementId(targetElementId)
        }, 300)
      }
      
      toast.success(`Открыта диаграмма "${targetDiagram.name}"`)
    } else {
      // Diagram might not be in cache, fetch it
      try {
        const freshDiagram = await diagramsAPI.getDiagram(targetDiagramId)
        setSelectedDiagram(freshDiagram)
        queryClient.invalidateQueries(['diagrams', projectId])
        
        // Set highlight after a short delay
        if (targetElementId) {
          setTimeout(() => {
            setHighlightElementId(targetElementId)
          }, 300)
        }
        
        toast.success(`Открыта диаграмма "${freshDiagram.name}"`)
      } catch (e) {
        toast.error('Не удалось открыть связанную диаграмму')
      }
    }
  }

  const lockedByCurrentUser = Boolean(
    diagramLock && user && diagramLock.user?.id === user.id
  )

  const isDiagramLockedForEditing = Boolean(diagramLock && !lockedByCurrentUser)

  const lockOwnerLabel = diagramLock
    ? lockedByCurrentUser
      ? 'вами'
      : diagramLock.user?.username
    : undefined

  if (projectLoading || diagramsLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-primary-600"></div>
          <span className="text-sm text-gray-500 font-medium">
            {projectLoading ? 'Загрузка проекта...' : 'Загрузка диаграмм...'}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {project?.name}
            </h1>
            <p className="text-xs text-gray-500">
              {diagrams.length} {diagrams.length === 1 ? 'диаграмма' : diagrams.length < 5 ? 'диаграммы' : 'диаграмм'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedDiagram && diagramLock && (
            <span
              className={`text-xs px-2 py-1 rounded ${lockedByCurrentUser ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'}`}
            >
              Заблокировано {lockOwnerLabel}
            </span>
          )}
          <button
            onClick={() => setShowDiagramMap(true)}
            className="btn btn-secondary btn-sm"
            title="Карта связей между диаграммами"
          >
            <Map className="h-4 w-4 mr-1" />
            Карта связей
          </button>
          <button
            onClick={openSaveTemplateModal}
            disabled={!selectedDiagram}
            className="btn btn-secondary btn-sm"
            title={selectedDiagram ? 'Сохранить как шаблон' : 'Выберите диаграмму'}
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Как шаблон
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={!selectedDiagram}
            className="btn btn-secondary btn-sm"
            title={selectedDiagram ? 'Экспорт диаграммы' : 'Выберите диаграмму для экспорта'}
          >
            <Download className="h-4 w-4 mr-1" />
            Экспорт
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary btn-sm"
            title="Импорт диаграммы из файла"
          >
            <Upload className="h-4 w-4 mr-1" />
            Импорт
          </button>
          <button
            onClick={handleCreateInvite}
            disabled={createInviteMutation.isLoading}
            className="btn btn-secondary btn-sm"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Поделиться
          </button>
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="btn btn-secondary btn-sm"
          >
            <LayoutTemplate className="h-4 w-4 mr-1" />
            Шаблоны
          </button>
          <button
            onClick={() => {
              setPendingTemplate(null)
              setNewDiagramName('')
              setShowCreateModal(true)
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Новая диаграмма
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Diagram Tree */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-sm font-semibold text-gray-900">Диаграммы</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <DiagramTree
              diagrams={diagrams}
              selectedDiagram={selectedDiagram}
              onSelectDiagram={handleSelectDiagram}
              onDiagramDeleted={() => setSelectedDiagram(null)}
            />
          </div>
        </div>

        {/* Center Panel - Diagram Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedDiagram ? (
            <DiagramEditor
              key={`${selectedDiagram.id}-${selectedDiagram.updated_at || ''}`}
              diagram={selectedDiagram}
              diagramType={selectedDiagram.diagram_type}
              isLocked={isDiagramLockedForEditing}
              lockUser={lockOwnerLabel}
              connectionType={connectionType}
              setForceSaveRef={(fn) => { diagramForceSaveRef.current = fn }}
              onNavigateToDiagram={handleNavigateToDiagram}
              highlightElementId={highlightElementId}
              onHighlightClear={() => setHighlightElementId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Диаграмма не выбрана
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Выберите диаграмму слева или создайте новую.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Palette */}
        <div className="w-72 bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden">
          <DiagramPalette
            diagramType={selectedDiagram?.diagram_type || 'bpmn'}
            selectedConnectionType={connectionType}
            onConnectionTypeChange={setConnectionType}
          />
        </div>
      </div>

      {/* Create Diagram Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-200 w-96 max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b">
              <h3 className="text-base font-semibold text-gray-900">
                {pendingTemplate ? 'Создать из шаблона' : 'Новая диаграмма'}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Template indicator */}
              {pendingTemplate && (
                <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-medium text-primary-700">
                      {pendingTemplate.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setPendingTemplate(null)}
                    className="text-primary-500 hover:text-primary-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Название диаграммы
                </label>
                <input
                  type="text"
                  value={newDiagramName}
                  onChange={(e) => setNewDiagramName(e.target.value)}
                  className="input"
                  placeholder="Введите название"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Тип диаграммы
                </label>
                <select
                  value={selectedDiagramType}
                  onChange={(e) => {
                    setSelectedDiagramType(e.target.value)
                    // Clear template if type changes
                    if (pendingTemplate && pendingTemplate.diagramType !== e.target.value) {
                      setPendingTemplate(null)
                    }
                  }}
                  className="input"
                  disabled={!!pendingTemplate}
                >
                  <option value="bpmn">BPMN</option>
                  <option value="erd">ERD</option>
                  <option value="dfd">DFD</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewDiagramName('')
                    setPendingTemplate(null)
                  }}
                  className="btn btn-secondary btn-md"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateDiagram}
                  disabled={createDiagramMutation.isLoading}
                  className="btn btn-primary btn-md"
                >
                  {createDiagramMutation.isLoading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-200 w-[500px] overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 bg-gray-50 border-b">
              <h3 className="text-base font-semibold text-gray-900">
                Поделиться проектом
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Отправьте эту ссылку для приглашения к совместной работе над проектом.
                Ссылка действительна 24 часа.
              </p>
              
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 input bg-gray-50"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="btn btn-primary btn-md"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Копировать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        diagramName={selectedDiagram?.name}
        projectName={project?.name}
        diagram={selectedDiagram}
        diagramType={selectedDiagram?.diagram_type}
        diagrams={diagrams}
        mode={selectedDiagram ? 'single' : 'project'}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      {/* Templates Modal */}
      <DiagramTemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleSelectTemplate}
        diagramType={selectedDiagramType}
      />

      {/* Diagram Map Modal */}
      <DiagramMap
        projectId={parseInt(projectId)}
        diagrams={diagrams}
        currentDiagramId={selectedDiagram?.id}
        isOpen={showDiagramMap}
        onClose={() => setShowDiagramMap(false)}
        onDiagramSelect={async (diagramId) => {
          const diagram = diagrams.find(d => d.id === diagramId)
          if (diagram) {
            await handleSelectDiagram(diagram)
            setShowDiagramMap(false)
          }
        }}
      />

      {/* Save as Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-gray-200 w-[450px] overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 bg-gray-50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded">
                  <Bookmark className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Сохранить как шаблон
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedDiagram?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Название шаблона
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="input"
                  placeholder="Введите название"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Описание (необязательно)
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Краткое описание шаблона"
                />
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer group p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={templateIsPublic}
                    onChange={(e) => setTemplateIsPublic(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    templateIsPublic ? 'bg-primary-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      templateIsPublic ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Публичный шаблон</span>
                  <p className="text-xs text-gray-500">Доступен всем пользователям системы</p>
                </div>
              </label>
              
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="btn btn-secondary btn-md"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveAsTemplate}
                  disabled={saveAsTemplateMutation.isLoading}
                  className="btn btn-primary btn-md"
                >
                  {saveAsTemplateMutation.isLoading ? 'Сохранение...' : 'Сохранить шаблон'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectPage

