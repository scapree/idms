import React from 'react'
import { FileText, Trash2, Edit } from 'lucide-react'
import { useMutation, useQueryClient } from 'react-query'
import { diagramsAPI } from '../api'
import toast from 'react-hot-toast'

const DiagramTree = ({ diagrams, selectedDiagram, onSelectDiagram }) => {
  const queryClient = useQueryClient()

  // Delete diagram mutation
  const deleteDiagramMutation = useMutation(diagramsAPI.deleteDiagram, {
    onSuccess: () => {
      queryClient.invalidateQueries('diagrams')
      toast.success('Diagram deleted successfully!')
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete diagram')
    },
  })

  const handleDelete = (diagramId, e) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this diagram?')) {
      deleteDiagramMutation.mutate(diagramId)
    }
  }

  const getDiagramIcon = (type) => {
    switch (type) {
      case 'bpmn':
        return '🔄'
      case 'erd':
        return '🗃️'
      case 'dfd':
        return '📊'
      default:
        return '📄'
    }
  }

  const getDiagramTypeLabel = (type) => {
    switch (type) {
      case 'bpmn':
        return 'BPMN'
      case 'erd':
        return 'ERD'
      case 'dfd':
        return 'DFD'
      default:
        return type.toUpperCase()
    }
  }

  if (diagrams.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm">No diagrams yet</p>
      </div>
    )
  }

  return (
    <div className="p-2">
      {diagrams.map((diagram) => (
        <div
          key={diagram.id}
          className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
            selectedDiagram?.id === diagram.id
              ? 'bg-primary-50 border border-primary-200'
              : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelectDiagram(diagram)}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-lg">{getDiagramIcon(diagram.diagram_type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {diagram.name}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {getDiagramTypeLabel(diagram.diagram_type)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(diagram.updated_at || diagram.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => handleDelete(diagram.id, e)}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete diagram"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default DiagramTree






