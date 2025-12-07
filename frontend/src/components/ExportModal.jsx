import React, { useState } from 'react'
import { X, Download, FileImage, FileText, Loader2, CheckCircle } from 'lucide-react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const ExportModal = ({ 
  isOpen, 
  onClose, 
  diagramName,
  projectName,
  diagrams = [], // For project export
  reactFlowInstance,
  mode = 'single' // 'single' or 'project'
}) => {
  const [format, setFormat] = useState('png')
  const [quality, setQuality] = useState('high')
  const [includeBackground, setIncludeBackground] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 })
  const [exportedFiles, setExportedFiles] = useState([])

  const qualitySettings = {
    low: { scale: 1, quality: 0.6 },
    medium: { scale: 2, quality: 0.8 },
    high: { scale: 3, quality: 1 },
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

  // Export project to PDF (multiple pages)
  const exportProjectToPDF = async (settings) => {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })
    
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    
    // Add title page
    pdf.setFontSize(24)
    pdf.text(projectName || 'Project Export', pageWidth / 2, 40, { align: 'center' })
    pdf.setFontSize(12)
    pdf.text(`${diagrams.length} diagram${diagrams.length !== 1 ? 's' : ''}`, pageWidth / 2, 55, { align: 'center' })
    pdf.text(`Exported: ${new Date().toLocaleDateString()}`, pageWidth / 2, 65, { align: 'center' })
    
    // Table of contents
    pdf.setFontSize(14)
    pdf.text('Contents:', 20, 90)
    pdf.setFontSize(10)
    diagrams.forEach((diagram, idx) => {
      pdf.text(`${idx + 1}. ${diagram.name} (${diagram.diagram_type?.toUpperCase()})`, 25, 100 + idx * 8)
    })
    
    // For each diagram, we need to render it
    // Since we can't render diagrams that aren't currently displayed,
    // we'll just export the current one with a note
    pdf.addPage()
    
    // Add current diagram
    const element = getReactFlowElement()
    if (element) {
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
      
      let finalWidth = (imgWidth * 0.264583) / settings.scale
      let finalHeight = (imgHeight * 0.264583) / settings.scale
      
      const ratio = Math.min((pageWidth - 20) / finalWidth, (pageHeight - 40) / finalHeight)
      finalWidth *= ratio * 0.95
      finalHeight *= ratio * 0.95
      
      const x = (pageWidth - finalWidth) / 2
      const y = 30 + (pageHeight - 30 - finalHeight) / 2
      
      // Add diagram name
      pdf.setFontSize(14)
      pdf.text(diagramName || 'Diagram', pageWidth / 2, 15, { align: 'center' })
      
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight)
    }
    
    pdf.save(`${projectName || 'project'}-export.pdf`)
    return pdf
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportedFiles([])
    
    try {
      const settings = qualitySettings[quality]
      const element = getReactFlowElement()
      
      if (!element) {
        throw new Error('Could not find diagram element')
      }
      
      if (mode === 'single') {
        const filename = diagramName?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'diagram'
        
        if (format === 'png') {
          await exportToPNG(element, filename, settings)
          setExportedFiles([`${filename}.png`])
        } else {
          await exportToPDF(element, filename, settings)
          setExportedFiles([`${filename}.pdf`])
        }
      } else {
        // Project export
        if (format === 'pdf') {
          await exportProjectToPDF(settings)
          setExportedFiles([`${projectName || 'project'}-export.pdf`])
        } else {
          // PNG export of current diagram only
          const filename = diagramName?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'diagram'
          await exportToPNG(element, filename, settings)
          setExportedFiles([`${filename}.png`])
        }
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Export {mode === 'project' ? 'Project' : 'Diagram'}</h2>
                <p className="text-sm text-white/80 truncate max-w-[200px]">
                  {mode === 'project' ? projectName : diagramName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Format</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('png')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    format === 'png' 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <FileImage className="w-5 h-5" />
                  <span className="font-medium">PNG</span>
                </button>
                <button
                  onClick={() => setFormat('pdf')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    format === 'pdf' 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">PDF</span>
                </button>
              </div>
            </div>

            {/* Quality Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Quality</label>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'medium', 'high'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`px-4 py-2 rounded-lg border transition-all capitalize ${
                      quality === q
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                {quality === 'low' && 'Smaller file size, lower resolution'}
                {quality === 'medium' && 'Balanced quality and file size'}
                {quality === 'high' && 'Best quality, larger file size'}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={includeBackground}
                    onChange={(e) => setIncludeBackground(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${
                    includeBackground ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      includeBackground ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </div>
                </div>
                <span className="text-sm text-gray-700 group-hover:text-gray-900">Include background</span>
              </label>
            </div>

            {/* Project Export Note */}
            {mode === 'project' && format === 'pdf' && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-700">
                  PDF export will include a title page with contents list and the currently visible diagram.
                </p>
              </div>
            )}

            {/* Export Result */}
            {exportedFiles.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="text-sm text-green-700">
                  <span className="font-medium">Exported successfully!</span>
                  <p className="text-green-600 truncate">{exportedFiles.join(', ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
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

