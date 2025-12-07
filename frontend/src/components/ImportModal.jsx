import React, { useState, useRef } from 'react'
import { X, Upload, FileCode, Database, Braces, AlertCircle, CheckCircle, FileText, Loader2 } from 'lucide-react'
import { 
  bpmnToDiagram, 
  sqlToDiagram, 
  jsonSchemaToDiagram,
  readFileAsText 
} from '../utils/diagramConverters'
import toast from 'react-hot-toast'

const ImportModal = ({ 
  isOpen, 
  onClose, 
  onImport, // Called with { name, diagram_type, data }
}) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileContent, setFileContent] = useState(null)
  const [format, setFormat] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [error, setError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [diagramName, setDiagramName] = useState('')
  const fileInputRef = useRef(null)

  const formats = [
    { 
      id: 'bpmn', 
      label: 'BPMN 2.0', 
      icon: FileCode, 
      extensions: ['.bpmn', '.xml'],
      description: 'XML стандарт бизнес-процессов',
      diagramType: 'bpmn',
    },
    { 
      id: 'sql', 
      label: 'SQL DDL', 
      icon: Database, 
      extensions: ['.sql'],
      description: 'CREATE TABLE скрипты',
      diagramType: 'erd',
    },
    { 
      id: 'json', 
      label: 'JSON Schema', 
      icon: Braces, 
      extensions: ['.json'],
      description: 'IDMS JSON формат',
      diagramType: 'auto', // Determined from file
    },
  ]

  const detectFormat = (filename) => {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext === 'bpmn' || (ext === 'xml' && filename.toLowerCase().includes('bpmn'))) {
      return 'bpmn'
    }
    if (ext === 'sql') {
      return 'sql'
    }
    if (ext === 'json') {
      return 'json'
    }
    return null
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setPreviewData(null)
    setSelectedFile(file)
    setIsProcessing(true)

    try {
      const content = await readFileAsText(file)
      setFileContent(content)

      // Auto-detect format
      const detectedFormat = detectFormat(file.name)
      if (detectedFormat) {
        setFormat(detectedFormat)
        
        // Try to parse and preview
        await parseContent(content, detectedFormat)
      } else {
        setFormat(null)
        setError('Не удалось определить формат файла. Выберите формат вручную.')
      }

      // Set default name from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setDiagramName(nameWithoutExt)
    } catch (err) {
      setError(`Ошибка чтения файла: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const parseContent = async (content, selectedFormat) => {
    setError(null)
    setPreviewData(null)

    try {
      let result
      switch (selectedFormat) {
        case 'bpmn':
          result = bpmnToDiagram(content)
          break
        case 'sql':
          result = sqlToDiagram(content)
          break
        case 'json':
          const jsonData = JSON.parse(content)
          result = jsonSchemaToDiagram(jsonData)
          break
        default:
          throw new Error('Неизвестный формат')
      }

      setPreviewData(result)
      
      // Update name if parsed successfully
      if (result.name && !diagramName) {
        setDiagramName(result.name)
      }
    } catch (err) {
      setError(`Ошибка парсинга: ${err.message}`)
      setPreviewData(null)
    }
  }

  const handleFormatChange = async (newFormat) => {
    setFormat(newFormat)
    if (fileContent) {
      setIsProcessing(true)
      await parseContent(fileContent, newFormat)
      setIsProcessing(false)
    }
  }

  const handleImport = () => {
    if (!previewData) {
      toast.error('Нет данных для импорта')
      return
    }

    if (!diagramName.trim()) {
      toast.error('Введите название диаграммы')
      return
    }

    onImport({
      name: diagramName,
      diagram_type: previewData.diagram_type,
      data: previewData.data,
    })

    // Reset state
    resetState()
    onClose()
    toast.success('Диаграмма импортирована!')
  }

  const resetState = () => {
    setSelectedFile(null)
    setFileContent(null)
    setFormat(null)
    setPreviewData(null)
    setError(null)
    setDiagramName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-lg border border-gray-200 w-full max-w-lg overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Импорт диаграммы</h2>
                <p className="text-sm text-gray-500">BPMN, SQL, JSON</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Файл</label>
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  selectedFile 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bpmn,.xml,.sql,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      Перетащите файл или <span className="text-blue-600 font-medium">выберите</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      .bpmn, .xml, .sql, .json
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Format Selection */}
            {selectedFile && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Формат файла</label>
                <div className="grid grid-cols-3 gap-2">
                  {formats.map((fmt) => {
                    const IconComponent = fmt.icon
                    const isSelected = format === fmt.id
                    return (
                      <button
                        key={fmt.id}
                        onClick={() => handleFormatChange(fmt.id)}
                        className={`p-3 rounded border-2 transition-all text-center ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 mx-auto mb-1 ${
                          isSelected ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <div className={`text-xs font-medium ${
                          isSelected ? 'text-blue-700' : 'text-gray-600'
                        }`}>
                          {fmt.label}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Diagram Name */}
            {previewData && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Название диаграммы</label>
                <input
                  type="text"
                  value={diagramName}
                  onChange={(e) => setDiagramName(e.target.value)}
                  className="input"
                  placeholder="Введите название"
                />
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">Обработка файла...</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* Preview */}
            {previewData && !error && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-700">
                    <p className="font-medium">Файл успешно распознан</p>
                    <div className="mt-1 text-emerald-600 space-y-0.5">
                      <p>Тип: <span className="font-medium">{previewData.diagram_type?.toUpperCase()}</span></p>
                      <p>Элементов: <span className="font-medium">{previewData.data?.nodes?.length || 0}</span></p>
                      <p>Связей: <span className="font-medium">{previewData.data?.edges?.length || 0}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Format hints */}
            {format && !previewData && !error && !isProcessing && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                <p className="text-sm text-gray-600">
                  {format === 'bpmn' && 'Ожидается файл BPMN 2.0 XML с элементами <process> и <BPMNDiagram>'}
                  {format === 'sql' && 'Ожидается SQL файл с операторами CREATE TABLE'}
                  {format === 'json' && 'Ожидается JSON файл в формате IDMS с полями elements и connections'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="btn btn-secondary btn-md"
            >
              Отмена
            </button>
            <button
              onClick={handleImport}
              disabled={!previewData || !diagramName.trim() || isProcessing}
              className="btn btn-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Импортировать
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ImportModal

