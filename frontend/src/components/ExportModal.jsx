import React, { useState } from 'react'
import { X, Download, FileImage, FileText, Loader2, CheckCircle, FileCode, Database, Braces } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { 
  diagramToBPMN, 
  diagramToSQL, 
  diagramToJSONSchema,
  downloadFile 
} from '../utils/diagramConverters'
import toast from 'react-hot-toast'

const ExportModal = ({ 
  isOpen, 
  onClose, 
  diagramName,
  projectName,
  diagrams = [], // For project export
  diagram, // Current diagram data
  diagramType, // bpmn, erd, dfd
  reactFlowInstance,
  mode = 'single' // 'single' or 'project'
}) => {
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState('high')
  const [includeBackground, setIncludeBackground] = useState(true)
  const [sqlDialect, setSqlDialect] = useState('postgresql')
  const [isExporting, setIsExporting] = useState(false)
  const [exportedFiles, setExportedFiles] = useState([])

  const qualitySettings = {
    low: { scale: 1, quality: 0.6 },
    medium: { scale: 2, quality: 0.8 },
    high: { scale: 3, quality: 1 },
  }

  // Available formats based on diagram type
  const getAvailableFormats = () => {
    const baseFormats = [
      { id: 'png', label: 'PNG', icon: FileImage, description: 'Изображение' },
      { id: 'pdf', label: 'PDF', icon: FileText, description: 'Документ' },
      { id: 'json', label: 'JSON Schema', icon: Braces, description: 'Структура данных' },
    ]
    
    if (diagramType === 'bpmn') {
      baseFormats.push({ 
        id: 'bpmn', 
        label: 'BPMN 2.0', 
        icon: FileCode, 
        description: 'XML стандарт' 
      })
    }
    
    if (diagramType === 'erd') {
      baseFormats.push({ 
        id: 'sql', 
        label: 'SQL DDL', 
        icon: Database, 
        description: 'Создание таблиц' 
      })
    }
    
    return baseFormats
  }

  // Get the ReactFlow viewport element
  const getReactFlowElement = () => {
    return document.querySelector('.react-flow__viewport')?.parentElement
  }

  // Export single diagram to PNG
  const exportToPNG = async (element, filename, settings) => {
    const canvas = await html2canvas(element, {
      scale: settings.scale,
      backgroundColor: includeBackground ? '#f9fafb' : null,
      logging: false,
      useCORS: true,
      allowTaint: true,
    })
    
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = canvas.toDataURL('image/png', settings.quality)
    link.click()
    
    return canvas
  }

  // Export single diagram to PDF
  const exportToPDF = async (element, filename, settings) => {
    const canvas = await html2canvas(element, {
      scale: settings.scale,
      backgroundColor: includeBackground ? '#f9fafb' : '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
    })
    
    const imgData = canvas.toDataURL('image/png', settings.quality)
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    
    // Calculate PDF dimensions (A4 or custom based on diagram size)
    const pdfWidth = imgWidth * 0.264583 // Convert px to mm (assuming 96 DPI)
    const pdfHeight = imgHeight * 0.264583
    
    // Use A4 if diagram is small, otherwise use custom size
    const useA4 = pdfWidth < 210 && pdfHeight < 297
    
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'mm',
      format: useA4 ? 'a4' : [pdfWidth / settings.scale, pdfHeight / settings.scale],
    })
    
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // Scale image to fit page
    let finalWidth = pdfWidth / settings.scale
    let finalHeight = pdfHeight / settings.scale
    
    if (useA4) {
      const ratio = Math.min(pageWidth / finalWidth, pageHeight / finalHeight)
      finalWidth *= ratio * 0.95
      finalHeight *= ratio * 0.95
    }
    
    const x = (pageWidth - finalWidth) / 2
    const y = (pageHeight - finalHeight) / 2
    
    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight)
    pdf.save(`${filename}.pdf`)
    
    return pdf
  }

  // Export to BPMN 2.0 XML
  const exportToBPMN = (filename) => {
    if (!diagram) {
      throw new Error('No diagram data available')
    }
    
    const xml = diagramToBPMN(diagram)
    downloadFile(xml, `${filename}.bpmn`, 'application/xml')
    return `${filename}.bpmn`
  }

  // Export to SQL DDL
  const exportToSQL = (filename) => {
    if (!diagram) {
      throw new Error('No diagram data available')
    }
    
    const sql = diagramToSQL(diagram, { dialect: sqlDialect })
    downloadFile(sql, `${filename}.sql`, 'text/sql')
    return `${filename}.sql`
  }

  // Export to JSON Schema
  const exportToJSON = (filename) => {
    if (!diagram) {
      throw new Error('No diagram data available')
    }
    
    const { schema, data } = diagramToJSONSchema(diagram)
    const content = JSON.stringify({ schema, data }, null, 2)
    downloadFile(content, `${filename}.json`, 'application/json')
    return `${filename}.json`
  }

  // Deselect all elements before export
  const deselectAll = () => {
    if (!reactFlowInstance) return null
    
    const nodes = reactFlowInstance.getNodes()
    const edges = reactFlowInstance.getEdges()
    
    // Store current selection
    const selectedNodes = nodes.filter(n => n.selected).map(n => n.id)
    const selectedEdges = edges.filter(e => e.selected).map(e => e.id)
    
    // Deselect all
    reactFlowInstance.setNodes(nodes.map(n => ({ ...n, selected: false })))
    reactFlowInstance.setEdges(edges.map(e => ({ ...e, selected: false })))
    
    return { selectedNodes, selectedEdges }
  }
  
  // Restore selection after export
  const restoreSelection = (selection) => {
    if (!reactFlowInstance || !selection) return
    
    const { selectedNodes, selectedEdges } = selection
    
    reactFlowInstance.setNodes(nodes => 
      nodes.map(n => ({ ...n, selected: selectedNodes.includes(n.id) }))
    )
    reactFlowInstance.setEdges(edges => 
      edges.map(e => ({ ...e, selected: selectedEdges.includes(e.id) }))
    )
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportedFiles([])
    
    try {
      const filename = diagramName?.replace(/[^a-zA-Z0-9а-яА-ЯёЁ\-_]/g, '_') || 'diagram'
      
      if (format === 'png' || format === 'pdf') {
        // Deselect all before image export
        const previousSelection = deselectAll()
        
        // Small delay to let React re-render without selection
        await new Promise(resolve => setTimeout(resolve, 100))
        
        try {
          const settings = qualitySettings[quality]
          const element = getReactFlowElement()
          
          if (!element) {
            throw new Error('Could not find diagram element')
          }
          
          if (format === 'png') {
            await exportToPNG(element, filename, settings)
            setExportedFiles([`${filename}.png`])
          } else {
            await exportToPDF(element, filename, settings)
            setExportedFiles([`${filename}.pdf`])
          }
        } finally {
          // Restore selection after export
          restoreSelection(previousSelection)
        }
      } else if (format === 'bpmn') {
        const exportedFile = exportToBPMN(filename)
        setExportedFiles([exportedFile])
        toast.success('BPMN 2.0 XML экспортирован!')
      } else if (format === 'sql') {
        const exportedFile = exportToSQL(filename)
        setExportedFiles([exportedFile])
        toast.success('SQL DDL экспортирован!')
      } else if (format === 'json') {
        const exportedFile = exportToJSON(filename)
        setExportedFiles([exportedFile])
        toast.success('JSON Schema экспортирован!')
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error(error.message || 'Ошибка при экспорте')
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  const availableFormats = getAvailableFormats()
  const showQualitySettings = format === 'png' || format === 'pdf'
  const showSqlDialect = format === 'sql'

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
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
              <div className="p-2 bg-emerald-100 rounded">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Экспорт {mode === 'project' ? 'проекта' : 'диаграммы'}
                </h2>
                <p className="text-sm text-gray-500 truncate max-w-[250px]">
                  {mode === 'project' ? projectName : diagramName}
                  {diagramType && <span className="ml-1 text-xs">({diagramType.toUpperCase()})</span>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-5">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Формат экспорта</label>
              <div className="grid grid-cols-2 gap-2">
                {availableFormats.map((fmt) => {
                  const IconComponent = fmt.icon
                  const isSelected = format === fmt.id
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id)}
                      className={`flex items-center gap-3 p-3 rounded border-2 transition-all text-left ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded ${isSelected ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        <IconComponent className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                          {fmt.label}
                        </div>
                        <div className="text-xs text-gray-400">{fmt.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quality Selection (for image formats) */}
            {showQualitySettings && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Качество</label>
                <div className="grid grid-cols-3 gap-2">
                  {[{key: 'low', label: 'Низкое'}, {key: 'medium', label: 'Среднее'}, {key: 'high', label: 'Высокое'}].map((q) => (
                    <button
                      key={q.key}
                      onClick={() => setQuality(q.key)}
                      className={`px-3 py-2 rounded border transition-all ${
                        quality === q.key
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  {quality === 'low' && 'Меньший размер файла, низкое разрешение'}
                  {quality === 'medium' && 'Баланс качества и размера'}
                  {quality === 'high' && 'Лучшее качество, больший размер файла'}
                </p>
              </div>
            )}

            {/* SQL Dialect Selection */}
            {showSqlDialect && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">SQL Диалект</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {key: 'postgresql', label: 'PostgreSQL'}, 
                    {key: 'mysql', label: 'MySQL'}, 
                    {key: 'sqlite', label: 'SQLite'}
                  ].map((d) => (
                    <button
                      key={d.key}
                      onClick={() => setSqlDialect(d.key)}
                      className={`px-3 py-2 rounded border transition-all text-sm ${
                        sqlDialect === d.key
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Options (for image formats) */}
            {showQualitySettings && (
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={includeBackground}
                      onChange={(e) => setIncludeBackground(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${
                      includeBackground ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        includeBackground ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">Включить фон</span>
                </label>
              </div>
            )}

            {/* Format Info */}
            {format === 'bpmn' && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded">
                <p className="text-sm text-blue-700">
                  <strong>BPMN 2.0 XML</strong> — стандартный формат для обмена бизнес-процессами.
                  Можно открыть в Camunda, Bizagi, draw.io и других инструментах.
                </p>
              </div>
            )}

            {format === 'sql' && (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded">
                <p className="text-sm text-amber-700">
                  <strong>SQL DDL</strong> — скрипт создания таблиц на основе ERD.
                  Включает CREATE TABLE, PRIMARY KEY и FOREIGN KEY.
                </p>
              </div>
            )}

            {format === 'json' && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded">
                <p className="text-sm text-purple-700">
                  <strong>JSON Schema</strong> — универсальный формат для импорта/экспорта.
                  Содержит схему и данные диаграммы.
                </p>
              </div>
            )}

            {/* Export Result */}
            {exportedFiles.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="text-sm text-emerald-700">
                  <span className="font-medium">Экспорт завершён!</span>
                  <p className="text-emerald-600 truncate">{exportedFiles.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-2">
            <button
              onClick={onClose}
              className="btn btn-secondary btn-md"
            >
              Закрыть
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn btn-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Экспорт...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Экспортировать
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ExportModal
