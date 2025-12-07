import React, { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { diagramsAPI } from '../api'
import { X, Link2, Search, FolderOpen, FileText, ArrowRight } from 'lucide-react'

const DIAGRAM_TYPE_COLORS = {
  bpmn: 'bg-blue-100 text-blue-700',
  erd: 'bg-amber-100 text-amber-700',
  dfd: 'bg-purple-100 text-purple-700',
}

const LinkDiagramModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  sourceNode, 
  currentDiagramId,
  existingLinks = [] 
}) => {
  const [selectedDiagram, setSelectedDiagram] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedProjects, setExpandedProjects] = useState({})

  const { data: projectsWithDiagrams = [], isLoading } = useQuery(
    'diagrams-for-linking',
    () => diagramsAPI.getDiagramsForLinking(),
    { enabled: isOpen }
  )

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDiagram(null)
      setSearchTerm('')
      // Expand all projects by default
      const expanded = {}
      projectsWithDiagrams.forEach(p => { expanded[p.id] = true })
      setExpandedProjects(expanded)
    }
  }, [isOpen, projectsWithDiagrams])

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
    if (linkedDiagramIds.has(diagram.id)) return
    setSelectedDiagram(diagram)
  }

  const handleSubmit = () => {
    if (!selectedDiagram) return
    
    onSave({
      source_element_id: sourceNode.id,
      source_element_label: sourceNode.data?.label || 'Element',
      target_diagram: selectedDiagram.id,
      link_type: 'reference',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Link2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Link to Diagram</h2>
                <p className="text-sm text-white/80">
                  Connect "{sourceNode?.data?.label || 'Element'}" to another diagram
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search diagrams..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Diagram Selection */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No diagrams found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProjects.map(project => (
                  <div key={project.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => handleToggleProject(project.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-700">{project.name}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {project.diagrams.length} diagram{project.diagrams.length !== 1 ? 's' : ''}
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
                              className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                                isLinked 
                                  ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-indigo-50 border-l-4 border-indigo-500'
                                    : 'hover:bg-gray-50'
                              }`}
                            >
                              <FileText className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                              <span className={`flex-1 text-left ${isSelected ? 'font-medium text-indigo-700' : 'text-gray-700'}`}>
                                {diagram.name}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase ${DIAGRAM_TYPE_COLORS[diagram.diagram_type] || 'bg-gray-100 text-gray-600'}`}>
                                {diagram.diagram_type}
                              </span>
                              {isLinked && (
                                <span className="text-xs text-gray-400">Already linked</span>
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

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {selectedDiagram && (
              <>
                <span className="font-medium text-gray-700">{sourceNode?.data?.label}</span>
                <ArrowRight className="w-4 h-4" />
                <span className="font-medium text-indigo-600">{selectedDiagram.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedDiagram}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Create Link
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LinkDiagramModal

